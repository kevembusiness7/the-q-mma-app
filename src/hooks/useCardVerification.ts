import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Estado do cartão verificado do licitante + o botão que manda pro Stripe
 * confirmar um (mode: 'setup', sem cobrar nada — ver a Edge Function
 * verificar-cartao-leilao). Quem de fato grava bid_verified_at é o webhook,
 * depois que o Stripe confirma; esta tela só lê o que já está salvo.
 */
export function useCardVerification() {
  const { usuario } = useAuth()
  const [verificadoEm, setVerificadoEm] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [redirecionando, setRedirecionando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      if (!supabase || !usuario) {
        if (ativo) setCarregando(false)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('bid_verified_at')
        .eq('id', usuario.id)
        .maybeSingle()
      if (!ativo) return
      setVerificadoEm(data?.bid_verified_at ?? null)
      setCarregando(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [usuario])

  async function verificar() {
    if (!supabase) {
      setErro('Payments are not available right now.')
      return
    }
    setErro(null)
    setRedirecionando(true)

    const { data, error } = await supabase.functions.invoke('verificar-cartao-leilao')

    if (error) {
      let mensagem = 'Could not start card verification. Try again.'
      try {
        const corpo = await (error as any).context?.json?.()
        if (corpo?.erro) mensagem = corpo.erro
      } catch {
        /* mantém a mensagem genérica */
      }
      setErro(mensagem)
      setRedirecionando(false)
      return
    }

    if (data?.url) {
      window.location.href = data.url
      return
    }

    setErro('Could not start card verification. Try again.')
    setRedirecionando(false)
  }

  return { verificadoEm, carregando, verificar, redirecionando, erro }
}
