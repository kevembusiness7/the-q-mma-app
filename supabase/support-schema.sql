-- Help & Support: chamados, respostas e anexos.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase. Depende do auth-schema.sql, que cria
-- `profiles` e a coluna is_admin.
--
-- Pode rodar mais de uma vez sem estragar nada.

-- 1. Tipos ------------------------------------------------------------------

do $$ begin
  create type ticket_status as enum ('new', 'in_progress', 'resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_category as enum
    ('question', 'payment', 'technical', 'account', 'suggestion', 'other');
exception when duplicate_object then null; end $$;

-- 2. Chamados ---------------------------------------------------------------
-- user_id é opcional de propósito: uma das categorias é justamente problema
-- com a conta, e exigir login para pedir ajuda deixaria de fora quem não
-- consegue entrar.

create table if not exists support_tickets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete set null,
  name            text not null,
  email           text not null,
  category        ticket_category not null,
  message         text not null,
  screenshot_path text,
  status          ticket_status not null default 'new',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists support_tickets_user_idx on support_tickets (user_id);
create index if not exists support_tickets_status_idx on support_tickets (status, created_at desc);

-- 3. Conversa ---------------------------------------------------------------

create table if not exists support_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references support_tickets on delete cascade,
  author_id  uuid references auth.users on delete set null,
  is_staff   boolean not null default false,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_ticket_idx on support_messages (ticket_id, created_at);

-- 4. Quem é admin -----------------------------------------------------------
-- Função separada para não repetir o subselect em toda política. SECURITY
-- DEFINER porque a política de profiles só deixa a pessoa ler o próprio
-- perfil, e aqui precisamos consultar em nome do sistema.

create or replace function public.eh_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- 5. Políticas dos chamados -------------------------------------------------

alter table support_tickets enable row level security;

-- Abrir chamado: qualquer um, logado ou não. Quem está logado só pode gravar
-- em seu próprio nome — não dá para abrir chamado se passando por outro.
--
-- ATENÇÃO: pedidos-schema.sql redefine esta política para também exigir que
-- o pedido citado seja de quem envia. Se você rodar este arquivo depois
-- daquele, rode pedidos-schema.sql de novo — senão a trava do pedido some.
drop policy if exists "abre chamado" on support_tickets;
create policy "abre chamado" on support_tickets
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- Ler: o dono vê os seus, o admin vê todos. Anônimo não lê nada — por isso o
-- formulário mostra o protocolo na hora do envio.
drop policy if exists "le os proprios chamados" on support_tickets;
create policy "le os proprios chamados" on support_tickets
  for select to authenticated
  using (user_id = auth.uid() or public.eh_admin());

-- Mudar status: só admin.
drop policy if exists "admin atualiza chamado" on support_tickets;
create policy "admin atualiza chamado" on support_tickets
  for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- 6. Políticas das mensagens ------------------------------------------------

alter table support_messages enable row level security;

drop policy if exists "le mensagens do proprio chamado" on support_messages;
create policy "le mensagens do proprio chamado" on support_messages
  for select to authenticated
  using (
    public.eh_admin()
    or exists (
      select 1 from support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

-- Responder: o dono do chamado responde como cliente; o admin, como equipe.
-- A checagem de is_staff impede alguém marcar a própria resposta como oficial.
drop policy if exists "responde no proprio chamado" on support_messages;
create policy "responde no proprio chamado" on support_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      (public.eh_admin() and is_staff)
      or (
        not is_staff
        and exists (
          select 1 from support_tickets t
          where t.id = ticket_id and t.user_id = auth.uid()
        )
      )
    )
  );

-- 7. Atualiza updated_at ----------------------------------------------------

create or replace function public.toca_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_tickets_touch on support_tickets;
create trigger support_tickets_touch
  before update on support_tickets
  for each row execute function public.toca_updated_at();

-- 8. Anexos -----------------------------------------------------------------
-- Bucket privado: o print pode conter dados pessoais, então não fica em URL
-- pública. O admin lê por URL assinada, com validade curta.

insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', false)
on conflict (id) do nothing;

drop policy if exists "envia anexo de suporte" on storage.objects;
create policy "envia anexo de suporte" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'support-attachments');

drop policy if exists "admin le anexo de suporte" on storage.objects;
create policy "admin le anexo de suporte" on storage.objects
  for select to authenticated
  using (bucket_id = 'support-attachments' and public.eh_admin());

-- Confere o resultado
select 'support_tickets' as tabela, count(*) as linhas from support_tickets
union all
select 'support_messages', count(*) from support_messages;
