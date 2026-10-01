import type {
  CraftItem,
  DragItem,
  GameProgress,
  HotspotItem,
  ReflectionOption,
  Story,
  StoryChoice,
  StoryScene,
} from '../types/story';
import { ChoiceSystem } from './ChoiceSystem';
import { InteractionSystem } from './InteractionSystem';
import { SaveSystem } from './SaveSystem';
import { SceneManager } from './SceneManager';
import { ScoreSystem } from './ScoreSystem';
import type { GameAction } from '../types/account';

export type GameSnapshot = { scene: StoryScene; progress: GameProgress };
type Listener = (snapshot: GameSnapshot) => void;

export class GameEngine {
  readonly sceneManager: SceneManager;
  private readonly saveSystem: SaveSystem;
  private progress: GameProgress;
  private listeners = new Set<Listener>();

  constructor(
    readonly story: Story,
    initial?: GameProgress,
    childId?: string,
    private readonly onAction?: (action: GameAction) => void,
  ) {
    this.sceneManager = new SceneManager(story);
    this.saveSystem = new SaveSystem(story.id, childId);
    this.progress = initial ?? this.restoreOrCreate();
  }

  restore(progress: GameProgress): void {
    this.sceneManager.get(progress.currentSceneId);
    this.progress = progress;
    this.persistAndNotify();
  }

  snapshot = (): GameSnapshot => ({
    scene: this.sceneManager.get(this.progress.currentSceneId),
    progress: this.progress,
  });

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  choose(choice: StoryChoice): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (!scene.choices?.some((item) => item.id === choice.id)) return;
    this.onAction?.({ kind: 'choice', sceneId: scene.id, itemId: choice.id });

    this.progress = ChoiceSystem.apply(this.progress, scene, choice);
    if (choice.retry) this.persistAndNotify();
    else if (!choice.consequence) this.goTo(choice.nextScene);
    else this.persistAndNotify();
  }

  discover(item: HotspotItem): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (!scene.hotspots?.some((hotspot) => hotspot.id === item.id)) return;
    this.onAction?.({ kind: 'discover', sceneId: scene.id, itemId: item.id });
    this.progress = InteractionSystem.discover(this.progress, scene.id, item);
    this.persistAndNotify();
  }

  selectTool(item: DragItem): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (!scene.dragItems?.some((tool) => tool.id === item.id)) return;
    this.onAction?.({ kind: 'tool', sceneId: scene.id, itemId: item.id });
    this.progress = InteractionSystem.tryTool(this.progress, scene.id, item);
    this.persistAndNotify();
  }

  craft(item: CraftItem): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (!scene.craftItems?.some((candidate) => candidate.id === item.id))
      return;
    const completed = this.progress.craftProgress[scene.id] ?? [];
    if (completed.includes(item.id)) return;
    this.onAction?.({ kind: 'craft', sceneId: scene.id, itemId: item.id });
    const skillScores = { ...this.progress.skillScores };
    if (item.reward.skill) skillScores[item.reward.skill] += item.reward.points;
    this.progress = {
      ...this.progress,
      score: ScoreSystem.add(this.progress.score, item.reward.points),
      skillScores,
      craftProgress: {
        ...this.progress.craftProgress,
        [scene.id]: [...completed, item.id],
      },
      feedback: scene.craftUnitLabel
        ? `${item.label} کامل شد!`
        : `${item.label} به گردنبند اضافه شد!`,
      updatedAt: new Date().toISOString(),
    };
    this.persistAndNotify();
  }

  reflect(promptId: string, option: ReflectionOption): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    const prompt = scene.reflectionPrompts?.find(
      (candidate) => candidate.id === promptId,
    );
    if (!prompt?.options.some((candidate) => candidate.id === option.id))
      return;
    this.onAction?.({
      kind: 'reflection',
      sceneId: scene.id,
      itemId: option.id,
      promptId,
    });
    const previous = this.progress.reflections[promptId];
    const skillScores = { ...this.progress.skillScores };
    if (!previous && option.skill) skillScores[option.skill] += option.score;
    this.progress = {
      ...this.progress,
      score: previous
        ? this.progress.score
        : ScoreSystem.add(this.progress.score, option.score),
      skillScores,
      reflections: {
        ...this.progress.reflections,
        [promptId]: { promptId, optionId: option.id, text: option.text },
      },
      updatedAt: new Date().toISOString(),
    };
    this.persistAndNotify();
  }

  continueScene(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (
      scene.type === 'hotspot' &&
      !scene.hotspots?.every((item) =>
        this.progress.discoveries[scene.id]?.includes(item.id),
      )
    )
      return;
    if (scene.type !== 'dialogue' && scene.type !== 'hotspot') return;
    if (scene.nextScene) this.goTo(scene.nextScene);
  }

  continueAfterTool(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    const required = scene.requiredItemIds ?? [];
    const selected = this.progress.selectedTools[scene.id] ?? [];
    if (required.every((id) => selected.includes(id)) && scene.dropTarget)
      this.goTo(scene.dropTarget.nextScene);
  }

  continueCraft(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    const completed = this.progress.craftProgress[scene.id] ?? [];
    if (
      completed.length >=
        (scene.requiredCraftCount ?? scene.craftItems?.length ?? 0) &&
      scene.nextScene
    )
      this.goTo(scene.nextScene);
  }

  continueReflection(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (
      scene.reflectionPrompts?.every(
        (prompt) => this.progress.reflections[prompt.id],
      ) &&
      scene.nextScene
    )
      this.goTo(scene.nextScene);
  }

  continueAfterConsequence(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    const selected = scene.choices?.find((choice) =>
      this.progress.choices.some(
        (record) =>
          record.sceneId === scene.id && record.choiceId === choice.id,
      ),
    );
    if (!selected) return;
    this.progress = { ...this.progress, pendingConsequence: undefined };
    this.goTo(selected.nextScene);
  }

  restart(): void {
    this.saveSystem.clear();
    this.progress = this.createProgress();
    this.persistAndNotify();
  }

  private goTo(sceneId: string): void {
    const target = this.sceneManager.get(sceneId);
    this.progress = {
      ...this.progress,
      currentSceneId: target.id,
      completed: target.type === 'result',
      feedback: undefined,
      updatedAt: new Date().toISOString(),
    };
    this.persistAndNotify();
  }

  continueAction(): void {
    const scene = this.snapshot().scene;
    this.onAction?.({ kind: 'continue', sceneId: scene.id });
    if (this.progress.pendingConsequence) this.continueAfterConsequence();
    else if (scene.type === 'dragDrop') this.continueAfterTool();
    else if (scene.type === 'craft') this.continueCraft();
    else if (scene.type === 'reflection') this.continueReflection();
    else this.continueScene();
  }

  applyAction(action: GameAction): void {
    const scene = this.snapshot().scene;
    if (action.sceneId !== scene.id || this.progress.completed)
      throw new Error('stale_scene');
    if (action.kind === 'continue') {
      this.continueAction();
      return;
    }
    if (
      [
        'heartbeat',
        'pause',
        'resume',
        'narration_start',
        'narration_stop',
        'book_open',
        'book_close',
      ].includes(action.kind)
    )
      return;
    if (
      action.kind === 'preview' &&
      scene.choices?.some((x) => x.id === action.itemId)
    )
      return;
    if (action.kind === 'choice') {
      const item = scene.choices?.find((x) => x.id === action.itemId);
      if (item) {
        this.choose(item);
        return;
      }
    }
    if (action.kind === 'discover') {
      const item = scene.hotspots?.find((x) => x.id === action.itemId);
      if (item) {
        this.discover(item);
        return;
      }
    }
    if (action.kind === 'tool') {
      const item = scene.dragItems?.find((x) => x.id === action.itemId);
      if (item) {
        this.selectTool(item);
        return;
      }
    }
    if (action.kind === 'craft') {
      const item = scene.craftItems?.find((x) => x.id === action.itemId);
      if (item) {
        this.craft(item);
        return;
      }
    }
    if (action.kind === 'reflection') {
      const item = scene.reflectionPrompts
        ?.find((p) => p.id === action.promptId)
        ?.options.find((x) => x.id === action.itemId);
      if (item && action.promptId) {
        this.reflect(action.promptId, item);
        return;
      }
    }
    throw new Error('invalid_action');
  }

  private restoreOrCreate(): GameProgress {
    const saved = this.saveSystem.load();
    if (saved?.storyId === this.story.id) {
      try {
        this.sceneManager.get(saved.currentSceneId);
        if (saved.skillScores && saved.discoveries && saved.selectedTools) {
          const selectedTools = Object.fromEntries(
            Object.entries(saved.selectedTools).map(([key, value]) => [
              key,
              Array.isArray(value) ? value : [value],
            ]),
          );
          return {
            ...this.createProgress(),
            ...saved,
            selectedTools,
            attempts: saved.attempts ?? [],
            craftProgress: saved.craftProgress ?? {},
            reflections: saved.reflections ?? {},
          };
        }
        this.saveSystem.clear();
      } catch {
        this.saveSystem.clear();
      }
    }
    return this.createProgress();
  }

  private createProgress(): GameProgress {
    return {
      storyId: this.story.id,
      currentSceneId: this.sceneManager.getInitial().id,
      score: 0,
      skillScores: {
        discovery: 0,
        analysis: 0,
        decision: 0,
        tool: 0,
        reasoning: 0,
        reflection: 0,
      },
      choices: [],
      attempts: [],
      discoveries: {},
      selectedTools: {},
      craftProgress: {},
      reflections: {},
      completed: false,
      updatedAt: new Date().toISOString(),
    };
  }

  private persistAndNotify(): void {
    this.saveSystem.save(this.progress);
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
