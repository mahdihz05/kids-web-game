import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_STORY_ID,
  getStory,
  storyRegistry,
} from './data/storyRegistry';
import { missions } from './data/missions';
import { GameEngine, type GameSnapshot } from './engine/GameEngine';
import { ScoreSystem } from './engine/ScoreSystem';
import type {
  CraftItem,
  DragItem,
  HotspotItem,
  ReflectionOption,
  StoryChoice,
} from './types/story';
import { GameCanvas } from './components/GameCanvas';
import { InteractionLayer } from './components/InteractionLayer';
import { MissionHub } from './components/MissionHub';
import { ScenePanel } from './components/ScenePanel';
import { PhaseJourney } from './components/PhaseJourney';
import { StoryIntro } from './components/StoryIntro';
import { PageTurn, type TurnPhase } from './components/PageTurn';
import { StoryBook } from './components/StoryBook';
import { NarrationButton } from './components/NarrationButton';
import { hasSeenStoryIntro } from './utils/introStorage';
import { recordAction, startRun } from './utils/analytics';
import type { Child, GameAction, RunReport, RunState } from './types/account';
import { assetPath } from './game/assets';

type AppView = 'intro' | 'hub' | 'game';
export function App({
  child,
  initialRuns,
  history,
  onParent,
}: {
  child: Child;
  initialRuns: RunState[];
  history: RunReport[];
  onParent?: () => void;
}) {
  const initialStoryId = useMemo(() => {
    const requested = new URLSearchParams(window.location.search).get('play');
    return requested && storyRegistry[requested] ? requested : DEFAULT_STORY_ID;
  }, []);
  const [storyId, setStoryId] = useState(initialStoryId);
  const engines = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(storyRegistry).map(([id, registeredStory]) => [
          id,
          new GameEngine(
            registeredStory,
            initialRuns.find((r) => r.storyId === id)?.progress,
            child.id,
            (action) => recordAction(id, action),
          ),
        ]),
      ),
    [child.id, initialRuns],
  );
  const story = getStory(storyId);
  const mission = missions.find((item) => item.id === story.id);
  const engine = engines[storyId];
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() =>
    engine.snapshot(),
  );
  const profile = useMemo(() => {
    const completed = history.filter((r) => r.completedAt);
    const best = Object.fromEntries(
      completed.map((r) => [
        r.storyId,
        Math.max(
          ...completed
            .filter((x) => x.storyId === r.storyId)
            .map((x) => x.stars),
        ),
      ]),
    );
    if (snapshot.progress.completed)
      best[story.id] = Math.max(
        best[story.id] ?? 0,
        ScoreSystem.result(snapshot.progress, story).stars,
      );
    return {
      name: `${child.firstName} ${child.lastName}`,
      age: child.age,
      avatar: child.avatar,
      totalStars: Object.values(best).reduce((a, b) => a + b, 0),
      completedMissions: Object.keys(best),
      badges: Object.keys(best).map(
        (id) => getStory(id).badgeTitle ?? 'فکرکننده‌ی خوب',
      ),
    };
  }, [child, history, snapshot.progress, story]);
  const [view, setView] = useState<AppView>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('play')) return 'hub';
    if (params.has('library')) return 'hub';
    return hasSeenStoryIntro() ? 'hub' : 'intro';
  });
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('idle');
  const [bookOpen, setBookOpen] = useState(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const directPlayStarted = useRef(false);
  const pendingAction = useRef<{
    run: () => void;
    ready: Promise<void>;
  } | null>(null);

  useEffect(() => {
    return engine.subscribe(setSnapshot);
  }, [engine]);
  useEffect(() => {
    if (view !== 'game') return;
    const record = (kind: 'heartbeat' | 'pause' | 'resume') => {
      if (!engine.snapshot().progress.completed) {
        try {
          recordAction(story.id, { kind, sceneId: engine.snapshot().scene.id });
        } catch (e) {
          setError((e as Error).message);
        }
      }
    };
    const heartbeat = window.setInterval(() => {
      if (!document.hidden) record('heartbeat');
    }, 30_000);
    const visibility = () => record(document.hidden ? 'pause' : 'resume');
    const uiAction = (e: Event) => {
      if (!engine.snapshot().progress.completed) {
        const detail = (e as CustomEvent<Omit<GameAction, 'sceneId'>>).detail;
        try {
          recordAction(story.id, {
            ...detail,
            sceneId: engine.snapshot().scene.id,
          });
        } catch (err) {
          setError((err as Error).message);
        }
      }
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('game-ui-action', uiAction);
    return () => {
      window.clearInterval(heartbeat);
      if(!engine.snapshot().progress.completed) { try { recordAction(story.id,{kind:'pause',sceneId:engine.snapshot().scene.id}); } catch { /* The durable outbox preserves the failure. */ } }
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('game-ui-action', uiAction);
    };
  }, [engine, story.id, view]);
  const transition = useCallback(
    (action: () => void, nextSceneId?: string, preloadImage?: string) => {
      if (turnPhase !== 'idle') return;
      const target = preloadImage
        ? { image: preloadImage }
        : nextSceneId
          ? story.scenes.find((candidate) => candidate.id === nextSceneId)
          : undefined;
      const ready = target
        ? new Promise<void>((resolve) => {
            const preload = new Image();
            let settled = false;
            const finishPreload = () => {
              if (settled) return;
              settled = true;
              window.clearTimeout(fallback);
              preload.onload = null;
              preload.onerror = null;
              resolve();
            };
            const fallback = window.setTimeout(finishPreload, 2_000);
            preload.onload = finishPreload;
            preload.onerror = finishPreload;
            preload.src = assetPath(target.image);
            if (preload.complete) finishPreload();
          })
        : Promise.resolve();
      pendingAction.current = { run: action, ready };
      setTurnPhase('covering');
    },
    [story.scenes, turnPhase],
  );
  const changeView = (nextView: AppView) => transition(() => setView(nextView));
  const finishCover = async () => {
    const pending = pendingAction.current;
    if (!pending) return;
    await pending.ready;
    try {
      pending.run();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pendingAction.current = null;
      setTurnPhase('revealing');
    }
  };
  const finishReveal = () => setTurnPhase('idle');
  const openGame = useCallback(
    async (missionId: string) => {
      if (starting || turnPhase !== 'idle') return;
      setStarting(true);
      setError('');
      try {
        const nextStory = getStory(missionId);
        const nextEngine = engines[nextStory.id];
        const run = await startRun(nextStory.id);
        nextEngine.restore(run.progress);
        const readySnapshot = nextEngine.snapshot();
        transition(
          () => {
            setStoryId(nextStory.id);
            setSnapshot(readySnapshot);
            recordAction(nextStory.id, {
              kind: 'resume',
              sceneId: readySnapshot.scene.id,
            });
            setView('game');
          },
          readySnapshot.scene.id,
          readySnapshot.scene.image,
        );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setStarting(false);
      }
    },
    [starting, turnPhase, engines, transition],
  );
  useEffect(() => {
    if (
      !directPlayStarted.current &&
      new URLSearchParams(window.location.search).has('play')
    ) {
      directPlayStarted.current = true;
      void openGame(initialStoryId);
    }
  }, [openGame, initialStoryId]);
  const goHome = () => {
    transition(() => setView('hub'));
  };

  const choose = (choice: StoryChoice) => {
    try { if (choice.retry || choice.consequence) engine.choose(choice);
    else transition(() => engine.choose(choice), choice.nextScene); } catch(e) {setError((e as Error).message);}
  };

  const pageTurn = (
    <PageTurn
      phase={turnPhase}
      onCoverEnd={finishCover}
      onRevealEnd={finishReveal}
    />
  );
  if (view === 'intro')
    return (
      <div className="view-shell">
        <StoryIntro onClose={() => changeView('hub')} />
        {pageTurn}
      </div>
    );
  if (view === 'hub')
    return (
      <div className="view-shell">
        {error && (
          <p className="sync-banner" role="alert">
            {error}
          </p>
        )}
        {starting && <p className="sync-banner">در حال بازکردن کتاب…</p>}
        <MissionHub
          profile={profile}
          onStart={(id) => void openGame(id)}
          onParent={onParent}
          onStory={() => changeView('intro')}
        />
        {pageTurn}
      </div>
    );

  const { scene, progress } = snapshot;
  const phasePercent = Math.max(8, (scene.phase / story.totalPhases) * 100);

  return (
    <div
      className={`view-shell ${turnPhase !== 'idle' ? 'view-shell--turning' : ''}`}
    >
      <main
        className="game-app"
        aria-busy={turnPhase !== 'idle'}
        style={
          {
            '--theme-primary': story.theme.primary,
            '--theme-accent': story.theme.accent,
          } as React.CSSProperties
        }
      >
        <header className="game-topbar">
          <button
            className="round-button"
            onClick={goHome}
            type="button"
            aria-label="بازگشت به دهکده"
          >
            ⌂
          </button>
          <div className="game-title">
            <small>مأموریت {mission?.number ?? 1} از ۱۰</small>
            <strong>
              {mission?.icon ?? '📖'} {story.title}
            </strong>
          </div>
          <div className="phase-progress">
            <div>
              <span>مسیر حل مسئله</span>
              <b>
                {scene.phase}/{story.totalPhases}
              </b>
            </div>
            <i>
              <b style={{ width: `${phasePercent}%` }} />
            </i>
          </div>
          {scene.bookText && (
            <button
              className="round-button story-reader"
              onClick={() => {
                recordAction(story.id, {
                  kind: 'book_open',
                  sceneId: scene.id,
                });
                setBookOpen(true);
              }}
              type="button"
              aria-label="داستان این بخش"
            >
              📖
            </button>
          )}
          {scene.id === story.startScene && (
            <NarrationButton
              iconOnly
              text={scene.narration ?? scene.text}
              audio={scene.audio}
            />
          )}
          <div className="live-score">
            ⭐ <strong>{progress.score}</strong>
          </div>
        </header>

        <section className={`game-stage game-stage--${scene.type}`}>
          <GameCanvas image={scene.image} />
          <div className="scene-vignette" />
          {scene.character && (
            <div className="character" aria-hidden="true">
              <img src="/assets/characters/pashmaloo.png" alt="" />
              <span>پشمالو</span>
            </div>
          )}
          <InteractionLayer
            scene={scene}
            progress={progress}
            onDiscover={(item: HotspotItem) => engine.discover(item)}
            onTool={(item: DragItem) => engine.selectTool(item)}
            onCraft={(item: CraftItem) => engine.craft(item)}
          />
          <ScenePanel
            story={story}
            snapshot={snapshot}
            onChoose={choose}
            onContinue={() => {
              const selected = scene.choices?.find((candidate) =>
                progress.choices.some(
                  (record) =>
                    record.sceneId === scene.id &&
                    record.choiceId === candidate.id,
                ),
              );
              transition(() => engine.continueAction(), selected?.nextScene);
            }}
            onContinueScene={() =>
              transition(() => engine.continueAction(), scene.nextScene)
            }
            onContinueTool={() =>
              transition(
                () => engine.continueAction(),
                scene.dropTarget?.nextScene,
              )
            }
            onContinueCraft={() =>
              transition(() => engine.continueAction(), scene.nextScene)
            }
            onContinueReflection={() =>
              transition(() => engine.continueAction(), scene.nextScene)
            }
            onReflect={(promptId: string, option: ReflectionOption) =>
              engine.reflect(promptId, option)
            }
            onRestart={() => void openGame(story.id)}
            onHome={goHome}
          />
          <div className="ambient-particles" aria-hidden="true">
            <i>✦</i>
            <i>✧</i>
            <i>•</i>
          </div>
        </section>
        <PhaseJourney currentPhase={scene.phase} phases={story.phaseJourney} />
      </main>
      {bookOpen && (
        <StoryBook
          story={story}
          text={scene.bookText}
          onClose={() => {
            recordAction(story.id, { kind: 'book_close', sceneId: scene.id });
            setBookOpen(false);
          }}
        />
      )}
      {pageTurn}
    </div>
  );
}
