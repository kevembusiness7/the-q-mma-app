import { useCart } from '../context/CartContext';
import { useNav } from '../context/NavigationContext';
import { ProductArt, formatPrice } from '../lib/productImage';
import '../styles/shop.css';

export function CartPage() {
  const { lines, subtotal, setQuantity, remove } = useCart();
  const { goToTab } = useNav();

  if (lines.length === 0) {
    return (
      <div className="cart-screen">
        <header className="appbar">
          <span className="wordmark">Cart</span>
        </header>
        <p className="empty">
          Seu carrinho está vazio.
          <br />
          <button type="button" className="empty-link" onClick={() => goToTab('shop')}>
            Ver a loja
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="cart-screen">
      <header className="appbar">
        <span className="wordmark">Cart</span>
      </header>

      <div className="pad">
        {lines.map((line) => (
          <div key={line.key} className="bagrow">
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
                  onClick={() => setQuantity(line.key, line.quantity - 1)}
                  aria-label="Diminuir"
                >
                  −
                </button>
                <b>{line.quantity}</b>
                <button
                  type="button"
                  onClick={() => setQuantity(line.key, line.quantity + 1)}
                  aria-label="Aumentar"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bagside">
              <span className="bagprice">{formatPrice(line.price * line.quantity)}</span>
              <button type="button" className="bagremove" onClick={() => remove(line.key)}>
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="totals">
          <div>
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div>
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="totals-final">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </div>

        {/* Checkout ainda não processa pagamento — ver README-PARTE2.md */}
        <button type="button" className="btn cart-checkout" disabled>
          Checkout — em breve
        </button>
        <p className="cart-note">
          O pagamento ainda não está ligado. Os itens ficam salvos só nesta sessão.
        </p>
      </div>
    </div>
  );
}

export default CartPage;
