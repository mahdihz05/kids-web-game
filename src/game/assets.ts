export interface GameAsset { key: string; path: string; type: 'image'; }

export const assetManifest: GameAsset[] = [
  { key: 'birthday-calendar', path: '/assets/scenes-v3/calendar-v3.png', type: 'image' },
  { key: 'gift-crossroads', path: '/assets/scenes-v3/crossroads-v3.png', type: 'image' },
  { key: 'village-morning', path: '/assets/scenes/village-morning.webp', type: 'image' },
  { key: 'garden-discovery', path: '/assets/scenes/garden-discovery.webp', type: 'image' },
  { key: 'craft-workshop', path: '/assets/scenes-v3/tools-v3.png', type: 'image' },
  { key: 'birthday-celebration', path: '/assets/scenes/birthday-celebration.webp', type: 'image' },
  { key: 'gardener-consequence', path: '/assets/scenes-v3/gardener-v3.png', type: 'image' },
  { key: 'necklace-crafting', path: '/assets/scenes-v3/craft-v3.png', type: 'image' },
  { key: 'grandma-gift', path: '/assets/scenes-v3/grandma-gift-v3.png', type: 'image' },
  { key: 'problem-no-gift', path: '/assets/choices/problem-no-gift-v1.png', type: 'image' },
  { key: 'problem-date', path: '/assets/choices/problem-date-v1.png', type: 'image' },
  { key: 'problem-home', path: '/assets/choices/problem-home-v1.png', type: 'image' },
  { key: 'feeling-confused', path: '/assets/choices/feeling-confused-v1.png', type: 'image' },
  { key: 'feeling-worried', path: '/assets/choices/feeling-worried-v1.png', type: 'image' },
  { key: 'feeling-happy', path: '/assets/choices/feeling-happy-v1.png', type: 'image' },
  { key: 'feeling-sleepy', path: '/assets/choices/feeling-sleepy-v1.png', type: 'image' },
  { key: 'choice-flower', path: '/assets/choices/choice-flower-v1.png', type: 'image' },
  { key: 'choice-necklace', path: '/assets/choices/choice-necklace-v1.png', type: 'image' },
  { key: 'reason-protect-garden', path: '/assets/choices/reason-protect-garden-v1.png', type: 'image' },
  { key: 'reason-handmade', path: '/assets/choices/reason-handmade-v1.png', type: 'image' },
  { key: 'reason-fast', path: '/assets/choices/reason-fast-v1.png', type: 'image' },
  { key: 'reason-grandma-likes', path: '/assets/choices/reason-grandma-likes-v1.png', type: 'image' },
  { key: 'repair-pick-flowers', path: '/assets/choices/repair-pick-flowers-v1.png', type: 'image' },
  { key: 'repair-find-solution', path: '/assets/choices/repair-find-solution-v1.png', type: 'image' },
  { key: 'repair-empty-hand', path: '/assets/choices/repair-empty-hand-v1.png', type: 'image' },
  { key: 'outcome-gardener-sad', path: '/assets/choices/outcome-gardener-sad-v1.png', type: 'image' },
  { key: 'outcome-nothing', path: '/assets/choices/outcome-nothing-v1.png', type: 'image' },
  { key: 'outcome-more-flowers', path: '/assets/choices/outcome-more-flowers-v1.png', type: 'image' },
  { key: 'reflection-think-first', path: '/assets/choices/reflection-think-first-v1.png', type: 'image' },
  { key: 'reflection-special-gift', path: '/assets/choices/reflection-special-gift-v1.png', type: 'image' },
  { key: 'reflection-discover-more', path: '/assets/choices/reflection-discover-more-v1.png', type: 'image' },
  { key: 'reflection-think-more', path: '/assets/choices/reflection-think-more-v1.png', type: 'image' },
  { key: 'reflection-build-more', path: '/assets/choices/reflection-build-more-v1.png', type: 'image' },
  { key: 'tool-thread', path: '/assets/tools/tool-thread-v1.png', type: 'image' },
  { key: 'tool-acorns', path: '/assets/tools/tool-acorns-v1.png', type: 'image' },
  { key: 'tool-patience', path: '/assets/tools/tool-patience-v1.png', type: 'image' },
  { key: 'tool-gloves', path: '/assets/tools/tool-gloves-v1.png', type: 'image' },
  { key: 'tool-scissors', path: '/assets/tools/tool-scissors-v1.png', type: 'image' },
  { key: 'tool-ribbon', path: '/assets/tools/tool-ribbon-v1.png', type: 'image' },
  { key: 'craft-acorn', path: '/assets/tools/craft-acorn-v1.png', type: 'image' },
];

const assetMap = new Map(assetManifest.map((asset) => [asset.key, asset.path]));
export function assetPath(key: string): string {
  const path = assetMap.get(key);
  if (!path) throw new Error(`Unknown image asset: ${key}`);
  return path;
}
