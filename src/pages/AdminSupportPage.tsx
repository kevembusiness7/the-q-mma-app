import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { useChamadosAdmin, useConversa, urlDoAnexo } from '../hooks/useAdminSupport'
import { CATEGORIAS, ROTULO_STATUS, type Chamado, type StatusChamado } from '../hooks/useSupport'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'

const FILTROS: { valor: StatusChamado | 'all'; rotulo: string }[] = [
  { valor: 'all', rotulo: 'All' },
  { valor: 'new', rotulo: 'New' },
  { valor: 'in_progress', rotulo: 'In progress' },
  { valor: 'resolved', rotulo: 'Resolved' },
]

export function AdminSupportPage() {
  const { closeOverlay } = useNav()
  const { usuario, ehAdmin, carregando: carregandoAuth } = useAuth()
  const { chamados, carregando, erro, mudarStatus, recarregar } = useChamadosAdmin(ehAdmin)
  const [filtro, setFiltro] = useState<StatusChamado | 'all'>('all')
  const [aberto, setAberto] = useState<Chamado | null>(null)

  if (carregandoAuth) return <Casca titulo="Support inbox"><p className="empty">Loading…</p></Casca>

  // Esconder a tela é conveniência, não segurança: o RLS é quem barra de fato.
  if (!usuario || !ehAdmin) {
    return (
      <Casca titulo="Support inbox">
        <div className="auth-aviso">
          <h3>Restricted area</h3>
          <p>This inbox is only available to team accounts.</p>
          <button type="button" className="btn" onClick={closeOverlay}>
            Go back
          </button>
        </div>
      </Casca>
    )
  }

  if (aberto) {
    return (
      <Detalhe
        chamado={aberto}
        aoVoltar={() => {
          setAberto(null)
          recarregar()
        }}
        aoMudarStatus={(s) => {
          mudarStatus(aberto.id, s)
          setAberto({ ...aberto, status: s })
        }}
      />
    )
  }

  const visiveis = filtro === 'all' ? chamados : chamados.filter((c) => c.status === filtro)
  const contar = (s: StatusChamado) => chamados.filter((c) => c.status === s).length

  return (
    <Casca titulo="Support inbox">
      <div className="admin-filtros">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            className={`auth-aba ${filtro === f.valor ? 'on' : ''}`}
            onClick={() => setFiltro(f.valor)}
          >
            {f.rotulo}
            {f.valor !== 'all' && <b> {contar(f.valor as StatusChamado)}</b>}
          </button>
        ))}
      </div>

      {carregando && <p className="empty">Loading tickets…</p>}
      {erro && <p className="empty">Could not load: {erro}</p>}
      {!carregando && visiveis.length === 0 && <p className="empty">No tickets here.</p>}

      <div className="support-lista">
        {visiveis.map((c) => (
          <button key={c.id} type="button" className="ticket ticket-clicavel" onClick={() => setAberto(c)}>
            <div className="ticket-topo">
              <span className={`ticket-status s-${c.status}`}>{ROTULO_STATUS[c.status]}</span>
              <span className="ticket-ref">#{c.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="ticket-cat">
              {CATEGORIAS.find((x) => x.valor === c.category)?.rotulo ?? c.category}
              {c.screenshotPath && <span className="ticket-clipe" aria-label="Tem anexo"> · 📎</span>}
              {c.orderNumber && <span className="ticket-pedido">{c.orderNumber}</span>}
            </div>
            <div className="ticket-de">
              {c.name} · {c.email}
            </div>
            <p className="ticket-msg">{c.message}</p>
            <time className="ticket-data" dateTime={c.createdAt}>
              {formatarData(c.createdAt)}
            </time>
          </button>
        ))}
      </div>
    </Casca>
  )
}

/* ---------------------------------------------------------------- detalhe -- */

function Detalhe({
  chamado,
  aoVoltar,
  aoMudarStatus,
}: {
  chamado: Chamado
  aoVoltar: () => void
  aoMudarStatus: (s: StatusChamado) => void
}) {
  const { usuario } = useAuth()
  const { mensagens, responder } = useConversa(chamado.id)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [anexo, setAnexo] = useState<string | null>(null)

  useEffect(() => {
    if (!chamado.screenshotPath) return
    urlDoAnexo(chamado.screenshotPath).then(setAnexo)
  }, [chamado.screenshotPath])

  async function enviarResposta() {
    if (texto.trim().length < 2 || !usuario) return
    setEnviando(true)
    const falha = await responder(texto.trim(), usuario.id, true)
    setEnviando(false)
    if (falha) return setErro(falha)
    setTexto('')
    setErro(null)
    // Uma resposta da equipe significa que o chamado saiu da fila de novos.
    if (chamado.status === 'new') aoMudarStatus('in_progress')
  }

  return (
    <div className="support-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={aoVoltar} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">#{chamado.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </header>

      <div className="admin-status">
        {(['new', 'in_progress', 'resolved'] as StatusChamado[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`auth-aba ${chamado.status === s ? 'on' : ''}`}
            onClick={() => aoMudarStatus(s)}
          >
            {ROTULO_STATUS[s]}
          </button>
        ))}
      </div>

      <div className="admin-ficha">
        <Linha rotulo="From" valor={chamado.name} />
        <Linha rotulo="Email" valor={chamado.email} link={`mailto:${chamado.email}`} />
        <Linha
          rotulo="Category"
          valor={CATEGORIAS.find((x) => x.valor === chamado.category)?.rotulo ?? chamado.category}
        />
        {chamado.orderNumber && <Linha rotulo="Order" valor={chamado.orderNumber} />}
        <Linha rotulo="Received" valor={formatarData(chamado.createdAt)} />
        <Linha rotulo="Account" valor={chamado.userId ? 'Signed in' : 'Guest'} />
      </div>

      <div className="admin-conversa">
        <div className="balao cliente">
          <div className="balao-quem">{chamado.name}</div>
          <p>{chamado.message}</p>
          <time dateTime={chamado.createdAt}>{formatarData(chamado.createdAt)}</time>
        </div>

        {anexo && (
          <a className="admin-anexo" href={anexo} target="_blank" rel="noopener noreferrer">
            <img src={anexo} alt="Screenshot enviado pelo usuário" />
            <span>Open attachment</span>
          </a>
        )}
        {chamado.screenshotPath && !anexo && <p className="empty">Loading attachment…</p>}

        {mensagens.map((m) => (
          <div key={m.id} className={`balao ${m.isStaff ? 'equipe' : 'cliente'}`}>
            <div className="balao-quem">{m.isStaff ? 'The Q MMA' : chamado.name}</div>
            <p>{m.body}</p>
            <time dateTime={m.createdAt}>{formatarData(m.createdAt)}</time>
          </div>
        ))}
      </div>

      <div className="admin-responder">
        <label className="campo">
          <span>Reply</span>
          <textarea
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Write your reply…"
          />
        </label>
        {erro && (
          <p className="auth-erro" role="alert">
            {erro}
          </p>
        )}
        <button type="button" className="btn" onClick={enviarResposta} disabled={enviando}>
          {enviando ? 'Sending…' : 'Send reply'}
        </button>
        <p className="support-nota">
          A resposta fica registrada aqui. O envio por e-mail entra na próxima etapa — por
          enquanto, responda também pelo seu e-mail.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ apoio -- */

function Casca({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { closeOverlay } = useNav()
  return (
    <div className="support-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
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

function Linha({ rotulo, valor, link }: { rotulo: string; valor: string; link?: string }) {
  return (
    <div className="admin-linha">
      <span>{rotulo}</span>
      {link ? <a href={link}>{valor}</a> : <b>{valor}</b>}
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
