import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { formatarPreco } from '../hooks/useProducts'
import {
  FILTROS_PROMOCAO,
  seEncaixaPromocao,
  urlDoAnexoPromocao,
  useAnotacoesPromocao,
  usePromocoesAdmin,
  type FiltroPromocao,
} from '../hooks/useAdminPromotions'
import { ROTULO_CONTEUDO, ROTULO_PROMO_PAGAMENTO, ROTULO_REVIEW, type PromotionRequest } from '../types/promotions'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/orders.css'
import '../styles/promotions.css'

const EXT_VIDEO = ['mp4', 'mov', 'webm', 'm4v']

/**
 * Fila de aprovação de Athlete Promotions.
 *
 * Esconder a tela é conveniência, não segurança: o RLS é quem barra de fato.
 */
export function AdminPromotionQueuePage() {
  const { closeOverlay } = useNav()
  const { usuario, ehAdmin, carregando: carregandoAuth } = useAuth()
  const {
    promocoes,
    carregando,
    erro,
    recarregar,
    moverParaRevisao,
    aprovar,
    agendar,
    marcarPostado,
    rejeitar,
    cancelar,
  } = usePromocoesAdmin(ehAdmin)
  const [filtro, setFiltro] = useState<FiltroPromocao>('needs_review')
  const [abertaId, setAbertaId] = useState<string | null>(null)

  if (carregandoAuth) {
    return (
      <Casca titulo="Promotion requests" aoVoltar={closeOverlay}>
        <p className="empty">Loading…</p>
      </Casca>
    )
  }

  if (!usuario || !ehAdmin) {
    return (
      <Casca titulo="Promotion requests" aoVoltar={closeOverlay}>
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

  // Guardo o id, não o objeto: o detalhe reflete na hora o que as ações
  // mudaram na lista, sem uma segunda cópia da promoção para manter em dia.
  const aberta = abertaId ? (promocoes.find((p) => p.id === abertaId) ?? null) : null

  if (aberta) {
    return (
      <Casca titulo={aberta.requestNumber} aoVoltar={() => setAbertaId(null)}>
        <Detalhe
          promocao={aberta}
          aoMoverParaRevisao={() => moverParaRevisao(aberta.id)}
          aoAprovar={(data) => aprovar(aberta.id, data)}
          aoAgendar={(data) => agendar(aberta.id, data)}
          aoMarcarPostado={() => marcarPostado(aberta.id)}
          aoRejeitar={(motivo) => rejeitar(aberta.id, motivo)}
          aoCancelar={() => cancelar(aberta.id)}
        />
      </Casca>
    )
  }

  const visiveis = promocoes.filter((p) => seEncaixaPromocao(p, filtro))
  const contar = (f: FiltroPromocao) => promocoes.filter((p) => seEncaixaPromocao(p, f)).length

  return (
    <Casca titulo="Promotion requests" aoVoltar={closeOverlay}>
      <div className="admin-filtros">
        {FILTROS_PROMOCAO.map((f) => (
          <button
            key={f.valor}
            type="button"
            className={`auth-aba ${filtro === f.valor ? 'on' : ''}`}
            onClick={() => setFiltro(f.valor)}
          >
            {f.rotulo}
            <b> {contar(f.valor)}</b>
          </button>
        ))}
      </div>

      {carregando && <p className="empty">Loading…</p>}
      {erro && <p className="empty">Could not load: {erro}</p>}
      {!carregando && visiveis.length === 0 && (
        <p className="empty">
          {filtro === 'needs_review' ? 'Nothing waiting for review. All caught up.' : 'Nothing here.'}
        </p>
      )}

      <div className="support-lista">
        {visiveis.map((p) => (
          <button
            key={p.id}
            type="button"
            className="ticket ticket-clicavel"
            onClick={() => setAbertaId(p.id)}
          >
            <div className="ticket-topo">
              <span className={`ticket-status pr-${p.reviewStatus}`}>{ROTULO_REVIEW[p.reviewStatus]}</span>
              <span className="ticket-ref">{p.requestNumber}</span>
            </div>
            <div className="pedido-resumo">
              {p.athleteName} · {p.packageTitle} · <b>{formatarPreco(p.totalCents)}</b>
            </div>
            <div className="ticket-cat">
              {ROTULO_CONTEUDO[p.packageContentType]} · @{p.campaignBusinessInstagram}
            </div>
            <time className="ticket-data" dateTime={p.createdAt}>
              Requested for {formatarDataCurta(p.scheduledDate ?? p.requestedDate)}
            </time>
          </button>
        ))}
      </div>

      {!carregando && (
        <div className="admin-rodape">
          <button type="button" className="empty-link" onClick={recarregar}>
            Refresh
          </button>
        </div>
      )}
    </Casca>
  )
}

/* ---------------------------------------------------------------- detalhe -- */

function Detalhe({
  promocao,
  aoMoverParaRevisao,
  aoAprovar,
  aoAgendar,
  aoMarcarPostado,
  aoRejeitar,
  aoCancelar,
}: {
  promocao: PromotionRequest
  aoMoverParaRevisao: () => Promise<string | null>
  aoAprovar: (data: string) => Promise<string | null>
  aoAgendar: (data: string) => Promise<string | null>
  aoMarcarPostado: () => Promise<string | null>
  aoRejeitar: (motivo: string) => Promise<string | null>
  aoCancelar: () => Promise<string | null>
}) {
  const { usuario } = useAuth()
  const { anotacoes, anotar } = useAnotacoesPromocao(promocao.id)
  const [urlLogo, setUrlLogo] = useState<string | null>(null)
  const [urlMidia, setUrlMidia] = useState<string | null>(null)
  const [dataAgendada, setDataAgendada] = useState(promocao.scheduledDate ?? promocao.requestedDate)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [nota, setNota] = useState('')

  useEffect(() => {
    if (promocao.campaignLogoPath) urlDoAnexoPromocao(promocao.campaignLogoPath).then(setUrlLogo)
    urlDoAnexoPromocao(promocao.campaignMediaPath).then(setUrlMidia)
  }, [promocao.campaignLogoPath, promocao.campaignMediaPath])

  const ehVideo = EXT_VIDEO.includes(promocao.campaignMediaPath.split('.').pop()?.toLowerCase() ?? '')

  async function executar(acao: () => Promise<string | null>) {
    setSalvando(true)
    setErro(await acao())
    setSalvando(false)
  }

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
        <div className="admin-linha">
          <span>Total</span>
          <b>
            {formatarPreco(promocao.totalCents)}
            {promocao.needsContentCreation ? ' (incl. content creation)' : ''}
          </b>
        </div>
      </div>

      {/* -------------------------------------------------------- campanha -- */}
      <div className="admin-acoes">
        <h4>Campaign</h4>
        <div className="admin-ficha">
          <div className="admin-linha">
            <span>Business Instagram</span>
            <b>@{promocao.campaignBusinessInstagram}</b>
          </div>
          {promocao.campaignWebsiteLink && (
            <div className="admin-linha">
              <span>Website</span>
              <a href={promocao.campaignWebsiteLink} target="_blank" rel="noopener noreferrer">
                {promocao.campaignWebsiteLink}
              </a>
            </div>
          )}
          {promocao.campaignCta && (
            <div className="admin-linha">
              <span>Call to action</span>
              <b>{promocao.campaignCta}</b>
            </div>
          )}
        </div>
        {promocao.campaignCaption && <p className="ticket-msg">{promocao.campaignCaption}</p>}
        {promocao.campaignNotes && (
          <p className="cart-note">Additional instructions: {promocao.campaignNotes}</p>
        )}

        {urlLogo && (
          <a className="admin-anexo" href={urlLogo} target="_blank" rel="noopener noreferrer">
            <img src={urlLogo} alt="Business logo" />
            <span>Open logo</span>
          </a>
        )}
        {urlMidia && (
          <a className="admin-anexo" href={urlMidia} target="_blank" rel="noopener noreferrer">
            {ehVideo ? (
              <video src={urlMidia} muted />
            ) : (
              <img src={urlMidia} alt="Campaign media" />
            )}
            <span>Open media</span>
          </a>
        )}
      </div>

      {erro && (
        <p className="auth-erro" role="alert">
          {erro}
        </p>
      )}

      {/* -------------------------------------------------------- decisão -- */}
      {(promocao.reviewStatus === 'pending_review' || promocao.reviewStatus === 'under_review') && (
        <div className="admin-acoes">
          <h4>Review</h4>
          {promocao.reviewStatus === 'pending_review' && (
            <button
              type="button"
              className="btn ghost"
              disabled={salvando}
              onClick={() => executar(aoMoverParaRevisao)}
            >
              Start review
            </button>
          )}
          <label className="campo">
            <span>Schedule for</span>
            <input type="date" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />
          </label>
          <div className="admin-botoes">
            <button
              type="button"
              className="btn"
              disabled={salvando || !dataAgendada}
              onClick={() => executar(() => aoAprovar(dataAgendada))}
            >
              Approve & schedule
            </button>
          </div>
          <label className="campo">
            <span>Rejection reason (shown to the customer)</span>
            <textarea rows={2} value={motivoRejeicao} onChange={(e) => setMotivoRejeicao(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn ghost"
            disabled={salvando || motivoRejeicao.trim().length < 3}
            onClick={() => executar(() => aoRejeitar(motivoRejeicao.trim()))}
          >
            Reject
          </button>
          <p className="cart-note">
            Rejecting does not refund automatically — issue the refund in the Stripe dashboard;
            the payment status here syncs once Stripe confirms it.
          </p>
        </div>
      )}

      {promocao.reviewStatus === 'approved' && (
        <div className="admin-acoes">
          <h4>Reschedule</h4>
          <label className="campo">
            <span>Scheduled date</span>
            <input type="date" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />
          </label>
          <div className="admin-botoes">
            <button
              type="button"
              className="btn"
              disabled={salvando || !dataAgendada}
              onClick={() => executar(() => aoAgendar(dataAgendada))}
            >
              Confirm scheduled
            </button>
          </div>
        </div>
      )}

      {promocao.reviewStatus === 'scheduled' && (
        <div className="admin-acoes">
          <h4>Publishing</h4>
          <button type="button" className="btn" disabled={salvando} onClick={() => executar(aoMarcarPostado)}>
            Mark as posted
          </button>
        </div>
      )}

      {(promocao.reviewStatus === 'approved' || promocao.reviewStatus === 'scheduled') && (
        <button type="button" className="btn ghost" disabled={salvando} onClick={() => executar(aoCancelar)}>
          Cancel booking
        </button>
      )}

      {/* ------------------------------------------------------ anotações -- */}
      <div className="admin-acoes">
        <h4>Internal notes</h4>
        <p className="cart-note">Only the team sees these. The customer never does.</p>

        {anotacoes.length > 0 && (
          <div className="admin-notas">
            {anotacoes.map((a) => (
              <div key={a.id} className="admin-nota">
                <p>{a.note}</p>
                <time dateTime={a.createdAt}>{formatarData(a.createdAt)}</time>
              </div>
            ))}
          </div>
        )}

        <label className="campo">
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            placeholder="Refunded in Stripe on 09/12, athlete confirmed by DM…"
          />
        </label>
        <button
          type="button"
          className="btn ghost"
          disabled={nota.trim().length < 2 || !usuario}
          onClick={async () => {
            const falha = await anotar(nota.trim(), usuario!.id)
            if (falha) setErro(falha)
            else setNota('')
          }}
        >
          Add note
        </button>
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
