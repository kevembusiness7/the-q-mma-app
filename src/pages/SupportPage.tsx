import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { FAQ, FAQ_REVISADO } from '../data/faq'
import {
  CATEGORIAS,
  ROTULO_STATUS,
  TAMANHO_MAXIMO_ANEXO,
  useEnviarChamado,
  useMeusChamados,
  type CategoriaChamado,
  type Chamado,
} from '../hooks/useSupport'
import { useConversa } from '../hooks/useAdminSupport'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'

type Aba = 'contato' | 'faq' | 'meus'

/** Pedido que veio junto do "Get help with this order". */
export interface PedidoCitado {
  id: string
  numero: string
}

export function SupportPage({ pedido }: { pedido?: PedidoCitado }) {
  const { closeOverlay, openOverlay } = useNav()
  const { usuario } = useAuth()
  const [aba, setAba] = useState<Aba>('contato')

  return (
    <div className="support-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">Help &amp; Support</span>
        </div>
      </header>

      <div className="support-abas" role="tablist">
        {(
          [
            ['contato', 'Contact'],
            ['faq', 'FAQ'],
            ['meus', 'My requests'],
          ] as [Aba, string][]
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={aba === valor}
            className={`auth-aba ${aba === valor ? 'on' : ''}`}
            onClick={() => setAba(valor)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'contato' && <Formulario pedido={pedido} />}
      {aba === 'faq' && <Faq />}
      {aba === 'meus' && (
        <MeusChamados usuarioId={usuario?.id ?? null} aoEntrar={() => openOverlay({ name: 'auth' })} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------ formulário -- */

function Formulario({ pedido }: { pedido?: PedidoCitado }) {
  const { usuario } = useAuth()
  const { enviar, enviando } = useEnviarChamado()

  const [categoria, setCategoria] = useState<CategoriaChamado>(pedido ? 'order' : 'question')
  const [nome, setNome] = useState((usuario?.user_metadata?.full_name as string | undefined) ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [mensagem, setMensagem] = useState('')
  const [anexo, setAnexo] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [protocolo, setProtocolo] = useState<string | null>(null)

  async function submeter(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (nome.trim().length < 2) return setErro('Please enter your name.')
    if (!email.includes('@')) return setErro('Please enter a valid email.')
    if (mensagem.trim().length < 10) return setErro('Please describe your issue in a bit more detail.')

    const { erro: falha, protocolo: numero } = await enviar({
      nome: nome.trim(),
      email: email.trim(),
      categoria,
      mensagem: mensagem.trim(),
      anexo,
      usuarioId: usuario?.id ?? null,
      pedidoId: pedido?.id ?? null,
    })

    if (falha) return setErro(falha)
    setProtocolo(numero)
  }

  if (protocolo) {
    return (
      <div className="auth-aviso">
        <div className="auth-aviso-icone" aria-hidden>
          ✓
        </div>
        <h3>Message sent</h3>
        <p>
          Your message has been sent successfully. We&rsquo;ll respond to your email as soon as
          possible.
        </p>
        <p className="support-protocolo">
          Reference <b>#{protocolo}</b>
        </p>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setProtocolo(null)
            setMensagem('')
            setAnexo(null)
          }}
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <>
      {pedido ? (
        <p className="support-intro support-sobre-pedido">
          About order <b>{pedido.numero}</b> — our team sees it attached to your message,
          so you don&rsquo;t need to repeat the details.
        </p>
      ) : (
        <p className="support-intro">
          Need help? Send us a message and our team will get back to you as soon as possible.
        </p>
      )}

      <form className="auth-form" onSubmit={submeter} noValidate>
        <label className="campo">
          <span>Subject</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaChamado)}>
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Name</span>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
        </label>

        <label className="campo">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
          />
        </label>

        <label className="campo">
          <span>Message</span>
          <textarea
            rows={6}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Tell us what happened…"
          />
        </label>

        <div className="campo">
          <span>Attach screenshot — optional</span>
          <label className="support-anexo">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                if (f && f.size > TAMANHO_MAXIMO_ANEXO) {
                  setErro('The screenshot must be 5 MB or smaller.')
                  return
                }
                setErro(null)
                setAnexo(f)
              }}
            />
            <span>{anexo ? anexo.name : 'Choose an image (max 5 MB)'}</span>
          </label>
          {anexo && (
            <button type="button" className="support-remover" onClick={() => setAnexo(null)}>
              Remove attachment
            </button>
          )}
        </div>

        {erro && (
          <p className="auth-erro" role="alert">
            {erro}
          </p>
        )}

        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? 'Sending…' : 'Send Message'}
        </button>

        {!usuario && (
          <p className="support-nota">
            You can send this without an account. Sign in first if you want to follow the reply under
            My requests.
          </p>
        )}
      </form>
    </>
  )
}

/* ------------------------------------------------------------------- FAQ -- */

function Faq() {
  const [aberta, setAberta] = useState<number | null>(0)

  return (
    <div className="support-faq">
      {!FAQ_REVISADO && (
        <p className="support-rascunho" role="note">
          <b>Rascunho:</b> estas respostas foram escritas como exemplo e ainda não refletem a
          política real da The Q MMA. Revise antes de publicar.
        </p>
      )}

      {FAQ.map((item, i) => (
        <div key={item.pergunta} className={`faq-item ${aberta === i ? 'on' : ''}`}>
          <button
            type="button"
            className="faq-pergunta"
            aria-expanded={aberta === i}
            onClick={() => setAberta(aberta === i ? null : i)}
          >
            <span>{item.pergunta}</span>
            <b aria-hidden>{aberta === i ? '−' : '+'}</b>
          </button>
          {aberta === i && <p className="faq-resposta">{item.resposta}</p>}
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------- meus chamados --- */

function MeusChamados({
  usuarioId,
  aoEntrar,
}: {
  usuarioId: string | null
  aoEntrar: () => void
}) {
  const { chamados, carregando, erro } = useMeusChamados(usuarioId)
  const [aberto, setAberto] = useState<Chamado | null>(null)

  if (!usuarioId) {
    return (
      <div className="auth-aviso">
        <h3>Sign in to follow your requests</h3>
        <p>
          Messages sent without an account still reach us — we just can&rsquo;t show their status
          here.
        </p>
        <button type="button" className="btn" onClick={aoEntrar}>
          Sign in
        </button>
      </div>
    )
  }

  if (carregando) return <p className="empty">Loading your requests…</p>
  if (erro) return <p className="empty">Could not load your requests: {erro}</p>
  if (chamados.length === 0) return <p className="empty">You haven&rsquo;t sent any messages yet.</p>

  if (aberto) return <MinhaConversa chamado={aberto} aoVoltar={() => setAberto(null)} />

  return (
    <div className="support-lista">
      {chamados.map((c) => (
        <button key={c.id} type="button" className="ticket ticket-clicavel" onClick={() => setAberto(c)}>
          <div className="ticket-topo">
            <span className={`ticket-status s-${c.status}`}>{ROTULO_STATUS[c.status]}</span>
            <span className="ticket-ref">#{c.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="ticket-cat">
            {CATEGORIAS.find((x) => x.valor === c.category)?.rotulo ?? c.category}
            {c.orderNumber && <span className="ticket-pedido">{c.orderNumber}</span>}
          </div>
          <p className="ticket-msg">{c.message}</p>
          <time className="ticket-data" dateTime={c.createdAt}>
            {formatarData(c.createdAt)}
          </time>
        </button>
      ))}
    </div>
  )
}

/**
 * Conversa do lado do cliente. Ele responde como cliente — o RLS impede
 * marcar a própria resposta como sendo da equipe.
 */
function MinhaConversa({ chamado, aoVoltar }: { chamado: Chamado; aoVoltar: () => void }) {
  const { usuario } = useAuth()
  const { mensagens, responder } = useConversa(chamado.id)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar() {
    if (texto.trim().length < 2 || !usuario) return
    setEnviando(true)
    const falha = await responder(texto.trim(), usuario.id, false)
    setEnviando(false)
    if (falha) return setErro(falha)
    setTexto('')
    setErro(null)
  }

  return (
    <div className="support-conversa">
      <button type="button" className="support-voltar" onClick={aoVoltar}>
        ‹ All requests
      </button>

      <div className="ticket-topo">
        <span className={`ticket-status s-${chamado.status}`}>{ROTULO_STATUS[chamado.status]}</span>
        <span className="ticket-ref">#{chamado.id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="admin-conversa">
        <div className="balao cliente">
          <div className="balao-quem">You</div>
          <p>{chamado.message}</p>
          <time dateTime={chamado.createdAt}>{formatarData(chamado.createdAt)}</time>
        </div>

        {mensagens.map((m) => (
          <div key={m.id} className={`balao ${m.isStaff ? 'equipe' : 'cliente'}`}>
            <div className="balao-quem">{m.isStaff ? 'The Q MMA' : 'You'}</div>
            <p>{m.body}</p>
            <time dateTime={m.createdAt}>{formatarData(m.createdAt)}</time>
          </div>
        ))}
      </div>

      {chamado.status === 'resolved' ? (
        <p className="support-nota">
          This request is marked as resolved. Send a new message if you still need help.
        </p>
      ) : (
        <>
          <label className="campo">
            <span>Reply</span>
            <textarea
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Add more details…"
            />
          </label>
          {erro && (
            <p className="auth-erro" role="alert">
              {erro}
            </p>
          )}
          <button type="button" className="btn" onClick={enviar} disabled={enviando}>
            {enviando ? 'Sending…' : 'Send reply'}
          </button>
        </>
      )}
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
