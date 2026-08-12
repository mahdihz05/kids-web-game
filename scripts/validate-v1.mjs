import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const story = JSON.parse(await readFile(resolve(root, 'src/data/story.json'), 'utf8'));
const missionsSource = await readFile(resolve(root, 'src/data/missions.ts'), 'utf8');
const appSource = await readFile(resolve(root, 'src/App.tsx'), 'utf8');
const introSource = await readFile(resolve(root, 'src/components/StoryIntro.tsx'), 'utf8');
const storageSource = await readFile(resolve(root, 'src/utils/introStorage.ts'), 'utf8');
const hubSource = await readFile(resolve(root, 'src/components/MissionHub.tsx'), 'utf8');
const assetManifest = await readFile(resolve(root, 'src/game/assets.ts'), 'utf8');

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

check(story.totalPhases === 6, 'Story must expose six phases.');
check(story.scenes.some((scene) => scene.type === 'hotspot'), 'Hotspot scene is missing.');
check(story.scenes.some((scene) => scene.type === 'dragDrop'), 'Drag/drop scene is missing.');
check(story.scenes.some((scene) => scene.type === 'reflection'), 'Reflection scene is missing.');
check(story.scenes.some((scene) => scene.type === 'result'), 'Result scene is missing.');

const sceneIds = new Set(story.scenes.map((scene) => scene.id));
for (const scene of story.scenes) {
  if (scene.nextScene) check(sceneIds.has(scene.nextScene), `Missing nextScene: ${scene.nextScene}`);
  for (const choice of scene.choices ?? []) {
    check(sceneIds.has(choice.nextScene), `Missing choice nextScene: ${choice.nextScene}`);
  }
}

const missionFlags = [...missionsSource.matchAll(/unlocked:\s*(true|false)/g)].map((match) => match[1]);
check(missionFlags.length === 10, 'Exactly ten missions must be registered.');
check(missionFlags.filter((flag) => flag === 'true').length === 1, 'Exactly one mission must be unlocked.');
check(missionFlags.slice(1).every((flag) => flag === 'false'), 'Missions 2-10 must remain locked.');

check(appSource.includes("params.has('library')"), 'Library smoke-test route is missing.');
check(appSource.includes('<PhaseJourney'), 'Persistent phase journey is missing.');
check(storageSource.includes('motefaker:magical-library:intro-seen:v1'), 'Versioned intro key is missing.');
check(introSource.includes('cookie-narrator.png'), 'Cookie narrator image is missing from intro.');
check(hubSource.includes('magic-wand.png'), 'Magic wand is missing from first book.');
check(hubSource.includes('به‌زودی بیدار می‌شود'), 'Locked book message is missing.');

const referencedAssets = new Set();
for (const source of [appSource, introSource, hubSource, assetManifest]) {
  for (const match of source.matchAll(/['"`]\/assets\/([^'"`$}]+)/g)) referencedAssets.add(match[1]);
}
for (const asset of referencedAssets) {
  try {
    await access(resolve(root, 'public/assets', asset), constants.R_OK);
  } catch {
    failures.push(`Referenced asset is missing: ${asset}`);
  }
}

for (const required of ['deploy/nginx.conf.example', 'public/favicon.svg']) {
  try {
    await access(resolve(root, required), constants.R_OK);
  } catch {
    failures.push(`Required delivery file is missing: ${required}`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `✗ ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`✓ V1 contract validated: ${story.scenes.length} scenes, 6 phases, 1 unlocked mission, ${referencedAssets.size} checked assets.`);
