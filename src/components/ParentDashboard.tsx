import type { ChildProfile, GameProgress } from '../types/story';

export function ParentDashboard({ profile, progress, onClose }: { profile: ChildProfile; progress: GameProgress; onClose: () => void }) {
  const metrics = [
    { id: 'discovery', label: 'کشف', value: progress.skillScores.discovery },
    { id: 'analysis', label: 'تحلیل و دلیل', value: progress.skillScores.analysis + progress.skillScores.reasoning },
    { id: 'decision', label: 'تصمیم‌گیری', value: progress.skillScores.decision },
    { id: 'tool', label: 'انتخاب ابزار', value: progress.skillScores.tool },
    { id: 'reflection', label: 'بازاندیشی', value: progress.skillScores.reflection },
  ];
  return (
    <main className="dashboard">
      <button className="back-button" onClick={onClose} type="button">→ بازگشت به دهکده</button>
      <header><span className="dashboard__avatar">{profile.avatar}</span><div><span>گزارش رشد کودک</span><h1>{profile.name}</h1><p>{profile.age} ساله · {profile.completedMissions.length} مأموریت انجام‌شده</p></div></header>
      <section className="stats-row"><article><span>⭐</span><div><strong>{profile.totalStars}</strong><small>ستاره کسب‌شده</small></div></article><article><span>🏅</span><div><strong>{profile.badges.length}</strong><small>نشان یادگیری</small></div></article><article><span>📚</span><div><strong>{profile.completedMissions.length}/۱۰</strong><small>قصه کامل‌شده</small></div></article></section>
      <section className="growth-card"><div><span>روند مهارت‌های حل مسئله</span><h2>نقاط قوت در آخرین بازی</h2></div><div className="skill-chart">
        {metrics.map((metric) => <div className="skill-row" key={metric.id}><span>{metric.label}</span><div><i style={{ width: `${Math.min(100, metric.value * 10)}%` }} /></div><b>{metric.value}</b></div>)}
      </div></section>
      <section className="parent-note"><span>💡</span><p>در خانه از کودک بپرسید: «اگر دوباره انتخاب می‌کردی، چه چیزی را تغییر می‌دادی؟» این سؤال مهارت بازاندیشی را تقویت می‌کند.</p></section>
    </main>
  );
}
