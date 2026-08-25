import { formatarPreco } from '../../hooks/useProducts'
import type { AuctionItem } from '../../types/auction'
import { Countdown } from './Countdown'

interface AuctionCardProps {
  item: AuctionItem
  onOpen: () => void
}

/** Data curta ("Sep 19, 2026") a partir de um timestamptz ISO. */
function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * O card inteiro é clicável e abre a página do item — igual ProductCard e
 * PromoAthleteCard. "Place Bid" aqui é só um selo visual (não um <button>
 * de verdade: aninhar botão dentro de botão quebra o HTML), o lance de
 * verdade acontece na página do item.
 */
export function AuctionCard({ item, onOpen }: AuctionCardProps) {
  const foto = item.media.find((m) => m.kind === 'photo')?.url ?? item.media[0]?.url ?? null
  const bidCents = item.currentBidCents || item.startingPriceCents

  return (
    <button type="button" className="auction-card" onClick={onOpen}>
      <div className="auction-card-photo">
        {foto ? <img src={foto} alt="" loading="lazy" /> : <div className="auction-card-photo-empty" />}
        <div className="auction-badges auction-card-badges">
          {item.fightWorn && <span className="auction-badge">Fight-Worn</span>}
          {item.autographed && <span className="auction-badge">Autographed</span>}
          {item.oneOfOne && <span className="auction-badge">1 of 1</span>}
        </div>
      </div>
      <div className="auction-card-body">
        <h4>
          {item.title} — {item.athleteName}
        </h4>
        {item.description && <p>{item.description}</p>}

        <div className="auction-card-bid">
          <span className="auction-card-bid-label">{item.status === 'sold' ? 'Sold for' : 'Current Bid'}</span>
          <span className="auction-card-bid-amount">{formatarPreco(bidCents)}</span>
        </div>

        <div className="auction-card-meta">
          {item.bidCount} bid{item.bidCount === 1 ? '' : 's'}
          {item.status === 'live' && (
            <>
              {' '}
              · Ends in <Countdown endsAt={item.endsAt} />
            </>
          )}
          {item.status === 'scheduled' && <> · Starts {formatarData(item.startsAt)}</>}
        </div>

        {item.status === 'live' && <span className="btn gold auction-card-cta">Place Bid</span>}
        {item.status === 'scheduled' && <span className="btn ghost auction-card-cta">Coming Soon</span>}
        {item.status === 'sold' && <span className="btn ghost auction-card-cta">View Sale</span>}
      </div>
    </button>
  )
}
