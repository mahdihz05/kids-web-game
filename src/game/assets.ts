export interface GameAsset {
  key: string;
  path: string;
  type: 'image';
}

// Add production art here. The Phaser scene falls back to generated art
// whenever a key has no path, so story authors can work before art is ready.
export const assetManifest: GameAsset[] = [
  { key: 'village-morning', path: '/assets/scenes/village-morning.png', type: 'image' },
  { key: 'garden-discovery', path: '/assets/scenes/garden-discovery.png', type: 'image' },
  { key: 'craft-workshop', path: '/assets/scenes/craft-workshop.png', type: 'image' },
  { key: 'birthday-celebration', path: '/assets/scenes/birthday-celebration.png', type: 'image' },
];
