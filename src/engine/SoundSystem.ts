import { VoiceSystem } from './VoiceSystem';

export class SoundSystem {
  static play(kind: 'magic' | 'success' | 'error' | 'craft'): void {
    if (VoiceSystem.isMuted() || !('AudioContext' in window)) return;
    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(kind === 'error' ? 0.035 : 0.055, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.34);
    gain.connect(context.destination);
    const notes = kind === 'error' ? [220, 185] : kind === 'craft' ? [440, 560] : kind === 'magic' ? [520, 680, 880] : [520, 660, 820];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = kind === 'error' ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      const start = context.currentTime + index * 0.07;
      oscillator.start(start);
      oscillator.stop(start + 0.16);
    });
    window.setTimeout(() => void context.close(), 650);
  }
}
