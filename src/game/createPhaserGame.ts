import Phaser from 'phaser';
import { StoryWorldScene } from './StoryWorldScene';

export const createPhaserGame = (parent: HTMLElement): Phaser.Game =>
  new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    transparent: true,
    render: { antialias: true, pixelArt: false },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [StoryWorldScene],
  });
