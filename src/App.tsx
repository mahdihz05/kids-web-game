import { useEffect, useMemo, useState } from 'react';
import storyData from './data/story.json';
import { GameEngine, type GameSnapshot } from './engine/GameEngine';
import { ProfileSystem } from './engine/ProfileSystem';
import { ScoreSystem } from './engine/ScoreSystem';
import { VoiceSystem } from './engine/VoiceSystem';
import type { DragItem, HotspotItem, Story, StoryChoice } from './types/story';
import { GameCanvas } from './components/GameCanvas';
import { InteractionLayer } from './components/InteractionLayer';
import { MissionHub } from './components/MissionHub';
import { ParentDashboard } from './components/ParentDashboard';
import { ScenePanel } from './components/ScenePanel';

const story = storyData as Story;
type AppView = 'hub' | 'game' | 'parent';

export function App() {
  const engine = useMemo(() => new GameEngine(story), []);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => engine.snapshot());
  const [profile, setProfile] = useState(() => {
    const current = ProfileSystem.load();
    const progress = engine.snapshot().progress;
    return progress.completed ? ProfileSystem.complete(current, story.id, ScoreSystem.stars(progress.score)) : current;
  });
  const [view, setView] = useState<AppView>(() => new URLSearchParams(window.location.search).has('play') ? 'game' : 'hub');

  useEffect(() => engine.subscribe(setSnapshot), [engine]);
  useEffect(() => () => VoiceSystem.stop(), []);

  const openGame = () => {
    VoiceSystem.stop();
    if (snapshot.progress.completed) engine.restart();
    setView('game');
  };
  const goHome = () => {
    VoiceSystem.stop();
    if (snapshot.progress.completed) setProfile((current) => ProfileSystem.complete(current, story.id, ScoreSystem.stars(snapshot.progress.score)));
    setView('hub');
  };

  if (view === 'hub') return <MissionHub profile={profile} onStart={openGame} onParent={() => setView('parent')} />;
  if (view === 'parent') return <ParentDashboard profile={profile} progress={snapshot.progress} onClose={goHome} />;

  const { scene, progress } = snapshot;
  const phasePercent = Math.max(8, (scene.phase / story.totalPhases) * 100);

  return <main className="game-app" style={{ '--theme-primary': story.theme.primary, '--theme-accent': story.theme.accent } as React.CSSProperties}>
    <header className="game-topbar">
      <button className="round-button" onClick={goHome} type="button" aria-label="بازگشت به دهکده">⌂</button>
      <div className="game-title"><small>مأموریت ۱ از ۱۰</small><strong>🎁 {story.title}</strong></div>
      <div className="phase-progress"><div><span>مسیر حل مسئله</span><b>{scene.phase}/{story.totalPhases}</b></div><i><b style={{ width: `${phasePercent}%` }} /></i></div>
      <div className="live-score">⭐ <strong>{progress.score}</strong></div>
      <button className="round-button" onClick={() => VoiceSystem.stop()} type="button" aria-label="قطع صدا">♫</button>
    </header>

    <section className={`game-stage game-stage--${scene.type}`}>
      <GameCanvas image={scene.image} />
      <div className="scene-vignette" />
      {scene.character && <button className="character" type="button" onClick={() => scene.voiceText && VoiceSystem.speak(scene.voiceText)} aria-label="پشمالو، برای شنیدن صحبت کلیک کن"><img src="/assets/characters/pashmaloo.png" alt="پشمالو، خرگوش کوچک" /><span>پشمالو</span></button>}
      <InteractionLayer scene={scene} progress={progress} onDiscover={(item: HotspotItem) => engine.discover(item)} onTool={(item: DragItem) => engine.selectTool(item)} />
      <ScenePanel story={story} snapshot={snapshot} onChoose={(choice: StoryChoice) => engine.choose(choice)} onContinue={() => engine.continueAfterConsequence()} onContinueScene={() => engine.continueScene()} onContinueTool={() => engine.continueAfterTool()} onRestart={() => engine.restart()} onHome={goHome} />
      <div className="ambient-particles" aria-hidden="true"><i>✦</i><i>✧</i><i>•</i></div>
    </section>
  </main>;
}
