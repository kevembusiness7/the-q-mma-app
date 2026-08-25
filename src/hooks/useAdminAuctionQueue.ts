import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { paraItem, COLUNAS_PUBLICAS } from './useAuctions'
import type { AuctionItem, AuctionOrder, AuctionOrderPaymentStatus } from '../types/auction'

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

export type FiltroPedidoLeilao = 'to_ship' | 'shipped' | 'delivered' | 'needs_attention' | 'all'

export const FILTROS_PEDIDO_LEILAO: { valor: FiltroPedidoLeilao; rotulo: string }[] = [
  { valor: 'to_ship', rotulo: 'To ship' },
  { valor: 'needs_attention', rotulo: 'Needs attention' },
  { valor: 'shipped', rotulo: 'Shipped' },
  { valor: 'delivered', rotulo: 'Delivered' },
  { valor: 'all', rotulo: 'All' },
]

export function seEncaixaLeilao(pedido: AuctionOrder, filtro: FiltroPedidoLeilao): boolean {
  switch (filtro) {
    case 'to_ship':
      return pedido.paymentStatus === 'paid' && !pedido.shippedAt
    case 'shipped':
      return pedido.paymentStatus === 'paid' && !!pedido.shippedAt && !pedido.deliveredAt
    case 'delivered':
      return !!pedido.deliveredAt
    case 'needs_attention':
      return pedido.paymentStatus === 'failed' || pedido.paymentStatus === 'defaulted'
    case 'all':
      return true
  }
}

/**
 * Fila de trabalho do admin pro The Q Vault: pedidos dos vencedores (pra
 * despachar/confirmar pagamento) e os itens ao vivo (pra acompanhar e
 * bloquear lance suspeito). Quem barra de fato quem não é admin é o RLS.
 */
export function useAdminAuctionQueue(ativo: boolean) {
  const [pedidos, setPedidos] = useState<AuctionOrder[]>([])
  const [itensAoVivo, setItensAoVivo] = useState<AuctionItem[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !ativo) return
    setCarregando(true)

    const [{ data: pedidosData, error: erroPedidos }, { data: itensData, error: erroItens }] = await Promise.all([
      supabase.from('auction_orders').select('*').order('created_at', { ascending: false }).limit(200),
      supabase
        .from('auction_items')
        .select(COLUNAS_PUBLICAS)
        .eq('status', 'live')
        .order('ends_at', { ascending: true }),
    ])

    if (erroPedidos || erroItens) {
      setErro((erroPedidos ?? erroItens)!.message)
    } else {
      setErro(null)
      setPedidos((pedidosData ?? []).map(paraPedido))
      setItensAoVivo((itensData ?? []).map(paraItem))
    }
    setCarregando(false)
  }, [ativo])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const alterarPedido = useCallback(
    async (id: string, campos: Record<string, unknown>, local: Partial<AuctionOrder>): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('auction_orders').update(campos).eq('id', id)
      if (error) return error.message
      setPedidos((atual) => atual.map((p) => (p.id === id ? { ...p, ...local } : p)))
      return null
    },
    [],
  )

  const despachar = useCallback(
    (id: string, transportadora: string, codigo: string) => {
      const agora = new Date().toISOString()
      return alterarPedido(
        id,
        { shipped_at: agora, tracking_carrier: transportadora.trim() || null, tracking_number: codigo.trim() || null },
        { shippedAt: agora, trackingCarrier: transportadora.trim() || null, trackingNumber: codigo.trim() || null },
      )
    },
    [alterarPedido],
  )

  const marcarEntregue = useCallback(
    (id: string) => {
      const agora = new Date().toISOString()
      return alterarPedido(id, { delivered_at: agora }, { deliveredAt: agora })
    },
    [alterarPedido],
  )

  /**
   * Tenta cobrar de novo um pedido que falhou. Reabre pra awaiting_payment
   * (o único status que cobrar-vencedor-leilao aceita processar) e chama a
   * Edge Function direto -- mesma função que o cron chama sozinho, só que
   * disparada à mão.
   */
  const tentarCobrancaNovamente = useCallback(
    async (id: string): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const falhaReset = await alterarPedido(
        id,
        { payment_status: 'awaiting_payment' as AuctionOrderPaymentStatus, payment_retry_deadline: null },
        { paymentStatus: 'awaiting_payment', paymentRetryDeadline: null },
      )
      if (falhaReset) return falhaReset

      const { error } = await supabase.functions.invoke('cobrar-vencedor-leilao', { body: { order_id: id } })
      if (error) {
        const detalhe = await (error as any)?.context?.json?.().catch(() => null)
        return detalhe?.erro ?? error.message
      }
      await recarregar()
      return null
    },
    [alterarPedido, recarregar],
  )

  const bloquearLance = useCallback(
    async (bidId: string): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.rpc('bloquear_lance', { p_bid_id: bidId })
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const alterarItem = useCallback(
    async (id: string, campos: Record<string, unknown>): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('auction_items').update(campos).eq('id', id)
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  return {
    pedidos,
    itensAoVivo,
    carregando,
    erro,
    recarregar,
    despachar,
    marcarEntregue,
    tentarCobrancaNovamente,
    bloquearLance,
    alterarItem,
  }
}
