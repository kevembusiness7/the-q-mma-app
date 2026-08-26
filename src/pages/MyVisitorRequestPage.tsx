import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { useMyVisitorRequest } from '../hooks/useVisitorRequest'
import { VisitorPassCard } from '../components/visitor/VisitorPassCard'
import { ROTULO_EXPERIENCE, ROTULO_VISITOR_STATUS } from '../types/visitor'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/orders.css'
import '../styles/certificate.css'
import '../styles/visitors.css'

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
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const NAO_ATIVO = new Set(['rejected', 'cancelled', 'expired'])

/**
 * Hub de status do pedido de visita mais recente do usuário. Ramifica pelo
 * status -- ver o estado ACTIVE_VISITOR_STATUSES em types/visitor.ts, que
 * também governa se o CTA da home mostra "pedir" ou "ver status".
 */
export function MyVisitorRequestPage() {
  const { closeOverlay, openOverlay } = useNav()
  const { usuario, carregando: carregandoAuth } = useAuth()
  const { request, carregando, erro } = useMyVisitorRequest(usuario?.id ?? null)

  return (
    <div className="support-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">Visitor Class Request</span>
        </div>
      </header>

      {carregandoAuth || carregando ? (
        <p className="empty">Loading…</p>
      ) : !usuario ? (
        <div className="auth-aviso">
          <h3>Sign in to see your request</h3>
          <p>Visitor requests, waivers, and passes are tied to your account.</p>
          <button type="button" className="btn" onClick={() => openOverlay({ name: 'auth' })}>
            Sign in
          </button>
        </div>
      ) : erro ? (
        <p className="empty">Could not load your request: {erro}</p>
      ) : !request || NAO_ATIVO.has(request.status) ? (
        <div className="auth-aviso">
          {request && NAO_ATIVO.has(request.status) ? (
            <>
              <h3>
                {request.status === 'rejected'
                  ? 'Your last request was not approved'
                  : request.status === 'expired'
                    ? 'Your last clearance has expired'
                    : 'Your last request was cancelled'}
              </h3>
              {request.status === 'rejected' && request.rejectionReason && (
                <p>{request.rejectionReason}</p>
              )}
              {request.status === 'expired' && (
                <p>Your Visitor Pass is no longer valid. Submit a new request to train again.</p>
              )}
            </>
          ) : (
            <>
              <h3>Visit THE Q MMA</h3>
              <p>Request a trial class at the academy. Our team reviews every request personally.</p>
            </>
          )}
          <button type="button" className="btn" onClick={() => openOverlay({ name: 'visitor-request' })}>
            Request a Visitor Class
          </button>
        </div>
      ) : (
        <div className="pedido-detalhe">
          <div className="ticket-topo">
            <span className={`ticket-status vr-${request.status}`}>{ROTULO_VISITOR_STATUS[request.status]}</span>
            <span className="ticket-ref">requested {formatarDataCurta(request.requestedDate)}</span>
          </div>

          <div className="admin-ficha">
            <div className="admin-linha">
              <span>Class</span>
              <b>{request.requestedClassName}</b>
            </div>
            <div className="admin-linha">
              <span>Requested date</span>
              <b>
                {formatarDataCurta(request.requestedDate)}
                {request.requestedTime ? ` · ${request.requestedTime}` : ''}
              </b>
            </div>
            <div className="admin-linha">
              <span>Experience</span>
              <b>{ROTULO_EXPERIENCE[request.experienceLevel]}</b>
            </div>
          </div>

          {(request.status === 'submitted' || request.status === 'under_review') && (
            <p className="cart-note">
              We&rsquo;re reviewing your request. You&rsquo;ll get an email as soon as there&rsquo;s an
              update — check back here any time.
            </p>
          )}

          {request.status === 'approved_pending_waiver' && (
            <div className="admin-acoes">
              <h4>One step left</h4>
              <p className="cart-note">
                Your visitor class was approved. Sign the liability waiver to get cleared to train.
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => openOverlay({ name: 'visitor-waiver', requestId: request.id })}
              >
                Sign your waiver now
              </button>
            </div>
          )}

          {request.status === 'cleared_to_train' && request.pass && (
            <>
              <VisitorPassCard pass={request.pass} url={`${window.location.origin}/visitor-pass/${request.pass.passCode}`} />
              <p className="visitor-pass-shareline">
                {window.location.origin}/visitor-pass/{request.pass.passCode}
              </p>
            </>
          )}

          <time className="ticket-data pedido-data" dateTime={request.createdAt}>
            Requested on {formatarData(request.createdAt)}
          </time>
        </div>
      )}
    </div>
  )
}

export default MyVisitorRequestPage
