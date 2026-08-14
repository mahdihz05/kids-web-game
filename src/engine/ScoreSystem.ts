export class ScoreSystem {
  static add(currentScore: number, points: number): number {
    return Math.max(0, currentScore + points);
  }

  static stars(score: number): number {
    if (score >= 34) return 3;
    if (score >= 26) return 2;
    return 1;
  }
}
