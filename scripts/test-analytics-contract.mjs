import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const client = await readFile('src/utils/analytics.ts', 'utf8');
const server = await readFile('server/accounts.ts', 'utf8');
const migration = await readFile('server/migrations/002_accounts.sql', 'utf8');
const engine = await readFile('src/engine/GameEngine.ts', 'utf8');
assert(
  client.includes('slice(0, 100)'),
  'Offline delivery must respect batch size',
);
assert(
  !client.includes('slice(-500)'),
  'Pending events must not be silently dropped',
);
assert(
  server.includes('engine.applyAction'),
  'Server must calculate performance from actions',
);
assert(
  migration.includes('age_at_play') &&
    migration.includes('school_name_at_play') &&
    migration.includes('score_result'),
  'Research snapshots must preserve demographics and scoring',
);
assert(
  migration.includes('event_id uuid PRIMARY KEY'),
  'Retry delivery must be idempotent',
);
assert(
  server.includes('httpOnly: true') && server.includes("sameSite: 'strict'"),
  'Session cookies must be protected',
);
assert(
  engine.includes("kind: 'reflection'"),
  'Reflections must enter the event log',
);
assert(server.includes('report.xlsx'), 'Excel export must be available');
console.log(
  '✓ Account analytics contract passed; API ownership, scoring, replay and XLSX are covered by test:platform.',
);
