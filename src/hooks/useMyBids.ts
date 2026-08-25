import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { paraItem, COLUNAS_PUBLICAS } from './useAuctions'
import type { AuctionItem, AuctionOrder } from '../types/auction'

function paraPedido(row: any): AuctionOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    itemId: row.item_id,
    winnerId: row.winner_id,
    winningBidCents: row.winning_bid_cents,
    itemTitleSnapshot: row.item_title_snapshot,
    athleteNameSnapshot: row.athlete_name_snapshot,
    paymentStatus: row.payment_status,
    paymentRetryDeadline: row.payment_retry_deadline,
    trackingNumber: row.tracking_number,
    trackingCarrier: row.tracking_carrier,
    paidAt: row.paid_at,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
  }
}

export interface MinhasOfertas {
  winning: AuctionItem[]
  outbid: AuctionItem[]
  won: (AuctionOrder & { item: AuctionItem | null })[]
  lost: AuctionItem[]
  watching: AuctionItem[]
}

const VAZIO: MinhasOfertas = { winning: [], outbid: [], won: [], lost: [], watching: [] }

/**
 * Painel "My Bids". Não existe uma coluna "quem está na frente" salva em
 * lugar nenhum -- é sempre recalculada aqui a partir de auction_bids, pra
 * nunca dessincronizar do que a página do item mostra.
 */
export function useMyBids() {
  const { usuario } = useAuth()
  const [buckets, setBuckets] = useState<MinhasOfertas>(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !usuario) {
      setBuckets(VAZIO)
      setCarregando(false)
      return
    }
    setCarregando(true)

    const [{ data: meusLancesRows, error: erroLances }, { data: watchRows }, { data: pedidosRows }] =
      await Promise.all([
        supabase.from('auction_bids').select('item_id').eq('bidder_id', usuario.id),
        supabase.from('auction_watchlist').select('item_id').eq('user_id', usuario.id),
        supabase.from('auction_orders').select('*').eq('winner_id', usuario.id).order('created_at', { ascending: false }),
      ])

    if (erroLances) {
      setErro(erroLances.message)
      setCarregando(false)
      return
    }

    const itemIdsComLance = Array.from(new Set((meusLancesRows ?? []).map((b: any) => b.item_id)))
    const itemIdsWatch = (watchRows ?? []).map((w: any) => w.item_id)
    const pedidos = (pedidosRows ?? []).map(paraPedido)
    const itemIdsTodos = Array.from(new Set([...itemIdsComLance, ...itemIdsWatch, ...pedidos.map((p) => p.itemId)]))

    if (itemIdsTodos.length === 0) {
      setBuckets(VAZIO)
      setCarregando(false)
      return
    }

    const { data: itensData, error: erroItens } = await supabase
      .from('auction_items')
      .select(COLUNAS_PUBLICAS)
      .in('id', itemIdsTodos)

    if (erroItens) {
      setErro(erroItens.message)
      setCarregando(false)
      return
    }

    const itens = new Map((itensData ?? []).map((row: any) => [row.id, paraItem(row)]))

    // Quem está na frente de cada item, recalculado a partir dos lances
    // (não é uma coluna guardada em lugar nenhum).
    const liderPorItem = new Map<string, { bidderId: string; amountCents: number }>()
    if (itemIdsComLance.length > 0) {
      const { data: lancesData } = await supabase
        .from('auction_bids')
        .select('item_id, bidder_id, amount_cents')
        .in('item_id', itemIdsComLance)
        .order('amount_cents', { ascending: false })

      for (const linha of lancesData ?? []) {
        if (!liderPorItem.has(linha.item_id)) {
          liderPorItem.set(linha.item_id, { bidderId: linha.bidder_id, amountCents: linha.amount_cents })
        }
      }
    }

    const idsGanhos = new Set(pedidos.map((p) => p.itemId))

    const winning: AuctionItem[] = []
    const outbid: AuctionItem[] = []
    const lost: AuctionItem[] = []

    for (const itemId of itemIdsComLance) {
      const item = itens.get(itemId)
      if (!item) continue
      const lider = liderPorItem.get(itemId)
      const souLider = lider?.bidderId === usuario.id

      if (item.status === 'live') {
        if (souLider) winning.push(item)
        else outbid.push(item)
      } else if (['sold', 'unsold', 'reserve_not_met'].includes(item.status) && !idsGanhos.has(itemId)) {
        lost.push(item)
      }
    }

    const won = pedidos.map((p) => ({ ...p, item: itens.get(p.itemId) ?? null }))
    const watching = itemIdsWatch.map((id) => itens.get(id)).filter((i): i is AuctionItem => !!i)

    setErro(null)
    setBuckets({ winning, outbid, won, lost, watching })
    setCarregando(false)
  }, [usuario])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { buckets, carregando, erro, recarregar }
}
