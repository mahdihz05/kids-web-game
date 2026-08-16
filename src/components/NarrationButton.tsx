import { useEffect, useRef, useState } from 'react';

export function NarrationButton({ text, audio }: { text?: string; audio?: string }) {
  const player = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => { player.current?.pause(); window.speechSynthesis?.cancel(); }, []);
  const stop = () => { player.current?.pause(); window.speechSynthesis?.cancel(); setSpeaking(false); };
  const speak = () => {
    if (!text || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fa-IR'; utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance); setSpeaking(true);
  };
  const play = () => {
    if (speaking) return stop();
    if (!audio) return speak();
    const element = new Audio(audio); player.current = element;
    element.onended = () => setSpeaking(false); element.onerror = speak;
    element.play().then(() => setSpeaking(true)).catch(speak);
  };
  return <button className={`narration-button ${speaking ? 'narration-button--playing' : ''}`} onClick={play} type="button" aria-pressed={speaking}>
    <span aria-hidden="true">{speaking ? '❚❚' : '▶'}</span>{speaking ? 'بس کن' : 'بشنو'}
  </button>;
}
