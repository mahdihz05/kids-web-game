import type { SolutionComparisonRow } from '../types/story';

export function SolutionComparison({ rows }: { rows: SolutionComparisonRow[] }) {
  return <div className="solution-comparison" role="table" aria-label="مقایسه راه‌حل‌ها">
    <div className="solution-comparison__row solution-comparison__head" role="row">
      <span role="columnheader">راه‌حل</span><span role="columnheader">سرعت</span><span role="columnheader">مقدار بلوط</span><span role="columnheader">همکاری</span>
    </div>
    {rows.map((row) => <div className={`solution-comparison__row solution-comparison__row--${row.solution === 'تور' ? 'best' : 'normal'}`} role="row" key={row.solution}>
      <strong role="cell"><i aria-hidden="true">{row.icon}</i>{row.solution}</strong><span role="cell">{row.speed}</span><span role="cell">{row.amount}</span><span role="cell">{row.cooperation}</span>
    </div>)}
  </div>;
}
