import type { GameAction, RunState } from '../types/account';
import { api, post } from './api';

type Event = {
  eventId: string;
  runId: string;
  sequence: number;
  occurredAt: string;
  activeMs: number;
  action: GameAction;
};
let childId = '';
let runs: Record<string, RunState> = {};
let flushing: Promise<void> | null = null;
let lastActivity = performance.now();
let wasVisible = !document.hidden;
let blocked = false;
let problemCode = 0;
const queueKey = () => `motefaker:outbox:v2:${childId}`;
const queue = (): Event[] =>
  JSON.parse(localStorage.getItem(queueKey()) ?? '[]');
const status = (message: string) =>
  window.dispatchEvent(
    new CustomEvent('game-sync-status', { detail: message }),
  );
function uuid() {
  if (typeof globalThis.crypto?.randomUUID === 'function')
    return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const text = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`;
}
export function configureAnalytics(id: string, states: RunState[]) {
  childId = id;
  runs = Object.fromEntries(states.map((r) => [r.storyId, r]));
  blocked = false;
  problemCode = 0;
  lastActivity = performance.now();
  wasVisible = !document.hidden;
}
export function pendingCount() {
  return childId ? queue().length : 0;
}
export function syncProblem() { return problemCode; }
export async function recoverSyncConflict() {
  const states = await api<RunState[]>(`/api/children/${childId}/state`);
  const data = localStorage.getItem(queueKey());
  if (data) localStorage.setItem(`motefaker:conflict-backup:${childId}:${Date.now()}`,data);
  localStorage.setItem(queueKey(),'[]'); blocked=true; problemCode=0; status('');
  return states;
}
export function recordAction(storyId: string, action: GameAction) {
  if (blocked)
    throw new Error('پیشرفت نیاز به همگام‌سازی دارد. صفحه را تازه کنید.');
  const run = runs[storyId];
  if (!run) throw new Error('ابتدا نوبت بازی را شروع کنید.');
  const now = performance.now();
  const activeMs = wasVisible
    ? Math.min(60000, Math.max(0, Math.round(now - lastActivity)))
    : 0;
  lastActivity = now;
  wasVisible = !document.hidden;
  const events = queue();
  const sequence =
    Math.max(
      run.lastSequence,
      ...events.filter((e) => e.runId === run.id).map((e) => e.sequence),
      0,
    ) + 1;
  const event: Event = {
    eventId: uuid(),
    runId: run.id,
    sequence,
    action,
    occurredAt: new Date().toISOString(),
    activeMs,
  };
  try {
    localStorage.setItem(queueKey(), JSON.stringify([...events, event]));
  } catch {
    status(
      'فضای ذخیرهٔ مرورگر کافی نیست. برای حفظ اطلاعات، ادامهٔ بازی پس از آزادکردن فضا ممکن است.',
    );
    throw new Error('ذخیره اطلاعات انجام نشد.');
  }
  void flushAnalytics();
}
export async function flushAnalytics(): Promise<void> {
  if (!childId || blocked) return;
  if (flushing) return flushing;
  const id = childId;
  const key = queueKey();
  flushing = (async () => {
    try {
      let events = JSON.parse(localStorage.getItem(key) ?? '[]') as Event[];
      while (events.length) {
        const batch = events.slice(0, 100);
        const result = await post<{
          accepted: string[];
          states: Record<
            string,
            { progress: RunState['progress']; lastSequence: number }
          >;
        }>('/api/play/events', { events: batch });
        const current = JSON.parse(
          localStorage.getItem(key) ?? '[]',
        ) as Event[];
        events = current.filter((e) => !result.accepted.includes(e.eventId));
        localStorage.setItem(key, JSON.stringify(events));
        if (id === childId)
          for (const run of Object.values(runs))
            if (result.states[run.id]) {
              run.lastSequence = result.states[run.id].lastSequence;
              run.progress = result.states[run.id].progress;
            }
      }
      status('');
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409 || err.status === 401 || err.status === 404) {
        blocked = true;
        problemCode = err.status;
        status(err.message);
      } else
        status(
          'ارتباط قطع است؛ عملکرد شما روی این دستگاه ذخیره شده و پس از اتصال ارسال می‌شود.',
        );
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
export async function startRun(storyId: string): Promise<RunState> {
  await flushAnalytics();
  if (blocked)
    throw new Error('برای ادامه، صفحه را تازه کنید و وارد حساب شوید.');
  const current = runs[storyId];
  if (current && !current.progress.completed) return current;
  if (pendingCount())
    throw new Error(
      'پیش از شروع بازی جدید، اطلاعات بازی قبلی باید به سرور ارسال شود.',
    );
  const run = await post<RunState>(`/api/children/${childId}/runs`, {
    storyId,
  });
  runs[storyId] = run;
  lastActivity = performance.now();
  wasVisible = !document.hidden;
  return run;
}
export async function loadChildStates(id: string) {
  await flushAnalytics();
  if (pendingCount())
    throw new Error('ابتدا اتصال را برقرار کنید تا اطلاعات ثبت‌شده ارسال شود.');
  configureAnalytics(id, []);
  await flushAnalytics();
  if (pendingCount())
    throw new Error('اطلاعات ذخیره‌شدهٔ این کودک هنوز ارسال نشده است.');
  const states = await api<RunState[]>(`/api/children/${id}/state`);
  configureAnalytics(id, states);
  return states;
}
