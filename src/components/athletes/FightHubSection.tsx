import type { AthleteWithFights } from '../../types/athlete'
import { LastFightCard } from './LastFightCard'
import { NextFightCard } from './NextFightCard'

interface FightHubSectionProps {
  athlete: AthleteWithFights
}

export function FightHubSection({ athlete }: FightHubSectionProps) {
  return (
    <section className="px-4 mt-7">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-(family-name:--font-display) text-2xl uppercase text-silver-metallic">
          Fight Hub
        </h2>
        <button className="text-[10px] font-mono uppercase tracking-[0.14em] text-(--color-gold)">
          View All →
        </button>
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
