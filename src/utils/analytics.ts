export type AnalyticsEventType = 'start' | 'scene_enter' | 'choice' | 'interaction' | 'complete' | 'replay' | 'heartbeat';

const DEVICE_KEY = 'motefaker:analytics:device:v1';
const RUN_KEY = 'motefaker:analytics:run:v1';
const QUEUE_KEY = 'motefaker:analytics:queue:v1';

type EventPayload = {
  eventId: string;
  deviceId: string;
  runId: string;
  storyId: string;
  type: AnalyticsEventType;
  sceneId?: string;
  choiceId?: string;
  occurredAt: string;
};

const uuid = () => crypto.randomUUID();
const getOrCreate = (key: string) => {
  const saved = localStorage.getItem(key);
  if (saved) return saved;
  const value = uuid();
  localStorage.setItem(key, value);
  return value;
};

function queue(): EventPayload[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as EventPayload[]; }
  catch { return []; }
}

export function newAnalyticsRun(): string {
  const runId = uuid();
  try { sessionStorage.setItem(RUN_KEY, runId); } catch { /* Analytics must never block the game. */ }
  return runId;
}

export async function flushAnalytics(): Promise<void> {
  const events = queue();
  if (!events.length) return;
  try {
    const response = await fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events }), keepalive: true });
    if (response.ok) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue().filter((item) => !events.some((sent) => sent.eventId === item.eventId))));
  } catch { /* Offline play remains fully available. */ }
}

export function trackAnalytics(storyId: string, type: AnalyticsEventType, sceneId?: string, choiceId?: string): void {
  try {
    const runId = sessionStorage.getItem(RUN_KEY) ?? newAnalyticsRun();
    const event: EventPayload = { eventId: uuid(), deviceId: getOrCreate(DEVICE_KEY), runId, storyId, type, sceneId, choiceId, occurredAt: new Date().toISOString() };
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...queue(), event].slice(-500)));
    void flushAnalytics();
  } catch { /* Storage/network/privacy settings must never interrupt play. */ }
}
