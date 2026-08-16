import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const css = await readFile(resolve(root, 'src/styles/global.css'), 'utf8');
const canvas = await readFile(resolve(root, 'src/components/GameCanvas.tsx'), 'utf8');
const components = await Promise.all([
  'ChoiceGrid.tsx', 'InteractionLayer.tsx', 'ReflectionBoard.tsx', 'MissionHub.tsx', 'StoryIntro.tsx',
].map((file) => readFile(resolve(root, 'src/components', file), 'utf8')));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(canvas.includes('game-canvas__image'), 'Game scene must render a responsive image element.');
check(css.includes('.game-canvas__image') && css.includes('object-fit: contain'), 'Story scenes must preserve their complete aspect ratio.');
check(css.includes('.choice-card img') && css.includes('aspect-ratio: 1'), 'Choice images need a stable responsive ratio.');
check(css.includes('.reflection-option img') && css.includes('aspect-ratio: 3 / 2'), 'Reflection images need a stable responsive ratio.');
check(css.includes('@media (min-width: 721px) and (max-width: 1050px)'), 'Tablet breakpoint is missing.');
check(css.includes('@media (max-width: 720px)'), 'Mobile breakpoint is missing.');
check(css.includes('@media (max-height: 600px) and (orientation: landscape)'), 'Landscape breakpoint is missing.');
check(css.includes('max-inline-size: 100%'), 'Global image overflow guard is missing.');
check(css.includes('.game-canvas { inset: 0 0 auto; block-size: 42%; z-index: 0; }'), 'Mobile portrait must reserve visible space for the scene.');
check(css.includes('.story-panel--choice { overflow: hidden; }'), 'Mobile choices must fit without panel scrolling.');
check(css.includes('.choice-card:nth-child(3):last-child'), 'Three-choice mobile layout is missing.');
check(css.includes('.choice-card:nth-child(4)'), 'Four-choice mobile layout is missing.');

for (const [index, source] of components.entries()) {
  check(!/<img[^>]+(?:width|height)=/i.test(source), `Component ${index + 1} contains a fixed image dimension.`);
}

const profiles = [
  ['desktop', 1440, 1000], ['tablet portrait', 768, 1024], ['tablet landscape', 1024, 768],
  ['mobile portrait', 390, 844], ['mobile landscape', 844, 390],
];
for (const [name, width, height] of profiles) {
  const family = height <= 600 && width > height ? 'mobile' : width <= 720 ? 'mobile' : width <= 1050 ? 'tablet' : 'desktop';
  check(family === (name.startsWith('mobile') ? 'mobile' : name.startsWith('tablet') ? 'tablet' : 'desktop'), `${name}: wrong responsive family`);
  check(width > 0 && height > 0, `${name}: invalid viewport`);
}

if (failures.length) { console.error(failures.map((failure) => `✗ ${failure}`).join('\n')); process.exit(1); }
console.log(`✓ Responsive image contract passed for ${profiles.length} desktop, tablet and mobile profiles.`);
