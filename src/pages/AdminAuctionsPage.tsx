import { useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { useAthletes } from '../hooks/useAthletes'
import { useAdminAuctions, type NovoItemLeilao } from '../hooks/useAdminAuctions'
import { formatarPreco } from '../hooks/useProducts'
import { AUCTION_STATUS_LABEL, type AuctionItem, type AuctionStatus } from '../types/auction'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/promotions.css'
import '../styles/auction.css'

const STATUS_OPTIONS: AuctionStatus[] = ['scheduled', 'live', 'sold', 'reserve_not_met', 'unsold', 'cancelled']

/**
 * Cadastro dos itens do The Q Vault (leilão).
 *
 * Esconder a tela é conveniência, não segurança: o RLS é quem barra de fato
 * quem não é admin (ver "admin gerencia itens do leilao" em auction-schema.sql).
 */
export function AdminAuctionsPage() {
  const { closeOverlay } = useNav()
  const { usuario, ehAdmin, carregando: carregandoAuth } = useAuth()
  const { itens, carregando, erro, criarItem, atualizarItem, removerItem, adicionarMidia, removerMidia, enviarMidia } =
    useAdminAuctions(ehAdmin)
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  if (carregandoAuth) {
    return (
      <Casca titulo="Vault items" aoVoltar={closeOverlay}>
        <p className="empty">Loading…</p>
      </Casca>
    )
  }

  if (!usuario || !ehAdmin) {
    return (
      <Casca titulo="Vault items" aoVoltar={closeOverlay}>
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

  const aberto = abertoId ? (itens.find((i) => i.id === abertoId) ?? null) : null

  if (aberto) {
    return (
      <Casca titulo={aberto.title} aoVoltar={() => setAbertoId(null)}>
        <Detalhe
          item={aberto}
          aoAtualizar={(campos) => atualizarItem(aberto.id, campos)}
          aoAdicionarMidia={(dados) => adicionarMidia(aberto.id, dados)}
          aoRemoverMidia={removerMidia}
          aoEnviarMidia={enviarMidia}
          aoRemover={async () => {
            if (!confirm(`Hide "${aberto.title}" from the Vault? Existing bids and orders are kept.`)) return
            const falha = await removerItem(aberto.id)
            if (!falha) setAbertoId(null)
          }}
        />
      </Casca>
    )
  }

  return (
    <Casca titulo="Vault items" aoVoltar={closeOverlay}>
      {carregando && <p className="empty">Loading…</p>}
      {erro && <p className="empty">Could not load: {erro}</p>}
      {!carregando && itens.length === 0 && !criando && <p className="empty">No auction items yet.</p>}

      <div className="promo-admin-lista">
        {itens.map((item) => (
          <button
            key={item.id}
            type="button"
            className="ticket ticket-clicavel"
            onClick={() => setAbertoId(item.id)}
          >
            <div className="ticket-topo">
              <span className={`auction-status-pill ${item.status}`}>{AUCTION_STATUS_LABEL[item.status]}</span>
              <span className="ticket-ref">{item.bidCount} bids</span>
            </div>
            <div className="pedido-resumo">
              <b>{item.title}</b>
            </div>
            <div className="ticket-cat">
              {item.athleteName} · {formatarPreco(item.currentBidCents || item.startingPriceCents)}
              {!item.isActive && ' · Hidden'}
            </div>
          </button>
        ))}
      </div>

      {criando ? (
        <NovoItem
          aoCriar={async (dados) => {
            const falha = await criarItem(dados)
            if (!falha) setCriando(false)
            return falha
          }}
          aoCancelar={() => setCriando(false)}
        />
      ) : (
        <button type="button" className="btn ghost" onClick={() => setCriando(true)}>
          + New auction item
        </button>
      )}
    </Casca>
  )
}

/* -------------------------------------------------------------- novo item -- */

function NovoItem({
  aoCriar,
  aoCancelar,
}: {
  aoCriar: (dados: NovoItemLeilao) => Promise<string | null>
  aoCancelar: () => void
}) {
  const { athletes } = useAthletes()
  const [title, setTitle] = useState('')
  const [athleteSlug, setAthleteSlug] = useState('')
  const [athleteNameLivre, setAthleteNameLivre] = useState('')
  const [precoInicial, setPrecoInicial] = useState('')
  const [incremento, setIncremento] = useState('25')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const atletaEscolhido = athletes.find((a) => a.slug === athleteSlug)
  const athleteName = athleteSlug ? (atletaEscolhido?.name ?? '') : athleteNameLivre

  async function salvar() {
    if (!title.trim() || !athleteName.trim() || !precoInicial || !inicio || !fim) return
    setSalvando(true)
    const falha = await aoCriar({
      title: title.trim(),
      athleteName: athleteName.trim(),
      athleteSlug: athleteSlug || null,
      startingPriceCents: Math.round(Number(precoInicial) * 100) || 0,
      minIncrementCents: Math.round(Number(incremento) * 100) || 2500,
      startsAt: new Date(inicio).toISOString(),
      endsAt: new Date(fim).toISOString(),
    })
    setSalvando(false)
    setErro(falha)
  }

  return (
    <div className="admin-acoes">
      <h4>New auction item</h4>
      <label className="campo">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fight-Worn Gloves" />
      </label>
      <label className="campo">
        <span>Athlete (from the roster)</span>
        <select value={athleteSlug} onChange={(e) => setAthleteSlug(e.target.value)}>
          <option value="">— Not on the roster / type name below —</option>
          {athletes.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      {!athleteSlug && (
        <label className="campo">
          <span>Athlete name</span>
          <input value={athleteNameLivre} onChange={(e) => setAthleteNameLivre(e.target.value)} />
        </label>
      )}
      <label className="campo">
        <span>Starting price (USD)</span>
        <input inputMode="decimal" value={precoInicial} onChange={(e) => setPrecoInicial(e.target.value)} placeholder="100" />
      </label>
      <label className="campo">
        <span>Minimum increment (USD)</span>
        <input inputMode="decimal" value={incremento} onChange={(e) => setIncremento(e.target.value)} />
      </label>
      <label className="campo">
        <span>Starts at</span>
        <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
      </label>
      <label className="campo">
        <span>Ends at</span>
        <input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} />
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
          disabled={salvando || !title.trim() || !athleteName.trim() || !precoInicial || !inicio || !fim}
          onClick={salvar}
        >
          {salvando ? 'Saving…' : 'Create'}
        </button>
        <button type="button" className="btn ghost" onClick={aoCancelar}>
          Cancel
        </button>
      </div>
      <p className="cart-note">
        Fill in the story, photos, reserve price and badges after creating — this just gets the
        listing started.
      </p>
    </div>
  )
}

/* ---------------------------------------------------------------- detalhe -- */

function Detalhe({
  item,
  aoAtualizar,
  aoAdicionarMidia,
  aoRemoverMidia,
  aoEnviarMidia,
  aoRemover,
}: {
  item: AuctionItem
  aoAtualizar: (campos: Record<string, unknown>) => Promise<string | null>
  aoAdicionarMidia: (dados: { kind: 'photo' | 'video'; url: string; isAthleteWearing: boolean; sortOrder: number }) => Promise<string | null>
  aoRemoverMidia: (mediaId: string) => Promise<string | null>
  aoEnviarMidia: (arquivo: File) => Promise<{ url: string | null; erro: string | null }>
  aoRemover: () => void
}) {
  const [eventName, setEventName] = useState(item.eventName ?? '')
  const [opponentName, setOpponentName] = useState(item.opponentName ?? '')
  const [fightDate, setFightDate] = useState(item.fightDate ?? '')
  const [fightResult, setFightResult] = useState(item.fightResult ?? '')
  const [athleteQuote, setAthleteQuote] = useState(item.athleteQuote ?? '')
  const [description, setDescription] = useState(item.description)
  const [story, setStory] = useState(item.story)
  const [condition, setCondition] = useState(item.condition)
  const [autographLocation, setAutographLocation] = useState(item.autographLocation ?? '')
  const [authenticityNote, setAuthenticityNote] = useState(item.authenticityNote ?? '')
  const [reservePrice, setReservePrice] = useState(item.reservePriceCents != null ? String(item.reservePriceCents / 100) : '')
  const [shipsDomestic, setShipsDomestic] = useState(String(item.shipsDomesticCents / 100))
  const [shipsInternational, setShipsInternational] = useState(
    item.shipsInternationalCents != null ? String(item.shipsInternationalCents / 100) : '',
  )
  const [fightWorn, setFightWorn] = useState(item.fightWorn)
  const [autographed, setAutographed] = useState(item.autographed)
  const [oneOfOne, setOneOfOne] = useState(item.oneOfOne)
  const [status, setStatus] = useState<AuctionStatus>(item.status)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviandoMidia, setEnviandoMidia] = useState(false)

  async function salvar() {
    setSalvando(true)
    const falha = await aoAtualizar({
      event_name: eventName.trim() || null,
      opponent_name: opponentName.trim() || null,
      fight_date: fightDate || null,
      fight_result: fightResult.trim() || null,
      athlete_quote: athleteQuote.trim() || null,
      description: description.trim(),
      story: story.trim(),
      condition: condition.trim(),
      autograph_location: autographLocation.trim() || null,
      authenticity_note: authenticityNote.trim() || null,
      reserve_price_cents: reservePrice.trim() ? Math.round(Number(reservePrice) * 100) : null,
      ships_domestic_cents: Math.round(Number(shipsDomestic) * 100) || 0,
      ships_international_cents: shipsInternational.trim() ? Math.round(Number(shipsInternational) * 100) : null,
      fight_worn: fightWorn,
      autographed: autographed,
      one_of_one: oneOfOne,
      status,
    })
    setSalvando(false)
    setErro(falha)
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setEnviandoMidia(true)
    const { url, erro: falhaUpload } = await aoEnviarMidia(arquivo)
    if (falhaUpload || !url) {
      setEnviandoMidia(false)
      setErro(falhaUpload)
      return
    }
    const kind = arquivo.type.startsWith('video/') ? 'video' : 'photo'
    const falha = await aoAdicionarMidia({ kind, url, isAthleteWearing: false, sortOrder: item.media.length })
    setEnviandoMidia(false)
    setErro(falha)
  }

  return (
    <div className="pedido-detalhe">
      <div className="admin-acoes">
        <h4>Fight details</h4>
        <label className="campo">
          <span>Event name</span>
          <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="UFC Fight Night" />
        </label>
        <label className="campo">
          <span>Opponent</span>
          <input value={opponentName} onChange={(e) => setOpponentName(e.target.value)} />
        </label>
        <label className="campo">
          <span>Fight date</span>
          <input type="date" value={fightDate} onChange={(e) => setFightDate(e.target.value)} />
        </label>
        <label className="campo">
          <span>Fight result</span>
          <input value={fightResult} onChange={(e) => setFightResult(e.target.value)} placeholder="Win by TKO, Round 1" />
        </label>
        <label className="campo">
          <span>Athlete quote</span>
          <textarea rows={2} value={athleteQuote} onChange={(e) => setAthleteQuote(e.target.value)} placeholder='"I wore these gloves during my win in Las Vegas..."' />
        </label>
      </div>

      <div className="admin-acoes">
        <h4>Story &amp; authenticity</h4>
        <label className="campo">
          <span>Description</span>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="campo">
          <span>Story / history</span>
          <textarea rows={3} value={story} onChange={(e) => setStory(e.target.value)} />
        </label>
        <label className="campo">
          <span>Condition</span>
          <input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Excellent — worn once, no repairs" />
        </label>
        <label className="campo">
          <span>Autograph location</span>
          <input value={autographLocation} onChange={(e) => setAutographLocation(e.target.value)} placeholder="Signed on the left cuff" />
        </label>
        <label className="campo">
          <span>Authenticity note</span>
          <textarea rows={2} value={authenticityNote} onChange={(e) => setAuthenticityNote(e.target.value)} />
        </label>
        <div className="auction-checkbox-row">
          <input type="checkbox" id="fw" checked={fightWorn} onChange={(e) => setFightWorn(e.target.checked)} />
          <label htmlFor="fw">Fight-Worn</label>
        </div>
        <div className="auction-checkbox-row">
          <input type="checkbox" id="ag" checked={autographed} onChange={(e) => setAutographed(e.target.checked)} />
          <label htmlFor="ag">Autographed</label>
        </div>
        <div className="auction-checkbox-row">
          <input type="checkbox" id="oo" checked={oneOfOne} onChange={(e) => setOneOfOne(e.target.checked)} />
          <label htmlFor="oo">1 of 1</label>
        </div>
      </div>

      <div className="admin-acoes">
        <h4>Photos &amp; video</h4>
        <div className="auction-media-grid">
          {item.media.map((m) => (
            <div key={m.id} className="auction-media-tile">
              {m.kind === 'video' ? <video src={m.url} muted /> : <img src={m.url} alt="" />}
              {m.isAthleteWearing && <span className="hero-tag">Wearing it</span>}
              <button type="button" className="remove-media" onClick={() => aoRemoverMidia(m.id)} aria-label="Remove">
                ×
              </button>
            </div>
          ))}
        </div>
        <label className="campo">
          <span>Upload photo or video</span>
          <input type="file" accept="image/*,video/*" onChange={aoEscolherArquivo} disabled={enviandoMidia} />
        </label>
        {enviandoMidia && <p className="cart-note">Uploading…</p>}
      </div>

      <div className="admin-acoes">
        <h4>Pricing &amp; shipping</h4>
        <p className="cart-note">
          Current bid: {formatarPreco(item.currentBidCents || item.startingPriceCents)} · Starting price{' '}
          {formatarPreco(item.startingPriceCents)} — set at creation, not editable here.
        </p>
        <label className="campo">
          <span>Reserve price (USD, confidential — leave blank for no reserve)</span>
          <input inputMode="decimal" value={reservePrice} onChange={(e) => setReservePrice(e.target.value)} />
        </label>
        <label className="campo">
          <span>Domestic shipping (USD)</span>
          <input inputMode="decimal" value={shipsDomestic} onChange={(e) => setShipsDomestic(e.target.value)} />
        </label>
        <label className="campo">
          <span>International shipping (USD, leave blank to not offer)</span>
          <input inputMode="decimal" value={shipsInternational} onChange={(e) => setShipsInternational(e.target.value)} />
        </label>
      </div>

      <div className="admin-acoes">
        <h4>Status</h4>
        <label className="campo">
          <span>Auction status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as AuctionStatus)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {AUCTION_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        {erro && (
          <p className="auth-erro" role="alert">
            {erro}
          </p>
        )}
        <div className="admin-botoes">
          <button type="button" className="btn" disabled={salvando} onClick={salvar}>
            {salvando ? 'Saving…' : 'Save changes'}
          </button>
        </div>
        <button type="button" className="empty-link" onClick={aoRemover}>
          Hide this item from the Vault
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
