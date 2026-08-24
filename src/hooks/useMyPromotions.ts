import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PromotionRequest } from '../types/promotions'

export function paraPromocao(row: any): PromotionRequest {
  return {
    id: row.id,
    requestNumber: row.request_number,
    athleteSlug: row.athlete_slug,
    athleteName: row.athlete_name_snapshot,
    packageTitle: row.package_title_snapshot,
    packageContentType: row.package_content_type,
    packagePriceCents: row.package_price_cents,
    needsContentCreation: row.needs_content_creation,
    contentCreationFeeCents: row.content_creation_fee_cents,
    requestedDate: row.requested_date,
    scheduledDate: row.scheduled_date,
    reviewStatus: row.review_status,
    rejectionReason: row.rejection_reason,
    paymentStatus: row.payment_status,
    totalCents: row.total_cents,
    campaignLogoPath: row.campaign_logo_path,
    campaignMediaPath: row.campaign_media_path,
    campaignCaption: row.campaign_caption,
    campaignWebsiteLink: row.campaign_website_link,
    campaignBusinessInstagram: row.campaign_business_instagram,
    campaignCta: row.campaign_cta,
    campaignNotes: row.campaign_notes,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    postedAt: row.posted_at,
  }
}

/**
 * Reservas de promoção do usuário logado. Mesmo desenho de useMeusPedidos:
 * RLS garante que só as dele voltam, e checkout abandonado no Stripe
 * (awaiting_payment) some da lista — não interessa ao cliente, só confunde.
 */
export function useMinhasPromocoes(usuarioId: string | null) {
  const [promocoes, setPromocoes] = useState<PromotionRequest[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !usuarioId) {
      setPromocoes([])
      return
    }
    setCarregando(true)
    const { data, error } = await supabase
      .from('promotion_requests')
      .select('*')
      .neq('payment_status', 'awaiting_payment')
      .order('created_at', { ascending: false })

    if (error) setErro(error.message)
    else {
      setErro(null)
      setPromocoes((data ?? []).map(paraPromocao))
    }
    setCarregando(false)
  }, [usuarioId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { promocoes, carregando, erro, recarregar }
}
