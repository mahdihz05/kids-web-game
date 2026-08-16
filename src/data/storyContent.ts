import source from './story.json';
import type { Story } from '../types/story';

const scenePrompts: Record<string, string> = {
  'birthday-intro': 'تقویم را لمس کن', 'identify-problem': 'مشکل چیست؟', feelings: 'چه حسی داری؟',
  'garden-clues': 'دو سرنخ را پیدا کن', 'compare-options': 'کدام راه بهتر است؟', 'analysis-reason': 'چرا این راه؟',
  'choose-tools': 'چه چیزهایی لازم است؟', 'final-decision': 'یک راه را انتخاب کن', 'flower-consequence': 'به باغبان گوش کن',
  'flower-repair': 'حالا چه کار کنیم؟', 'craft-necklace': 'بلوط‌ها را روی نخ بگذار', 'gift-grandma': 'هدیه را ببین',
  counterfactual: 'اگر گل‌ها را می‌چید؟', 'two-stars-wish': 'کارت‌ها را انتخاب کن', celebration: 'آفرین پشمالو!',
};

const imageForChoice: Record<string, string> = {
  'no-gift': 'birthday-calendar', 'no-date': 'birthday-calendar', 'lost-home': 'village-morning',
  confused: 'gift-crossroads', worried: 'gift-crossroads', happy: 'birthday-celebration', sleepy: 'birthday-calendar',
  'consider-flowers': 'garden-discovery', 'consider-necklace': 'necklace-crafting', 'protect-garden': 'garden-discovery', handmade: 'necklace-crafting', fast: 'village-morning', lovely: 'grandma-gift',
  flowers: 'gardener-consequence', necklace: 'necklace-crafting', 'take-all': 'gardener-consequence', 'find-another': 'gift-crossroads', 'go-empty': 'village-morning',
  'gardener-sad': 'gardener-consequence', nothing: 'birthday-celebration', 'more-flowers': 'garden-discovery',
};

export const story: Story = (() => {
  const value = structuredClone(source) as Story;
  value.bookContent = [
    { title: 'شروع قصه', paragraphs: ['تولد مادربزرگ نزدیک است. پشمالو می‌خواهد یک هدیهٔ دست‌ساز آماده کند.'] },
    { title: 'دو راه', paragraphs: ['پشمالو بین چیدن گل‌های باغ و ساختن گردنبند بلوط فکر می‌کند. او باید نتیجهٔ هر انتخاب را ببیند.'] },
    { title: 'پایان مهربان', paragraphs: ['پشمالو با نخ، بلوط و صبر هدیه‌اش را می‌سازد. مادربزرگ از هدیهٔ دست‌ساز او خوشحال می‌شود.'] },
  ];
  for (const scene of value.scenes) {
    scene.prompt = scenePrompts[scene.id] ?? 'نگاه کن و انتخاب کن';
    scene.narration = scene.text;
    for (const choice of scene.choices ?? []) {
      choice.caption = choice.text.length > 24 ? choice.text.slice(0, 24).replace(/[،.؟]$/, '') : choice.text;
      choice.image = imageForChoice[choice.id] ?? scene.image;
      choice.tone = undefined;
    }
    for (const item of scene.dragItems ?? []) item.image = item.correct ? 'necklace-crafting' : 'craft-workshop';
    for (const item of scene.craftItems ?? []) item.image = 'necklace-crafting';
    for (const item of scene.hotspots ?? []) item.image = item.id.includes('flower') ? 'garden-discovery' : 'necklace-crafting';
    for (const prompt of scene.reflectionPrompts ?? []) for (const option of prompt.options) option.image = option.id === 'special-gift' ? 'necklace-crafting' : option.id === 'discover-more' ? 'garden-discovery' : 'birthday-celebration';
  }
  for (const choice of byChoices(value, 'feelings')) choice.image = 'pashmaloo-choice';
  const byId = new Map(value.scenes.map((scene) => [scene.id, scene]));
  const reason = byId.get('analysis-reason')!;
  for (const choice of reason.choices ?? []) choice.nextScene = 'final-decision';
  const finalDecision = byId.get('final-decision')!;
  finalDecision.prompt = 'کدام هدیه؟';
  finalDecision.choices?.forEach((choice) => { if (choice.id === 'necklace') choice.nextScene = 'choose-tools'; });
  byId.get('choose-tools')!.dropTarget!.nextScene = 'craft-necklace';
  byId.get('flower-repair')!.choices?.forEach((choice) => { if (choice.id === 'find-another') choice.nextScene = 'final-decision'; });
  return value;
})();

function byChoices(storyValue: Story, id: string) {
  return storyValue.scenes.find((scene) => scene.id === id)?.choices ?? [];
}
