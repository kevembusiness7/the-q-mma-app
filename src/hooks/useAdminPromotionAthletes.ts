import { useCallback, useEffect, useState } from 'react'
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
 * Cadastro de atletas e pacotes de divulgação, visto pela equipe.
 *
 * Quem barra de fato quem não é admin é o RLS no Supabase (`admin gerencia
 * atletas`/`admin gerencia pacotes` em promotions-schema.sql) — o `ativo`
 * aqui só evita disparar a consulta antes da sessão confirmar o papel.
 */
export function useAdminPromotionAthletes(ativo: boolean) {
  const [atletas, setAtletas] = useState<PromotionAthleteWithPackages[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !ativo) return
    setCarregando(true)
    const { data, error } = await supabase
      .from('promotion_athletes')
      .select('*, promotion_packages(*)')
      .order('name')

    if (error) setErro(error.message)
    else {
      setErro(null)
      setAtletas((data ?? []).map(paraAtleta))
    }
    setCarregando(false)
  }, [ativo])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const criarAtleta = useCallback(
    async (slug: string, nome: string, instagramHandle: string): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase
        .from('promotion_athletes')
        .insert({ slug, name: nome, instagram_handle: instagramHandle })
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  /** Update parcial — só manda o que mudou, e reflete na lista sem recarregar tudo. */
  const atualizarAtleta = useCallback(
    async (slug: string, campos: Record<string, unknown>): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('promotion_athletes').update(campos).eq('slug', slug)
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const alternarPermitirPromocoes = useCallback(
    (slug: string, permitir: boolean) => atualizarAtleta(slug, { allow_promotions: permitir }),
    [atualizarAtleta],
  )

  const criarPacote = useCallback(
    async (
      athleteSlug: string,
      dados: { title: string; contentType: string; priceCents: number; contentCreationFeeCents: number },
    ): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('promotion_packages').insert({
        athlete_slug: athleteSlug,
        title: dados.title,
        content_type: dados.contentType,
        price_cents: dados.priceCents,
        content_creation_fee_cents: dados.contentCreationFeeCents,
      })
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const atualizarPacote = useCallback(
    async (id: string, campos: Record<string, unknown>): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('promotion_packages').update(campos).eq('id', id)
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const removerPacote = useCallback(
    async (id: string): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      // Some da vitrine sem apagar histórico: pedidos antigos guardam o preço
      // e o nome do pacote numa cópia própria (package_title_snapshot etc.),
      // então desativar é o suficiente e mais seguro que deletar a linha.
      const { error } = await supabase
        .from('promotion_packages')
        .update({ is_active: false })
        .eq('id', id)
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  return {
    atletas,
    carregando,
    erro,
    recarregar,
    criarAtleta,
    atualizarAtleta,
    alternarPermitirPromocoes,
    criarPacote,
    atualizarPacote,
    removerPacote,
  }
}
