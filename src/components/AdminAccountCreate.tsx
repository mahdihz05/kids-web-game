import { useEffect, useState } from 'react';
import type { Child, School } from '../types/account';
import { api, post } from '../utils/api';

export type ManagedAccount = { id: string; username: string; fullName: string; enabled: boolean; role: 'parent' | 'player'; childId: string | null };

export function AdminAccountCreate({ accounts, schools, busy, run, onCreated }: {
  accounts: ManagedAccount[];
  schools: School[];
  busy: boolean;
  run: (task: () => Promise<void>) => Promise<void>;
  onCreated: (message: string) => void;
}) {
  const [role, setRole] = useState<'parent' | 'player'>('parent');
  const [parentId, setParentId] = useState('');
  const [newChild, setNewChild] = useState(false);
  const [children, setChildren] = useState<(Child & { playerUsername: string | null })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    api<typeof children>(`/api/admin/parents/${parentId}/children`).then(result => {
      if (!cancelled) { setChildren(result); setLoading(false); }
    }).catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [parentId]);
  const needsChild = newChild;
  return <section className="account-card">
    <h2>ایجاد حساب والد یا بازیکن</h2>
    <p>والد پروفایل و گزارش کودکان خود را مدیریت می‌کند. بازیکن فقط به بازی و نتیجهٔ کودک خودش دسترسی دارد.</p>
    <form className="account-form" onSubmit={e => {
      e.preventDefault();
      const form = e.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      const child = needsChild ? { firstName: values.firstName, lastName: values.lastName, age: Number(values.age), schoolId: values.schoolId } : undefined;
      void run(async () => {
        const result = await post<{ username: string; child: Child | null }>('/api/admin/accounts', {
          role, username: values.username, password: values.password,
          ...(role === 'parent' ? { fullName: values.fullName } : { parentId, ...(newChild ? {} : { childId: values.childId }) }),
          ...(child ? { child } : {}),
        });
        onCreated(`نوع حساب: ${role === 'parent' ? 'والد' : 'بازیکن'}\nآدرس ورود: ${window.location.origin}/\nنام کاربری: ${result.username}\nرمز: ${values.password}${result.child ? `\nشناسه کودک: ${result.child.publicId}` : ''}`);
        form.reset();
        setParentId(''); setChildren([]); setNewChild(false);
      });
    }}>
      <label>نوع حساب<select aria-label="نوع حساب" value={role} onChange={e => { setRole(e.target.value as typeof role); setNewChild(false); setParentId(''); setChildren([]); setError(''); }}>
        <option value="parent">والد</option><option value="player">بازیکن (کودک)</option>
      </select></label>
      {role === 'parent' ? <label>نام و نام خانوادگی والد<input name="fullName" required minLength={2} maxLength={100} autoComplete="off" /></label> : <>
        <label>والد کودک<select aria-label="والد کودک" required value={parentId} onChange={e => { setParentId(e.target.value); setChildren([]); setLoading(Boolean(e.target.value)); setError(''); }}>
          <option value="">انتخاب والد فعال</option>{accounts.filter(a => a.role === 'parent' && a.enabled).map(a => <option value={a.id} key={a.id}>{a.fullName} ({a.username})</option>)}
        </select></label>
        <p>اگر والد هنوز حساب ندارد، ابتدا حساب والد را بسازید.</p>
      </>}
      <label><input type="checkbox" checked={newChild} onChange={e => setNewChild(e.target.checked)} />{role === 'parent' ? 'هم‌زمان پروفایل کودک بساز' : 'پروفایل کودک جدید بساز'}</label>
      {role === 'player' && !newChild && <label>کودک موجود<select name="childId" required disabled={loading || !parentId} key={parentId}>
        <option value="">{loading ? 'در حال دریافت کودکان…' : 'انتخاب کودک بدون حساب بازیکن'}</option>
        {children.map(c => <option key={c.id} value={c.id} disabled={Boolean(c.playerUsername)}>{c.firstName} {c.lastName} — {c.publicId}{c.playerUsername ? ' (حساب دارد)' : ''}</option>)}
      </select></label>}
      {needsChild && <>
        <label>نام کودک<input name="firstName" required maxLength={60} /></label>
        <label>نام خانوادگی کودک<input name="lastName" required maxLength={60} /></label>
        <label>سن کودک<input name="age" type="number" min={3} max={18} defaultValue={7} required /></label>
        <label>مدرسه<select name="schoolId" required><option value="">انتخاب مدرسه</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {!schools.length && <p>ابتدا از بخش «فهرست مدارس» مدرسه را اضافه کنید.</p>}
      </>}
      <label>نام کاربری<input name="username" dir="ltr" required minLength={4} maxLength={40} pattern="[a-zA-Z0-9_.\-]{4,40}" autoComplete="off" /></label>
      <small>۴ تا ۴۰ حرف انگلیسی، عدد، نقطه، خط تیره یا زیرخط؛ ورود با حروف کوچک انجام می‌شود.</small>
      <label>رمز ورود<input name="password" type="password" dir="ltr" required minLength={10} maxLength={128} autoComplete="new-password" /></label>
      <small>حداقل ۱۰ نویسه. پس از ساخت، اطلاعات ورود برای تحویل نمایش داده می‌شود.</small>
      {error && <p role="alert" className="account-error">{error}</p>}
      <button className="primary-button" type="submit" disabled={busy || (role === 'player' && (loading || !parentId || Boolean(error)))}>ایجاد حساب</button>
    </form>
  </section>;
}
