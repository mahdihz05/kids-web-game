import type { Story } from '../types/story';

export function StoryBook({ story, onClose }: { story: Story; onClose: () => void }) {
  return <aside className="story-book-backdrop" role="dialog" aria-modal="true" aria-label="داستان کامل">
    <section className="story-book">
      <button className="story-book__close" type="button" onClick={onClose} aria-label="بستن داستان">×</button>
      <span>📖 داستان کامل</span><h2>{story.title}</h2>
      {(story.bookContent ?? []).map((section) => <section key={section.title}><h3>{section.title}</h3>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
    </section>
  </aside>;
}
