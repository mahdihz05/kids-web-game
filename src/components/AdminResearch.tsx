import { useCallback, useEffect, useState } from 'react';
import type { Child, RunReport, School } from '../types/account';
import { api, post } from '../utils/api';
import { getStory, storyRegistry } from '../data/storyRegistry';
import { skillLabels } from '../engine/ScoreSystem';

type EventRow = {
  eventId: string;
  runId: string;
  publicId: string;
  childName: string;
  storyId: string;
  sceneId: string;
  stageTitle: string;
  itemId: string | null;
  type: string;
  scoreDelta: number;
  occurredAt: string;
  details: {
    kind?: string;
    label?: string;
    correct?: boolean | null;
    activeMs?: number;
    promptId?: string;
  };
};
type Cohort = {
  name: string;
  children: number;
  runs: number;
  completed: number;
  averagePercent: number | null;
};
type Research = {
  children: (Child & {
    runs: number;
    completed: number;
    averagePercent: number | null;
  })[];
  runs: RunReport[];
  events: EventRow[];
  ages: Cohort[];
  schools: Cohort[];
};
const empty: Research = {
  children: [],
  runs: [],
  events: [],
  ages: [],
  schools: [],
};
const eventLabels: Record<string, string> = {
  choice: 'انتخاب پاسخ',
  discover: 'کشف سرنخ',
  tool: 'انتخاب ابزار',
  craft: 'ساخت ابزار',
  reflection: 'بازاندیشی',
  continue: 'ادامه مرحله',
  start: 'شروع',
  replay: 'بازی مجدد',
  scene_enter: 'ورود به مرحله',
  complete: 'تکمیل',
  heartbeat: 'فعالیت',
  pause: 'توقف',
  resume: 'ادامه بازی',
};

export function AdminResearch() {
  const [tab, setTab] = useState<'report' | 'accounts'>('report');
  const [data, setData] = useState<Research>(empty);
  const [schools, setSchools] = useState<School[]>([]);
  const [publicId, setPublicId] = useState('');
  const [age, setAge] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [range, setRange] = useState('30d');
  const [storyId, setStoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [childId, setChildId] = useState('');
  const [runId, setRunId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries({
        publicId: publicId.trim(),
        age,
        schoolId,
        range,
        storyId,
        from,
        to,
        childId,
      }).filter(([, v]) => v),
    ),
  ).toString();
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      void Promise.all([
        api<Research>(`/api/admin/research?${query}`),
        api<School[]>('/api/schools'),
      ])
        .then(([d, s]) => {
          if (alive) {
            setData(d);
            setSchools(s);
          }
        })
        .catch((e) => {
          if (alive) setError(e.message);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, revision]);
  const selected = data.children.find((c) => c.id === childId);
  const selectedRuns = data.runs.filter((r) => !runId || r.id === runId);
  const selectedEvents = data.events.filter((e) => !runId || e.runId === runId);
  const stages = selected
    ? Object.values(storyRegistry)
        .filter((s) => !storyId || s.id === storyId)
        .flatMap((story) =>
          story.scenes.map((scene) => {
            const events = selectedEvents.filter(
              (e) => e.storyId === story.id && e.sceneId === scene.id,
            );
            return {
              story,
              scene,
              events,
              points: events.reduce((sum, e) => sum + e.scoreDelta, 0),
              seconds: Math.round(
                events.reduce((sum, e) => sum + (e.details.activeMs ?? 0), 0) /
                  1000,
              ),
            };
          }),
        )
        .filter((r) => r.events.length)
    : [];
  const cohortTable = (title: string, rows: Cohort[]) => (
    <section className="account-card">
      <h2>{title}</h2>
      <div className="admin-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>گروه</th>
              <th>کودک</th>
              <th>نوبت</th>
              <th>تکمیل</th>
              <th>میانگین عملکرد</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.children}</td>
                <td>{r.runs}</td>
                <td>{r.completed}</td>
                <td>
                  {r.averagePercent === null ? '—' : `${r.averagePercent}٪`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
  return (
    <section className="research-page">
      <div className="research-tabs">
        <button
          aria-pressed={tab === 'report'}
          onClick={() => setTab('report')}
          type="button"
        >
          عملکرد کودکان
        </button>
        <button
          aria-pressed={tab === 'accounts'}
          onClick={() => setTab('accounts')}
          type="button"
        >
          مدارس، دعوت و حساب والد
        </button>
      </div>
      {tab === 'accounts' ? (
        <AccountManagement onChange={() => setRevision((r) => r + 1)} />
      ) : (
        <>
          <div className="report-filters">
            <label>
              شناسه کاربر
              <input
                dir="ltr"
                placeholder="K-…"
                value={publicId}
                onChange={(e) => {
                  setPublicId(e.target.value.toUpperCase());
                  setChildId('');
                  setRunId('');
                }}
              />
            </label>
            <label>
              سن هنگام بازی
              <select value={age} onChange={(e) => setAge(e.target.value)}>
                <option value="">همه سن‌ها</option>
                {Array.from({ length: 16 }, (_, i) => i + 3).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label>
              مدرسه هنگام بازی
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
              >
                <option value="">همه مدارس</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              بازی
              <select
                value={storyId}
                onChange={(e) => setStoryId(e.target.value)}
              >
                <option value="">همه بازی‌ها</option>
                {Object.values(storyRegistry).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              بازه
              <select
                aria-label="بازه گزارش"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option value="today">امروز</option>
                <option value="7d">۷ روز</option>
                <option value="30d">۳۰ روز</option>
                <option value="all">همه</option>
              </select>
            </label>
            <label>
              از تاریخ
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              تا تاریخ
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <a
              className="admin-export"
              href={`/api/admin/report.xlsx?${query}`}
            >
              دریافت Excel با همین فیلترها
            </a>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setRevision((r) => r + 1)}
            >
              به‌روزرسانی
            </button>
          </div>
          <p className="muted">
            سن و مدرسهٔ گزارش بازی‌ها مربوط به زمان انجام بازی است. میانگین‌ها
            فقط از بازی‌های کامل محاسبه می‌شوند؛ تعداد کودکان و نوبت‌ها کنار هر
            گروه نمایش داده می‌شود.
          </p>
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          {loading && <p role="status">در حال دریافت عملکرد…</p>}
          <section className="account-card">
            <h2>
              {selected
                ? `عملکرد ${selected.firstName} ${selected.lastName}`
                : 'کاربران'}
            </h2>
            {selected && (
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setChildId('');
                  setRunId('');
                }}
              >
                بازگشت به همه کاربران
              </button>
            )}
            <div className="admin-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>شناسه</th>
                    <th>نام کودک</th>
                    <th>سن فعلی</th>
                    <th>مدرسه فعلی</th>
                    <th>نوبت</th>
                    <th>تکمیل</th>
                    <th>میانگین</th>
                    <th>جزئیات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.children.map((c) => (
                    <tr key={c.id}>
                      <td dir="ltr">{c.publicId}</td>
                      <td>
                        {c.firstName} {c.lastName}
                      </td>
                      <td>{c.age}</td>
                      <td>{c.schoolName}</td>
                      <td>{c.runs}</td>
                      <td>{c.completed}</td>
                      <td>
                        {c.averagePercent === null
                          ? '—'
                          : `${c.averagePercent}٪`}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            setChildId(c.id);
                            setRunId('');
                          }}
                        >
                          مشاهده عملکرد
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.children.length && !loading && (
              <p className="empty-note">
                کاربری مطابق این فیلترها یافت نشد. داده‌های ناشناس نسخهٔ قبلی در
                گزارش تجمیعی بازی‌ها باقی مانده‌اند.
              </p>
            )}
          </section>
          {selected && (
            <>
              <section className="account-card">
                <h2>نوبت‌های بازی و مهارت‌ها</h2>
                <label className="inline-label">
                  نوبت بازی
                  <select
                    value={runId}
                    onChange={(e) => setRunId(e.target.value)}
                  >
                    <option value="">همه نوبت‌های این کودک</option>
                    {data.runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {getStory(r.storyId).title} ·{' '}
                        {new Date(r.startedAt).toLocaleString('fa-IR')}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="admin-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>بازی / زمان</th>
                        <th>سن / مدرسه هنگام بازی</th>
                        <th>وضعیت</th>
                        <th>زمان فعال</th>
                        <th>امتیاز / درصد</th>
                        <th>ستاره / نشان / مدال</th>
                        {Object.values(skillLabels).map((s) => (
                          <th key={s}>{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRuns.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {getStory(r.storyId).title}
                            <small>
                              {new Date(r.startedAt).toLocaleString('fa-IR')}
                            </small>
                          </td>
                          <td>
                            {r.age} · {r.schoolName}
                          </td>
                          <td>{r.completedAt ? 'کامل' : 'در حال انجام'}</td>
                          <td>{r.activeMinutes} دقیقه</td>
                          <td>
                            {r.progress.score} / {r.percent}٪
                          </td>
                          <td>
                            {r.stars} ستاره · {r.badge ?? '—'} ·{' '}
                            {r.medal ?? '—'}
                          </td>
                          {Object.keys(skillLabels).map((s) => (
                            <td key={s}>
                              {r.skills[s] === null ? '—' : `${r.skills[s]}٪`}
                              <small>
                                {
                                  r.progress.skillScores[
                                    s as keyof typeof r.progress.skillScores
                                  ]
                                }{' '}
                                امتیاز
                              </small>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="account-card">
                <h2>عملکرد در هر مرحله</h2>
                <div className="admin-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>بازی / مرحله</th>
                        <th>پاسخ‌ها</th>
                        <th>پاسخ اشتباه</th>
                        <th>سرنخ</th>
                        <th>ابزار صحیح / اشتباه</th>
                        <th>ساخت ابزار</th>
                        <th>بازاندیشی</th>
                        <th>امتیاز</th>
                        <th>زمان فعال</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stages.map(
                        ({ story, scene, events, points, seconds }) => (
                          <tr key={`${story.id}:${scene.id}`}>
                            <td>
                              {story.title}
                              <small>
                                {scene.phaseTitle} · {scene.id}
                              </small>
                            </td>
                            <td>
                              {events.filter((e) => e.type === 'choice').length}
                            </td>
                            <td>
                              {
                                events.filter(
                                  (e) =>
                                    e.type === 'choice' &&
                                    e.details.correct === false,
                                ).length
                              }
                            </td>
                            <td>
                              {
                                events.filter(
                                  (e) => e.details.kind === 'discover',
                                ).length
                              }
                            </td>
                            <td>
                              {
                                events.filter(
                                  (e) =>
                                    e.details.kind === 'tool' &&
                                    e.details.correct === true,
                                ).length
                              }{' '}
                              /{' '}
                              {
                                events.filter(
                                  (e) =>
                                    e.details.kind === 'tool' &&
                                    e.details.correct === false,
                                ).length
                              }
                            </td>
                            <td>
                              {
                                events.filter(
                                  (e) =>
                                    e.details.kind === 'craft' &&
                                    e.scoreDelta > 0,
                                ).length
                              }
                            </td>
                            <td>
                              {
                                events.filter((e) => e.type === 'reflection')
                                  .length
                              }
                            </td>
                            <td>{points}</td>
                            <td>{seconds} ثانیه</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="account-card">
                <details>
                  <summary>
                    جزئیات انتخاب‌ها و رویدادهای بازی ({selectedEvents.length}{' '}
                    رویداد)
                  </summary>
                  <div className="admin-table-wrap event-scroll">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>زمان</th>
                          <th>مرحله</th>
                          <th>رویداد</th>
                          <th>انتخاب / پاسخ</th>
                          <th>تغییر امتیاز</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEvents
                          .filter((e) => e.type !== 'heartbeat')
                          .map((e) => (
                            <tr key={e.eventId}>
                              <td>
                                {new Date(e.occurredAt).toLocaleString('fa-IR')}
                              </td>
                              <td>{e.sceneId}</td>
                              <td>
                                {eventLabels[e.details.kind ?? e.type] ??
                                  e.type}
                              </td>
                              <td>{e.details.label ?? e.itemId ?? '—'}</td>
                              <td>{e.scoreDelta}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
            </>
          )}
          <div className="cohort-grid">
            {cohortTable('مقایسه گروه‌های سنی', data.ages)}
            {cohortTable('مقایسه مدارس', data.schools)}
          </div>
        </>
      )}
    </section>
  );
}

function AccountManagement({ onChange }: { onChange: () => void }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [invites, setInvites] = useState<
    { id: string; label: string; remainingUses: number; expiresAt: string }[]
  >([]);
  const [parents, setParents] = useState<
    { id: string; username: string; fullName: string; enabled: boolean }[]
  >([]);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [s, i, p] = await Promise.all([
      api<School[]>('/api/schools'),
      api<typeof invites>('/api/admin/invites'),
      api<typeof parents>('/api/admin/parents'),
    ]);
    setSchools(s);
    setInvites(i);
    setParents(p);
  }, []);
  useEffect(() => {
    const timer = setTimeout(
      () => void load().catch((e) => setError(e.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, [load]);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await task();
      await load();
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="management-grid">
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
      {secret && (
        <section className="account-card one-time-secret">
          <h2>اطلاعات تازه ایجادشده</h2>
          <p>
            این مقدار فقط اکنون نمایش داده می‌شود؛ آن را برای تحویل به والد
            نگهداری کنید.
          </p>
          <textarea
            readOnly
            value={secret}
            dir="ltr"
            aria-label="کد دعوت یا رمز جدید"
          />
          <button
            className="text-button"
            onClick={() => setSecret('')}
            type="button"
          >
            بستن
          </button>
        </section>
      )}
      <section className="account-card">
        <h2>فهرست مدارس</h2>
        <form
          className="account-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const values = Object.fromEntries(new FormData(form));
            void run(async () => {
              await post('/api/admin/schools', values);
              form.reset();
            });
          }}
        >
          <label>
            نام مدرسه
            <input name="name" required minLength={2} maxLength={120} />
          </label>
          <button className="primary-button" disabled={busy} type="submit">
            افزودن مدرسه
          </button>
        </form>
        <ul>
          {schools.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
      </section>
      <section className="account-card">
        <h2>دعوت برای ثبت‌نام والد</h2>
        <form
          className="account-form"
          onSubmit={(e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            void run(async () => {
              const result = await post<{ code: string }>(
                '/api/admin/invites',
                {
                  ...values,
                  uses: Number(values.uses),
                  days: Number(values.days),
                },
              );
              setSecret(result.code);
            });
          }}
        >
          <label>
            عنوان دعوت
            <input name="label" required minLength={2} maxLength={100} />
          </label>
          <label>
            تعداد ثبت‌نام مجاز
            <input
              type="number"
              name="uses"
              defaultValue={1}
              min={1}
              max={1000}
              required
            />
          </label>
          <label>
            اعتبار به روز
            <input
              type="number"
              name="days"
              defaultValue={30}
              min={1}
              max={90}
              required
            />
          </label>
          <button className="primary-button" disabled={busy} type="submit">
            ساخت کد دعوت
          </button>
        </form>
        <div className="admin-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>عنوان</th>
                <th>باقی‌مانده</th>
                <th>انقضا</th>
                <th>مدیریت</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.id}>
                  <td>{i.label}</td>
                  <td>{i.remainingUses}</td>
                  <td>{new Date(i.expiresAt).toLocaleDateString('fa-IR')}</td>
                  <td>
                    <button
                      className="text-button"
                      disabled={busy || !i.remainingUses}
                      type="button"
                      onClick={() =>
                        void run(async () => {
                          await api(`/api/admin/invites/${i.id}`, {
                            method: 'DELETE',
                          });
                        })
                      }
                    >
                      لغو دعوت
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="account-card parent-management">
        <h2>حساب‌های والد و بازیابی دسترسی</h2>
        <div className="admin-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>نام کاربری</th>
                <th>وضعیت</th>
                <th>دسترسی</th>
                <th>بازیابی رمز</th>
              </tr>
            </thead>
            <tbody>
              {parents.map((p) => (
                <tr key={p.id}>
                  <td>{p.fullName}</td>
                  <td dir="ltr">{p.username}</td>
                  <td>{p.enabled ? 'فعال' : 'غیرفعال'}</td>
                  <td>
                    <button
                      className="text-button"
                      disabled={busy}
                      type="button"
                      onClick={() =>
                        void run(async () => {
                          await api(`/api/admin/parents/${p.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ enabled: !p.enabled }),
                          });
                        })
                      }
                    >
                      {p.enabled ? 'غیرفعال‌کردن' : 'فعال‌کردن'}
                    </button>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      disabled={busy}
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `رمز حساب ${p.username} بازنشانی و نشست‌های آن بسته شود؟`,
                          )
                        )
                          void run(async () => {
                            const r = await post<{ password: string }>(
                              `/api/admin/parents/${p.id}/reset-password`,
                              {},
                            );
                            setSecret(`${p.username}\n${r.password}`);
                          });
                      }}
                    >
                      بازنشانی رمز
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
