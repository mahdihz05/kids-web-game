import type { GameSnapshot } from '../engine/GameEngine';
import type { ReflectionOption, Story, StoryChoice } from '../types/story';
import { ChoiceGrid } from './ChoiceGrid';
import { ResultPanel } from './ResultPanel';
import { ReflectionBoard } from './ReflectionBoard';
import { NarrationButton } from './NarrationButton';

interface Props { story: Story; snapshot: GameSnapshot; onChoose: (choice: StoryChoice) => void; onContinue: () => void; onContinueScene: () => void; onContinueTool: () => void; onContinueCraft: () => void; onContinueReflection: () => void; onReflect: (promptId: string, option: ReflectionOption) => void; onRestart: () => void; onHome: () => void; }

export function ScenePanel({ story, snapshot, onChoose, onContinue, onContinueScene, onContinueTool, onContinueCraft, onContinueReflection, onReflect, onRestart, onHome }: Props) {
  const { scene, progress } = snapshot;
  const foundCount = progress.discoveries[scene.id]?.length ?? 0;
  const hotspotReady = foundCount === (scene.hotspots?.length ?? 0);
  const selectedTools = progress.selectedTools[scene.id] ?? [];
  const toolReady = (scene.requiredItemIds ?? []).every((id) => selectedTools.includes(id));
  const craftCount = progress.craftProgress[scene.id]?.length ?? 0;
  const craftReady = craftCount >= (scene.requiredCraftCount ?? scene.craftItems?.length ?? 0);
  const reflectionReady = scene.reflectionPrompts?.every((prompt) => progress.reflections[prompt.id]) ?? false;
  const shortPrompt = progress.pendingConsequence ?? progress.feedback ?? scene.prompt ?? scene.text;
  return <article className={`story-panel story-panel--${scene.type}`} aria-live="polite">
    <div className="speaker-row"><span className="phase-chip">مرحله {scene.phase} · {scene.phaseTitle}</span></div>
    {scene.type !== 'result' && <><h2>{scene.characterName ?? story.title}</h2><p className="scene-prompt">{shortPrompt}</p><NarrationButton text={scene.narration ?? scene.text} audio={scene.audio} /></>}
    {progress.pendingConsequence ? <button className="primary-button" onClick={onContinue} type="button">ادامه ←</button>
      : scene.type === 'dialogue' ? <button className="primary-button" onClick={onContinueScene} type="button">{scene.actionLabel} ←</button>
      : scene.type === 'choice' ? <ChoiceGrid choices={scene.choices ?? []} onChoose={onChoose} />
      : scene.type === 'hotspot' ? <div className="progress-action"><span>{foundCount} از {scene.hotspots?.length} سرنخ</span><button disabled={!hotspotReady} className="primary-button" onClick={onContinueScene} type="button">{hotspotReady ? scene.actionLabel : 'سرنخ‌ها را پیدا کن'}</button></div>
      : scene.type === 'dragDrop' ? <button disabled={!toolReady} className="primary-button" onClick={onContinueTool} type="button">{toolReady ? 'بریم بسازیم ←' : 'ابزارها را پیدا کن'}</button>
      : scene.type === 'craft' ? <button disabled={!craftReady} className="primary-button" onClick={onContinueCraft} type="button">{craftReady ? 'گردنبند آماده شد! ←' : `${craftCount} از ${scene.requiredCraftCount} بلوط`}</button>
      : scene.type === 'reflection' ? <><ReflectionBoard prompts={scene.reflectionPrompts ?? []} progress={progress} onSelect={onReflect} /><button disabled={!reflectionReady} className="primary-button" onClick={onContinueReflection} type="button">{reflectionReady ? 'جشن پایانی ←' : 'هر سه کارت را انتخاب کن'}</button></>
      : <ResultPanel story={story} scene={scene} progress={progress} onRestart={onRestart} onHome={onHome} />}
  </article>;
}
