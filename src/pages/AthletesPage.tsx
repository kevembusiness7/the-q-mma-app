import { useState } from 'react'
import { useAthletes } from '../hooks/useAthletes'
import { AthleteHeader } from '../components/athletes/AthleteHeader'
import { AthleteSelector } from '../components/athletes/AthleteSelector'
import { AthleteHero } from '../components/athletes/AthleteHero'
import { FightHubSection } from '../components/athletes/FightHubSection'
import { AthleteQuickLinks } from '../components/athletes/AthleteQuickLinks'
import { AthleteAbout } from '../components/athletes/AthleteAbout'

export function AthletesPage() {
  const { athletes, loading, error, usingMockData } = useAthletes()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = athletes.find((a) => a.id === selectedId) ?? athletes[0]

  if (loading) {
    return (
      <div className="px-4 pt-10 text-center text-sm text-(--color-text-secondary)">
        Loading roster…
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 pt-10 text-center text-sm text-red-400">
        Couldn't load athletes: {error}
      </div>
    )
  }

  if (!selected) {
    return (
      <div className="px-4 pt-10 text-center text-sm text-(--color-text-secondary)">
        No athletes on the roster yet.
      </div>
    )
  }

  return (
    <div className="bg-honeycomb">
      {usingMockData && (
        <div className="mx-4 mt-3 mb-1 rounded-md border border-(--color-border-gold)/40 bg-(--color-bg-card) px-3 py-1.5 text-center text-[9px] uppercase tracking-wide text-(--color-text-secondary)">
          Preview data — connect Supabase to go live
        </div>
      )}

      <AthleteHeader />
      <AthleteSelector
        athletes={athletes}
        selected={selected}
        onSelect={(a) => setSelectedId(a.id)}
      />
      <AthleteHero athlete={selected} />

      <div className="flex gap-2.5 px-4 mt-4">
        <button className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gold-metallic px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-black glow-gold active:scale-[0.98] transition-transform">
          View Full Profile
          <span aria-hidden>→</span>
        </button>
        <button
          aria-label="Follow athlete"
          className="w-13 flex items-center justify-center rounded-lg border border-(--color-gold) bg-(--color-bg-card) text-(--color-gold)"
        >
          🔔
        </button>
      </div>

      <FightHubSection athlete={selected} />
      <AthleteQuickLinks />
      <AthleteAbout athlete={selected} />
    </div>
  )
}
