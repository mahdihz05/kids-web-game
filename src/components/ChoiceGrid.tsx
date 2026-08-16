import { useEffect, useState } from 'react';
import type { StoryChoice } from '../types/story';
import { assetPath } from '../game/assets';

interface ChoiceGridProps {
  choices: StoryChoice[];
  onChoose: (choice: StoryChoice) => void;
  compact?: boolean;
}

export function ChoiceGrid({ choices, onChoose, compact = false }: ChoiceGridProps) {
  const [desktopMode, setDesktopMode] = useState(() => window.matchMedia('(min-width: 1200px)').matches);
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1200px)');
    const updateMode = () => setDesktopMode(query.matches);
    query.addEventListener('change', updateMode);
    return () => query.removeEventListener('change', updateMode);
  }, []);

  const selectedChoice = choices.find((choice) => choice.id === selectedId);

  return <div className={`choice-grid ${compact ? 'choice-grid--compact' : ''}`}>
    {choices.map((choice) => <button className={`choice-card ${selectedId === choice.id ? 'choice-card--selected' : ''}`} key={choice.id}
      aria-pressed={desktopMode ? selectedId === choice.id : undefined}
      onClick={() => desktopMode ? setSelectedId(choice.id) : onChoose(choice)} type="button">
      <img src={assetPath(choice.image)} alt={choice.caption} />
      <span><strong>{choice.caption}</strong><small>{choice.text}</small></span>
    </button>)}
    {desktopMode && <button className="choice-confirm primary-button" disabled={!selectedChoice}
      onClick={() => selectedChoice && onChoose(selectedChoice)} type="button">بعدی <b aria-hidden="true">←</b></button>}
  </div>;
}
