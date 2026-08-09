import { DialogueSystem } from '../engine/DialogueSystem';
import { ScoreSystem } from '../engine/ScoreSystem';
import type { GameProgress, SkillKey, Story, StoryScene } from '../types/story';

const skillLabels: Partial<Record<SkillKey, string>> = { discovery: 'کشف سرنخ', analysis: 'فکر و تحلیل', decision: 'تصمیم‌گیری', tool: 'انتخاب ابزار' };

export function ResultPanel({ story, scene, progress, onRestart, onHome }: { story: Story; scene: StoryScene; progress: GameProgress; onRestart: () => void; onHome: () => void }) {
  const stars = ScoreSystem.stars(progress.score);
  const reflectionScene = story.scenes.find((item) => item.type === 'reflection');
  return <div className="result-panel">
    <div className="result-stars" aria-label={`${stars} ستاره از ۳ ستاره`}>{[1, 2, 3].map((star) => <span className={star <= stars ? 'active' : ''} key={star}>★</span>)}</div>
    <div className="result-score"><small>امتیاز مأموریت</small><strong>{progress.score}</strong></div>
    <p className="result-summary">{DialogueSystem.storyChoiceSummary(progress.choices)}</p>
    <p className="result-reason">{DialogueSystem.reasonSummary(progress.choices, reflectionScene)}</p>
    <div className="mini-skills">{Object.entries(skillLabels).map(([key, label]) => <div key={key}><span>{label}</span><i><b style={{ width: `${Math.min(100, progress.skillScores[key as SkillKey] * 12)}%` }} /></i></div>)}</div>
    <div className="learning-card"><span>💡</span><p>{scene.learningSummary}</p></div>
    <div className="result-actions"><button className="primary-button" type="button" onClick={onHome}>ادامه در دهکده</button><button className="secondary-button" type="button" onClick={onRestart}>↻ {scene.actionLabel}</button></div>
  </div>;
}
