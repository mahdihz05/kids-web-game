import { useEffect, useRef, useState } from 'react';
import type { CraftItem, DragItem, GameProgress, HotspotItem, StoryScene } from '../types/story';
import { assetPath } from '../game/assets';

interface Props { scene: StoryScene; progress: GameProgress; onDiscover: (item: HotspotItem) => void; onTool: (item: DragItem) => void; onCraft: (item: CraftItem) => void; }
const Visual = ({ image }: { image?: string; label: string }) => <img src={assetPath(image ?? 'birthday-celebration')} alt="" aria-hidden="true" />;

export function InteractionLayer({ scene, progress, onDiscover, onTool, onCraft }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { left: string; top: string }>>({});
  useEffect(() => {
    if (scene.type !== 'hotspot' || !layerRef.current) return;
    const update = () => setPositions(Object.fromEntries((scene.hotspots ?? []).map((item) => [item.id, { left: `${item.x}%`, top: `${item.y}%` }])));
    const observer = new ResizeObserver(update); observer.observe(layerRef.current); update(); return () => observer.disconnect();
  }, [scene]);
  if (scene.type === 'hotspot') {
    const found = progress.discoveries[scene.id] ?? [];
    return <div className="interaction-layer" ref={layerRef}>{scene.hotspots?.map((item) => <button className={`hotspot ${found.includes(item.id) ? 'hotspot--found' : ''}`} style={positions[item.id]} onClick={() => onDiscover(item)} type="button" key={item.id} aria-label={item.label}>
      <Visual image={item.image} label={item.label} /><small>{found.includes(item.id) ? 'پیدا شد' : item.label}</small>
    </button>)}</div>;
  }
  if (scene.type === 'dragDrop') {
    const selected = progress.selectedTools[scene.id] ?? []; const required = scene.requiredItemIds ?? []; const ready = required.every((id) => selected.includes(id));
    return <div className="tool-playground"><div className="tool-shelf" aria-label="ابزارها">{scene.dragItems?.map((item) => <button className={`drag-item ${selected.includes(item.id) ? 'drag-item--selected' : ''}`} onClick={() => onTool(item)} type="button" key={item.id}>
      <Visual image={item.image} label={item.label} /><small>{item.label}</small>
    </button>)}</div><div className={`drop-zone ${ready ? 'drop-zone--success' : ''}`}><Visual image="necklace-crafting" label="میز ساخت" /><strong>{ready ? 'همه آماده‌اند!' : 'میز ساخت گردنبند'}</strong></div></div>;
  }
  if (scene.type === 'craft') {
    const completed = progress.craftProgress[scene.id] ?? [];
    return <div className="craft-playground"><div className="craft-thread" aria-hidden="true" /><div className="craft-items">{scene.craftItems?.map((item, index) => {
      const done = completed.includes(item.id); const unlocked = index <= completed.length;
      return <button className={`craft-item ${done ? 'craft-item--done' : ''}`} disabled={!unlocked || done} type="button" onClick={() => onCraft(item)} key={item.id} aria-label={item.label}><Visual image={item.image} label={item.label} /></button>;
    })}</div><strong className="craft-counter">{completed.length} از {scene.requiredCraftCount ?? scene.craftItems?.length}</strong></div>;
  }
  return null;
}
