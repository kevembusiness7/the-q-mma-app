import { ChevronLeft, ShieldCheck } from 'lucide-react'
import { useNav } from '../context/NavigationContext'
import { usePromotionAthletes } from '../hooks/useAthletePromotions'
import { PromoAthleteCard } from '../components/promotions/PromoAthleteCard'
import '../styles/promo-showcase.css'

/**
 * Vitrine de Athlete Promotions — escolher o atleta é o primeiro passo do
 * fluxo Choose Athlete → Choose Package → Select Date → Upload → Payment →
 * Review.
 *
 * O desenho é o do cartaz enviado pelo cliente: chamada em duas cores, grade
 * de dois com a bandeira do país atrás de cada atleta e o selo de revisão no
 * rodapé. Os estilos ficam em promo-showcase.css.
 */
export function PromotionsPage() {
  const { openOverlay, closeOverlay } = useNav()
  const { atletas, carregando, erro } = usePromotionAthletes()

  return (
    <div className="promo-showcase">
      <header className="ps-bar">
        <button type="button" className="ps-bar-back" onClick={closeOverlay} aria-label="Voltar">
          <ChevronLeft size={24} strokeWidth={2} aria-hidden />
        </button>
        <span className="ps-bar-divisor" aria-hidden />
        <img className="ps-bar-logo" src="/images/brand/logo-theq.png" alt="THE Q MMA" />
        <h1 className="ps-bar-titulo">Athlete promotions</h1>
      </header>

      <h2 className="ps-titulo">
        <span className="ouro">Promote your brand</span>
        <span className="prata">With our fighters</span>
      </h2>
      <hr className="ps-rule" />
      <p className="ps-sub">
        Book an Instagram Story, Feed Post, or Reel directly with our athletes.
      </p>

      {carregando && <p className="ps-vazio">Loading athletes…</p>}
      {erro && <p className="ps-vazio">Could not load: {erro}</p>}
      {!carregando && !erro && atletas.length === 0 && (
        <p className="ps-vazio">No athletes available for promotion right now.</p>
      )}

      {atletas.length > 0 && (
        <div className="ps-grid">
          {atletas.map((atleta) => (
            <PromoAthleteCard
              key={atleta.slug}
              atleta={atleta}
              onOpen={() => openOverlay({ name: 'promotion-athlete', slug: atleta.slug })}
            />
          ))}
        </div>
      )}

      <div className="ps-footer">
        <span className="ps-shield" aria-hidden>
          <ShieldCheck size={20} strokeWidth={1.6} />
        </span>
        <p>Every campaign is reviewed and approved before it goes live.</p>
      </div>
    </div>
  )
}

export default PromotionsPage
