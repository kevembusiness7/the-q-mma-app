import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { VisitorClassRequest, VisitorExperienceLevel, VisitorPass } from '../types/visitor'

function paraPass(row: any): VisitorPass {
  return {
    id: row.id,
    passCode: row.pass_code,
    requestId: row.request_id,
    fullName: row.full_name,
    requestedClassName: row.requested_class_name,
    waiverVersion: row.waiver_version,
    status: row.status,
    clearedAt: row.cleared_at,
    expiresAt: row.expires_at,
  }
}

export function paraVisitorRequest(row: any): VisitorClassRequest {
  const passRow = Array.isArray(row.visitor_passes) ? row.visitor_passes[0] : row.visitor_passes
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    dateOfBirth: row.date_of_birth,
    requestedClassName: row.requested_class_name,
    requestedDate: row.requested_date,
    requestedTime: row.requested_time,
    experienceLevel: row.experience_level,
    martialArtsExperience: row.martial_arts_experience,
    notesFromVisitor: row.notes_from_visitor,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    rejectionReasonCode: row.rejection_reason_code,
    rejectionReason: row.rejection_reason,
    clearedAt: row.cleared_at,
    expiresAt: row.expires_at,
    waiverId: row.waiver_id,
    createdAt: row.created_at,
    pass: passRow ? paraPass(passRow) : null,
  }
}

/**
 * Pedido de visita mais recente do usuário logado, com o Visitor Pass já
 * junto (evita um segundo round trip quando o status vira cleared_to_train).
 * Só existe UM pedido ativo por vez (índice único no banco), mas pedidos
 * antigos (rejected/cancelled/expired) continuam existindo -- por isso
 * pega sempre o mais recente, não "o ativo".
 */
export function useMyVisitorRequest(userId: string | null) {
  const [request, setRequest] = useState<VisitorClassRequest | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !userId) {
      setRequest(null)
      return
    }
    setCarregando(true)
    const { data, error } = await supabase
      .from('visitor_class_requests')
      .select('*, visitor_passes(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) setErro(error.message)
    else {
      setErro(null)
      setRequest(data ? paraVisitorRequest(data) : null)
    }
    setCarregando(false)
  }, [userId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { request, carregando, erro, recarregar }
}

export interface DadosSolicitacaoVisitante {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  requestedClassName: string
  requestedDate: string
  requestedTime: string
  experienceLevel: VisitorExperienceLevel
  martialArtsExperience: string
  notesFromVisitor: string
  acknowledgedNoGuarantee: boolean
}

/** Chama a RPC submit_visitor_class_request (atômica, ver visitor-schema.sql). */
export async function submitVisitorRequest(
  dados: DadosSolicitacaoVisitante,
): Promise<{ id: string } | { erro: string }> {
  if (!supabase) return { erro: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('submit_visitor_class_request', {
    p_full_name: dados.fullName,
    p_email: dados.email,
    p_phone: dados.phone || null,
    p_date_of_birth: dados.dateOfBirth,
    p_requested_class_name: dados.requestedClassName,
    p_requested_date: dados.requestedDate,
    p_requested_time: dados.requestedTime || null,
    p_experience_level: dados.experienceLevel,
    p_martial_arts_experience: dados.martialArtsExperience || null,
    p_notes_from_visitor: dados.notesFromVisitor || null,
    p_acknowledged_no_guarantee: dados.acknowledgedNoGuarantee,
  })

  if (error) return { erro: error.message }
  return { id: (data as { id: string }).id }
}
