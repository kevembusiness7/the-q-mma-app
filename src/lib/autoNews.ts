import type { AthleteWithFights, FightRecord } from '../types/athlete'
import type { NewsItem } from '../types/news'

/**
 * Deriva itens de News & Events direto do cartel de cada atleta — não grava
 * nada no banco, só "empresta" a última/próxima luta de cada um pro feed.
 * Fica sempre em dia sozinho: mudou o cartel de alguém (ver src/data/athletes.ts
 * ou a tabela `fights`), o item muda junto, sem o admin precisar lembrar de
 * atualizar a notícia à mão.
 *
 * Some ao lado das notícias cadastradas à mão pelo admin (useAdminNews) —
 * essas continuam existindo pra tudo que nenhum cartel cobre, tipo agenda da
 * academia.
 */
export function buildAutoNews(athletes: AthleteWithFights[]): NewsItem[] {
  const itens: { eventDateIso: string; item: NewsItem }[] = []

  for (const athlete of athletes) {
    if (athlete.lastFight) itens.push(resultadoParaNoticia(athlete, athlete.lastFight))
    if (athlete.nextFight) itens.push(proximaParaNoticia(athlete, athlete.nextFight))
  }

  return itens.sort((a, b) => (a.eventDateIso < b.eventDateIso ? 1 : -1)).map((i) => i.item)
}

function resultadoParaNoticia(
  athlete: AthleteWithFights,
  fight: FightRecord,
): { eventDateIso: string; item: NewsItem } {
  const titulo =
    fight.result === 'win'
      ? `${athlete.name} def. ${fight.opponentName}`
      : fight.result === 'loss'
        ? `${fight.opponentName} def. ${athlete.name}`
        : fight.result === 'draw'
          ? `${athlete.name} draws with ${fight.opponentName}`
          : `${athlete.name} vs. ${fight.opponentName} ruled a no contest`

  const ondeQuando = [fight.round, fight.time].filter(Boolean).join(' ')
  const metodo = fight.method || 'decision'
  const parenteses = ondeQuando ? ` (${ondeQuando})` : ''
  const corpo =
    fight.result === 'win'
      ? `${athlete.firstName} got the win by ${metodo}${parenteses} at ${fight.eventName}.`
      : fight.result === 'loss'
        ? `${athlete.firstName} dropped this one by ${metodo}${parenteses} at ${fight.eventName}.`
        : fight.result === 'draw'
          ? `Ruled a draw (${metodo}) at ${fight.eventName}.`
          : `Ruled a no contest at ${fight.eventName}.`

  return {
    eventDateIso: fight.eventDate,
    item: {
      id: `auto-last-${athlete.slug}`,
      type: 'result',
      tag: 'Fight Result',
      title: titulo,
      body: corpo,
      date: formatarDataEvento(fight.eventDate),
      photo: athlete.imageUrl ?? athlete.heroImageUrl ?? '',
    },
  }
}

function proximaParaNoticia(
  athlete: AthleteWithFights,
  fight: FightRecord,
): { eventDateIso: string; item: NewsItem } {
  const local = fight.venue && fight.city ? ` at ${fight.venue}, ${fight.city}` : fight.city ? ` in ${fight.city}` : ''

  return {
    eventDateIso: fight.eventDate,
    item: {
      id: `auto-next-${athlete.slug}`,
      type: 'next',
      tag: 'Next Fight',
      title: `${athlete.name} faces ${fight.opponentName}`,
      body: `${athlete.name} is set for ${fight.eventName}${local}.`,
      date: formatarDataEvento(fight.eventDate),
      photo: athlete.imageUrl ?? athlete.heroImageUrl ?? '',
    },
  }
}

/**
 * "2026-06-20" -> "Jun 20, 2026". Monta a data com ano/mês/dia soltos (não
 * `new Date(iso)`) porque parsear "YYYY-MM-DD" direto lê como UTC meia-noite
 * e pode exibir o dia anterior em fusos negativos.
 */
function formatarDataEvento(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
