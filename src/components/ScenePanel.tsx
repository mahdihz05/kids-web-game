import type { GameSnapshot } from '../engine/GameEngine';
import { VoiceSystem } from '../engine/VoiceSystem';
import type { Story, StoryChoice } from '../types/story';
import { ChoiceGrid } from './ChoiceGrid';
import { ResultPanel } from './ResultPanel';

interface Props {
  story: Story;
  snapshot: GameSnapshot;
  onChoose: (choice: StoryChoice) => void;
  onContinue: () => void;
  onContinueScene: () => void;
  onContinueTool: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export function ScenePanel({ story, snapshot, onChoose, onContinue, onContinueScene, onContinueTool, onRestart, onHome }: Props) {
  const { scene, progress } = snapshot;
  const foundCount = progress.discoveries[scene.id]?.length ?? 0;
  const hotspotReady = foundCount === (scene.hotspots?.length ?? 0);
  const toolReady = Boolean(progress.selectedTools[scene.id]);
  const dialogueText = progress.pendingConsequence ?? progress.feedback ?? scene.text;

  return <article className={`story-panel story-panel--${scene.type}`} aria-live="polite">
    <div className="speaker-row">
      <div><span className="phase-chip">مرحله {scene.phase} · {scene.phaseTitle}</span>{scene.eyebrow && <small>{scene.eyebrow}</small>}</div>
      {scene.voiceText && <button className="voice-button" type="button" onClick={() => VoiceSystem.speak(scene.voiceText ?? scene.text)}>🔊 <span>بشنو</span></button>}
    </div>
    {scene.type !== 'result' && <><h2>{scene.characterName ?? story.title}</h2><p className="dialogue-text">{dialogueText}</p>{scene.hint && !progress.feedback && <p className="scene-hint">💡 {scene.hint}</p>}</>}

    {progress.pendingConsequence ? <button className="primary-button" onClick={onContinue} type="button">{scene.actionLabel ?? 'ادامه داستان'} ←</button>
      : scene.type === 'dialogue' ? <button className="primary-button" onClick={onContinueScene} type="button">{scene.actionLabel} ←</button>
      : scene.type === 'choice' || scene.type === 'reflection' ? <ChoiceGrid choices={scene.choices ?? []} onChoose={onChoose} compact={scene.type === 'reflection'} />
      : scene.type === 'hotspot' ? <div className="progress-action"><span>{foundCount} از {scene.hotspots?.length} سرنخ پیدا شد</span><button disabled={!hotspotReady} className="primary-button" onClick={onContinueScene} type="button">{hotspotReady ? scene.actionLabel : 'هر دو سرنخ را پیدا کن'}</button></div>
      : scene.type === 'dragDrop' ? <button disabled={!toolReady} className="primary-button" onClick={onContinueTool} type="button">{toolReady ? 'بریم هدیه را بسازیم ←' : 'ابزار مناسب را پیدا کن'}</button>
      : <ResultPanel story={story} scene={scene} progress={progress} onRestart={onRestart} onHome={onHome} />}
  </article>;
}
