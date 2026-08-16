import { useEffect, useRef, useState } from 'react';
import type { CraftItem, DragItem, GameProgress, HotspotItem, StoryScene } from '../types/story';
import { assetPath } from '../game/assets';

interface Props { scene: StoryScene; progress: GameProgress; onDiscover: (item: HotspotItem) => void; onTool: (item: DragItem) => void; onCraft: (item: CraftItem) => void; }

export function InteractionLayer({ scene, progress, onDiscover, onTool, onCraft }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [hotspotPositions, setHotspotPositions] = useState<Record<string, { left: number; top: number }>>({});

  useEffect(() => {
    if (scene.type !== 'hotspot' || !layerRef.current) return;
    const layer = layerRef.current;
    const update = () => {
      const width = layer.clientWidth;
      const height = layer.clientHeight;
      const sourceRatio = 16 / 9;
      const renderedWidth = Math.min(width, height * sourceRatio);
      const renderedHeight = renderedWidth / sourceRatio;
      const offsetX = (width - renderedWidth) / 2;
      const offsetY = (height - renderedHeight) / 2;
      setHotspotPositions(Object.fromEntries((scene.hotspots ?? []).map((item) => [item.id, {
        left: offsetX + (item.x / 100) * renderedWidth,
        top: offsetY + (item.y / 100) * renderedHeight,
      }])));
    };
    const observer = new ResizeObserver(update);
    observer.observe(layer);
    update();
    return () => observer.disconnect();
  }, [scene]);

  if (scene.type === 'hotspot') {
    const found = progress.discoveries[scene.id] ?? [];
    return <div className="interaction-layer" ref={layerRef}>{scene.hotspots?.map((item) => <button
      className={`hotspot ${found.includes(item.id) ? 'hotspot--found' : ''}`}
      style={hotspotPositions[item.id] ?? { left: `${item.x}%`, top: `${item.y}%` }}
      onClick={() => onDiscover(item)} type="button" key={item.id} aria-label={item.label}
    ><span>{found.includes(item.id) ? '✓' : item.icon}</span><small>{found.includes(item.id) ? 'پیدا شد' : item.label}</small></button>)}</div>;
  }

  if (scene.type === 'dragDrop') {
    const selected = progress.selectedTools[scene.id] ?? [];
    const required = scene.requiredItemIds ?? [];
    const ready = required.every((id) => selected.includes(id));
    return <div className="tool-playground"><div className="tool-shelf" aria-label="ابزارها">{scene.dragItems?.map((item) => <button
      className={`drag-item ${selected.includes(item.id) ? 'drag-item--selected' : ''}`} draggable={!selected.includes(item.id)}
      onDragStart={(event) => event.dataTransfer.setData('toolId', item.id)} onClick={() => onTool(item)} type="button" key={item.id}
    ><img src={assetPath(item.image)} alt="" /><small>{item.label}</small><i>⋮⋮</i></button>)}</div>
      <div className={`drop-zone ${ready ? 'drop-zone--success' : ''}`} onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); const item = scene.dragItems?.find((candidate) => candidate.id === event.dataTransfer.getData('toolId')); if (item) onTool(item); }}>
        <span>{ready ? '✓' : scene.dropTarget?.icon}</span><strong>{ready ? 'همه آماده‌اند!' : scene.dropTarget?.label}</strong><small>{`${selected.length} از ${required.length}`}</small>
      </div></div>;
  }

  if (scene.type === 'craft') {
    const completed = progress.craftProgress[scene.id] ?? [];
    return <div className="craft-playground" aria-label="ساخت گردنبند بلوط"><div className="craft-thread" aria-hidden="true" /><div className="craft-items">{scene.craftItems?.map((item, index) => {
      const done = completed.includes(item.id); const unlocked = index <= completed.length;
      return <button className={`craft-item ${done ? 'craft-item--done' : ''}`} disabled={!unlocked || done} type="button" onClick={() => onCraft(item)} key={item.id} aria-label={`${item.label}${done ? '، اضافه شد' : ''}`}>
        <img src={assetPath(item.image)} alt="" /><small>{done ? 'اضافه شد' : item.label}</small>
      </button>;
    })}</div><strong className="craft-counter">{completed.length} از {scene.requiredCraftCount ?? scene.craftItems?.length} بلوط</strong></div>;
  }
  return null;
}
