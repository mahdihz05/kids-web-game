import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = process.argv[2] ?? 'http://127.0.0.1:9222';
const output = new URL('../tmp-screens/final/', import.meta.url);
await mkdir(output, { recursive: true });

const targets = await fetch(`${endpoint}/json`).then((response) => response.json());
const page = targets.find((target) => target.type === 'page');
if (!page) throw new Error('Chrome audit page was not found.');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function command(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const navigate = async (url) => {
  await command('Page.navigate', { url });
  await wait(1800);
};
const capture = async (name, width, height) => {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await wait(400);
  const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(new URL(`${name}.png`, output), Buffer.from(data, 'base64'));
};

await command('Page.enable');
await command('Runtime.enable');

await navigate('http://127.0.0.1:4173/');
await command('Runtime.evaluate', { expression: `localStorage.removeItem('motefaker:magical-library:intro-seen:v1')` });
await navigate('http://127.0.0.1:4173/');
await capture('intro-desktop', 1440, 1000);
await capture('intro-mobile', 390, 844);

await command('Runtime.evaluate', { expression: `localStorage.setItem('motefaker:magical-library:intro-seen:v1', 'true')` });
await navigate('http://127.0.0.1:4173/');
await capture('hub-desktop', 1440, 1100);
await capture('hub-mobile', 390, 844);

await navigate('http://127.0.0.1:4173/?play=1');
await capture('game-desktop', 1440, 1000);
await capture('game-mobile', 390, 844);

socket.close();
