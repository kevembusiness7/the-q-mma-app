import { Heart } from 'lucide-react';
import type { Product } from '../../types/shop';
import { ProductArt, productImage } from '../../lib/productImage';
import { estaEsgotado, estoqueBaixo, formatarPreco } from '../../hooks/useProducts';
import { useFavoritos } from '../../hooks/useFavorites';

const BADGE_LABEL: Record<string, string> = {
  app: 'App exclusive',
  lim: 'Limited',
};

export function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="backbar">
      <button type="button" onClick={onBack} aria-label="Voltar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <span>{label}</span>
    </div>
  );
}

export function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const firstColor = product.colors[0];
  const photo = productImage(product, firstColor?.slug ?? 'black');

  /* O selo agora sai do estoque das variações, e não de um campo escrito à
     mão. "Esgotado" tem prioridade sobre qualquer outro: é a informação que
     muda a decisão de quem está olhando. */
  const esgotado = estaEsgotado(product);
  const pouco = estoqueBaixo(product);
  const selo = esgotado
    ? { classe: 'b-out', texto: 'Sold out' }
    : pouco
      ? { classe: 'b-low', texto: 'Low stock' }
      : product.badges[0]
        ? { classe: `b-${product.badges[0]}`, texto: BADGE_LABEL[product.badges[0]] }
        : null;

  return (
    <button type="button" className={`card ${esgotado ? 'esgotado' : ''}`} onClick={onOpen}>
      <div className="thumb">
        {photo ? <img src={photo} alt="" loading="lazy" /> : <ProductArt art={product.art} />}
        {selo && <span className={`badge ${selo.classe}`}>{selo.texto}</span>}
      </div>
      <h4>{product.name}</h4>
      <span className="price">{formatarPreco(product.priceCents)}</span>
    </button>
  );
}

/**
 * Card da aba Shop no formato do cartaz: coração de favorito, nome em caixa
 * alta e preço dourado -- e, na faixa "App exclusives", moldura acesa, selo e
 * o botão "View".
 *
 * Vive ao lado do ProductCard em vez de substituí-lo porque a aba Products da
 * ficha do atleta continua usando o card antigo, e ela não pediu mudança.
 */
export function ShopCard({
  product,
  destaque = false,
  onOpen,
}: {
  product: Product;
  destaque?: boolean;
  onOpen: () => void;
}) {
  const { ehFavorito, alternar } = useFavoritos();
  const firstColor = product.colors[0];
  const photo = productImage(product, firstColor?.slug ?? 'black');

  /* Mesma regra do ProductCard: o selo sai do estoque das variações, e
     "Esgotado" tem prioridade -- é a informação que muda a decisão de quem
     está olhando. */
  const esgotado = estaEsgotado(product);
  const pouco = estoqueBaixo(product);
  const selo = esgotado
    ? { classe: 'b-out', texto: 'Sold out' }
    : pouco
      ? { classe: 'b-low', texto: 'Low stock' }
      : product.badges[0]
        ? { classe: `b-${product.badges[0]}`, texto: BADGE_LABEL[product.badges[0]] }
        : null;

  const favorito = ehFavorito(product.id);

  return (
    <article className={`sh-card ${destaque ? 'destaque' : ''} ${esgotado ? 'esgotado' : ''}`}>
      {/* O card inteiro abre o produto, mas o coração é outra ação -- por isso
          dois botões irmãos, e não um dentro do outro (que seria inválido). */}
      <button type="button" className="sh-card-hit" onClick={onOpen}>
        <span className="sh-thumb">
          {photo ? <img src={photo} alt="" loading="lazy" /> : <ProductArt art={product.art} />}
          {selo && <span className={`sh-selo ${selo.classe}`}>{selo.texto}</span>}
        </span>
        <b className="sh-nome">{product.name}</b>
        <span className="sh-preco">{formatarPreco(product.priceCents)}</span>
        {destaque && <span className="sh-view">View</span>}
      </button>

      <button
        type="button"
        className={`sh-fav ${favorito ? 'on' : ''}`}
        aria-pressed={favorito}
        aria-label={favorito ? `Remover ${product.name} dos favoritos` : `Salvar ${product.name}`}
        onClick={() => alternar(product.id)}
      >
        <Heart size={20} strokeWidth={1.8} fill={favorito ? 'currentColor' : 'none'} aria-hidden />
      </button>
    </article>
  );
}
