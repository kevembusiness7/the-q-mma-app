import { useEffect, useState } from 'react'
import { useNav } from '../../context/NavigationContext'
import { useAuth } from '../../context/AuthContext'
import { useCardVerification } from '../../hooks/useCardVerification'
import { usePlaceBid } from '../../hooks/usePlaceBid'
import { formatarPreco } from '../../hooks/useProducts'
import type { AuctionItem } from '../../types/auction'
import type { AuctionLiveState, BidHistoryEntry } from '../../hooks/useAuctionRealtime'
import { Countdown } from './Countdown'

interface BidBoxProps {
  item: AuctionItem
  live: AuctionLiveState | null
  bids: BidHistoryEntry[]
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function BidBox({ item, live, bids }: BidBoxProps) {
  const { openOverlay } = useNav()
  const { usuario } = useAuth()
  const { verificadoEm, carregando: carregandoVerificacao, verificar, redirecionando, erro: erroVerificacao } =
    useCardVerification()
  const { darLance, enviando, erro: erroLance } = usePlaceBid()

  const status = live?.status ?? item.status
  const currentBidCents = live?.currentBidCents ?? item.currentBidCents
  const bidCount = live?.bidCount ?? item.bidCount
  const endsAt = live?.endsAt ?? item.endsAt
  const extendedCount = live?.extendedCount ?? item.extendedCount
  const bidCents = currentBidCents || item.startingPriceCents
  const proximoLanceMinimo = currentBidCents ? currentBidCents + item.minIncrementCents : item.startingPriceCents

  const [valor, setValor] = useState(String(proximoLanceMinimo / 100))
  const [confirmado, setConfirmado] = useState(false)

  // Sempre que o mínimo sobe (lance de outra pessoa chegou por Realtime),
  // acompanha — sem isto o campo ficaria mostrando um valor que já perdeu.
  useEffect(() => {
    setValor(String(proximoLanceMinimo / 100))
  }, [proximoLanceMinimo])

  async function aoConfirmar() {
    const centavos = Math.round(Number(valor) * 100)
    setConfirmado(false)
    const ok = await darLance(item.id, centavos)
    if (ok) setConfirmado(true)
  }

  return (
    <div className="auction-bidbox">
      <div className="auction-bidbox-row">
        <div>
          <span className="label">{status === 'sold' ? 'Sold for' : 'Current Bid'}</span>
          <div className="auction-bidbox-amount">{formatarPreco(bidCents)}</div>
        </div>
        {status === 'live' && (
          <div className="auction-bidbox-countdown">
            <span className="label">Ends in</span>
            <Countdown endsAt={endsAt} className="auction-bidbox-clock" />
          </div>
        )}
      </div>
      <p className="cart-note">
        {bidCount} bid{bidCount === 1 ? '' : 's'}
        {status === 'live' && ` · Next minimum bid: ${formatarPreco(proximoLanceMinimo)}`}
      </p>
      {extendedCount > 0 && status === 'live' && (
        <p className="auction-extended-note">Extended due to a last-minute bid</p>
      )}

      {status === 'scheduled' && <p className="cart-note">Bidding opens {formatarDataHora(item.startsAt)}.</p>}
      {(status === 'sold' || status === 'unsold' || status === 'reserve_not_met') && (
        <p className="cart-note">This auction has ended.</p>
      )}

      {status === 'live' && !usuario && (
        <button type="button" className="btn gold" onClick={() => openOverlay({ name: 'auth' })}>
          Sign in to bid
        </button>
      )}

      {status === 'live' && usuario && !carregandoVerificacao && !verificadoEm && (
        <>
          <button type="button" className="btn gold" disabled={redirecionando} onClick={verificar}>
            {redirecionando ? 'Redirecting…' : 'Verify card to bid'}
          </button>
          <p className="cart-note">
            One-time check with Stripe — nothing is charged now. You'll only ever be charged if you
            win, and only for the winning amount.
          </p>
          {erroVerificacao && (
            <p className="auth-erro" role="alert">
              {erroVerificacao}
            </p>
          )}
        </>
      )}

      {status === 'live' && usuario && verificadoEm && (
        <div className="auction-bid-form">
          <label className="campo">
            <span>Your bid (USD)</span>
            <input
              inputMode="decimal"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value)
                setConfirmado(false)
              }}
            />
          </label>
          <button
            type="button"
            className="btn gold"
            disabled={enviando || !valor || Math.round(Number(valor) * 100) < proximoLanceMinimo}
            onClick={aoConfirmar}
          >
            {enviando ? 'Placing bid…' : 'Place Bid'}
          </button>
          {confirmado && <p className="auction-bid-ok">✓ Your bid has been placed.</p>}
          {erroLance && (
            <p className="auth-erro" role="alert">
              {erroLance}
            </p>
          )}
        </div>
      )}

      {bids.length > 0 && (
        <div className="auction-bid-history">
          <div className="label">Bid History</div>
          {bids.slice(0, 10).map((b) => (
            <div key={b.id} className="auction-bid-row">
              <span>{formatarPreco(b.amountCents)}</span>
              <span>{formatarHora(b.placedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
