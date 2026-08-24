import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CartLine } from '../context/CartContext'

/**
 * Inicia o pagamento: manda o carrinho para a Edge Function criar-checkout e
 * redireciona para a página do Stripe.
 *
 * Só ids e quantidades saem daqui. Preço, nome e estoque são resolvidos no
 * servidor — o total que aparece no Stripe é o que o banco diz, não o que o
 * app calculou.
 */
export function useCheckout() {
  const [redirecionando, setRedirecionando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function pagar(lines: CartLine[]) {
    if (!supabase) {
      setErro('Payments are not available right now.')
      return
    }
    setErro(null)
    setRedirecionando(true)

    const { data, error } = await supabase.functions.invoke('criar-checkout', {
      body: {
        itens: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      },
    })

    if (error) {
      // O corpo com a mensagem real (ex.: estoque mudou) vem dentro do
      // context da FunctionsHttpError; sem ele sobra só "non-2xx".
      let mensagem = 'Could not start the payment. Try again.'
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
      // O carrinho NÃO é limpo aqui: se a pessoa desistir no Stripe e voltar,
      // os itens continuam. Quem limpa é o retorno de sucesso.
      window.location.href = data.url
      return
    }

    setErro('Could not start the payment. Try again.')
    setRedirecionando(false)
  }

  return { pagar, redirecionando, erro }
}
