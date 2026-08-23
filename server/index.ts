import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { Pool } from 'pg';
import { z } from 'zod';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';

const app = Fastify({ logger: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/motefaker' });
const cookieSecret = process.env.COOKIE_SECRET ?? 'development-only-change-this-secret';
const adminPasswordHash = process.env.ADMIN_PASSWORD_SHA256 ?? createHash('sha256').update('change-me').digest('hex');

await app.register(cookie, { secret: cookieSecret });
await app.register(rateLimit, { global: false });

const eventSchema = z.object({
  eventId: z.string().uuid(), deviceId: z.string().uuid(), runId: z.string().uuid(), storyId: z.string().min(1).max(80),
  type: z.enum(['start', 'scene_enter', 'choice', 'interaction', 'complete', 'replay', 'heartbeat']),
  sceneId: z.string().max(100).optional(), choiceId: z.string().max(100).optional(), occurredAt: z.string().datetime(),
});
const bodySchema = z.object({ events: z.array(eventSchema).min(1).max(100) });
const titles: Record<string, string> = { 'grandmas-birthday-gift': 'هدیه تولد مادربزرگ', 'oak-rescue': 'راه نجات بلوط‌ها' };
const stageMetadata: Record<string, Record<string, { title: string; order: number }>> = {
  'grandmas-birthday-gift': Object.fromEntries([
    ['birthday-intro', 'آغاز داستان'], ['identify-problem', 'کشف مسئله'], ['feelings', 'احساس و واکنش'], ['garden-clues', 'پیدا کردن سرنخ‌ها'],
    ['compare-options', 'مقایسه هدیه‌ها'], ['analysis-reason', 'دلیل انتخاب'], ['choose-tools', 'انتخاب ابزار'], ['final-decision', 'تصمیم دوباره'],
    ['flower-consequence', 'پیامد چیدن گل'], ['flower-repair', 'اصلاح تصمیم'], ['craft-necklace', 'ساخت گردنبند'], ['gift-grandma', 'هدیه به مادربزرگ'],
    ['counterfactual', 'بازاندیشی'], ['two-stars-wish', 'دو ستاره و یک آرزو'], ['celebration', 'جشن موفقیت'],
  ].map(([id, title], index) => [id, { title, order: index + 1 }])),
  'oak-rescue': Object.fromEntries([
    ['oak-intro', 'آغاز داستان'], ['oak-problem', 'کشف مشکل'], ['oak-feeling', 'واکنش و احساس'], ['oak-clues', 'پیدا کردن سرنخ‌ها'],
    ['oak-compare', 'انتخاب راه اول'], ['oak-rabbit-result', 'پیامد پرش خرگوش'], ['oak-rabbit-repair', 'اصلاح تصمیم پس از پرش'],
    ['oak-bridge-result', 'پیامد ساخت پل'], ['oak-bridge-repair', 'اصلاح تصمیم پس از پل'], ['oak-net-result', 'نتیجه انتخاب تور'],
    ['oak-tools', 'انتخاب ابزار تور'], ['oak-weave', 'بافتن تور'], ['oak-success', 'نجات بلوط‌ها'], ['oak-final-compare', 'مقایسه نهایی راه‌ها'],
    ['oak-reflection', 'بازاندیشی'], ['oak-result', 'جشن موفقیت'],
  ].map(([id, title], index) => [id, { title, order: index + 1 }])),
};

function isAdmin(request: { cookies: Record<string, string | undefined>; unsignCookie: (value: string) => { valid: boolean; value: string | null } }) {
  const value = request.cookies.admin_session;
  return Boolean(value && request.unsignCookie(value).valid && request.unsignCookie(value).value === 'authorized');
}

function safePasswordMatch(value: string) {
  const expected = Buffer.from(adminPasswordHash, 'hex');
  const actual = createHash('sha256').update(value).digest();
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function since(range: string): Date | null {
  const now = new Date();
  if (range === 'today') {
    const tehran = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    return new Date(`${tehran}T00:00:00+03:30`);
  }
  if (range === '7d') return new Date(now.getTime() - 7 * 86_400_000);
  if (range === '30d') return new Date(now.getTime() - 30 * 86_400_000);
  return null;
}

type DbEvent = { device_id: string; run_id: string; story_id: string; event_type: string; scene_id: string | null; choice_id: string | null; occurred_at: Date };
async function report(range: string) {
  const start = since(range);
  const result = await pool.query<DbEvent>(`SELECT device_id, run_id, story_id, event_type, scene_id, choice_id, occurred_at FROM analytics_events ${start ? 'WHERE occurred_at >= $1' : ''} ORDER BY occurred_at`, start ? [start] : []);
  const byStory = new Map<string, DbEvent[]>();
  for (const event of result.rows) byStory.set(event.story_id, [...(byStory.get(event.story_id) ?? []), event]);
  const games = [...byStory.entries()].map(([storyId, events]) => {
    const runs = new Map<string, DbEvent[]>();
    for (const event of events) runs.set(event.run_id, [...(runs.get(event.run_id) ?? []), event]);
    const completedRuns = [...runs.values()].filter((items) => items.some((item) => item.event_type === 'complete'));
    const minutes = completedRuns.map((items) => {
      let active = 0;
      for (let index = 1; index < items.length; index += 1) active += Math.min(30 * 60_000, items[index].occurred_at.getTime() - items[index - 1].occurred_at.getTime());
      return active / 60_000;
    });
    const starts = events.filter((event) => event.event_type === 'start').length;
    return { storyId, title: titles[storyId] ?? storyId, starts, completed: completedRuns.length, replays: events.filter((event) => event.event_type === 'replay').length, averageMinutes: Number((minutes.reduce((a, b) => a + b, 0) / (minutes.length || 1)).toFixed(1)), completionRate: starts ? Math.round((completedRuns.length / starts) * 100) : 0 };
  });
  const stageMap = new Map<string, { storyId: string; sceneId: string; entries: number; choices: Record<string, number>; dropoffs: number }>();
  for (const event of result.rows) {
    if (!event.scene_id) continue;
    const key = `${event.story_id}:${event.scene_id}`;
    const row = stageMap.get(key) ?? { storyId: event.story_id, sceneId: event.scene_id, entries: 0, choices: {}, dropoffs: 0 };
    if (event.event_type === 'scene_enter') row.entries += 1;
    if (event.event_type === 'choice' && event.choice_id) row.choices[event.choice_id] = (row.choices[event.choice_id] ?? 0) + 1;
    stageMap.set(key, row);
  }
  const runs = new Map<string, DbEvent[]>();
  for (const event of result.rows) runs.set(event.run_id, [...(runs.get(event.run_id) ?? []), event]);
  for (const events of runs.values()) {
    if (events.some((event) => event.event_type === 'complete')) continue;
    const last = [...events].reverse().find((event) => event.event_type === 'scene_enter');
    if (last?.scene_id && Date.now() - events.at(-1)!.occurred_at.getTime() >= 30 * 60_000) {
      const row = stageMap.get(`${last.story_id}:${last.scene_id}`); if (row) row.dropoffs += 1;
    }
  }
  const stages = [...stageMap.values()].map((row) => {
    const metadata = stageMetadata[row.storyId]?.[row.sceneId];
    return { ...row, stageTitle: metadata?.title ?? row.sceneId, order: metadata?.order ?? Number.MAX_SAFE_INTEGER };
  }).sort((left, right) => left.storyId.localeCompare(right.storyId) || left.order - right.order || left.sceneId.localeCompare(right.sceneId));
  return { generatedAt: new Date().toISOString(), range, games, stages };
}

const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, children: [new TextRun({ text, bold })] })] });
async function reportDocx(data: Awaited<ReturnType<typeof report>>) {
  const gameHeaders = ['بازی', 'شروع', 'تکمیل', 'Replay', 'میانگین زمان', 'نرخ تکمیل'];
  const stageHeaders = ['مرحله', 'ورود', 'انتخاب‌ها', 'ریزش'];
  const gameRows = data.games.map((row) => [row.title, row.starts, row.completed, row.replays, `${row.averageMinutes} دقیقه`, `${row.completionRate}٪`].map((value) => cell(String(value))));
  const document = new Document({ sections: [{ properties: {}, children: [
    new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE, text: 'گزارش مدیریتی بازی‌های متفکر' }),
    new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, text: `بازه گزارش: ${data.range}` }),
    new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, heading: HeadingLevel.HEADING_1, text: 'خلاصه بازی‌ها' }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: gameHeaders.map((value) => cell(value, true)) }), ...gameRows.map((children) => new TableRow({ children }))] }),
    ...data.games.flatMap((game) => {
      const rows = data.stages.filter((row) => row.storyId === game.storyId).map((row, index) => {
        const choices = Object.entries(row.choices);
        const choiceSummary = choices.length ? choices.map(([key, value]) => `${key}: ${value}`).join('، ') : '—';
        return new TableRow({ children: [`${index + 1}. ${row.stageTitle}`, row.entries, choiceSummary, row.dropoffs].map((value) => cell(String(value))) });
      });
      return [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, heading: HeadingLevel.HEADING_1, text: `جزئیات ${game.title}` }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: stageHeaders.map((value) => cell(value, true)) }), ...rows] })];
    }),
  ] }] });
  return Packer.toBuffer(document);
}

app.get('/api/health', async () => ({ ok: true }));
app.post('/api/events', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (request, reply) => {
  const parsed = bodySchema.safeParse(request.body); if (!parsed.success) return reply.code(400).send({ error: 'invalid_events' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const event of parsed.data.events) await client.query('INSERT INTO analytics_events(event_id,device_id,run_id,story_id,event_type,scene_id,choice_id,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(event_id) DO NOTHING', [event.eventId, event.deviceId, event.runId, event.storyId, event.type, event.sceneId ?? null, event.choiceId ?? null, event.occurredAt]);
    await client.query('COMMIT'); return reply.code(202).send({ accepted: parsed.data.events.length });
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
});
app.post('/api/admin/login', { config: { rateLimit: { max: 5, timeWindow: '5 minutes' } } }, async (request, reply) => {
  const parsed = z.object({ password: z.string().min(1).max(200) }).safeParse(request.body);
  if (!parsed.success || !safePasswordMatch(parsed.data.password)) return reply.code(401).send({ error: 'unauthorized' });
  const secureCookie = process.env.COOKIE_SECURE === 'true' || (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production');
  reply.setCookie('admin_session', 'authorized', { path: '/', httpOnly: true, sameSite: 'strict', secure: secureCookie, signed: true, maxAge: 8 * 60 * 60 });
  return { ok: true };
});
app.get('/api/admin/report', async (request, reply) => {
  if (!isAdmin(request)) return reply.code(401).send({ error: 'unauthorized' });
  const range = z.enum(['today', '7d', '30d', 'all']).catch('7d').parse((request.query as { range?: string }).range); return report(range);
});
app.get('/api/admin/report.docx', async (request, reply) => {
  if (!isAdmin(request)) return reply.code(401).send({ error: 'unauthorized' });
  const range = z.enum(['today', '7d', '30d', 'all']).catch('7d').parse((request.query as { range?: string }).range);
  const buffer = await reportDocx(await report(range));
  return reply.header('content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').header('content-disposition', `attachment; filename="management-report-${range}.docx"`).send(buffer);
});

const migration = await readFile(resolve(process.cwd(), 'server/migrations/001_analytics.sql'), 'utf8');
await pool.query(migration);
await app.listen({ port: Number(process.env.PORT ?? 3001), host: process.env.HOST ?? '0.0.0.0' });
