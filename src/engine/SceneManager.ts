import type { Story, StoryScene } from '../types/story';

export class SceneManager {
  private readonly scenes: Map<string, StoryScene>;

  constructor(private readonly story: Story) {
    this.scenes = new Map(story.scenes.map((scene) => [scene.id, scene]));
    this.validate();
  }

  get(sceneId: string): StoryScene {
    const scene = this.scenes.get(sceneId);
    if (!scene) throw new Error(`Scene "${sceneId}" was not found.`);
    return scene;
  }

  getInitial(): StoryScene {
    return this.get(this.story.startScene);
  }

  private validate(): void {
    this.story.scenes.forEach((scene) => {
      if (scene.nextScene && !this.scenes.has(scene.nextScene)) {
        throw new Error(`Scene "${scene.id}" points to missing scene "${scene.nextScene}".`);
      }
      if (scene.dropTarget && !this.scenes.has(scene.dropTarget.nextScene)) {
        throw new Error(`Drop target in "${scene.id}" points to missing scene "${scene.dropTarget.nextScene}".`);
      }
      scene.choices?.forEach((choice) => {
        if (!this.scenes.has(choice.nextScene)) {
          throw new Error(`Choice "${choice.id}" points to missing scene "${choice.nextScene}".`);
        }
      });
    });
  }
}
