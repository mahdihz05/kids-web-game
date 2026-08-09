import Phaser from 'phaser';
import { assetManifest } from './assets';

export class StoryWorldScene extends Phaser.Scene {
  private imageKey = 'village-morning';
  private background?: Phaser.GameObjects.Image;

  constructor() {
    super('story-world');
  }

  preload(): void {
    assetManifest.forEach((asset) => this.load.image(asset.key, asset.path));
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2b2035');
    this.drawWorld(false);
    this.scale.on('resize', () => this.fitBackground());
  }

  updateWorld(image: string): void {
    if (this.imageKey === image && this.background) return;
    this.imageKey = image;
    if (this.sys.isActive()) this.drawWorld(true);
  }

  private drawWorld(animate: boolean): void {
    const oldBackground = this.background;
    if (!this.textures.exists(this.imageKey)) return;
    this.background = this.add.image(this.scale.width / 2, this.scale.height / 2, this.imageKey).setAlpha(animate ? 0 : 1);
    this.fitBackground();
    if (animate) {
      this.tweens.add({ targets: this.background, alpha: 1, duration: 550, ease: 'Sine.easeOut' });
      if (oldBackground) this.tweens.add({ targets: oldBackground, alpha: 0, duration: 420, onComplete: () => oldBackground.destroy() });
    } else oldBackground?.destroy();
  }

  private fitBackground(): void {
    if (!this.background) return;
    const source = this.background.texture.getSourceImage() as HTMLImageElement;
    const scale = Math.max(this.scale.width / source.width, this.scale.height / source.height);
    this.background.setPosition(this.scale.width / 2, this.scale.height / 2).setScale(scale);
  }
}
