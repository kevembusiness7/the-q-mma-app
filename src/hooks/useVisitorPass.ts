import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { VisitorPass } from '../types/visitor'

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

/**
 * Busca pública por código de pass -- sem login, mesmo raciocínio de
 * useCertificate. visitor_passes só guarda nome/classe/status/datas de
 * propósito (ver visitor-schema.sql seção 4): nunca DOB, telefone, e-mail.
 */
export function useVisitorPass(passCode: string): {
  pass: VisitorPass | null
  loading: boolean
  error: string | null
} {
  const [pass, setPass] = useState<VisitorPass | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      if (!supabase) {
        if (ativo) {
          setError('This pass is not available right now.')
          setLoading(false)
        }
        return
      }
      const { data, error: falha } = await supabase
        .from('visitor_passes')
        .select('*')
        .eq('pass_code', passCode)
        .maybeSingle()

      if (!ativo) return
      if (falha) {
        setError(falha.message)
        setLoading(false)
        return
      }
      setPass(data ? paraPass(data) : null)
      setLoading(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [passCode])

  return { pass, loading, error }
}
