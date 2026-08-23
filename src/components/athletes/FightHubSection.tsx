import type { AthleteWithFights } from '../../types/athlete'
import { LastFightCard } from './LastFightCard'
import { NextFightCard } from './NextFightCard'

interface FightHubSectionProps {
  athlete: AthleteWithFights
}

/** Filete dourado que afina nas pontas, com um losango na ponta interna. */
function Flourish({ flip = false }: { flip?: boolean }) {
  return (
    <span
      className={`flex flex-1 items-center gap-1.5 ${flip ? 'flex-row-reverse' : ''}`}
      aria-hidden
    >
      <span
        className={`h-px flex-1 bg-gradient-to-r from-transparent to-(--color-gold) ${
          flip ? 'rotate-180' : ''
        }`}
      />
      <span className="h-1.5 w-1.5 rotate-45 bg-(--color-gold)" />
    </span>
  )
}

export function FightHubSection({ athlete }: FightHubSectionProps) {
  return (
    <section className="px-4 mt-7">
      {/* Título centralizado entre dois filetes, como no mockup — antes era
          alinhado à esquerda com um "View all" do lado. */}
      <div className="flex items-center gap-3 mb-3.5">
        <Flourish />
        <h2 className="font-(family-name:--font-display) font-black italic text-2xl uppercase tracking-wide text-silver-metallic whitespace-nowrap">
          Fight Hub
        </h2>
        <Flourish flip />
      </div>

      <div className="flex flex-col gap-3">
        {athlete.nextFight && <NextFightCard athlete={athlete} fight={athlete.nextFight} />}
        {athlete.lastFight ? (
          <LastFightCard athlete={athlete} fight={athlete.lastFight} />
        ) : (
          !athlete.nextFight && <NextFightCard athlete={athlete} fight={null} />
        )}
      </div>
    </section>
  )
}
