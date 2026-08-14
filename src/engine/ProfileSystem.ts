import type { ChildProfile } from '../types/story';

const PROFILE_KEY = 'magical-library:child-profile';

const defaultProfile: ChildProfile = {
  name: 'قصه‌گرد کوچولو',
  age: 7,
  avatar: '🦊',
  totalStars: 0,
  completedMissions: [],
  badges: [],
};

export class ProfileSystem {
  static load(): ChildProfile {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      return saved ? { ...defaultProfile, ...JSON.parse(saved) as ChildProfile } : defaultProfile;
    } catch {
      return defaultProfile;
    }
  }

  static complete(profile: ChildProfile, missionId: string, stars: number): ChildProfile {
    const firstCompletion = !profile.completedMissions.includes(missionId);
    const next = {
      ...profile,
      totalStars: firstCompletion ? profile.totalStars + stars : profile.totalStars,
      completedMissions: firstCompletion ? [...profile.completedMissions, missionId] : profile.completedMissions,
      badges: firstCompletion && !profile.badges.includes('فکرکننده‌ی خوب') ? [...profile.badges, 'فکرکننده‌ی خوب'] : profile.badges,
    };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch { /* optional storage */ }
    return next;
  }
}
