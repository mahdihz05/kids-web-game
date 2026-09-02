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
assert.equal(
  scene(oak, 'oak-clues').bookText,
  'حیوان‌ها تصمیم گرفتند قبل از هر کاری، اطراف جنگل را خوب بگردند.\nتا بتوانند چیزهایی پیدا ‌کنند که برای برگرداندن بلوط‌ها به آن‌ها کمک کند.'
)
assert.deepEqual(scene(oak, 'oak-clues').hotspots.map((item) => item.clue), [
  'این سنگ‌ها کنار رودخانه‌اند. شاید بتوانند برای نزدیک شدن به بلوط‌ها کمک کنند.',
  'این طناب محکم به نظر می‌رسد. شاید بتوان از آن برای ساختن چیزی استفاده کرد.',
  'این تنهٔ درخت محکم و بلند است. شاید بتواند راهی برای رسیدن به آن طرف رودخانه باشد.'
])
assert.equal(scene(oak, 'oak-compare').prompt, 'کدام راه برای نجات بلوط‌ها بهتر است؟')
assert.equal(choice(scene(oak, 'oak-compare'), 'log-bridge').image, 'oak-final-bigger-v2')
assert.equal(scene(oak, 'oak-rabbit-result').nextScene, 'oak-compare')
assert.equal(scene(oak, 'oak-bridge-result').nextScene, 'oak-compare')
assert.equal(scene(oak, 'oak-bridge-result').image, 'oak-final-bigger-v2')
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
assert.equal(choice(scene(oak, 'oak-final-question'), 'bigger').image, 'oak-bridge-building-v2')

// بازی سوم — «جست‌وجوی تخم گمشده» با صفحهٔ مستقل کشف تخم پیش از جشن
assert.equal(egg.scenes.length, 14)
assert.match(scene(egg, 'missing-intro').bookText, /دو تخم سر جایشان بودند، اما جای تخم سوم خالی بود/)
assert.equal(choice(scene(egg, 'missing-problem'), 'egg-missing').nextScene, 'missing-feeling')
assert.ok(scene(egg, 'missing-feeling').choices.every((item) => item.image.startsWith('turtle-feeling-')))
assert.deepEqual(scene(egg, 'missing-clues').hotspots.map((item) => item.id), ['footprints', 'bent-leaves', 'rolling-trail'])
assert.equal(scene(egg, 'missing-why-all').choices.filter((item) => !item.retry).length, 3)
assert.equal(choice(scene(egg, 'missing-choose-path'), 'rolling').nextScene, 'missing-tools')
assert.deepEqual(scene(egg, 'missing-tools').requiredItemIds, ['wheel', 'mirrors', 'long-stick', 'rope'])
assert.equal(scene(egg, 'missing-craft').requiredCraftCount, 4)
assert.equal(scene(egg, 'missing-craft').image, 'missing-mirror-stick-complete')
assert.equal(scene(egg, 'missing-craft').nextScene, 'missing-discovery')
assert.match(scene(egg, 'missing-discovery').bookText, /این بار در آینه، نوک یک تخم سفید دیده شد/)
assert.equal(scene(egg, 'missing-discovery').nextScene, 'missing-success')
assert.equal(new Set(scene(egg, 'missing-why-all').choices.map((item) => item.image)).size, 4)
assert.equal(new Set(scene(egg, 'missing-choose-path').choices.map((item) => item.image)).size, 3)
assert.equal(new Set(scene(egg, 'missing-final-question').choices.map((item) => item.image)).size, 4)
assert.equal(new Set(scene(egg, 'missing-reflection').reflectionPrompts.flatMap((prompt) => prompt.options.map((item) => item.image))).size, 7)
assert.equal(reflectionShape(scene(egg, 'missing-reflection')), '2/2/3')

// بازی چهارم — مسیر «خانه خیس روباه» با صفحهٔ تازهٔ پیش از جشن
assert.equal(fox.scenes.length, 16)
assert.match(scene(fox, 'fox-intro').bookText, /از زیر در آب باریکی وارد می‌شد/)
assert.equal(choice(scene(fox, 'fox-problem'), 'many-leaks').nextScene, 'fox-feeling')
assert.ok(scene(fox, 'fox-feeling').choices.every((item) => item.image.startsWith('fox-feeling-')))
assert.deepEqual(scene(fox, 'fox-clues').hotspots.map((item) => item.id), ['door', 'window', 'roof'])
assert.equal(scene(fox, 'fox-clues').image, 'wet-fox-clues')
assert.equal(choice(scene(fox, 'fox-measure-method'), 'same-measure').nextScene, 'fox-measurement')
assert.equal(scene(fox, 'fox-measure-method').image, 'wet-fox-measure-planning')
assert.equal(scene(fox, 'fox-measurement').prompt, 'زیر در: ۶ قسمت پیمانه — پنجره: ۳ قسمت پیمانه — سقف: ۱ قسمت پیمانه')
assert.match(scene(fox, 'fox-measurement').bookText, /۶ قسمت پیمانه از آب زیر در/)
assert.equal(scene(fox, 'fox-measurement').image, 'wet-fox-measurement')
assert.equal(choice(scene(fox, 'fox-first-priority'), 'door').nextScene, 'fox-tools')
assert.equal(choice(scene(fox, 'fox-first-priority'), 'door').text, 'زیر در — ۶ قسمت پیمانه')
assert.deepEqual(scene(fox, 'fox-tools').requiredItemIds, ['towel', 'plastic-bag', 'yarn'])
assert.equal(scene(fox, 'fox-tools').prompt, 'روبی باید سریع جلوی بیشترین آبی که وارد خانه می‌شود را بگیرد، برای این کار او باید از وسایل داخل خانه یک مانع درست کند.')
assert.deepEqual(scene(fox, 'fox-craft').craftItems.map((item) => item.id), ['roll-towel', 'bag-towel', 'tie-yarn'])
assert.deepEqual(scene(fox, 'fox-craft').craftItems.map((item) => item.image), ['fox-craft-roll', 'fox-craft-bag', 'fox-craft-tie'])
assert.equal(scene(fox, 'fox-after-barrier').prompt, 'هنوز آب وارد خانه می‌شود حالا روبی باید برای کجا مانع درست کند؟')
assert.match(scene(fox, 'fox-after-barrier').bookText, /زیر در ۱ قسمت پیمانه، پنجره ۳ قسمت پیمانه و سقف ۱ قسمت پیمانه/)
assert.equal(scene(fox, 'fox-after-barrier').image, 'wet-fox-measurement-after')
assert.notEqual(scene(fox, 'fox-measurement').image, scene(fox, 'fox-after-barrier').image)
assert.ok(scene(fox, 'fox-second-priority').choices.every((item) => item.image === 'wet-fox-measurement-after-crops' && item.imageCrop?.startsWith('third-')))
assert.equal(choice(scene(fox, 'fox-second-priority'), 'window').nextScene, 'fox-relief')
assert.equal(scene(fox, 'fox-relief').nextScene, 'fox-success')
assert.equal(scene(fox, 'fox-relief').image, 'wet-fox-relief')
assert.match(scene(fox, 'fox-relief').bookText, /خانه‌ام را نجات دادم/)
assert.doesNotMatch(scene(fox, 'fox-success').bookText, /مانع کوچک/)
assert.ok(scene(fox, 'fox-final-question').choices.every((item) => item.image.startsWith('fox-final-')))
assert.equal(new Set(scene(fox, 'fox-reflection').reflectionPrompts.flatMap((prompt) => prompt.options.map((item) => item.image))).size, 7)
assert.equal(reflectionShape(scene(fox, 'fox-reflection')), '2/2/3')

const serverSource = await readFile(new URL('../server/index.ts', import.meta.url), 'utf8')
for (const storyId of ['oak-rescue', 'missing-egg', 'wet-fox-house']) {
  assert.ok(serverSource.includes(`'${storyId}'`), `admin metadata missing ${storyId}`)
}
assert.ok(serverSource.includes('maxChoices') && serverSource.includes('choiceOptions'), 'dynamic admin choice columns are missing')

console.log('PASS: Client requirements audit passed for all three source decks and admin metadata.')
