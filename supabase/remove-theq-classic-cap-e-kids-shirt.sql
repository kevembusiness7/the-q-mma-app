-- THE Q MMA — tira o boné clássico e a camisa infantil da loja.
--
-- Não têm arte de atleta nenhuma (só o crest do time em SVG genérico) e o
-- pedido foi tirar os dois da vitrine. Variações e itens de pedido antigos
-- que referenciam esses produtos não quebram: as duas FKs em
-- product_variants/order_items são "on delete set null"/"on delete cascade"
-- de propósito (ver pedidos-schema.sql).
--
-- Idempotente: rodar de novo não dá erro se já tiver sido removido.

delete from products
where slug in ('theq-classic-cap', 'theq-kids-shirt');
