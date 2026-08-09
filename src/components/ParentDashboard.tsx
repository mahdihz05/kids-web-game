import type { ChildProfile, GameProgress, SkillKey } from '../types/story';

const labels: Record<SkillKey, string> = { discovery: 'کشف', analysis: 'تحلیل', decision: 'تصمیم', tool: 'انتخاب ابزار', reasoning: 'دلیل انتخاب', reflection: 'بازاندیشی' };

export function ParentDashboard({ profile, progress, onClose }: { profile: ChildProfile; progress: GameProgress; onClose: () => void }) {
  return (
    <main className="dashboard">
      <button className="back-button" onClick={onClose} type="button">→ بازگشت به دهکده</button>
      <header><span className="dashboard__avatar">{profile.avatar}</span><div><span>گزارش رشد کودک</span><h1>{profile.name}</h1><p>{profile.age} ساله · {profile.completedMissions.length} مأموریت انجام‌شده</p></div></header>
      <section className="stats-row"><article><span>⭐</span><div><strong>{profile.totalStars}</strong><small>ستاره کسب‌شده</small></div></article><article><span>🏅</span><div><strong>{profile.badges.length}</strong><small>نشان یادگیری</small></div></article><article><span>📚</span><div><strong>{profile.completedMissions.length}/۱۰</strong><small>قصه کامل‌شده</small></div></article></section>
      <section className="growth-card"><div><span>روند مهارت‌های حل مسئله</span><h2>نقاط قوت در آخرین بازی</h2></div><div className="skill-chart">
        {(Object.entries(labels) as [SkillKey, string][]).map(([key, label]) => <div className="skill-row" key={key}><span>{label}</span><div><i style={{ width: `${Math.min(100, progress.skillScores[key] * 12)}%` }} /></div><b>{progress.skillScores[key]}</b></div>)}
      </div></section>
      <section className="parent-note"><span>💡</span><p>در خانه از کودک بپرسید: «اگر دوباره انتخاب می‌کردی، چه چیزی را تغییر می‌دادی؟» این سؤال مهارت بازاندیشی را تقویت می‌کند.</p></section>
    </main>
  );
}
