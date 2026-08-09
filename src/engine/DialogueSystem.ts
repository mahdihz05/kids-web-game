import type { ChoiceRecord, StoryScene } from '../types/story';

export class DialogueSystem {
  static storyChoiceSummary(choices: ChoiceRecord[]): string {
    return choices.find((choice) => Boolean(choice.summary))?.summary ?? '';
  }

  static reasonSummary(choices: ChoiceRecord[], reflectionScene: StoryScene | undefined): string {
    if (!reflectionScene) return '';
    const reason = choices.find((choice) => choice.sceneId === reflectionScene.id);
    return reason ? `دلیل تو: «${reason.text}»` : '';
  }
}
