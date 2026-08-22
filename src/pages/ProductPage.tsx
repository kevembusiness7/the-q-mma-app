import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNav } from '../context/NavigationContext';
import { SIZES, products } from '../data/shop';
import { BackBar } from '../components/shop/ShopParts';
import { ProductArt, formatPrice, productImage } from '../lib/productImage';
import '../styles/shop.css';

export function ProductPage({ productId }: { productId: string }) {
  const product = products.find((p) => p.id === productId);
  const { closeOverlay, openOverlay } = useNav();
  const { add } = useCart();

  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <div>
        <BackBar label="Produto" onBack={closeOverlay} />
        <p className="empty">Produto não encontrado.</p>
      </div>
    );
  }

  const color = product.colors[colorIndex];
  const photo = productImage(product, color.slug, side);
  const hasBack = product.mode === 'mockup';

  const handleAdd = () => {
    add(product, color.name, size, quantity, productImage(product, color.slug) ?? undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="pdp-screen">
      <BackBar label={product.category} onBack={closeOverlay} />

      <div className="hero-img">
        {photo ? (
          <img src={photo} alt={`${product.name} — ${color.name}`} />
        ) : (
          <ProductArt art={product.art} />
        )}
      </div>

      {hasBack && (
        <div className="pill-row pdp-sides">
          <button
            type="button"
            className={`pill ${side === 'front' ? 'on' : ''}`}
            onClick={() => setSide('front')}
          >
            Front
          </button>
          <button
            type="button"
            className={`pill ${side === 'back' ? 'on' : ''}`}
            onClick={() => setSide('back')}
          >
            Back
          </button>
        </div>
      )}

      <div className="pdp">
        {product.badges.length > 0 && (
          <div className="badges-row">
            {product.badges.map((badge) => (
              <span key={badge} className={`badge b-${badge}`}>
                {badge === 'app' ? 'App exclusive' : badge === 'low' ? 'Low stock' : 'Limited'}
              </span>
            ))}
          </div>
        )}

        <h2>{product.name}</h2>
        <div className="price-lg">{formatPrice(product.price)}</div>
        <p className="desc">{product.description}</p>

        <div className="label">Color — {color.name}</div>
        <div className="swatch-row">
          {product.colors.map((c, index) => (
            <button
              key={c.slug}
              type="button"
              className={`swatch ${index === colorIndex ? 'on' : ''}`}
              style={{ background: c.hex }}
              onClick={() => setColorIndex(index)}
              aria-label={c.name}
              aria-pressed={index === colorIndex}
            />
          ))}
        </div>

        <div className="label">Size</div>
        <div className="sizes">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={`size ${s === size ? 'on' : ''}`}
              onClick={() => setSize(s)}
              aria-pressed={s === size}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="label">Quantity</div>
        <div className="qty-row">
          <button
            type="button"
            className="qty-step"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Diminuir"
          >
            −
          </button>
          <span className="qty-val">{quantity}</span>
          <button
            type="button"
            className="qty-step"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Aumentar"
          >
            +
          </button>
        </div>

        <button type="button" className="btn" onClick={handleAdd}>
          {added ? 'Added to cart' : 'Add to cart'}
        </button>

        {added && (
          <button type="button" className="btn ghost pdp-gocart" onClick={() => openOverlay({ name: 'cart' })}>
            View cart
          </button>
        )}

        <div className="tag-row">
          {product.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              #{tag}
            </span>
          ))}
        </div>

        <details className="accordion">
          <summary>Details</summary>
          <div className="accbody">{product.details}</div>
        </details>
        <details className="accordion">
          <summary>Shipping &amp; returns</summary>
          <div className="accbody">{product.shipping}</div>
        </details>
      </div>
    </div>
  );
}

export default ProductPage;
