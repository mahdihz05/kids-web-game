import { missions } from '../data/missions';
import type { ChildProfile } from '../types/story';

interface MissionHubProps {
  profile: ChildProfile;
  onStart: () => void;
  onParent: () => void;
}

export function MissionHub({ profile, onStart, onParent }: MissionHubProps) {
  return (
    <main className="hub">
      <header className="hub-header">
        <div className="hub-brand"><span>📖</span><div><strong>کتابخانه سحرآمیز</strong><small>هر قصه، یک قدرت تازه</small></div></div>
        <div className="profile-pill"><span className="profile-avatar">{profile.avatar}</span><div><strong>{profile.name}</strong><small>⭐ {profile.totalStars} ستاره</small></div></div>
        <button className="icon-button parent-button" type="button" onClick={onParent} aria-label="بخش والدین">📊 <span>گزارش من</span></button>
      </header>

      <section className="hub-hero">
        <div className="hub-hero__copy">
          <span className="tiny-label">نقشه ماجراجویی</span>
          <h1>امروز به کدام دوست<br />کمک می‌کنی؟</h1>
          <p>در هر مأموریت سرنخ پیدا کن، فکر کن و بهترین راه را بساز.</p>
        </div>
        <div className="hub-hero__book" aria-hidden="true"><span>✨</span><b>📚</b><i>✦</i></div>
      </section>

      <section className="mission-section">
        <div className="section-title"><div><span>۱۰ قصه آموزشی</span><h2>مأموریت‌های دهکده</h2></div><p>۱ از ۱۰ باز شده</p></div>
        <div className="mission-grid">
          {missions.map((mission) => {
            const complete = profile.completedMissions.includes(mission.id);
            return (
              <article className={`mission-card ${mission.unlocked ? 'mission-card--open' : 'mission-card--locked'}`} key={mission.id}>
                <div className="mission-card__art" style={{ '--card-color': mission.color } as React.CSSProperties}>
                  <span className="mission-number">{mission.number}</span><span className="mission-icon">{mission.icon}</span>
                  {!mission.unlocked && <span className="mission-lock">🔒</span>}
                  {complete && <span className="mission-done">✓ انجام شد</span>}
                </div>
                <div className="mission-card__body"><small>{mission.skill}</small><h3>{mission.title}</h3>
                  {mission.unlocked ? <button type="button" onClick={onStart}>{complete ? 'دوباره بازی کن' : 'شروع ماجراجویی'} <span>←</span></button> : <p>به‌زودی باز می‌شود</p>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
