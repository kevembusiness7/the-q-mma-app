import { useState } from 'react'
import { supabase } from '../lib/supabase'

/** Acima disso o envio fica lento à toa — vale pra logo (imagem) e pro
 *  conteúdo principal (foto ou vídeo curto), que tem mais margem. */
export const TAMANHO_MAXIMO_LOGO = 5 * 1024 * 1024
export const TAMANHO_MAXIMO_MIDIA = 50 * 1024 * 1024

export interface NovaReserva {
  athleteSlug: string
  packageId: string
  requestedDate: string
  needsContentCreation: boolean
  logo: File | null
  media: File
  caption: string
  websiteLink: string
  businessInstagram: string
  cta: string
  notes: string
}

async function subirArquivo(arquivo: File, limite: number): Promise<{ caminho: string | null; erro: string | null }> {
  if (arquivo.size > limite) {
    return { caminho: null, erro: `File must be ${Math.round(limite / (1024 * 1024))} MB or smaller.` }
  }
  const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? 'bin'
  // Nome aleatório: o nome original pode ter espaço, acento e caractere que
  // o storage rejeita, além de não revelar nada de quem enviou.
  const nome = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase!.storage
    .from('promotion-uploads')
    .upload(nome, arquivo, { contentType: arquivo.type || undefined })
  if (error) return { caminho: null, erro: error.message }
  return { caminho: nome, erro: null }
}

/**
 * Sobe os anexos da campanha e chama a Edge Function que cria a reserva e a
 * sessão de pagamento — depois redireciona pro Stripe, igual ao useCheckout
 * da loja. Preço e disponibilidade são conferidos de novo no servidor; nada
 * que sai daqui é confiado como está.
 */
export function usePromotionCheckout() {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function reservar(dados: NovaReserva) {
    if (!supabase) {
      setErro('Payments are not available right now.')
      return
    }
    setErro(null)
    setEnviando(true)

    const media = await subirArquivo(dados.media, TAMANHO_MAXIMO_MIDIA)
    if (media.erro) {
      setErro(media.erro)
      setEnviando(false)
      return
    }

    let logoPath: string | null = null
    if (dados.logo) {
      const logo = await subirArquivo(dados.logo, TAMANHO_MAXIMO_LOGO)
      if (logo.erro) {
        setErro(logo.erro)
        setEnviando(false)
        return
      }
      logoPath = logo.caminho
    }

    const { data, error } = await supabase.functions.invoke('criar-checkout-promocao', {
      body: {
        athleteSlug: dados.athleteSlug,
        packageId: dados.packageId,
        requestedDate: dados.requestedDate,
        needsContentCreation: dados.needsContentCreation,
        campaign: {
          logoPath,
          mediaPath: media.caminho,
          caption: dados.caption.trim() || null,
          websiteLink: dados.websiteLink.trim() || null,
          businessInstagram: dados.businessInstagram.trim().replace(/^@/, ''),
          cta: dados.cta.trim() || null,
          notes: dados.notes.trim() || null,
        },
      },
    })

    if (error) {
      let mensagem = 'Could not start the payment. Try again.'
      try {
        const corpo = await (error as any).context?.json?.()
        if (corpo?.erro) mensagem = corpo.erro
      } catch {
        /* mantém a mensagem genérica */
      }
      setErro(mensagem)
      setEnviando(false)
      return
    }

    if (data?.url) {
      window.location.href = data.url
      return
    }

    setErro('Could not start the payment. Try again.')
    setEnviando(false)
  }

  return { reservar, enviando, erro }
}
