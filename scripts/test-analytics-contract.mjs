import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const client = await readFile(resolve(root, 'src/utils/analytics.ts'), 'utf8');
const server = await readFile(resolve(root, 'server/index.ts'), 'utf8');
const migration = await readFile(resolve(root, 'server/migrations/001_analytics.sql'), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

for (const event of ['start', 'scene_enter', 'choice', 'interaction', 'complete', 'replay', 'heartbeat']) check(client.includes(`'${event}'`) && server.includes(`'${event}'`), `Event contract is missing ${event}`);
check(client.includes('globalThis.crypto?.randomUUID'), 'Native anonymous UUID generation is missing.');
check(client.includes('new Uint8Array(16)') && client.includes('Math.random()'), 'HTTP-compatible UUID fallback is missing.');
check(!client.includes('profile.name') && !client.includes('profile.age'), 'PII must not enter analytics payloads.');
check(migration.includes('event_id uuid PRIMARY KEY'), 'Database deduplication key is missing.');
check(server.includes("timeZone: 'Asia/Tehran'"), 'Tehran reporting timezone is missing.');
check(server.includes('30 * 60_000'), 'Thirty-minute activity/dropout threshold is missing.');
check(server.includes('httpOnly: true') && server.includes("sameSite: 'strict'"), 'Secure admin cookie flags are missing.');
check(server.includes('report.docx') && server.includes('bidirectional: true'), 'RTL Word report endpoint is missing.');
check(server.includes('choiceOptions') && server.includes('انتخاب ${index + 1}'), 'Dynamic choice columns are missing from the admin API or DOCX report.');
check(server.includes("'oak-final-question'") && !server.includes("'oak-rabbit-repair', 'اصلاح"), 'Oak admin stage metadata is not aligned with the revised story.');

if (failures.length) { console.error(failures.map((failure) => `✗ ${failure}`).join('\n')); process.exit(1); }
console.log('✓ Analytics contract passed: anonymous events, deduplication, Tehran filters, dropout, admin security and RTL DOCX.');
