export class ScoreSystem {
  static add(currentScore: number, points: number): number {
    return Math.max(0, currentScore + points);
  }

  static stars(score: number): number {
    if (score >= 22) return 3;
    if (score >= 14) return 2;
    return 1;
  }
}
