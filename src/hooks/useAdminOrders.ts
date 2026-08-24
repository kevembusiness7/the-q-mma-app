import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { paraPedido, type Pedido, type StatusEntrega } from './useOrders'

/**
 * Pedidos vistos pela equipe.
 *
 * O que garante que só admin enxerga isto é o RLS no Supabase — a política
 * de select em `orders` exige `eh_admin()` para ver linha de outra pessoa, e
 * a de update exige o mesmo. A checagem no app só evita mostrar uma tela
 * vazia e confusa; quem controla o navegador contorna qualquer verificação
 * feita aqui, então ela nunca é a defesa.
 */

export interface AnotacaoPedido {
  id: string
  note: string
  authorId: string | null
  createdAt: string
}

/** Recortes que correspondem ao trabalho real do dia. */
export type FiltroPedido = 'to_ship' | 'shipped' | 'delivered' | 'all'

export const FILTROS_PEDIDO: { valor: FiltroPedido; rotulo: string }[] = [
  { valor: 'to_ship', rotulo: 'To ship' },
  { valor: 'shipped', rotulo: 'Shipped' },
  { valor: 'delivered', rotulo: 'Delivered' },
  { valor: 'all', rotulo: 'All' },
]

/**
 * "Para despachar" é pago E ainda não enviado. O estado de pagamento e o de
 * entrega são separados de propósito: pedido pago que ninguém preparou é
 * trabalho pendente; pedido cancelado que ninguém preparou não é nada.
 */
export function seEncaixa(pedido: Pedido, filtro: FiltroPedido): boolean {
  switch (filtro) {
    case 'to_ship':
      return (
        pedido.paymentStatus === 'paid' &&
        (pedido.fulfillmentStatus === 'unfulfilled' || pedido.fulfillmentStatus === 'processing')
      )
    case 'shipped':
      return pedido.fulfillmentStatus === 'shipped'
    case 'delivered':
      return pedido.fulfillmentStatus === 'delivered'
    case 'all':
      return true
  }
}

export function usePedidosAdmin(ativo: boolean) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !ativo) return
    setCarregando(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), order_admin_notes(id)')
      // Sessão de checkout aberta e nunca paga não é pedido — é gente que
      // desistiu na página do Stripe. Só polui a fila de trabalho.
      .neq('payment_status', 'awaiting_payment')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) setErro(error.message)
    else {
      setErro(null)
      setPedidos((data ?? []).map(paraPedido))
    }
    setCarregando(false)
  }, [ativo])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  /** Aplica o update no banco e reflete na lista sem recarregar tudo. */
  const alterar = useCallback(
    async (id: string, campos: Record<string, unknown>, local: Partial<Pedido>) => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('orders').update(campos).eq('id', id)
      if (error) {
        setErro(error.message)
        return error.message
      }
      setPedidos((atual) => atual.map((p) => (p.id === id ? { ...p, ...local } : p)))
      return null
    },
    [],
  )

  /**
   * Despacho. O rastreio é gravado JUNTO com a mudança de estado, num update
   * só: marcar como enviado e só depois lembrar o código deixaria o cliente
   * vendo "Shipped" sem ter o que acompanhar.
   */
  const despachar = useCallback(
    (id: string, transportadora: string, codigo: string) => {
      const agora = new Date().toISOString()
      return alterar(
        id,
        {
          fulfillment_status: 'shipped',
          shipped_at: agora,
          tracking_carrier: transportadora.trim() || null,
          tracking_number: codigo.trim() || null,
        },
        {
          fulfillmentStatus: 'shipped',
          shippedAt: agora,
          trackingCarrier: transportadora.trim() || null,
          trackingNumber: codigo.trim() || null,
        },
      )
    },
    [alterar],
  )

  /**
   * Manda o "seu pedido saiu" para o cliente.
   *
   * Quem monta e envia é a Edge Function `notificar-envio`: a chave do Resend
   * fica no servidor, nunca no app. A função também confere sozinha que quem
   * chamou é admin e que o pedido está mesmo despachado — não confia em nada
   * que sai daqui além do id.
   */
  const avisarEnvio = useCallback(async (id: string): Promise<string | null> => {
    if (!supabase) return 'Supabase não está configurado.'
    const { error } = await supabase.functions.invoke('notificar-envio', {
      body: { order_id: id },
    })
    if (error) {
      // O corpo da resposta traz o motivo real; o erro do supabase-js só diz
      // que o status não foi 2xx.
      const detalhe = await (error as any)?.context?.json?.().catch(() => null)
      return detalhe?.erro ?? error.message
    }
    const agora = new Date().toISOString()
    setPedidos((atual) =>
      atual.map((p) => (p.id === id ? { ...p, shippingEmailSentAt: agora } : p)),
    )
    return null
  }, [])

  const marcarEntregue = useCallback(
    (id: string) => {
      const agora = new Date().toISOString()
      return alterar(
        id,
        { fulfillment_status: 'delivered', delivered_at: agora },
        { fulfillmentStatus: 'delivered', deliveredAt: agora },
      )
    },
    [alterar],
  )

  /** Desfaz um despacho lançado por engano. Limpa as datas junto: data de
   *  envio em pedido que não saiu é pior do que campo vazio. */
  const voltarParaPreparo = useCallback(
    (id: string) =>
      alterar(
        id,
        { fulfillment_status: 'processing', shipped_at: null, delivered_at: null },
        { fulfillmentStatus: 'processing' as StatusEntrega, shippedAt: null, deliveredAt: null },
      ),
    [alterar],
  )

  return {
    pedidos,
    carregando,
    erro,
    recarregar,
    despachar,
    avisarEnvio,
    marcarEntregue,
    voltarParaPreparo,
  }
}

/**
 * Anotações internas de um pedido.
 *
 * Vivem em `order_admin_notes` e não numa coluna de `orders` porque o RLS
 * filtra LINHAS, não colunas: uma nota gravada no próprio pedido apareceria
 * no select do cliente, que lê o pedido dele inteiro.
 */
export function useAnotacoes(orderId: string | null) {
  const [anotacoes, setAnotacoes] = useState<AnotacaoPedido[]>([])
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    if (!supabase || !orderId) {
      setAnotacoes([])
      return
    }
    setCarregando(true)
    const { data } = await supabase
      .from('order_admin_notes')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    setAnotacoes(
      (data ?? []).map((r: any) => ({
        id: r.id,
        note: r.note,
        authorId: r.author_id,
        createdAt: r.created_at,
      })),
    )
    setCarregando(false)
  }, [orderId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const anotar = useCallback(
    async (texto: string, autorId: string): Promise<string | null> => {
      if (!supabase || !orderId) return 'Supabase não está configurado.'
      const { error } = await supabase
        .from('order_admin_notes')
        .insert({ order_id: orderId, note: texto, author_id: autorId })
      if (error) return error.message
      await recarregar()
      return null
    },
    [orderId, recarregar],
  )

  return { anotacoes, carregando, anotar, recarregar }
}
