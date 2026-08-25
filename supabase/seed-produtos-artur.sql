-- THE Q MMA — camisa e boné de arte do Artur Minev.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase, depois de já ter rodado loja-schema.sql.
-- Mesma regra de cores/estoque daquele arquivo (comentada lá): camisa usa as
-- 6 cores com mockup em /images/shirts/, boné só a preta (única foto que
-- temos do molde). Pode rodar mais de uma vez sem duplicar nada.

-- 1. Produtos -----------------------------------------------------------------

insert into products
  (slug, name, category, price_cents, badges, owner, description, tags, genders,
   details, shipping, mode, mockup_key, art, art_image, sort_order)
values
  ('artur-minev-art', 'Artur Minev Art Shirt', 'Shirts', 16900, '{app}', 'artur-minev',
   'Shirt with Artur "Headhunter" Minev''s exclusive illustrated artwork. Choose the shirt color and see front and back.',
   '{UFC,ArturMinev,TheQMMA,Art}', '{Men,Women}',
   '100% combed cotton, 180g/m², high-durability screen print. Unisex regular fit. Officially licensed piece with The Q MMA authenticity seal.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'mockup', 'artur', null, null, 17),

  ('artur-minev-cap', 'Artur Minev Art Cap', 'Caps', 9900, '{app}', 'artur-minev',
   'Curved-brim cap with Artur "Headhunter" Minev''s exclusive illustrated artwork printed on front.',
   '{UFC,ArturMinev,TheQMMA,Art,Cap}', '{Men,Women}',
   'Structured six-panel cap, front artwork print, adjustable snapback closure.',
   'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.',
   'mockup', 'artur', null, null, 18)
on conflict (slug) do update set
  name = excluded.name, category = excluded.category, price_cents = excluded.price_cents,
  badges = excluded.badges, owner = excluded.owner, description = excluded.description,
  tags = excluded.tags, genders = excluded.genders, details = excluded.details,
  shipping = excluded.shipping, mode = excluded.mode, mockup_key = excluded.mockup_key,
  art = excluded.art, art_image = excluded.art_image, sort_order = excluded.sort_order;

-- 2. Cores de cada produto ------------------------------------------------------

create temp table cores_do_produto (slug text, color_name text, color_hex text, color_slug text)
on commit drop;

insert into cores_do_produto
select p.slug, c.color_name, c.color_hex, c.color_slug
from (values ('artur-minev-art')) p(slug)
cross join (values
  ('Black', '#14110F', 'black'),
  ('White', '#EDE7DE', 'white'),
  ('Burgundy', '#B0301F', 'burgundy'),
  ('Green', '#4fb477', 'green'),
  ('Gray', '#948A81', 'gray'),
  ('Gold', '#C8A03C', 'gold')
) c(color_name, color_hex, color_slug);

insert into cores_do_produto
select p.slug, c.color_name, c.color_hex, c.color_slug
from (values ('artur-minev-cap')) p(slug)
cross join (values
  ('Black', '#14110F', 'black')
) c(color_name, color_hex, color_slug);

-- 3. Variações ------------------------------------------------------------------

insert into product_variants
  (product_id, sku, color_name, color_hex, color_slug, size, price_cents, stock)
select
  p.id,
  upper(p.slug || '-' || c.color_slug || '-' || replace(lower(t.size), ' ', '')),
  c.color_name, c.color_hex, c.color_slug,
  t.size,
  p.price_cents,
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
where p.slug in ('artur-minev-art', 'artur-minev-cap')
group by p.id, p.name, p.sort_order
order by p.sort_order;
