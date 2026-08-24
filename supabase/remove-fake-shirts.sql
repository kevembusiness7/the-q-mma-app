-- THE Q MMA — remove os "fight kit" placeholder e o poster da Dione.
--
-- Esses 3 nunca tiveram arte de verdade (mode 'art' usa só o SVG genérico de
-- camiseta) ou duplicavam a Dione sem necessidade. A loja deve mostrar só
-- peças com arte real. Variações e itens de pedido antigos que referenciam
-- esses produtos não quebram: as duas FKs em product_variants/order_items
-- são "on delete set null"/"on delete cascade" de propósito (ver
-- pedidos-schema.sql).
--
-- Idempotente: rodar de novo não dá erro se já tiver sido removido.

delete from products
where slug in ('witch-fight-kit', 'ozzy-fight-kit', 'dione-fight-poster');
