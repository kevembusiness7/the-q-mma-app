-- Recria as políticas do suporte e mostra o que ficou valendo.
--
-- Diagnóstico: um insert anônimo devolveu "new row violates row-level
-- security policy", o que significa RLS ligado e nenhuma política de INSERT
-- aceitando a operação. As tabelas existem, então o script anterior parou
-- entre a criação delas e as políticas.

-- 1. A função que diz quem é admin -----------------------------------------
create or replace function public.eh_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- 2. Chamados ---------------------------------------------------------------
alter table support_tickets enable row level security;

drop policy if exists "abre chamado" on support_tickets;
create policy "abre chamado"
  on support_tickets
  for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "le os proprios chamados" on support_tickets;
create policy "le os proprios chamados"
  on support_tickets
  for select
  to authenticated
  using (user_id = auth.uid() or public.eh_admin());

drop policy if exists "admin atualiza chamado" on support_tickets;
create policy "admin atualiza chamado"
  on support_tickets
  for update
  to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

-- 3. Mensagens --------------------------------------------------------------
alter table support_messages enable row level security;

drop policy if exists "le mensagens do proprio chamado" on support_messages;
create policy "le mensagens do proprio chamado"
  on support_messages
  for select
  to authenticated
  using (
    public.eh_admin()
    or exists (select 1 from support_tickets t
               where t.id = ticket_id and t.user_id = auth.uid())
  );

drop policy if exists "responde no proprio chamado" on support_messages;
create policy "responde no proprio chamado"
  on support_messages
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (
      (public.eh_admin() and is_staff)
      or (not is_staff
          and exists (select 1 from support_tickets t
                      where t.id = ticket_id and t.user_id = auth.uid()))
    )
  );

-- 4. Anexos -----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', false)
on conflict (id) do nothing;

drop policy if exists "envia anexo de suporte" on storage.objects;
create policy "envia anexo de suporte"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'support-attachments');

drop policy if exists "admin le anexo de suporte" on storage.objects;
create policy "admin le anexo de suporte"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'support-attachments' and public.eh_admin());

-- 5. Confere o que ficou valendo -------------------------------------------
select tablename, policyname, cmd, roles
from pg_policies
where tablename in ('support_tickets', 'support_messages')
order by tablename, cmd, policyname;
