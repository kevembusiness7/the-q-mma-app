import { ChevronLeft, CirclePlus, Clapperboard, Eye, Grid2x2, ShieldCheck, Star, TrendingUp, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BackBar } from '../components/shop/ShopParts'
import { useNav } from '../context/NavigationContext'
import { usePromotionAthlete } from '../hooks/useAthletePromotions'
import type { PromoContentType } from '../types/promotions'
import { formatarPreco } from '../hooks/useProducts'
import { paisDoAtleta } from '../data/fighters'
import { divisaoDoAtleta } from '../data/athletes'
import '../styles/shop.css'
import '../styles/promo-profile.css'

/** Cada tipo de conteúdo tem seu ícone, como no cartaz do pacote. */
const ICONE_CONTEUDO: Record<PromoContentType, LucideIcon> = {
  story: CirclePlus,
  feed_post: Grid2x2,
  reel: Clapperboard,
}

/**
 * Linha de apoio quando o pacote não tem descrição própria no admin (hoje
 * nenhum tem). Sem isto o lugar dela repetiria o título -- "Instagram Story"
 * embaixo de "INSTAGRAM STORY". Uma descrição cadastrada sempre vence.
 */
const DESC_PADRAO: Record<PromoContentType, string> = {
  story: '24-hour story feature',
  feed_post: 'Permanent feed post',
  reel: 'High-impact short-form video',
}

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatTile({ icon: Icon, valor, rotulo }: { icon: LucideIcon; valor: string; rotulo: string }) {
  return (
    <div className="pp-stat">
      <Icon size={24} strokeWidth={1.6} aria-hidden />
      <b>{valor}</b>
      <span>{rotulo}</span>
    </div>
  )
}

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

  /* País e categoria não existem em promotion_athletes; vêm do cadastro
     estático, casados por slug ou nome. Sem eles a tela só perde a bandeira e
     a linha da divisão — nada quebra. */
  const country = paisDoAtleta(atleta.slug, atleta.name)
  const divisao = divisaoDoAtleta(atleta.slug, atleta.name)

  /* "Best reach" marca o pacote mais caro, que é sempre o de maior alcance na
     escala story < feed < reel. Sai da própria lista em vez de ser fixo no
     tipo, senão um atleta que só vende story ficaria sem destaque nenhum. */
  const precoTopo = atleta.packages.length
    ? Math.max(...atleta.packages.map((p) => p.priceCents))
    : 0

  return (
    <div className="promo-profile">
      <div className="pp-frame">
        <div className="pp-hero">
          <button type="button" className="pp-back" onClick={closeOverlay} aria-label="Voltar">
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </button>

          <img className="pp-logo" src="/images/brand/logo-theq.png" alt="THE Q MMA" />

          {country && (
            <img className="pp-flag" src={`/images/flags/${country}.svg`} alt="" aria-hidden />
          )}

          {atleta.photoUrl ? (
            <img className="pp-photo" src={atleta.photoUrl} alt={atleta.name} />
          ) : (
            <span className="pp-photo-vazia" aria-hidden>
              🥋
            </span>
          )}

          <div className="pp-scrim" />
        </div>

        <h2 className="pp-name">{atleta.name}</h2>
        <p className="pp-handle">@{atleta.instagramHandle}</p>
        {divisao && <p className="pp-division">{divisao}</p>}
        {atleta.bio && <p className="pp-bio">{atleta.bio}</p>}

        <div className="pp-stats">
          <StatTile
            icon={Users}
            valor={atleta.followers.toLocaleString('en-US')}
            rotulo="Followers"
          />
          <StatTile
            icon={TrendingUp}
            valor={atleta.engagementRate != null ? `${atleta.engagementRate}%` : '—'}
            rotulo="Engagement"
          />
          <StatTile
            icon={Eye}
            valor={
              atleta.avgStoryViews != null ? atleta.avgStoryViews.toLocaleString('en-US') : '—'
            }
            rotulo="Avg. story views"
          />
        </div>

        <p className="pp-asof">
          {atleta.statsUpdatedAt
            ? `Stats updated ${dataCurta(atleta.statsUpdatedAt)}`
            : 'Stats not verified yet'}
        </p>

        <h3 className="pp-section">Choose your promotion</h3>

        <div className="pp-packages">
          {atleta.packages.map((p) => {
            const Icone = ICONE_CONTEUDO[p.contentType]
            const destaque = p.priceCents === precoTopo && atleta.packages.length > 1
            return (
              <button
                key={p.id}
                type="button"
                className={`pp-package ${destaque ? 'best' : ''}`}
                onClick={() =>
                  openOverlay({
                    name: 'promotion-booking',
                    athleteSlug: atleta.slug,
                    packageId: p.id,
                  })
                }
              >
                <span className="pp-package-icon" aria-hidden>
                  <Icone size={26} strokeWidth={1.6} />
                </span>

                <span className="pp-package-text">
                  <b>{p.title}</b>
                  <span className="pp-package-desc">
                    {p.description ?? DESC_PADRAO[p.contentType]}
                  </span>
                  {destaque && (
                    <span className="pp-badge">
                      <Star size={11} fill="currentColor" strokeWidth={0} aria-hidden /> Best reach
                    </span>
                  )}
                </span>

                <span className="pp-package-buy">
                  <b>{formatarPreco(p.priceCents)}</b>
                  <span className="pp-select">Select</span>
                </span>
              </button>
            )
          })}
        </div>

        {atleta.packages.length === 0 && (
          <p className="empty">No packages available right now.</p>
        )}

        <div className="pp-footer">
          <span className="pp-shield" aria-hidden>
            <ShieldCheck size={20} strokeWidth={1.6} />
          </span>
          <p>All promotions are reviewed and approved by the athlete.</p>
        </div>
      </div>
    </div>
  )
}

export default PromotionAthleteProfilePage
