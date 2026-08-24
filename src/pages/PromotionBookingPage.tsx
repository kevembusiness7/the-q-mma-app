import { useState } from 'react'
import { BackBar } from '../components/shop/ShopParts'
import { useNav } from '../context/NavigationContext'
import { useAuth } from '../context/AuthContext'
import { usePromotionAthlete } from '../hooks/useAthletePromotions'
import { usePromotionCheckout } from '../hooks/usePromotionCheckout'
import { formatarPreco } from '../hooks/useProducts'
import { ATHLETE_SPLIT_PERCENT, ROTULO_CONTEUDO } from '../types/promotions'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/promotions.css'

/**
 * Select Date -> Upload Campaign -> Payment, o resto do fluxo depois de
 * escolher o pacote na ficha do atleta. Faz o papel que o CartPage faz pra
 * loja: é daqui que sai o redirecionamento pro Stripe. Não existe carrinho
 * aqui -- é reserva de um pacote só, então vai direto.
 */
export function PromotionBookingPage({
  athleteSlug,
  packageId,
}: {
  athleteSlug: string
  packageId: string
}) {
  const { closeOverlay, openOverlay } = useNav()
  const { usuario, carregando: carregandoAuth } = useAuth()
  const { atleta, carregando } = usePromotionAthlete(athleteSlug)
  const { reservar, enviando, erro } = usePromotionCheckout()

  const [data, setData] = useState('')
  const [precisaCriacao, setPrecisaCriacao] = useState(false)
  const [logo, setLogo] = useState<File | null>(null)
  const [media, setMedia] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [cta, setCta] = useState('')
  const [notas, setNotas] = useState('')

  if (carregando || carregandoAuth) {
    return (
      <div>
        <BackBar label="Athlete promotions" onBack={closeOverlay} />
        <p className="empty">Loading…</p>
      </div>
    )
  }

  const pacote = atleta?.packages.find((p) => p.id === packageId)

  if (!atleta || !pacote) {
    return (
      <div>
        <BackBar label="Athlete promotions" onBack={closeOverlay} />
        <p className="empty">This package is no longer available.</p>
      </div>
    )
  }

  if (!usuario) {
    return (
      <div>
        <BackBar label={pacote.title} onBack={closeOverlay} />
        <div className="auth-aviso">
          <h3>Sign in to book</h3>
          <p>Paying for a promotion requires an account, so we can track your booking and any refund.</p>
          <button type="button" className="btn" onClick={() => openOverlay({ name: 'auth' })}>
            Sign in or create account
          </button>
        </div>
      </div>
    )
  }

  const totalCents = pacote.priceCents + (precisaCriacao ? pacote.contentCreationFeeCents : 0)
  const athleteEarnsCents = Math.round((totalCents * ATHLETE_SPLIT_PERCENT) / 100)
  const hoje = new Date().toISOString().slice(0, 10)

  const podeEnviar = data !== '' && media !== null && instagram.trim() !== '' && !enviando

  async function enviar() {
    if (!media) return
    await reservar({
      athleteSlug,
      packageId,
      requestedDate: data,
      needsContentCreation: precisaCriacao,
      logo,
      media,
      caption,
      websiteLink: website,
      businessInstagram: instagram,
      cta,
      notes: notas,
    })
  }

  return (
    <div>
      <BackBar label={pacote.title} onBack={closeOverlay} />

      <div className="pdp">
        <h2>{atleta.name}</h2>
        <p className="desc">
          {pacote.title} · {ROTULO_CONTEUDO[pacote.contentType]}
        </p>

        <label className="campo">
          <span>Desired date</span>
          <input type="date" min={hoje} value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        <p className="cart-note">
          This is the date you'd like it posted. Our team confirms (or proposes a different date)
          during review — nothing goes live automatically.
        </p>

        {pacote.contentCreationFeeCents > 0 && (
          <div className="promo-toggle-row">
            <label className="promo-toggle">
              <input
                type="checkbox"
                checked={precisaCriacao}
                onChange={(e) => setPrecisaCriacao(e.target.checked)}
              />
              <span className="promo-toggle-track" aria-hidden />
            </label>
            <span>
              I need your team to create the content (+{formatarPreco(pacote.contentCreationFeeCents)})
            </span>
          </div>
        )}

        <div className="label">Campaign</div>

        <label className="promo-upload-field">
          <span className="campo">
            <span>Business logo (optional)</span>
          </span>
          <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
          {logo && <span className="promo-upload-preview">{logo.name}</span>}
        </label>

        <label className="promo-upload-field">
          <span className="campo">
            <span>Photo or video to post *</span>
          </span>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setMedia(e.target.files?.[0] ?? null)}
          />
          {media && <span className="promo-upload-preview">{media.name}</span>}
        </label>

        <label className="campo">
          <span>Caption / message</span>
          <textarea rows={3} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </label>

        <label className="campo">
          <span>Business Instagram @ *</span>
          <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="yourbrand" />
        </label>

        <label className="campo">
          <span>Website / link</span>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
          />
        </label>

        <label className="campo">
          <span>Call to action</span>
          <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Shop now, Use code…" />
        </label>

        <label className="campo">
          <span>Additional instructions</span>
          <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>

        <div className="totals">
          <div>
            <span>{pacote.title}</span>
            <span>{formatarPreco(pacote.priceCents)}</span>
          </div>
          {precisaCriacao && (
            <div>
              <span>Content creation</span>
              <span>{formatarPreco(pacote.contentCreationFeeCents)}</span>
            </div>
          )}
          <div className="totals-final">
            <span>Total</span>
            <span>{formatarPreco(totalCents)}</span>
          </div>
        </div>
        <p className="promo-earned-note">
          Estimated athlete earnings: {formatarPreco(athleteEarnsCents)} ({ATHLETE_SPLIT_PERCENT}%
          of the total). No payment is auto-posted — this is only shown for transparency.
        </p>

        {erro && (
          <p className="auth-erro" role="alert">
            {erro}
          </p>
        )}

        <button type="button" className="btn" disabled={!podeEnviar} onClick={enviar}>
          {enviando ? 'Redirecting to payment…' : `Pay ${formatarPreco(totalCents)}`}
        </button>
        <p className="cart-note">
          Payment is captured now; your campaign is reviewed by our team before it's scheduled.
          If it's rejected, you'll be refunded.
        </p>
      </div>
    </div>
  )
}

export default PromotionBookingPage
