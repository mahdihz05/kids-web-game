import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import storySource from './data/story.json';
import { GameEngine, type GameSnapshot } from './engine/GameEngine';
import { ProfileSystem } from './engine/ProfileSystem';
import { ScoreSystem } from './engine/ScoreSystem';
import type { CraftItem, DragItem, HotspotItem, ReflectionOption, Story, StoryChoice } from './types/story';
import { GameCanvas } from './components/GameCanvas';
import { InteractionLayer } from './components/InteractionLayer';
import { MissionHub } from './components/MissionHub';
import { ParentDashboard } from './components/ParentDashboard';
import { ScenePanel } from './components/ScenePanel';
import { PhaseJourney } from './components/PhaseJourney';
import { StoryIntro } from './components/StoryIntro';
import { PageTurn, type TurnPhase } from './components/PageTurn';
import { StoryBook } from './components/StoryBook';
import { hasSeenStoryIntro } from './utils/introStorage';
import { assetPath } from './game/assets';

type AppView = 'intro' | 'hub' | 'game' | 'parent';
const story = storySource as Story;

export function App() {
  const engine = useMemo(() => new GameEngine(story), []);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => engine.snapshot());
  const [profile, setProfile] = useState(() => {
    const current = ProfileSystem.load();
    const progress = engine.snapshot().progress;
    return progress.completed ? ProfileSystem.complete(current, story.id, ScoreSystem.stars(progress.score)) : current;
  });
  const [view, setView] = useState<AppView>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('play')) return 'game';
    if (params.has('library')) return 'hub';
    return hasSeenStoryIntro() ? 'hub' : 'intro';
  });
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('idle');
  const [bookOpen, setBookOpen] = useState(false);
  const pendingAction = useRef<{ run: () => void; ready: Promise<void> } | null>(null);

  useEffect(() => engine.subscribe(setSnapshot), [engine]);
  const transition = useCallback((action: () => void, nextSceneId?: string) => {
    if (turnPhase !== 'idle') return;
    const target = nextSceneId ? story.scenes.find((candidate) => candidate.id === nextSceneId) : undefined;
    const ready = target ? new Promise<void>((resolve) => {
      const preload = new Image();
      preload.onload = () => resolve();
      preload.onerror = () => resolve();
      preload.src = assetPath(target.image);
      if (preload.complete) resolve();
    }) : Promise.resolve();
    pendingAction.current = { run: action, ready };
    setTurnPhase('covering');
  }, [turnPhase]);
  const changeView = (nextView: AppView) => transition(() => setView(nextView));
  const finishCover = async () => {
    const pending = pendingAction.current;
    if (!pending) return;
    await pending.ready;
    pending.run();
    pendingAction.current = null;
    setTurnPhase('revealing');
  };
  const finishReveal = () => setTurnPhase('idle');
  const openGame = () => {
    if (snapshot.progress.completed) engine.restart();
    transition(() => setView('game'), snapshot.progress.completed ? story.startScene : snapshot.scene.id);
  };
  const goHome = () => {
    if (snapshot.progress.completed) setProfile((current) => ProfileSystem.complete(current, story.id, ScoreSystem.stars(snapshot.progress.score)));
    transition(() => setView('hub'));
  };

  const choose = (choice: StoryChoice) => {
    if (choice.retry || choice.consequence) engine.choose(choice);
    else transition(() => engine.choose(choice), choice.nextScene);
  };

  const pageTurn = <PageTurn phase={turnPhase} onCoverEnd={finishCover} onRevealEnd={finishReveal} />;
  if (view === 'intro') return <div className="view-shell"><StoryIntro onClose={() => changeView('hub')} />{pageTurn}</div>;
  if (view === 'hub') return <div className="view-shell"><MissionHub profile={profile} onStart={openGame} onParent={() => changeView('parent')} onStory={() => changeView('intro')} />{pageTurn}</div>;
  if (view === 'parent') return <div className="view-shell"><ParentDashboard profile={profile} progress={snapshot.progress} onClose={goHome} />{pageTurn}</div>;

  const { scene, progress } = snapshot;
  const phasePercent = Math.max(8, (scene.phase / story.totalPhases) * 100);

  return <div className={`view-shell ${turnPhase !== 'idle' ? 'view-shell--turning' : ''}`}><main className="game-app" aria-busy={turnPhase !== 'idle'} style={{ '--theme-primary': story.theme.primary, '--theme-accent': story.theme.accent } as React.CSSProperties}>
    <header className="game-topbar">
      <button className="round-button" onClick={goHome} type="button" aria-label="بازگشت به دهکده">⌂</button>
      <div className="game-title"><small>مأموریت ۱ از ۱۰</small><strong>🎁 {story.title}</strong></div>
      <div className="phase-progress"><div><span>مسیر حل مسئله</span><b>{scene.phase}/{story.totalPhases}</b></div><i><b style={{ width: `${phasePercent}%` }} /></i></div>
      <button className="round-button story-reader" onClick={() => setBookOpen(true)} type="button" aria-label="داستان کامل">📖</button>
      <div className="live-score">⭐ <strong>{progress.score}</strong></div>
    </header>

    <section className={`game-stage game-stage--${scene.type}`}>
      <GameCanvas image={scene.image} />
      <div className="scene-vignette" />
      {scene.character && <div className="character" aria-hidden="true"><img src="/assets/characters/pashmaloo.png" alt="" /><span>پشمالو</span></div>}
      <InteractionLayer scene={scene} progress={progress}
        onDiscover={(item: HotspotItem) => engine.discover(item)}
        onTool={(item: DragItem) => engine.selectTool(item)}
        onCraft={(item: CraftItem) => engine.craft(item)} />
      <ScenePanel story={story} snapshot={snapshot} onChoose={choose}
        onContinue={() => { const selected = scene.choices?.find((candidate) => progress.choices.some((record) => record.sceneId === scene.id && record.choiceId === candidate.id)); transition(() => engine.continueAfterConsequence(), selected?.nextScene); }}
        onContinueScene={() => transition(() => engine.continueScene(), scene.nextScene)}
        onContinueTool={() => transition(() => engine.continueAfterTool(), scene.dropTarget?.nextScene)}
        onContinueCraft={() => transition(() => engine.continueCraft(), scene.nextScene)}
        onContinueReflection={() => transition(() => engine.continueReflection(), scene.nextScene)}
        onReflect={(promptId: string, option: ReflectionOption) => engine.reflect(promptId, option)}
        onRestart={() => transition(() => engine.restart(), story.startScene)} onHome={goHome} />
      <div className="ambient-particles" aria-hidden="true"><i>✦</i><i>✧</i><i>•</i></div>
    </section>
    <PhaseJourney currentPhase={scene.phase} />
  </main>{bookOpen && <StoryBook story={story} onClose={() => setBookOpen(false)} />}{pageTurn}</div>;
}
