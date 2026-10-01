import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Story } from '../src/types/story';
import { GameEngine } from '../src/engine/GameEngine';
import { ScoreSystem, SCORING_VERSION } from '../src/engine/ScoreSystem';

export { GameEngine, ScoreSystem, SCORING_VERSION };
export const stories = Object.fromEntries(
  ['story', 'oak-rescue', 'missing-egg', 'wet-fox-house'].map((file) => {
    const story = JSON.parse(
      readFileSync(resolve(process.cwd(), `src/data/${file}.json`), 'utf8'),
    ) as Story;
    return [story.id, story];
  }),
);
