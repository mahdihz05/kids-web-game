export type TurnPhase = 'idle' | 'covering' | 'revealing';

export function PageTurn({ phase, onCoverEnd, onRevealEnd }: { phase: TurnPhase; onCoverEnd: () => void; onRevealEnd: () => void }) {
  const onAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (phase === 'covering') onCoverEnd();
    if (phase === 'revealing') onRevealEnd();
  };
  return <div className={`page-turn page-turn--${phase}`} onAnimationEnd={onAnimationEnd} aria-hidden="true">
    <div className="page-turn__front" /><div className="page-turn__back" /><i className="page-turn__edge" />
  </div>;
}
