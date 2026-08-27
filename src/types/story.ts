export type SceneType = 'dialogue' | 'choice' | 'hotspot' | 'dragDrop' | 'craft' | 'reflection' | 'result';
export type SkillKey = 'discovery' | 'analysis' | 'decision' | 'tool' | 'reasoning' | 'reflection';

export interface ScoreReward {
  points: number;
  skill?: SkillKey;
}

export interface StoryChoice {
  id: string;
  text: string;
  caption: string;
  icon?: string;
  image: string;
  imageCrop?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  audio?: string;
  nextScene: string;
  score: number;
  skill?: SkillKey;
  consequence?: string;
  summary?: string;
  tone?: 'neutral' | 'recommended';
  retry?: boolean;
  feedback?: string;
}

export interface HotspotItem {
  id: string;
  label: string;
  icon: string;
  image?: string;
  x: number;
  y: number;
  clue: string;
  reward: ScoreReward;
}

export interface DragItem {
  id: string;
  label: string;
  icon: string;
  image: string;
  correct: boolean;
  feedback: string;
  reward: ScoreReward;
}

export interface CraftItem {
  id: string;
  label: string;
  icon: string;
  image: string;
  reward: ScoreReward;
}

export interface ReflectionOption {
  id: string;
  text: string;
  icon: string;
  image: string;
  score: number;
  skill?: SkillKey;
}

export interface ReflectionPrompt {
  id: string;
  title: string;
  icon: string;
  options: ReflectionOption[];
}

export interface SolutionComparisonRow {
  solution: string;
  icon: string;
  speed: string;
  amount: string;
  cooperation: string;
}

export interface StoryScene {
  id: string;
  type: SceneType;
  phase: number;
  phaseTitle: string;
  eyebrow?: string;
  text: string;
  prompt?: string;
  narration?: string;
  audio?: string;
  bookText?: string;
  hint?: string;
  image: string;
  character?: string;
  characterName?: string;
  actionLabel?: string;
  choiceInteraction?: 'confirm' | 'immediate';
  choices?: StoryChoice[];
  hotspots?: HotspotItem[];
  dragItems?: DragItem[];
  requiredItemIds?: string[];
  dropTarget?: { label: string; icon: string; nextScene: string };
  craftItems?: CraftItem[];
  requiredCraftCount?: number;
  craftUnitLabel?: string;
  craftCompleteLabel?: string;
  reflectionPrompts?: ReflectionPrompt[];
  solutionComparison?: { rows: SolutionComparisonRow[] };
  nextScene?: string;
  learningSummary?: string;
}

export interface Story {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badgeTitle?: string;
  coverImage: string;
  startScene: string;
  totalPhases: number;
  phaseJourney?: { title: string; icon: string }[];
  theme: { primary: string; secondary: string; accent: string };
  bookContent?: { title: string; paragraphs: string[] }[];
  scenes: StoryScene[];
}

export interface ChoiceRecord {
  sceneId: string;
  choiceId: string;
  text: string;
  score: number;
  summary?: string;
}

export interface ReflectionRecord {
  promptId: string;
  optionId: string;
  text: string;
}

export interface GameProgress {
  storyId: string;
  currentSceneId: string;
  score: number;
  skillScores: Record<SkillKey, number>;
  choices: ChoiceRecord[];
  attempts: ChoiceRecord[];
  discoveries: Record<string, string[]>;
  selectedTools: Record<string, string[]>;
  craftProgress: Record<string, string[]>;
  reflections: Record<string, ReflectionRecord>;
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
