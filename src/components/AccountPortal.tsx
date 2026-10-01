import { useCallback, useEffect, useState } from 'react';
import { App } from '../App';
import type {
  Child,
  RunReport,
  RunState,
  School,
  Session,
} from '../types/account';
import { api, post } from '../utils/api';
import {
  flushAnalytics,
  loadChildStates,
  pendingCount,
  recoverSyncConflict,
  syncProblem,
  configureAnalytics,
} from '../utils/analytics';
import { AdminDashboard } from './AdminDashboard';
import { ParentReport } from './ParentReport';

export function AccountPortal() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [children, setChildren] = useState<Child[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selected, setSelected] = useState<{
    child: Child;
    states: RunState[];
    history: RunReport[];
  } | null>(null);
  const [mode, setMode] = useState<'children' | 'report' | 'profile'>(
    'children',
  );
  const [register, setRegister] = useState(false);
  const [editing, setEditing] = useState<Child | null>(null);
  const [error, setError] = useState('');
  const [sync, setSync] = useState('');
  const [busy, setBusy] = useState(false);
  const [admin, setAdmin] = useState(
    window.location.pathname.startsWith('/admin'),
  );
  const load = useCallback(async () => {
    try {
      const current = await api<Session>('/api/session');
      setSession(current);
      if (current.role === 'parent') {
        const [c, s] = await Promise.all([
          api<Child[]>('/api/children'),
          api<School[]>('/api/schools'),
        ]);
        setChildren(c);
        setSchools(s);
      }
    } catch (e) {
      if ((e as { status?: number }).status === 401) setSession(null);
      else {
        setSession(null);
        setError(
          'ارتباط با سرویس برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.',
        );
      }
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const receive = (e: Event) => setSync((e as CustomEvent<string>).detail);
    const online = () => void flushAnalytics();
    const timer = window.setInterval(online, 15000);
    window.addEventListener('game-sync-status', receive);
    window.addEventListener('online', online);
    return () => {
      clearInterval(timer);
      window.removeEventListener('game-sync-status', receive);
      window.removeEventListener('online', online);
    };
  }, []);
  const submitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await post(
        register ? '/api/auth/register' : '/api/auth/login',
        Object.fromEntries(data),
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    setBusy(true);
    setError('');
    try {
      await flushAnalytics();
      if (pendingCount())
        throw new Error(
          'برای خروج، ابتدا اتصال را برقرار کنید تا اطلاعات بازی ارسال شود.',
        );
      await post('/api/auth/logout', {});
      configureAnalytics('', []);
      setSelected(null);
      setSession(null);
      setMode('children');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const chooseChild = async (child: Child) => {
    setBusy(true);
    setError('');
    try {
      const states = await loadChildStates(child.id);
      const report = await api<{ runs: RunReport[] }>(
        `/api/parent/report?childId=${child.id}&range=all`,
      );
      setSelected({ child, states, history: report.runs });
      setMode('children');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const saveChild = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(editing ? `/api/children/${editing.id}` : '/api/children', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...values, age: Number(values.age) }),
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (admin)
    return (
      <AdminDashboard
        onClose={() => {
          window.history.pushState({}, '', '/');
          setAdmin(false);
          void load();
        }}
      />
    );
  if (session === undefined)
    return (
      <main className="account-page">
        <p role="status">در حال بررسی حساب…</p>
      </main>
    );
  if (!session)
    return (
      <main className="account-page" dir="rtl">
        <section className="account-card auth-card">
          <img
            className="account-logo"
            src="/assets/brand/client-logo.png"
            alt="متفکر"
          />
          <span className="tiny-label">کتابفروشی سحرآمیز متفکر</span>
          <h1>{register ? 'ساخت حساب والد' : 'ورود به حساب والد'}</h1>
          <p>هر کودک، قصه و مسیر رشد خودش را دارد.</p>
          <form onSubmit={(e) => void submitAuth(e)} className="account-form">
            {register && (
              <label>
                نام و نام خانوادگی والد
                <input
                  name="fullName"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              نام کاربری
              <input
                name="username"
                dir="ltr"
                required
                pattern="[a-zA-Z0-9_.-]{4,40}"
                minLength={4}
                maxLength={40}
                autoComplete="username"
              />
              <small>۴ تا ۴۰ حرف انگلیسی، عدد، نقطه یا زیرخط</small>
            </label>
            <label>
              رمز عبور
              <input
                name="password"
                dir="ltr"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete={register ? 'new-password' : 'current-password'}
              />
              <small>حداقل ۱۰ کاراکتر</small>
            </label>
            {register && (
              <label>
                کد دعوت
                <input
                  name="inviteCode"
                  dir="ltr"
                  required
                  minLength={8}
                  maxLength={80}
                />
                <small>کد دعوت را از مسئول مجموعه دریافت کنید.</small>
              </label>
            )}
            {error && (
              <p className="account-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? 'در حال بررسی…' : register ? 'ثبت‌نام' : 'ورود'}
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setRegister(!register);
              setError('');
            }}
            type="button"
          >
            {register ? 'حساب دارید؟ وارد شوید' : 'کد دعوت دارید؟ ثبت‌نام کنید'}
          </button>
          <p className="muted">
            برای بازیابی رمز عبور با مسئول مجموعه تماس بگیرید.
          </p>
          <button
            className="text-button"
            onClick={() => {
              window.history.pushState({}, '', '/admin');
              setAdmin(true);
            }}
            type="button"
          >
            ورود مدیر
          </button>
        </section>
      </main>
    );
  if (session.role === 'admin')
    return (
      <main className="account-page">
        <section className="account-card">
          <h1>حساب مدیر</h1>
          <button className="primary-button" onClick={() => setAdmin(true)}>
            بازکردن داشبورد مدیر
          </button>
          <button className="text-button" onClick={() => void logout()}>
            خروج
          </button>
        </section>
      </main>
    );
  return (
    <div className="account-shell" dir="rtl">
      <nav className="account-nav" aria-label="حساب والد">
        <strong>{session.parent?.fullName}</strong>
        <div>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setMode('children');
            }}
          >
            کودکان من
          </button>
          <button type="button" onClick={() => setMode('report')}>
            گزارش رشد
          </button>
          <button type="button" onClick={() => setMode('profile')}>
            پروفایل والد
          </button>
          <button type="button" disabled={busy} onClick={() => void logout()}>
            خروج
          </button>
        </div>
      </nav>
      {(error || sync) && (
        <p className="sync-banner" role="status">
          {error || sync}
          {syncProblem()===401 && <button className="text-button" type="button" onClick={()=>window.location.reload()}>ورود دوباره با حفظ اطلاعات</button>}
          {(syncProblem()===409||syncProblem()===404) && <button className="text-button" type="button" onClick={()=>{
            if(window.confirm('پیشرفت تأییدشدهٔ سرور دریافت شود؟ رویدادهای ناسازگار در یک نسخهٔ پشتیبان روی این مرورگر حفظ می‌شوند و وارد گزارش رسمی نمی‌شوند.'))void recoverSyncConflict().then(()=>{setSelected(null);setMode('children');setError('');}).catch(e=>setError(e.message));
          }}>بازیابی پیشرفت سرور</button>}
        </p>
      )}
      {mode === 'report' ? (
        <ParentReport
          children={children}
          initialChildId={selected?.child.id}
          onClose={() => {
            setSelected(null);
            setMode('children');
          }}
        />
      ) : mode === 'profile' ? (
        <main className="account-page">
          <section className="account-card">
            <h1>پروفایل والد</h1>
            <p>
              نام کاربری: <b dir="ltr">{session.parent?.username}</b>
            </p>
            <form
              className="account-form"
              onSubmit={(event) => {
                event.preventDefault();
                const values = Object.fromEntries(
                  new FormData(event.currentTarget),
                );
                setBusy(true);
                void api('/api/parent/profile', {
                  method: 'PATCH',
                  body: JSON.stringify(values),
                })
                  .then(load)
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              <label>
                نام و نام خانوادگی
                <input
                  name="fullName"
                  defaultValue={session.parent?.fullName}
                  minLength={2}
                  required
                />
              </label>
              <button type="submit" className="primary-button" disabled={busy}>
                ذخیره پروفایل
              </button>
            </form>
            <hr />
            <h2>تغییر رمز عبور</h2>
            <form
              className="account-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                setBusy(true);
                void post(
                  '/api/auth/password',
                  Object.fromEntries(new FormData(form)),
                )
                  .then(() => {
                    form.reset();
                    setError('رمز عبور با موفقیت تغییر کرد.');
                  })
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              <label>
                رمز فعلی
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                رمز جدید
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </label>
              <button type="submit" className="primary-button" disabled={busy}>
                تغییر رمز
              </button>
            </form>
          </section>
        </main>
      ) : selected ? (
        <App
          key={selected.child.id}
          child={selected.child}
          initialRuns={selected.states}
          history={selected.history}
          onParent={() => setMode('report')}
        />
      ) : (
        <main className="account-page children-page">
          <header>
            <span className="tiny-label">خانوادهٔ شما در متفکر</span>
            <h1>امروز چه کسی بازی می‌کند؟</h1>
            <p>پیشرفت، امتیاز و گزارش هر کودک به‌صورت مستقل ذخیره می‌شود.</p>
          </header>
          <section className="child-grid">
            {children.map((child) => (
              <article className="account-card child-card" key={child.id}>
                <span className="child-avatar">{child.avatar}</span>
                <h2>
                  {child.firstName} {child.lastName}
                </h2>
                <p>
                  {child.age} ساله · {child.schoolName}
                </p>
                <small dir="ltr">{child.publicId}</small>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void chooseChild(child)}
                  type="button"
                >
                  ورود به کتاب‌ها
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setEditing(child)}
                >
                  ویرایش پروفایل
                </button>
              </article>
            ))}
          </section>
          <section className="account-card child-form-card">
            <h2>{editing ? 'ویرایش پروفایل کودک' : 'افزودن کودک'}</h2>
            <form
              key={editing?.id ?? 'new'}
              className="account-form form-columns"
              onSubmit={(e) => void saveChild(e)}
            >
              <label>
                نام کودک
                <input
                  name="firstName"
                  required
                  maxLength={60}
                  defaultValue={editing?.firstName}
                />
              </label>
              <label>
                نام خانوادگی
                <input
                  name="lastName"
                  required
                  maxLength={60}
                  defaultValue={editing?.lastName}
                />
              </label>
              <label>
                سن کودک
                <input
                  name="age"
                  type="number"
                  min={3}
                  max={18}
                  required
                  defaultValue={editing?.age ?? 7}
                />
              </label>
              <label>
                مدرسه
                <select
                  name="schoolId"
                  required
                  defaultValue={editing?.schoolId ?? ''}
                >
                  <option value="" disabled>
                    انتخاب مدرسه
                  </option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                تصویر کودک
                <select name="avatar" defaultValue={editing?.avatar ?? '🦊'}>
                  {['🦊', '🐰', '🐸', '🦄', '🐻'].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-actions">
                <button
                  className="primary-button"
                  disabled={busy || !schools.length}
                  type="submit"
                >
                  {editing ? 'ذخیره تغییرات' : 'ساخت پروفایل کودک'}
                </button>
                {editing && (
                  <button
                    className="text-button"
                    onClick={() => setEditing(null)}
                    type="button"
                  >
                    انصراف
                  </button>
                )}
              </div>
            </form>
            {!schools.length && (
              <p>مدیر باید ابتدا مدرسه را در فهرست مدارس ثبت کند.</p>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
