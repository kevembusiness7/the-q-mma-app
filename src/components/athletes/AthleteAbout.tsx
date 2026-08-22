import type { Athlete } from '../../types/athlete'

interface AthleteAboutProps {
  athlete: Athlete
}

export function AthleteAbout({ athlete }: AthleteAboutProps) {
  return (
    <section className="px-4 mt-7 mb-8">
      <h2 className="font-(family-name:--font-display) text-2xl uppercase text-gold-metallic mb-3">
        About {athlete.firstName}
      </h2>
      <div className="rounded-xl border border-(--color-border-gold)/40 bg-(--color-bg-card) px-4 py-4">
        <p className="text-[13px] leading-relaxed text-(--color-text-secondary)">{athlete.bio}</p>

        <dl className="grid grid-cols-2 gap-y-3 gap-x-4 mt-4 pt-4 border-t border-(--color-border-gold)/25">
          <AboutRow label="Team" value={athlete.team} />
          <AboutRow label="Head Coach" value={athlete.headCoach} />
          <AboutRow label="Born In" value={athlete.bornIn} />
          <AboutRow label="Fighting Out Of" value={athlete.fightingOutOf} />
        </dl>
      </div>
    </section>
  )
}

function AboutRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-[9px] font-mono uppercase tracking-[0.12em] text-(--color-gold)">{label}</dt>
      <dd className="text-xs text-(--color-text-primary) mt-0.5">{value}</dd>
    </div>
  )
}
