import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { stories, GameEngine, ScoreSystem } from '../server/catalog';
import { ChoiceSystem } from '../src/engine/ChoiceSystem';
import type { GameAction, Child, RunState } from '../src/types/account';

const base = process.env.PLATFORM_TEST_URL ?? 'http://127.0.0.1:3301';
assert(
  ['localhost', '127.0.0.1'].includes(new URL(base).hostname),
  'Tests require an isolated local server',
);
class Client {
  cookie = '';
  async request(path: string, body?: unknown, expected = 200, method?: string) {
    const response = await fetch(base + path, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      headers: { 'content-type': 'application/json', cookie: this.cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const value = await response.json();
    assert.equal(
      response.status,
      expected,
      `${path}: ${JSON.stringify(value)}`,
    );
    const cookie = response.headers.get('set-cookie');
    if (cookie) this.cookie = cookie.split(';')[0];
    return value;
  }
}
const admin = new Client();
const parent = new Client();
const other = new Client();
const guest = new Client();
await guest.request('/api/children', undefined, 401);
await guest.request('/api/admin/research', undefined, 401);
await guest.request('/api/play/events', { events: [] }, 401);
await admin.request('/api/admin/login', {
  password: process.env.PLATFORM_TEST_ADMIN_PASSWORD ?? 'change-me',
});
const suffix = Date.now().toString(36);
const school = await admin.request('/api/admin/schools', {
  name: `مدرسه آزمایشی ${suffix}`,
});
const school2 = await admin.request('/api/admin/schools', {
  name: `مدرسه دوم ${suffix}`,
});
const invite = await admin.request('/api/admin/invites', {
  label: `آزمون ${suffix}`,
  uses: 2,
  days: 1,
});
await parent.request('/api/auth/register', {
  username: `parent_${suffix}`,
  password: 'test-parent-password-123',
  fullName: 'والد آزمایشی',
  inviteCode: invite.code,
});
await other.request('/api/auth/register', {
  username: `other_${suffix}`,
  password: 'test-parent-password-123',
  fullName: 'والد دیگر',
  inviteCode: invite.code,
});
await guest.request(
  '/api/auth/register',
  {
    username: `third_${suffix}`,
    password: 'test-parent-password-123',
    fullName: 'والد سوم',
    inviteCode: invite.code,
  },
  400,
);
const child: Child = await parent.request('/api/children', {
  firstName: 'کودک',
  lastName: 'آزمایشی',
  age: 7,
  schoolId: school.id,
});
const sibling: Child = await parent.request('/api/children', {
  firstName: 'کودک دوم',
  lastName: 'آزمایشی',
  age: 8,
  schoolId: school.id,
});
await other.request(`/api/children/${child.id}/state`, undefined, 404);
await other.request(
  `/api/children/${child.id}/runs`,
  { storyId: Object.keys(stories)[0] },
  404,
);
await parent.request('/api/admin/research', undefined, 401);
assert.equal(
  (await other.request('/api/parent/report?range=all')).runs.length,
  0,
);
const chooseAction = (engine: GameEngine): GameAction => {
  const { scene, progress } = engine.snapshot();
  if (progress.pendingConsequence)
    return { kind: 'continue', sceneId: scene.id };
  if (scene.type === 'choice') {
    const choice = [...(scene.choices ?? [])]
      .filter((c) => !c.retry)
      .sort((a, b) => b.score - a.score)[0];
    assert(choice);
    return { kind: 'choice', sceneId: scene.id, itemId: choice.id };
  }
  if (scene.type === 'hotspot') {
    const item = scene.hotspots?.find(
      (x) => !progress.discoveries[scene.id]?.includes(x.id),
    );
    if (item) return { kind: 'discover', sceneId: scene.id, itemId: item.id };
  }
  if (scene.type === 'dragDrop') {
    const item = scene.dragItems?.find(
      (x) => x.correct && !progress.selectedTools[scene.id]?.includes(x.id),
    );
    if (item) return { kind: 'tool', sceneId: scene.id, itemId: item.id };
  }
  if (scene.type === 'craft') {
    const item = scene.craftItems?.find(
      (x) => !progress.craftProgress[scene.id]?.includes(x.id),
    );
    if (item) return { kind: 'craft', sceneId: scene.id, itemId: item.id };
  }
  if (scene.type === 'reflection') {
    const prompt = scene.reflectionPrompts?.find(
      (x) => !progress.reflections[x.id],
    );
    if (prompt) {
      const option = [...prompt.options].sort((a, b) => b.score - a.score)[0];
      return {
        kind: 'reflection',
        sceneId: scene.id,
        itemId: option.id,
        promptId: prompt.id,
      };
    }
  }
  return { kind: 'continue', sceneId: scene.id };
};
for (const story of Object.values(stories)) {
  const run: RunState = await parent.request(`/api/children/${child.id}/runs`, {
    storyId: story.id,
  });
  assert.equal(
    (
      await parent.request(`/api/children/${child.id}/runs`, {
        storyId: story.id,
      })
    ).id,
    run.id,
    'Resume must reuse the run',
  );
  const engine = new GameEngine(story, run.progress);
  let sequence = run.lastSequence;
  let steps = 0;
  const invalid = {
    eventId: randomUUID(),
    runId: run.id,
    sequence: sequence + 1,
    occurredAt: new Date().toISOString(),
    activeMs: 60000,
    action: {
      kind: 'choice',
      sceneId: story.startScene,
      itemId: 'made-up-answer',
    },
    score: 999999,
  };
  await parent.request('/api/play/events', { events: [invalid] }, 409);
  while (!engine.snapshot().progress.completed) {
    assert(++steps < 150, `${story.id} must reach the result`);
    const action = chooseAction(engine);
    const event = {
      eventId: randomUUID(),
      runId: run.id,
      sequence: ++sequence,
      occurredAt: new Date().toISOString(),
      activeMs: 60000,
      action,
      score: 999999,
    };
    engine.applyAction(action);
    const result = await parent.request('/api/play/events', {
      events: [event],
    });
    assert.deepEqual(
      { ...result.states[run.id].progress, updatedAt: '' },
      JSON.parse(
        JSON.stringify({ ...engine.snapshot().progress, updatedAt: '' }),
      ),
    );
    if (steps === 1) {
      await parent.request('/api/play/events', { events: [event] });
      await other.request('/api/play/events', { events: [event] }, 404);
    }
  }
  const report = await parent.request(
    `/api/parent/report?childId=${child.id}&range=all`,
  );
  const saved = report.runs.find((r: RunState) => r.id === run.id);
  assert(saved.completedAt);
  assert.equal(saved.progress.score, engine.snapshot().progress.score);
  assert(saved.percent <= 100);
  assert(saved.stars >= 1 && saved.stars <= 3);
  assert.equal(saved.badge, story.badgeTitle ?? 'فکرکننده‌ی خوب');
  assert(saved.medal);
  assert.equal(saved.percent, 100, 'Best direct route must reach its full available score');
  assert.equal(saved.medal, 'طلا');
  assert(
    saved.activeMinutes < 1,
    'Inflated client active time must be bounded by elapsed time',
  );
  assert(
    report.events.some(
      (e: { type: string; runId: string }) =>
        e.runId === run.id && e.type === 'reflection',
    ),
  );
  const scene = story.scenes.find((s) => s.choices?.some((c) => c.score > 0))!;
  const choice = scene.choices!.find((c) => c.score > 0)!;
  const initial = new GameEngine(story).snapshot().progress;
  const first = ChoiceSystem.apply(initial, scene, choice);
  const repeated = ChoiceSystem.apply(first, scene, choice);
  assert.equal(
    repeated.score,
    first.score,
    'Repeated choice must not inflate score',
  );
  console.log(
    `PASS ${story.id}: server-authoritative completion, ${saved.progress.score}/${saved.maxScore}, ${saved.stars} stars`,
  );
}
const firstStory = Object.keys(stories)[0];
const replay = await parent.request(`/api/children/${child.id}/runs`, {
  storyId: firstStory,
});
assert.equal(replay.lastSequence, 0);
assert.equal(replay.progress.score, 0);
const heartbeatEvents = Array.from({ length: 105 }, (_, i) => ({
  eventId: randomUUID(),
  runId: replay.id,
  sequence: i + 1,
  occurredAt: new Date().toISOString(),
  activeMs: 0,
  action: { kind: 'heartbeat', sceneId: replay.progress.currentSceneId },
}));
await parent.request('/api/play/events', { events: heartbeatEvents }, 400);
await parent.request('/api/play/events', {
  events: heartbeatEvents.slice(0, 100),
});
await parent.request('/api/play/events', {
  events: heartbeatEvents.slice(100),
});
await parent.request(
  `/api/children/${child.id}`,
  {
    firstName: child.firstName,
    lastName: child.lastName,
    age: 9,
    schoolId: school2.id,
  },
  200,
  'PATCH',
);
const historical = await admin.request(
  `/api/admin/research?childId=${child.id}&age=7&schoolId=${school.id}&range=all`,
);
assert.equal(historical.runs.length, 5);
assert(
  historical.runs.every(
    (r: { age: number; schoolName: string }) =>
      r.age === 7 && r.schoolName === school.name,
  ),
);
assert.equal(
  (await parent.request(`/api/parent/report?childId=${sibling.id}&range=all`))
    .runs.length,
  0,
);
const exported = await fetch(
  base +
    `/api/admin/report.xlsx?childId=${child.id}&age=7&schoolId=${school.id}&range=all`,
  { headers: { cookie: admin.cookie } },
);
assert.equal(exported.status, 200);
const bytes = Buffer.from(await exported.arrayBuffer());
const book = new ExcelJS.Workbook();
await book.xlsx.load(bytes as never);
assert.equal(book.worksheets.length, 7);
assert.equal(
  book.getWorksheet('بازی‌ها')!.rowCount,
  historical.runs.length + 1,
);
assert(book.getWorksheet('رویدادهای مراحل')!.rowCount > 100);
await mkdir('tmp/platform-tests', { recursive: true });
await writeFile('tmp/platform-tests/report.xlsx', bytes);
await parent.request('/api/auth/password', {
  currentPassword: 'test-parent-password-123',
  password: 'changed-test-parent-password',
});
await parent.request('/api/auth/logout', {});
await parent.request('/api/session', undefined, 401);
await parent.request('/api/auth/login', {
  username: `parent_${suffix}`,
  password: 'changed-test-parent-password',
});
await admin.request(
  `/api/admin/parents/${(await parent.request('/api/session')).parent.id}`,
  { enabled: false },
  200,
  'PATCH',
);
await parent.request('/api/session', undefined, 401);
console.log(
  'PASS platform: invite exhaustion, ownership, isolation, age/school snapshots, replay, batches, XLSX rows, password and session revocation',
);
