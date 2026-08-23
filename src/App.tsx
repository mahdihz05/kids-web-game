import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_STORY_ID, getStory, storyRegistry } from './data/storyRegistry';
import { GameEngine, type GameSnapshot } from './engine/GameEngine';
import { ProfileSystem } from './engine/ProfileSystem';
import { ScoreSystem } from './engine/ScoreSystem';
import type { CraftItem, DragItem, HotspotItem, ReflectionOption, StoryChoice } from './types/story';
import { GameCanvas } from './components/GameCanvas';
import { InteractionLayer } from './components/InteractionLayer';
import { MissionHub } from './components/MissionHub';
import { ParentDashboard } from './components/ParentDashboard';
import { ScenePanel } from './components/ScenePanel';
import { PhaseJourney } from './components/PhaseJourney';
import { StoryIntro } from './components/StoryIntro';
import { PageTurn, type TurnPhase } from './components/PageTurn';
import { StoryBook } from './components/StoryBook';
import { NarrationButton } from './components/NarrationButton';
import { AdminDashboard } from './components/AdminDashboard';
import { hasSeenStoryIntro } from './utils/introStorage';
import { newAnalyticsRun, trackAnalytics } from './utils/analytics';
import { assetPath } from './game/assets';

type AppView = 'intro' | 'hub' | 'game' | 'parent' | 'admin';
export function App() {
  const initialStoryId = useMemo(() => {
    const requested = new URLSearchParams(window.location.search).get('play');
    return requested && storyRegistry[requested] ? requested : DEFAULT_STORY_ID;
  }, []);
  const [storyId, setStoryId] = useState(initialStoryId);
  const engines = useMemo(() => Object.fromEntries(Object.entries(storyRegistry).map(([id, registeredStory]) => [id, new GameEngine(registeredStory)])), []);
  const story = getStory(storyId);
  const engine = engines[storyId];
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => engine.snapshot());
  const [profile, setProfile] = useState(() => {
    const current = ProfileSystem.load();
    const progress = engine.snapshot().progress;
    return progress.completed ? ProfileSystem.complete(current, story.id, ScoreSystem.stars(progress.score)) : current;
  });
  const [view, setView] = useState<AppView>(() => {
    if (window.location.pathname.startsWith('/admin')) return 'admin';
    const params = new URLSearchParams(window.location.search);
    if (params.has('play')) return 'game';
    if (params.has('library')) return 'hub';
    return hasSeenStoryIntro() ? 'hub' : 'intro';
  });
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('idle');
  const [bookOpen, setBookOpen] = useState(false);
  const pendingAction = useRef<{ run: () => void; ready: Promise<void> } | null>(null);

  useEffect(() => {
    return engine.subscribe(setSnapshot);
  }, [engine]);
  useEffect(() => {
    if (view !== 'game') return;
    trackAnalytics(story.id, snapshot.progress.completed ? 'complete' : 'scene_enter', snapshot.scene.id);
  }, [snapshot.scene.id, snapshot.progress.completed, story.id, view]);
  useEffect(() => {
    if (view !== 'game') return;
    const heartbeat = window.setInterval(() => trackAnalytics(story.id, 'heartbeat', engine.snapshot().scene.id), 30_000);
    return () => window.clearInterval(heartbeat);
  }, [engine, story.id, view]);
  const transition = useCallback((action: () => void, nextSceneId?: string, preloadImage?: string) => {
    if (turnPhase !== 'idle') return;
    const target = preloadImage ? { image: preloadImage } : nextSceneId ? story.scenes.find((candidate) => candidate.id === nextSceneId) : undefined;
    const ready = target ? new Promise<void>((resolve) => {
      const preload = new Image();
      preload.onload = () => resolve();
      preload.onerror = () => resolve();
      preload.src = assetPath(target.image);
      if (preload.complete) resolve();
    }) : Promise.resolve();
    pendingAction.current = { run: action, ready };
    setTurnPhase('covering');
  }, [story.scenes, turnPhase]);
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
  const openGame = (missionId: string) => {
    const nextStory = getStory(missionId);
    const nextEngine = engines[nextStory.id];
    const nextSnapshot = nextEngine.snapshot();
    if (nextSnapshot.progress.completed) { trackAnalytics(nextStory.id, 'replay', nextSnapshot.scene.id); nextEngine.restart(); }
    newAnalyticsRun();
    trackAnalytics(nextStory.id, 'start', nextEngine.snapshot().scene.id);
    const readySnapshot = nextEngine.snapshot();
    transition(() => {
      setStoryId(nextStory.id);
      setSnapshot(readySnapshot);
      setView('game');
    }, readySnapshot.scene.id, readySnapshot.scene.image);
  };
  const goHome = () => {
    if (snapshot.progress.completed) setProfile((current) => ProfileSystem.complete(current, story.id, ScoreSystem.stars(snapshot.progress.score)));
    transition(() => setView('hub'));
  };

  const choose = (choice: StoryChoice) => {
    trackAnalytics(story.id, 'choice', snapshot.scene.id, choice.id);
    if (choice.retry || choice.consequence) engine.choose(choice);
    else transition(() => engine.choose(choice), choice.nextScene);
  };

  const pageTurn = <PageTurn phase={turnPhase} onCoverEnd={finishCover} onRevealEnd={finishReveal} />;
  if (view === 'intro') return <div className="view-shell"><StoryIntro onClose={() => changeView('hub')} />{pageTurn}</div>;
  if (view === 'hub') return <div className="view-shell"><MissionHub profile={profile} onStart={openGame} onParent={() => changeView('parent')} onStory={() => changeView('intro')} />{pageTurn}</div>;
  if (view === 'parent') return <div className="view-shell"><ParentDashboard profile={profile} progress={snapshot.progress} onClose={goHome} />{pageTurn}</div>;
  if (view === 'admin') return <div className="view-shell"><AdminDashboard onClose={() => { window.history.pushState({}, '', '/'); setView('hub'); }} />{pageTurn}</div>;

  const { scene, progress } = snapshot;
  const phasePercent = Math.max(8, (scene.phase / story.totalPhases) * 100);

  return <div className={`view-shell ${turnPhase !== 'idle' ? 'view-shell--turning' : ''}`}><main className="game-app" aria-busy={turnPhase !== 'idle'} style={{ '--theme-primary': story.theme.primary, '--theme-accent': story.theme.accent } as React.CSSProperties}>
    <header className="game-topbar">
      <button className="round-button" onClick={goHome} type="button" aria-label="بازگشت به دهکده">⌂</button>
      <div className="game-title"><small>مأموریت {story.id === DEFAULT_STORY_ID ? '۱' : '۲'} از ۱۰</small><strong>{story.id === DEFAULT_STORY_ID ? '🎁' : '🌰'} {story.title}</strong></div>
      <div className="phase-progress"><div><span>مسیر حل مسئله</span><b>{scene.phase}/{story.totalPhases}</b></div><i><b style={{ width: `${phasePercent}%` }} /></i></div>
      {scene.bookText && <button className="round-button story-reader" onClick={() => setBookOpen(true)} type="button" aria-label="داستان این بخش">📖</button>}
      {scene.id === story.startScene && <NarrationButton iconOnly text={scene.narration ?? scene.text} audio={scene.audio} />}
      <div className="live-score">⭐ <strong>{progress.score}</strong></div>
    </header>

    <section className={`game-stage game-stage--${scene.type}`}>
      <GameCanvas image={scene.image} />
      <div className="scene-vignette" />
      {scene.character && <div className="character" aria-hidden="true"><img src="/assets/characters/pashmaloo.png" alt="" /><span>پشمالو</span></div>}
      <InteractionLayer scene={scene} progress={progress}
        onDiscover={(item: HotspotItem) => { trackAnalytics(story.id, 'interaction', scene.id, item.id); engine.discover(item); }}
        onTool={(item: DragItem) => { trackAnalytics(story.id, 'interaction', scene.id, item.id); engine.selectTool(item); }}
        onCraft={(item: CraftItem) => { trackAnalytics(story.id, 'interaction', scene.id, item.id); engine.craft(item); }} />
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
  </main>{bookOpen && <StoryBook story={story} text={scene.bookText} onClose={() => setBookOpen(false)} />}{pageTurn}</div>;
}
