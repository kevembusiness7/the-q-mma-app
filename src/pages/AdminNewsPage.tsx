import { useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { useAdminNews, type AdminNewsItem, type NovaNoticia } from '../hooks/useAdminNews'
import type { NewsType } from '../types/news'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/promotions.css'
import '../styles/news-admin.css'

const TAG_PADRAO: Record<NewsType, string> = {
  result: 'Fight Result',
  next: 'Next Fight',
  event: 'Academy Schedule',
}

/**
 * Cadastro das notícias de News & Events (tela The Q).
 *
 * Não cobre os cards automáticos de última/próxima luta — esses nascem
 * sozinhos do cartel de cada atleta (ver src/lib/autoNews.ts) e não têm
 * linha no banco pra editar aqui.
 *
 * Esconder a tela é conveniência, não segurança: o RLS é quem barra de fato
 * quem não é admin (ver "admin gerencia noticias" em news-admin-schema.sql).
 */
export function AdminNewsPage() {
  const { closeOverlay } = useNav()
  const { usuario, ehAdmin, carregando: carregandoAuth } = useAuth()
  const { noticias, carregando, erro, criar, atualizar, remover, enviarFoto } = useAdminNews(ehAdmin)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  if (carregandoAuth) {
    return (
      <Casca titulo="News & Events" aoVoltar={closeOverlay}>
        <p className="empty">Loading…</p>
      </Casca>
    )
  }

  if (!usuario || !ehAdmin) {
    return (
      <Casca titulo="News & Events" aoVoltar={closeOverlay}>
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

  const editando = editandoId ? (noticias.find((n) => n.id === editandoId) ?? null) : null
  const proximaOrdem = noticias.reduce((max, n) => Math.max(max, n.sortOrder), 0) + 1

  if (editando) {
    return (
      <Casca titulo="Edit news item" aoVoltar={() => setEditandoId(null)}>
        <NoticiaForm
          inicial={editando}
          enviarFoto={enviarFoto}
          proximaOrdem={editando.sortOrder}
          aoSalvar={async (dados) => {
            const falha = await atualizar(editando.id, {
              type: dados.type,
              tag: dados.tag,
              title: dados.title,
              body: dados.body,
              display_date: dados.displayDate,
              photo_url: dados.photoUrl,
              sort_order: dados.sortOrder,
            })
            if (!falha) setEditandoId(null)
            return falha
          }}
          aoCancelar={() => setEditandoId(null)}
          aoRemover={async () => {
            if (!confirm(`Delete "${editando.title}"? This can't be undone.`)) return
            const falha = await remover(editando.id)
            if (!falha) setEditandoId(null)
          }}
        />
      </Casca>
    )
  }

  return (
    <Casca titulo="News & Events" aoVoltar={closeOverlay}>
      <p className="cart-note">
        This manages the home feed cards. Fight results and upcoming fights for every registered
        athlete are added automatically from their profile, so this list is only for everything
        else — academy schedule, announcements — or to add a one-off card on top.
      </p>

      {carregando && <p className="empty">Loading…</p>}
      {erro && <p className="empty">Could not load: {erro}</p>}
      {!carregando && noticias.length === 0 && !criando && (
        <p className="empty">No manual news items yet.</p>
      )}

      <div className="promo-admin-lista">
        {noticias.map((n) => (
          <button
            key={n.id}
            type="button"
            className="ticket ticket-clicavel"
            onClick={() => setEditandoId(n.id)}
          >
            <div className="ticket-topo">
              <span className={`news-admin-tag ${n.type}`}>{n.tag}</span>
              <span className="ticket-ref">#{n.sortOrder}</span>
            </div>
            <div className="pedido-resumo">
              <b>{n.title}</b>
            </div>
            <div className="ticket-cat">{n.date}</div>
          </button>
        ))}
      </div>

      {criando ? (
        <NoticiaForm
          proximaOrdem={proximaOrdem}
          enviarFoto={enviarFoto}
          aoSalvar={async (dados) => {
            const falha = await criar(dados)
            if (!falha) setCriando(false)
            return falha
          }}
          aoCancelar={() => setCriando(false)}
        />
      ) : (
        <button type="button" className="btn ghost" onClick={() => setCriando(true)}>
          + New news item
        </button>
      )}
    </Casca>
  )
}

/* -------------------------------------------------------------- formulário -- */

function NoticiaForm({
  inicial,
  proximaOrdem,
  enviarFoto,
  aoSalvar,
  aoCancelar,
  aoRemover,
}: {
  inicial?: AdminNewsItem
  proximaOrdem: number
  enviarFoto: (arquivo: File) => Promise<{ url: string | null; erro: string | null }>
  aoSalvar: (dados: NovaNoticia) => Promise<string | null>
  aoCancelar: () => void
  aoRemover?: () => void
}) {
  const [tipo, setTipo] = useState<NewsType>(inicial?.type ?? 'event')
  const [tag, setTag] = useState(inicial?.tag ?? TAG_PADRAO.event)
  const [titulo, setTitulo] = useState(inicial?.title ?? '')
  const [corpo, setCorpo] = useState(inicial?.body ?? '')
  const [data, setData] = useState(inicial?.date ?? '')
  const [foto, setFoto] = useState(inicial?.photo ?? '')
  const [ordem, setOrdem] = useState(String(inicial?.sortOrder ?? proximaOrdem))
  const [enviando, setEnviando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function aoTrocarTipo(novoTipo: NewsType) {
    setTipo(novoTipo)
    // Só troca a etiqueta sozinho se ainda estiver num dos textos padrão —
    // não sobrescreve um texto que o admin já personalizou.
    if (Object.values(TAG_PADRAO).includes(tag)) setTag(TAG_PADRAO[novoTipo])
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setEnviando(true)
    const { url, erro: falha } = await enviarFoto(arquivo)
    setEnviando(false)
    if (falha) setErro(falha)
    else if (url) {
      setFoto(url)
      setErro(null)
    }
  }

  async function salvar() {
    if (!titulo.trim() || !corpo.trim() || !data.trim() || !foto.trim()) return
    setSalvando(true)
    const falha = await aoSalvar({
      type: tipo,
      tag: tag.trim(),
      title: titulo.trim(),
      body: corpo.trim(),
      displayDate: data.trim(),
      photoUrl: foto.trim(),
      sortOrder: Number(ordem) || 0,
    })
    setSalvando(false)
    setErro(falha)
  }

  return (
    <div className="admin-acoes">
      <h4>{inicial ? 'Edit news item' : 'New news item'}</h4>

      <label className="campo">
        <span>Type</span>
        <select value={tipo} onChange={(e) => aoTrocarTipo(e.target.value as NewsType)}>
          <option value="result">Fight result (green tag)</option>
          <option value="next">Next fight (red tag)</option>
          <option value="event">Academy event (gold tag)</option>
        </select>
      </label>
      <label className="campo">
        <span>Tag label</span>
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Fight Result" />
      </label>
      <label className="campo">
        <span>Title</span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Dione Barbosa def. Anna Melisano"
        />
      </label>
      <label className="campo">
        <span>Body</span>
        <textarea rows={3} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
      </label>
      <label className="campo">
        <span>Date (shown as-is)</span>
        <input
          value={data}
          onChange={(e) => setData(e.target.value)}
          placeholder="Jul 18, 2026 or Every Saturday · 10 AM"
        />
      </label>

      <div className="news-photo-preview">
        {foto ? <img src={foto} alt="" /> : <span className="cart-note">No photo yet.</span>}
      </div>
      <label className="campo">
        <span>Upload photo</span>
        <input type="file" accept="image/*" onChange={aoEscolherArquivo} disabled={enviando} />
      </label>
      {enviando && <p className="cart-note">Uploading…</p>}
      <label className="campo">
        <span>Photo URL (manual override)</span>
        <input
          value={foto}
          onChange={(e) => setFoto(e.target.value)}
          placeholder="/images/news/open-mat.jpg"
        />
      </label>

      <label className="campo">
        <span>Sort order (lower shows first)</span>
        <input inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
      </label>

      {erro && (
        <p className="auth-erro" role="alert">
          {erro}
        </p>
      )}

      <div className="admin-botoes">
        <button
          type="button"
          className="btn"
          disabled={salvando || !titulo.trim() || !corpo.trim() || !data.trim() || !foto.trim()}
          onClick={salvar}
        >
          {salvando ? 'Saving…' : inicial ? 'Save changes' : 'Create'}
        </button>
        <button type="button" className="btn ghost" onClick={aoCancelar}>
          Cancel
        </button>
      </div>

      {aoRemover && (
        <button type="button" className="empty-link" onClick={aoRemover}>
          Delete this item
        </button>
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
