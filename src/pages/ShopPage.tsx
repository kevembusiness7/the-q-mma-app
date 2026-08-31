import { useState } from 'react';
import { ChevronLeft, ShoppingBag, Star } from 'lucide-react';
import { useNav } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/useProducts';
import { ShopCard } from '../components/shop/ShopParts';
import '../styles/shop.css';
import '../styles/shop-home.css';

const CATEGORIES = ['All', 'Shirts', 'Caps'];

/** Cadeado dentro do escudo do rodapé -- o lucide não tem esse desenho. */
function IconeEscudoCadeado() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l7 2.8v5.2c0 4.3-3 8.1-7 9.3-4-1.2-7-5-7-9.3V5.8z" />
      <rect x="9.2" y="11" width="5.6" height="4.6" rx="1" />
      <path d="M10.4 11V9.8a1.6 1.6 0 0 1 3.2 0V11" />
    </svg>
  );
}

export function ShopPage() {
  const [category, setCategory] = useState('All');
  const { openOverlay, closeOverlay } = useNav();
  const { count } = useCart();
  const { produtos, carregando } = useProducts();

  const visible =
    category === 'All' ? produtos : produtos.filter((p) => p.category === category);

  const appOnly = visible.filter((p) => p.badges.includes('app'));

  return (
    <div className="sh-screen">
      <header className="sh-bar">
        <button type="button" className="sh-bar-back" onClick={closeOverlay} aria-label="Voltar">
          <ChevronLeft size={24} strokeWidth={2} aria-hidden />
        </button>
        <img className="sh-bar-logo" src="/images/brand/logo-theq.png" alt="THE Q MMA" />
        <span className="sh-bar-divisor" aria-hidden />
        <h1 className="sh-bar-titulo">Shop</h1>
        <button
          type="button"
          className="sh-bag"
          onClick={() => openOverlay({ name: 'cart' })}
          aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
        >
          <ShoppingBag size={22} strokeWidth={1.7} aria-hidden />
          {count > 0 && <b className="sh-bag-count">{count}</b>}
        </button>
      </header>

      <div className="sh-hero">
        <img className="sh-hero-art" src="/images/brand/hero-shop-gear.webp" alt="" aria-hidden />
        <div className="sh-hero-texto">
          <h2>
            <span className="ouro">Built for</span>
            <span className="prata">Warriors</span>
          </h2>
          <p>Exclusive athlete collections and fight gear.</p>
        </div>
      </div>

      <div className="sh-chips" role="tablist" aria-label="Categorias">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === category}
            className={`sh-chip ${c === category ? 'on' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {appOnly.length > 0 && (
        <>
          <h3 className="sh-sec">App exclusives</h3>
          {/* A moldura acesa em volta dos exclusivos é do cartaz: separa a
              vitrine especial da grade comum sem precisar de outra cor. */}
          <div className="sh-exclusivos">
            <div className="sh-grid">
              {appOnly.map((product) => (
                <ShopCard
                  key={product.id}
                  product={product}
                  destaque
                  onOpen={() => openOverlay({ name: 'product', productId: product.id })}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <h3 className="sh-sec">{category === 'All' ? 'All products' : category}</h3>

      {carregando ? (
        <p className="sh-vazio">Loading products…</p>
      ) : visible.length === 0 ? (
        <p className="sh-vazio">Nada nesta categoria ainda.</p>
      ) : (
        <div className="sh-grid solta">
          {visible.map((product) => (
            <ShopCard
              key={product.id}
              product={product}
              onOpen={() => openOverlay({ name: 'product', productId: product.id })}
            />
          ))}
        </div>
      )}

      <footer className="sh-footer">
        <span className="sh-footer-icone" aria-hidden>
          <IconeEscudoCadeado />
        </span>
        <span>Secure checkout</span>
        <span className="sh-footer-ponto" aria-hidden>
          •
        </span>
        <span>Exclusive drops</span>
        <span className="sh-footer-icone" aria-hidden>
          <Star size={20} strokeWidth={1.5} />
        </span>
      </footer>
    </div>
  );
}

export default ShopPage;
