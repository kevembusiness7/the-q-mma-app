import { useState } from 'react'
import { supabase } from '../lib/supabase'

/** Chama a RPC dar_lance (atômica, ver auction-bidding-schema.sql). */
export function usePlaceBid() {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function darLance(itemId: string, valorCentavos: number): Promise<boolean> {
    if (!supabase) {
      setErro('Bidding is not available right now.')
      return false
    }
    setErro(null)
    setEnviando(true)
    const { error } = await supabase.rpc('dar_lance', {
      p_item_id: itemId,
      p_valor_centavos: valorCentavos,
    })
    setEnviando(false)
    if (error) {
      setErro(error.message)
      return false
    }
    return true
  }

  return { darLance, enviando, erro }
}
