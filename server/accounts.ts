import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Pool, PoolClient } from 'pg';
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import {
  GameEngine,
  ScoreSystem,
  SCORING_VERSION,
  stories,
} from './catalog.js';
import type { GameProgress } from '../src/types/story';
import type { GameAction } from '../src/types/account';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const passwordHash = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
const passwordMatches = (password: string, saved: string) => {
  const [salt, digest] = saved.split(':');
  const expected = Buffer.from(digest, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
export type Account = { role: 'parent' | 'admin'; parent_id: string | null };
export async function accountFor(
  pool: Pool,
  request: FastifyRequest,
): Promise<Account | null> {
  const cookie = request.cookies.account_session;
  if (!cookie) return null;
  const result = await pool.query<Account>(
    `SELECT s.role,s.parent_id FROM account_sessions s LEFT JOIN parent_accounts p ON p.id=s.parent_id LEFT JOIN admin_accounts a ON a.id=s.admin_id WHERE token_hash=$1 AND expires_at>now() AND ((s.role='admin' AND (s.admin_id IS NULL OR a.enabled=true)) OR (s.role='parent' AND p.enabled=true))`,
    [hash(cookie)],
  );
  return result.rows[0] ?? null;
}
const error = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });
async function requireAccount(
  pool: Pool,
  request: FastifyRequest,
  admin = false,
) {
  const account = await accountFor(pool, request);
  if (!account || (admin && account.role !== 'admin'))
    throw error('unauthorized', 401);
  return account;
}
async function ownChild(
  pool: Pool | PoolClient,
  childId: string,
  account: Account,
) {
  const result = await pool.query(
    `SELECT c.*,s.name AS school_name FROM child_profiles c JOIN schools s ON s.id=c.school_id WHERE c.id=$1 AND ($2::text='admin' OR c.parent_id=$3::uuid)`,
    [childId, account.role, account.parent_id],
  );
  if (!result.rows[0]) throw error('child_not_found', 404);
  return result.rows[0];
}
function childJson(c: Record<string, unknown>) {
  return {
    id: c.id,
    publicId: c.public_id,
    firstName: c.first_name,
    lastName: c.last_name,
    age: c.age,
    schoolId: c.school_id,
    schoolName: c.school_name,
    avatar: c.avatar,
  };
}
async function startSession(
  pool: Pool,
  reply: FastifyReply,
  role: 'parent' | 'admin',
  parentId: string | null,
  adminId: string | null = null,
) {
  const token = randomBytes(32).toString('hex');
  await pool.query(
    "INSERT INTO account_sessions(token_hash,parent_id,role,admin_id,expires_at) VALUES($1,$2,$3,$4,now()+interval '8 hours')",
    [hash(token), parentId, role, adminId],
  );
  const secure =
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.COOKIE_SECURE !== 'false' &&
      process.env.NODE_ENV === 'production');
  reply.setCookie('account_session', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure,
    maxAge: 8 * 60 * 60,
  });
}
const childSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  age: z.number().int().min(3).max(18),
  schoolId: z.string().uuid(),
  avatar: z.enum(['🦊', '🐰', '🐸', '🦄', '🐻']).default('🦊'),
});
const credentials = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.-]{4,40}$/),
  password: z.string().min(10).max(128),
});
const actionSchema = z.object({
  eventId: z.string().uuid(),
  runId: z.string().uuid(),
  sequence: z.number().int().positive(),
  occurredAt: z.string().datetime(),
  activeMs: z.number().int().min(0).max(60000),
  action: z.object({
    kind: z.enum([
      'choice',
      'discover',
      'tool',
      'craft',
      'reflection',
      'continue',
      'heartbeat',
      'pause',
      'resume',
      'preview',
      'narration_start',
      'narration_stop',
      'book_open',
      'book_close',
    ]),
    sceneId: z.string().min(1).max(100),
    itemId: z.string().max(100).optional(),
    promptId: z.string().max(100).optional(),
  }),
});

type Filter = {
  childId?: string;
  publicId?: string;
  age?: number;
  schoolId?: string;
  storyId?: string;
  range: string;
  from?: string;
  to?: string;
};
const filterSchema = z.object({
  childId: z.string().uuid().optional(),
  publicId: z.string().max(30).optional(),
  age: z.coerce.number().int().min(3).max(18).optional(),
  schoolId: z.string().uuid().optional(),
  storyId: z.string().optional(),
  range: z.enum(['today', '7d', '30d', 'all']).default('30d'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
function timeBounds(filter: Filter) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const from = filter.from
    ? new Date(`${filter.from}T00:00:00+03:30`)
    : filter.range === 'today'
      ? new Date(`${today}T00:00:00+03:30`)
      : filter.range === '7d' || filter.range === '30d'
        ? new Date(Date.now() - (filter.range === '7d' ? 7 : 30) * 86400000)
        : null;
  const to = filter.to
    ? new Date(new Date(`${filter.to}T00:00:00+03:30`).getTime() + 86400000)
    : null;
  if (
    (from && !Number.isFinite(from.getTime())) ||
    (to && !Number.isFinite(to.getTime())) ||
    (from && to && from >= to)
  )
    throw error('invalid_date_range');
  return [from, to];
}
export async function researchReport(
  pool: Pool,
  account: Account,
  filter: Filter,
  includeEvents = false,
) {
  const [from, to] = timeBounds(filter);
  const values = [
    account.role,
    account.parent_id,
    filter.childId ?? null,
    filter.publicId ?? null,
    filter.age ?? null,
    filter.schoolId ?? null,
    filter.storyId ?? null,
    from,
    to,
  ];
  const runQuery = `SELECT r.*,c.public_id,c.first_name,c.last_name FROM game_runs r JOIN child_profiles c ON c.id=r.child_id WHERE ($1::text='admin' OR c.parent_id=$2::uuid) AND ($3::uuid IS NULL OR c.id=$3) AND ($4::text IS NULL OR c.public_id=$4) AND ($5::int IS NULL OR r.age_at_play=$5) AND ($6::uuid IS NULL OR r.school_id_at_play=$6) AND ($7::text IS NULL OR r.story_id=$7) AND ($8::timestamptz IS NULL OR r.started_at >= $8) AND ($9::timestamptz IS NULL OR r.started_at < $9)`;
  const runsResult = await pool.query(
    `${runQuery} ORDER BY r.started_at`,
    values,
  );
  const runs = runsResult.rows.map((r) => ({
    id: r.id,
    childId: r.child_id,
    publicId: r.public_id,
    childName: `${r.first_name} ${r.last_name}`,
    storyId: r.story_id,
    age: r.age_at_play,
    schoolName: r.school_name_at_play,
    startedAt: r.started_at.toISOString(),
    completedAt: r.completed_at?.toISOString() ?? null,
    activeMinutes: Number((Number(r.active_ms) / 60000).toFixed(2)),
    percent: Number(r.percent),
    stars: r.stars,
    badge: r.badge,
    medal: r.medal,
    scoringVersion: r.scoring_version,
    progress: r.progress as GameProgress,
    lastSequence: r.last_sequence,
    maxScore:
      r.score_result?.maxScore ??
      ScoreSystem.result(r.progress, stories[r.story_id]).maxScore,
    skills:
      r.score_result?.skills ??
      ScoreSystem.result(r.progress, stories[r.story_id]).skills,
  }));
  const childResult = await pool.query(
    `SELECT c.*,s.name AS school_name FROM child_profiles c JOIN schools s ON s.id=c.school_id WHERE ($1::text='admin' OR c.parent_id=$2::uuid) AND ($3::uuid IS NULL OR c.id=$3) AND ($4::text IS NULL OR c.public_id=$4) ORDER BY c.created_at DESC`,
    values.slice(0, 4),
  );
  const children = childResult.rows
    .filter(
      (c) =>
        runs.some((r) => r.childId === c.id) ||
        ((!filter.age || c.age === filter.age) &&
          (!filter.schoolId || c.school_id === filter.schoolId)),
    )
    .map((c) => {
      const childRuns = runs.filter((r) => r.childId === c.id);
      const completed = childRuns.filter((r) => r.completedAt);
      return {
        ...childJson(c),
        runs: childRuns.length,
        completed: completed.length,
        averagePercent: completed.length
          ? Math.round(
              completed.reduce((sum, r) => sum + r.percent, 0) /
                completed.length,
            )
          : null,
      };
    });
  const cohorts = (key: 'age' | 'schoolName') =>
    [...new Set(runs.map((r) => String(r[key])))].map((name) => {
      const items = runs.filter((r) => String(r[key]) === name);
      const complete = items.filter((r) => r.completedAt);
      return {
        name,
        children: new Set(items.map((r) => r.childId)).size,
        runs: items.length,
        completed: complete.length,
        averagePercent: complete.length
          ? Math.round(
              complete.reduce((sum, r) => sum + r.percent, 0) / complete.length,
            )
          : null,
      };
    });
  let events: Record<string, unknown>[] = [];
  if (includeEvents && runs.length) {
    const result = await pool.query(
      `SELECT e.*,c.public_id,c.first_name,c.last_name,r.story_id,r.age_at_play,r.school_name_at_play FROM child_game_events e JOIN game_runs r ON r.id=e.run_id JOIN child_profiles c ON c.id=r.child_id WHERE r.id=ANY($1::uuid[]) ORDER BY e.occurred_at,e.received_at`,
      [runs.map((r) => r.id)],
    );
    events = result.rows.map((e) => ({
      eventId: e.event_id,
      runId: e.run_id,
      publicId: e.public_id,
      childName: `${e.first_name} ${e.last_name}`,
      storyId: e.story_id,
      age: e.age_at_play,
      schoolName: e.school_name_at_play,
      type: e.event_type,
      sceneId: e.scene_id,
      stageTitle:
        stories[e.story_id]?.scenes.find((s) => s.id === e.scene_id)
          ?.phaseTitle ?? e.scene_id,
      itemId: e.choice_id,
      scoreDelta: e.score_delta,
      details: e.details,
      occurredAt: e.occurred_at.toISOString(),
      receivedAt: e.received_at.toISOString(),
    }));
  }
  return {
    generatedAt: new Date().toISOString(),
    filter,
    children,
    runs,
    events,
    ages: cohorts('age'),
    schools: cohorts('schoolName'),
    scoring: Object.values(stories).map((story) => ({
      storyId: story.id,
      title: story.title,
      ...ScoreSystem.capacity(story),
      version: SCORING_VERSION,
    })),
  };
}

async function workbook(data: Awaited<ReturnType<typeof researchReport>>) {
  const book = new ExcelJS.Workbook();
  book.creator = 'متفکر';
  book.created = new Date();
  const sheet = (
    name: string,
    headings: string[],
    rows: (string | number | null)[][],
  ) => {
    const s = book.addWorksheet(name, {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
    });
    s.addRow(headings);
    rows.forEach((r) => s.addRow(r));
    s.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    s.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF59428C' },
    };
    s.columns.forEach((c) => {
      c.width = 24;
    });
    s.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headings.length },
    };
    s.eachRow((r) => {
      r.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    });
  };
  sheet(
    'راهنما',
    ['موضوع', 'مقدار'],
    [
      ['زمان استخراج', data.generatedAt],
      ['فیلترها', JSON.stringify(data.filter)],
      ['قواعد ستاره', '۱: کمتر از ۵۰٪؛ ۲: از ۵۰٪؛ ۳: از ۸۰٪'],
      ['قواعد مدال', 'برنز: کمتر از ۶۵٪؛ نقره: از ۶۵٪؛ طلا: از ۸۵٪'],
      [
        'مقایسه',
        'سن و مدرسه هنگام بازی؛ میانگین فقط بازی‌های کامل؛ زمان فعال بر پایه فعالیت قابل مشاهده',
      ],
      ['نسخه امتیاز', SCORING_VERSION],
    ],
  );
  sheet(
    'کودکان',
    [
      'شناسه',
      'نام',
      'سن فعلی',
      'مدرسه فعلی',
      'نوبت بازی',
      'تکمیل',
      'میانگین درصد',
    ],
    data.children.map((c) => [
      String(c.publicId),
      `${c.firstName} ${c.lastName}`,
      Number(c.age),
      String(c.schoolName),
      c.runs,
      c.completed,
      c.averagePercent,
    ]),
  );
  sheet(
    'بازی‌ها',
    [
      'شناسه کودک',
      'نام',
      'سن هنگام بازی',
      'مدرسه هنگام بازی',
      'شناسه نوبت',
      'بازی',
      'شروع',
      'پایان',
      'زمان فعال دقیقه',
      'امتیاز',
      'امتیاز قابل کسب در مسیر',
      'درصد',
      'ستاره',
      'نشان',
      'مدال',
      'نسخه',
    ],
    data.runs.map((r) => [
      r.publicId,
      r.childName,
      r.age,
      r.schoolName,
      r.id,
      stories[r.storyId].title,
      r.startedAt,
      r.completedAt,
      r.activeMinutes,
      r.progress.score,
      r.maxScore,
      r.percent,
      r.stars,
      r.badge,
      r.medal,
      r.scoringVersion,
    ]),
  );
  sheet(
    'مهارت‌ها',
    ['شناسه کودک', 'شناسه نوبت', 'بازی', 'مهارت', 'امتیاز خام', 'درصد'],
    data.runs.flatMap((r) =>
      Object.entries(r.skills).map(([skill, percent]) => [
        r.publicId,
        r.id,
        stories[r.storyId].title,
        skill,
        r.progress.skillScores[skill as keyof typeof r.progress.skillScores],
        percent,
      ]),
    ),
  );
  sheet(
    'رویدادهای مراحل',
    [
      'شناسه کودک',
      'نام',
      'سن',
      'مدرسه',
      'شناسه نوبت',
      'بازی',
      'مرحله',
      'نوع',
      'انتخاب یا ابزار',
      'تغییر امتیاز',
      'جزئیات',
      'زمان رخداد',
      'زمان دریافت',
    ],
    data.events.map((e) => [
      String(e.publicId),
      String(e.childName),
      Number(e.age),
      String(e.schoolName),
      String(e.runId),
      String(e.storyId),
      String(e.sceneId),
      String(e.type),
      e.itemId ? String(e.itemId) : null,
      Number(e.scoreDelta),
      JSON.stringify(e.details),
      String(e.occurredAt),
      String(e.receivedAt),
    ]),
  );
  sheet(
    'گروه‌های سنی',
    ['سن', 'تعداد کودک', 'نوبت بازی', 'تکمیل', 'میانگین درصد'],
    data.ages.map((c) => [
      c.name,
      c.children,
      c.runs,
      c.completed,
      c.averagePercent,
    ]),
  );
  sheet(
    'مدارس',
    ['مدرسه', 'تعداد کودک', 'نوبت بازی', 'تکمیل', 'میانگین درصد'],
    data.schools.map((c) => [
      c.name,
      c.children,
      c.runs,
      c.completed,
      c.averagePercent,
    ]),
  );
  return book.xlsx.writeBuffer();
}

export async function registerAccounts(
  app: FastifyInstance,
  pool: Pool,
  adminHash: string,
) {
  app.addHook('onRequest', async (request, reply) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.headers.origin
    ) {
      try {
        if (new URL(request.headers.origin).host !== request.host)
          return reply.code(403).send({ error: 'invalid_origin' });
      } catch {
        return reply.code(403).send({ error: 'invalid_origin' });
      }
    }
  });
  app.setErrorHandler((err, _request, reply) => {
    if (err instanceof z.ZodError)
      return reply.code(400).send({ error: 'invalid_input' });
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) app.log.error(err);
    reply
      .code(status)
      .send({ error: status >= 500 ? 'server_error' : (err as Error).message });
  });
  app.get('/api/session', async (request) => {
    const account = await requireAccount(pool, request);
    if (account.role === 'admin') return { role: 'admin' };
    const r = await pool.query(
      'SELECT id,username,full_name FROM parent_accounts WHERE id=$1',
      [account.parent_id],
    );
    return {
      role: 'parent',
      parent: {
        id: r.rows[0].id,
        username: r.rows[0].username,
        fullName: r.rows[0].full_name,
      },
    };
  });
  app.post(
    '/api/auth/register',
    { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const input = credentials
        .extend({
          fullName: z.string().trim().min(2).max(100),
          inviteCode: z.string().trim().min(8).max(80),
        })
        .parse(request.body);
      const digest = passwordHash(input.password);
      const id = randomUUID();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const invite = await client.query(
          'UPDATE registration_invites SET remaining_uses=remaining_uses-1 WHERE code_hash=$1 AND remaining_uses>0 AND expires_at>now() RETURNING id',
          [hash(input.inviteCode)],
        );
        if (!invite.rowCount) throw error('invalid_invite');
        const existing = await client.query(
          'SELECT id FROM parent_accounts WHERE username=$1',
          [input.username],
        );
        if (existing.rowCount) throw error('username_taken', 409);
        await client.query(
          'INSERT INTO parent_accounts(id,username,full_name,password_hash) VALUES($1,$2,$3,$4)',
          [id, input.username, input.fullName, digest],
        );
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      await startSession(pool, reply, 'parent', id);
      return { ok: true };
    },
  );
  app.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const input = credentials.parse(request.body);
      const r = await pool.query(
        'SELECT id,password_hash FROM parent_accounts WHERE username=$1 AND enabled=true',
        [input.username],
      );
      const valid = passwordMatches(
        input.password,
        r.rows[0]?.password_hash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`,
      );
      if (!r.rows[0] || !valid) throw error('unauthorized', 401);
      await startSession(pool, reply, 'parent', r.rows[0].id);
      return { ok: true };
    },
  );
  app.post(
    '/api/admin/login',
    { config: { rateLimit: { max: 5, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const input = z
        .object({ password: z.string().min(1).max(200) })
        .parse(request.body);
      const expected = Buffer.from(adminHash, 'hex');
      const actual = Buffer.from(hash(input.password), 'hex');
      const legacyValid = expected.length === actual.length && timingSafeEqual(expected, actual);
      let adminId: string | null = null;
      if (!legacyValid) {
        const accounts = await pool.query<{ id: string; password_hash: string }>(
          'SELECT id,password_hash FROM admin_accounts WHERE enabled=true',
        );
        const account = accounts.rows.find((a) => passwordMatches(input.password, a.password_hash));
        if (!account) throw error('unauthorized', 401);
        adminId = account.id;
      }
      await startSession(pool, reply, 'admin', null, adminId);
      return { ok: true };
    },
  );
  app.post('/api/auth/logout', async (request, reply) => {
    if (request.cookies.account_session)
      await pool.query('DELETE FROM account_sessions WHERE token_hash=$1', [
        hash(request.cookies.account_session),
      ]);
    reply.clearCookie('account_session', { path: '/' });
    return { ok: true };
  });
  app.patch('/api/parent/profile', async (request) => {
    const a = await requireAccount(pool, request);
    if (a.role !== 'parent') throw error('forbidden', 403);
    const input = z
      .object({ fullName: z.string().trim().min(2).max(100) })
      .parse(request.body);
    await pool.query('UPDATE parent_accounts SET full_name=$1 WHERE id=$2', [
      input.fullName,
      a.parent_id,
    ]);
    return { ok: true };
  });
  app.post('/api/auth/password', async (request) => {
    const a = await requireAccount(pool, request);
    if (a.role !== 'parent') throw error('forbidden', 403);
    const input = z
      .object({
        currentPassword: z.string().max(128),
        password: z.string().min(10).max(128),
      })
      .parse(request.body);
    const r = await pool.query(
      'SELECT password_hash FROM parent_accounts WHERE id=$1',
      [a.parent_id],
    );
    if (!passwordMatches(input.currentPassword, r.rows[0].password_hash))
      throw error('unauthorized', 401);
    await pool.query(
      'UPDATE parent_accounts SET password_hash=$1 WHERE id=$2',
      [passwordHash(input.password), a.parent_id],
    );
    await pool.query(
      'DELETE FROM account_sessions WHERE parent_id=$1 AND token_hash<>$2',
      [a.parent_id, hash(request.cookies.account_session!)],
    );
    return { ok: true };
  });
  app.get('/api/schools', async (request) => {
    await requireAccount(pool, request);
    return (
      await pool.query(
        'SELECT id,name FROM schools WHERE enabled=true ORDER BY name',
      )
    ).rows;
  });
  app.post('/api/admin/schools', async (request) => {
    await requireAccount(pool, request, true);
    const { name } = z
      .object({ name: z.string().trim().min(2).max(120) })
      .parse(request.body);
    const r = await pool.query(
      'INSERT INTO schools(id,name) VALUES($1,$2) ON CONFLICT(name) DO UPDATE SET enabled=true RETURNING id,name',
      [randomUUID(), name.replace(/\s+/g, ' ')],
    );
    return r.rows[0];
  });
  app.get('/api/children', async (request) => {
    const a = await requireAccount(pool, request);
    const r = await pool.query(
      'SELECT c.*,s.name AS school_name FROM child_profiles c JOIN schools s ON s.id=c.school_id WHERE parent_id=$1 ORDER BY c.created_at',
      [a.parent_id],
    );
    return r.rows.map(childJson);
  });
  app.post('/api/children', async (request) => {
    const a = await requireAccount(pool, request);
    if (a.role !== 'parent') throw error('forbidden', 403);
    const input = childSchema.parse(request.body);
    const school = await pool.query(
      'SELECT id FROM schools WHERE id=$1 AND enabled=true',
      [input.schoolId],
    );
    if (!school.rowCount) throw error('invalid_school');
    const r = await pool.query(
      'INSERT INTO child_profiles(id,public_id,parent_id,first_name,last_name,age,school_id,avatar) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [
        randomUUID(),
        `K-${randomBytes(5).toString('hex').toUpperCase()}`,
        a.parent_id,
        input.firstName,
        input.lastName,
        input.age,
        input.schoolId,
        input.avatar,
      ],
    );
    return childJson({
      ...r.rows[0],
      school_name: (
        await pool.query('SELECT name FROM schools WHERE id=$1', [
          input.schoolId,
        ])
      ).rows[0].name,
    });
  });
  app.patch('/api/children/:id', async (request) => {
    const a = await requireAccount(pool, request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await ownChild(pool, id, a);
    const input = childSchema.parse(request.body);
    if (
      !(
        await pool.query(
          'SELECT id FROM schools WHERE id=$1 AND enabled=true',
          [input.schoolId],
        )
      ).rowCount
    )
      throw error('invalid_school');
    await pool.query(
      'UPDATE child_profiles SET first_name=$1,last_name=$2,age=$3,school_id=$4,avatar=$5 WHERE id=$6',
      [
        input.firstName,
        input.lastName,
        input.age,
        input.schoolId,
        input.avatar,
        id,
      ],
    );
    return { ok: true };
  });
  app.get('/api/children/:id/state', async (request) => {
    const a = await requireAccount(pool, request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await ownChild(pool, id, a);
    const r = await pool.query(
      'SELECT DISTINCT ON(story_id) id,story_id,progress,last_sequence FROM game_runs WHERE child_id=$1 ORDER BY story_id,started_at DESC',
      [id],
    );
    return r.rows.map((x) => ({
      id: x.id,
      storyId: x.story_id,
      progress: x.progress,
      lastSequence: x.last_sequence,
    }));
  });
  app.post('/api/children/:id/runs', async (request) => {
    const a = await requireAccount(pool, request);
    if (a.role !== 'parent') throw error('forbidden', 403);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = z
      .object({ storyId: z.string(), replay: z.boolean().default(false) })
      .parse(request.body);
    const story = stories[input.storyId];
    if (!story) throw error('invalid_story');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const child = await ownChild(client, id, a);
      await client.query(
        'SELECT id FROM child_profiles WHERE id=$1 FOR UPDATE',
        [id],
      );
      const existing = await client.query(
        'SELECT * FROM game_runs WHERE child_id=$1 AND story_id=$2 AND completed_at IS NULL FOR UPDATE',
        [id, story.id],
      );
      if (existing.rows[0]) {
        await client.query('COMMIT');
        const x = existing.rows[0];
        return {
          id: x.id,
          storyId: story.id,
          progress: x.progress,
          lastSequence: x.last_sequence,
        };
      }
      const runId = randomUUID();
      const progress = new GameEngine(story).snapshot().progress;
      const prior = await client.query(
        'SELECT id FROM game_runs WHERE child_id=$1 AND story_id=$2 LIMIT 1',
        [id, story.id],
      );
      await client.query(
        'INSERT INTO game_runs(id,child_id,story_id,age_at_play,school_id_at_play,school_name_at_play,scoring_version,progress) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          runId,
          id,
          story.id,
          child.age,
          child.school_id,
          child.school_name,
          SCORING_VERSION,
          JSON.stringify(progress),
        ],
      );
      for (const type of [
        ...(prior.rowCount ? ['replay'] : []),
        'start',
        'scene_enter',
      ])
        await client.query(
          'INSERT INTO child_game_events(event_id,run_id,event_type,scene_id,occurred_at) VALUES($1,$2,$3,$4,now())',
          [randomUUID(), runId, type, story.startScene],
        );
      await client.query('COMMIT');
      return { id: runId, storyId: story.id, progress, lastSequence: 0 };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });
  app.post(
    '/api/play/events',
    {
      config: {
        rateLimit: {
          max: 240,
          timeWindow: '1 minute',
          keyGenerator: (request: FastifyRequest) =>
            request.cookies.account_session
              ? hash(request.cookies.account_session)
              : request.ip,
        },
      },
    },
    async (request) => {
      const a = await requireAccount(pool, request);
      if (a.role !== 'parent') throw error('forbidden', 403);
      const input = z
        .object({ events: z.array(actionSchema).min(1).max(100) })
        .parse(request.body);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const states: Record<string, unknown> = {};
        for (const event of input.events) {
          const r = await client.query(
            'SELECT r.* FROM game_runs r JOIN child_profiles c ON c.id=r.child_id WHERE r.id=$1 AND c.parent_id=$2 FOR UPDATE OF r',
            [event.runId, a.parent_id],
          );
          const run = r.rows[0];
          if (!run) throw error('run_not_found', 404);
          if (
            (
              await client.query(
                'SELECT event_id FROM child_game_events WHERE event_id=$1',
                [event.eventId],
              )
            ).rowCount
          )
            continue;
          if (event.sequence !== run.last_sequence + 1)
            throw error('out_of_order', 409);
          const stamp = new Date(event.occurredAt);
          if (
            stamp.getTime() > Date.now() + 300000 ||
            stamp.getTime() < run.started_at.getTime() - 300000
          )
            throw error('invalid_event_time');
          const story = stories[run.story_id];
          const before = run.progress as GameProgress;
          const engine = new GameEngine(story, before);
          try {
            engine.applyAction(event.action as GameAction);
          } catch {
            throw error('invalid_action', 409);
          }
          const after = engine.snapshot().progress;
          const outcome = ScoreSystem.result(after, story);
          const scene = story.scenes.find(
            (s) => s.id === event.action.sceneId,
          )!;
          const choice = scene.choices?.find(
            (x) => x.id === event.action.itemId,
          );
          const tool = scene.dragItems?.find(
            (x) => x.id === event.action.itemId,
          );
          const reflection = scene.reflectionPrompts
            ?.find((p) => p.id === event.action.promptId)
            ?.options.find((x) => x.id === event.action.itemId);
          const label =
            choice?.text ??
            tool?.label ??
            reflection?.text ??
            scene.hotspots?.find((x) => x.id === event.action.itemId)?.label ??
            scene.craftItems?.find((x) => x.id === event.action.itemId)?.label;
          const activeMs = Math.min(
            event.activeMs,
            Math.max(0, stamp.getTime() - run.last_occurred_at.getTime()),
          );
          const details = {
            kind: event.action.kind,
            promptId: event.action.promptId,
            label,
            correct: tool
              ? tool.correct
              : choice
                ? choice.retry
                  ? false
                  : choice.score > 0
                    ? true
                    : null
                : null,
            skill: choice?.skill ?? tool?.reward.skill ?? reflection?.skill,
            sequence: event.sequence,
            activeMs,
          };
          const type =
            event.action.kind === 'choice'
              ? 'choice'
              : event.action.kind === 'reflection'
                ? 'reflection'
                : ['discover', 'tool', 'craft'].includes(event.action.kind)
                  ? 'interaction'
                  : event.action.kind;
          await client.query(
            'INSERT INTO child_game_events(event_id,run_id,event_type,scene_id,choice_id,details,score_delta,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
            [
              event.eventId,
              run.id,
              type,
              scene.id,
              event.action.itemId ?? null,
              JSON.stringify(details),
              after.score - before.score,
              stamp,
            ],
          );
          if (after.currentSceneId !== before.currentSceneId)
            await client.query(
              'INSERT INTO child_game_events(event_id,run_id,event_type,scene_id,occurred_at) VALUES($1,$2,$3,$4,$5)',
              [
                randomUUID(),
                run.id,
                after.completed ? 'complete' : 'scene_enter',
                after.currentSceneId,
                stamp,
              ],
            );
          await client.query(
            'UPDATE game_runs SET progress=$1,last_sequence=$2,last_event_at=now(),last_occurred_at=GREATEST(last_occurred_at,$4),completed_at=CASE WHEN $3 THEN COALESCE(completed_at,$4) ELSE completed_at END,active_ms=active_ms+$5,percent=$6,stars=$7,badge=$8,medal=$9,score_result=$11 WHERE id=$10',
            [
              JSON.stringify(after),
              event.sequence,
              after.completed,
              stamp,
              activeMs,
              outcome.percent,
              outcome.stars,
              outcome.badge,
              outcome.medal,
              run.id,
              JSON.stringify(outcome),
            ],
          );
          states[run.id] = { progress: after, lastSequence: event.sequence };
        }
        await client.query('COMMIT');
        return { accepted: input.events.map((e) => e.eventId), states };
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
  );
  app.get('/api/parent/report', async (request) => {
    const a = await requireAccount(pool, request);
    if (a.role !== 'parent') throw error('forbidden', 403);
    return researchReport(pool, a, filterSchema.parse(request.query), true);
  });
  app.get('/api/admin/research', async (request) => {
    const a = await requireAccount(pool, request, true);
    const q = filterSchema.parse(request.query);
    return researchReport(pool, a, q, Boolean(q.childId || q.publicId));
  });
  app.get('/api/admin/report.xlsx', async (request, reply) => {
    const a = await requireAccount(pool, request, true);
    const data = await researchReport(
      pool,
      a,
      filterSchema.parse(request.query),
      true,
    );
    const buffer = await workbook(data);
    return reply
      .header(
        'content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .header(
        'content-disposition',
        'attachment; filename="motefaker-performance.xlsx"',
      )
      .send(Buffer.from(buffer));
  });
  app.get('/api/admin/invites', async (request) => {
    await requireAccount(pool, request, true);
    return (
      await pool.query(
        'SELECT id,label,remaining_uses AS "remainingUses",expires_at AS "expiresAt" FROM registration_invites ORDER BY created_at DESC',
      )
    ).rows;
  });
  app.post('/api/admin/invites', async (request) => {
    await requireAccount(pool, request, true);
    const input = z
      .object({
        label: z.string().trim().min(2).max(100),
        uses: z.number().int().min(1).max(1000).default(1),
        days: z.number().int().min(1).max(90).default(30),
      })
      .parse(request.body);
    const code = randomBytes(16).toString('hex');
    await pool.query(
      "INSERT INTO registration_invites(id,code_hash,label,remaining_uses,expires_at) VALUES($1,$2,$3,$4,now()+$5::int*interval '1 day')",
      [randomUUID(), hash(code), input.label, input.uses, input.days],
    );
    return { code };
  });
  app.delete('/api/admin/invites/:id', async (request) => {
    await requireAccount(pool, request, true);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await pool.query(
      'UPDATE registration_invites SET remaining_uses=0 WHERE id=$1',
      [id],
    );
    return { ok: true };
  });
  app.get('/api/admin/parents', async (request) => {
    await requireAccount(pool, request, true);
    return (
      await pool.query(
        'SELECT id,username,full_name AS "fullName",enabled FROM parent_accounts ORDER BY created_at DESC',
      )
    ).rows;
  });
  app.post('/api/admin/parents/:id/reset-password', async (request) => {
    await requireAccount(pool, request, true);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const password = randomBytes(12).toString('base64url');
    const r = await pool.query(
      'UPDATE parent_accounts SET password_hash=$1 WHERE id=$2 RETURNING id',
      [passwordHash(password), id],
    );
    if (!r.rowCount) throw error('parent_not_found', 404);
    await pool.query('DELETE FROM account_sessions WHERE parent_id=$1', [id]);
    return { password };
  });
  app.patch('/api/admin/parents/:id', async (request) => {
    await requireAccount(pool, request, true);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { enabled } = z.object({ enabled: z.boolean() }).parse(request.body);
    await pool.query('UPDATE parent_accounts SET enabled=$1 WHERE id=$2', [
      enabled,
      id,
    ]);
    if (!enabled)
      await pool.query('DELETE FROM account_sessions WHERE parent_id=$1', [id]);
    return { ok: true };
  });
}
