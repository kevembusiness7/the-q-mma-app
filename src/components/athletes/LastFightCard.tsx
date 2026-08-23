import { Calendar, MapPin } from 'lucide-react'
import type { Athlete, FightRecord } from '../../types/athlete'
import { FighterPhoto } from './FighterPhoto'

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

      {/* Aba com o canto direito chanfrado, como no mockup. */}
      <span className="absolute top-0 left-0 z-20 border-r border-b border-(--color-gold) bg-black/80 pl-3 pr-5 py-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-(--color-gold) [clip-path:polygon(0_0,100%_0,calc(100%-10px)_100%,0_100%)]">
        {fight.isNextFight ? 'Next Fight' : 'Last Fight'}
      </span>

      {/* Altura fixa para as fotos preencherem o card de cima a baixo, como no
          mockup. Sem ela a <img> assume a proporção do arquivo e fica baixinha
          num canto. object-top mantém o rosto no enquadramento ao cortar. */}
      <div className="relative flex items-stretch h-[196px]">
        {/* As colunas são estreitas de propósito: numa tela de ~390px o bloco
            central precisa da largura para o nome do oponente não quebrar. */}
        <div className="relative w-[25%] shrink-0">
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

          <div className="mt-1.5 font-(family-name:--font-display) font-black italic uppercase text-[19px] leading-[0.98] text-silver-metallic">
            {athlete.name}
          </div>
          <div className="font-(family-name:--font-display) font-black italic uppercase text-[19px] leading-[0.98] text-gold-metallic">
            {resultLabel[fight.result]} {fight.opponentName}
          </div>

          {fight.method && (
            <div className="mt-1.5 text-[11px] uppercase tracking-[0.06em] text-(--color-text-primary)">
              {fight.method}
            </div>
          )}
          {(fight.round || fight.time) && (
            <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-(--color-text-secondary)">
              {[fight.round, fight.time].filter(Boolean).join(' • ')}
            </div>
          )}
        </div>

        <div className="relative w-[25%] shrink-0">
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
        {fight.venue && (
          <>
            <span className="h-3 w-px shrink-0 bg-(--color-border-gold)" />
            <span className="flex items-center gap-1.5 min-w-0">
              <MapPin size={12} className="shrink-0 text-(--color-gold)" />
              <span className="truncate">
                {fight.venue}
                {fight.city ? `, ${fight.city}` : ''}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  )
}
