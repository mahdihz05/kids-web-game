export interface MissionCard {
  id: string;
  number: number;
  title: string;
  skill: string;
  icon: string;
  color: string;
  unlocked: boolean;
}

export const missions: MissionCard[] = [
  { id: 'grandmas-birthday-gift', number: 1, title: 'هدیه تولد مادربزرگ', skill: 'تصمیم‌گیری و پیامد', icon: '🎁', color: '#8e6ad8', unlocked: true },
  { id: 'squirrels-wet-home', number: 2, title: 'خانه خیس سنجاب', skill: 'علت‌یابی', icon: '🐿️', color: '#dc8d55', unlocked: false },
  { id: 'lost-chick', number: 3, title: 'جوجه گمشده', skill: 'کشف سرنخ', icon: '🐥', color: '#e7b64d', unlocked: false },
  { id: 'wilted-garden', number: 4, title: 'باغچه پژمرده', skill: 'تشخیص نیاز', icon: '🌱', color: '#67a66d', unlocked: false },
  { id: 'missing-tool', number: 5, title: 'ابزار گمشده', skill: 'انتخاب ابزار', icon: '🧰', color: '#5486ba', unlocked: false },
  { id: 'broken-bridge', number: 6, title: 'پل شکسته', skill: 'برنامه‌ریزی', icon: '🌉', color: '#6e73bb', unlocked: false },
  { id: 'broken-toy', number: 7, title: 'اسباب‌بازی خراب', skill: 'علت و معلول', icon: '🧸', color: '#c26c85', unlocked: false },
  { id: 'lost-basket', number: 8, title: 'سبد گمشده', skill: 'اصلاح تصمیم', icon: '🧺', color: '#9a7854', unlocked: false },
  { id: 'village-party', number: 9, title: 'جشن دهکده', skill: 'اولویت‌بندی', icon: '🎉', color: '#b65faa', unlocked: false },
  { id: 'great-village-mission', number: 10, title: 'مأموریت بزرگ دهکده', skill: 'ترکیب مهارت‌ها', icon: '🏡', color: '#7f5cae', unlocked: false },
];
