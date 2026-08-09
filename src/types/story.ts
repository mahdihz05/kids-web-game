export type SceneType = 'dialogue' | 'choice' | 'hotspot' | 'dragDrop' | 'reflection' | 'result';
export type SkillKey = 'discovery' | 'analysis' | 'decision' | 'tool' | 'reasoning' | 'reflection';

export interface ScoreReward {
  points: number;
  skill?: SkillKey;
}

export interface StoryChoice {
  id: string;
  text: string;
  icon?: string;
  image?: string;
  nextScene: string;
  score: number;
  skill?: SkillKey;
  consequence?: string;
  summary?: string;
  tone?: 'neutral' | 'recommended';
}

export interface HotspotItem {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  clue: string;
  reward: ScoreReward;
}

export interface DragItem {
  id: string;
  label: string;
  icon: string;
  correct: boolean;
  feedback: string;
  reward: ScoreReward;
}

export interface StoryScene {
  id: string;
  type: SceneType;
  phase: number;
  phaseTitle: string;
  eyebrow?: string;
  text: string;
  hint?: string;
  image: string;
  character?: string;
  characterName?: string;
  actionLabel?: string;
  voiceText?: string;
  choices?: StoryChoice[];
  hotspots?: HotspotItem[];
  dragItems?: DragItem[];
  dropTarget?: { label: string; icon: string; nextScene: string };
  nextScene?: string;
  learningSummary?: string;
}

export interface Story {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  coverImage: string;
  startScene: string;
  totalPhases: number;
  theme: { primary: string; secondary: string; accent: string };
  scenes: StoryScene[];
}

export interface ChoiceRecord {
  sceneId: string;
  choiceId: string;
  text: string;
  score: number;
  summary?: string;
}

export interface GameProgress {
  storyId: string;
  currentSceneId: string;
  score: number;
  skillScores: Record<SkillKey, number>;
  choices: ChoiceRecord[];
  discoveries: Record<string, string[]>;
  selectedTools: Record<string, string>;
  pendingConsequence?: string;
  feedback?: string;
  completed: boolean;
  updatedAt: string;
}

export interface ChildProfile {
  name: string;
  age: number;
  avatar: string;
  totalStars: number;
  completedMissions: string[];
  badges: string[];
}
