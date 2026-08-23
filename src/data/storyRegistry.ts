import firstStorySource from './story.json';
import oakRescueSource from './oak-rescue.json';
import type { Story } from '../types/story';

export const DEFAULT_STORY_ID = 'grandmas-birthday-gift';

export const storyRegistry: Record<string, Story> = {
  [DEFAULT_STORY_ID]: firstStorySource as Story,
  'oak-rescue': oakRescueSource as Story,
};

export function getStory(storyId?: string | null): Story {
  return (storyId && storyRegistry[storyId]) || storyRegistry[DEFAULT_STORY_ID];
}
