import type { StoryChoice } from '../types/story';
import { assetPath } from '../game/assets';

interface ChoiceGridProps {
  choices: StoryChoice[];
  onChoose: (choice: StoryChoice) => void;
  compact?: boolean;
}

export function ChoiceGrid({ choices, onChoose, compact = false }: ChoiceGridProps) {
  return <div className={`choice-grid ${compact ? 'choice-grid--compact' : ''}`}>
    {choices.map((choice) => <button className="choice-card" key={choice.id} onClick={() => onChoose(choice)} type="button">
      <img src={assetPath(choice.image)} alt={choice.caption} />
      <span>{choice.caption}</span>
    </button>)}
  </div>;
}
