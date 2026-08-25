-- THE Q MMA — administração da tela News & Events (CRUD do admin) e limpeza
-- das notícias que agora nascem sozinhas do cartel de cada atleta.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho dele) e cole no
-- SQL Editor do painel do Supabase, depois de já ter rodado theq-schema.sql.
-- Pode rodar mais de uma vez sem estragar nada.

-- 0. Funções de apoio --------------------------------------------------------
-- Recriadas aqui pelo mesmo motivo de sempre (ver promotions-schema.sql):
-- cada schema-file é independente e pode ser a primeira coisa que alguém
-- roda num banco novo.

create or replace function public.toca_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.eh_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- 1. updated_at + gatilho -----------------------------------------------------
-- theq-schema.sql não tinha essa coluna porque a tabela só era lida, nunca
-- editada. Agora que o admin edita, ganha o mesmo rastro das outras tabelas.

alter table news add column if not exists updated_at timestamptz not null default now();

drop trigger if exists news_toca_updated_at on news;
create trigger news_toca_updated_at
  before update on news
  for each row execute function public.toca_updated_at();

-- 2. Permissões de escrita ----------------------------------------------------
-- A leitura pública já existe (theq-schema.sql); só faltava a escrita.

drop policy if exists "admin gerencia noticias" on news;
create policy "admin gerencia noticias"
  on news for all
  using (public.eh_admin())
  with check (public.eh_admin());

-- 3. Bucket público para as fotos das notícias --------------------------------
-- Mesmo desenho de promotion-athlete-photos em promotions-schema.sql: é
-- vitrine pública (qualquer card do feed mostra a foto pra qualquer
-- visitante), então não há por que exigir signed URL.

insert into storage.buckets (id, name, public)
values ('news-photos', 'news-photos', true)
on conflict (id) do nothing;

drop policy if exists "admin sobe foto de noticia" on storage.objects;
create policy "admin sobe foto de noticia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'news-photos' and public.eh_admin());

drop policy if exists "admin atualiza foto de noticia" on storage.objects;
create policy "admin atualiza foto de noticia" on storage.objects
  for update to authenticated
  using (bucket_id = 'news-photos' and public.eh_admin())
  with check (bucket_id = 'news-photos' and public.eh_admin());

-- 4. Limpeza -------------------------------------------------------------------
-- Essas duas notícias eram lançadas à mão em theq-schema.sql, mas agora
-- nascem sozinhas do cartel de cada atleta (última/próxima luta —- ver
-- src/lib/autoNews.ts). Deixá-las aqui duplicaria o card no feed assim que o
-- app for atualizado. O "Open Mat" continua: é conteúdo que nenhum cartel de
-- atleta cobre.

delete from news where slug in ('dione-def-melisano', 'ozzy-vs-gandra');
