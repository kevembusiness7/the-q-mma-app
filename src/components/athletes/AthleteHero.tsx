import { User, Ruler, Weight, Move3d } from 'lucide-react'
import type { Athlete } from '../../types/athlete'
import { AthleteStatCard } from './AthleteStatCard'

interface AthleteHeroProps {
  athlete: Athlete
}

export function AthleteHero({ athlete }: AthleteHeroProps) {
  return (
    <section className="px-4">
      <div className="relative overflow-hidden rounded-2xl border border-(--color-border-gold)/40 bg-(--color-bg-card) flex min-h-[260px]">
        <span
          className="diagline"
          style={{ top: -40, right: 56, height: 150, transform: 'rotate(20deg)' }}
          aria-hidden
        />

        {/* Photo — bleeds to the edges, no inner card */}
        <div className="relative flex-[0_0_46%] bg-gradient-to-b from-[#3A211C] via-[#241B19] to-(--color-bg-main) overflow-hidden">
          {athlete.imageUrl ? (
            <img
              src={athlete.imageUrl}
              alt={athlete.imageAlt}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-3 flex items-center justify-center rounded-lg border border-dashed border-(--color-border-gold)/50 text-center text-[10px] text-(--color-text-secondary) px-2">
              Photo slot — cut-out PNG of the athlete
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Name / record */}
        <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-4">
          <span className="self-start rounded-md border border-(--color-gold) px-2.5 py-1 mb-3 text-[10px] font-mono uppercase tracking-[0.14em] text-(--color-gold) whitespace-nowrap">
            "{athlete.nickname}"
          </span>

          <h1 className="font-(family-name:--font-display) uppercase leading-[0.86] text-[32px] text-silver-metallic break-words">
            <span className="block">{athlete.firstName}</span>
            <span className="block">{athlete.lastName}</span>
          </h1>

          <div className="h-px my-3.5 bg-gradient-to-r from-(--color-gold) to-transparent opacity-60" />

          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-(--color-gold) mb-0.5">
            Pro Record
          </div>
          <div className="font-(family-name:--font-display) text-[28px] leading-none text-(--color-text-primary)">
            {athlete.record}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        <AthleteStatCard icon={User} label="Age" value={String(athlete.age)} />
        <AthleteStatCard icon={Ruler} label="Height" value={athlete.heightLabel} />
        <AthleteStatCard icon={Weight} label="Weight" value={String(athlete.weightLbs)} unit="lbs" />
        <AthleteStatCard icon={Move3d} label="Reach" value={athlete.reachLabel} />
      </div>
    </section>
  )
}
