import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { supabase } from '../lib/supabase'
import {
  useAdminAuctionQueue,
  FILTROS_PEDIDO_LEILAO,
  seEncaixaLeilao,
  type FiltroPedidoLeilao,
} from '../hooks/useAdminAuctionQueue'
import { formatarPreco } from '../hooks/useProducts'
import { Countdown } from '../components/auction/Countdown'
import { AUCTION_ORDER_STATUS_LABEL, type AuctionItem, type AuctionOrder } from '../types/auction'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/promotions.css'
import '../styles/auction.css'

type Modo = 'orders' | 'live'

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AdminAuctionQueuePage() {
  const { closeOverlay } = useNav()
  const { usuario, ehAdmin, carregando: carregandoAuth } = useAuth()
  const { pedidos, itensAoVivo, carregando, erro, recarregar, despachar, marcarEntregue, tentarCobrancaNovamente, bloquearLance } =
    useAdminAuctionQueue(ehAdmin)
  const [modo, setModo] = useState<Modo>('orders')
  const [filtro, setFiltro] = useState<FiltroPedidoLeilao>('to_ship')
  const [pedidoAbertoId, setPedidoAbertoId] = useState<string | null>(null)
  const [itemAbertoId, setItemAbertoId] = useState<string | null>(null)

  if (carregandoAuth) {
    return (
      <Casca titulo="Vault queue" aoVoltar={closeOverlay}>
        <p className="empty">Loading…</p>
      </Casca>
    )
  }

  if (!usuario || !ehAdmin) {
    return (
      <Casca titulo="Vault queue" aoVoltar={closeOverlay}>
        <div className="auth-aviso">
          <h3>Restricted area</h3>
          <p>This screen is only available to team accounts.</p>
          <button type="button" className="btn" onClick={closeOverlay}>
            Go back
          </button>
        </div>
      </Casca>
    )
  }

  const pedidoAberto = pedidoAbertoId ? (pedidos.find((p) => p.id === pedidoAbertoId) ?? null) : null
  const itemAberto = itemAbertoId ? (itensAoVivo.find((i) => i.id === itemAbertoId) ?? null) : null

  if (pedidoAberto) {
    return (
      <Casca titulo={pedidoAberto.orderNumber} aoVoltar={() => setPedidoAbertoId(null)}>
        <DetalhePedido
          pedido={pedidoAberto}
          aoDespachar={(t, c) => despachar(pedidoAberto.id, t, c)}
          aoMarcarEntregue={() => marcarEntregue(pedidoAberto.id)}
          aoTentarNovamente={() => tentarCobrancaNovamente(pedidoAberto.id)}
        />
      </Casca>
    )
  }

  if (itemAberto) {
    return (
      <Casca titulo={itemAberto.title} aoVoltar={() => setItemAbertoId(null)}>
        <BidsDoItem item={itemAberto} aoBloquear={bloquearLance} />
      </Casca>
    )
  }

  return (
    <Casca titulo="Vault queue" aoVoltar={closeOverlay}>
      <div className="vault-tabs">
        <button type="button" className={`vault-tab ${modo === 'orders' ? 'on' : ''}`} onClick={() => setModo('orders')}>
          Orders
        </button>
        <button type="button" className={`vault-tab ${modo === 'live' ? 'on' : ''}`} onClick={() => setModo('live')}>
          Live Bids
        </button>
      </div>

      {erro && <p className="empty">Could not load: {erro}</p>}

      {modo === 'orders' ? (
        <>
          <div className="vault-tabs">
            {FILTROS_PEDIDO_LEILAO.map((f) => (
              <button
                key={f.valor}
                type="button"
                className={`vault-tab ${filtro === f.valor ? 'on' : ''}`}
                onClick={() => setFiltro(f.valor)}
              >
                {f.rotulo}
                <b>{pedidos.filter((p) => seEncaixaLeilao(p, f.valor)).length}</b>
              </button>
            ))}
          </div>

          {carregando && <p className="empty">Loading…</p>}
          <div className="promo-admin-lista" style={{ padding: '0 18px 26px' }}>
            {pedidos
              .filter((p) => seEncaixaLeilao(p, filtro))
              .map((p) => (
                <button key={p.id} type="button" className="ticket ticket-clicavel" onClick={() => setPedidoAbertoId(p.id)}>
                  <div className="ticket-topo">
                    <span className={`auction-status-pill ${p.paymentStatus === 'paid' ? 'sold' : p.paymentStatus === 'awaiting_payment' ? 'scheduled' : 'unsold'}`}>
                      {AUCTION_ORDER_STATUS_LABEL[p.paymentStatus]}
                    </span>
                    <span className="ticket-ref">{p.orderNumber}</span>
                  </div>
                  <div className="pedido-resumo">
                    <b>{p.itemTitleSnapshot}</b>
                  </div>
                  <div className="ticket-cat">
                    {p.athleteNameSnapshot} · {formatarPreco(p.winningBidCents)}
                    {p.shippedAt && !p.deliveredAt && ' · Shipped'}
                    {p.deliveredAt && ' · Delivered'}
                  </div>
                </button>
              ))}
          </div>
        </>
      ) : (
        <div className="promo-admin-lista" style={{ padding: '0 18px 26px' }}>
          {carregando && <p className="empty">Loading…</p>}
          {!carregando && itensAoVivo.length === 0 && <p className="empty">No live auctions right now.</p>}
          {itensAoVivo.map((item) => (
            <button key={item.id} type="button" className="ticket ticket-clicavel" onClick={() => setItemAbertoId(item.id)}>
              <div className="ticket-topo">
                <span className="auction-status-pill live">Live</span>
                <span className="ticket-ref">
                  Ends in <Countdown endsAt={item.endsAt} />
                </span>
              </div>
              <div className="pedido-resumo">
                <b>{item.title}</b>
              </div>
              <div className="ticket-cat">
                {item.athleteName} · {formatarPreco(item.currentBidCents || item.startingPriceCents)} · {item.bidCount} bids
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="admin-rodape">
        <button type="button" className="empty-link" onClick={recarregar}>
          Refresh
        </button>
      </div>
    </Casca>
  )
}

/* -------------------------------------------------------- detalhe pedido -- */

function DetalhePedido({
  pedido,
  aoDespachar,
  aoMarcarEntregue,
  aoTentarNovamente,
}: {
  pedido: AuctionOrder
  aoDespachar: (transportadora: string, codigo: string) => Promise<string | null>
  aoMarcarEntregue: () => Promise<string | null>
  aoTentarNovamente: () => Promise<string | null>
}) {
  const [transportadora, setTransportadora] = useState(pedido.trackingCarrier ?? '')
  const [codigo, setCodigo] = useState(pedido.trackingNumber ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function acao(fn: () => Promise<string | null>) {
    setSalvando(true)
    setErro(await fn())
    setSalvando(false)
  }

  return (
    <div className="pedido-detalhe">
      <div className="admin-ficha">
        <div className="admin-linha">
          <span>Item</span>
          <span>{pedido.itemTitleSnapshot}</span>
        </div>
        <div className="admin-linha">
          <span>Athlete</span>
          <span>{pedido.athleteNameSnapshot}</span>
        </div>
        <div className="admin-linha">
          <span>Winning bid</span>
          <span>{formatarPreco(pedido.winningBidCents)}</span>
        </div>
        <div className="admin-linha">
          <span>Status</span>
          <span>{AUCTION_ORDER_STATUS_LABEL[pedido.paymentStatus]}</span>
        </div>
      </div>

      {(pedido.paymentStatus === 'failed' || pedido.paymentStatus === 'defaulted') && (
        <div className="admin-acoes">
          <h4>Payment</h4>
          <p className="cart-note">
            {pedido.paymentStatus === 'defaulted'
              ? 'The winner did not complete payment within the deadline and was suspended from bidding. This retries the charge on the same card if you want to give them another chance.'
              : 'The off-session charge failed. You can try again — the winner needs a valid saved card.'}
          </p>
          <button type="button" className="btn" disabled={salvando} onClick={() => acao(aoTentarNovamente)}>
            {salvando ? 'Retrying…' : 'Retry charge'}
          </button>
        </div>
      )}

      {pedido.paymentStatus === 'paid' && (
        <div className="admin-acoes">
          <h4>Shipping</h4>
          {pedido.shippedAt ? (
            <p className="cart-note">
              Shipped {formatarData(pedido.shippedAt)}
              {pedido.trackingCarrier && ` via ${pedido.trackingCarrier}`}
              {pedido.trackingNumber && ` — ${pedido.trackingNumber}`}
            </p>
          ) : (
            <>
              <label className="campo">
                <span>Carrier</span>
                <input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} placeholder="UPS" />
              </label>
              <label className="campo">
                <span>Tracking number</span>
                <input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              </label>
              <button type="button" className="btn" disabled={salvando} onClick={() => acao(() => aoDespachar(transportadora, codigo))}>
                {salvando ? 'Saving…' : 'Mark as shipped'}
              </button>
            </>
          )}
          {pedido.shippedAt && !pedido.deliveredAt && (
            <button type="button" className="btn ghost" disabled={salvando} onClick={() => acao(aoMarcarEntregue)}>
              Mark as delivered
            </button>
          )}
          {pedido.deliveredAt && <p className="cart-note">Delivered {formatarData(pedido.deliveredAt)}.</p>}
        </div>
      )}

      {erro && (
        <p className="auth-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  )
}

/* --------------------------------------------------------- lances do item -- */

interface LanceAdmin {
  id: string
  bidderId: string
  amountCents: number
  placedAt: string
  isBlocked: boolean
}

function BidsDoItem({ item, aoBloquear }: { item: AuctionItem; aoBloquear: (bidId: string) => Promise<string | null> }) {
  const [lances, setLances] = useState<LanceAdmin[]>([])
  const [carregando, setCarregando] = useState(true)
  const [bloqueando, setBloqueando] = useState<string | null>(null)

  async function carregar() {
    if (!supabase) return
    setCarregando(true)
    const { data } = await supabase
      .from('auction_bids')
      .select('id, bidder_id, amount_cents, placed_at, is_blocked')
      .eq('item_id', item.id)
      .order('amount_cents', { ascending: false })
    setLances(
      (data ?? []).map((r: any) => ({
        id: r.id,
        bidderId: r.bidder_id,
        amountCents: r.amount_cents,
        placedAt: r.placed_at,
        isBlocked: r.is_blocked,
      })),
    )
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  async function bloquear(bidId: string) {
    setBloqueando(bidId)
    await aoBloquear(bidId)
    await carregar()
    setBloqueando(null)
  }

  return (
    <div className="pedido-detalhe">
      <div className="admin-ficha">
        <div className="admin-linha">
          <span>Current bid</span>
          <span>{formatarPreco(item.currentBidCents || item.startingPriceCents)}</span>
        </div>
        <div className="admin-linha">
          <span>Ends</span>
          <span>
            <Countdown endsAt={item.endsAt} />
          </span>
        </div>
      </div>

      <div className="admin-acoes">
        <h4>Bids ({lances.length})</h4>
        {carregando && <p className="cart-note">Loading…</p>}
        {!carregando && lances.length === 0 && <p className="cart-note">No bids yet.</p>}
        {lances.map((lance) => (
          <div key={lance.id} className="admin-linha">
            <span>
              {formatarPreco(lance.amountCents)}
              {lance.isBlocked && <i className="promo-inactive"> · blocked</i>}
              <br />
              <span className="cart-note">{lance.bidderId.slice(0, 8)}…</span>
            </span>
            {!lance.isBlocked && (
              <button type="button" className="empty-link" disabled={bloqueando === lance.id} onClick={() => bloquear(lance.id)}>
                {bloqueando === lance.id ? 'Blocking…' : 'Block'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ casca -- */

function Casca({ titulo, aoVoltar, children }: { titulo: string; aoVoltar: () => void; children: ReactNode }) {
  return (
    <div className="support-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={aoVoltar} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">{titulo}</span>
        </div>
      </header>
      {children}
    </div>
  )
}
