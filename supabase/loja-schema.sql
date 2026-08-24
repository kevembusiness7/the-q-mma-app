-- THE Q MMA — catálogo da loja com variações e estoque.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase. Depende do auth-schema.sql, que cria
-- `profiles` e a função eh_admin().
--
-- Substitui o antigo shop-schema.sql, que nunca chegou a ser executado e não
-- tinha variações nem estoque.
--
-- Pode rodar mais de uma vez sem duplicar nada.

-- 1. Tipos ------------------------------------------------------------------

do $$ begin
  create type product_category as enum ('Shirts', 'Caps', 'Kids');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_mode as enum ('mockup', 'art');
exception when duplicate_object then null; end $$;

-- 2. Produtos ---------------------------------------------------------------
-- Dinheiro sempre em centavos inteiros. Float em conta de dinheiro perde
-- centavo no arredondamento, e o erro aparece justamente ao somar imposto,
-- frete e desconto.

create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  category     product_category not null,
  price_cents  int not null check (price_cents >= 0),
  -- 'app' = exclusivo do app, 'lim' = edição limitada.
  -- 'low' saiu de propósito: estoque baixo agora é calculado das variações,
  -- em vez de ser escrito à mão e ficar mentindo quando o estoque muda.
  badges       text[] not null default '{}',
  owner        text not null default 'team',
  description  text not null default '',
  tags         text[] not null default '{}',
  genders      text[] not null default '{}',
  details      text not null default '',
  shipping     text not null default '',
  mode         product_mode not null default 'art',
  mockup_key   text,
  art          text,
  -- Foto real do design quando mode = 'art' (ex.: a arte do atleta impressa
  -- na camisa/boné). Sem isto, a tela cai no desenho SVG genérico de
  -- `art` (silhueta de camisa/boné/infantil).
  art_image    text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- Cobre quem já tinha a tabela criada antes de existir a coluna acima.
alter table products add column if not exists art_image text;

-- 3. Variações --------------------------------------------------------------
-- Cada combinação de cor e tamanho é uma linha própria, com SKU e estoque.
-- É esta tabela que torna possível controlar estoque, impedir a venda de item
-- esgotado e registrar em `order_items` exatamente o que foi comprado.

create table if not exists product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products (id) on delete cascade,
  sku         text unique not null,
  color_name  text not null,
  color_hex   text not null,
  color_slug  text not null,
  -- 'S'..'XXL', ou 'One size' para itens sem numeração, como bonés.
  size        text not null,
  -- Preço próprio: permite cobrar mais por XXL, por exemplo, sem gambiarra.
  price_cents int not null check (price_cents >= 0),
  stock       int not null default 0 check (stock >= 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (product_id, color_slug, size)
);

create index if not exists product_variants_product_idx on product_variants (product_id);
create index if not exists products_sort_idx on products (sort_order, created_at);

-- 4. Permissões -------------------------------------------------------------
-- Catálogo é público: qualquer visitante precisa ver preço e estoque para
-- decidir a compra. Escrita é só de admin — o preço é a base do cálculo do
-- pedido, e nenhum cliente pode encostar nele.

alter table products enable row level security;
alter table product_variants enable row level security;

drop policy if exists "catalogo publico" on products;
create policy "catalogo publico" on products
  for select to anon, authenticated using (is_active);

drop policy if exists "admin gerencia produtos" on products;
create policy "admin gerencia produtos" on products
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "variacoes publicas" on product_variants;
create policy "variacoes publicas" on product_variants
  for select to anon, authenticated using (is_active);

drop policy if exists "admin gerencia variacoes" on product_variants;
create policy "admin gerencia variacoes" on product_variants
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- 5. Catálogo ---------------------------------------------------------------

insert into products
  (slug, name, category, price_cents, badges, owner, description, tags, genders,
   details, shipping, mode, mockup_key, art, art_image, sort_order)
values
  ('theq-classic-cap', 'The Q Classic Cap', 'Caps', 9900, '{}', 'team',
   'Curved-brim cap with the team logo embroidered on front, snapback adjustable strap.',
   '{TheQMMA,Cap,Classic}', '{Men,Women}',
   'Structured six-panel cap, embroidered front logo, adjustable snapback closure.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'art', null, 'cap', null, 3),

  ('theq-kids-shirt', 'The Q Kids Shirt', 'Kids', 12900, '{}', 'team',
   'Kids tee with The Q MMA logo, soft cotton and reinforced neckline.',
   '{TheQMMA,Kids}', '{Kids}',
   '100% combed cotton, soft hand feel, reinforced neckline for everyday use.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'art', null, 'kid', null, 4),

  ('dione-witch-art', 'Dione Witch Art Shirt', 'Shirts', 16900, '{app}', 'dione-barbosa',
   'Shirt with Dione "The Witch" Barbosa''s exclusive illustrated artwork. Choose the shirt color and see front and back.',
   '{UFC,DioneBarbosa,Art}', '{Men,Women}',
   '100% combed cotton, 180g/m², high-durability screen print. Unisex regular fit. Officially licensed piece with The Q MMA authenticity seal.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'mockup', 'witch', null, null, 5),

  ('ozzy-diaz-art', 'Ozzy Diaz Art Shirt', 'Shirts', 16900, '{app}', 'ozzy-diaz',
   'Shirt with Osman "Ozzy" Diaz''s exclusive illustrated artwork. Choose the shirt color and see front and back.',
   '{UFC,OzzyDiaz,TheQMMA,Art}', '{Men,Women}',
   '100% combed cotton, 180g/m², high-durability screen print. Unisex regular fit. Officially licensed piece with The Q MMA authenticity seal.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'mockup', 'ozzy', null, null, 6),

  ('shane-collins-art', 'Shane Collins Art Shirt', 'Shirts', 16900, '{app}', 'shane-collins',
   'Shirt with Shane "Hollywood" Collins''s exclusive illustrated artwork. Choose the shirt color and see front and back.',
   '{UFC,ShaneCollins,TheQMMA,Art}', '{Men,Women}',
   '100% combed cotton, 180g/m², high-durability screen print. Unisex regular fit. Officially licensed piece with The Q MMA authenticity seal.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'mockup', 'hollywood', null, null, 7),

  ('jp-lebosnoyani-art', 'Jean Paul Art Shirt', 'Shirts', 16900, '{app}', 'jp-lebosnoyani',
   'Shirt with Jean-Paul "Mufasa" Lebosnoyani''s exclusive illustrated artwork. Choose the shirt color and see front and back.',
   '{UFC,JeanPaulLebosnoyani,TheQMMA,Art}', '{Men,Women}',
   '100% combed cotton, 180g/m², high-durability screen print. Unisex regular fit. Officially licensed piece with The Q MMA authenticity seal.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'mockup', 'jp', null, null, 8),

  ('ozzy-diaz-cap', 'Ozzy Diaz Art Cap', 'Caps', 9900, '{app}', 'ozzy-diaz',
   'Curved-brim cap with Osman "Ozzy" Diaz''s exclusive illustrated artwork printed on front.',
   '{UFC,OzzyDiaz,TheQMMA,Art,Cap}', '{Men,Women}',
   'Structured six-panel cap, front artwork print, adjustable snapback closure.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'mockup', 'ozzy', null, null, 9),

  ('shane-collins-cap', 'Shane Collins Art Cap', 'Caps', 9900, '{app}', 'shane-collins',
   'Curved-brim cap with Shane "Hollywood" Collins''s exclusive illustrated artwork printed on front.',
   '{UFC,ShaneCollins,TheQMMA,Art,Cap}', '{Men,Women}',
   'Structured six-panel cap, front artwork print, adjustable snapback closure.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'mockup', 'hollywood', null, null, 10),

  ('jp-lebosnoyani-cap', 'Jean Paul Art Cap', 'Caps', 9900, '{app}', 'jp-lebosnoyani',
   'Curved-brim cap with Jean-Paul "Mufasa" Lebosnoyani''s exclusive illustrated artwork printed on front.',
   '{UFC,JeanPaulLebosnoyani,TheQMMA,Art,Cap}', '{Men,Women}',
   'Structured six-panel cap, front artwork print, adjustable snapback closure.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'mockup', 'jp', null, null, 11),

  ('dione-barbosa-cap', 'Dione Barbosa Art Cap', 'Caps', 9900, '{app}', 'dione-barbosa',
   'Curved-brim cap with Dione "The Witch" Barbosa''s exclusive illustrated artwork printed on front.',
   '{UFC,DioneBarbosa,TheQMMA,Art,Cap}', '{Men,Women}',
   'Structured six-panel cap, front artwork print, adjustable snapback closure.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'mockup', 'dione', null, null, 12)
on conflict (slug) do update set
  name = excluded.name, category = excluded.category, price_cents = excluded.price_cents,
  badges = excluded.badges, owner = excluded.owner, description = excluded.description,
  tags = excluded.tags, genders = excluded.genders, details = excluded.details,
  shipping = excluded.shipping, mode = excluded.mode, mockup_key = excluded.mockup_key,
  art = excluded.art, art_image = excluded.art_image, sort_order = excluded.sort_order;

-- 6. Cores de cada produto --------------------------------------------------
-- Tabela temporária só para gerar as variações no passo seguinte.

create temp table cores_do_produto (slug text, color_name text, color_hex text, color_slug text)
on commit drop;

insert into cores_do_produto values
  ('theq-classic-cap', 'Black', '#14110F', 'black'),
  ('theq-classic-cap', 'Burgundy', '#B0301F', 'burgundy'),
  ('theq-classic-cap', 'Beige', '#948A81', 'beige'),

  ('theq-kids-shirt', 'Black', '#14110F', 'black'),
  ('theq-kids-shirt', 'Gold', '#C8A03C', 'gold');

-- O produto com foto real usa as 6 cores que têm mockup em
-- /images/shirts/ — o nome do arquivo depende do color_slug.
insert into cores_do_produto
select p.slug, c.color_name, c.color_hex, c.color_slug
from (values ('dione-witch-art')) p(slug)
cross join (values
  ('Black', '#14110F', 'black'),
  ('White', '#EDE7DE', 'white'),
  ('Burgundy', '#B0301F', 'burgundy'),
  ('Green', '#4fb477', 'green'),
  ('Gray', '#948A81', 'gray'),
  ('Gold', '#C8A03C', 'gold')
) c(color_name, color_hex, color_slug);

-- As 3 camisas de arte dos atletas: mesma paleta de 6 cores da Dione, e o
-- mesmo esquema 'mockup' -- cada cor tem uma foto própria em
-- /images/shirts/ com a arte já colada na camisa daquela cor.
insert into cores_do_produto
select p.slug, c.color_name, c.color_hex, c.color_slug
from (values ('ozzy-diaz-art'), ('shane-collins-art'), ('jp-lebosnoyani-art')) p(slug)
cross join (values
  ('Black', '#14110F', 'black'),
  ('White', '#EDE7DE', 'white'),
  ('Burgundy', '#B0301F', 'burgundy'),
  ('Green', '#4fb477', 'green'),
  ('Gray', '#948A81', 'gray'),
  ('Gold', '#C8A03C', 'gold')
) c(color_name, color_hex, color_slug);

-- Os 4 bonés de arte dos atletas: só preto -- é a única cor que tem foto do
-- molde de boné (public/images/caps/{ozzy,hollywood,jp,dione}-black.png). Se
-- vier foto do boné em bordô/bege, dá pra somar aqui e no CAP_MOCKUP_COLORS
-- do shop.ts.
insert into cores_do_produto
select p.slug, c.color_name, c.color_hex, c.color_slug
from (values ('ozzy-diaz-cap'), ('shane-collins-cap'), ('jp-lebosnoyani-cap'), ('dione-barbosa-cap')) p(slug)
cross join (values
  ('Black', '#14110F', 'black')
) c(color_name, color_hex, color_slug);

-- 7. Variações --------------------------------------------------------------
-- Boné não tem numeração de camisa. Antes o app oferecia boné tamanho XXL,
-- porque a lista de tamanhos era uma constante única para a loja inteira.

insert into product_variants
  (product_id, sku, color_name, color_hex, color_slug, size, price_cents, stock)
select
  p.id,
  upper(p.slug || '-' || c.color_slug || '-' || replace(lower(t.size), ' ', '')),
  c.color_name, c.color_hex, c.color_slug,
  t.size,
  p.price_cents,
  -- Estoque de exemplo, variado de propósito para a tela ter o que mostrar:
  -- alguns esgotados, alguns baixos, a maioria confortável.
  case
    when t.size = 'XXL' and c.color_slug = 'gold' then 0
    when t.size = 'S' then 3
    when t.size = 'XXL' then 4
    else 12 + (length(c.color_slug) * 2)
  end
from products p
join cores_do_produto c on c.slug = p.slug
cross join lateral (
  select unnest(
    case when p.category = 'Caps'
         then array['One size']
         else array['S', 'M', 'L', 'XL', 'XXL']
    end
  ) as size
) t
on conflict (product_id, color_slug, size) do nothing;

-- Confere o resultado
select p.name,
       count(v.id) as variacoes,
       sum(v.stock) as estoque_total,
       count(*) filter (where v.stock = 0) as esgotadas
from products p
left join product_variants v on v.product_id = p.id
group by p.id, p.name, p.sort_order
order by p.sort_order;
