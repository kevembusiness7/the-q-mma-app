import { useState } from 'react'
import { useNav } from '../context/NavigationContext'
import { useAuctions, type VaultBuckets } from '../hooks/useAuctions'
import { AuctionCard } from '../components/auction/AuctionCard'
import '../styles/shop.css'
import '../styles/auction.css'

type Aba = keyof VaultBuckets

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'live', rotulo: 'Live Auctions' },
  { valor: 'endingSoon', rotulo: 'Ending Soon' },
  { valor: 'comingSoon', rotulo: 'Coming Soon' },
  { valor: 'soldArchive', rotulo: 'Sold Archive' },
]

const VAZIO: Record<Aba, string> = {
  live: 'No live auctions right now — check back soon.',
  endingSoon: 'Nothing ending in the next few hours.',
  comingSoon: 'No upcoming items announced yet.',
  soldArchive: 'No completed sales yet.',
}

export function VaultPage() {
  const { openOverlay, closeOverlay } = useNav()
  const { buckets, loading, error } = useAuctions()
  const [aba, setAba] = useState<Aba>('live')

  const itens = buckets[aba]

  return (
    <div className="vault-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">THE Q VAULT</span>
        </div>
      </header>

      <div className="vault-tabs">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            type="button"
            className={`vault-tab ${aba === a.valor ? 'on' : ''}`}
            onClick={() => setAba(a.valor)}
          >
            {a.rotulo}
            <b>{buckets[a.valor].length}</b>
          </button>
        ))}
      </div>

      {loading && <p className="vault-empty">Loading…</p>}
      {error && <p className="vault-empty">Could not load the Vault: {error}</p>}
      {!loading && !error && itens.length === 0 && <p className="vault-empty">{VAZIO[aba]}</p>}

      <div className="auction-grid">
        {itens.map((item) => (
          <AuctionCard
            key={item.id}
            item={item}
            onOpen={() => openOverlay({ name: 'auction-item', slug: item.slug })}
          />
        ))}
      </div>
    </div>
  )
}

export default VaultPage
