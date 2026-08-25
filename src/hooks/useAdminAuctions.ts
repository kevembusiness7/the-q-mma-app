import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AuctionItem, AuctionMedia, AuctionMediaKind } from '../types/auction'

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

function paraItem(row: any): AuctionItem {
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
    reservePriceCents: row.reserve_price_cents,
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

function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface NovoItemLeilao {
  title: string
  athleteName: string
  athleteSlug: string | null
  startingPriceCents: number
  minIncrementCents: number
  startsAt: string
  endsAt: string
}

/**
 * Cadastro dos itens do leilão, visto pela equipe.
 *
 * Quem barra de fato quem não é admin é o RLS no Supabase ("admin gerencia
 * itens do leilao"/"admin gerencia midia do leilao" em auction-schema.sql).
 */
export function useAdminAuctions(ativo: boolean) {
  const [itens, setItens] = useState<AuctionItem[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !ativo) return
    setCarregando(true)
    const { data, error } = await supabase
      .from('auction_items')
      .select('*, auction_media(*)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) setErro(error.message)
    else {
      setErro(null)
      setItens((data ?? []).map(paraItem))
    }
    setCarregando(false)
  }, [ativo])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const criarItem = useCallback(
    async (dados: NovoItemLeilao): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const slug = `${slugify(dados.title)}-${crypto.randomUUID().slice(0, 8)}`
      const { error } = await supabase.from('auction_items').insert({
        slug,
        title: dados.title,
        athlete_name: dados.athleteName,
        athlete_slug: dados.athleteSlug,
        starting_price_cents: dados.startingPriceCents,
        min_increment_cents: dados.minIncrementCents,
        starts_at: dados.startsAt,
        ends_at: dados.endsAt,
        original_ends_at: dados.endsAt,
        status: new Date(dados.startsAt) > new Date() ? 'scheduled' : 'live',
      })
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  /** Update parcial — só manda o que mudou, reflete na lista sem recarregar tudo. */
  const atualizarItem = useCallback(
    async (id: string, campos: Record<string, unknown>): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('auction_items').update(campos).eq('id', id)
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const removerItem = useCallback(
    async (id: string): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      // Esconde da vitrine em vez de apagar: um item que já teve lance não
      // pode desaparecer sem deixar rastro pra quem participou.
      const { error } = await supabase.from('auction_items').update({ is_active: false }).eq('id', id)
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const adicionarMidia = useCallback(
    async (
      itemId: string,
      dados: { kind: AuctionMediaKind; url: string; isAthleteWearing: boolean; sortOrder: number },
    ): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('auction_media').insert({
        item_id: itemId,
        kind: dados.kind,
        url: dados.url,
        is_athlete_wearing: dados.isAthleteWearing,
        sort_order: dados.sortOrder,
      })
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const removerMidia = useCallback(
    async (mediaId: string): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('auction_media').delete().eq('id', mediaId)
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const enviarMidia = useCallback(
    async (arquivo: File): Promise<{ url: string | null; erro: string | null }> => {
      if (!supabase) return { url: null, erro: 'Supabase não está configurado.' }
      if (arquivo.size > 50 * 1024 * 1024) {
        return { url: null, erro: 'The file must be 50 MB or smaller.' }
      }
      const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const nome = `${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from('auction-media')
        .upload(nome, arquivo, { contentType: arquivo.type || undefined })
      if (error) return { url: null, erro: error.message }
      const { data } = supabase.storage.from('auction-media').getPublicUrl(nome)
      return { url: data.publicUrl, erro: null }
    },
    [],
  )

  return {
    itens,
    carregando,
    erro,
    recarregar,
    criarItem,
    atualizarItem,
    removerItem,
    adicionarMidia,
    removerMidia,
    enviarMidia,
  }
}
