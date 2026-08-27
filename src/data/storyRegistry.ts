import firstStorySource from './story.json';
import oakRescueSource from './oak-rescue.json';
import missingEggSource from './missing-egg.json';
import wetFoxHouseSource from './wet-fox-house.json';
import type { Story } from '../types/story';

export const DEFAULT_STORY_ID = 'grandmas-birthday-gift';

export const storyRegistry: Record<string, Story> = {
  [DEFAULT_STORY_ID]: firstStorySource as Story,
  'oak-rescue': oakRescueSource as Story,
  'missing-egg': missingEggSource as Story,
  'wet-fox-house': wetFoxHouseSource as Story,
};

export function getStory(storyId?: string | null): Story {
  return (storyId && storyRegistry[storyId]) || storyRegistry[DEFAULT_STORY_ID];
}
