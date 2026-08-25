-- THE Q VAULT — fase 6: lista de itens acompanhados ("Watching" em My Bids).
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase, depois de já ter rodado auction-schema.sql.
-- Pode rodar mais de uma vez sem estragar nada.
--
-- (Winning/Outbid/Won/Lost e os alertas de My Bids não precisam de tabela
-- nova: são recalculados na hora a partir de auction_bids/auction_orders/
-- auction_notifications, que já existem desde as fases 3 e 5.)

create table if not exists auction_watchlist (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references auction_items (id) on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  unique (item_id, user_id)
);

create index if not exists auction_watchlist_user_idx on auction_watchlist (user_id);

alter table auction_watchlist enable row level security;

drop policy if exists "watchlist propria" on auction_watchlist;
create policy "watchlist propria" on auction_watchlist
  for select using (user_id = auth.uid());

drop policy if exists "adiciona na propria watchlist" on auction_watchlist;
create policy "adiciona na propria watchlist" on auction_watchlist
  for insert with check (user_id = auth.uid());

drop policy if exists "remove da propria watchlist" on auction_watchlist;
create policy "remove da propria watchlist" on auction_watchlist
  for delete using (user_id = auth.uid());

-- Confere o resultado
select count(*) as itens_na_tabela from auction_watchlist;
