import type { DragItem, GameProgress, HotspotItem, StoryScene } from '../types/story';

interface Props {
  scene: StoryScene;
  progress: GameProgress;
  onDiscover: (item: HotspotItem) => void;
  onTool: (item: DragItem) => void;
}

export function InteractionLayer({ scene, progress, onDiscover, onTool }: Props) {
  if (scene.type === 'hotspot') {
    const found = progress.discoveries[scene.id] ?? [];
    return <div className="interaction-layer">
      {scene.hotspots?.map((item) => <button
        className={`hotspot ${found.includes(item.id) ? 'hotspot--found' : ''}`}
        style={{ left: `${item.x}%`, top: `${item.y}%` }}
        onClick={() => onDiscover(item)} type="button" key={item.id} aria-label={item.label}
      ><span>{found.includes(item.id) ? '✓' : item.icon}</span><small>{found.includes(item.id) ? 'پیدا شد' : item.label}</small></button>)}
    </div>;
  }

  if (scene.type === 'dragDrop') {
    const selected = progress.selectedTools[scene.id];
    return <div className="tool-playground">
      <div className="tool-shelf" aria-label="ابزارها">
        {scene.dragItems?.map((item) => <button
          className={`drag-item ${selected === item.id ? 'drag-item--selected' : ''}`} draggable
          onDragStart={(event) => event.dataTransfer.setData('toolId', item.id)}
          onClick={() => onTool(item)} type="button" key={item.id}
        ><span>{item.icon}</span><small>{item.label}</small><i>⋮⋮</i></button>)}
      </div>
      <div className={`drop-zone ${selected ? 'drop-zone--success' : ''}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); const item = scene.dragItems?.find((candidate) => candidate.id === event.dataTransfer.getData('toolId')); if (item) onTool(item); }}>
        <span>{selected ? '✓' : scene.dropTarget?.icon}</span><strong>{selected ? 'ابزار درست انتخاب شد!' : scene.dropTarget?.label}</strong><small>{selected ? 'آفرین، آماده ساختن هدیه‌ایم.' : 'ابزار را بکش و اینجا بینداز'}</small>
      </div>
    </div>;
  }
  return null;
}
