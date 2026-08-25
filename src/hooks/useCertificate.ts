import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Certificate {
  certNumber: string
  athleteName: string
  itemTitle: string
  eventName: string | null
  fightDate: string | null
  photoUrl: string | null
  fightWorn: boolean
  autographed: boolean
  autographLocation: string | null
  issuedAt: string
}

function paraCertificado(row: any): Certificate {
  return {
    certNumber: row.cert_number,
    athleteName: row.athlete_name,
    itemTitle: row.item_title,
    eventName: row.event_name,
    fightDate: row.fight_date,
    photoUrl: row.photo_url,
    fightWorn: row.fight_worn,
    autographed: row.autographed,
    autographLocation: row.autograph_location,
    issuedAt: row.issued_at,
  }
}

/**
 * Busca pública por número de certificado — sem login, é o ponto inteiro de
 * escanear o QR Code. Não pede buyer_name_snapshot: é dado do comprador, não
 * pertence numa página que qualquer um pode abrir.
 */
export function useCertificate(certNumber: string): {
  certificate: Certificate | null
  loading: boolean
  error: string | null
} {
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      if (!supabase) {
        if (ativo) {
          setError('Payments are not available right now.')
          setLoading(false)
        }
        return
      }
      const { data, error: falha } = await supabase
        .from('authenticity_certificates')
        .select('cert_number, athlete_name, item_title, event_name, fight_date, photo_url, fight_worn, autographed, autograph_location, issued_at')
        .eq('cert_number', certNumber)
        .maybeSingle()

      if (!ativo) return
      if (falha) {
        setError(falha.message)
        setLoading(false)
        return
      }
      setCertificate(data ? paraCertificado(data) : null)
      setLoading(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [certNumber])

  return { certificate, loading, error }
}
