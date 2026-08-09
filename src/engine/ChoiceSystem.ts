import type { ChoiceRecord, GameProgress, SkillKey, StoryChoice, StoryScene } from '../types/story';
import { ScoreSystem } from './ScoreSystem';

export class ChoiceSystem {
  static apply(progress: GameProgress, scene: StoryScene, choice: StoryChoice): GameProgress {
    const record: ChoiceRecord = {
      sceneId: scene.id,
      choiceId: choice.id,
      text: choice.text,
      score: choice.score,
      summary: choice.summary,
    };

    const skillScores = { ...progress.skillScores };
    if (choice.skill) skillScores[choice.skill as SkillKey] += choice.score;

    return {
      ...progress,
      score: ScoreSystem.add(progress.score, choice.score),
      skillScores,
      choices: [...progress.choices.filter((item) => item.sceneId !== scene.id), record],
      pendingConsequence: choice.consequence,
      feedback: undefined,
      updatedAt: new Date().toISOString(),
    };
  }
}
