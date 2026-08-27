import type { GameProgress, ReflectionOption, ReflectionPrompt } from '../types/story';
import { assetPath } from '../game/assets';

export function ReflectionBoard({ prompts, progress, onSelect }: { prompts: ReflectionPrompt[]; progress: GameProgress; onSelect: (promptId: string, option: ReflectionOption) => void }) {
  return <div className="reflection-board">{prompts.map((prompt) => <section className="reflection-prompt" key={prompt.id}>
    <h3>{prompt.title}</h3><div>{prompt.options.map((option) => {
      const selected = progress.reflections[prompt.id]?.optionId === option.id;
      return <button className={selected ? 'reflection-option reflection-option--selected' : 'reflection-option'} type="button" onClick={() => onSelect(prompt.id, option)} key={option.id} aria-pressed={selected}>
        <img src={assetPath(option.image)} alt={option.text} /><i className="reflection-option__icon" aria-hidden="true">{option.icon}</i><span>{option.text}</span>{selected && <b>✓</b>}
      </button>;
    })}</div>
  </section>)}</div>;
}
