import type { GameProgress } from './story';

export type GameAction = {
  kind:
    | 'choice'
    | 'discover'
    | 'tool'
    | 'craft'
    | 'reflection'
    | 'continue'
    | 'heartbeat'
    | 'pause'
    | 'resume'
    | 'preview'
    | 'narration_start'
    | 'narration_stop'
    | 'book_open'
    | 'book_close';
  sceneId: string;
  itemId?: string;
  promptId?: string;
};
export type Child = {
  id: string;
  publicId: string;
  firstName: string;
  lastName: string;
  age: number;
  schoolId: string;
  schoolName: string;
  avatar: string;
};
export type Session = {
  role: 'parent' | 'player' | 'admin';
  child?: Child;
  parent?: { id: string; username: string; fullName: string };
};
export type School = { id: string; name: string };
export type RunState = {
  id: string;
  storyId: string;
  progress: GameProgress;
  lastSequence: number;
};
export type RunReport = RunState & {
  childId: string;
  publicId: string;
  childName: string;
  age: number;
  schoolName: string;
  startedAt: string;
  completedAt: string | null;
  activeMinutes: number;
  percent: number;
  maxScore: number;
  stars: number;
  badge: string | null;
  medal: string | null;
  scoringVersion: string;
  skills: Record<string, number | null>;
};
