-- Cadastro do Nazim "Black Wolf" Sadykhov.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho dele) e cole no
-- SQL Editor do painel do Supabase. A chave anônima do app é só de leitura,
-- então a inserção precisa sair do painel.
--
-- Pode rodar mais de uma vez sem duplicar: o slug é único e o ON CONFLICT
-- atualiza em vez de inserir de novo.

insert into athletes (
  slug, name, first_name, last_name, nickname, division, organization,
  image_url, image_alt, age, height_label, weight_lbs, reach_label,
  record, wins, losses, draws, bio, team, head_coach, born_in, fighting_out_of
) values (
  'nazim-sadykhov',
  'Nazim Sadykhov',
  'Nazim',
  'Sadykhov',
  'Black Wolf',
  'Lightweight',
  'UFC',
  '/images/athletes/nazim-hero.png',
  'Nazim "Black Wolf" Sadykhov',
  32,
  '5''10"',
  156,
  '69.0"',
  '11-3-1',
  11,
  3,
  1,
  'Nazim "Black Wolf" Sadykhov is a lightweight competing in the UFC, born in Azerbaijan and fighting out of Brooklyn, NY. A veteran finisher with 10 of his 11 career wins by knockout or submission, he is working to snap a two-fight skid and get back into the win column.',
  'THE Q MMA',
  'John Wood',
  'Azerbaijan',
  'Brooklyn, New York, USA'
)
on conflict (slug) do update set
  name            = excluded.name,
  first_name      = excluded.first_name,
  last_name       = excluded.last_name,
  nickname        = excluded.nickname,
  division        = excluded.division,
  organization    = excluded.organization,
  image_url       = excluded.image_url,
  image_alt       = excluded.image_alt,
  age             = excluded.age,
  height_label    = excluded.height_label,
  weight_lbs      = excluded.weight_lbs,
  reach_label     = excluded.reach_label,
  record          = excluded.record,
  wins            = excluded.wins,
  losses          = excluded.losses,
  draws           = excluded.draws,
  bio             = excluded.bio,
  team            = excluded.team,
  head_coach      = excluded.head_coach,
  born_in         = excluded.born_in,
  fighting_out_of = excluded.fighting_out_of;

-- Última luta. Apaga antes de inserir para a re-execução não empilhar cópias
-- (a tabela fights não tem chave única por luta).
delete from fights
where athlete_id = (select id from athletes where slug = 'nazim-sadykhov');

insert into fights (
  athlete_id, opponent_name, opponent_record, result, method,
  round, "time", event_name, event_date, venue, city, broadcaster, is_next_fight
) values (
  (select id from athletes where slug = 'nazim-sadykhov'),
  'Matheus Camilo',
  '10-3',
  'loss',
  'TKO · straight right and hammerfists',
  'Round 1',
  '1:31',
  'UFC Fight Night',
  '2026-06-27',
  null,               -- local não informado
  null,
  null,
  false
);

-- Confere o resultado
select a.slug, a.name, a.division, a.record, count(f.id) as lutas
from athletes a
left join fights f on f.athlete_id = a.id
group by a.id
order by a.name;
