/** Perfil completo do atleta — a tela que abre em "View full profile". */

export interface Bout {
  /** 'W' vitória, 'L' derrota, 'D' empate, '?' sem resultado (no contest). */
  result: 'W' | 'L' | 'D' | '?';
  opponent: string;
  /** Cartel do adversário na época. */
  opponentRecord: string;
  method: string;
  /** "R1 4:04" ou "3 rounds". */
  time: string;
  /** Evento e data. */
  card: string;
}

export interface ScheduledBout {
  opponent: string;
  opponentRecord: string;
  myRecord: string;
  division: string;
  when: string;
  /** Só nas lutas já realizadas. */
  result?: 'win' | 'loss';
  method?: string;
  time?: string;
  venue?: string;
  city?: string;
  broadcaster?: string;
}

export interface FighterProfile {
  slug: string;
  name: string;
  nickname: string;
  record: string;
  age: number;
  /** Abreviação usada no cabeçalho: FLY, MW. */
  divisionShort: string;
  /** Código ISO do país de origem — vira a bandeira de fundo do topo. */
  country: 'br' | 'us';
  /** Foto recortada, fundo transparente, para o topo da tela. */
  photo: string;
  /** Pares rótulo/valor da aba Profile. */
  bio: [string, string][];
  nextFight?: ScheduledBout;
  lastFight?: ScheduledBout;
  record_list: Bout[];
}

export const fighters: FighterProfile[] = [
  {
    slug: 'dione-barbosa',
    name: 'Dione Barbosa',
    nickname: '"The Witch"',
    record: '10-4-0',
    age: 34,
    divisionShort: 'FLY',
    country: 'br',
    photo: '/images/athletes/dione-barbosa-profile.png',
    bio: [
      ['Nickname', 'The Witch'],
      ['Full name', 'Dione Barbosa Murphy'],
      ['Age', '34 years old · May 8, 1992'],
      ['Height', '5\'6" · 66.5" reach'],
      ['Weight class', 'Flyweight'],
      ['Born in', 'Recife, PE, Brazil'],
      ['Fighting out of', 'Las Vegas, NV, USA'],
      ['Head coach', 'Matheus Naccache'],
      ['Current streak', '2 wins'],
    ],
    lastFight: {
      opponent: 'Anna Melisano',
      opponentRecord: '6-1',
      myRecord: '10-4',
      division: 'UFC Fight Night: Du Plessis vs. Usman · Flyweight',
      when: 'Jul 18, 2026',
      result: 'win',
      method: 'Submission · standing rear-naked choke',
      time: 'R1 4:04',
      venue: 'Paycom Center',
      city: 'Oklahoma City, OK',
      broadcaster: 'Paramount+',
    },
    record_list: [
      { result: 'W', opponent: 'Anna Melisano', opponentRecord: '6-1', method: 'Submission · standing rear-naked choke', time: 'R1 4:04', card: 'UFC Fight Night: Du Plessis vs. Usman · Jul 18, 2026' },
      { result: 'W', opponent: 'Melissa Gatto', opponentRecord: '9-2-2', method: 'Decision · majority', time: '3 rounds', card: 'UFC Fight Night · Apr 4, 2026' },
      { result: 'L', opponent: 'Karine Silva', opponentRecord: '18-5', method: 'Decision · unanimous', time: '3 rounds', card: 'UFC 319: Du Plessis vs. Chimaev · Aug 16, 2025' },
      { result: 'W', opponent: 'Diana Belbiță', opponentRecord: '15-9', method: 'Submission · arm triangle', time: 'R1 4:13', card: 'UFC Fight Night · Apr 5, 2025' },
      { result: 'L', opponent: 'Miranda Maverick', opponentRecord: '13-5', method: 'Decision · unanimous', time: '3 rounds', card: 'UFC Fight Night · Jul 20, 2024' },
      { result: 'W', opponent: 'Ernesta Kareckaite', opponentRecord: '5-0-1', method: 'Decision · unanimous', time: '3 rounds', card: 'UFC 301: Pantoja vs. Erceg · May 4, 2024' },
      { result: 'W', opponent: 'Rainn Guerrero', opponentRecord: '5-1', method: 'Submission · armlock', time: 'R1 4:35', card: 'Contender Series 2023 · Sep 5, 2023' },
      { result: 'W', opponent: 'Jessica Middleton', opponentRecord: '5-6', method: 'Decision · unanimous', time: '3 rounds', card: 'LFA 152: Valente vs. Bekoev · Feb 10, 2023' },
      { result: 'W', opponent: 'Mariana Piccolo', opponentRecord: '1-1', method: 'Decision · unanimous', time: '3 rounds', card: 'LFA 148: Leyva vs. Brown · Dec 9, 2022' },
      { result: 'L', opponent: 'Jena Bishop', opponentRecord: '1-0', method: 'Decision · unanimous', time: '3 rounds', card: 'LFA 118: Askar vs. Gomes · Nov 12, 2021' },
      { result: 'L', opponent: 'Josiane Nunes', opponentRecord: '5-1', method: 'Knockout · punches', time: 'R2 4:36', card: 'Katana Fight 10 · Dec 7, 2019' },
      { result: 'W', opponent: 'Karine Silva', opponentRecord: '9-3', method: 'Decision · unanimous', time: '3 rounds', card: 'Katana Fight 9 · May 4, 2019' },
      { result: 'W', opponent: 'Ana Paula', opponentRecord: '0-2', method: 'Submission · rear-naked choke', time: 'R1 3:31', card: 'Katana Fight 5 · Jul 21, 2018' },
      { result: 'W', opponent: 'Cristmi Niero', opponentRecord: '2-1', method: 'Submission · armlock', time: 'R1 2:27', card: 'Federação Fight 8 · Jul 7, 2018' },
    ],
  },
  {
    slug: 'ozzy-diaz',
    name: 'Osman Diaz',
    nickname: '"Ozzy"',
    record: '10-4-0',
    age: 35,
    divisionShort: 'MW',
    country: 'us',
    photo: '/images/athletes/osman-diaz-profile.png',
    bio: [
      ['Nickname', 'Ozzy'],
      ['Full name', 'Osman Manfredo Diaz'],
      ['Age', '35 years old · Nov 22, 1990'],
      ['Height', '6\'4" · 79.0" reach'],
      ['Weight class', 'Middleweight'],
      ['Born in', 'Los Angeles, CA, USA'],
      ['Fighting out of', 'Los Angeles, CA, USA'],
      ['Head coach', 'Matheus Naccache'],
      ['Current streak', '1 loss'],
    ],
    nextFight: {
      opponent: 'Ryan Gandra',
      opponentRecord: '10-1',
      myRecord: '10-4',
      division: 'UFC 331 · Middleweight',
      when: 'Sep 19, 2026',
      venue: 'Crypto.com Arena',
      city: 'Los Angeles, CA',
      broadcaster: 'Paramount+',
    },
    lastFight: {
      opponent: 'Ateba Gautier',
      opponentRecord: '10-1',
      myRecord: '10-3',
      division: 'UFC 328 · Middleweight',
      when: 'May 9, 2026',
      result: 'loss',
      method: 'TKO · punches and elbows',
      time: 'R2 1:10',
      venue: 'Prudential Center',
      city: 'Newark, NJ',
      broadcaster: 'Paramount+',
    },
    record_list: [
      { result: 'L', opponent: 'Ateba Gautier', opponentRecord: '10-1', method: 'TKO · punches and elbows', time: 'R2 1:10', card: 'UFC 328: Chimaev vs. Strickland · May 9, 2026' },
      { result: 'W', opponent: 'Djorden Santos', opponentRecord: '9-3', method: 'Decision · unanimous', time: '3 rounds', card: 'UFC 313: Pereira vs. Ankalaev · Mar 8, 2025' },
      { result: 'L', opponent: 'Mingyang Zhang', opponentRecord: '9-2', method: 'TKO · elbow and ground punches', time: 'R1 2:25', card: 'UFC Fight Night · Nov 23, 2024' },
      { result: 'W', opponent: 'Bevon Lewis', opponentRecord: '8-2', method: 'TKO · left hook and ground strikes', time: 'R2 3:24', card: 'LFA 184: Diaz vs. Lewis · May 17, 2024' },
      { result: 'W', opponent: 'Chuck Campbell', opponentRecord: '7-2', method: 'TKO · flying knee and punches', time: 'R1 4:59', card: 'LFA 178: Satybaldiev vs. Assis · Mar 8, 2024' },
      { result: 'L', opponent: 'Joe Pyfer', opponentRecord: '7-1', method: 'TKO · left hook and ground strikes', time: 'R2 1:39', card: 'Contender Series 2022 · Jul 26, 2022' },
      { result: 'W', opponent: 'Bruno Assis', opponentRecord: '6-1', method: 'TKO · punches', time: 'R1 4:53', card: 'LFA 127: Diaz vs. Assis · Mar 25, 2022' },
      { result: 'W', opponent: 'Moses Murrietta', opponentRecord: '5-1', method: 'KO/TKO', time: 'R2 1:54', card: 'LXF 6 · Oct 30, 2021' },
      { result: 'W', opponent: 'Logan Woods', opponentRecord: '4-1', method: 'TKO · punches', time: 'R1 1:36', card: 'LFA 94: Demopoulos vs. Godinez · Oct 30, 2020' },
      { result: 'W', opponent: 'Andre Walker', opponentRecord: '3-1', method: 'Submission · rear-naked choke', time: 'R1 3:05', card: 'Bellator 228 · Sep 28, 2019' },
      { result: 'W', opponent: 'Christopher Reyes', opponentRecord: '2-1', method: 'KO/TKO', time: 'R1 4:15', card: 'Bellator 214 · Jan 26, 2019' },
      { result: 'L', opponent: 'Santiago Diaz', opponentRecord: '2-0', method: 'KO/TKO', time: 'R1 0:15', card: 'Fight Club OC · Feb 15, 2018' },
      { result: 'W', opponent: 'Saad Ul-Hasan', opponentRecord: '1-0', method: 'KO/TKO', time: 'R2 1:54', card: 'Fight Club OC · Dec 7, 2017' },
      { result: 'W', opponent: 'Leon Klee', opponentRecord: '0-0', method: 'Submission · rear-naked choke', time: 'R1 2:31', card: 'KOTC: Sanctioned · Jun 14, 2015' },
    ],
  },
  {
    slug: 'jp-lebosnoyani',
    name: 'Jean-Paul Lebosnoyani',
    nickname: '"Mufasa"',
    record: '11-2-0',
    age: 27,
    divisionShort: 'WW',
    country: 'us',
    photo: '/images/athletes/jp-lebosnoyani-profile.png',
    bio: [
      ['Nickname', 'Mufasa'],
      ['Full name', 'Jean-Paul Lebosnoyani'],
      ['Age', '27 years old · Jan 27, 1999'],
      ['Height', '5\'11" · 72.0" reach'],
      ['Weight class', 'Welterweight'],
      ['Born in', 'Hermosa Beach, CA, USA'],
      ['Fighting out of', 'Hermosa Beach, CA, USA'],
      ['Foundation style', 'Freestyle'],
      ['Head coach', 'Matheus Naccache'],
      ['Current streak', '6 wins'],
    ],
    lastFight: {
      opponent: 'Seok Hyeon Ko',
      opponentRecord: '13-2',
      myRecord: '11-2',
      division: 'UFC Fight Night: Du Plessis vs. Usman · Welterweight',
      venue: 'Paycom Center',
      city: 'Oklahoma City, OK',
      broadcaster: 'Paramount+',
      when: 'Jul 18, 2026',
      result: 'win',
      method: 'Decision · unanimous',
      time: '3 rounds',
    },
    /* Só as lutas profissionais de MMA. As duas de grappling do Combat
       Jiu-Jitsu Worlds e os três combates cancelados ficaram de fora — não
       entram no cartel, e a soma aqui bate com o 11-2-0. */
    record_list: [
      { result: 'W', opponent: 'Seok Hyeon Ko', opponentRecord: '13-2', method: 'Decision · unanimous', time: '3 rounds', card: 'UFC Fight Night: Du Plessis vs. Usman · Jul 18, 2026' },
      { result: 'W', opponent: 'Phil Rowe', opponentRecord: '11-6', method: 'Decision · split', time: '3 rounds', card: 'UFC Fight Night · Feb 21, 2026' },
      { result: 'W', opponent: 'Jack Congdon', opponentRecord: '7-1', method: 'TKO · head kick and right hook', time: 'R1 1:08', card: 'Contender Series 2025 · Sep 2, 2025' },
      { result: 'W', opponent: 'Kegan Gennrich', opponentRecord: '9-3', method: 'Submission · triangle choke', time: 'R1 4:00', card: 'LFA 206: Gennrich vs. Lebosnoyani · Apr 11, 2025' },
      { result: 'W', opponent: 'Victor Kuiks', opponentRecord: '5-1', method: 'Decision · unanimous', time: '3 rounds', card: 'LFA 184: Diaz vs. Lewis · May 17, 2024' },
      { result: 'W', opponent: 'Adam Wamsley', opponentRecord: '4-3', method: 'TKO · ground strikes', time: 'R1 3:46', card: 'LFA 178: Satybaldiev vs. Assis · Mar 8, 2024' },
      { result: 'L', opponent: 'JaCobi Jones', opponentRecord: '5-1', method: 'TKO · referee stoppage', time: 'R2 2:18', card: 'LFA 158: Lebosnoyani vs. Jones · May 19, 2023' },
      { result: 'W', opponent: 'Caleb Hall', opponentRecord: '4-0', method: 'Submission · scarf hold armlock', time: 'R1 1:21', card: 'LFA 137: Gibson vs. Amil · Jul 29, 2022' },
      { result: 'W', opponent: 'Devon Brock', opponentRecord: '7-4', method: 'Submission · triangle choke', time: 'R1 2:49', card: 'LXF 6 · Oct 30, 2021' },
      { result: 'W', opponent: 'Richard Santos', opponentRecord: '1-1', method: 'Submission · guillotine choke', time: 'R1 1:14', card: 'LFA 105: Rodriguez vs. Gotsyk · Apr 23, 2021' },
      { result: 'L', opponent: 'Spike Carlyle', opponentRecord: '7-1', method: 'TKO · punches', time: 'R1 1:50', card: 'LXF 4 · Nov 15, 2019' },
      { result: 'W', opponent: 'Skyler Hicks', opponentRecord: '0-1', method: 'TKO · punches', time: 'R1 2:10', card: 'LFA 69: Pérez vs. Moreno · Jun 7, 2019' },
      { result: 'W', opponent: 'Eugene Cacho', opponentRecord: '0-1', method: 'Submission · triangle choke', time: 'R2 3:14', card: 'LFA 54: Mazo vs. Yariwaki · Nov 16, 2018' },
    ],
  },
  {
    slug: 'shane-collins',
    name: 'Shane Collins',
    nickname: '"Hollywood"',
    record: '8-0-0',
    age: 26,
    divisionShort: 'FW',
    country: 'us',
    photo: '/images/athletes/shane-collins-profile.png',
    bio: [
      ['Nickname', 'Hollywood'],
      ['Full name', 'Shane Scott Collins'],
      ['Age', '26 years old · Mar 8, 2000'],
      ['Height', '5\'9" · 71.0" reach'],
      ['Weight class', 'Featherweight'],
      ['Born in', 'United States'],
      ['Fighting out of', 'Los Angeles, CA, USA'],
      ['Head coach', 'Matheus Naccache'],
      ['Current streak', '8 wins'],
    ],
    lastFight: {
      opponent: 'Otari Tanzilovi',
      opponentRecord: '10-1',
      myRecord: '8-0',
      division: 'UFC Fight Night: Kape vs. Horiguchi 2 · Featherweight',
      when: 'Jun 20, 2026',
      result: 'win',
      method: 'Decision · unanimous',
      time: '3 rounds',
      venue: 'Meta APEX',
      city: 'Las Vegas, NV',
      broadcaster: 'Paramount+',
    },
    /* Só as lutas profissionais. Os cinco combates cancelados e todo o cartel
       amador ficaram de fora — inclusive as duas derrotas amadoras, que não
       entram no 8-0-0 profissional. */
    record_list: [
      { result: 'W', opponent: 'Otari Tanzilovi', opponentRecord: '10-1', method: 'Decision · unanimous', time: '3 rounds', card: 'UFC Fight Night: Kape vs. Horiguchi 2 · Jun 20, 2026' },
      { result: 'W', opponent: 'Talon Hammons', opponentRecord: '6-2', method: 'TKO · punch', time: 'R1 1:43', card: 'Urijah Faber\'s A1 Combat 35 · May 2, 2026' },
      { result: 'W', opponent: 'Tyler Miller', opponentRecord: '3-6', method: 'KO/TKO', time: 'R1 1:11', card: '559 Fights 120 · Jan 9, 2026' },
      { result: 'W', opponent: 'Eli Evangelista', opponentRecord: '4-0', method: 'Decision · unanimous', time: '3 rounds', card: 'Urijah Faber\'s A1 Combat 31 · Oct 10, 2025' },
      { result: 'W', opponent: 'Kody Vogels', opponentRecord: '6-2', method: 'TKO · strikes', time: 'R1 1:22', card: 'Urijah Faber\'s A1 Combat 28 · Jun 20, 2025' },
      { result: 'W', opponent: 'James Guidry', opponentRecord: '4-2', method: 'Submission · guillotine choke', time: 'R2 4:02', card: 'Urijah Faber\'s A1 Combat 26 · Feb 7, 2025' },
      { result: 'W', opponent: 'Saifulla Dashlakaev', opponentRecord: '0-0', method: 'Decision · split', time: '3 rounds', card: 'LXF 20 · Oct 26, 2024' },
      { result: 'W', opponent: 'Sal Bruno', opponentRecord: '2-2', method: 'KO/TKO', time: 'R2 4:59', card: 'Urijah Faber\'s A1 Combat 21 · May 25, 2024' },
    ],
  },
];
