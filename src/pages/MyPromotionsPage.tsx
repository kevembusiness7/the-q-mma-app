import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { formatarPreco } from '../hooks/useProducts'
import { useMinhasPromocoes } from '../hooks/useMyPromotions'
import { ROTULO_CONTEUDO, ROTULO_PROMO_PAGAMENTO, ROTULO_REVIEW, type PromotionRequest } from '../types/promotions'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/orders.css'
import '../styles/promotions.css'

export function MyPromotionsPage() {
  const { closeOverlay, openOverlay } = useNav()
  const { usuario, carregando: carregandoAuth } = useAuth()
  const { promocoes, carregando, erro } = useMinhasPromocoes(usuario?.id ?? null)
  const [aberta, setAberta] = useState<PromotionRequest | null>(null)

  return (
    <div className="support-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button
            type="button"
            className="appbar-back"
            onClick={aberta ? () => setAberta(null) : closeOverlay}
            aria-label="Voltar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">{aberta ? aberta.requestNumber : 'My promotions'}</span>
        </div>
      </header>

      {carregandoAuth || carregando ? (
        <p className="empty">Loading promotions…</p>
      ) : !usuario ? (
        <div className="auth-aviso">
          <h3>Sign in to see your promotions</h3>
          <p>Bookings are tied to your account so you can track review, scheduling and refunds.</p>
          <button type="button" className="btn" onClick={() => openOverlay({ name: 'auth' })}>
            Sign in
          </button>
        </div>
      ) : erro ? (
        <p className="empty">Could not load your promotions: {erro}</p>
      ) : promocoes.length === 0 ? (
        <p className="empty">
          No promotions booked yet.
          <br />
          <button type="button" className="empty-link" onClick={() => openOverlay({ name: 'promotions' })}>
            Browse athletes
          </button>
        </p>
      ) : aberta ? (
        <DetalhePromocao promocao={aberta} />
      ) : (
        <div className="support-lista">
          {promocoes.map((p) => (
            <button
              key={p.id}
              type="button"
              className="ticket ticket-clicavel"
              onClick={() => setAberta(p)}
            >
              <div className="ticket-topo">
                <span className={`ticket-status pr-${p.reviewStatus}`}>{ROTULO_REVIEW[p.reviewStatus]}</span>
                <span className="ticket-ref">{p.requestNumber}</span>
              </div>
              <div className="pedido-resumo">
                {p.athleteName} · {p.packageTitle} · <b>{formatarPreco(p.totalCents)}</b>
              </div>
              <div className="ticket-cat">
                {ROTULO_CONTEUDO[p.packageContentType]} · requested for{' '}
                {formatarDataCurta(p.scheduledDate ?? p.requestedDate)}
              </div>
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

function DetalhePromocao({ promocao }: { promocao: PromotionRequest }) {
  return (
    <div className="pedido-detalhe">
      <div className="ticket-topo">
        <span className={`ticket-status pr-${promocao.reviewStatus}`}>
          {ROTULO_REVIEW[promocao.reviewStatus]}
        </span>
        <span className="ticket-cat">{ROTULO_PROMO_PAGAMENTO[promocao.paymentStatus]}</span>
      </div>

      <div className="admin-ficha">
        <div className="admin-linha">
          <span>Athlete</span>
          <b>{promocao.athleteName}</b>
        </div>
        <div className="admin-linha">
          <span>Package</span>
          <b>
            {promocao.packageTitle} ({ROTULO_CONTEUDO[promocao.packageContentType]})
          </b>
        </div>
        <div className="admin-linha">
          <span>Requested date</span>
          <b>{formatarDataCurta(promocao.requestedDate)}</b>
        </div>
        {promocao.scheduledDate && (
          <div className="admin-linha">
            <span>Scheduled date</span>
            <b>{formatarDataCurta(promocao.scheduledDate)}</b>
          </div>
        )}
        <div className="admin-linha">
          <span>Business Instagram</span>
          <b>@{promocao.campaignBusinessInstagram}</b>
        </div>
      </div>

      {promocao.reviewStatus === 'rejected' && promocao.rejectionReason && (
        <p className="auth-erro" role="alert">
          Rejected: {promocao.rejectionReason}
        </p>
      )}

      <div className="totals">
        <div>
          <span>{promocao.packageTitle}</span>
          <span>{formatarPreco(promocao.packagePriceCents)}</span>
        </div>
        {promocao.needsContentCreation && (
          <div>
            <span>Content creation</span>
            <span>{formatarPreco(promocao.contentCreationFeeCents)}</span>
          </div>
        )}
        <div className="totals-final">
          <span>Total</span>
          <span>{formatarPreco(promocao.totalCents)}</span>
        </div>
      </div>

      <time className="ticket-data pedido-data" dateTime={promocao.createdAt}>
        Booked on {formatarData(promocao.createdAt)}
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

function formatarDataCurta(iso: string): string {
  // Datas puras (YYYY-MM-DD, sem hora) -- new Date(iso) interpretaria como
  // meia-noite UTC e poderia mostrar o dia errado num fuso atrás de UTC.
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default MyPromotionsPage
