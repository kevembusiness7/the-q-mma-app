import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AuctionItem, AuctionMedia } from '../types/auction'

/** Card de "Ending Soon" é só um filtro visual sobre os itens live -- não é
 *  um status próprio no banco, pra não depender de um cron só pra mudar de
 *  categoria na vitrine. */
const JANELA_ENDING_SOON_MS = 3 * 60 * 60 * 1000

function paraMidia(row: any): AuctionMedia {
  return {
    id: row.id,
    itemId: row.item_id,
    kind: row.kind,
    url: row.url,
    isAthleteWearing: row.is_athlete_wearing,
    sortOrder: row.sort_order,
  }
}

export function paraItem(row: any): AuctionItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    athleteName: row.athlete_name,
    athleteSlug: row.athlete_slug,
    eventName: row.event_name,
    opponentName: row.opponent_name,
    fightDate: row.fight_date,
    fightResult: row.fight_result,
    athleteQuote: row.athlete_quote,
    description: row.description,
    story: row.story,
    condition: row.condition,
    autographLocation: row.autograph_location,
    authenticityNote: row.authenticity_note,
    startingPriceCents: row.starting_price_cents,
    // A reserva nunca vem no select público (ver useAuctions/useAuctionItem
    // abaixo, que não pedem essa coluna) -- fica null aqui só pra bater com
    // o tipo, nunca por ter vindo de verdade do banco.
    reservePriceCents: null,
    minIncrementCents: row.min_increment_cents,
    currentBidCents: row.current_bid_cents,
    bidCount: row.bid_count,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    originalEndsAt: row.original_ends_at,
    extendedCount: row.extended_count,
    status: row.status,
    fightWorn: row.fight_worn,
    autographed: row.autographed,
    oneOfOne: row.one_of_one,
    shipsDomesticCents: row.ships_domestic_cents,
    shipsInternationalCents: row.ships_international_cents,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    media: (row.auction_media ?? [])
      .map(paraMidia)
      .sort((a: AuctionMedia, b: AuctionMedia) => a.sortOrder - b.sortOrder),
  }
}

/** Colunas públicas — sem reserve_price_cents, que é confidencial. */
export const COLUNAS_PUBLICAS =
  'id, slug, title, athlete_name, athlete_slug, event_name, opponent_name, fight_date, ' +
  'fight_result, athlete_quote, description, story, condition, autograph_location, ' +
  'authenticity_note, starting_price_cents, min_increment_cents, current_bid_cents, bid_count, ' +
  'starts_at, ends_at, original_ends_at, extended_count, status, fight_worn, autographed, ' +
  'one_of_one, ships_domestic_cents, ships_international_cents, is_active, sort_order, ' +
  'auction_media(*)'

export interface VaultBuckets {
  live: AuctionItem[]
  endingSoon: AuctionItem[]
  comingSoon: AuctionItem[]
  soldArchive: AuctionItem[]
}

/** Vitrine pública do The Q Vault, agrupada nas 4 categorias da tela. */
export function useAuctions(): { buckets: VaultBuckets; loading: boolean; error: string | null } {
  const [itens, setItens] = useState<AuctionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      if (!supabase) {
        if (ativo) setLoading(false)
        return
      }
      const { data, error: falha } = await supabase
        .from('auction_items')
        .select(COLUNAS_PUBLICAS)
        .order('sort_order', { ascending: true })

      if (!ativo) return
      if (falha) {
        setError(falha.message)
        setLoading(false)
        return
      }
      setItens((data ?? []).map(paraItem))
      setLoading(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const buckets = useMemo<VaultBuckets>(() => {
    const agora = Date.now()
    const live: AuctionItem[] = []
    const endingSoon: AuctionItem[] = []
    const comingSoon: AuctionItem[] = []
    const soldArchive: AuctionItem[] = []

    for (const item of itens) {
      if (item.status === 'live') {
        live.push(item)
        if (new Date(item.endsAt).getTime() - agora <= JANELA_ENDING_SOON_MS) endingSoon.push(item)
      } else if (item.status === 'scheduled') {
        comingSoon.push(item)
      } else if (item.status === 'sold') {
        soldArchive.push(item)
      }
    }

    return { live, endingSoon, comingSoon, soldArchive }
  }, [itens])

  return { buckets, loading, error }
}

/** Um item só, para a página de detalhe. */
export function useAuctionItem(slug: string): { item: AuctionItem | null; loading: boolean; error: string | null } {
  const [item, setItem] = useState<AuctionItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    setLoading(true)

    async function carregar() {
      if (!supabase) {
        if (ativo) setLoading(false)
        return
      }
      const { data, error: falha } = await supabase
        .from('auction_items')
        .select(COLUNAS_PUBLICAS)
        .eq('slug', slug)
        .maybeSingle()

      if (!ativo) return
      if (falha) {
        setError(falha.message)
        setLoading(false)
        return
      }
      setItem(data ? paraItem(data) : null)
      setLoading(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [slug])

  return { item, loading, error }
}
