import { useNav } from '../context/NavigationContext'
import { usePromotionAthletes } from '../hooks/useAthletePromotions'
import { PromoAthleteCard } from '../components/promotions/PromoAthleteCard'
import '../styles/shop.css'
import '../styles/promotions.css'

/**
 * Vitrine de Athlete Promotions — escolher o atleta é o primeiro passo do
 * fluxo Choose Athlete → Choose Package → Select Date → Upload → Payment →
 * Review. As telas seguintes (ficha do atleta, reserva) chegam nas próximas
 * fases; por ora o card abre a ficha, que ainda mostra os pacotes só pra
 * leitura.
 */
export function PromotionsPage() {
  const { openOverlay, closeOverlay } = useNav()
  const { atletas, carregando, erro } = usePromotionAthletes()

  return (
    <div className="shop-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">Athlete promotions</span>
        </div>
      </header>

      <div className="sec">
        <h3>Promote your brand with our fighters</h3>
      </div>
      <p className="empty" style={{ padding: '0 16px 16px', textAlign: 'left' }}>
        Book a sponsored Instagram Story, Feed Post, or Reel from one of our athletes. Every
        campaign is reviewed by our team before it goes live.
      </p>

      {carregando && <p className="empty">Loading athletes…</p>}
      {erro && <p className="empty">Could not load: {erro}</p>}
      {!carregando && atletas.length === 0 && (
        <p className="empty">No athletes available for promotion right now.</p>
      )}

      <div className="promo-grid">
        {atletas.map((atleta) => (
          <PromoAthleteCard
            key={atleta.slug}
            atleta={atleta}
            onOpen={() => openOverlay({ name: 'promotion-athlete', slug: atleta.slug })}
          />
        ))}
      </div>
    </div>
  )
}

export default PromotionsPage
