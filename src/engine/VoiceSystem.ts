const MUTE_KEY = 'motefaker:audio-muted:v1';

export class VoiceSystem {
  private static audio: HTMLAudioElement | null = null;

  static isMuted(): boolean {
    try { return localStorage.getItem(MUTE_KEY) === 'true'; } catch { return false; }
  }

  static setMuted(muted: boolean): void {
    try { localStorage.setItem(MUTE_KEY, String(muted)); } catch { /* optional storage */ }
    if (muted) this.stop();
  }

  static speak(text: string, audioUrl?: string): void {
    if (this.isMuted()) return;
    this.stop();
    if (audioUrl) {
      this.audio = new Audio(audioUrl);
      this.audio.play().catch(() => this.synthesize(text));
      return;
    }
    this.synthesize(text);
  }

  private static synthesize(text: string): void {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fa-IR';
    utterance.rate = 0.84;
    utterance.pitch = 1.06;
    window.speechSynthesis.speak(utterance);
  }

  static stop(): void {
    this.audio?.pause();
    this.audio = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}
