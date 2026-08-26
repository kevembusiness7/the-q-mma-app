import { useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import {
  FILTROS_VISITANTE,
  seEncaixaVisitante,
  useAnotacoesVisitante,
  useVisitantesAdmin,
  type FiltroVisitante,
} from '../hooks/useAdminVisitors'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import {
  ROTULO_EXPERIENCE,
  ROTULO_REJECTION,
  ROTULO_VISITOR_STATUS,
  type VisitorClassRequest,
  type VisitorRejectionReasonCode,
} from '../types/visitor'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/orders.css'
import '../styles/visitors.css'

const HOJE = new Date().toISOString().slice(0, 10)

/**
 * Fila de aprovação de pedidos de visita. Esconder a tela é conveniência,
 * não segurança -- o RLS em visitor-schema.sql é quem barra de fato quem
 * não é admin.
 */
export function AdminVisitorsPage() {
  const { closeOverlay } = useNav()
  const { usuario, ehAdmin, carregando: carregandoAuth } = useAuth()
  const { visitantes, carregando, erro, recarregar, moverParaRevisao, aprovar, rejeitar, cancelar, marcarExpirado } =
    useVisitantesAdmin(ehAdmin)
  const [filtro, setFiltro] = useState<FiltroVisitante>('new')
  const [busca, setBusca] = useState('')
  const [abertaId, setAbertaId] = useState<string | null>(null)

  if (carregandoAuth) {
    return (
      <Casca titulo="Visitor requests" aoVoltar={closeOverlay}>
        <p className="empty">Loading…</p>
      </Casca>
    )
  }

  if (!usuario || !ehAdmin) {
    return (
      <Casca titulo="Visitor requests" aoVoltar={closeOverlay}>
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

  const aberta = abertaId ? (visitantes.find((v) => v.id === abertaId) ?? null) : null

  if (aberta) {
    return (
      <Casca titulo={aberta.fullName} aoVoltar={() => setAbertaId(null)}>
        <Detalhe
          visitante={aberta}
          aoMoverParaRevisao={() => moverParaRevisao(aberta.id)}
          aoAprovar={() => aprovar(aberta.id)}
          aoRejeitar={(code, motivo) => rejeitar(aberta.id, code, motivo)}
          aoCancelar={() => cancelar(aberta.id)}
          aoMarcarExpirado={() => marcarExpirado(aberta.id)}
        />
      </Casca>
    )
  }

  const contar = (f: FiltroVisitante) => visitantes.filter((v) => seEncaixaVisitante(v, f)).length
  const buscaAlvo = busca.trim().toLowerCase()
  const visiveis = visitantes
    .filter((v) => seEncaixaVisitante(v, filtro))
    .filter(
      (v) =>
        !buscaAlvo ||
        v.fullName.toLowerCase().includes(buscaAlvo) ||
        v.email.toLowerCase().includes(buscaAlvo) ||
        (v.phone ?? '').toLowerCase().includes(buscaAlvo),
    )

  const visitandoHoje = visitantes.filter(
    (v) => v.requestedDate === HOJE && v.status !== 'rejected' && v.status !== 'cancelled',
  ).length

  return (
    <Casca titulo="Visitor requests" aoVoltar={closeOverlay}>
      <div className="visitor-metrics">
        <div className="visitor-metric">
          <b>{contar('new')}</b>
          <span>New</span>
        </div>
        <div className="visitor-metric">
          <b>{contar('waiting_waiver')}</b>
          <span>Waiting waiver</span>
        </div>
        <div className="visitor-metric">
          <b>{contar('cleared')}</b>
          <span>Cleared</span>
        </div>
        <div className="visitor-metric">
          <b>{visitandoHoje}</b>
          <span>Today</span>
        </div>
      </div>

      <div className="admin-filtros">
        {FILTROS_VISITANTE.map((f) => (
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

      <div style={{ padding: '0 18px 14px' }}>
        <label className="campo">
          <span>Search</span>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Name, email, or phone…"
          />
        </label>
      </div>

      {carregando && <p className="empty">Loading…</p>}
      {erro && <p className="empty">Could not load: {erro}</p>}
      {!carregando && visiveis.length === 0 && (
        <p className="empty">{filtro === 'new' ? 'No new requests. All caught up.' : 'Nothing here.'}</p>
      )}

      <div className="support-lista">
        {visiveis.map((v) => (
          <button key={v.id} type="button" className="ticket ticket-clicavel" onClick={() => setAbertaId(v.id)}>
            <div className="ticket-topo">
              <span className={`ticket-status vr-${v.status}`}>{ROTULO_VISITOR_STATUS[v.status]}</span>
              <span className="ticket-ref">{formatarDataCurta(v.requestedDate)}</span>
            </div>
            <div className="pedido-resumo">
              {v.fullName} · {v.requestedClassName}
            </div>
            <div className="ticket-cat">{ROTULO_EXPERIENCE[v.experienceLevel]}</div>
            <time className="ticket-data" dateTime={v.createdAt}>
              Requested on {formatarData(v.createdAt)}
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
  visitante,
  aoMoverParaRevisao,
  aoAprovar,
  aoRejeitar,
  aoCancelar,
  aoMarcarExpirado,
}: {
  visitante: VisitorClassRequest
  aoMoverParaRevisao: () => Promise<string | null>
  aoAprovar: () => Promise<string | null>
  aoRejeitar: (code: VisitorRejectionReasonCode, motivo: string) => Promise<string | null>
  aoCancelar: () => Promise<string | null>
  aoMarcarExpirado: () => Promise<string | null>
}) {
  const { usuario } = useAuth()
  const { anotacoes, anotar } = useAnotacoesVisitante(visitante.id)
  const [codigoRejeicao, setCodigoRejeicao] = useState<VisitorRejectionReasonCode>('incomplete_information')
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [nota, setNota] = useState('')
  const [confirmandoAprovacao, setConfirmandoAprovacao] = useState(false)

  const idade = useMemo(() => idadeEm(visitante.dateOfBirth), [visitante.dateOfBirth])

  async function executar(acao: () => Promise<string | null>) {
    setSalvando(true)
    setErro(await acao())
    setSalvando(false)
  }

  return (
    <div className="pedido-detalhe">
      <div className="ticket-topo">
        <span className={`ticket-status vr-${visitante.status}`}>{ROTULO_VISITOR_STATUS[visitante.status]}</span>
        <span className="ticket-cat">{formatarDataCurta(visitante.requestedDate)}</span>
      </div>

      <div className="admin-ficha">
        <div className="admin-linha">
          <span>Full name</span>
          <b>{visitante.fullName}</b>
        </div>
        <div className="admin-linha">
          <span>Email</span>
          <a href={`mailto:${visitante.email}`}>{visitante.email}</a>
        </div>
        {visitante.phone && (
          <div className="admin-linha">
            <span>Phone</span>
            <a href={`tel:${visitante.phone}`}>{visitante.phone}</a>
          </div>
        )}
        <div className="admin-linha">
          <span>Date of birth</span>
          <b>
            {formatarDataCurta(visitante.dateOfBirth)}
            {idade !== null ? ` (${idade})` : ''}
          </b>
        </div>
        <div className="admin-linha">
          <span>Class</span>
          <b>{visitante.requestedClassName}</b>
        </div>
        <div className="admin-linha">
          <span>Requested date</span>
          <b>
            {formatarDataCurta(visitante.requestedDate)}
            {visitante.requestedTime ? ` · ${visitante.requestedTime}` : ''}
          </b>
        </div>
        <div className="admin-linha">
          <span>Experience</span>
          <b>{ROTULO_EXPERIENCE[visitante.experienceLevel]}</b>
        </div>
      </div>

      {(visitante.martialArtsExperience || visitante.notesFromVisitor) && (
        <div className="admin-acoes">
          <h4>From the visitor</h4>
          {visitante.martialArtsExperience && <p className="ticket-msg">{visitante.martialArtsExperience}</p>}
          {visitante.notesFromVisitor && <p className="ticket-msg">{visitante.notesFromVisitor}</p>}
        </div>
      )}

      {erro && (
        <p className="auth-erro" role="alert">
          {erro}
        </p>
      )}

      {/* -------------------------------------------------------- decisão -- */}
      {(visitante.status === 'submitted' || visitante.status === 'under_review') && (
        <div className="admin-acoes">
          <h4>Review</h4>
          {visitante.status === 'submitted' && (
            <button type="button" className="btn ghost" disabled={salvando} onClick={() => executar(aoMoverParaRevisao)}>
              Start review
            </button>
          )}
          <button type="button" className="btn" disabled={salvando} onClick={() => setConfirmandoAprovacao(true)}>
            Approve
          </button>

          <label className="campo">
            <span>Decline reason</span>
            <select value={codigoRejeicao} onChange={(e) => setCodigoRejeicao(e.target.value as VisitorRejectionReasonCode)}>
              {Object.entries(ROTULO_REJECTION).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Message to the visitor — optional</span>
            <textarea rows={2} value={motivoRejeicao} onChange={(e) => setMotivoRejeicao(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn ghost"
            disabled={salvando}
            onClick={() => executar(() => aoRejeitar(codigoRejeicao, motivoRejeicao.trim()))}
          >
            Decline
          </button>
        </div>
      )}

      {visitante.status === 'approved_pending_waiver' && (
        <div className="admin-acoes">
          <h4>Waiting on the visitor</h4>
          <p className="cart-note">
            Approved. The visitor needs to sign the liability waiver in the app before they&rsquo;re
            cleared to train — nothing else to do here yet.
          </p>
          <button type="button" className="btn ghost" disabled={salvando} onClick={() => executar(aoCancelar)}>
            Cancel booking
          </button>
        </div>
      )}

      {visitante.status === 'cleared_to_train' && (
        <div className="admin-acoes">
          <h4>Cleared to train</h4>
          {visitante.pass && (
            <div className="admin-ficha">
              <div className="admin-linha">
                <span>Pass code</span>
                <b>{visitante.pass.passCode}</b>
              </div>
              {visitante.expiresAt && (
                <div className="admin-linha">
                  <span>Valid through</span>
                  <b>{formatarData(visitante.expiresAt)}</b>
                </div>
              )}
            </div>
          )}
          <button type="button" className="btn ghost" disabled={salvando} onClick={() => executar(aoMarcarExpirado)}>
            Mark expired
          </button>
        </div>
      )}

      {visitante.status === 'rejected' && visitante.rejectionReason && (
        <p className="auth-erro" role="alert">
          {visitante.rejectionReasonCode ? `${ROTULO_REJECTION[visitante.rejectionReasonCode]}: ` : ''}
          {visitante.rejectionReason}
        </p>
      )}

      {/* ------------------------------------------------------ anotações -- */}
      <div className="admin-acoes">
        <h4>Internal notes</h4>
        <p className="cart-note">Only the team sees these. The visitor never does.</p>

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
            placeholder="Checked ID at front desk, confirmed by phone…"
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

      {confirmandoAprovacao && (
        <ConfirmDialog
          title="Approve this request?"
          message={`${visitante.fullName} will be asked to sign the liability waiver next. They are not cleared to train until they sign it.`}
          confirmLabel="Approve"
          confirming={salvando}
          onCancel={() => setConfirmandoAprovacao(false)}
          onConfirm={async () => {
            await executar(aoAprovar)
            setConfirmandoAprovacao(false)
          }}
        />
      )}
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

function idadeEm(dataNascimento: string): number | null {
  if (!dataNascimento) return null
  const [ano, mes, dia] = dataNascimento.split('-').map(Number)
  if (!ano || !mes || !dia) return null
  const nascimento = new Date(ano, mes - 1, dia)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())
  if (aindaNaoFezAniversario) idade -= 1
  return idade
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

export default AdminVisitorsPage
