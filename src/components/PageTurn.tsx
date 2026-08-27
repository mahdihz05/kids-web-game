import { useCallback, useEffect, useRef } from 'react';

export type TurnPhase = 'idle' | 'covering' | 'revealing';

export function PageTurn({ phase, onCoverEnd, onRevealEnd }: { phase: TurnPhase; onCoverEnd: () => void; onRevealEnd: () => void }) {
  const completedRef = useRef(false);
  const complete = useCallback(() => {
    if (completedRef.current || phase === 'idle') return;
    completedRef.current = true;
    if (phase === 'covering') onCoverEnd();
    if (phase === 'revealing') onRevealEnd();
  }, [onCoverEnd, onRevealEnd, phase]);
  useEffect(() => {
    completedRef.current = false;
    if (phase === 'idle') return;
    const fallback = window.setTimeout(complete, 750);
    return () => window.clearTimeout(fallback);
  }, [complete, phase]);
  const onAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    complete();
  };
  return <div className={`page-turn page-turn--${phase}`} onAnimationEnd={onAnimationEnd} aria-hidden="true">
    <div className="page-turn__front" /><div className="page-turn__back" /><i className="page-turn__edge" />
  </div>;
}
