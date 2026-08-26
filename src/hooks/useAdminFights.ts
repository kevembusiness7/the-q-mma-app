import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FightResult } from '../types/athlete'

/** Linha de athletes com só o que a tela de cartel precisa. */
export interface AtletaCartel {
  id: string
  slug: string
  name: string
  division: string
  record: string
  wins: number
  losses: number
  draws: number
}

export interface LutaAdmin {
  id: string
  athleteId: string
  opponentName: string
  opponentRecord: string | null
  result: FightResult
  method: string
  round: string | null
  time: string | null
  eventName: string
  eventDate: string
  venue: string | null
  city: string | null
  broadcaster: string | null
  isNextFight: boolean
}

export interface DadosLuta {
  opponentName: string
  opponentRecord: string
  result: FightResult
  method: string
  round: string
  time: string
  eventName: string
  eventDate: string
  venue: string
  city: string
  broadcaster: string
  isNextFight: boolean
}

function paraLuta(row: any): LutaAdmin {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    opponentName: row.opponent_name,
    opponentRecord: row.opponent_record,
    result: row.result,
    method: row.method,
    round: row.round,
    time: row.time,
    eventName: row.event_name,
    eventDate: row.event_date,
    venue: row.venue,
    city: row.city,
    broadcaster: row.broadcaster,
    isNextFight: row.is_next_fight,
  }
}

function paraBanco(dados: DadosLuta) {
  return {
    opponent_name: dados.opponentName.trim(),
    opponent_record: dados.opponentRecord.trim() || null,
    result: dados.result,
    method: dados.method.trim(),
    round: dados.round.trim() || null,
    time: dados.time.trim() || null,
    event_name: dados.eventName.trim(),
    event_date: dados.eventDate,
    venue: dados.venue.trim() || null,
    city: dados.city.trim() || null,
    broadcaster: dados.broadcaster.trim() || null,
    is_next_fight: dados.isNextFight,
  }
}

/**
 * Cartel de lutas visto pela equipe. Esconder a tela é conveniência; quem
 * barra de fato é o RLS ("admin gerencia lutas" em fights-admin-schema.sql).
 *
 * As lutas alimentam três lugares de uma vez: a aba Fights do perfil do
 * atleta, os cards automáticos do feed (src/lib/autoNews.ts) e o record
 * mostrado no topo do perfil -- por isso `atualizarCartel` vive aqui junto.
 */
export function useLutasAdmin(ativo: boolean) {
  const [atletas, setAtletas] = useState<AtletaCartel[]>([])
  const [lutas, setLutas] = useState<LutaAdmin[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase || !ativo) return
    setCarregando(true)

    const { data: athleteRows, error: athleteError } = await supabase
      .from('athletes')
      .select('id, slug, name, division, record, wins, losses, draws')
      .order('name')

    if (athleteError) {
      setErro(athleteError.message)
      setCarregando(false)
      return
    }

    const { data: fightRows, error: fightError } = await supabase
      .from('fights')
      .select('*')
      .order('event_date', { ascending: false })

    if (fightError) {
      setErro(fightError.message)
      setCarregando(false)
      return
    }

    setErro(null)
    setAtletas(
      (athleteRows ?? []).map((r: any) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        division: r.division,
        record: r.record,
        wins: r.wins,
        losses: r.losses,
        draws: r.draws,
      })),
    )
    setLutas((fightRows ?? []).map(paraLuta))
    setCarregando(false)
  }, [ativo])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const criar = useCallback(
    async (athleteId: string, dados: DadosLuta): Promise<string | null> => {
      if (!supabase) return 'Supabase is not configured.'
      const { error } = await supabase
        .from('fights')
        .insert({ athlete_id: athleteId, ...paraBanco(dados) })
      if (error) return traduzErro(error.message)
      await recarregar()
      return null
    },
    [recarregar],
  )

  const atualizar = useCallback(
    async (id: string, dados: DadosLuta): Promise<string | null> => {
      if (!supabase) return 'Supabase is not configured.'
      const { error } = await supabase.from('fights').update(paraBanco(dados)).eq('id', id)
      if (error) return traduzErro(error.message)
      await recarregar()
      return null
    },
    [recarregar],
  )

  const remover = useCallback(
    async (id: string): Promise<string | null> => {
      if (!supabase) return 'Supabase is not configured.'
      const { error } = await supabase.from('fights').delete().eq('id', id)
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  const atualizarCartel = useCallback(
    async (
      athleteId: string,
      cartel: { wins: number; losses: number; draws: number },
    ): Promise<string | null> => {
      if (!supabase) return 'Supabase is not configured.'
      const record = `${cartel.wins}-${cartel.losses}-${cartel.draws}`
      const { error } = await supabase
        .from('athletes')
        .update({ wins: cartel.wins, losses: cartel.losses, draws: cartel.draws, record })
        .eq('id', athleteId)
      if (error) return error.message
      await recarregar()
      return null
    },
    [recarregar],
  )

  return { atletas, lutas, carregando, erro, recarregar, criar, atualizar, remover, atualizarCartel }
}

/** O índice parcial fala "postgrês"; o admin merece a frase inteira. */
function traduzErro(mensagem: string): string {
  if (mensagem.includes('fights_one_next_per_athlete_idx')) {
    return 'This athlete already has an upcoming fight. Record its result (or delete it) before scheduling a new one.'
  }
  return mensagem
}
