import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type CategoriaChamado =
  | 'question'
  | 'order'
  | 'payment'
  | 'technical'
  | 'account'
  | 'suggestion'
  | 'other'

export type StatusChamado = 'new' | 'in_progress' | 'resolved'

export interface Chamado {
  id: string
  userId: string | null
  name: string
  email: string
  category: CategoriaChamado
  message: string
  screenshotPath: string | null
  status: StatusChamado
  /** Pedido a que o chamado se refere, quando veio do botão "Get help with
   *  this order". Nulo no chamado avulso. */
  orderId: string | null
  /** Número legível do pedido, trazido no join. Só aparece para quem pode ler
   *  o pedido — o RLS resolve isso sozinho. */
  orderNumber: string | null
  createdAt: string
  updatedAt: string
}

export const CATEGORIAS: { valor: CategoriaChamado; rotulo: string }[] = [
  { valor: 'question', rotulo: 'Question' },
  { valor: 'order', rotulo: 'Order issue' },
  { valor: 'payment', rotulo: 'Payment' },
  { valor: 'technical', rotulo: 'Technical issue' },
  { valor: 'account', rotulo: 'Account' },
  { valor: 'suggestion', rotulo: 'Suggestion' },
  { valor: 'other', rotulo: 'Other' },
]

export const ROTULO_STATUS: Record<StatusChamado, string> = {
  new: 'New',
  in_progress: 'In progress',
  resolved: 'Resolved',
}

interface NovoChamado {
  nome: string
  email: string
  categoria: CategoriaChamado
  mensagem: string
  anexo: File | null
  usuarioId: string | null
  /** Pedido citado, ou null. O banco confere que ele é mesmo de quem envia. */
  pedidoId: string | null
}

/** Converte a linha do banco (snake_case) para o formato da UI. Exportada
 *  porque o painel da equipe lê a mesma tabela e precisa do mesmo formato. */
export function paraChamado(row: any): Chamado {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    category: row.category,
    message: row.message,
    screenshotPath: row.screenshot_path,
    status: row.status,
    orderId: row.order_id ?? null,
    orderNumber: row.orders?.order_number ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Limite do anexo. Acima disso o envio fica lento e o bucket incha à toa. */
export const TAMANHO_MAXIMO_ANEXO = 5 * 1024 * 1024

export function useEnviarChamado() {
  const [enviando, setEnviando] = useState(false)

  const enviar = useCallback(
    async (dados: NovoChamado): Promise<{ erro: string | null; protocolo: string | null }> => {
      if (!supabase) return { erro: 'Supabase não está configurado.', protocolo: null }
      setEnviando(true)

      try {
        let caminhoAnexo: string | null = null

        if (dados.anexo) {
          if (dados.anexo.size > TAMANHO_MAXIMO_ANEXO) {
            return { erro: 'The screenshot must be 5 MB or smaller.', protocolo: null }
          }
          const ext = dados.anexo.name.split('.').pop()?.toLowerCase() ?? 'png'
          // Nome aleatório: o nome original pode conter dados pessoais e
          // caracteres que o storage rejeita.
          const nome = `${crypto.randomUUID()}.${ext}`
          const { error: erroUpload } = await supabase.storage
            .from('support-attachments')
            .upload(nome, dados.anexo, { contentType: dados.anexo.type || undefined })

          if (erroUpload) {
            return { erro: `Could not upload the screenshot: ${erroUpload.message}`, protocolo: null }
          }
          caminhoAnexo = nome
        }

        /* O id é gerado aqui, e não lido de volta do banco.
           Pedir a linha inserida de volta (`.select()`) faz o PostgREST usar
           INSERT ... RETURNING, e isso exige permissão de LEITURA além da de
           escrita. O visitante anônimo não tem leitura — nem deve ter, senão
           enxergaria os chamados dos outros. O resultado era o insert falhar
           com "violates row-level security policy" mesmo com a política de
           escrita correta. Gerando o uuid no cliente, o protocolo sai sem
           precisar ler nada. */
        const id = crypto.randomUUID()

        const { error } = await supabase.from('support_tickets').insert({
          id,
          user_id: dados.usuarioId,
          name: dados.nome,
          email: dados.email,
          category: dados.categoria,
          message: dados.mensagem,
          screenshot_path: caminhoAnexo,
          order_id: dados.pedidoId,
        })

        if (error) return { erro: error.message, protocolo: null }

        // Os 8 primeiros caracteres do uuid bastam como protocolo para o
        // usuário citar, sem expor o id inteiro.
        return { erro: null, protocolo: id.slice(0, 8).toUpperCase() }
      } finally {
        setEnviando(false)
      }
    },
    [],
  )

  return { enviar, enviando }
}

/** Chamados do usuário logado. Sem sessão devolve lista vazia. */
export function useMeusChamados(usuarioId: string | null) {
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !usuarioId) {
      setChamados([])
      return
    }
    setCarregando(true)
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, orders(order_number)')
      .eq('user_id', usuarioId)
      .order('created_at', { ascending: false })

    if (error) setErro(error.message)
    else {
      setErro(null)
      setChamados((data ?? []).map(paraChamado))
    }
    setCarregando(false)
  }, [usuarioId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { chamados, carregando, erro, recarregar }
}
