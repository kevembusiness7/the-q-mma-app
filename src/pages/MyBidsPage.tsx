import { useState } from 'react'
import { useNav } from '../context/NavigationContext'
import { useAuth } from '../context/AuthContext'
import { useMyBids } from '../hooks/useMyBids'
import { useAuctionNotifications } from '../hooks/useAuctionNotifications'
import { AuctionCard } from '../components/auction/AuctionCard'
import { formatarPreco } from '../hooks/useProducts'
import { AUCTION_ORDER_STATUS_LABEL } from '../types/auction'
import '../styles/shop.css'
import '../styles/support.css'
import '../styles/auction.css'

type Aba = 'winning' | 'outbid' | 'won' | 'lost' | 'watching' | 'notifications'

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'winning', rotulo: 'Winning' },
  { valor: 'outbid', rotulo: 'Outbid' },
  { valor: 'won', rotulo: 'Won' },
  { valor: 'lost', rotulo: 'Lost' },
  { valor: 'watching', rotulo: 'Watching' },
  { valor: 'notifications', rotulo: 'Alerts' },
]

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function MyBidsPage() {
  const { closeOverlay, openOverlay } = useNav()
  const { usuario, carregando: carregandoAuth } = useAuth()
  const { buckets, carregando } = useMyBids()
  const { notificacoes, carregando: carregandoNotif, marcarLida } = useAuctionNotifications()
  const [aba, setAba] = useState<Aba>('winning')

  if (carregandoAuth) {
    return (
      <div className="support-screen">
        <header className="appbar">
          <div className="appbar-lead">
            <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <span className="wordmark">My Bids</span>
          </div>
        </header>
        <p className="empty">Loading…</p>
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className="support-screen">
        <header className="appbar">
          <div className="appbar-lead">
            <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <span className="wordmark">My Bids</span>
          </div>
        </header>
        <div className="auth-aviso">
          <h3>Sign in to see your bids</h3>
          <button type="button" className="btn" onClick={() => openOverlay({ name: 'auth' })}>
            Sign in
          </button>
        </div>
      </div>
    )
  }

  const naoLidas = notificacoes.filter((n) => !n.readAt).length

  return (
    <div className="support-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">My Bids</span>
        </div>
      </header>

      <div className="vault-tabs">
        {ABAS.map((a) => {
          const contagem =
            a.valor === 'notifications'
              ? naoLidas
              : a.valor === 'won'
                ? buckets.won.length
                : buckets[a.valor].length
          return (
            <button
              key={a.valor}
              type="button"
              className={`vault-tab ${aba === a.valor ? 'on' : ''}`}
              onClick={() => setAba(a.valor)}
            >
              {a.rotulo}
              {contagem > 0 && <b>{contagem}</b>}
            </button>
          )
        })}
      </div>

      {aba === 'notifications' ? (
        <div className="promo-admin-lista" style={{ padding: '0 18px 26px' }}>
          {carregandoNotif && <p className="vault-empty">Loading…</p>}
          {!carregandoNotif && notificacoes.length === 0 && <p className="vault-empty">No alerts yet.</p>}
          {notificacoes.map((n) => (
            <button
              key={n.id}
              type="button"
              className="ticket ticket-clicavel"
              onClick={() => {
                if (!n.readAt) marcarLida(n.id)
                if (n.itemSlug) openOverlay({ name: 'auction-item', slug: n.itemSlug })
              }}
            >
              <div className="ticket-topo">
                <span className={`auction-status-pill ${n.readAt ? 'sold' : 'live'}`}>
                  {n.readAt ? 'Read' : 'New'}
                </span>
                <span className="ticket-ref">{formatarData(n.createdAt)}</span>
              </div>
              <div className="pedido-resumo">{n.message}</div>
            </button>
          ))}
        </div>
      ) : aba === 'won' ? (
        <div className="promo-admin-lista" style={{ padding: '0 18px 26px' }}>
          {carregando && <p className="vault-empty">Loading…</p>}
          {!carregando && buckets.won.length === 0 && <p className="vault-empty">No auctions won yet.</p>}
          {buckets.won.map((pedido) => (
            <button
              key={pedido.id}
              type="button"
              className="ticket ticket-clicavel"
              onClick={() => pedido.item && openOverlay({ name: 'auction-item', slug: pedido.item.slug })}
            >
              <div className="ticket-topo">
                <span className={`auction-status-pill ${pedido.paymentStatus === 'paid' ? 'sold' : 'scheduled'}`}>
                  {AUCTION_ORDER_STATUS_LABEL[pedido.paymentStatus]}
                </span>
                <span className="ticket-ref">{pedido.orderNumber}</span>
              </div>
              <div className="pedido-resumo">
                <b>{pedido.itemTitleSnapshot}</b>
              </div>
              <div className="ticket-cat">
                {pedido.athleteNameSnapshot} · {formatarPreco(pedido.winningBidCents)}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <>
          {carregando && <p className="vault-empty">Loading…</p>}
          {!carregando && buckets[aba].length === 0 && (
            <p className="vault-empty">
              {aba === 'winning' && "You're not currently leading any auction."}
              {aba === 'outbid' && "You haven't been outbid on anything."}
              {aba === 'lost' && 'No auctions lost yet.'}
              {aba === 'watching' && "You're not watching any items yet."}
            </p>
          )}
          <div className="auction-grid">
            {buckets[aba].map((item) => (
              <AuctionCard
                key={item.id}
                item={item}
                onOpen={() => openOverlay({ name: 'auction-item', slug: item.slug })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default MyBidsPage
