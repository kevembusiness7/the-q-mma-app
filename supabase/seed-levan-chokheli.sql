-- Cadastro do Levan Chokheli.
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
  'levan-chokheli',
  'Levan Chokheli',
  'Levan',
  'Chokheli',
  '',                 -- sem apelido
  'Welterweight',
  'UFC',
  '/images/athletes/chokheli.png',
  'Levan Chokheli',
  29,
  '5''11"',
  171,                -- pesagem foi 170.5 lbs; a coluna é inteira
  '72.0"',
  '15-3-0',
  15,
  3,
  0,
  'Levan Chokheli is a welterweight competing in the UFC, born in Georgia and fighting out of Tbilisi. A finisher who has ended 12 of his 15 career wins by knockout or submission, he is currently on a two-fight winning streak.',
  'THE Q MMA',
  'Beqa Elibashvili',
  'Georgia',
  'Tbilisi, Georgia'
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
where athlete_id = (select id from athletes where slug = 'levan-chokheli');

insert into fights (
  athlete_id, opponent_name, opponent_record, opponent_image_url, result,
  method, round, "time", event_name, event_date, venue, city, broadcaster,
  is_next_fight
) values (
  (select id from athletes where slug = 'levan-chokheli'),
  'Leon Shahbazyan',
  '12-4',
  '/images/athletes/leon.png',
  'win',
  'TKO · leg kick and punches',
  'Round 1',
  '0:23',
  'UFC Fight Night: Kape vs. Horiguchi 2',
  '2026-06-20',
  'Meta APEX',
  'Las Vegas, NV',
  null,
  false
);

-- Confere o resultado
select a.slug, a.name, a.division, a.record, count(f.id) as lutas
from athletes a
left join fights f on f.athlete_id = a.id
group by a.id
order by a.name;
