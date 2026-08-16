import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const story = JSON.parse(await readFile(resolve(root, 'src/data/story.json'), 'utf8'));
const scenes = new Map(story.scenes.map((scene) => [scene.id, scene]));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const edges = new Map();
for (const scene of story.scenes) {
  const targets = new Set();
  if (scene.nextScene) targets.add(scene.nextScene);
  if (scene.dropTarget?.nextScene) targets.add(scene.dropTarget.nextScene);
  for (const choice of scene.choices ?? []) if (!choice.retry) targets.add(choice.nextScene);
  edges.set(scene.id, [...targets]);
  for (const target of targets) check(scenes.has(target), `${scene.id}: missing target ${target}`);
  for (const choice of scene.choices ?? []) if (choice.retry) check(choice.nextScene === scene.id, `${scene.id}/${choice.id}: retry must stay on its scene`);
}

const visited = new Set();
const queue = [story.startScene];
while (queue.length) { const id = queue.shift(); if (visited.has(id)) continue; visited.add(id); queue.push(...(edges.get(id) ?? [])); }
check(visited.size === story.scenes.length, `Unreachable scenes: ${story.scenes.filter((scene) => !visited.has(scene.id)).map((scene) => scene.id).join(', ')}`);

function follow(decisions) {
  const route = []; let id = story.startScene;
  const visits = {};
  for (let guard = 0; guard < 40; guard += 1) {
    const scene = scenes.get(id); if (!scene) return { route };
    route.push(scene.id); if (scene.type === 'result') return { route, result: scene.id };
    if (scene.type === 'choice') { const configured = decisions[scene.id]; const requested = Array.isArray(configured) ? configured[visits[scene.id] ?? 0] : configured; visits[scene.id] = (visits[scene.id] ?? 0) + 1; const choice = scene.choices.find((item) => item.id === requested) ?? scene.choices.find((item) => !item.retry); id = choice.nextScene; }
    else if (scene.type === 'dragDrop') id = scene.dropTarget.nextScene;
    else id = scene.nextScene;
  }
  return { route };
}

const necklace = follow({ 'compare-options': 'consider-necklace', 'final-decision': 'necklace' });
const flowers = follow({ 'compare-options': 'consider-flowers', 'flower-repair': 'find-another', 'final-decision': 'necklace' });
for (const [name, run] of Object.entries({ necklace, flowers })) check(run.result === 'celebration', `${name} branch does not reach celebration`);
check(necklace.route.indexOf('choose-tools') < necklace.route.indexOf('craft-necklace'), 'Tools must precede crafting');
check(!necklace.route.includes('final-decision'), 'Necklace reason must not repeat the gift-choice scene');
check(scenes.get('analysis-reason').choices.every((choice) => choice.nextScene === 'choose-tools'), 'Every necklace reason must continue to tools');
check(flowers.route.includes('flower-consequence') && flowers.route.includes('flower-repair'), 'Flower branch must show consequence and repair');
check(!flowers.route.includes('analysis-reason'), 'Flower selection must not ask for a reason before the gardener');
check(flowers.route.indexOf('flower-consequence') === flowers.route.indexOf('compare-options') + 1, 'Flower selection must go directly to the gardener');
check(flowers.route.indexOf('flower-repair') < flowers.route.indexOf('final-decision'), 'Flower repair must return to a new gift choice');
check(flowers.route.indexOf('choose-tools') > flowers.route.indexOf('final-decision'), 'Flower branch must only open tools after necklace is selected');
check(scenes.get('compare-options').choices.find((choice) => choice.id === 'consider-flowers').nextScene === 'flower-consequence', 'First flower choice must target gardener consequence');
check(scenes.get('final-decision').choices.find((choice) => choice.id === 'necklace').nextScene === 'choose-tools', 'Necklace must open tools');
check(scenes.get('choose-tools').dropTarget.nextScene === 'craft-necklace', 'Completed tools must open crafting');

// Regression guard for the restored object-fit: contain hotspot positioning.
const clueScene = scenes.get('garden-clues');
for (const [width, height, label] of [[1440, 900, 'desktop'], [768, 1024, 'tablet portrait'], [1024, 768, 'tablet landscape'], [390, 844, 'mobile portrait'], [844, 390, 'mobile landscape']]) {
  const renderedWidth = Math.min(width, height * (16 / 9));
  const renderedHeight = renderedWidth / (16 / 9);
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;
  for (const item of clueScene.hotspots) {
    const left = offsetX + (item.x / 100) * renderedWidth;
    const top = offsetY + (item.y / 100) * renderedHeight;
    check(left >= offsetX && left <= offsetX + renderedWidth && top >= offsetY && top <= offsetY + renderedHeight, `${label}: ${item.id} leaves contained image`);
  }
}

if (failures.length) { console.error(failures.map((failure) => `✗ ${failure}`).join('\n')); process.exit(1); }
console.log(`✓ Story graph passed: ${story.scenes.length} scenes, both routes complete, flower repair returns correctly.`);
