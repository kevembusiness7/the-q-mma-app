import { useState } from 'react'
import { BackBar } from '../components/shop/ShopParts'
import { useNav } from '../context/NavigationContext'
import { useAuth } from '../context/AuthContext'
import { useAuctionItem } from '../hooks/useAuctions'
import { formatarPreco } from '../hooks/useProducts'
import { Countdown } from '../components/auction/Countdown'
import '../styles/shop.css'
import '../styles/auction.css'

function formatarData(iso: string | null): string | null {
  if (!iso) return null
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function AuctionItemPage({ slug }: { slug: string }) {
  const { closeOverlay, openOverlay } = useNav()
  const { usuario } = useAuth()
  const { item, loading, error } = useAuctionItem(slug)
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

  const bidCents = item.currentBidCents || item.startingPriceCents
  const proximoLanceMinimo = item.currentBidCents
    ? item.currentBidCents + item.minIncrementCents
    : item.startingPriceCents
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
        <div className="label">{item.athleteName}</div>
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

        <div className="auction-bidbox">
          <div className="auction-bidbox-row">
            <div>
              <span className="label">{item.status === 'sold' ? 'Sold for' : 'Current Bid'}</span>
              <div className="auction-bidbox-amount">{formatarPreco(bidCents)}</div>
            </div>
            {item.status === 'live' && (
              <div className="auction-bidbox-countdown">
                <span className="label">Ends in</span>
                <Countdown endsAt={item.endsAt} className="auction-bidbox-clock" />
              </div>
            )}
          </div>
          <p className="cart-note">
            {item.bidCount} bid{item.bidCount === 1 ? '' : 's'}
            {item.status === 'live' && ` · Next minimum bid: ${formatarPreco(proximoLanceMinimo)}`}
          </p>

          {item.status === 'live' && (
            <button type="button" className="btn gold" onClick={() => !usuario && openOverlay({ name: 'auth' })}>
              {usuario ? 'Verify card to bid' : 'Sign in to bid'}
            </button>
          )}
          {item.status === 'scheduled' && <p className="cart-note">Bidding opens {formatarData(item.startsAt) ?? 'soon'}.</p>}
          {(item.status === 'sold' || item.status === 'unsold' || item.status === 'reserve_not_met') && (
            <p className="cart-note">This auction has ended.</p>
          )}
        </div>

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
