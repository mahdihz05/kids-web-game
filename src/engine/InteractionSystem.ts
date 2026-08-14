import type { DragItem, GameProgress, HotspotItem } from '../types/story';
import { ScoreSystem } from './ScoreSystem';

export class InteractionSystem {
  static discover(progress: GameProgress, sceneId: string, item: HotspotItem): GameProgress {
    const found = progress.discoveries[sceneId] ?? [];
    if (found.includes(item.id)) return progress;
    const skillScores = { ...progress.skillScores };
    if (item.reward.skill) skillScores[item.reward.skill] += item.reward.points;
    return {
      ...progress,
      score: ScoreSystem.add(progress.score, item.reward.points),
      skillScores,
      discoveries: { ...progress.discoveries, [sceneId]: [...found, item.id] },
      feedback: item.clue,
      updatedAt: new Date().toISOString(),
    };
  }

  static tryTool(progress: GameProgress, sceneId: string, item: DragItem): GameProgress {
    if (!item.correct) return { ...progress, feedback: item.feedback };
    const selected = progress.selectedTools[sceneId] ?? [];
    if (selected.includes(item.id)) return progress;
    const skillScores = { ...progress.skillScores };
    if (item.reward.skill) skillScores[item.reward.skill] += item.reward.points;
    return {
      ...progress,
      score: ScoreSystem.add(progress.score, item.reward.points),
      skillScores,
      selectedTools: { ...progress.selectedTools, [sceneId]: [...selected, item.id] },
      feedback: item.feedback,
      updatedAt: new Date().toISOString(),
    };
  }
}
