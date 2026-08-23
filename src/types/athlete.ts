/**
 * These types mirror the shape of the `athletes`, `fights`, and related
 * tables defined in `supabase/schema.sql`. Keeping the frontend types and
 * the SQL schema in lockstep means swapping the mock data source in
 * `src/data/athletes.ts` for a real Supabase query (see `src/lib/supabase.ts`)
 * requires no changes to any component.
 */

export type FightResult = 'win' | 'loss' | 'draw' | 'nc'

export interface FightRecord {
  id: string
  athleteId: string
  opponentName: string
  opponentRecord: string | null
  opponentImageUrl: string | null
  result: FightResult
  method: string
  round: string | null
  time: string | null
  eventName: string
  eventDate: string // ISO date
  venue: string | null
  city: string | null
  broadcaster: string | null
  isNextFight: boolean
}

export interface Athlete {
  id: string
  slug: string
  name: string
  firstName: string
  lastName: string
  nickname: string
  division: string
  organization: string // e.g. "UFC", "THE Q MMA"
  /** Foto usada nos cards do Fight Hub. */
  imageUrl: string | null
  /**
   * Foto só do hero da aba Athletes, quando o atleta tem uma pose diferente
   * para o destaque. Nulo usa a `imageUrl`; se o arquivo não existir, o hero
   * também cai de volta nela.
   */
  heroImageUrl: string | null
  imageAlt: string
  age: number
  heightLabel: string // e.g. "5'6\""
  weightLbs: number
  reachLabel: string // e.g. "66.5\""
  record: string // e.g. "10-4-0"
  wins: number
  losses: number
  draws: number
  bio: string
  team: string
  headCoach: string | null
  bornIn: string | null
  fightingOutOf: string | null
}

export interface AthleteWithFights extends Athlete {
  lastFight: FightRecord | null
  nextFight: FightRecord | null
}

