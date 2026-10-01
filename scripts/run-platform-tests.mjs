import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const database = process.env.DATABASE_URL;
assert(
  database && new URL(database).pathname.endsWith('_test'),
  'DATABASE_URL must point to an isolated database ending in _test',
);
const env = {
  ...process.env,
  PORT: '3301',
  NODE_ENV: 'test',
  COOKIE_SECURE: 'false',
  COOKIE_SECRET: 'isolated-platform-test-cookie-secret-32',
};
delete env.ADMIN_PASSWORD_SHA256;
const server = spawn(
  process.execPath,
  ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'],
  { env, stdio: ['ignore', 'ignore', 'inherit'] },
);
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch('http://127.0.0.1:3301/api/health')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert(ready, 'Test server did not start');
  const test = spawn(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'scripts/test-platform.ts'],
    {
      env: { ...env, PLATFORM_TEST_URL: 'http://127.0.0.1:3301' },
      stdio: 'inherit',
    },
  );
  const code = await new Promise((resolve) => test.on('exit', resolve));
  process.exitCode = code ?? 1;
} finally {
  server.kill('SIGTERM');
}
