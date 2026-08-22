import type { Product } from '../../types/shop';
import { ProductArt, formatPrice, productImage } from '../../lib/productImage';

const BADGE_LABEL: Record<string, string> = {
  app: 'App exclusive',
  low: 'Low stock',
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

  return (
    <button type="button" className="card" onClick={onOpen}>
      <div className="thumb">
        {photo ? <img src={photo} alt="" loading="lazy" /> : <ProductArt art={product.art} />}
        {product.badges[0] && (
          <span className={`badge b-${product.badges[0]}`}>{BADGE_LABEL[product.badges[0]]}</span>
        )}
      </div>
      <h4>{product.name}</h4>
      <span className="price">{formatPrice(product.price)}</span>
    </button>
  );
}
