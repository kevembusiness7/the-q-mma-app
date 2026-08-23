-- Cadastro do Shane "Hollywood" Collins.
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
  'shane-collins',
  'Shane Collins',
  'Shane',
  'Collins',
  'Hollywood',
  'Featherweight',
  'UFC',
  '/images/athletes/shane-collins.png',
  'Shane "Hollywood" Collins',
  26,
  '5''9"',
  146,                -- pesagem foi 145.5 lbs; a coluna é inteira
  '71.0"',
  '8-0-0',
  8,
  0,
  0,
  'Shane "Hollywood" Collins is an undefeated featherweight competing in the UFC, fighting out of Los Angeles, CA. He is 8-0 as a professional, with 5 of those wins coming by knockout or submission.',
  'Team Cobra MMA',   -- a ficha aponta este time, e não THE Q MMA
  null,               -- treinador não informado
  'United States',
  'Los Angeles, CA, USA'
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
where athlete_id = (select id from athletes where slug = 'shane-collins');

insert into fights (
  athlete_id, opponent_name, opponent_record, result, method,
  round, "time", event_name, event_date, venue, city, broadcaster, is_next_fight
) values (
  (select id from athletes where slug = 'shane-collins'),
  'Otari Tanzilovi',
  '10-1',
  'win',
  'Decision · unanimous',
  null,               -- decisão foi aos pontos, não há round/tempo de parada
  null,
  'UFC Fight Night: Kape vs. Horiguchi 2',
  '2026-06-20',
  'Meta APEX',
  'Las Vegas, NV',
  'Paramount+',
  false
);

-- Confere o resultado
select a.name as atleta, a.division, a.record, a.team,
       f.opponent_name as adversario, f.event_name as evento, f.venue, f.city
from athletes a
left join fights f on f.athlete_id = a.id
order by a.name;
