import { useEffect, useState } from 'react';
import type { Child, RunReport } from '../types/account';
import { api } from '../utils/api';
import { flushAnalytics, pendingCount } from '../utils/analytics';
import { getStory, storyRegistry } from '../data/storyRegistry';
import { skillLabels } from '../engine/ScoreSystem';

export function ParentReport({
  children,
  initialChildId,
  onClose,
}: {
  children: Child[];
  initialChildId?: string;
  onClose: () => void;
}) {
  const [childId, setChildId] = useState(
    initialChildId ?? children[0]?.id ?? '',
  );
  const [storyId, setStoryId] = useState(Object.keys(storyRegistry)[0]);
  const [runs, setRuns] = useState<RunReport[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      void (async () => {
        await flushAnalytics();
        if (pendingCount())
          throw new Error(
            'برای نمایش آخرین عملکرد، اتصال را برقرار کنید تا اطلاعات بازی ارسال شود.',
          );
        const data = await api<{ runs: RunReport[] }>(
          `/api/parent/report?range=all${childId ? `&childId=${childId}` : ''}`,
        );
        if (alive) setRuns(data.runs);
      })()
        .catch((e) => {
          if (alive) setError(e.message);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [childId]);
  const child = children.find((c) => c.id === childId);
  const completed = runs.filter((r) => r.completedAt);
  const storyRuns = completed.filter((r) => r.storyId === storyId);
  const points = storyRuns.filter(
    (r) => r.scoringVersion === storyRuns.at(-1)?.scoringVersion,
  );
  const latest = points.at(-1);
  const skills = Object.entries(skillLabels);
  const best = Object.keys(storyRegistry).map((id) =>
    Math.max(
      0,
      ...completed.filter((r) => r.storyId === id).map((r) => r.stars),
    ),
  );
  return (
    <main className="research-page parent-report" dir="rtl">
      <header className="research-header">
        <div>
          <span className="tiny-label">گزارش سادهٔ والد</span>
          <h1>رشد {child?.firstName ?? 'کودک'}</h1>
          <p>روند عملکرد در بازی؛ این گزارش ارزیابی تشخیصی نیست.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onClose}>
          بازگشت به کودکان
        </button>
      </header>
      <div className="report-filters">
        <label>
          کودک
          <select value={childId} onChange={(e) => setChildId(e.target.value)}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </label>
        <label>
          بازی نمودار
          <select value={storyId} onChange={(e) => setStoryId(e.target.value)}>
            {Object.values(storyRegistry).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">در حال دریافت گزارش…</p>
      ) : (
        <>
          <section className="report-stats">
            <article>
              <strong>{completed.length}</strong>
              <span>نوبت کامل‌شده</span>
            </article>
            <article>
              <strong>{best.reduce((a, b) => a + b, 0)}</strong>
              <span>ستاره از بهترین نتیجهٔ هر بازی</span>
            </article>
            <article>
              <strong>{new Set(completed.map((r) => r.storyId)).size}</strong>
              <span>نشان مأموریت</span>
            </article>
          </section>
          <section className="account-card growth-report">
            <h2>نمودار رشد در {getStory(storyId).title}</h2>
            <p>
              مقایسهٔ نوبت‌های همین بازی و نسخهٔ یکسان قواعد امتیازدهی؛ نوبت‌های
              ناقص وارد نمودار نمی‌شوند.
            </p>
            {points.length >= 2 ? (
              <>
                <div
                  className="growth-plot"
                  role="img"
                  aria-label={`درصد عملکرد در ${points.length} نوبت: ${points.map((r) => r.percent).join('، ')}`}
                >
                  <svg
                    viewBox="0 0 600 220"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <title>تغییر درصد عملکرد در نوبت‌های بازی</title>
                    {[0, 25, 50, 75, 100].map((v) => (
                      <g key={v}>
                        <line
                          x1="40"
                          y1={190 - v * 1.6}
                          x2="570"
                          y2={190 - v * 1.6}
                          stroke="#e4deee"
                        />
                        <text x="5" y={195 - v * 1.6} fontSize="12">
                          {v}٪
                        </text>
                      </g>
                    ))}
                    <polyline
                      points={points
                        .map(
                          (r, i) =>
                            `${50 + (i * 500) / (points.length - 1)},${190 - r.percent * 1.6}`,
                        )
                        .join(' ')}
                      fill="none"
                      stroke="#7251ac"
                      strokeWidth="3"
                    />
                    {points.map((r, i) => (
                      <g key={r.id}>
                        <circle
                          cx={50 + (i * 500) / (points.length - 1)}
                          cy={190 - r.percent * 1.6}
                          r="5"
                          fill="#7251ac"
                        />
                        <text
                          x={50 + (i * 500) / (points.length - 1)}
                          y="213"
                          textAnchor="middle"
                          fontSize="11"
                        >
                          {i + 1}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <p className="muted">
                  محور افقی: شماره نوبت · محور عمودی: درصد امتیاز قابل کسب
                </p>
              </>
            ) : (
              <p className="empty-note">
                {points.length
                  ? 'اولین نتیجه ثبت شده است. پس از تکمیل دوبارهٔ این بازی، نمودار رشد نمایش داده می‌شود.'
                  : 'هنوز نتیجهٔ کاملی برای این بازی ثبت نشده است.'}
              </p>
            )}
            {latest && (
              <div className="skill-chart">
                {skills.map(([id, label]) => (
                  <div className="skill-row" key={id}>
                    <span>{label}</span>
                    <div>
                      <i style={{ width: `${latest.skills[id] ?? 0}%` }} />
                    </div>
                    <b>
                      {latest.skills[id] === null
                        ? '—'
                        : `${latest.skills[id]}٪`}
                    </b>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="account-card">
            <h2>تاریخچه و نشان‌ها</h2>
            <div className="admin-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>بازی</th>
                    <th>زمان</th>
                    <th>وضعیت</th>
                    <th>درصد</th>
                    <th>ستاره</th>
                    <th>نشان / مدال</th>
                  </tr>
                </thead>
                <tbody>
                  {[...runs].reverse().map((r) => (
                    <tr key={r.id}>
                      <td>{getStory(r.storyId).title}</td>
                      <td>
                        {new Date(r.startedAt).toLocaleDateString('fa-IR')}
                      </td>
                      <td>{r.completedAt ? 'کامل' : 'در حال انجام'}</td>
                      <td>{r.percent}٪</td>
                      <td>{r.stars}</td>
                      <td>
                        {r.badge ?? '—'} {r.medal && `· ${r.medal}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!runs.length && (
              <p className="empty-note">
                با شروع اولین بازی، گزارش اینجا ثبت می‌شود.
              </p>
            )}
            <p className="scoring-note">
              ۱ ستاره: زیر ۵۰٪ · ۲ ستاره: از ۵۰٪ · ۳ ستاره: از ۸۰٪
              <br />
              مدال برنز: زیر ۶۵٪ · نقره: از ۶۵٪ · طلا: از ۸۵٪
            </p>
          </section>
        </>
      )}
    </main>
  );
}
