import { useState } from 'react';
import { useNav } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { products } from '../data/shop';
import { CategoryChips, ProductCard } from '../components/shop/ShopParts';
import '../styles/shop.css';

const CATEGORIES = ['All', 'Shirts', 'Caps', 'Kids'];

export function ShopPage() {
  const [category, setCategory] = useState('All');
  const { openOverlay, closeOverlay } = useNav();
  const { count } = useCart();

  const visible =
    category === 'All' ? products : products.filter((p) => p.category === category);

  const appOnly = visible.filter((p) => p.badges.includes('app'));

  return (
    <div className="shop-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">SHOP</span>
        </div>
        <button
          type="button"
          className="bagbtn"
          onClick={() => openOverlay({ name: 'cart' })}
          aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M4 8h16l-1.2 12H5.2z" />
            <path d="M8.5 8V6a3.5 3.5 0 017 0v2" />
          </svg>
          {count > 0 && <b className="bagcount">{count}</b>}
        </button>
      </header>

      <CategoryChips categories={CATEGORIES} active={category} onChange={setCategory} />

      {appOnly.length > 0 && (
        <>
          <div className="sec">
            <h3>App exclusive</h3>
            <span>{appOnly.length}</span>
          </div>
          <div className="hrail">
            {appOnly.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={() => openOverlay({ name: 'product', productId: product.id })}
              />
            ))}
          </div>
        </>
      )}

      <div className="sec">
        <h3>{category === 'All' ? 'All products' : category}</h3>
        <span>{visible.length}</span>
      </div>

      {visible.length === 0 ? (
        <p className="empty">Nada nesta categoria ainda.</p>
      ) : (
        <div className="shop-grid">
          {visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpen={() => openOverlay({ name: 'product', productId: product.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ShopPage;
