import type { CraftItem, DragItem, GameProgress, HotspotItem, ReflectionOption, Story, StoryChoice, StoryScene } from '../types/story';
import { ChoiceSystem } from './ChoiceSystem';
import { InteractionSystem } from './InteractionSystem';
import { SaveSystem } from './SaveSystem';
import { SceneManager } from './SceneManager';
import { ScoreSystem } from './ScoreSystem';

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
    if (choice.retry) this.persistAndNotify();
    else if (!choice.consequence) this.goTo(choice.nextScene);
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

  craft(item: CraftItem): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (!scene.craftItems?.some((candidate) => candidate.id === item.id)) return;
    const completed = this.progress.craftProgress[scene.id] ?? [];
    if (completed.includes(item.id)) return;
    const skillScores = { ...this.progress.skillScores };
    if (item.reward.skill) skillScores[item.reward.skill] += item.reward.points;
    this.progress = {
      ...this.progress,
      score: ScoreSystem.add(this.progress.score, item.reward.points),
      skillScores,
      craftProgress: { ...this.progress.craftProgress, [scene.id]: [...completed, item.id] },
      feedback: `${item.label} به گردنبند اضافه شد!`,
      updatedAt: new Date().toISOString(),
    };
    this.persistAndNotify();
  }

  reflect(promptId: string, option: ReflectionOption): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    const prompt = scene.reflectionPrompts?.find((candidate) => candidate.id === promptId);
    if (!prompt?.options.some((candidate) => candidate.id === option.id)) return;
    const previous = this.progress.reflections[promptId];
    const skillScores = { ...this.progress.skillScores };
    if (!previous && option.skill) skillScores[option.skill] += option.score;
    this.progress = {
      ...this.progress,
      score: previous ? this.progress.score : ScoreSystem.add(this.progress.score, option.score),
      skillScores,
      reflections: { ...this.progress.reflections, [promptId]: { promptId, optionId: option.id, text: option.text } },
      updatedAt: new Date().toISOString(),
    };
    this.persistAndNotify();
  }

  continueScene(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (scene.nextScene) this.goTo(scene.nextScene);
  }

  continueAfterTool(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    const required = scene.requiredItemIds ?? [];
    const selected = this.progress.selectedTools[scene.id] ?? [];
    if (required.every((id) => selected.includes(id)) && scene.dropTarget) this.goTo(scene.dropTarget.nextScene);
  }

  continueCraft(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    const completed = this.progress.craftProgress[scene.id] ?? [];
    if (completed.length >= (scene.requiredCraftCount ?? scene.craftItems?.length ?? 0) && scene.nextScene) this.goTo(scene.nextScene);
  }

  continueReflection(): void {
    const scene = this.sceneManager.get(this.progress.currentSceneId);
    if (scene.reflectionPrompts?.every((prompt) => this.progress.reflections[prompt.id]) && scene.nextScene) this.goTo(scene.nextScene);
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
        if (saved.skillScores && saved.discoveries && saved.selectedTools) {
          const selectedTools = Object.fromEntries(Object.entries(saved.selectedTools).map(([key, value]) => [key, Array.isArray(value) ? value : [value]]));
          return { ...this.createProgress(), ...saved, selectedTools, attempts: saved.attempts ?? [], craftProgress: saved.craftProgress ?? {}, reflections: saved.reflections ?? {} };
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
      skillScores: { discovery: 0, analysis: 0, decision: 0, tool: 0, reasoning: 0, reflection: 0 },
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
