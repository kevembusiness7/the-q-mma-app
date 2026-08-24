-- THE Q MMA — tira as variações de bordô/bege que sobraram nos bonés dos
-- atletas.
--
-- Esses 4 bonés (ozzy-diaz-cap, shane-collins-cap, jp-lebosnoyani-cap,
-- dione-barbosa-cap) nasceram usando a paleta de 3 cores do boné clássico
-- (Black/Burgundy/Beige), antes de existir foto de mockup pra eles. Depois,
-- quando a foto do molde ficou pronta, o produto passou a ter só a cor
-- preta -- mas o "insert ... on conflict do nothing" em product_variants só
-- adiciona linha nova, nunca apaga a antiga. As variações de bordô/bege da
-- primeira vez que o loja-schema.sql rodou continuaram no banco, e é por
-- isso que a tela ainda oferece 3 cores pra escolher.
--
-- Idempotente: rodar de novo não dá erro se já tiver sido limpo.

delete from product_variants
where color_slug <> 'black'
  and product_id in (
    select id from products
    where slug in ('ozzy-diaz-cap', 'shane-collins-cap', 'jp-lebosnoyani-cap', 'dione-barbosa-cap')
  );
