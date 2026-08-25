import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface AuctionLiveState {
  currentBidCents: number
  bidCount: number
  endsAt: string
  extendedCount: number
  status: string
}

export interface BidHistoryEntry {
  id: string
  amountCents: number
  placedAt: string
}

/**
 * Primeira vez que este app usa Supabase Realtime. Assina duas coisas para
 * um item só: mudanças em auction_items (preço/contagem/prazo — a RPC
 * dar_lance grava tudo isso numa linha só) e novos lances em auction_bids
 * (pro histórico da página crescer sozinho). Sem isto, dois visitantes na
 * mesma página só veriam o lance um do outro depois de um F5.
 */
export function useAuctionRealtime(itemId: string | null): {
  live: AuctionLiveState | null
  bids: BidHistoryEntry[]
} {
  const [live, setLive] = useState<AuctionLiveState | null>(null)
  const [bids, setBids] = useState<BidHistoryEntry[]>([])

  useEffect(() => {
    if (!supabase || !itemId) return
    let ativo = true

    async function carregarHistorico() {
      const { data } = await supabase!
        .from('auction_bids')
        .select('id, amount_cents, placed_at')
        .eq('item_id', itemId)
        .order('placed_at', { ascending: false })
        .limit(50)
      if (!ativo || !data) return
      setBids(data.map((b: any) => ({ id: b.id, amountCents: b.amount_cents, placedAt: b.placed_at })))
    }
    carregarHistorico()

    const canal = supabase
      .channel(`auction-item-${itemId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auction_items', filter: `id=eq.${itemId}` },
        (payload) => {
          const row = payload.new as any
          setLive({
            currentBidCents: row.current_bid_cents,
            bidCount: row.bid_count,
            endsAt: row.ends_at,
            extendedCount: row.extended_count,
            status: row.status,
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'auction_bids', filter: `item_id=eq.${itemId}` },
        (payload) => {
          const row = payload.new as any
          setBids((atual) => [{ id: row.id, amountCents: row.amount_cents, placedAt: row.placed_at }, ...atual])
        },
      )
      .subscribe()

    return () => {
      ativo = false
      supabase!.removeChannel(canal)
    }
  }, [itemId])

  return { live, bids }
}
