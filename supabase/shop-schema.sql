-- THE Q MMA — tabelas da loja, treinadores e patrocinadores
--
-- Rode depois de schema.sql e theq-schema.sql. Idempotente.
--
-- IMPORTANTE: o app ainda lê de src/data/shop.ts, não destas tabelas.
-- Elas existem para você poder cadastrar produtos pelo painel do Supabase.
-- A ligação (hooks useProducts / useCoaches / useSponsors) vem depois.

do $$ begin
  create type product_category as enum ('Shirts', 'Caps', 'Kids');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type product_mode as enum ('mockup', 'art');
exception
  when duplicate_object then null;
end $$;

create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  category     product_category not null,
  -- Em centavos, para não perder precisão em conta de dinheiro.
  price_cents  int not null,
  badges       text[] not null default '{}',
  -- slug do atleta dono, ou 'team'.
  owner        text not null default 'team',
  description  text not null default '',
  tags         text[] not null default '{}',
  genders      text[] not null default '{}',
  -- [{"name":"Black","hex":"#14110F","slug":"black"}, ...]
  colors       jsonb not null default '[]',
  details      text not null default '',
  shipping     text not null default '',
  mode         product_mode not null default 'art',
  mockup_key   text,
  art          text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists products_category_idx on products (category);
create index if not exists products_sort_order_idx on products (sort_order);

create table if not exists coaches (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  role        text not null,
  belt        text,
  specialty   text,
  city        text,
  instagram   text,
  notable     text,
  bio         text,
  photo_url   text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists sponsors (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text,
  logo_url     text,
  website      text,
  instagram    text,
  featured     boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- Leitura pública, escrita nenhuma — igual às tabelas anteriores.
alter table products enable row level security;
alter table coaches  enable row level security;
alter table sponsors enable row level security;

drop policy if exists "Public can read products" on products;
create policy "Public can read products" on products for select using (true);

drop policy if exists "Public can read coaches" on coaches;
create policy "Public can read coaches" on coaches for select using (true);

drop policy if exists "Public can read sponsors" on sponsors;
create policy "Public can read sponsors" on sponsors for select using (true);

-- Seed mínimo, espelhando src/data/shop.ts.
insert into coaches (slug, name, role, belt, specialty, city, instagram, notable, bio, photo_url, sort_order)
values (
  'matheus-naccache', 'Matheus Naccache', 'Head Coach',
  'Black Belt · Muay Thai', 'Fight Camp Preparation', 'Rio de Janeiro, RJ',
  'https://www.instagram.com/matheusnaccache/', 'Osman "Ozzy" Diaz, Dione Barbosa',
  'Head coach at The Q MMA, originally from Rio de Janeiro, RJ. Black belt in Muay Thai, specializing in fight camp preparation.',
  '/images/coaches/matheus-naccache.jpg', 1
)
on conflict (slug) do nothing;

insert into sponsors (slug, name, description, logo_url, featured, sort_order)
values (
  'blez-sports-cards', 'Blez Sports Cards',
  'Official trading card partner of The Q MMA, producing collectible cards for the team roster.',
  '/images/sponsors/blez-sports-cards.jpg', true, 1
)
on conflict (slug) do nothing;
