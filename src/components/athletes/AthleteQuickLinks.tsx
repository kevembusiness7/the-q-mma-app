import { BarChart3, History, Play, Newspaper } from 'lucide-react'
import type { QuickLinkKey } from '../../types/athlete'

const LINKS: { key: QuickLinkKey; label: string; icon: typeof BarChart3 }[] = [
  { key: 'career-stats', label: 'Career Stats', icon: BarChart3 },
  { key: 'fight-history', label: 'Fight History', icon: History },
  { key: 'highlights', label: 'Highlights', icon: Play },
  { key: 'news', label: 'News & Updates', icon: Newspaper },
]

interface AthleteQuickLinksProps {
  onSelect?: (key: QuickLinkKey) => void
}

export function AthleteQuickLinks({ onSelect }: AthleteQuickLinksProps) {
  return (
    <section className="px-4 mt-7 grid grid-cols-2 gap-3">
      {LINKS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSelect?.(key)}
          className="flex flex-col items-center gap-2 rounded-xl border border-(--color-border-gold) bg-(--color-bg-card) py-5"
        >
          <Icon size={20} strokeWidth={1.6} className="text-(--color-gold)" />
          <span className="text-xs uppercase tracking-wide text-(--color-text-primary)">{label}</span>
        </button>
      ))}
    </section>
  )
}
