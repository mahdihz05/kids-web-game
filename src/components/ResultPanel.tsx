import { DialogueSystem } from '../engine/DialogueSystem';
import { ScoreSystem } from '../engine/ScoreSystem';
import type { GameProgress, Story, StoryScene } from '../types/story';

export function ResultPanel({
  story,
  scene,
  progress,
  onRestart,
  onHome,
}: {
  story: Story;
  scene: StoryScene;
  progress: GameProgress;
  onRestart: () => void;
  onHome: () => void;
}) {
  const result = ScoreSystem.result(progress, story);
  const stars = result.stars;
  const reflectionScene = story.scenes.find(
    (item) => item.id === 'analysis-reason',
  );
  const metrics = [
    { id: 'discovery', label: 'کشف', value: progress.skillScores.discovery },
    {
      id: 'analysis',
      label: 'تحلیل و دلیل',
      value: progress.skillScores.analysis + progress.skillScores.reasoning,
    },
    {
      id: 'decision',
      label: 'تصمیم‌گیری',
      value: progress.skillScores.decision,
    },
    { id: 'tool', label: 'انتخاب ابزار', value: progress.skillScores.tool },
    {
      id: 'reflection',
      label: 'بازاندیشی',
      value: progress.skillScores.reflection,
    },
  ];
  return (
    <div className="result-panel">
      <div className="result-stars" aria-label={`${stars} ستاره از ۳ ستاره`}>
        {[1, 2, 3].map((star) => (
          <span className={star <= stars ? 'active' : ''} key={star}>
            ★
          </span>
        ))}
      </div>
      <div className="result-badge">
        <span>🏅</span>
        <div>
          <small>نشان تازه</small>
          <strong>{story.badgeTitle ?? 'فکرکننده‌ی خوب'}</strong>
        </div>
      </div>
      <div className="result-score">
        <small>امتیاز مأموریت</small>
        <strong>{progress.score}</strong>
      </div>
      <p className="scoring-note">
        {result.percent}٪ از {result.maxScore} امتیاز · مدال {result.medal}
        <br />
        ستاره‌ها: زیر ۵۰٪ یک، از ۵۰٪ دو، از ۸۰٪ سه
        <br />
        مدال: زیر ۶۵٪ برنز، از ۶۵٪ نقره، از ۸۵٪ طلا
      </p>
      <p className="result-summary">
        {DialogueSystem.storyChoiceSummary(progress.choices)}
      </p>
      <p className="result-reason">
        {DialogueSystem.reasonSummary(progress.choices, reflectionScene)}
      </p>
      {progress.reflections.wish && (
        <p className="result-wish">
          🌙 آرزوی دفعه بعد: {progress.reflections.wish.text}
        </p>
      )}
      <div className="mini-skills">
        {metrics.map((metric) => (
          <div key={metric.id}>
            <span>{metric.label}</span>
            <i>
              <b style={{ width: `${result.skills[metric.id] ?? 0}%` }} />
            </i>
          </div>
        ))}
      </div>
      <div className="learning-card">
        <span>💡</span>
        <p>{scene.learningSummary}</p>
      </div>
      <div className="result-actions">
        <button className="primary-button" type="button" onClick={onHome}>
          ادامه در دهکده
        </button>
        <button className="secondary-button" type="button" onClick={onRestart}>
          ↻ {scene.actionLabel ?? 'دوباره بازی کن'}
        </button>
      </div>
    </div>
  );
}
