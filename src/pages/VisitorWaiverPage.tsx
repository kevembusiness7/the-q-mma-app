import { useRef, useState, type FormEvent } from 'react'
import { useNav } from '../context/NavigationContext'
import { useSignVisitorWaiver, useVisitorRequestDetail } from '../hooks/useVisitorWaiver'
import { IS_PLACEHOLDER_WAIVER, WAIVER_ACKNOWLEDGMENTS, WAIVER_TEXT, WAIVER_VERSION } from '../data/visitorWaiver'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/visitors.css'

type Marcados = Record<(typeof WAIVER_ACKNOWLEDGMENTS)[number]['key'], boolean>

const MARCADOS_INICIAL: Marcados = { risk: false, medical: false, release: false, rules: false }

/**
 * Assinatura do termo de responsabilidade. O que de fato marca
 * cleared_to_train é o gatilho evaluate_visitor_clearance() no banco
 * (visitor-schema.sql), disparado pelo INSERT que sign_visitor_waiver faz --
 * essa tela só chama a RPC e reage ao sucesso, nunca seta status sozinha.
 */
export function VisitorWaiverPage({ requestId }: { requestId: string }) {
  const { closeOverlay } = useNav()
  const { request, carregando } = useVisitorRequestDetail(requestId)
  const { assinar, enviando, erro } = useSignVisitorWaiver()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [rolouAteFim, setRolouAteFim] = useState(false)
  const [marcados, setMarcados] = useState<Marcados>(MARCADOS_INICIAL)
  const [nomeLegal, setNomeLegal] = useState('')
  const [iniciais, setIniciais] = useState('')

  function checarRolagem() {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 6) setRolouAteFim(true)
  }

  const todosMarcados = Object.values(marcados).every(Boolean)
  const valido = rolouAteFim && todosMarcados && nomeLegal.trim().length >= 2 && iniciais.trim().length >= 1

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    const ok = await assinar(requestId, {
      signerFullLegalName: nomeLegal.trim(),
      signerInitials: iniciais.trim(),
      acceptedRiskAcknowledgment: marcados.risk,
      acceptedMedicalFitness: marcados.medical,
      acceptedReleaseOfLiability: marcados.release,
      acceptedRulesAndConduct: marcados.rules,
      scrolledToBottom: rolouAteFim,
      contentSnapshot: WAIVER_TEXT,
      waiverVersion: WAIVER_VERSION,
    })
    if (ok) closeOverlay()
  }

  return (
    <div className="support-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">Liability Waiver</span>
        </div>
      </header>

      {carregando ? (
        <p className="empty">Loading…</p>
      ) : !request || request.status !== 'approved_pending_waiver' ? (
        <div className="auth-aviso">
          <h3>Nothing to sign right now</h3>
          <p>This request isn&rsquo;t waiting on a waiver signature.</p>
          <button type="button" className="btn" onClick={closeOverlay}>
            Go back
          </button>
        </div>
      ) : (
        <form onSubmit={enviar}>
          {IS_PLACEHOLDER_WAIVER && (
            <p className="waiver-draft-banner" role="note">
              <b>Draft document:</b> this waiver text is a placeholder and has not been reviewed by an
              attorney. It is shown here to build and test the signing flow end to end.
            </p>
          )}

          <p className="support-intro">
            Read the full waiver below. You need to scroll to the end before you can sign.
          </p>

          <div className="waiver-scrollbox" ref={scrollRef} onScroll={checarRolagem}>
            {WAIVER_TEXT}
          </div>
          <p className={`waiver-scroll-hint ${rolouAteFim ? 'ok' : ''}`}>
            {rolouAteFim ? '✓ You reached the end' : 'Scroll to the end to continue'}
          </p>

          <div className="waiver-checklist">
            {WAIVER_ACKNOWLEDGMENTS.map((item) => (
              <label key={item.key} className={`waiver-check-row ${rolouAteFim ? '' : 'disabled'}`}>
                <input
                  type="checkbox"
                  checked={marcados[item.key]}
                  disabled={!rolouAteFim}
                  onChange={(e) => setMarcados((m) => ({ ...m, [item.key]: e.target.checked }))}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <div className="auth-form">
            <label className="campo">
              <span>Type your full legal name</span>
              <input
                type="text"
                value={nomeLegal}
                onChange={(e) => setNomeLegal(e.target.value)}
                disabled={!rolouAteFim}
                placeholder={request.fullName}
              />
            </label>
            <label className="campo">
              <span>Initials</span>
              <input
                type="text"
                value={iniciais}
                onChange={(e) => setIniciais(e.target.value)}
                disabled={!rolouAteFim}
                placeholder="e.g. JD"
                maxLength={6}
              />
            </label>

            {erro && (
              <p className="auth-erro" role="alert">
                {erro}
              </p>
            )}

            <button type="submit" className="btn" disabled={!valido || enviando}>
              {enviando ? 'Signing…' : 'Sign & get cleared to train'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default VisitorWaiverPage
