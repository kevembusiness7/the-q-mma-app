import type { AthleteWithFights, FightRecord } from '../types/athlete'

/**
 * MOCK DATA — structured to match `supabase/schema.sql` exactly.
 *
 * This file is the ONLY place that needs to change when you connect a real
 * Supabase project: swap the exported constants below for calls to
 * `src/lib/supabase.ts` (e.g. `supabase.from('athletes').select(...)`).
 * Every component consumes the `Athlete` / `AthleteWithFights` types, not
 * this file directly, so the rest of the app does not need to change.
 */

const dioneLastFight: FightRecord = {
  id: 'fight-dione-01',
  athleteId: 'dione-barbosa',
  opponentName: 'Anna Melisano',
  opponentRecord: '6-1',
  opponentImageUrl: null,
  result: 'win',
  method: 'Submission · standing rear-naked choke',
  round: 'Round 1',
  time: '4:04',
  // Mesmo card do JP: 18/07/2026, Paycom Center. Antes constava UFC APEX em
  // Las Vegas pela ESPN+, o que não batia com a data.
  eventName: 'UFC Fight Night: Du Plessis vs. Usman',
  eventDate: '2026-07-18',
  venue: 'Paycom Center',
  city: 'Oklahoma City, OK',
  broadcaster: 'Paramount+',
  isNextFight: false,
}

const jpLastFight: FightRecord = {
  id: 'fight-jp-last',
  athleteId: 'jp-lebosnoyani',
  opponentName: 'Seok Hyeon Ko',
  opponentRecord: '13-2',
  opponentImageUrl: null,
  result: 'win',
  method: 'Decision · unanimous',
  round: null,
  time: null,
  eventName: 'UFC Fight Night: Du Plessis vs. Usman',
  eventDate: '2026-07-18',
  venue: 'Paycom Center',
  city: 'Oklahoma City, OK',
  broadcaster: 'Paramount+',
  isNextFight: false,
}

const ozzyNextFight: FightRecord = {
  id: 'fight-ozzy-next',
  athleteId: 'ozzy-diaz',
  opponentName: 'Ryan Gandra',
  opponentRecord: '10-1',
  opponentImageUrl: null,
  result: 'nc',
  method: '',
  round: null,
  time: null,
  eventName: 'UFC 331: Van vs. Pantoja 2',
  eventDate: '2026-09-19',
  venue: 'Crypto.com Arena',
  city: 'Los Angeles, CA',
  broadcaster: 'Paramount+',
  isNextFight: true,
}

const ozzyLastFight: FightRecord = {
  id: 'fight-ozzy-last',
  athleteId: 'ozzy-diaz',
  opponentName: 'Ateba Gautier',
  opponentRecord: '10-1',
  opponentImageUrl: null,
  result: 'loss',
  method: 'TKO · punches and elbows',
  round: 'Round 2',
  time: '1:10',
  eventName: 'UFC 328: Chimaev vs. Strickland',
  eventDate: '2026-05-09',
  venue: 'Prudential Center',
  city: 'Newark, NJ',
  broadcaster: 'Paramount+',
  isNextFight: false,
}

export const ATHLETES: AthleteWithFights[] = [
  {
    id: 'dione-barbosa',
    slug: 'dione-barbosa',
    name: 'Dione Barbosa',
    firstName: 'Dione',
    lastName: 'Barbosa',
    nickname: 'The Witch',
    division: 'Flyweight',
    organization: 'UFC',
    imageUrl: '/images/athletes/dione-barbosa.png',
    heroImageUrl: '/images/athletes/dione-barbosa-hero.png',
    imageAlt: 'Dione "The Witch" Barbosa',
    age: 34,
    heightLabel: `5'6"`,
    weightLbs: 125,
    reachLabel: '66.5"',
    record: '10-4-0',
    wins: 10,
    losses: 4,
    draws: 0,
    bio: 'Dione "The Witch" Barbosa is a flyweight competing in the UFC, born in Recife, PE, Brazil and fighting out of Las Vegas, NV. A submission specialist known for her standing guillotine and rear-naked choke finishes, she has won two straight since dropping a decision at UFC 319.',
    team: 'THE Q MMA',
    headCoach: 'Matheus Naccache',
    bornIn: 'Recife, PE, Brazil',
    fightingOutOf: 'Las Vegas, NV, USA',
    lastFight: dioneLastFight,
    nextFight: null,
  },
  {
    id: 'ozzy-diaz',
    slug: 'ozzy-diaz',
    name: 'Osman Diaz',
    firstName: 'Osman',
    lastName: 'Diaz',
    nickname: 'Ozzy',
    division: 'Middleweight',
    organization: 'UFC',
    imageUrl: '/images/athletes/osman-diaz.png',
    heroImageUrl: '/images/athletes/osman-diaz-hero.png',
    imageAlt: 'Osman "Ozzy" Diaz',
    age: 35,
    heightLabel: `6'4"`,
    weightLbs: 186,
    reachLabel: '79.0"',
    record: '10-4-0',
    wins: 10,
    losses: 4,
    draws: 0,
    bio: 'Osman "Ozzy" Diaz is a middleweight competing in the UFC, born and fighting out of Los Angeles, CA. Known for heavy hands and a granite chin, Diaz has finished 8 of his 10 career wins by knockout or TKO.',
    team: 'THE Q MMA',
    headCoach: 'Matheus Naccache',
    bornIn: 'Los Angeles, CA, USA',
    fightingOutOf: 'Los Angeles, CA, USA',
    lastFight: ozzyLastFight,
    nextFight: ozzyNextFight,
  },
  {
    id: 'jp-lebosnoyani',
    slug: 'jp-lebosnoyani',
    name: 'Jean-Paul Lebosnoyani',
    firstName: 'Jean-Paul',
    lastName: 'Lebosnoyani',
    nickname: 'Mufasa',
    division: 'Welterweight',
    organization: 'UFC',
    imageUrl: '/images/athletes/jp-lebosnoyani.png',
    heroImageUrl: '/images/athletes/jp-lebosnoyani-hero.png',
    imageAlt: 'Jean-Paul "Mufasa" Lebosnoyani',
    age: 27,
    heightLabel: `5'11"`,
    weightLbs: 171,
    reachLabel: '72.0"',
    record: '11-2-0',
    wins: 11,
    losses: 2,
    draws: 0,
    bio: 'Jean-Paul "Mufasa" Lebosnoyani is a welterweight competing in the UFC, born and fighting out of Hermosa Beach, CA. A freestyle grappler on a six-fight winning streak, he has finished 8 of his 11 career wins by knockout or submission.',
    team: 'THE Q MMA',
    headCoach: 'Matheus Naccache',
    bornIn: 'Hermosa Beach, CA, USA',
    fightingOutOf: 'Hermosa Beach, CA, USA',
    lastFight: jpLastFight,
    nextFight: null,
  },
]

export function getAthleteBySlug(slug: string): AthleteWithFights | undefined {
  return ATHLETES.find((a) => a.slug === slug)
}
