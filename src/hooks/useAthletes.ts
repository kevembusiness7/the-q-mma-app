import { useEffect, useState } from 'react'
import { ATHLETES } from '../data/athletes'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { AthleteWithFights, FightRecord } from '../types/athlete'

/** "Anna Melisano" -> "anna-melisano" */
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Preenche as fotos que faltam, para nenhum componente precisar adivinhar
 * nome de arquivo.
 *
 * Hoje o Supabase devolve `image_url` nulo e nem o mock tem foto de oponente,
 * embora os PNGs estejam versionados em public/images/athletes.
 *
 * A foto do atleta vem do mock, e não do slug: os dois nem sempre batem — o
 * slug 'ozzy-diaz' usa o arquivo osman-diaz.png. Já a do oponente é derivada
 * do nome, que é a única chave que existe para ele.
 */
function withPhotos(athletes: AthleteWithFights[]): AthleteWithFights[] {
  return athletes.map((athlete) => ({
    ...athlete,
    imageUrl:
      athlete.imageUrl ?? ATHLETES.find((m) => m.slug === athlete.slug)?.imageUrl ?? null,
    lastFight: withOpponentPhoto(athlete.lastFight),
    nextFight: withOpponentPhoto(athlete.nextFight),
  }))
}

function withOpponentPhoto(fight: FightRecord | null): FightRecord | null {
  if (!fight) return null
  return {
    ...fight,
    opponentImageUrl:
      fight.opponentImageUrl ?? `/images/athletes/opp-${slugify(fight.opponentName)}.png`,
  }
}

interface UseAthletesResult {
  athletes: AthleteWithFights[]
  loading: boolean
  error: string | null
  usingMockData: boolean
}

/**
 * Single source of truth for "where does athlete data come from".
 *
 * - If Supabase env vars are set, this queries the real `athletes` +
 *   `fights` tables (see `supabase/schema.sql`) and shapes the result into
 *   `AthleteWithFights[]`.
 * - Otherwise it returns the mock data from `src/data/athletes.ts` so the
 *   UI is fully explorable with zero backend setup.
 *
 * No component should import from `src/data/athletes.ts` or
 * `src/lib/supabase.ts` directly — always go through this hook.
 */
export function useAthletes(): UseAthletesResult {
  const [athletes, setAthletes] = useState<AthleteWithFights[]>(
    isSupabaseConfigured ? [] : withPhotos(ATHLETES),
  )
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: athleteRows, error: athleteError } = await supabase!
        .from('athletes')
        .select('*')
        .order('name')

      if (athleteError) {
        if (!cancelled) {
          setError(athleteError.message)
          setLoading(false)
        }
        return
      }

      const { data: fightRows, error: fightError } = await supabase!
        .from('fights')
        .select('*')
        .order('event_date', { ascending: false })

      if (fightError) {
        if (!cancelled) {
          setError(fightError.message)
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        const shaped = shapeAthletes(athleteRows ?? [], fightRows ?? [])
        setAthletes(withPhotos(shaped))
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { athletes, loading, error, usingMockData: !isSupabaseConfigured }
}

/**
 * Converts raw Supabase rows (snake_case columns, matching schema.sql)
 * into the camelCase `AthleteWithFights` shape the UI expects.
 */
function shapeAthletes(athleteRows: any[], fightRows: any[]): AthleteWithFights[] {
  return athleteRows.map((row) => {
    const athleteFights = fightRows
      .filter((f) => f.athlete_id === row.id)
      .map((f) => ({
        id: f.id,
        athleteId: f.athlete_id,
        opponentName: f.opponent_name,
        opponentRecord: f.opponent_record,
        opponentImageUrl: f.opponent_image_url,
        result: f.result,
        method: f.method,
        round: f.round,
        time: f.time,
        eventName: f.event_name,
        eventDate: f.event_date,
        venue: f.venue,
        city: f.city,
        broadcaster: f.broadcaster,
        isNextFight: f.is_next_fight,
      }))

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      firstName: row.first_name,
      lastName: row.last_name,
      nickname: row.nickname,
      division: row.division,
      organization: row.organization,
      imageUrl: row.image_url,
      imageAlt: row.image_alt ?? row.name,
      age: row.age,
      heightLabel: row.height_label,
      weightLbs: row.weight_lbs,
      reachLabel: row.reach_label,
      record: row.record,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      bio: row.bio ?? '',
      team: row.team,
      headCoach: row.head_coach,
      bornIn: row.born_in,
      fightingOutOf: row.fighting_out_of,
      lastFight: athleteFights.find((f) => !f.isNextFight) ?? null,
      nextFight: athleteFights.find((f) => f.isNextFight) ?? null,
    }
  })
}
