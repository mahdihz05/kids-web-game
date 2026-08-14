import { useEffect, useState } from 'react';
import { assetPath } from '../game/assets';

export function GameCanvas({ image }: { image: string }) {
  const [loadedPath, setLoadedPath] = useState('');
  const path = assetPath(image);
  const ready = loadedPath === path;
  useEffect(() => {
    const preload = new Image();
    preload.onload = () => setLoadedPath(path);
    preload.onerror = () => setLoadedPath(path);
    preload.src = path;
    return () => { preload.onload = null; preload.onerror = null; };
  }, [path]);
  return <div className={`game-canvas game-canvas--${image} ${ready ? 'game-canvas--ready' : ''}`} style={{ backgroundImage: `url("${path}")` }}><span className="scene-loader">کتاب دارد بیدار می‌شود…</span></div>;
}
