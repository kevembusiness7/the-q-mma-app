import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/** Exclui a própria conta e encerra a sessão local logo em seguida. */
export function useDeleteAccount() {
  const { sair } = useAuth()
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function excluirConta(): Promise<boolean> {
    if (!supabase) {
      setErro('Payments are not available right now.')
      return false
    }
    setErro(null)
    setExcluindo(true)

    const { error } = await supabase.functions.invoke('excluir-conta')

    if (error) {
      let mensagem = 'Could not delete your account. Try again or contact support.'
      try {
        const corpo = await (error as any).context?.json?.()
        if (corpo?.erro) mensagem = corpo.erro
      } catch {
        /* mantém a mensagem genérica */
      }
      setErro(mensagem)
      setExcluindo(false)
      return false
    }

    await sair()
    setExcluindo(false)
    return true
  }

  return { excluirConta, excluindo, erro }
}
