import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { paraVisitorRequest } from './useVisitorRequest'
import type { VisitorClassRequest } from '../types/visitor'

/** Um pedido específico, por id -- RLS já restringe ao dono ou admin. */
export function useVisitorRequestDetail(requestId: string | null) {
  const [request, setRequest] = useState<VisitorClassRequest | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      if (!supabase || !requestId) {
        if (ativo) {
          setRequest(null)
          setCarregando(false)
        }
        return
      }
      setCarregando(true)
      const { data, error } = await supabase
        .from('visitor_class_requests')
        .select('*, visitor_passes(*)')
        .eq('id', requestId)
        .maybeSingle()

      if (!ativo) return
      if (error) setErro(error.message)
      else {
        setErro(null)
        setRequest(data ? paraVisitorRequest(data) : null)
      }
      setCarregando(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [requestId])

  return { request, carregando, erro }
}

export interface AssinaturaWaiver {
  signerFullLegalName: string
  signerInitials: string
  acceptedRiskAcknowledgment: boolean
  acceptedMedicalFitness: boolean
  acceptedReleaseOfLiability: boolean
  acceptedRulesAndConduct: boolean
  scrolledToBottom: boolean
  contentSnapshot: string
  waiverVersion: string
}

/**
 * Chama sign_visitor_waiver. O gatilho evaluate_visitor_clearance()
 * (visitor-schema.sql) roda dentro da mesma transação -- se a RPC não
 * devolver erro, o pedido já virou cleared_to_train no banco, não é preciso
 * (nem faz sentido) tentar setar isso aqui.
 */
export function useSignVisitorWaiver() {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const assinar = useCallback(
    async (requestId: string, dados: AssinaturaWaiver): Promise<boolean> => {
      if (!supabase) {
        setErro('Supabase is not configured.')
        return false
      }
      setErro(null)
      setEnviando(true)
      const { error } = await supabase.rpc('sign_visitor_waiver', {
        p_request_id: requestId,
        p_signer_full_legal_name: dados.signerFullLegalName,
        p_signer_initials: dados.signerInitials,
        p_accepted_risk_acknowledgment: dados.acceptedRiskAcknowledgment,
        p_accepted_medical_fitness: dados.acceptedMedicalFitness,
        p_accepted_release_of_liability: dados.acceptedReleaseOfLiability,
        p_accepted_rules_and_conduct: dados.acceptedRulesAndConduct,
        p_scrolled_to_bottom: dados.scrolledToBottom,
        p_content_snapshot: dados.contentSnapshot,
        p_waiver_version: dados.waiverVersion,
        p_user_agent: navigator.userAgent,
      })
      setEnviando(false)
      if (error) {
        setErro(error.message)
        return false
      }
      return true
    },
    [],
  )

  return { assinar, enviando, erro }
}
