import { Calendar, MapPin } from 'lucide-react'
import type { Athlete, FightRecord } from '../../types/athlete'

interface LastFightCardProps {
  athlete: Athlete
  fight: FightRecord
}

const resultLabel: Record<FightRecord['result'], string> = {
  win: 'DEF.',
  loss: 'LOST TO',
  draw: 'DREW',
  nc: 'NC',
}

export function LastFightCard({ athlete, fight }: LastFightCardProps) {
  const formattedDate = new Date(fight.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="relative overflow-hidden rounded-2xl border border-(--color-border-gold)/40 bg-(--color-bg-card)">
      <span className="absolute top-3 left-3 z-10 rounded-md border border-(--color-gold) bg-black/70 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.14em] text-(--color-gold)">
        Last Fight
      </span>

      <div className="px-4 pt-11 pb-3 text-center">
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-(--color-text-secondary)">
          {fight.eventName}
        </div>
        <div className="font-(family-name:--font-display) text-xl uppercase text-silver-metallic mt-1">
          {athlete.name}
        </div>
        <div className="text-xs uppercase tracking-wide text-(--color-gold) mt-1">
          {resultLabel[fight.result]} {fight.opponentName}
        </div>
        {fight.method && (
          <div className="text-[11px] text-(--color-text-primary) mt-1">{fight.method}</div>
        )}
        {(fight.round || fight.time) && (
          <div className="text-[10px] text-(--color-text-secondary) mt-0.5">
            {[fight.round, fight.time].filter(Boolean).join(' · ')}
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
