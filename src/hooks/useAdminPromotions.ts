import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { paraPromocao } from './useMyPromotions'
import type { PromoReviewStatus, PromotionRequest } from '../types/promotions'

export interface AnotacaoPromocao {
  id: string
  note: string
  authorId: string | null
  createdAt: string
}

/** Recortes que correspondem ao trabalho real do dia. */
export type FiltroPromocao = 'needs_review' | 'scheduled' | 'posted' | 'all'

export const FILTROS_PROMOCAO: { valor: FiltroPromocao; rotulo: string }[] = [
  { valor: 'needs_review', rotulo: 'Needs review' },
  { valor: 'scheduled', rotulo: 'Scheduled' },
  { valor: 'posted', rotulo: 'Posted' },
  { valor: 'all', rotulo: 'All' },
]

/**
 * "Needs review" junta pending_review e under_review: pro admin é o mesmo
 * balde de trabalho, a diferença entre os dois é só se alguém já começou a
 * olhar. Rejeitado e cancelado não têm aba própria de propósito — aparecem
 * dentro de "All"; a pílula de status já deixa claro qual é qual.
 */
export function seEncaixaPromocao(p: PromotionRequest, filtro: FiltroPromocao): boolean {
  switch (filtro) {
    case 'needs_review':
      return p.reviewStatus === 'pending_review' || p.reviewStatus === 'under_review'
    case 'scheduled':
      return p.reviewStatus === 'approved' || p.reviewStatus === 'scheduled'
    case 'posted':
      return p.reviewStatus === 'posted'
    case 'all':
      return true
  }
}

/**
 * Fila de aprovação vista pela equipe. RLS quem barra de fato quem não é
 * admin ("admin atualiza promocao" em promotions-schema.sql) -- o `ativo`
 * aqui só evita disparar a consulta antes da sessão confirmar o papel.
 */
export function usePromocoesAdmin(ativo: boolean) {
  const [promocoes, setPromocoes] = useState<PromotionRequest[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !ativo) return
    setCarregando(true)
    const { data, error } = await supabase
      .from('promotion_requests')
      .select('*')
      .neq('payment_status', 'awaiting_payment')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) setErro(error.message)
    else {
      setErro(null)
      setPromocoes((data ?? []).map(paraPromocao))
    }
    setCarregando(false)
  }, [ativo])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const alterar = useCallback(
    async (id: string, campos: Record<string, unknown>, local: Partial<PromotionRequest>) => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('promotion_requests').update(campos).eq('id', id)
      if (error) {
        setErro(error.message)
        return error.message
      }
      setPromocoes((atual) => atual.map((p) => (p.id === id ? { ...p, ...local } : p)))
      return null
    },
    [],
  )

  const moverParaRevisao = useCallback(
    (id: string) =>
      alterar(id, { review_status: 'under_review' }, { reviewStatus: 'under_review' as PromoReviewStatus }),
    [alterar],
  )

  /** Aprova e já agenda pra data pedida. Remarcar depois usa `agendar`. */
  const aprovar = useCallback(
    (id: string, dataAgendada: string) =>
      alterar(
        id,
        { review_status: 'approved', scheduled_date: dataAgendada, rejection_reason: null },
        { reviewStatus: 'approved' as PromoReviewStatus, scheduledDate: dataAgendada, rejectionReason: null },
      ),
    [alterar],
  )

  const agendar = useCallback(
    (id: string, dataAgendada: string) =>
      alterar(
        id,
        { review_status: 'scheduled', scheduled_date: dataAgendada },
        { reviewStatus: 'scheduled' as PromoReviewStatus, scheduledDate: dataAgendada },
      ),
    [alterar],
  )

  const marcarPostado = useCallback(
    (id: string) => {
      const agora = new Date().toISOString()
      return alterar(
        id,
        { review_status: 'posted', posted_at: agora },
        { reviewStatus: 'posted' as PromoReviewStatus, postedAt: agora },
      )
    },
    [alterar],
  )

  /** Rejeita com motivo -- o cliente vê este texto em My Promotions. Reembolso
   *  é feito à mão no painel do Stripe, mesma filosofia de orders/support. */
  const rejeitar = useCallback(
    (id: string, motivo: string) =>
      alterar(
        id,
        { review_status: 'rejected', rejection_reason: motivo },
        { reviewStatus: 'rejected' as PromoReviewStatus, rejectionReason: motivo },
      ),
    [alterar],
  )

  const cancelar = useCallback(
    (id: string) =>
      alterar(id, { review_status: 'cancelled' }, { reviewStatus: 'cancelled' as PromoReviewStatus }),
    [alterar],
  )

  return {
    promocoes,
    carregando,
    erro,
    recarregar,
    moverParaRevisao,
    aprovar,
    agendar,
    marcarPostado,
    rejeitar,
    cancelar,
  }
}

/**
 * Anotações internas de uma promoção. Vivem em `promotion_admin_notes`
 * (tabela separada) pelo mesmo motivo de order_admin_notes: RLS filtra
 * linha, não coluna, e o cliente lê a própria promoção inteira.
 */
export function useAnotacoesPromocao(promotionId: string | null) {
  const [anotacoes, setAnotacoes] = useState<AnotacaoPromocao[]>([])
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    if (!supabase || !promotionId) {
      setAnotacoes([])
      return
    }
    setCarregando(true)
    const { data } = await supabase
      .from('promotion_admin_notes')
      .select('*')
      .eq('promotion_id', promotionId)
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
  }, [promotionId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const anotar = useCallback(
    async (texto: string, autorId: string): Promise<string | null> => {
      if (!supabase || !promotionId) return 'Supabase não está configurado.'
      const { error } = await supabase
        .from('promotion_admin_notes')
        .insert({ promotion_id: promotionId, note: texto, author_id: autorId })
      if (error) return error.message
      await recarregar()
      return null
    },
    [promotionId, recarregar],
  )

  return { anotacoes, carregando, anotar, recarregar }
}

/** Signed URL de um anexo de campanha — bucket privado, só admin lê. */
export async function urlDoAnexoPromocao(caminho: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.storage.from('promotion-uploads').createSignedUrl(caminho, 60 * 10)
  return data?.signedUrl ?? null
}
