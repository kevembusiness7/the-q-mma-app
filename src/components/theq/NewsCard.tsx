import type { NewsItem } from '../../types/news';

interface NewsCardProps {
  item: NewsItem;
}

export function NewsCard({ item }: NewsCardProps) {
  return (
    <article className="news-card">
      <div className="nimg">
        <img src={item.photo} alt="" loading="lazy" />
      </div>
      <div className="nbody">
        <span className={`ntag ${item.type}`}>{item.tag}</span>
        <h4>{item.title}</h4>
        <p>{item.body}</p>
        <span className="ndate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 10h18" />
          </svg>
          {item.date}
        </span>
      </div>
    </article>
  );
}
