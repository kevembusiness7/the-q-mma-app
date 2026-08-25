import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/** Estrela/toggle de "acompanhar" um item, na página de detalhe. */
export function useWatchlist(itemId: string | null) {
  const { usuario } = useAuth()
  const [assistindo, setAssistindo] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      if (!supabase || !usuario || !itemId) {
        if (ativo) setCarregando(false)
        return
      }
      const { data } = await supabase
        .from('auction_watchlist')
        .select('item_id')
        .eq('user_id', usuario.id)
        .eq('item_id', itemId)
        .maybeSingle()
      if (!ativo) return
      setAssistindo(!!data)
      setCarregando(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [usuario, itemId])

  async function alternar() {
    if (!supabase || !usuario || !itemId) return
    if (assistindo) {
      await supabase.from('auction_watchlist').delete().eq('user_id', usuario.id).eq('item_id', itemId)
      setAssistindo(false)
    } else {
      await supabase.from('auction_watchlist').insert({ user_id: usuario.id, item_id: itemId })
      setAssistindo(true)
    }
  }

  return { assistindo, carregando, alternar }
}
