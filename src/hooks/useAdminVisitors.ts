import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { paraVisitorRequest } from './useVisitorRequest'
import type { VisitorClassRequest, VisitorRejectionReasonCode, VisitorRequestStatus } from '../types/visitor'

export interface AnotacaoVisitante {
  id: string
  note: string
  authorId: string | null
  createdAt: string
}

export type FiltroVisitante =
  | 'all'
  | 'new'
  | 'under_review'
  | 'waiting_waiver'
  | 'cleared'
  | 'rejected'
  | 'expired'

export const FILTROS_VISITANTE: { valor: FiltroVisitante; rotulo: string }[] = [
  { valor: 'all', rotulo: 'All' },
  { valor: 'new', rotulo: 'New' },
  { valor: 'under_review', rotulo: 'Under review' },
  { valor: 'waiting_waiver', rotulo: 'Waiting for waiver' },
  { valor: 'cleared', rotulo: 'Cleared' },
  { valor: 'rejected', rotulo: 'Rejected' },
  { valor: 'expired', rotulo: 'Expired' },
]

export function seEncaixaVisitante(r: VisitorClassRequest, filtro: FiltroVisitante): boolean {
  switch (filtro) {
    case 'all':
      return true
    case 'new':
      return r.status === 'submitted'
    case 'under_review':
      return r.status === 'under_review'
    case 'waiting_waiver':
      return r.status === 'approved_pending_waiver'
    case 'cleared':
      return r.status === 'cleared_to_train'
    case 'rejected':
      return r.status === 'rejected'
    case 'expired':
      return r.status === 'expired'
  }
}

/**
 * Fila de visitantes vista pela equipe. RLS quem barra de fato quem não é
 * admin ("le o proprio pedido de visita" em visitor-schema.sql) -- o `ativo`
 * aqui só evita disparar a consulta antes da sessão confirmar o papel.
 *
 * Ao contrário de promotion_requests, visitor_class_requests não tem
 * política de UPDATE pra ninguém -- toda mudança de status passa pela RPC
 * admin_transition_visitor_request, nunca por um .update() direto.
 */
export function useVisitantesAdmin(ativo: boolean) {
  const [visitantes, setVisitantes] = useState<VisitorClassRequest[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !ativo) return
    setCarregando(true)
    const { data, error } = await supabase
      .from('visitor_class_requests')
      .select('*, visitor_passes(*)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) setErro(error.message)
    else {
      setErro(null)
      setVisitantes((data ?? []).map(paraVisitorRequest))
    }
    setCarregando(false)
  }, [ativo])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const transicionar = useCallback(
    async (
      id: string,
      novoStatus: VisitorRequestStatus,
      opcoes?: { rejectionReasonCode?: VisitorRejectionReasonCode; rejectionReason?: string },
    ): Promise<string | null> => {
      if (!supabase) return 'Supabase is not configured.'
      const { error } = await supabase.rpc('admin_transition_visitor_request', {
        p_request_id: id,
        p_new_status: novoStatus,
        p_rejection_reason_code: opcoes?.rejectionReasonCode ?? null,
        p_rejection_reason: opcoes?.rejectionReason ?? null,
      })
      if (error) {
        setErro(error.message)
        return error.message
      }
      await recarregar()
      return null
    },
    [recarregar],
  )

  const moverParaRevisao = useCallback((id: string) => transicionar(id, 'under_review'), [transicionar])
  const aprovar = useCallback((id: string) => transicionar(id, 'approved_pending_waiver'), [transicionar])
  const rejeitar = useCallback(
    (id: string, reasonCode: VisitorRejectionReasonCode, reason?: string) =>
      transicionar(id, 'rejected', { rejectionReasonCode: reasonCode, rejectionReason: reason }),
    [transicionar],
  )
  const cancelar = useCallback((id: string) => transicionar(id, 'cancelled'), [transicionar])
  const marcarExpirado = useCallback((id: string) => transicionar(id, 'expired'), [transicionar])

  return {
    visitantes,
    carregando,
    erro,
    recarregar,
    moverParaRevisao,
    aprovar,
    rejeitar,
    cancelar,
    marcarExpirado,
  }
}

/**
 * Anotações internas de um pedido de visita. Vivem em
 * visitor_request_admin_notes (tabela separada) pelo mesmo motivo de
 * promotion_admin_notes: RLS filtra linha, não coluna.
 */
export function useAnotacoesVisitante(requestId: string | null) {
  const [anotacoes, setAnotacoes] = useState<AnotacaoVisitante[]>([])
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    if (!supabase || !requestId) {
      setAnotacoes([])
      return
    }
    setCarregando(true)
    const { data } = await supabase
      .from('visitor_request_admin_notes')
      .select('*')
      .eq('request_id', requestId)
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
  }, [requestId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const anotar = useCallback(
    async (texto: string, autorId: string): Promise<string | null> => {
      if (!supabase || !requestId) return 'Supabase is not configured.'
      const { error } = await supabase
        .from('visitor_request_admin_notes')
        .insert({ request_id: requestId, note: texto, author_id: autorId })
      if (error) return error.message
      await recarregar()
      return null
    },
    [requestId, recarregar],
  )

  return { anotacoes, carregando, anotar, recarregar }
}

/** Contagem de novos pedidos -- alimenta o badge da aba admin em YouPage. */
export function useVisitorPendingCount(ativo: boolean) {
  const [contagem, setContagem] = useState(0)

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      if (!supabase || !ativo) return
      const { count } = await supabase
        .from('visitor_class_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted')
      if (!cancelado) setContagem(count ?? 0)
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [ativo])

  return contagem
}
