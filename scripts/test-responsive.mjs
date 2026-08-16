import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const contract = await readFile(resolve(root, 'src/styles/responsive.css'), 'utf8');
const main = await readFile(resolve(root, 'src/main.tsx'), 'utf8');
const canvas = await readFile(resolve(root, 'src/components/GameCanvas.tsx'), 'utf8');
const components = await Promise.all([
  'ChoiceGrid.tsx', 'InteractionLayer.tsx', 'ReflectionBoard.tsx', 'MissionHub.tsx', 'StoryIntro.tsx',
].map((file) => readFile(resolve(root, 'src/components', file), 'utf8')));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(main.indexOf("'./styles/responsive.css'") > main.indexOf("'./styles/global.css'"), 'Responsive contract must load after global styles.');
check(canvas.includes('game-canvas__image'), 'Game scene must render a responsive image element.');
check(contract.includes('object-fit: contain'), 'Scene images must preserve their complete aspect ratio.');
check(contract.includes('overflow: hidden') && contract.includes('.story-panel--choice'), 'Choice panels must not scroll or leak cards.');
check(contract.includes('grid-auto-rows: minmax(0, 1fr)'), 'Choice rows must shrink to available panel height.');
check(contract.includes('.choice-card:nth-child(3):last-child'), 'Three-choice layout is missing.');
check(contract.includes('@media (min-width: 1200px)'), 'Desktop breakpoint is missing.');
check(contract.includes('--scene-width: 60%') && contract.includes('width: calc(40% - 32px)'), 'Desktop scene and inset panel must use a non-overlapping 60/40 split.');
check(contract.includes('right: 16px') && contract.includes('left: auto'), 'Desktop panel must be inset on the RTL/right side.');
check(contract.includes('.reflection-option img { height: 78px; object-fit: cover; }'), 'Desktop reflection images must use the enlarged visual layout.');
check(contract.includes('.reflection-option img { height: 56px; object-fit: cover; }'), 'Mobile reflection images must use the enlarged visual layout.');
check(contract.includes('@media (min-width: 768px) and (max-width: 1199px) and (orientation: landscape)'), 'Tablet landscape breakpoint is missing.');
check(contract.includes('@media (min-width: 768px) and (max-width: 1199px) and (orientation: portrait)'), 'Tablet portrait breakpoint is missing.');
check(contract.includes('@media (max-width: 767px) and (orientation: portrait)'), 'Mobile portrait breakpoint is missing.');
check(contract.includes('@media (max-width: 900px) and (max-height: 600px) and (orientation: landscape)'), 'Mobile landscape breakpoint is missing.');
check(contract.includes('grid-template-columns: repeat(2, minmax(0, 1fr))') && contract.includes('object-fit: cover'), 'Mobile choices must use a compact two-column image grid.');

for (const [index, source] of components.entries()) check(!/<img[^>]+(?:width|height)=/i.test(source), `Component ${index + 1} contains a fixed image dimension.`);

const profiles = [
  { name: 'desktop', width: 1440, height: 1000, scene: [0, 0, 60, 100], panel: [60, 0, 40, 100], horizontalRtl: true },
  { name: 'tablet portrait', width: 768, height: 1024, scene: [0, 0, 100, 44], panel: [0, 44, 100, 56] },
  { name: 'tablet landscape', width: 1024, height: 768, scene: [0, 0, 56, 100], panel: [56, 0, 44, 100], horizontalRtl: true },
  { name: 'mobile portrait', width: 390, height: 844, scene: [0, 0, 100, 40], panel: [0, 40, 100, 60] },
  { name: 'mobile landscape', width: 844, height: 390, scene: [0, 0, 42, 100], panel: [42, 0, 58, 100], horizontalRtl: true },
];
const intersects = ([x1, y1, w1, h1], [x2, y2, w2, h2]) => Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2)) * Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));
for (const profile of profiles) {
  for (const [label, rect] of [['scene', profile.scene], ['panel', profile.panel]]) {
    const [x, y, width, height] = rect;
    check(x >= 0 && y >= 0 && x + width <= 100 && y + height <= 100, `${profile.name}: ${label} leaves the game stage`);
    check(width > 0 && height > 0, `${profile.name}: ${label} has no visible area`);
  }
  check(intersects(profile.scene, profile.panel) === 0, `${profile.name}: scene is hidden behind the panel`);
  if (profile.horizontalRtl) check(profile.panel[0] >= 42, `${profile.name}: controls must stay on the RTL/right side`);
  const stageHeight = profile.height <= 600 && profile.width > profile.height ? profile.height - 126 : profile.height - 198;
  const panelHeight = stageHeight * (profile.panel[3] / 100);
  check(panelHeight >= 240, `${profile.name}: panel is too short for a four-choice grid`);
}

if (failures.length) { console.error(failures.map((failure) => `✗ ${failure}`).join('\n')); process.exit(1); }
console.log('✓ Responsive layout contract passed: right-side RTL controls on horizontal screens, non-overlapping portrait rows, bounded choice grids.');
