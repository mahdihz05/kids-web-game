import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const story = JSON.parse(await readFile(resolve(root, 'src/data/story.json'), 'utf8'));
const oakStory = JSON.parse(await readFile(resolve(root, 'src/data/oak-rescue.json'), 'utf8'));
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

function validateStoryGraph(candidate) {
  const byId = new Map(candidate.scenes.map((scene) => [scene.id, scene]));
  const reachable = new Set();
  const pending = [candidate.startScene];
  while (pending.length) {
    const id = pending.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    const scene = byId.get(id);
    check(Boolean(scene), `${candidate.id}: missing scene ${id}`);
    if (!scene) continue;
    if (scene.nextScene) pending.push(scene.nextScene);
    if (scene.dropTarget?.nextScene) pending.push(scene.dropTarget.nextScene);
    for (const choice of scene.choices ?? []) {
      check(byId.has(choice.nextScene), `${candidate.id}/${scene.id}: missing choice target ${choice.nextScene}`);
      if (!choice.retry) pending.push(choice.nextScene);
      else check(choice.nextScene === scene.id, `${candidate.id}/${scene.id}/${choice.id}: retry must remain on scene`);
    }
  }
  check(reachable.size === candidate.scenes.length, `${candidate.id}: unreachable scenes ${candidate.scenes.filter((scene) => !reachable.has(scene.id)).map((scene) => scene.id).join(', ')}`);
}

validateStoryGraph(oakStory);
const oakScenes = new Map(oakStory.scenes.map((scene) => [scene.id, scene]));
check(oakScenes.get('oak-clues')?.hotspots?.length === 3, 'Oak rescue must include three responsive clues.');
check(oakScenes.get('oak-tools')?.requiredItemIds?.length === 3, 'Oak rescue must require three net tools.');
check(oakScenes.get('oak-tools')?.dragItems?.length === 6, 'Oak rescue must show the six tools from the client flow.');
check(oakScenes.get('oak-weave')?.requiredCraftCount === 3, 'Oak rescue net must have three ordered craft steps.');
check(oakScenes.has('oak-rabbit-result') && oakScenes.has('oak-bridge-result') && oakScenes.has('oak-rabbit-repair') && oakScenes.has('oak-bridge-repair'), 'Oak rescue consequence/repair paths are incomplete.');
check(oakScenes.get('oak-feeling')?.choices?.length === 4 && oakScenes.get('oak-feeling').choices.every((choice) => !choice.retry && choice.nextScene === 'oak-clues'), 'Every feeling must be accepted and connected to the story.');
check(oakScenes.get('oak-final-compare')?.solutionComparison?.rows?.length === 3, 'Oak rescue must include the final three-way solution comparison.');
check(JSON.stringify(oakScenes.get('oak-final-compare')?.solutionComparison).includes('speed') && JSON.stringify(oakScenes.get('oak-final-compare')?.solutionComparison).includes('amount') && JSON.stringify(oakScenes.get('oak-final-compare')?.solutionComparison).includes('cooperation'), 'Final comparison must cover speed, acorn amount and cooperation.');
check(JSON.stringify(oakScenes.get('oak-reflection')?.reflectionPrompts?.map((prompt) => prompt.options.length)) === '[2,2,3]', 'Oak reflection must preserve the 2/2/3 option structure from the deck.');
function followOak(decisions) {
  let id = oakStory.startScene;
  const route = [];
  for (let guard = 0; guard < 40; guard += 1) {
    const scene = oakScenes.get(id); if (!scene) break;
    route.push(id); if (scene.type === 'result') return { route, result: id };
    if (scene.type === 'choice') id = (scene.choices.find((choice) => choice.id === decisions[scene.id]) ?? scene.choices.find((choice) => !choice.retry)).nextScene;
    else if (scene.type === 'dragDrop') id = scene.dropTarget.nextScene;
    else id = scene.nextScene;
  }
  return { route };
}
const oakRoutes = {
  net: followOak({ 'oak-compare': 'rope-net' }),
  rabbit: followOak({ 'oak-compare': 'rabbit-jump', 'oak-rabbit-repair': 'try-net' }),
  bridge: followOak({ 'oak-compare': 'log-bridge', 'oak-bridge-repair': 'try-net' }),
};
for (const [name, run] of Object.entries(oakRoutes)) check(run.result === 'oak-result', `Oak ${name} route does not reach its result.`);
check(oakRoutes.rabbit.route.includes('oak-rabbit-result') && oakRoutes.rabbit.route.includes('oak-rabbit-repair'), 'Rabbit route must save a few acorns, then reopen the decision.');
check(oakRoutes.bridge.route.includes('oak-bridge-result') && oakRoutes.bridge.route.includes('oak-bridge-repair'), 'Bridge route must show the slow/heavy consequence and reopen the decision.');
for (const run of Object.values(oakRoutes)) check(run.route.includes('oak-final-compare') && run.route.includes('oak-reflection'), 'Every oak route must end with comparison and reflection.');
if (failures.length) { console.error(failures.map((failure) => `✗ ${failure}`).join('\n')); process.exit(1); }
console.log(`✓ Oak rescue graph passed: ${oakStory.scenes.length} scenes, deck-aligned net/rabbit/bridge routes complete.`);
