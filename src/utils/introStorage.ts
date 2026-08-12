const INTRO_SEEN_KEY = 'motefaker:magical-library:intro-seen:v1';

export function hasSeenStoryIntro() {
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function rememberStoryIntro() {
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch {
    // The story remains usable when storage is unavailable.
  }
}
