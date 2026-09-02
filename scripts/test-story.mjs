import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const story = JSON.parse(await readFile(resolve(root, 'src/data/story.json'), 'utf8'));
const oakStory = JSON.parse(await readFile(resolve(root, 'src/data/oak-rescue.json'), 'utf8'));
const missingEggStory = JSON.parse(await readFile(resolve(root, 'src/data/missing-egg.json'), 'utf8'));
const wetFoxStory = JSON.parse(await readFile(resolve(root, 'src/data/wet-fox-house.json'), 'utf8'));
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
validateStoryGraph(missingEggStory);
validateStoryGraph(wetFoxStory);
const oakScenes = new Map(oakStory.scenes.map((scene) => [scene.id, scene]));
check(oakScenes.get('oak-clues')?.hotspots?.length === 3, 'Oak rescue must include three responsive clues.');
check(oakScenes.get('oak-tools')?.requiredItemIds?.length === 3, 'Oak rescue must require three net tools.');
check(oakScenes.get('oak-tools')?.dragItems?.length === 6, 'Oak rescue must show the six tools from the client flow.');
check(oakScenes.get('oak-weave')?.requiredCraftCount === 3, 'Oak rescue net must have three ordered craft steps.');
check(oakScenes.has('oak-rabbit-result') && oakScenes.has('oak-bridge-result') && !oakScenes.has('oak-rabbit-repair') && !oakScenes.has('oak-bridge-repair'), 'Oak rescue must use direct consequence-to-comparison repair paths.');
check(oakScenes.get('oak-rabbit-result')?.nextScene === 'oak-compare' && oakScenes.get('oak-bridge-result')?.nextScene === 'oak-compare', 'Rabbit and bridge consequences must return to the original comparison.');
check(oakScenes.get('oak-feeling')?.choiceInteraction === 'immediate' && oakScenes.get('oak-feeling')?.choices?.length === 4 && oakScenes.get('oak-feeling').choices.every((choice) => choice.consequence && choice.nextScene === 'oak-clues'), 'Every feeling must show immediate feedback and connect to the clues.');
check(oakScenes.get('oak-problem')?.choices?.find((choice) => choice.id === 'not-enough-food')?.consequence === 'آفرین! درست فهمیدی. بلوط‌ها غذای زمستان سنجاب‌ها هستند و حالا دیگر غذای کافی ندارند.', 'The correct problem feedback must match the client copy.');
check(oakScenes.get('oak-net-result')?.type === 'choice' && oakScenes.get('oak-net-result')?.choices?.find((choice) => choice.id === 'collect-many')?.nextScene === 'oak-tools', 'The correct net analysis must lead to tool selection.');
check(oakScenes.get('oak-final-compare')?.solutionComparison?.rows?.length === 3, 'Oak rescue must include the final three-way solution comparison.');
check(oakScenes.get('oak-final-compare')?.type === 'dialogue' && oakScenes.get('oak-final-compare')?.nextScene === 'oak-final-question', 'The final comparison table must have its own page before the question.');
check(JSON.stringify(oakScenes.get('oak-final-compare')?.solutionComparison).includes('speed') && JSON.stringify(oakScenes.get('oak-final-compare')?.solutionComparison).includes('amount') && JSON.stringify(oakScenes.get('oak-final-compare')?.solutionComparison).includes('cooperation'), 'Final comparison must cover speed, acorn amount and cooperation.');
check(JSON.stringify(oakScenes.get('oak-reflection')?.reflectionPrompts?.map((prompt) => prompt.options.length)) === '[2,2,3]', 'Oak reflection must preserve the 2/2/3 option structure from the deck.');
function followOak(decisions) {
  let id = oakStory.startScene;
  const route = [];
  const visits = new Map();
  for (let guard = 0; guard < 40; guard += 1) {
    const scene = oakScenes.get(id); if (!scene) break;
    route.push(id); if (scene.type === 'result') return { route, result: id };
    if (scene.type === 'choice') {
      const decision = decisions[scene.id];
      const visit = visits.get(scene.id) ?? 0;
      visits.set(scene.id, visit + 1);
      const choiceId = Array.isArray(decision) ? decision[Math.min(visit, decision.length - 1)] : decision;
      id = (scene.choices.find((choice) => choice.id === choiceId) ?? scene.choices.find((choice) => !choice.retry)).nextScene;
    }
    else if (scene.type === 'dragDrop') id = scene.dropTarget.nextScene;
    else id = scene.nextScene;
  }
  return { route };
}
const oakRoutes = {
  net: followOak({ 'oak-compare': 'rope-net' }),
  rabbit: followOak({ 'oak-compare': ['rabbit-jump', 'rope-net'] }),
  bridge: followOak({ 'oak-compare': ['log-bridge', 'rope-net'] }),
};
for (const [name, run] of Object.entries(oakRoutes)) check(run.result === 'oak-result', `Oak ${name} route does not reach its result.`);
check(oakRoutes.rabbit.route.includes('oak-rabbit-result') && oakRoutes.rabbit.route.filter((id) => id === 'oak-compare').length === 2, 'Rabbit route must show its consequence, then reopen the original comparison.');
check(oakRoutes.bridge.route.includes('oak-bridge-result') && oakRoutes.bridge.route.filter((id) => id === 'oak-compare').length === 2, 'Bridge route must show its consequence, then reopen the original comparison.');
for (const run of Object.values(oakRoutes)) check(run.route.includes('oak-net-result') && run.route.includes('oak-final-compare') && run.route.includes('oak-final-question') && run.route.includes('oak-reflection'), 'Every oak route must include net analysis, the separate comparison table, question and reflection.');
if (failures.length) { console.error(failures.map((failure) => `✗ ${failure}`).join('\n')); process.exit(1); }
console.log(`✓ Oak rescue graph passed: ${oakStory.scenes.length} scenes, deck-aligned net/rabbit/bridge routes complete.`);

const missingScenes = new Map(missingEggStory.scenes.map((scene) => [scene.id, scene]));
check(missingScenes.get('missing-clues')?.hotspots?.length === 3, 'Missing egg must contain the three client clues.');
check(missingScenes.get('missing-clue-results')?.hotspots?.length === 3, 'Missing egg must show all three clue results.');
check(missingScenes.get('missing-tools')?.requiredItemIds?.join(',') === 'wheel,mirrors,long-stick,rope', 'Missing egg mirror-stick tools must match slide 9.');
check(missingScenes.get('missing-tools')?.dragItems?.length === 6, 'Missing egg tool selection must show all six slide items.');
check(missingScenes.get('missing-craft')?.requiredCraftCount === 4, 'Missing egg mirror stick must include four ordered operations.');
check(missingScenes.get('missing-craft')?.image === 'missing-mirror-stick-complete', 'Missing egg craft scene must show the completed mirror stick.');
check(missingScenes.get('missing-craft')?.nextScene === 'missing-discovery', 'Missing egg craft must lead to the separate discovery scene.');
check(missingScenes.get('missing-discovery')?.nextScene === 'missing-success', 'Missing egg discovery must appear immediately before the celebration.');
check(missingScenes.get('missing-discovery')?.bookText?.includes('نوک یک تخم سفید دیده شد'), 'Missing egg discovery must contain the client-approved mirror reveal story.');
check(missingScenes.get('missing-feeling')?.choices?.every((choice) => choice.image.startsWith('turtle-feeling-')), 'Missing egg feelings must use the turtle face.');
check(missingScenes.get('missing-choose-path')?.choices?.find((choice) => choice.id === 'rolling')?.nextScene === 'missing-tools', 'The continuing rolling trail must lead to mirror-stick tools.');
check(JSON.stringify(missingScenes.get('missing-reflection')?.reflectionPrompts?.map((prompt) => prompt.options.length)) === '[2,2,3]', 'Missing egg reflection must preserve the 2/2/3 slide structure.');
check(missingEggStory.phaseJourney?.map((phase) => phase.title).join(',') === 'کشف مسئله,احساس‌ها,بررسی سرنخ‌ها,تصمیم و مقایسه,ساخت ابزار,بازاندیشی', 'Missing egg phase labels must match its flow.');

const foxScenes = new Map(wetFoxStory.scenes.map((scene) => [scene.id, scene]));
check(foxScenes.get('fox-clues')?.hotspots?.length === 3, 'Wet fox must expose door, window and roof leaks.');
check(foxScenes.get('fox-measurement')?.prompt === 'زیر در: ۶ قسمت پیمانه — پنجره: ۳ قسمت پیمانه — سقف: ۱ قسمت پیمانه', 'Wet fox first measurement must use the client-approved 6/3/1 parts.');
check(foxScenes.get('fox-after-barrier')?.bookText?.includes('زیر در ۱ قسمت پیمانه، پنجره ۳ قسمت پیمانه و سقف ۱ قسمت پیمانه'), 'Wet fox second measurement must use 1/3/1 parts.');
check(foxScenes.get('fox-first-priority')?.choices?.find((choice) => choice.id === 'door')?.nextScene === 'fox-tools', 'Wet fox first priority must be the door.');
check(foxScenes.get('fox-second-priority')?.choices?.find((choice) => choice.id === 'window')?.nextScene === 'fox-relief', 'Wet fox second priority must lead to the new relief scene.');
check(foxScenes.get('fox-relief')?.nextScene === 'fox-success', 'Wet fox relief scene must appear immediately before the celebration.');
check(foxScenes.get('fox-tools')?.requiredItemIds?.join(',') === 'towel,plastic-bag,yarn', 'Wet fox tools must be towel, plastic bag and yarn.');
check(foxScenes.get('fox-craft')?.requiredCraftCount === 3, 'Wet fox barrier must use the three client construction steps.');
check(JSON.stringify(foxScenes.get('fox-reflection')?.reflectionPrompts?.map((prompt) => prompt.options.length)) === '[2,2,3]', 'Wet fox reflection must preserve the 2/2/3 slide structure.');
check(wetFoxStory.phaseJourney?.map((phase) => phase.title).join(',') === 'کشف مسئله,احساس‌ها,اندازه‌گیری,انتخاب اولویت,ساخت و بررسی,بازاندیشی', 'Wet fox phase labels must match its flow.');

if (failures.length) { console.error(failures.map((failure) => `✗ ${failure}`).join('\n')); process.exit(1); }
console.log(`✓ Missing egg graph passed: ${missingEggStory.scenes.length} client-aligned scenes including the pre-celebration discovery.`);
console.log(`✓ Wet fox graph passed: ${wetFoxStory.scenes.length} client-aligned scenes including pre-celebration relief.`);
