import type { GameSnapshot } from '../engine/GameEngine';
import { VoiceSystem } from '../engine/VoiceSystem';
import type { ReflectionOption, Story, StoryChoice } from '../types/story';
import { ChoiceGrid } from './ChoiceGrid';
import { ResultPanel } from './ResultPanel';
import { ReflectionBoard } from './ReflectionBoard';

interface Props {
  story: Story;
  snapshot: GameSnapshot;
  onChoose: (choice: StoryChoice) => void;
  onContinue: () => void;
  onContinueScene: () => void;
  onContinueTool: () => void;
  onContinueCraft: () => void;
  onContinueReflection: () => void;
  onReflect: (promptId: string, option: ReflectionOption) => void;
  onRestart: () => void;
  onHome: () => void;
}

export function ScenePanel({ story, snapshot, onChoose, onContinue, onContinueScene, onContinueTool, onContinueCraft, onContinueReflection, onReflect, onRestart, onHome }: Props) {
  const { scene, progress } = snapshot;
  const foundCount = progress.discoveries[scene.id]?.length ?? 0;
  const hotspotReady = foundCount === (scene.hotspots?.length ?? 0);
  const selectedTools = progress.selectedTools[scene.id] ?? [];
  const toolReady = (scene.requiredItemIds ?? []).every((id) => selectedTools.includes(id));
  const craftCount = progress.craftProgress[scene.id]?.length ?? 0;
  const craftReady = craftCount >= (scene.requiredCraftCount ?? scene.craftItems?.length ?? 0);
  const reflectionReady = scene.reflectionPrompts?.every((prompt) => progress.reflections[prompt.id]) ?? false;
  const dialogueText = progress.pendingConsequence ?? progress.feedback ?? scene.text;

  return <article className={`story-panel story-panel--${scene.type}`} aria-live="polite">
    <div className="speaker-row">
      <div><span className="phase-chip">مرحله {scene.phase} · {scene.phaseTitle}</span>{scene.eyebrow && <small>{scene.eyebrow}</small>}</div>
      {scene.voiceText && <button className="voice-button" type="button" onClick={() => VoiceSystem.speak(scene.voiceText ?? scene.text, scene.audioUrl)}>🔊 <span>بشنو</span></button>}
    </div>
    {scene.type !== 'result' && <><h2>{scene.characterName ?? story.title}</h2><p className="dialogue-text">{dialogueText}</p>{scene.hint && !progress.feedback && <p className="scene-hint">💡 {scene.hint}</p>}</>}

    {progress.pendingConsequence ? <button className="primary-button" onClick={onContinue} type="button">{scene.actionLabel ?? 'ادامه داستان'} ←</button>
      : scene.type === 'dialogue' ? <button className="primary-button" onClick={onContinueScene} type="button">{scene.actionLabel} ←</button>
      : scene.type === 'choice' ? <ChoiceGrid choices={scene.choices ?? []} onChoose={onChoose} />
      : scene.type === 'hotspot' ? <div className="progress-action"><span>{foundCount} از {scene.hotspots?.length} سرنخ پیدا شد</span><button disabled={!hotspotReady} className="primary-button" onClick={onContinueScene} type="button">{hotspotReady ? scene.actionLabel : 'هر دو سرنخ را پیدا کن'}</button></div>
      : scene.type === 'dragDrop' ? <button disabled={!toolReady} className="primary-button" onClick={onContinueTool} type="button">{toolReady ? 'بریم هدیه را بسازیم ←' : 'ابزار مناسب را پیدا کن'}</button>
      : scene.type === 'craft' ? <button disabled={!craftReady} className="primary-button" onClick={onContinueCraft} type="button">{craftReady ? 'گردنبند آماده شد! ←' : `${craftCount} از ${scene.requiredCraftCount} بلوط اضافه شده`}</button>
      : scene.type === 'reflection' ? <><ReflectionBoard prompts={scene.reflectionPrompts ?? []} progress={progress} onSelect={onReflect} /><button disabled={!reflectionReady} className="primary-button" onClick={onContinueReflection} type="button">{reflectionReady ? 'جشن پایانی ←' : 'هر سه جمله را کامل کن'}</button></>
      : <ResultPanel story={story} scene={scene} progress={progress} onRestart={onRestart} onHome={onHome} />}
  </article>;
}
