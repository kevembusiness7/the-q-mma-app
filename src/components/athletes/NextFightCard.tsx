import { Calendar, MapPin } from 'lucide-react'
import type { Athlete, FightRecord } from '../../types/athlete'

interface NextFightCardProps {
  athlete: Athlete
  fight: FightRecord | null
}

export function NextFightCard({ athlete, fight }: NextFightCardProps) {
  if (!fight) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-(--color-border-gold)/40 bg-(--color-bg-card) px-4 py-6 text-center">
        <span className="absolute top-3 left-3 rounded-md border border-(--color-gold) bg-black/70 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.14em] text-(--color-gold)">
          Next Fight
        </span>
        <div className="mt-8 font-(family-name:--font-display) text-2xl text-(--color-text-secondary) uppercase">
          TBD
        </div>
        <div className="text-[11px] text-(--color-text-secondary) mt-1">
          No opponent announced yet
        </div>
      </div>
    )
  }

  const formattedDate = new Date(fight.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="relative overflow-hidden rounded-2xl border border-(--color-border-gold)/40 bg-(--color-bg-card)">
      <span className="absolute top-3 left-3 z-10 rounded-md border border-(--color-blood,#8b1f1f) bg-black/70 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.14em] text-(--color-gold-bright)">
        Next Fight
      </span>

      <div className="px-4 pt-11 pb-3 text-center">
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-(--color-text-secondary)">
          {fight.eventName}
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="font-(family-name:--font-display) text-lg uppercase text-silver-metallic">
            {athlete.nickname}
          </span>
          <span className="text-[10px] text-(--color-gold)">VS</span>
          <span className="font-(family-name:--font-display) text-lg uppercase text-(--color-text-primary)">
            {fight.opponentName.split(' ')[0]}
          </span>
        </div>
        {fight.opponentRecord && (
          <div className="text-[10px] text-(--color-text-secondary) mt-1">
            {fight.opponentName} · {fight.opponentRecord}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-(--color-border-gold)/25 px-4 py-2.5 text-[10px] text-(--color-text-secondary)">
        <span className="flex items-center gap-1.5">
          <Calendar size={12} className="text-(--color-gold)" />
          {formattedDate}
        </span>
        {fight.venue && (
          <>
            <span className="h-3 w-px bg-(--color-border-gold)" />
            <span className="flex items-center gap-1.5">
              <MapPin size={12} className="text-(--color-gold)" />
              {fight.venue}
              {fight.city ? `, ${fight.city}` : ''}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
