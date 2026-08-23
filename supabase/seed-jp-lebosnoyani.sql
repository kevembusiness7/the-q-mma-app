-- Cadastro do Jean-Paul "Mufasa" Lebosnoyani.
--
-- Rode no SQL Editor do painel do Supabase. A chave anônima do app não tem
-- permissão de escrita (o RLS bloqueia, e é assim que deve ser), então esta
-- inserção precisa sair do painel.
--
-- Pode rodar mais de uma vez sem duplicar: o slug é único e o ON CONFLICT
-- atualiza em vez de inserir de novo.

insert into athletes (
  slug, name, first_name, last_name, nickname, division, organization,
  image_url, image_alt, age, height_label, weight_lbs, reach_label,
  record, wins, losses, draws, bio, team, head_coach, born_in, fighting_out_of
) values (
  'jp-lebosnoyani',
  'Jean-Paul Lebosnoyani',
  'Jean-Paul',
  'Lebosnoyani',
  'Mufasa',
  'Welterweight',
  'UFC',
  '/images/athletes/jp-lebosnoyani.png',
  'Jean-Paul "Mufasa" Lebosnoyani',
  27,
  '5''11"',
  171,
  '72.0"',
  '11-2-0',
  11,
  2,
  0,
  'Jean-Paul "Mufasa" Lebosnoyani is a welterweight competing in the UFC, born and fighting out of Hermosa Beach, CA. A freestyle grappler on a six-fight winning streak, he has finished 8 of his 11 career wins by knockout or submission.',
  'THE Q MMA',
  'Matheus Naccache',
  'Hermosa Beach, CA, USA',
  'Hermosa Beach, CA, USA'
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
where athlete_id = (select id from athletes where slug = 'jp-lebosnoyani');

insert into fights (
  athlete_id, opponent_name, opponent_record, result, method,
  round, "time", event_name, event_date, venue, city, broadcaster, is_next_fight
) values (
  (select id from athletes where slug = 'jp-lebosnoyani'),
  'Seok Hyeon Ko',
  '13-2',
  'win',
  'Decision · unanimous',
  null,               -- decisão foi aos pontos, não há round/tempo de parada
  null,
  'UFC Fight Night: Du Plessis vs. Usman',
  '2026-07-18',
  null,               -- só a cidade foi informada, sem o nome da arena
  'Oklahoma City, OK',
  null,               -- emissora não informada
  false
);

-- Confere o resultado
select a.slug, a.name, a.division, a.record, count(f.id) as lutas
from athletes a
left join fights f on f.athlete_id = a.id
group by a.id
order by a.name;
