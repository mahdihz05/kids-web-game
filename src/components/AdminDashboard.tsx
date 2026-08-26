import { useCallback, useEffect, useState } from 'react';

type GameRow = { storyId: string; title: string; starts: number; completed: number; replays: number; averageMinutes: number; completionRate: number };
type ChoiceColumn = { id: string; label: string; count: number };
type StageRow = { storyId: string; sceneId: string; stageTitle: string; order: number; entries: number; choices: Record<string, number>; choiceOptions: ChoiceColumn[]; dropoffs: number };
type Report = { games: GameRow[]; stages: StageRow[] };

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [range, setRange] = useState('7d');
  const [report, setReport] = useState<Report>({ games: [], stages: [] });
  const [error, setError] = useState('');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`/api/admin/report?range=${range}`);
      if (response.status === 401) { setAuthenticated(false); return; }
      if (!response.ok) throw new Error();
      setReport(await response.json() as Report); setAuthenticated(true);
    } catch { setError('ارتباط با سرویس گزارش برقرار نشد. بازی‌ها همچنان به‌صورت آفلاین کار می‌کنند.'); }
  }, [range]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
    if (response.ok) { setAuthenticated(true); setPassword(''); void load(); } else setError('رمز عبور صحیح نیست.');
  };
  if (authenticated === null && !error) return <main className="admin-page"><section className="admin-login"><p>در حال دریافت گزارش…</p></section></main>;
  if (authenticated === null && error) return <main className="admin-page"><section className="admin-login"><button onClick={onClose} className="round-button" type="button">×</button><h1>گزارش مدیریتی</h1><p className="admin-error">{error}</p><button className="primary-button" onClick={() => void load()} type="button">تلاش دوباره</button></section></main>;
  if (authenticated === false) return <main className="admin-page"><section className="admin-login"><button onClick={onClose} className="round-button" type="button">×</button><h1>گزارش مدیریتی</h1><p>برای مشاهده‌ی آمار تجمیعی وارد شوید.</p><form onSubmit={login}><label>رمز مدیر<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="primary-button" type="submit">ورود امن</button></form>{error && <p className="admin-error">{error}</p>}</section></main>;

  const selectedGame = report.games.find((row) => row.storyId === selectedStoryId);
  const stageRows = report.stages.filter((row) => row.storyId === selectedStoryId).sort((left, right) => left.order - right.order);
  const maxChoiceColumns = Math.max(0, ...stageRows.map((row) => row.choiceOptions.length));
  return <main className="admin-page" dir="rtl"><header className="admin-header"><h1>{selectedGame ? `جزئیات ${selectedGame.title}` : 'گزارش مدیریتی بازی‌ها'}</h1><div className="admin-actions"><select aria-label="بازه گزارش" value={range} onChange={(event) => setRange(event.target.value)}><option value="today">امروز</option><option value="7d">۷ روز</option><option value="30d">۳۰ روز</option><option value="all">همه</option></select><a className="admin-export" href={`/api/admin/report.docx?range=${range}`}>خروجی Word</a><button className="round-button" onClick={onClose} type="button">×</button></div></header>{error && <p className="admin-error">{error}</p>}
    {!selectedGame ? <section className="admin-section"><h2>جدول بازی‌ها</h2><div className="admin-table-wrap"><table><thead><tr><th>بازی</th><th>شروع</th><th>تکمیل</th><th>Replay</th><th>میانگین زمان</th><th>نرخ تکمیل</th></tr></thead><tbody>{report.games.map((row) => <tr className="admin-game-row" key={row.storyId} onClick={() => setSelectedStoryId(row.storyId)}><td><button type="button" onClick={() => setSelectedStoryId(row.storyId)}>{row.title}</button></td><td>{row.starts}</td><td>{row.completed}</td><td>{row.replays}</td><td>{row.averageMinutes} دقیقه</td><td>{row.completionRate}٪</td></tr>)}</tbody></table></div>{!report.games.length && !error && <p className="admin-empty">هنوز داده‌ای برای این بازه ثبت نشده است.</p>}</section>
      : <section className="admin-section"><button className="admin-back" type="button" onClick={() => setSelectedStoryId(null)}>← بازگشت به جدول بازی‌ها</button><h2>جزئیات هر مرحله</h2><div className="admin-table-wrap"><table><thead><tr><th>مرحله</th><th>ورود</th>{Array.from({ length: maxChoiceColumns }, (_, index) => <th key={`choice-head-${index}`}>انتخاب {index + 1}</th>)}<th>ریزش</th></tr></thead><tbody>{stageRows.map((row, index) => <tr key={`${row.storyId}-${row.sceneId}`}><td><strong>{index + 1}. {row.stageTitle}</strong><small className="admin-scene-id">{row.sceneId}</small></td><td>{row.entries}</td>{Array.from({ length: maxChoiceColumns }, (_, choiceIndex) => { const option = row.choiceOptions[choiceIndex]; return <td className="admin-choice-cell" key={`${row.sceneId}-choice-${choiceIndex}`}>{option ? <><strong>{option.count}</strong><small>{option.label}</small></> : '—'}</td>; })}<td>{row.dropoffs}</td></tr>)}</tbody></table></div>{!stageRows.length && <p className="admin-empty">هنوز جزئیات مرحله‌ای ثبت نشده است.</p>}</section>}
  </main>;
}
