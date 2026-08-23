import { useState } from 'react'
import { useAthletes } from '../hooks/useAthletes'
import { useNav } from '../context/NavigationContext'
import { AthleteHeader } from '../components/athletes/AthleteHeader'
import { AthleteSelector } from '../components/athletes/AthleteSelector'
import { AthleteHero } from '../components/athletes/AthleteHero'
import { FightHubSection } from '../components/athletes/FightHubSection'
import { AthleteAbout } from '../components/athletes/AthleteAbout'

export function AthletesPage() {
  const { athletes, loading, error, usingMockData } = useAthletes()
  const { openOverlay } = useNav()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = athletes.find((a) => a.id === selectedId) ?? athletes[0]

  /* O header entra também nos estados de carregando/erro/vazio: sem a barra
     de abas ele é o único caminho de volta, e sem isso essas telas viram
     beco sem saída quando o Supabase demora ou falha. */
  if (loading || error || !selected) {
    return (
      <div className="bg-honeycomb">
        <AthleteHeader />
        {loading ? (
          <p className="px-4 pt-10 text-center text-sm text-(--color-text-secondary)">
            Loading roster…
          </p>
        ) : error ? (
          <p className="px-4 pt-10 text-center text-sm text-red-400">
            Couldn't load athletes: {error}
          </p>
        ) : (
          <p className="px-4 pt-10 text-center text-sm text-(--color-text-secondary)">
            No athletes on the roster yet.
          </p>
        )}
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
        <button
          type="button"
          onClick={() => openOverlay({ name: 'fighter', slug: selected.slug })}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gold-metallic px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-black glow-gold active:scale-[0.98] transition-transform"
        >
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
      <AthleteAbout athlete={selected} />
    </div>
  )
}
