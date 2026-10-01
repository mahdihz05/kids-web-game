import type { GameProgress, SkillKey, Story } from '../types/story';

export const SCORING_VERSION = '2.0';
export const skillLabels: Record<SkillKey, string> = {
  discovery: 'کشف مسئله و سرنخ',
  analysis: 'تحلیل',
  decision: 'تصمیم‌گیری',
  tool: 'انتخاب و ساخت ابزار',
  reasoning: 'دلیل آوردن',
  reflection: 'بازاندیشی',
};

export class ScoreSystem {
  static add(currentScore: number, points: number): number {
    return Math.max(0, currentScore + points);
  }

  static stars(score: number, story?: Story, progress?: GameProgress): number {
    if (story) {
      const percent = this.percent(score, story, progress);
      return percent >= 80 ? 3 : percent >= 50 ? 2 : 1;
    }
    if (score >= 34) return 3;
    if (score >= 26) return 2;
    return 1;
  }

  static capacity(
    story: Story,
    progress?: GameProgress,
  ): { total: number; skills: Record<SkillKey, number> } {
    const skills = {
      discovery: 0,
      analysis: 0,
      decision: 0,
      tool: 0,
      reasoning: 0,
      reflection: 0,
    };
    let total = 0;
    const add = (points: number, skill?: SkillKey) => {
      total += points;
      if (skill) skills[skill] += points;
    };
    for (const scene of story.scenes) {
      if (
        progress?.completed &&
        !progress.attempts.some((a) => a.sceneId === scene.id) &&
        !progress.choices.some((a) => a.sceneId === scene.id) &&
        !progress.discoveries[scene.id] &&
        !progress.selectedTools[scene.id] &&
        !progress.craftProgress[scene.id] &&
        !scene.reflectionPrompts?.some((p) => progress.reflections[p.id])
      )
        continue;
      const best = [...(scene.choices ?? [])].sort(
        (a, b) => b.score - a.score,
      )[0];
      if (best) add(Math.max(0, best.score), best.skill);
      for (const item of scene.hotspots ?? [])
        add(item.reward.points, item.reward.skill);
      for (const item of scene.dragItems ?? [])
        if (item.correct) add(item.reward.points, item.reward.skill);
      for (const item of [...(scene.craftItems ?? [])]
        .sort((a, b) => b.reward.points - a.reward.points)
        .slice(0, scene.requiredCraftCount ?? scene.craftItems?.length ?? 0))
        add(item.reward.points, item.reward.skill);
      for (const prompt of scene.reflectionPrompts ?? []) {
        const option = [...prompt.options].sort((a, b) => b.score - a.score)[0];
        if (option) add(option.score, option.skill);
      }
    }
    return { total, skills };
  }

  static percent(score: number, story: Story, progress?: GameProgress): number {
    return Math.min(
      100,
      Math.round((score / (this.capacity(story, progress).total || 1)) * 100),
    );
  }

  static result(progress: GameProgress, story: Story) {
    const percent = this.percent(progress.score, story, progress);
    const capacity = this.capacity(story, progress);
    const skills = Object.fromEntries(
      Object.entries(progress.skillScores).map(([key, value]) => [
        key,
        capacity.skills[key as SkillKey]
          ? Math.min(
              100,
              Math.round((value / capacity.skills[key as SkillKey]) * 100),
            )
          : null,
      ]),
    );
    return {
      percent,
      maxScore: capacity.total,
      stars: progress.completed
        ? this.stars(progress.score, story, progress)
        : 0,
      badge: progress.completed ? (story.badgeTitle ?? 'فکرکننده‌ی خوب') : null,
      medal: progress.completed
        ? percent >= 85
          ? 'طلا'
          : percent >= 65
            ? 'نقره'
            : 'برنز'
        : null,
      skills,
      scoringVersion: SCORING_VERSION,
    };
  }
}
