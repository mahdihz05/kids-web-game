export interface GameAsset {
  key: string;
  path: string;
  type: 'image';
}

export const assetManifest: GameAsset[] = [
  { key: 'birthday-calendar', path: '/assets/scenes/birthday-calendar-v2.webp', type: 'image' },
  { key: 'gift-crossroads', path: '/assets/scenes/choice-crossroads-v2.webp', type: 'image' },
  { key: 'village-morning', path: '/assets/scenes/village-morning.webp', type: 'image' },
  { key: 'garden-discovery', path: '/assets/scenes/garden-discovery.webp', type: 'image' },
  { key: 'craft-workshop', path: '/assets/scenes/tool-tables-v2.webp', type: 'image' },
  { key: 'birthday-celebration', path: '/assets/scenes/birthday-celebration.webp', type: 'image' },
  { key: 'gardener-consequence', path: '/assets/scenes/gardener-consequence-v2.webp', type: 'image' },
  { key: 'necklace-crafting', path: '/assets/scenes/necklace-craft-v2.webp', type: 'image' },
  { key: 'grandma-gift', path: '/assets/scenes/grandma-gift-v2.webp', type: 'image' },
  { key: 'pashmaloo-choice', path: '/assets/scenes/pashmaloo-choice-v1.png', type: 'image' },
];

export function assetPath(key: string): string {
  return assetManifest.find((asset) => asset.key === key)?.path ?? assetManifest[0].path;
}
