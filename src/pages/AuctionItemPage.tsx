import { useState } from 'react'
import { BackBar } from '../components/shop/ShopParts'
import { useNav } from '../context/NavigationContext'
import { useAuctionItem } from '../hooks/useAuctions'
import { useAuctionRealtime } from '../hooks/useAuctionRealtime'
import { useWatchlist } from '../hooks/useWatchlist'
import { formatarPreco } from '../hooks/useProducts'
import { BidBox } from '../components/auction/BidBox'
import '../styles/shop.css'
import '../styles/auction.css'

function formatarData(iso: string | null): string | null {
  if (!iso) return null
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function AuctionItemPage({ slug }: { slug: string }) {
  const { closeOverlay, openOverlay } = useNav()
  const { item, loading, error } = useAuctionItem(slug)
  const { live, bids } = useAuctionRealtime(item?.id ?? null)
  const { assistindo, alternar } = useWatchlist(item?.id ?? null)
  const [fotoAtiva, setFotoAtiva] = useState(0)

  if (loading) {
    return (
      <div>
        <BackBar label="The Q Vault" onBack={closeOverlay} />
        <p className="empty">Loading…</p>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div>
        <BackBar label="The Q Vault" onBack={closeOverlay} />
        <p className="empty">{error ?? 'This item is not available.'}</p>
      </div>
    )
  }

  const fotos = item.media.filter((m) => m.kind === 'photo')
  const video = item.media.find((m) => m.kind === 'video')
  const midiaAtiva = fotos[fotoAtiva]

  return (
    <div>
      <BackBar label="The Q Vault" onBack={closeOverlay} />

      <div className="auction-gallery">
        <div className="auction-gallery-main">
          {midiaAtiva ? (
            <img src={midiaAtiva.url} alt="" />
          ) : (
            <div className="auction-card-photo-empty" />
          )}
          <div className="auction-badges auction-card-badges">
            {item.fightWorn && <span className="auction-badge">Fight-Worn</span>}
            {item.autographed && <span className="auction-badge">Autographed</span>}
            {item.oneOfOne && <span className="auction-badge">1 of 1</span>}
          </div>
        </div>
        {(fotos.length > 1 || video) && (
          <div className="auction-gallery-thumbs">
            {fotos.map((foto, i) => (
              <button
                key={foto.id}
                type="button"
                className={`auction-gallery-thumb ${i === fotoAtiva ? 'on' : ''}`}
                onClick={() => setFotoAtiva(i)}
              >
                <img src={foto.url} alt="" />
                {foto.isAthleteWearing && <span className="hero-tag">Wearing it</span>}
              </button>
            ))}
            {video && (
              <a className="auction-gallery-thumb auction-gallery-video" href={video.url} target="_blank" rel="noopener noreferrer">
                ▶ Video
              </a>
            )}
          </div>
        )}
      </div>

      <div className="pdp">
        <div className="auction-item-toprow">
          <div className="label">{item.athleteName}</div>
          <button type="button" className="auction-watch-btn" onClick={alternar} aria-pressed={assistindo}>
            {assistindo ? '★ Watching' : '☆ Watch'}
          </button>
        </div>
        <h2>{item.title}</h2>

        {(item.eventName || item.opponentName || item.fightResult) && (
          <p className="desc">
            {[item.eventName, item.opponentName && `vs. ${item.opponentName}`, formatarData(item.fightDate)]
              .filter(Boolean)
              .join(' · ')}
            {item.fightResult && <><br />{item.fightResult}</>}
          </p>
        )}

        {item.athleteSlug && (
          <button
            type="button"
            className="empty-link"
            onClick={() => openOverlay({ name: 'fighter', slug: item.athleteSlug! })}
          >
            View {item.athleteName}'s profile ›
          </button>
        )}

        {item.athleteQuote && <blockquote className="auction-quote">&ldquo;{item.athleteQuote}&rdquo;</blockquote>}

        <BidBox item={item} live={live} bids={bids} />

        {item.description && (
          <>
            <div className="label">Description</div>
            <p className="desc">{item.description}</p>
          </>
        )}

        {item.story && (
          <>
            <div className="label">The Story</div>
            <p className="desc">{item.story}</p>
          </>
        )}

        {(item.condition || item.autographLocation || item.authenticityNote) && (
          <>
            <div className="label">Condition &amp; Authenticity</div>
            <p className="desc">
              {item.condition}
              {item.autographLocation && <><br />Autograph: {item.autographLocation}</>}
              {item.authenticityNote && <><br />{item.authenticityNote}</>}
            </p>
          </>
        )}

        <div className="label">Shipping &amp; Returns</div>
        <p className="desc">
          Domestic shipping: {formatarPreco(item.shipsDomesticCents)}.{' '}
          {item.shipsInternationalCents != null
            ? `International shipping: ${formatarPreco(item.shipsInternationalCents)}.`
            : 'International shipping is not available for this item.'}
          {' '}All sales are final — collectibles are sold as-is and are not eligible for returns.
        </p>
      </div>
    </div>
  )
}

export default AuctionItemPage
