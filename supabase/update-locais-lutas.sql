-- Preenche local e emissora das últimas lutas do JP e do Ozzy.
--
-- Rode no SQL Editor do painel do Supabase. A chave anônima do app é só de
-- leitura, então esta atualização precisa sair do painel.
--
-- Pode rodar mais de uma vez: são UPDATEs idempotentes, filtrados pelo atleta
-- e pelo nome do adversário.

-- JP Lebosnoyani vs. Seok Hyeon Ko — a cidade já estava preenchida.
update fights
set venue       = 'Paycom Center',
    broadcaster = 'Paramount+'
where athlete_id = (select id from athletes where slug = 'jp-lebosnoyani')
  and opponent_name = 'Seok Hyeon Ko';

-- Ozzy Diaz vs. Ateba Gautier — estava com local e emissora nulos.
update fights
set venue       = 'Prudential Center',
    city        = 'Newark, NJ',
    broadcaster = 'Paramount+'
where athlete_id = (select id from athletes where slug = 'ozzy-diaz')
  and opponent_name = 'Ateba Gautier';

-- Dione Barbosa vs. Anna Melisano — mesma data e mesmo card do JP. Constava
-- UFC APEX em Las Vegas pela ESPN+, o que não batia com o evento.
update fights
set event_name  = 'UFC Fight Night: Du Plessis vs. Usman',
    venue       = 'Paycom Center',
    city        = 'Oklahoma City, OK',
    broadcaster = 'Paramount+'
where athlete_id = (select id from athletes where slug = 'dione-barbosa')
  and opponent_name = 'Anna Melisano';

-- Confere o resultado
select a.name as atleta,
       f.opponent_name as adversario,
       f.event_name as evento,
       f.venue, f.city, f.broadcaster
from fights f
join athletes a on a.id = f.athlete_id
order by f.event_date desc;
