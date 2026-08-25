-- Cadastro do Artur "Headhunter" Minev.
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
  'artur-minev',
  'Artur Minev',
  'Artur',
  'Minev',
  'Headhunter',
  'Lightweight',
  'UFC',
  '/images/athletes/artur.png',
  'Artur "Headhunter" Minev',
  22,
  '5''9"',
  155,
  '69.0"',
  '7-1-0',
  7,
  1,
  0,
  'Artur "Headhunter" Minev is a lightweight competing in the UFC, born in Ukraine and fighting out of Wakefield, MA. He won his first seven professional fights, six by knockout or submission, before dropping his UFC debut to Tommy Gantt, and is booked to return this October.',
  'THE Q MMA',
  'Matheus Naccache',
  'Ukraine',
  'Wakefield, MA, USA'
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

-- Última luta e a próxima confirmada. Apaga antes de inserir para a
-- re-execução não empilhar cópias (a tabela fights não tem chave única
-- por luta).
delete from fights
where athlete_id = (select id from athletes where slug = 'artur-minev');

insert into fights (
  athlete_id, opponent_name, opponent_record, result, method,
  round, "time", event_name, event_date, venue, city, broadcaster, is_next_fight
) values
  (
    (select id from athletes where slug = 'artur-minev'),
    'Tommy Gantt',
    '11-0',
    'loss',
    'TKO · punches from back mount',
    'Round 2',
    '2:51',
    'UFC Fight Night',
    '2026-05-16',
    null,             -- local não informado
    null,
    null,
    false
  ),
  (
    (select id from athletes where slug = 'artur-minev'),
    'Francisco Prado',
    '12-5',
    'nc',             -- luta ainda não aconteceu; result é obrigatório na
                       -- coluna mas não é lido pro card de próxima luta
    '',
    null,
    null,
    'UFC Fight Night',
    '2026-10-10',
    null,
    null,
    null,
    true
  );

-- Confere o resultado
select a.slug, a.name, a.division, a.record, count(f.id) as lutas
from athletes a
left join fights f on f.athlete_id = a.id
group by a.id
order by a.name;
