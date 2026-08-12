import { rememberStoryIntro } from '../utils/introStorage';

export function StoryIntro({ onClose }: { onClose: () => void }) {
  const close = () => {
    rememberStoryIntro();
    onClose();
  };

  return (
    <main className="story-intro" aria-labelledby="intro-title">
      <button className="intro-skip" type="button" onClick={close}>رد کردن داستان</button>
      <div className="intro-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>•</i><i>✦</i></div>
      <section className="intro-book">
        <div className="intro-page intro-page--copy">
          <span className="intro-eyebrow">قصه از همین‌جا شروع می‌شود...</span>
          <h1 id="intro-title">به کتابفروشی سحرآمیز خوش آمدی!</h1>
          <div className="intro-text">
            <p>سال‌ها پیش، کودکی عروسک کوچکش، <strong>کوکی متفکر</strong> را در زیرزمین این کتابفروشی جا گذاشت.</p>
            <p>از آن روز، همه کتاب‌ها به خواب رفتند...</p>
            <p>اما یک راز وجود دارد! کوکِ پشت کوکی فقط وقتی می‌چرخد که <strong>تو فکر کنی</strong>.</p>
            <p>هر بار که به شخصیت‌های قصه کمک می‌کنی، یک کتاب بیدار می‌شود و ماجراجویی تازه‌ای آغاز می‌شود.</p>
          </div>
          <button className="intro-start" type="button" onClick={close}>حاضرم کتاب‌ها را بیدار کنم <span>←</span></button>
        </div>
        <div className="intro-page intro-page--art">
          <span className="intro-name">کوکی متفکر · راوی قصه‌ها</span>
          <img src="/assets/brand/cookie-narrator.png" alt="کوکی متفکر، راوی کتابفروشی سحرآمیز" />
          <img className="intro-wand" src="/assets/brand/magic-wand.png" alt="" aria-hidden="true" />
        </div>
      </section>
    </main>
  );
}
