import { useState } from 'react';
import { missions } from '../data/missions';
import type { ChildProfile } from '../types/story';
import { ParentGate } from './ParentGate';

interface MissionHubProps {
  profile: ChildProfile;
  onStart: (missionId: string) => void;
  onParent: () => void;
  onStory: () => void;
}

const brandFriends = ['friend-frog', 'friend-orange', 'friend-purple', 'friend-blue', 'friend-green', 'friend-yellow', 'friend-red', 'friend-cow', 'friend-unicorn'];

export function MissionHub({ profile, onStart, onParent, onStory }: MissionHubProps) {
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const unlockedCount = missions.filter((mission) => mission.unlocked).length;
  return (
    <main className="hub">
      <header className="hub-header">
        <div className="hub-brand"><img src="/assets/brand/client-logo.png" alt="لوگوی مجموعه" /><div><strong>کتابفروشی سحرآمیز متفکر</strong><small>هر فکر، یک کتاب را بیدار می‌کند</small></div></div>
        <div className="profile-pill"><span className="profile-avatar">{profile.avatar}</span><div><strong>{profile.name}</strong><small>⭐ {profile.totalStars} ستاره</small></div></div>
        <div className="hub-actions"><button className="icon-button story-button" type="button" onClick={onStory}>✨ داستان کوکی</button><button className="icon-button parent-button" type="button" onClick={() => setParentGateOpen(true)} aria-label="بخش والدین">📊 <span>گزارش من</span></button></div>
      </header>

      <section className="hub-hero">
        <div className="hub-hero__copy">
          <span className="tiny-label">{unlockedCount} کتاب برای ماجراجویی بیدار شده‌اند!</span>
          <h1>فکر کن، کمک کن<br />و قصه‌ها را زنده کن</h1>
          <p>پشمالو منتظر توست؛ وارد کتابش شو و برای انتخاب یک هدیه ماندگار کمکش کن.</p>
        </div>
        <div className="hero-friends" aria-hidden="true">{brandFriends.map((friend) => <img key={friend} src={`/assets/brand/${friend}.png`} alt="" />)}</div>
      </section>

      <section className="mission-section">
        <div className="section-title"><div><span>۱۰ قصه آموزشی</span><h2>قفسه کتاب‌های سحرآمیز</h2></div><p>{unlockedCount} از ۱۰ کتاب بیدار شده</p></div>
        <div className="mission-grid">
          {missions.map((mission) => {
            const complete = profile.completedMissions.includes(mission.id);
            return (
              <article className={`mission-card ${mission.unlocked ? 'mission-card--open' : 'mission-card--locked'}`} key={mission.id}>
                <div className="mission-card__art" style={{ '--card-color': mission.color } as React.CSSProperties}>
                  <span className="mission-number">{mission.number}</span>{mission.unlocked ? <img className="mission-cover" src={mission.coverImage} alt={`تصویر مأموریت ${mission.title}`} /> : <span className="mission-icon">{mission.icon}</span>}
                  {!mission.unlocked && <span className="mission-lock">🔒</span>}
                  {complete && <span className="mission-done">✓ انجام شد</span>}
                </div>
                <div className="mission-card__body"><small>{mission.skill}</small><h3>{mission.title}</h3>
                  {mission.unlocked ? <button className="wake-book" type="button" onClick={() => onStart(mission.id)}><img src="/assets/brand/magic-wand.png" alt="" />{complete ? 'دوباره وارد کتاب شو' : 'با چوب جادویی بازش کن'} <span>←</span></button> : <p>به‌زودی بیدار می‌شود</p>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {parentGateOpen && <ParentGate onClose={() => setParentGateOpen(false)} onPass={() => { setParentGateOpen(false); onParent(); }} />}
    </main>
  );
}
