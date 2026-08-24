import { BackBar } from '../components/shop/ShopParts'
import { useNav } from '../context/NavigationContext'
import { usePromotionAthlete } from '../hooks/useAthletePromotions'
import { ROTULO_CONTEUDO } from '../types/promotions'
import { formatarPreco } from '../hooks/useProducts'
import '../styles/shop.css'
import '../styles/promotions.css'

export function PromotionAthleteProfilePage({ slug }: { slug: string }) {
  const { closeOverlay, openOverlay } = useNav()
  const { atleta, carregando, erro } = usePromotionAthlete(slug)

  if (carregando) {
    return (
      <div>
        <BackBar label="Athlete promotions" onBack={closeOverlay} />
        <p className="empty">Loading…</p>
      </div>
    )
  }

  if (erro || !atleta) {
    return (
      <div>
        <BackBar label="Athlete promotions" onBack={closeOverlay} />
        <p className="empty">{erro ?? 'This athlete is not available for promotion.'}</p>
      </div>
    )
  }

  return (
    <div>
      <BackBar label="Athlete promotions" onBack={closeOverlay} />

      <div className="hero-img" style={{ height: 'clamp(220px, 36dvh, 320px)' }}>
        {atleta.photoUrl ? (
          <img src={atleta.photoUrl} alt={atleta.name} />
        ) : (
          <span aria-hidden style={{ fontSize: 48, opacity: 0.4 }}>
            🥋
          </span>
        )}
      </div>

      <div className="pdp">
        <h2>{atleta.name}</h2>
        <p className="desc">@{atleta.instagramHandle}</p>
        {atleta.bio && <p className="desc">{atleta.bio}</p>}

        <div className="promo-stats-row">
          <div className="promo-stat">
            <b>{atleta.followers.toLocaleString('en-US')}</b>
            <span>Followers</span>
          </div>
          <div className="promo-stat">
            <b>{atleta.engagementRate != null ? `${atleta.engagementRate}%` : '—'}</b>
            <span>Engagement</span>
          </div>
          <div className="promo-stat">
            <b>{atleta.avgStoryViews != null ? atleta.avgStoryViews.toLocaleString('en-US') : '—'}</b>
            <span>Avg. story views</span>
          </div>
        </div>
        <p className="promo-stats-asof">
          {atleta.statsUpdatedAt
            ? `Stats as of ${new Date(atleta.statsUpdatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, self-reported by the athlete/team.`
            : 'Stats not verified yet.'}
        </p>

        <div className="label">Choose a package</div>
        <div className="promo-package-list">
          {atleta.packages.map((p) => (
            <button
              key={p.id}
              type="button"
              className="promo-package-card"
              onClick={() =>
                openOverlay({ name: 'promotion-booking', athleteSlug: atleta.slug, packageId: p.id })
              }
            >
              <span>
                <b>{p.title}</b>
                <span>{ROTULO_CONTEUDO[p.contentType]}</span>
              </span>
              <span className="price">{formatarPreco(p.priceCents)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PromotionAthleteProfilePage
