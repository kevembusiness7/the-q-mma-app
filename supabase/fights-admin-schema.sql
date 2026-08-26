-- THE Q MMA — administração do cartel de lutas pelo painel (CRUD do admin).
--
-- Até aqui as tabelas athletes/fights (schema.sql) eram só-leitura para o
-- app: toda mudança de cartel exigia rodar SQL na mão (ver os arquivos
-- seed-*.sql). Este arquivo abre a escrita para admins, no mesmo desenho de
-- news-admin-schema.sql, para a nova tela "Fight records" do painel.
--
-- COMO USAR: copie o conteúdo DESTE arquivo e cole no SQL Editor do painel
-- do Supabase, depois de já ter rodado schema.sql. Pode rodar mais de uma
-- vez sem estragar nada.

-- 0. Funções de apoio --------------------------------------------------------
-- Recriadas aqui pelo mesmo motivo de sempre (ver promotions-schema.sql):
-- cada schema-file é independente e pode ser a primeira coisa que alguém
-- roda num banco novo.

create or replace function public.eh_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- 1. Escrita nas lutas --------------------------------------------------------
-- A leitura pública já existe (schema.sql); só faltava a escrita.

drop policy if exists "admin gerencia lutas" on fights;
create policy "admin gerencia lutas"
  on fights for all
  using (public.eh_admin())
  with check (public.eh_admin());

-- 2. Atualização do cartel do atleta ------------------------------------------
-- Registrar um resultado normalmente muda o record (10-4-0 -> 11-4-0). O
-- admin só precisa de UPDATE: criar/apagar atleta continua fora do painel
-- de propósito -- envolve fotos versionadas no repositório e seeds, não é
-- operação de rotina.

drop policy if exists "admin atualiza cartel do atleta" on athletes;
create policy "admin atualiza cartel do atleta"
  on athletes for update
  using (public.eh_admin())
  with check (public.eh_admin());

-- 3. Uma luta futura por atleta -----------------------------------------------
-- O app inteiro assume "a próxima luta" no singular (useAthletes pega a
-- primeira com is_next_fight). O índice parcial garante isso no banco, no
-- mesmo espírito do índice de pedido-ativo-único em visitor-schema.sql:
-- livre de corrida, impossível de burlar pelo cliente.

create unique index if not exists fights_one_next_per_athlete_idx
  on fights (athlete_id)
  where is_next_fight;

-- Confere o resultado ---------------------------------------------------------
select 'fights' as tabela, count(*) as linhas from fights
union all
select 'athletes', count(*) from athletes;
