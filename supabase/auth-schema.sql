-- Perfis de usuário, ligados ao Auth do Supabase.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase.
--
-- Pode rodar mais de uma vez sem estragar nada.

-- 1. Tabela de perfis -------------------------------------------------------
-- O Supabase guarda e-mail e senha em auth.users, que é dele e não pode
-- receber colunas nossas. Tudo que é do app fica aqui, ligado pelo mesmo id.

create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  email      text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- 2. Políticas de acesso ----------------------------------------------------
-- Cada um enxerga e edita só o próprio perfil. Ninguém consegue se promover a
-- admin: a coluna is_admin só muda por aqui, pelo painel.

drop policy if exists "le o proprio perfil" on profiles;
create policy "le o proprio perfil" on profiles
  for select using (auth.uid() = id);

drop policy if exists "atualiza o proprio perfil" on profiles;
create policy "atualiza o proprio perfil" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 3. Criação automática do perfil ------------------------------------------
-- Sem isto, quem se cadastrasse ficaria sem linha em profiles e o app não
-- saberia o nome nem se é admin. O gatilho roda dentro do Auth, no cadastro.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Perfis de quem já existia ---------------------------------------------
-- Se você já tinha usuários cadastrados antes deste script, isto cria o
-- perfil que faltou para cada um.

insert into public.profiles (id, email, full_name)
select u.id, u.email, u.raw_user_meta_data ->> 'full_name'
from auth.users u
on conflict (id) do nothing;

-- 5. Torne-se admin ---------------------------------------------------------
-- Rode DEPOIS de criar sua conta pelo app, trocando o e-mail abaixo pelo seu.
-- Está comentado de propósito para não promover ninguém por engano.
--
-- update profiles set is_admin = true where email = 'seu-email@exemplo.com';

-- Confere o resultado
select id, email, full_name, is_admin, created_at
from profiles
order by created_at desc;
