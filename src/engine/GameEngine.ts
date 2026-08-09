import type { DragItem, GameProgress, HotspotItem, Story, StoryChoice, StoryScene } from '../types/story';
import { ChoiceSystem } from './ChoiceSystem';
import { InteractionSystem } from './InteractionSystem';
import { SaveSystem } from './SaveSystem';
import { SceneManager } from './SceneManager';

export type GameSnapshot = { scene: StoryScene; progress: GameProgress };
type Listener = (snapshot: GameSnapshot) => void;

export class GameEngine {
  readonly sceneManager: SceneManager;
  private readonly saveSystem: SaveSystem;
  private progress: GameProgress;
  private listeners = new Set<Listener>();

  constructor(readonly story: Story) {
    this.sceneManager = new SceneManager(story);
    this.saveSystem = new SaveSystem(story.id);
    this.progress = this.restoreOrCreate();
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

    this.progress = ChoiceSystem.apply(this.progress, scene, choice);
    if (!choice.consequence) this.goTo(choice.nextScene);
    else this.persistAndNotify();
  }

  discover(item: HotspotItem): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (!scene.hotspots?.some((hotspot) => hotspot.id === item.id)) return;
    this.progress = InteractionSystem.discover(this.progress, scene.id, item);
    this.persistAndNotify();
  }

  selectTool(item: DragItem): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (!scene.dragItems?.some((tool) => tool.id === item.id)) return;
    this.progress = InteractionSystem.tryTool(this.progress, scene.id, item);
    this.persistAndNotify();
  }

  continueScene(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (scene.nextScene) this.goTo(scene.nextScene);
  }

  continueAfterTool(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (this.progress.selectedTools[scene.id] && scene.dropTarget) this.goTo(scene.dropTarget.nextScene);
  }

  continueAfterConsequence(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    const selected = scene.choices?.find((choice) =>
      this.progress.choices.some((record) => record.sceneId === scene.id && record.choiceId === choice.id),
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

  private restoreOrCreate(): GameProgress {
    const saved = this.saveSystem.load();
    if (saved?.storyId === this.story.id) {
      try {
        this.sceneManager.get(saved.currentSceneId);
        if (saved.skillScores && saved.discoveries && saved.selectedTools) return saved;
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
      skillScores: { discovery: 0, analysis: 0, decision: 0, tool: 0, reasoning: 0, reflection: 0 },
      choices: [],
      discoveries: {},
      selectedTools: {},
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
