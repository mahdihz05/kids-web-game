export class VoiceSystem {
  static speak(text: string): void {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fa-IR';
    utterance.rate = 0.88;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }

  static stop(): void {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}
