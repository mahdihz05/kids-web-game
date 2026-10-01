"""Deploy only this game's prebuilt image and static files; never change SSH credentials."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import time
from datetime import datetime, timezone
import paramiko

ROOT=Path(__file__).resolve().parents[1]
APP='/opt/kids-web-game'
PINNED_KEY='d8eadb5f25cd1d90e84cfe85ded24256'

class VerifyHost(paramiko.MissingHostKeyPolicy):
    def missing_host_key(self,client,hostname,key):
        if hashlib.md5(key.asbytes()).hexdigest()!=PINNED_KEY:
            raise RuntimeError('Server host key does not match the previously verified host')

def sha(path):
    digest=hashlib.sha256()
    with open(path,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):digest.update(block)
    return digest.hexdigest()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--host',default='141.11.1.223');parser.add_argument('--revision',required=True);args=parser.parse_args()
    assert len(args.revision)==40 and all(c in '0123456789abcdef' for c in args.revision)
    assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==args.revision
    image=ROOT/'tmp'/'kids-game-api-v2.tar.gz';assert image.is_file()
    assert (ROOT/'dist'/'index.html').is_file()
    client=paramiko.SSHClient();client.set_missing_host_key_policy(VerifyHost())
    client.connect(args.host,port=22,username='root',password=os.environ['GAME_SSH_PASSWORD'],timeout=20,allow_agent=False,look_for_keys=False)
    sftp=client.open_sftp()
    def run(command):
        _,stdout,stderr=client.exec_command(command,timeout=180)
        out=stdout.read().decode('utf8');err=stderr.read().decode('utf8');code=stdout.channel.recv_exit_status()
        if code:raise RuntimeError(f'Command failed ({code}): {command}\n{err[-2000:]}')
        return out.strip()
    def write_atomic(path,content):
        tmp=path+'.release-upload'
        with sftp.open(tmp,'w') as f:f.write(content)
        run(f'mv -f {shlex.quote(tmp)} {shlex.quote(path)}')
    def other_services():
        rows=run("docker ps --format '{{.Names}}'").splitlines()
        names=[n for n in rows if n not in ['kids-web-game-demo','kids-web-game-api-1']]
        return run("docker inspect "+' '.join(map(shlex.quote,names))+" --format '{{.Name}}|{{.Image}}|{{.State.StartedAt}}|{{.State.Running}}'")
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+args.revision[:8]
    backup='/opt/kids-web-game-backups/'+stamp
    release=APP+'/releases/'+stamp
    before_other=other_services();before_env=run(f'sha256sum {APP}/.env').split()[0];before_shadow=run("stat -c '%Y:%s' /etc/shadow")
    old_revision=run(f'cd {APP} && git rev-parse HEAD')
    run(f'cd {APP} && git diff --quiet && git diff --cached --quiet')
    old_image=run("docker inspect kids-web-game-api-1 --format '{{.Image}}'")
    prior_override=None
    try:
        with sftp.open(APP+'/docker-compose.release.yml') as f:prior_override=f.read().decode()
    except FileNotFoundError:pass
    # Inspect hashes without copying or altering the active tree.
    manifest_code="import os,hashlib,json; root='/opt/kids-web-game/dist'; print(json.dumps({os.path.relpath(os.path.join(d,f),root):hashlib.sha256(open(os.path.join(d,f),'rb').read()).hexdigest() for d,_,fs in os.walk(root) for f in fs}))"
    remote_manifest=json.loads(run('python3 -c '+shlex.quote(manifest_code)))
    files=[p for p in (ROOT/'dist').rglob('*') if p.is_file()]
    changed=[p for p in files if remote_manifest.get(p.relative_to(ROOT/'dist').as_posix())!=sha(p)]
    changed_bytes=sum(p.stat().st_size for p in changed)
    free=int(run("df -B1 --output=avail / | tail -1"))
    required=image.stat().st_size*3+changed_bytes+50*1024*1024
    assert free>required,f'Insufficient safe disk margin: free={free}, required={required}'
    print(f'Preflight passed: {len(changed)} static files to update; {free//1024//1024} MiB available',flush=True)
    run(f'mkdir -p {backup} {release}; chmod 700 {backup}; cp -p {APP}/.env {backup}/environment; cp -p {APP}/deploy/nginx.demo.conf {backup}/nginx.demo.conf; cp -al {APP}/dist {release}/html')
    dump_command=f'docker exec kids-web-game-postgres-1 pg_dump -U motefaker -d motefaker | gzip > {backup}/database.sql.gz'
    run('bash -o pipefail -c '+shlex.quote(dump_command))
    run('gzip -t '+backup+'/database.sql.gz')
    assert int(run(f'stat -c %s {backup}/database.sql.gz'))>20
    rollback={'revision':old_revision,'image':old_image,'static':backup+'/dist','priorOverride':prior_override}
    write_atomic(backup+'/rollback.json',json.dumps(rollback))
    print('Application database and configuration backup created',flush=True)
    for path in changed:
        rel=path.relative_to(ROOT/'dist').as_posix();target=release+'/html/'+rel
        assert '..' not in Path(rel).parts
        run('mkdir -p '+shlex.quote(str(Path(target).parent).replace('\\','/')))
        temp=target+'.release-upload';sftp.put(str(path),temp);run(f'mv -f {shlex.quote(temp)} {shlex.quote(target)}')
    remote_archive=release+'/api-image.tar.gz'
    sftp.put(str(image),remote_archive)
    assert run('sha256sum '+remote_archive).split()[0]==sha(image)
    print('Verified image and static files uploaded',flush=True)
    run('docker load -i '+remote_archive)
    tag='kids-web-game-api:release-'+args.revision[:8]
    run('docker tag kids-web-game-api:accounts-v2 '+tag)
    # The archive is our generated staging file, outside all active volumes.
    assert remote_archive.startswith(APP+'/releases/') and remote_archive.endswith('/api-image.tar.gz')
    sftp.remove(remote_archive)
    run(f'cd {APP} && git fetch origin && git merge --ff-only {args.revision}')
    assert run(f'cd {APP} && git rev-parse HEAD')==args.revision
    override='services:\n  api:\n    image: '+tag+'\n'
    write_atomic(APP+'/docker-compose.release.yml',override)
    run(f'cd {APP} && docker compose -f docker-compose.yml -f docker-compose.release.yml config -q')
    api_switched=False;static_switched=False
    try:
        api_switched=True
        run(f'cd {APP} && docker compose -f docker-compose.yml -f docker-compose.release.yml up -d --no-deps --no-build api')
        health=None
        for _ in range(30):
            try:health=json.loads(run('curl -fsS http://127.0.0.1:3001/api/health'))
            except Exception:time.sleep(1);continue
            if health.get('version')=='2.0.0':break
            time.sleep(1)
        assert health and health.get('version')=='2.0.0','New API did not become healthy'
        static_switched=True
        run(f'mv {APP}/dist {backup}/dist; mv {release}/html {APP}/dist')
        run('docker restart kids-web-game-demo')
        run('docker exec kids-web-game-demo nginx -t')
        public=json.loads(run('curl -fsS http://127.0.0.1:8397/api/health'))
        assert public.get('version')=='2.0.0'
        assert run(f'sha256sum {APP}/dist/index.html').split()[0]==sha(ROOT/'dist'/'index.html')
        assert run(f'sha256sum {APP}/.env').split()[0]==before_env,'Environment file changed'
        assert run("stat -c '%Y:%s' /etc/shadow")==before_shadow,'SSH credential store changed'
        assert other_services()==before_other,'Another running container changed during release'
        print('Release live: API, database, frontend and nginx verified; other services and credentials unchanged',flush=True)
        result={'revision':args.revision,'backup':backup,'image':tag,'url':f'http://{args.host}:8397','otherServicesUnchanged':True,'environmentUnchanged':True,'sshCredentialsUnchanged':True}
        (ROOT/'tmp'/'deployment-result.json').write_text(json.dumps(result,indent=2),encoding='utf8')
    except Exception:
        print('Release verification failed; restoring only this game runtime',flush=True)
        if static_switched:run(f'if test -d {APP}/dist; then mv {APP}/dist {release}/failed-html; fi; mv {backup}/dist {APP}/dist')
        # Restore the game's nginx bind mount, not the system nginx service.
        run(f'cp {backup}/nginx.demo.conf {APP}/deploy/nginx.demo.conf')
        if static_switched:run('docker restart kids-web-game-demo')
        rollback_override=prior_override or ('services:\n  api:\n    image: '+old_image+'\n')
        write_atomic(APP+'/docker-compose.release.yml',rollback_override)
        if api_switched:run(f'cd {APP} && docker compose -f docker-compose.yml -f docker-compose.release.yml up -d --no-deps --no-build api')
        raise
    finally:sftp.close();client.close()

if __name__=='__main__':main()
