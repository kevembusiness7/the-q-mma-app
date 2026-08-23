import type { Product } from '../../types/shop';
import { ProductArt, productImage } from '../../lib/productImage';
import { estaEsgotado, estoqueBaixo, formatarPreco } from '../../hooks/useProducts';

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

export function CategoryChips({
  categories,
  active,
  onChange,
}: {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}) {
  return (
    <div className="rail" role="tablist" aria-label="Categorias">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={category === active}
          className={`chip ${category === active ? 'on' : ''}`}
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
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
