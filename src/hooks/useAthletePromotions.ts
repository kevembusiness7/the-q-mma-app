import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PromotionAthleteWithPackages, PromotionPackage } from '../types/promotions'

function paraAtleta(row: any): PromotionAthleteWithPackages {
  return {
    slug: row.slug,
    name: row.name,
    photoUrl: row.photo_url,
    bio: row.bio,
    instagramHandle: row.instagram_handle,
    followers: row.followers,
    engagementRate: row.engagement_rate,
    avgStoryViews: row.avg_story_views,
    avgReelViews: row.avg_reel_views,
    allowPromotions: row.allow_promotions,
    maxPromotionsPerWeek: row.max_promotions_per_week,
    statsUpdatedAt: row.stats_updated_at,
    packages: (row.promotion_packages ?? [])
      .filter((p: any) => p.is_active)
      .map(paraPacote)
      .sort((a: PromotionPackage, b: PromotionPackage) => a.sortOrder - b.sortOrder),
  }
}

function paraPacote(row: any): PromotionPackage {
  return {
    id: row.id,
    athleteSlug: row.athlete_slug,
    title: row.title,
    contentType: row.content_type,
    priceCents: row.price_cents,
    contentCreationFeeCents: row.content_creation_fee_cents,
    description: row.description,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }
}

/**
 * Vitrine pública de Athlete Promotions — os atletas que aceitam divulgação,
 * com os pacotes ativos de cada um. RLS já filtra `allow_promotions = true`
 * pra quem não é admin (ver promotions-schema.sql), então aqui não precisa
 * repetir o filtro; só o preço/estoque não vem daqui — quem confere de
 * verdade é a Edge Function no momento da reserva.
 */
export function usePromotionAthletes() {
  const [atletas, setAtletas] = useState<PromotionAthleteWithPackages[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      if (!supabase) {
        setCarregando(false)
        return
      }
      const { data, error } = await supabase
        .from('promotion_athletes')
        .select('*, promotion_packages(*)')
        .eq('allow_promotions', true)
        .order('name')
      if (!ativo) return
      if (error) setErro(error.message)
      else setAtletas((data ?? []).map(paraAtleta).filter((a) => a.packages.length > 0))
      setCarregando(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [])

  return { atletas, carregando, erro }
}

/** Um atleta só, pela ficha de divulgação. */
export function usePromotionAthlete(slug: string) {
  const [atleta, setAtleta] = useState<PromotionAthleteWithPackages | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      if (!supabase) {
        setCarregando(false)
        return
      }
      const { data, error } = await supabase
        .from('promotion_athletes')
        .select('*, promotion_packages(*)')
        .eq('slug', slug)
        .maybeSingle()
      if (!ativo) return
      if (error) setErro(error.message)
      else setAtleta(data ? paraAtleta(data) : null)
      setCarregando(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [slug])

  return { atleta, carregando, erro }
}
