import { useRef, useState } from 'react';

export function ParentGate({ onPass, onClose }: { onPass: () => void; onClose: () => void }) {
  const timer = useRef<number | null>(null);
  const [holding, setHolding] = useState(false);
  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  const start = () => {
    if (timer.current) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onPass();
    }, 2500);
  };
  return <div className="parent-gate" role="dialog" aria-modal="true" aria-labelledby="parent-gate-title" onClick={onClose}>
    <section onClick={(event) => event.stopPropagation()}>
      <span aria-hidden="true">👨‍👩‍👧</span>
      <h2 id="parent-gate-title">ورود مخصوص بزرگ‌ترها</h2>
      <p>برای دیدن گزارش، دکمه را تا کامل‌شدن حلقه نگه دارید.</p>
      <button className={holding ? 'parent-hold parent-hold--active' : 'parent-hold'} type="button"
        onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') start(); }}
        onKeyUp={cancel}>۲٫۵ ثانیه نگه دار</button>
      <button className="parent-gate__close" type="button" onClick={onClose}>بازگشت</button>
    </section>
  </div>;
}
