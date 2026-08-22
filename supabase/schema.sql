-- THE Q MMA — Supabase schema
--
-- How to use:
--   1. Create a project at https://supabase.com (free tier is enough).
--   2. Open the SQL Editor in your project dashboard.
--   3. Paste this whole file in and run it.
--   4. Copy your project URL + anon key (Settings → API) into `.env.local`
--      (see `.env.example` in the project root).
--
-- This mirrors `src/types/athlete.ts` field-for-field. If you add a column
-- here, add the matching field there and in `src/hooks/useAthletes.ts`.

create extension if not exists "pgcrypto";

create table if not exists athletes (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  first_name       text not null,
  last_name        text not null,
  nickname         text not null,
  division         text not null,
  organization     text not null default 'UFC',
  image_url        text,
  image_alt        text,
  age              int not null,
  height_label     text not null,
  weight_lbs       int not null,
  reach_label      text not null,
  record           text not null,
  wins             int not null default 0,
  losses           int not null default 0,
  draws            int not null default 0,
  bio              text,
  team             text not null default 'THE Q MMA',
  head_coach       text,
  born_in          text,
  fighting_out_of  text,
  created_at       timestamptz not null default now()
);

create type fight_result as enum ('win', 'loss', 'draw', 'nc');

create table if not exists fights (
  id                  uuid primary key default gen_random_uuid(),
  athlete_id          uuid not null references athletes (id) on delete cascade,
  opponent_name       text not null,
  opponent_record     text,
  opponent_image_url  text,
  result              fight_result not null,
  method              text not null default '',
  round               text,
  time                text,
  event_name          text not null,
  event_date          date not null,
  venue               text,
  city                text,
  broadcaster         text,
  is_next_fight       boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists fights_athlete_id_idx on fights (athlete_id);
create index if not exists fights_event_date_idx on fights (event_date desc);

-- Row Level Security: public read, no public writes.
-- (Admin writes should go through a service-role key from a trusted
-- server context — e.g. an admin panel with its own auth — not the
-- public anon key used by this app.)
alter table athletes enable row level security;
alter table fights enable row level security;

create policy "Public can read athletes"
  on athletes for select
  using (true);

create policy "Public can read fights"
  on fights for select
  using (true);

-- Seed data matching src/data/athletes.ts, so a fresh Supabase project
-- shows the same roster the mock-data preview does.
insert into athletes (slug, name, first_name, last_name, nickname, division, organization, age, height_label, weight_lbs, reach_label, record, wins, losses, draws, bio, team, head_coach, born_in, fighting_out_of)
values
  ('dione-barbosa', 'Dione Barbosa', 'Dione', 'Barbosa', 'The Witch', 'Flyweight', 'UFC', 34, '5''6"', 125, '66.5"', '10-4-0', 10, 4, 0,
   'Dione "The Witch" Barbosa is a flyweight competing in the UFC, born in Recife, PE, Brazil and fighting out of Las Vegas, NV. A submission specialist known for her standing guillotine and rear-naked choke finishes, she has won two straight since dropping a decision at UFC 319.',
   'THE Q MMA', 'Matheus Naccache', 'Recife, PE, Brazil', 'Las Vegas, NV, USA'),
  ('ozzy-diaz', 'Osman Diaz', 'Osman', 'Diaz', 'Ozzy', 'Middleweight', 'UFC', 35, '6''4"', 186, '79.0"', '10-4-0', 10, 4, 0,
   'Osman "Ozzy" Diaz is a middleweight competing in the UFC, born and fighting out of Los Angeles, CA. Known for heavy hands and a granite chin, Diaz has finished 8 of his 10 career wins by knockout or TKO.',
   'THE Q MMA', 'Matheus Naccache', 'Los Angeles, CA, USA', 'Los Angeles, CA, USA')
on conflict (slug) do nothing;

insert into fights (athlete_id, opponent_name, opponent_record, result, method, round, time, event_name, event_date, venue, city, broadcaster, is_next_fight)
select id, 'Anna Melisano', '6-1', 'win', 'Submission · standing rear-naked choke', 'Round 1', '4:04', 'UFC Fight Night', '2026-07-18', 'UFC APEX', 'Las Vegas, NV', 'ESPN+', false
from athletes where slug = 'dione-barbosa';

insert into fights (athlete_id, opponent_name, opponent_record, result, method, round, time, event_name, event_date, venue, city, broadcaster, is_next_fight)
select id, 'Ateba Gautier', '10-1', 'loss', 'TKO · punches and elbows', 'Round 2', '1:10', 'UFC 328: Chimaev vs. Strickland', '2026-05-09', null, null, null, false
from athletes where slug = 'ozzy-diaz';

insert into fights (athlete_id, opponent_name, opponent_record, result, method, round, time, event_name, event_date, venue, city, broadcaster, is_next_fight)
select id, 'Ryan Gandra', '10-1', 'nc', '', null, null, 'UFC 331: Van vs. Pantoja 2', '2026-09-19', 'Crypto.com Arena', 'Los Angeles, CA', 'Paramount+', true
from athletes where slug = 'ozzy-diaz';
