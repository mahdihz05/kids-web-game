import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const load = async (name) => JSON.parse(await readFile(new URL(`../src/data/${name}`, import.meta.url), 'utf8'))
const scene = (story, id) => {
  const value = story.scenes.find((item) => item.id === id)
  assert.ok(value, `${story.id}: missing scene ${id}`)
  return value
}
const choice = (value, id) => {
  const item = value.choices?.find((candidate) => candidate.id === id)
  assert.ok(item, `${value.id}: missing choice ${id}`)
  return item
}
const reflectionShape = (value) => value.reflectionPrompts.map((prompt) => prompt.options.length).join('/')

const oak = await load('oak-rescue.json')
const egg = await load('missing-egg.json')
const fox = await load('wet-fox-house.json')

// بازی دوم — فایل «راه نجات بلوط‌ها» و فهرست اصلاحات کارفرما
assert.equal(oak.scenes.length, 15)
assert.equal(scene(oak, 'oak-intro').prompt, 'روی کتاب بالای صفحه بزن و داستان را بخوان.')
assert.match(scene(oak, 'oak-intro').bookText, /یک روز صبح، باد شدیدی در جنگل وزید/)
assert.equal(scene(oak, 'oak-problem').prompt, 'به بلوط‌هایی که با آب رودخانه دور می‌شوند نگاه کن. مشکل سنجاب‌ها چیست؟')
assert.equal(scene(oak, 'oak-problem').choiceInteraction, 'immediate')
assert.equal(choice(scene(oak, 'oak-problem'), 'not-enough-food').consequence, 'آفرین! درست فهمیدی. بلوط‌ها غذای زمستان سنجاب‌ها هستند و حالا دیگر غذای کافی ندارند.')
assert.ok(scene(oak, 'oak-feeling').choices.every((item) => item.image.startsWith('oak-feeling-') && item.image.endsWith('-v2')))
assert.equal(scene(oak, 'oak-clues').prompt, 'سرنخ‌ها را پیدا کن.')
assert.deepEqual(scene(oak, 'oak-clues').hotspots.map((item) => item.clue), [
  'این سنگ‌ها کنار رودخانه‌اند. شاید بتوانند برای نزدیک شدن به بلوط‌ها کمک کنند.',
  'این طناب محکم به نظر می‌رسد. شاید بتوان از آن برای ساختن چیزی استفاده کرد.',
  'این تنهٔ درخت محکم و بلند است. شاید بتواند راهی برای رسیدن به آن طرف رودخانه باشد.'
])
assert.equal(scene(oak, 'oak-compare').prompt, 'کدام راه برای نجات بلوط‌ها بهتر است؟')
assert.equal(scene(oak, 'oak-rabbit-result').nextScene, 'oak-compare')
assert.equal(scene(oak, 'oak-bridge-result').nextScene, 'oak-compare')
assert.equal(scene(oak, 'oak-net-result').prompt, 'چرا بافتن تور می‌تواند راه خوبی باشد؟')
assert.match(choice(scene(oak, 'oak-net-result'), 'collect-many').text, /چند بلوط را با هم جمع کرد/)
assert.equal(scene(oak, 'oak-tools').prompt, 'حیوانات برای ساختن تور به چه چیزهایی نیاز دارند؟')
assert.deepEqual(scene(oak, 'oak-weave').craftItems.map((item) => item.label), [
  'حلقهٔ چوبی را به دستهٔ تور وصل کن',
  'طناب را از داخل حلقه رد کن و خانه‌های تور را بساز',
  'گره‌های طناب را محکم کن'
])
assert.match(scene(oak, 'oak-success').prompt, /تعداد زیادی از بلوط‌ها را بیرون آوردند/)
assert.equal(scene(oak, 'oak-final-compare').nextScene, 'oak-final-question')
assert.equal(scene(oak, 'oak-final-question').prompt, 'برای انتخاب بهترین راه‌حل، حیوان‌ها به چه چیزی توجه کردند؟')

// بازی سوم — ۱۳ اسلاید «جست‌وجوی تخم گمشده»
assert.equal(egg.scenes.length, 13)
assert.match(scene(egg, 'missing-intro').bookText, /دو تخم سر جایشان بودند، اما جای تخم سوم خالی بود/)
assert.equal(choice(scene(egg, 'missing-problem'), 'egg-missing').nextScene, 'missing-feeling')
assert.ok(scene(egg, 'missing-feeling').choices.every((item) => item.image.startsWith('turtle-feeling-')))
assert.deepEqual(scene(egg, 'missing-clues').hotspots.map((item) => item.id), ['footprints', 'bent-leaves', 'rolling-trail'])
assert.equal(scene(egg, 'missing-why-all').choices.filter((item) => !item.retry).length, 3)
assert.equal(choice(scene(egg, 'missing-choose-path'), 'rolling').nextScene, 'missing-tools')
assert.deepEqual(scene(egg, 'missing-tools').requiredItemIds, ['wheel', 'mirrors', 'long-stick', 'rope'])
assert.equal(scene(egg, 'missing-craft').requiredCraftCount, 4)
assert.match(scene(egg, 'missing-success').bookText, /این بار در آینه، نوک یک تخم سفید دیده شد/)
assert.equal(reflectionShape(scene(egg, 'missing-reflection')), '2/2/3')

// بازی چهارم — ۱۵ اسلاید «خانه خیس روباه»
assert.equal(fox.scenes.length, 15)
assert.match(scene(fox, 'fox-intro').bookText, /از زیر در آب باریکی وارد می‌شد/)
assert.equal(choice(scene(fox, 'fox-problem'), 'many-leaks').nextScene, 'fox-feeling')
assert.ok(scene(fox, 'fox-feeling').choices.every((item) => item.image.startsWith('fox-feeling-')))
assert.deepEqual(scene(fox, 'fox-clues').hotspots.map((item) => item.id), ['door', 'window', 'roof'])
assert.equal(choice(scene(fox, 'fox-measure-method'), 'same-measure').nextScene, 'fox-measurement')
assert.equal(scene(fox, 'fox-measurement').prompt, 'زیر در: ۵ پیمانه — پنجره: ۳ پیمانه — سقف: ۱ پیمانه')
assert.equal(scene(fox, 'fox-measurement').image, 'wet-fox-measurement')
assert.equal(choice(scene(fox, 'fox-first-priority'), 'door').nextScene, 'fox-tools')
assert.deepEqual(scene(fox, 'fox-tools').requiredItemIds, ['towel', 'plastic-bag', 'yarn'])
assert.deepEqual(scene(fox, 'fox-craft').craftItems.map((item) => item.id), ['roll-towel', 'bag-towel', 'tie-yarn'])
assert.equal(scene(fox, 'fox-after-barrier').prompt, 'زیر در: ۱ پیمانه — پنجره: ۳ پیمانه — سقف: ۱ پیمانه')
assert.equal(scene(fox, 'fox-after-barrier').image, 'wet-fox-measurement-after')
assert.notEqual(scene(fox, 'fox-measurement').image, scene(fox, 'fox-after-barrier').image)
assert.equal(choice(scene(fox, 'fox-second-priority'), 'window').nextScene, 'fox-success')
assert.match(scene(fox, 'fox-success').bookText, /خانه‌ام را نجات دادم/)
assert.equal(reflectionShape(scene(fox, 'fox-reflection')), '2/2/3')

const serverSource = await readFile(new URL('../server/index.ts', import.meta.url), 'utf8')
for (const storyId of ['oak-rescue', 'missing-egg', 'wet-fox-house']) {
  assert.ok(serverSource.includes(`'${storyId}'`), `admin metadata missing ${storyId}`)
}
assert.ok(serverSource.includes('maxChoices') && serverSource.includes('choiceOptions'), 'dynamic admin choice columns are missing')

console.log('PASS: Client requirements audit passed for all three source decks and admin metadata.')
