import type { GameProgress } from '../types/story';

export class SaveSystem {
  private readonly key: string;

  constructor(storyId: string, childId?: string) {
    this.key = childId
      ? `motefaker:progress:${childId}:${storyId}`
      : `magical-library:progress:${storyId}`;
  }

  load(): GameProgress | null {
    try {
      const value = localStorage.getItem(this.key);
      return value ? (JSON.parse(value) as GameProgress) : null;
    } catch {
      return null;
    }
  }

  save(progress: GameProgress): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(progress));
    } catch {
      // The game remains playable when storage is unavailable.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // Ignore restricted storage environments.
    }
  }
}
