import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { paraChamado, type Chamado, type StatusChamado } from './useSupport'

export interface MensagemChamado {
  id: string
  ticketId: string
  authorId: string | null
  isStaff: boolean
  body: string
  createdAt: string
}

function paraMensagem(row: any): MensagemChamado {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    isStaff: row.is_staff,
    body: row.body,
    createdAt: row.created_at,
  }
}

/**
 * Todos os chamados. O que garante que só admin enxerga isto é o RLS no
 * Supabase, não a checagem no app: esconder o botão evita confusão, mas quem
 * controla o navegador contorna qualquer verificação feita aqui.
 */
export function useChamadosAdmin(ativo: boolean) {
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !ativo) return
    setCarregando(true)
    const { data, error } = await supabase
      .from('support_tickets')
      // O join traz o número do pedido citado, quando existe: sem ele a
      // equipe teria só um uuid e nada para procurar na fila de pedidos.
      .select('*, orders(order_number)')
      .order('created_at', { ascending: false })

    if (error) setErro(error.message)
    else {
      setErro(null)
      setChamados((data ?? []).map(paraChamado))
    }
    setCarregando(false)
  }, [ativo])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const mudarStatus = useCallback(
    async (id: string, status: StatusChamado) => {
      if (!supabase) return
      // Otimista: a lista responde na hora e o banco confirma em seguida.
      setChamados((atual) => atual.map((c) => (c.id === id ? { ...c, status } : c)))
      const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id)
      if (error) {
        setErro(error.message)
        recarregar()
      }
    },
    [recarregar],
  )

  return { chamados, carregando, erro, recarregar, mudarStatus }
}

/** Conversa de um chamado. */
export function useConversa(ticketId: string | null) {
  const [mensagens, setMensagens] = useState<MensagemChamado[]>([])
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    if (!supabase || !ticketId) {
      setMensagens([])
      return
    }
    setCarregando(true)
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
    setMensagens((data ?? []).map(paraMensagem))
    setCarregando(false)
  }, [ticketId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const responder = useCallback(
    async (texto: string, autorId: string, comoEquipe: boolean): Promise<string | null> => {
      if (!supabase || !ticketId) return 'Supabase não está configurado.'
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        author_id: autorId,
        is_staff: comoEquipe,
        body: texto,
      })
      if (error) return error.message
      await recarregar()
      return null
    },
    [ticketId, recarregar],
  )

  return { mensagens, carregando, responder, recarregar }
}

/**
 * URL temporária do anexo. O bucket é privado, então não existe link fixo —
 * cada visualização gera uma URL assinada de validade curta.
 */
export async function urlDoAnexo(caminho: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.storage
    .from('support-attachments')
    .createSignedUrl(caminho, 60 * 10)
  return data?.signedUrl ?? null
}
