import { useEffect, useState } from 'react'

/** "02h 16m", "3d 4h", "45m 12s", "Ended". */
export function formatCountdown(msRestantes: number): string {
  if (msRestantes <= 0) return 'Ended'
  const pad = (n: number) => String(n).padStart(2, '0')
  const dias = Math.floor(msRestantes / 86_400_000)
  const horas = Math.floor((msRestantes % 86_400_000) / 3_600_000)
  const minutos = Math.floor((msRestantes % 3_600_000) / 60_000)
  const segundos = Math.floor((msRestantes % 60_000) / 1_000)

  if (dias > 0) return `${dias}d ${horas}h`
  if (horas > 0) return `${pad(horas)}h ${pad(minutos)}m`
  if (minutos > 0) return `${pad(minutos)}m ${pad(segundos)}s`
  return `${pad(segundos)}s`
}

interface CountdownProps {
  endsAt: string
  /** Chamado uma vez quando o relógio zera — pra quem estiver olhando saber que precisa recarregar o status. */
  onEnd?: () => void
  className?: string
}

/** Contagem regressiva viva, sem depender de Realtime -- só recalcula a
 *  diferença pro relógio local a cada segundo. */
export function Countdown({ endsAt, onEnd, className }: CountdownProps) {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const restante = new Date(endsAt).getTime() - agora

  useEffect(() => {
    if (restante <= 0) onEnd?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante <= 0])

  return <span className={className}>{formatCountdown(restante)}</span>
}
