-- THE Q MMA — tabela `news` (tela The Q)
--
-- Rode este arquivo no SQL Editor do Supabase, depois do schema.sql principal.
-- É idempotente: rodar duas vezes não dá erro nem duplica linhas.

-- `create type` não aceita `if not exists`, então engolimos o erro de duplicata.
do $$ begin
  create type news_type as enum ('result', 'next', 'event');
exception
  when duplicate_object then null;
end $$;

create table if not exists news (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  type          news_type not null,
  tag           text not null,
  title         text not null,
  body          text not null,
  -- Data como texto porque o mockup mistura data exata ("Jul 18, 2026")
  -- com recorrência ("Every Saturday · 10 AM").
  display_date  text not null,
  photo_url     text not null,
  -- Controla a ordem no feed. Menor aparece primeiro.
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists news_sort_order_idx on news (sort_order);

alter table news enable row level security;

-- `create policy` também não tem `if not exists`.
drop policy if exists "Public can read news" on news;
create policy "Public can read news"
  on news for select
  using (true);

-- Seed igual ao src/data/news.ts, para o app mostrar o mesmo conteúdo
-- com ou sem banco.
insert into news (slug, type, tag, title, body, display_date, photo_url, sort_order)
values
  ('dione-def-melisano', 'result', 'Fight Result',
   'Dione Barbosa def. Anna Melisano',
   '"The Witch" got the standing rear-naked choke finish in Round 1 at UFC Fight Night, extending her winning streak to two.',
   'Jul 18, 2026', '/images/news/dione-def-melisano.jpg', 1),
  ('ozzy-vs-gandra', 'next', 'Next Fight',
   'Ozzy Diaz faces Ryan Gandra',
   'Osman "Ozzy" Diaz is set for UFC 331: Van vs. Pantoja 2, September 19 at Crypto.com Arena, Los Angeles.',
   'Sep 19, 2026', '/images/news/ozzy-vs-gandra.jpg', 2),
  ('open-mat', 'event', 'Academy Schedule',
   'Open Mat & Trial Class',
   'Free open mat and trial class for anyone curious about training at The Q MMA. All levels welcome, no experience needed.',
   'Every Saturday · 10 AM', '/images/news/open-mat.jpg', 3)
on conflict (slug) do nothing;
