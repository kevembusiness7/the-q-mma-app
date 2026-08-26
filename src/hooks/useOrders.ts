import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type StatusPagamento = 'awaiting_payment' | 'paid' | 'cancelled' | 'refunded'
export type StatusEntrega = 'unfulfilled' | 'processing' | 'shipped' | 'delivered'

export interface ItemDoPedido {
  id: string
  productName: string
  colorName: string
  size: string
  unitPriceCents: number
  quantity: number
  imageUrl: string | null
}

export interface Pedido {
  id: string
  orderNumber: string
  email: string | null
  paymentStatus: StatusPagamento
  fulfillmentStatus: StatusEntrega
  subtotalCents: number
  shippingCents: number
  taxCents: number
  /** O que o cupom tirou. Zero quando não houve cupom. */
  discountCents: number
  totalCents: number
  shipName: string | null
  shipLine1: string | null
  shipLine2: string | null
  shipCity: string | null
  shipState: string | null
  shipPostalCode: string | null
  shipCountry: string | null
  trackingNumber: string | null
  trackingCarrier: string | null
  stripePaymentIntentId: string | null
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  shippingEmailSentAt: string | null
  itens: ItemDoPedido[]
  /** Quantas anotações internas o pedido tem. Só o admin recebe isto — para
   *  o cliente o RLS não devolve nenhuma linha, então vem sempre 0. */
  anotacoes: number
}

export const ROTULO_PAGAMENTO: Record<StatusPagamento, string> = {
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export const ROTULO_ENTREGA: Record<StatusEntrega, string> = {
  unfulfilled: 'Not shipped yet',
  processing: 'Preparing your order',
  shipped: 'Shipped',
  delivered: 'Delivered',
}

export function paraPedido(row: any): Pedido {
  return {
    id: row.id,
    orderNumber: row.order_number,
    email: row.email ?? null,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    taxCents: row.tax_cents ?? 0,
    discountCents: row.discount_cents ?? 0,
    totalCents: row.total_cents,
    shipName: row.ship_name,
    shipLine1: row.ship_line1,
    shipLine2: row.ship_line2,
    shipCity: row.ship_city,
    shipState: row.ship_state,
    shipPostalCode: row.ship_postal_code,
    shipCountry: row.ship_country,
    trackingNumber: row.tracking_number,
    trackingCarrier: row.tracking_carrier,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? null,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    shippedAt: row.shipped_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    shippingEmailSentAt: row.shipping_email_sent_at ?? null,
    anotacoes: (row.order_admin_notes ?? []).length,
    itens: (row.order_items ?? []).map((i: any) => ({
      id: i.id,
      productName: i.product_name,
      colorName: i.color_name,
      size: i.size,
      unitPriceCents: i.unit_price_cents,
      quantity: i.quantity,
      imageUrl: i.image_url,
    })),
  }
}

/**
 * Pedidos do usuário logado, com os itens aninhados. O RLS garante que só os
 * dele voltam. Pedido de visitante não aparece aqui — a confirmação de quem
 * compra sem conta é o e-mail.
 */
export function useMeusPedidos(usuarioId: string | null) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !usuarioId) {
      setPedidos([])
      return
    }
    setCarregando(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      // O RLS deixa admin ler TODOS os pedidos (pra fila de despacho) -- sem
      // este filtro, o My orders de uma conta admin listava as compras de
      // todo mundo. Aqui é sempre "os meus", seja admin ou não.
      .eq('user_id', usuarioId)
      // Pedido abandonado no Stripe não interessa ao cliente — só confunde.
      .neq('payment_status', 'awaiting_payment')
      .order('created_at', { ascending: false })

    if (error) setErro(error.message)
    else {
      setErro(null)
      setPedidos((data ?? []).map(paraPedido))
    }
    setCarregando(false)
  }, [usuarioId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { pedidos, carregando, erro, recarregar }
}
