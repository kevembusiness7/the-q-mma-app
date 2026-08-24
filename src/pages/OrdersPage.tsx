import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { formatarPreco } from '../hooks/useProducts'
import {
  ROTULO_ENTREGA,
  ROTULO_PAGAMENTO,
  useMeusPedidos,
  type Pedido,
} from '../hooks/useOrders'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/orders.css'

export function OrdersPage() {
  const { closeOverlay, openOverlay } = useNav()
  const { usuario, carregando: carregandoAuth } = useAuth()
  const { pedidos, carregando, erro } = useMeusPedidos(usuario?.id ?? null)
  const [aberto, setAberto] = useState<Pedido | null>(null)

  return (
    <div className="support-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button
            type="button"
            className="appbar-back"
            onClick={aberto ? () => setAberto(null) : closeOverlay}
            aria-label="Voltar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">{aberto ? aberto.orderNumber : 'My orders'}</span>
        </div>
      </header>

      {carregandoAuth || carregando ? (
        <p className="empty">Loading orders…</p>
      ) : !usuario ? (
        <div className="auth-aviso">
          <h3>Sign in to see your orders</h3>
          <p>
            Orders placed as a guest don&rsquo;t show here — their confirmation and updates go to
            your email.
          </p>
          <button type="button" className="btn" onClick={() => openOverlay({ name: 'auth' })}>
            Sign in
          </button>
        </div>
      ) : erro ? (
        <p className="empty">Could not load your orders: {erro}</p>
      ) : pedidos.length === 0 ? (
        <p className="empty">
          No orders yet.
          <br />
          <button type="button" className="empty-link" onClick={() => openOverlay({ name: 'shop' })}>
            Ver a loja
          </button>
        </p>
      ) : aberto ? (
        <DetalhePedido pedido={aberto} />
      ) : (
        <div className="support-lista">
          {pedidos.map((p) => (
            <button key={p.id} type="button" className="ticket ticket-clicavel" onClick={() => setAberto(p)}>
              <div className="ticket-topo">
                <span className={`ticket-status pg-${p.paymentStatus}`}>
                  {ROTULO_PAGAMENTO[p.paymentStatus]}
                </span>
                <span className="ticket-ref">{p.orderNumber}</span>
              </div>
              <div className="pedido-resumo">
                {p.itens.reduce((s, i) => s + i.quantity, 0)}{' '}
                {p.itens.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'items'} ·{' '}
                <b>{formatarPreco(p.totalCents)}</b>
              </div>
              {p.paymentStatus === 'paid' && (
                <div className="ticket-cat">{ROTULO_ENTREGA[p.fulfillmentStatus]}</div>
              )}
              <time className="ticket-data" dateTime={p.createdAt}>
                {formatarData(p.createdAt)}
              </time>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DetalhePedido({ pedido }: { pedido: Pedido }) {
  const endereco = [
    pedido.shipLine1,
    pedido.shipLine2,
    [pedido.shipCity, pedido.shipState, pedido.shipPostalCode].filter(Boolean).join(', '),
    pedido.shipCountry,
  ].filter(Boolean)

  return (
    <div className="pedido-detalhe">
      <div className="ticket-topo">
        <span className={`ticket-status pg-${pedido.paymentStatus}`}>
          {ROTULO_PAGAMENTO[pedido.paymentStatus]}
        </span>
        {pedido.paymentStatus === 'paid' && (
          <span className="ticket-cat">{ROTULO_ENTREGA[pedido.fulfillmentStatus]}</span>
        )}
      </div>

      <div className="pedido-itens">
        {pedido.itens.map((i) => (
          <div key={i.id} className="pedido-item">
            <div className="pedido-item-thumb">
              {i.imageUrl ? <img src={i.imageUrl} alt="" /> : <span aria-hidden>🥋</span>}
            </div>
            <div className="pedido-item-info">
              <b>{i.productName}</b>
              <span>
                {i.colorName} · {i.size} × {i.quantity}
              </span>
            </div>
            <span className="pedido-item-preco">{formatarPreco(i.unitPriceCents * i.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="totals">
        <div>
          <span>Subtotal</span>
          <span>{formatarPreco(pedido.subtotalCents)}</span>
        </div>
        <div>
          <span>Shipping</span>
          <span>{pedido.shippingCents === 0 ? 'Free' : formatarPreco(pedido.shippingCents)}</span>
        </div>
        <div className="totals-final">
          <span>Total</span>
          <span>{formatarPreco(pedido.totalCents)}</span>
        </div>
      </div>

      {endereco.length > 0 && (
        <div className="admin-ficha">
          <div className="admin-linha">
            <span>Ship to</span>
            <b>{pedido.shipName ?? '—'}</b>
          </div>
          <div className="admin-linha">
            <span>Address</span>
            <b>{endereco.join(' · ')}</b>
          </div>
          {pedido.trackingNumber && (
            <div className="admin-linha">
              <span>Tracking</span>
              <b>
                {pedido.trackingCarrier ? `${pedido.trackingCarrier} · ` : ''}
                {pedido.trackingNumber}
              </b>
            </div>
          )}
        </div>
      )}

      <time className="ticket-data pedido-data" dateTime={pedido.createdAt}>
        Placed on {formatarData(pedido.createdAt)}
      </time>
    </div>
  )
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
