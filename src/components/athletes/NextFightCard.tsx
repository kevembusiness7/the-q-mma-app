import { Calendar, MapPin } from 'lucide-react'
import type { Athlete, FightRecord } from '../../types/athlete'
import { FighterPhoto } from './FighterPhoto'

interface NextFightCardProps {
  athlete: Athlete
  fight: FightRecord | null
}

/**
 * Mesma casca do LastFightCard — os dois aparecem colados no Fight Hub, então
 * um desenho diferente para cada um faria a seção parecer meio remendada. Muda
 * só o miolo: aqui é o confronto que vem, não o resultado.
 */
export function NextFightCard({ athlete, fight }: NextFightCardProps) {
  if (!fight) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-(--color-border-gold) bg-(--color-bg-card) bg-honeycomb px-4 pt-11 pb-7 text-center">
        <span className="absolute top-0 left-0 border-r border-b border-(--color-gold) bg-black/80 pl-3 pr-5 py-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-(--color-gold) [clip-path:polygon(0_0,100%_0,calc(100%-10px)_100%,0_100%)]">
          Next Fight
        </span>
        <div className="font-(family-name:--font-display) font-black italic text-2xl uppercase text-(--color-text-secondary)">
          TBD
        </div>
        <div className="mt-1 text-[11px] text-(--color-text-secondary)">
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
    <div className="relative overflow-hidden rounded-2xl border border-(--color-border-gold) bg-(--color-bg-card) bg-honeycomb glow-gold-sm">
      <span
        className="diagline"
        style={{ top: -20, left: 74, height: 110, transform: 'rotate(20deg)' }}
        aria-hidden
      />
      <span
        className="diagline"
        style={{ top: -20, right: 74, height: 110, transform: 'rotate(-20deg)' }}
        aria-hidden
      />

      <span className="absolute top-0 left-0 z-20 border-r border-b border-(--color-gold-bright) bg-black/80 pl-3 pr-5 py-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-(--color-gold-bright) [clip-path:polygon(0_0,100%_0,calc(100%-10px)_100%,0_100%)]">
        Next Fight
      </span>

      <div className="relative flex items-stretch h-[196px]">
        <div className="relative w-[20%] shrink-0">
          <FighterPhoto
            src={athlete.imageUrl}
            alt={athlete.imageAlt}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-y-0 -right-px w-10 bg-gradient-to-r from-transparent to-(--color-bg-card)" />
        </div>

        <div className="relative z-10 flex-1 min-w-0 self-center text-center px-1 pt-6 pb-2">
          <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-(--color-gold)">
            {fight.eventName}
          </div>

          <div className="mt-1.5 font-(family-name:--font-display) font-black italic uppercase text-[17px] leading-[0.98] text-silver-metallic">
            {athlete.name}
          </div>
          <div className="my-0.5 text-[10px] font-mono uppercase tracking-[0.24em] text-(--color-gold)">
            vs
          </div>
          <div className="font-(family-name:--font-display) font-black italic uppercase text-[17px] leading-[0.98] text-gold-metallic">
            {fight.opponentName}
          </div>

          {fight.opponentRecord && (
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-(--color-text-secondary)">
              {fight.opponentRecord}
            </div>
          )}
        </div>

        <div className="relative w-[20%] shrink-0">
          <FighterPhoto
            src={fight.opponentImageUrl}
            alt={fight.opponentName}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-y-0 -left-px w-10 bg-gradient-to-l from-transparent to-(--color-bg-card)" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-3 border-t border-(--color-border-gold) bg-black/40 px-3 py-2.5 text-[10px] uppercase tracking-[0.08em] text-(--color-text-secondary)">
        <span className="flex items-center gap-1.5">
          <Calendar size={12} className="shrink-0 text-(--color-gold)" />
          {formattedDate}
        </span>
        {/* Basta um dos dois — ver a mesma nota no LastFightCard. */}
        {(fight.venue || fight.city) && (
          <>
            <span className="h-3 w-px shrink-0 bg-(--color-border-gold)" />
            <span className="flex items-center gap-1.5 min-w-0">
              <MapPin size={12} className="shrink-0 text-(--color-gold)" />
              <span className="truncate">
                {[fight.venue, fight.city].filter(Boolean).join(', ')}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  )
}
