import type { StoryChoice } from '../types/story';

interface ChoiceGridProps {
  choices: StoryChoice[];
  onChoose: (choice: StoryChoice) => void;
  compact?: boolean;
}

export function ChoiceGrid({ choices, onChoose, compact = false }: ChoiceGridProps) {
  return (
    <div className={`choice-grid ${compact ? 'choice-grid--compact' : ''}`}>
      {choices.map((choice) => (
        <button className={`choice-card ${choice.tone === 'recommended' ? 'choice-card--glow' : ''}`} key={choice.id} onClick={() => onChoose(choice)} type="button">
          {choice.icon && <span className="choice-card__icon" aria-hidden="true">{choice.icon}</span>}
          <span>{choice.text}</span>
        </button>
      ))}
    </div>
  );
}
