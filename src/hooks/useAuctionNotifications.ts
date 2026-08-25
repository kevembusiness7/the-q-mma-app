import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { AuctionNotification } from '../types/auction'

function paraNotificacao(row: any, slug: string | null): AuctionNotification {
  return {
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id,
    itemSlug: slug,
    kind: row.kind,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

/**
 * Avisos do The Q Vault (superado, venceu, termina logo...). Quem insere é
 * sempre uma função do servidor (dar_lance, processar_leiloes) -- aqui só
 * lê e marca como lida.
 */
export function useAuctionNotifications() {
  const { usuario } = useAuth()
  const [notificacoes, setNotificacoes] = useState<AuctionNotification[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!supabase || !usuario) {
      setNotificacoes([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    const { data } = await supabase
      .from('auction_notifications')
      .select('*')
      .eq('user_id', usuario.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const rows = data ?? []
    // item_slug não existe na tabela (só item_id) -- resolve aqui pra "My
    // Bids" poder abrir a página do item direto de um alerta.
    const itemIds = Array.from(new Set(rows.map((r: any) => r.item_id).filter(Boolean)))
    const slugPorId = new Map<string, string>()
    if (itemIds.length > 0) {
      const { data: itensData } = await supabase.from('auction_items').select('id, slug').in('id', itemIds)
      for (const row of itensData ?? []) slugPorId.set(row.id, row.slug)
    }

    setNotificacoes(rows.map((r: any) => paraNotificacao(r, r.item_id ? (slugPorId.get(r.item_id) ?? null) : null)))
    setCarregando(false)
  }, [usuario])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  async function marcarLida(id: string) {
    if (!supabase) return
    const agora = new Date().toISOString()
    await supabase.from('auction_notifications').update({ read_at: agora }).eq('id', id)
    setNotificacoes((atual) => atual.map((n) => (n.id === id ? { ...n, readAt: agora } : n)))
  }

  return { notificacoes, carregando, recarregar, marcarLida }
}
