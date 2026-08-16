import type { StoryChoice } from '../types/story';
import { assetPath } from '../game/assets';

interface ChoiceGridProps {
  choices: StoryChoice[];
  onChoose: (choice: StoryChoice) => void;
  fallbackImage: string;
  compact?: boolean;
}

export function ChoiceGrid({ choices, onChoose, fallbackImage, compact = false }: ChoiceGridProps) {
  return <div className={`choice-grid ${compact ? 'choice-grid--compact' : ''}`}>
    {choices.map((choice) => <button className="choice-card" key={choice.id} onClick={() => onChoose(choice)} type="button">
      <img src={choice.image ? assetPath(choice.image) : assetPath(fallbackImage)} alt="" />
      <span>{choice.caption ?? choice.text}</span>
    </button>)}
  </div>;
}
