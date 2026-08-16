import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const story = JSON.parse(await readFile(resolve(root, 'src/data/story.json'), 'utf8'));
const storyContent = await readFile(resolve(root, 'src/data/storyContent.ts'), 'utf8');
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
  for (const choice of scene.choices ?? []) {
    if (choice.retry) check(choice.nextScene === scene.id, `${scene.id}/${choice.id}: retry must remain in the same scene`);
  }
}

const visited = new Set();
const queue = [story.startScene];
while (queue.length) {
  const id = queue.shift();
  if (visited.has(id)) continue;
  visited.add(id);
  queue.push(...(edges.get(id) ?? []));
}
check(visited.size === story.scenes.length, `Unreachable scenes: ${story.scenes.filter((scene) => !visited.has(scene.id)).map((scene) => scene.id).join(', ')}`);

function follow(decisions) {
  const route = [];
  let id = story.startScene;
  for (let guard = 0; guard < 40; guard += 1) {
    const scene = scenes.get(id);
    if (!scene) return { route, result: null };
    route.push(scene);
    if (scene.type === 'result') return { route, result: scene };
    if (scene.type === 'choice') {
      const requested = decisions[scene.id];
      const choice = scene.choices.find((item) => item.id === requested) ?? scene.choices.find((item) => !item.retry);
      id = choice.nextScene;
    } else if (scene.type === 'dragDrop') id = scene.dropTarget.nextScene;
    else id = scene.nextScene;
  }
  return { route, result: null };
}

const necklace = follow({ 'final-decision': 'necklace' });
const flowers = follow({ 'final-decision': 'flowers', 'flower-repair': 'find-another' });
for (const [name, run] of Object.entries({ necklace, flowers })) {
  check(run.result?.id === 'celebration', `${name} branch does not reach celebration`);
  check(run.route.every((scene, index) => index === 0 || scene.phase >= run.route[index - 1].phase), `${name} branch moves backwards between phases`);
}
check(flowers.route.some((scene) => scene.id === 'flower-consequence'), 'Flower branch skips its consequence');
check(flowers.route.some((scene) => scene.id === 'flower-repair'), 'Flower branch skips decision repair');
check(necklace.route.some((scene) => scene.id === 'craft-necklace'), 'Necklace branch skips crafting');
check(storyContent.includes("choice.nextScene = 'final-decision'"), 'Reason selection must lead to the final visual choice.');
check(storyContent.includes("choice.nextScene = 'choose-tools'"), 'Necklace must lead to tools only after the final choice.');
check(storyContent.includes("choice.nextScene = 'final-decision'; });"), 'Flower repair must return to the final choice.');
check(storyContent.includes("scene.narration = scene.text"), 'Every scene must expose narration content.');

const tools = scenes.get('choose-tools');
check(JSON.stringify(tools?.requiredItemIds?.sort()) === JSON.stringify(['acorns', 'patience', 'thread'].sort()), 'Tool scene must require acorns, thread and patience');
check(scenes.get('two-stars-wish')?.reflectionPrompts?.length === 3, 'Two stars and a wish must contain three prompts');
check(story.scenes.length >= 12 && story.scenes.length <= 15, 'Story should contain 12–15 production scenes');

if (failures.length) {
  console.error(failures.map((failure) => `✗ ${failure}`).join('\n'));
  process.exit(1);
}
console.log(`✓ Story tests passed: ${story.scenes.length} scenes, ${visited.size} reachable, both branches complete.`);
