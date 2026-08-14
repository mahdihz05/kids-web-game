const phases = [
  { title: 'کشف مسئله', icon: '🔎' },
  { title: 'احساس‌ها', icon: '💛' },
  { title: 'تحلیل انتخاب‌ها', icon: '⚖️' },
  { title: 'کشف ابزار', icon: '🧰' },
  { title: 'تصمیم و پیامد', icon: '🔮' },
  { title: 'بازاندیشی', icon: '⭐' },
];

export function PhaseJourney({ currentPhase }: { currentPhase: number }) {
  const currentStep = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentStep.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentPhase]);

  return (
    <nav className="phase-journey" aria-label="مسیر شش‌مرحله‌ای حل مسئله">
      <div className="phase-journey__track">
        {phases.map((phase, index) => {
          const number = index + 1;
          const state = number < currentPhase ? 'done' : number === currentPhase ? 'current' : 'future';
          return (
            <div ref={state === 'current' ? currentStep : undefined} className={`journey-step journey-step--${state}`} key={phase.title} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="journey-number">{state === 'done' ? '✓' : number}</span>
              <b>{phase.icon}</b>
              <small>{phase.title}</small>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
import { useEffect, useRef } from 'react';
