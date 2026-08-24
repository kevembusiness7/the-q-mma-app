import { useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { formatarPreco } from '../hooks/useProducts'
import { useAthletes } from '../hooks/useAthletes'
import { useAdminPromotionAthletes } from '../hooks/useAdminPromotionAthletes'
import { ROTULO_CONTEUDO, type PromoContentType, type PromotionAthleteWithPackages, type PromotionPackage } from '../types/promotions'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/promotions.css'

/**
 * Cadastro de atletas e pacotes de Athlete Promotions.
 *
 * Esconder a tela é conveniência, não segurança: o RLS é quem barra de fato
 * quem não é admin (ver "admin gerencia atletas"/"admin gerencia pacotes"
 * em promotions-schema.sql).
 */
export function AdminPromotionAthletesPage() {
  const { closeOverlay } = useNav()
  const { usuario, ehAdmin, carregando: carregandoAuth } = useAuth()
  const {
    atletas,
    carregando,
    erro,
    criarAtleta,
    atualizarAtleta,
    alternarPermitirPromocoes,
    criarPacote,
    atualizarPacote,
    removerPacote,
  } = useAdminPromotionAthletes(ehAdmin)
  const [abertoSlug, setAbertoSlug] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  if (carregandoAuth) {
    return (
      <Casca titulo="Promotion athletes" aoVoltar={closeOverlay}>
        <p className="empty">Loading…</p>
      </Casca>
    )
  }

  if (!usuario || !ehAdmin) {
    return (
      <Casca titulo="Promotion athletes" aoVoltar={closeOverlay}>
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

  const aberto = abertoSlug ? (atletas.find((a) => a.slug === abertoSlug) ?? null) : null

  if (aberto) {
    return (
      <Casca titulo={aberto.name} aoVoltar={() => setAbertoSlug(null)}>
        <Detalhe
          atleta={aberto}
          aoAtualizar={(campos) => atualizarAtleta(aberto.slug, campos)}
          aoAlternarPermitir={(v) => alternarPermitirPromocoes(aberto.slug, v)}
          aoCriarPacote={(dados) => criarPacote(aberto.slug, dados)}
          aoAtualizarPacote={atualizarPacote}
          aoRemoverPacote={removerPacote}
        />
      </Casca>
    )
  }

  return (
    <Casca titulo="Promotion athletes" aoVoltar={closeOverlay}>
      {carregando && <p className="empty">Loading…</p>}
      {erro && <p className="empty">Could not load: {erro}</p>}
      {!carregando && atletas.length === 0 && !criando && (
        <p className="empty">No promotion athletes yet.</p>
      )}

      <div className="promo-admin-lista">
        {atletas.map((a) => (
          <button
            key={a.slug}
            type="button"
            className="ticket ticket-clicavel"
            onClick={() => setAbertoSlug(a.slug)}
          >
            <div className="ticket-topo">
              <span className={`ticket-status ${a.allowPromotions ? 'pr-approved' : 'pr-cancelled'}`}>
                {a.allowPromotions ? 'Bookable' : 'Hidden'}
              </span>
              <span className="ticket-ref">@{a.instagramHandle}</span>
            </div>
            <div className="pedido-resumo">
              <b>{a.name}</b>
            </div>
            <div className="ticket-cat">
              {a.packages.length} package{a.packages.length === 1 ? '' : 's'} ·{' '}
              {a.followers.toLocaleString('en-US')} followers
            </div>
          </button>
        ))}
      </div>

      {criando ? (
        <NovoAtleta
          aoCriar={async (slug, nome, handle, fotoUrl) => {
            const falha = await criarAtleta(slug, nome, handle, fotoUrl)
            if (!falha) setCriando(false)
            return falha
          }}
          aoCancelar={() => setCriando(false)}
        />
      ) : (
        <button type="button" className="btn ghost" onClick={() => setCriando(true)}>
          + New athlete
        </button>
      )}
    </Casca>
  )
}

/* ---------------------------------------------------------- novo atleta -- */

function NovoAtleta({
  aoCriar,
  aoCancelar,
}: {
  aoCriar: (slug: string, nome: string, handle: string, fotoUrl: string | null) => Promise<string | null>
  aoCancelar: () => void
}) {
  const { athletes } = useAthletes()
  const [nome, setNome] = useState('')
  const [handle, setHandle] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // O slug precisa bater com o mesmo padrão usado em products.owner e no
  // resto do site — minúsculo, com hífen, sem acento — pra um dia dar pra
  // ligar as duas coisas se fizer sentido.
  const slugSugerido = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // Se o slug bater com um atleta que já existe na aba Athletes, a foto sai
  // de lá em vez de pedir upload -- é a mesma que já aparece no hero do
  // perfil dele, sem precisar cadastrar a peça duas vezes.
  const atletaExistente = athletes.find((a) => a.slug === slugSugerido)
  const fotoEncontrada = atletaExistente?.heroImageUrl ?? atletaExistente?.imageUrl ?? null

  async function salvar() {
    if (!nome.trim() || !handle.trim() || !slugSugerido) return
    setSalvando(true)
    const falha = await aoCriar(slugSugerido, nome.trim(), handle.trim().replace(/^@/, ''), fotoEncontrada)
    setSalvando(false)
    setErro(falha)
  }

  return (
    <div className="admin-acoes">
      <h4>New athlete</h4>
      <label className="campo">
        <span>Name</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ozzy Diaz" />
      </label>
      <label className="campo">
        <span>Instagram handle</span>
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="ozzydiaz" />
      </label>
      {slugSugerido && <p className="cart-note">Slug: {slugSugerido}</p>}
      {fotoEncontrada && (
        <p className="cart-note">✓ Found this athlete's hero photo — will use it automatically.</p>
      )}
      {erro && (
        <p className="auth-erro" role="alert">
          {erro}
        </p>
      )}
      <div className="admin-botoes">
        <button
          type="button"
          className="btn"
          disabled={salvando || !nome.trim() || !handle.trim()}
          onClick={salvar}
        >
          {salvando ? 'Saving…' : 'Create'}
        </button>
        <button type="button" className="btn ghost" onClick={aoCancelar}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- detalhe -- */

function Detalhe({
  atleta,
  aoAtualizar,
  aoAlternarPermitir,
  aoCriarPacote,
  aoAtualizarPacote,
  aoRemoverPacote,
}: {
  atleta: PromotionAthleteWithPackages
  aoAtualizar: (campos: Record<string, unknown>) => Promise<string | null>
  aoAlternarPermitir: (v: boolean) => Promise<string | null>
  aoCriarPacote: (dados: {
    title: string
    contentType: string
    priceCents: number
    contentCreationFeeCents: number
  }) => Promise<string | null>
  aoAtualizarPacote: (id: string, campos: Record<string, unknown>) => Promise<string | null>
  aoRemoverPacote: (id: string) => Promise<string | null>
}) {
  const { athletes } = useAthletes()
  const [bio, setBio] = useState(atleta.bio ?? '')
  const [followers, setFollowers] = useState(String(atleta.followers))
  const [engagement, setEngagement] = useState(atleta.engagementRate?.toString() ?? '')
  const [storyViews, setStoryViews] = useState(atleta.avgStoryViews?.toString() ?? '')
  const [reelViews, setReelViews] = useState(atleta.avgReelViews?.toString() ?? '')
  const [maxSemana, setMaxSemana] = useState(String(atleta.maxPromotionsPerWeek))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [criandoPacote, setCriandoPacote] = useState(false)
  const [salvandoFoto, setSalvandoFoto] = useState(false)

  // Mesma foto que já aparece no hero do perfil dele na aba Athletes — sem
  // isto a promoção pedia um upload separado pra uma imagem que já existe.
  const atletaComHero = athletes.find((a) => a.slug === atleta.slug)
  const fotoHero = atletaComHero?.heroImageUrl ?? atletaComHero?.imageUrl ?? null

  async function usarFotoDoHero() {
    if (!fotoHero) return
    setSalvandoFoto(true)
    setErro(await aoAtualizar({ photo_url: fotoHero }))
    setSalvandoFoto(false)
  }

  // Editar qualquer número de Instagram atualiza o carimbo "as of" junto —
  // é o que a vitrine mostra pra nunca passar estimativa velha por atual sem
  // avisar.
  async function salvarPerfil() {
    setSalvando(true)
    const falha = await aoAtualizar({
      bio: bio.trim() || null,
      followers: Number(followers) || 0,
      engagement_rate: engagement.trim() ? Number(engagement) : null,
      avg_story_views: storyViews.trim() ? Number(storyViews) : null,
      avg_reel_views: reelViews.trim() ? Number(reelViews) : null,
      max_promotions_per_week: Number(maxSemana) || 1,
      stats_updated_at: new Date().toISOString(),
    })
    setSalvando(false)
    setErro(falha)
  }

  return (
    <div className="pedido-detalhe">
      <div className="promo-toggle-row">
        <label className="promo-toggle">
          <input
            type="checkbox"
            checked={atleta.allowPromotions}
            onChange={(e) => aoAlternarPermitir(e.target.checked)}
          />
          <span className="promo-toggle-track" aria-hidden />
        </label>
        <span>
          {atleta.allowPromotions
            ? 'Bookable — shows up in the public marketplace'
            : 'Hidden — not visible, no new bookings'}
        </span>
      </div>

      <div className="admin-acoes">
        <h4>Photo</h4>
        <div className="promo-photo-preview">
          {atleta.photoUrl ? (
            <img src={atleta.photoUrl} alt="" />
          ) : (
            <span className="cart-note">No photo set yet.</span>
          )}
        </div>
        {fotoHero ? (
          <button type="button" className="btn ghost" disabled={salvandoFoto} onClick={usarFotoDoHero}>
            {salvandoFoto ? 'Saving…' : 'Use hero photo from athlete profile'}
          </button>
        ) : (
          <p className="cart-note">
            No matching athlete profile found for slug "{atleta.slug}" — add one in the Athletes tab
            first, or set a photo URL manually below.
          </p>
        )}
        <label className="campo">
          <span>Photo URL (manual override)</span>
          <input
            defaultValue={atleta.photoUrl ?? ''}
            onBlur={(e) => {
              const valor = e.target.value.trim()
              if (valor !== (atleta.photoUrl ?? '')) aoAtualizar({ photo_url: valor || null })
            }}
            placeholder="/images/athletes/osman-diaz-hero.png"
          />
        </label>
      </div>

      <div className="admin-acoes">
        <h4>Instagram stats</h4>
        <p className="cart-note">
          {atleta.statsUpdatedAt
            ? `Last updated ${formatarData(atleta.statsUpdatedAt)}`
            : 'Never updated — the marketplace will not show an "as of" date until saved once.'}
        </p>
        <label className="campo">
          <span>Followers</span>
          <input inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value)} />
        </label>
        <label className="campo">
          <span>Engagement rate (%)</span>
          <input inputMode="decimal" value={engagement} onChange={(e) => setEngagement(e.target.value)} />
        </label>
        <label className="campo">
          <span>Average story views</span>
          <input inputMode="numeric" value={storyViews} onChange={(e) => setStoryViews(e.target.value)} />
        </label>
        <label className="campo">
          <span>Average reel views</span>
          <input inputMode="numeric" value={reelViews} onChange={(e) => setReelViews(e.target.value)} />
        </label>
        <label className="campo">
          <span>Max promotions / week</span>
          <input inputMode="numeric" value={maxSemana} onChange={(e) => setMaxSemana(e.target.value)} />
        </label>
        <label className="campo">
          <span>Bio (shown on the promotion profile)</span>
          <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        {erro && (
          <p className="auth-erro" role="alert">
            {erro}
          </p>
        )}
        <button type="button" className="btn" disabled={salvando} onClick={salvarPerfil}>
          {salvando ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      <div className="admin-acoes">
        <h4>Packages</h4>
        {atleta.packages.length === 0 && !criandoPacote && (
          <p className="cart-note">No packages yet — this athlete can't be booked without one.</p>
        )}
        {atleta.packages.map((p) => (
          <PacoteLinha key={p.id} pacote={p} aoAtualizar={aoAtualizarPacote} aoRemover={aoRemoverPacote} />
        ))}

        {criandoPacote ? (
          <NovoPacote
            aoCriar={async (dados) => {
              const falha = await aoCriarPacote(dados)
              if (!falha) setCriandoPacote(false)
              return falha
            }}
            aoCancelar={() => setCriandoPacote(false)}
          />
        ) : (
          <button type="button" className="btn ghost" onClick={() => setCriandoPacote(true)}>
            + New package
          </button>
        )}
      </div>
    </div>
  )
}

function PacoteLinha({
  pacote,
  aoAtualizar,
  aoRemover,
}: {
  pacote: PromotionPackage
  aoAtualizar: (id: string, campos: Record<string, unknown>) => Promise<string | null>
  aoRemover: (id: string) => Promise<string | null>
}) {
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(pacote.title)
  const [preco, setPreco] = useState((pacote.priceCents / 100).toString())
  const [taxaCriacao, setTaxaCriacao] = useState((pacote.contentCreationFeeCents / 100).toString())
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    await aoAtualizar(pacote.id, {
      title: titulo.trim(),
      price_cents: Math.round(Number(preco) * 100) || 0,
      content_creation_fee_cents: Math.round(Number(taxaCriacao) * 100) || 0,
    })
    setSalvando(false)
    setEditando(false)
  }

  if (editando) {
    return (
      <div className="promo-package-edit">
        <label className="campo">
          <span>Title</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        <label className="campo">
          <span>Price (USD)</span>
          <input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} />
        </label>
        <label className="campo">
          <span>Content-creation fee (USD)</span>
          <input inputMode="decimal" value={taxaCriacao} onChange={(e) => setTaxaCriacao(e.target.value)} />
        </label>
        <div className="admin-botoes">
          <button type="button" className="btn" disabled={salvando} onClick={salvar}>
            {salvando ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn ghost" onClick={() => setEditando(false)}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-linha">
      <span>
        {pacote.title} <i>({ROTULO_CONTEUDO[pacote.contentType]})</i>
        {!pacote.isActive && <b className="promo-inactive"> · inactive</b>}
      </span>
      <span>
        <b>{formatarPreco(pacote.priceCents)}</b>{' '}
        <button type="button" className="empty-link" onClick={() => setEditando(true)}>
          Edit
        </button>
        {pacote.isActive && (
          <button type="button" className="empty-link" onClick={() => aoRemover(pacote.id)}>
            Deactivate
          </button>
        )}
      </span>
    </div>
  )
}

function NovoPacote({
  aoCriar,
  aoCancelar,
}: {
  aoCriar: (dados: {
    title: string
    contentType: string
    priceCents: number
    contentCreationFeeCents: number
  }) => Promise<string | null>
  aoCancelar: () => void
}) {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<PromoContentType>('story')
  const [preco, setPreco] = useState('')
  const [taxaCriacao, setTaxaCriacao] = useState('0')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    setSalvando(true)
    const falha = await aoCriar({
      title: titulo.trim(),
      contentType: tipo,
      priceCents: Math.round(Number(preco) * 100) || 0,
      contentCreationFeeCents: Math.round(Number(taxaCriacao) * 100) || 0,
    })
    setSalvando(false)
    setErro(falha)
  }

  return (
    <div className="promo-package-edit">
      <label className="campo">
        <span>Title</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Instagram Story" />
      </label>
      <label className="campo">
        <span>Content type</span>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as PromoContentType)}>
          <option value="story">Story</option>
          <option value="feed_post">Feed post</option>
          <option value="reel">Reel</option>
        </select>
      </label>
      <label className="campo">
        <span>Price (USD)</span>
        <input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="75" />
      </label>
      <label className="campo">
        <span>Content-creation fee (USD)</span>
        <input inputMode="decimal" value={taxaCriacao} onChange={(e) => setTaxaCriacao(e.target.value)} />
      </label>
      {erro && (
        <p className="auth-erro" role="alert">
          {erro}
        </p>
      )}
      <div className="admin-botoes">
        <button type="button" className="btn" disabled={salvando || !titulo.trim() || !preco} onClick={salvar}>
          {salvando ? 'Saving…' : 'Add package'}
        </button>
        <button type="button" className="btn ghost" onClick={aoCancelar}>
          Cancel
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
  })
}
