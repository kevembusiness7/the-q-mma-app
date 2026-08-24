import { useCart } from '../context/CartContext';
import { useNav } from '../context/NavigationContext';
import { ProductArt } from '../lib/productImage';
import { formatarPreco } from '../hooks/useProducts';
import { useCheckout } from '../hooks/useCheckout';
import '../styles/auth.css';
import '../styles/shop.css';

export function CartPage() {
  const { lines, subtotalCents, setQuantity, remove } = useCart();
  const { pagar, redirecionando, erro: erroCheckout } = useCheckout();
  const { closeOverlay, openOverlay } = useNav();

  if (lines.length === 0) {
    return (
      <div className="cart-screen">
        <header className="appbar">
          <div className="appbar-lead">
            <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <span className="wordmark">Cart</span>
          </div>
        </header>
        <p className="empty">
          Seu carrinho está vazio.
          <br />
          <button type="button" className="empty-link" onClick={() => openOverlay({ name: 'shop' })}>
            Ver a loja
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="cart-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">Cart</span>
        </div>
      </header>

      <div className="pad">
        {lines.map((line) => (
          <div key={line.variantId} className="bagrow">
            <div className="bagthumb">
              {line.image ? <img src={line.image} alt="" /> : <ProductArt />}
            </div>

            <div className="bagmain">
              <h5>{line.name}</h5>
              <span>
                {line.color} · {line.size}
              </span>
              <div className="bagqty">
                <button
                  type="button"
                  onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                  aria-label="Diminuir"
                >
                  −
                </button>
                <b>{line.quantity}</b>
                <button
                  type="button"
                  onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                  aria-label="Aumentar"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bagside">
              <span className="bagprice">{formatarPreco(line.priceCents * line.quantity)}</span>
              <button type="button" className="bagremove" onClick={() => remove(line.variantId)}>
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="totals">
          <div>
            <span>Subtotal</span>
            <span>{formatarPreco(subtotalCents)}</span>
          </div>
          <div>
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="totals-final">
            <span>Total</span>
            <span>{formatarPreco(subtotalCents)}</span>
          </div>
        </div>

        {erroCheckout && (
          <p className="auth-erro" role="alert">
            {erroCheckout}
          </p>
        )}

        <button
          type="button"
          className="btn cart-checkout"
          onClick={() => pagar(lines)}
          disabled={redirecionando}
        >
          {redirecionando ? 'Redirecting to payment…' : 'Checkout'}
        </button>
        <p className="cart-note">
          Secure payment by Stripe. Shipping is chosen on the payment page.
        </p>
      </div>
    </div>
  );
}

export default CartPage;
