import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import type { StoryWorldScene } from '../game/StoryWorldScene';

interface GameCanvasProps {
  image: string;
}

export function GameCanvas({ image }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    let cancelled = false;
    const host = hostRef.current;
    void import('../game/createPhaserGame').then(({ createPhaserGame }) => {
      if (!cancelled) gameRef.current = createPhaserGame(host);
    });
    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const update = () => {
      const scene = game.scene.getScene('story-world') as StoryWorldScene | null;
      scene?.updateWorld(image);
    };
    if (game.isBooted) update();
    else game.events.once('ready', update);
  }, [image]);

  return <div className="game-canvas" ref={hostRef} aria-hidden="true" />;
}
