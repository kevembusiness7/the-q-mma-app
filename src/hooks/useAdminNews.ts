import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { NewsType } from '../types/news'

export interface AdminNewsItem {
  id: string
  type: NewsType
  tag: string
  title: string
  body: string
  date: string
  photo: string
  sortOrder: number
}

export interface NovaNoticia {
  type: NewsType
  tag: string
  title: string
  body: string
  displayDate: string
  photoUrl: string
  sortOrder: number
}

function paraNoticia(row: any): AdminNewsItem {
  return {
    id: row.id,
    type: row.type,
    tag: row.tag,
    title: row.title,
    body: row.body,
    date: row.display_date,
    photo: row.photo_url,
    sortOrder: row.sort_order,
  }
}

function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * CRUD das notícias cadastradas à mão pelo admin.
 *
 * Não inclui os itens automáticos de última/próxima luta (ver
 * src/lib/autoNews.ts) — esses nascem do cartel de cada atleta e não têm
 * linha nesta tabela pra editar ou apagar.
 *
 * Esconder a tela é conveniência, não segurança: o RLS é quem barra de fato
 * ("admin gerencia noticias" em supabase/news-admin-schema.sql).
 */
export function useAdminNews(ativo: boolean) {
  const [noticias, setNoticias] = useState<AdminNewsItem[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !ativo) return
    setCarregando(true)
    const { data, error } = await supabase.from('news').select('*').order('sort_order')
    if (error) setErro(error.message)
    else {
      setErro(null)
      setNoticias((data ?? []).map(paraNoticia))
    }
    setCarregando(false)
  }, [ativo])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const criar = useCallback(
    async (dados: NovaNoticia): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      // Slug com sufixo aleatório: o admin não pensa em termos de slug, e
      // dois títulos parecidos não podem esbarrar na constraint de unicidade.
      const slug = `${slugify(dados.title)}-${crypto.randomUUID().slice(0, 8)}`
      const { error } = await supabase.from('news').insert({
        slug,
        type: dados.type,
        tag: dados.tag,
        title: dados.title,
        body: dados.body,
        display_date: dados.displayDate,
        photo_url: dados.photoUrl,
        sort_order: dados.sortOrder,
      })
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const atualizar = useCallback(
    async (id: string, campos: Record<string, unknown>): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('news').update(campos).eq('id', id)
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const remover = useCallback(
    async (id: string): Promise<string | null> => {
      if (!supabase) return 'Supabase não está configurado.'
      const { error } = await supabase.from('news').delete().eq('id', id)
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const enviarFoto = useCallback(
    async (arquivo: File): Promise<{ url: string | null; erro: string | null }> => {
      if (!supabase) return { url: null, erro: 'Supabase não está configurado.' }
      if (arquivo.size > 5 * 1024 * 1024) {
        return { url: null, erro: 'The photo must be 5 MB or smaller.' }
      }
      const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const nome = `${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from('news-photos')
        .upload(nome, arquivo, { contentType: arquivo.type || undefined })
      if (error) return { url: null, erro: error.message }
      const { data } = supabase.storage.from('news-photos').getPublicUrl(nome)
      return { url: data.publicUrl, erro: null }
    },
    [],
  )

  return { noticias, carregando, erro, recarregar, criar, atualizar, remover, enviarFoto }
}
