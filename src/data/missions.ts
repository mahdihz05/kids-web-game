export interface MissionCard {
  id: string;
  number: number;
  title: string;
  skill: string;
  icon: string;
  color: string;
  unlocked: boolean;
  coverImage?: string;
}

export const missions: MissionCard[] = [
  { id: 'grandmas-birthday-gift', number: 1, title: 'هدیه تولد مادربزرگ', skill: 'تصمیم‌گیری و پیامد', icon: '🎁', color: '#8e6ad8', unlocked: true, coverImage: '/assets/scenes-v3/calendar-v3.png' },
  { id: 'oak-rescue', number: 2, title: 'راه نجات بلوط‌ها', skill: 'مقایسه راه‌حل و اصلاح مسیر', icon: '🌰', color: '#b56f3c', unlocked: true, coverImage: '/assets/oak-rescue/scenes/river-problem-v1.webp' },
  { id: 'missing-egg', number: 3, title: 'جست‌وجوی تخم گمشده', skill: 'پیدا کردن و بررسی سرنخ‌ها', icon: '🥚', color: '#7da35b', unlocked: true, coverImage: '/assets/missing-egg/scenes/missing-egg-intro-v1.png' },
  { id: 'wet-fox-house', number: 4, title: 'خانه خیس روباه', skill: 'اولویت‌بندی و اندازه‌گیری', icon: '🦊', color: '#c66c45', unlocked: true, coverImage: '/assets/wet-fox/scenes/wet-house-intro-v1.png' },
  { id: 'missing-tool', number: 5, title: 'ابزار گمشده', skill: 'انتخاب ابزار', icon: '🧰', color: '#5486ba', unlocked: false },
  { id: 'broken-bridge', number: 6, title: 'پل شکسته', skill: 'برنامه‌ریزی', icon: '🌉', color: '#6e73bb', unlocked: false },
  { id: 'broken-toy', number: 7, title: 'اسباب‌بازی خراب', skill: 'علت و معلول', icon: '🧸', color: '#c26c85', unlocked: false },
  { id: 'lost-basket', number: 8, title: 'سبد گمشده', skill: 'اصلاح تصمیم', icon: '🧺', color: '#9a7854', unlocked: false },
  { id: 'village-party', number: 9, title: 'جشن دهکده', skill: 'اولویت‌بندی', icon: '🎉', color: '#b65faa', unlocked: false },
  { id: 'great-village-mission', number: 10, title: 'مأموریت بزرگ دهکده', skill: 'ترکیب مهارت‌ها', icon: '🏡', color: '#7f5cae', unlocked: false },
];
