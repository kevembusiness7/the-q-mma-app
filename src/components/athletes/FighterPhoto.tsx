import { useState } from 'react'

/**
 * <img> que simplesmente some se o arquivo não existir, em vez de deixar o
 * ícone de imagem quebrada no meio do card.
 *
 * O caminho vem pronto do useAthletes — para o oponente ele é derivado do
 * nome, então um adversário recém-cadastrado pode ainda não ter foto.
 */
export function FighterPhoto({
  src,
  alt,
  className,
}: {
  src: string | null
  alt: string
  className?: string
}) {
  /* Guarda QUAL src falhou, e não um booleano: ao trocar de atleta o React
     reaproveita esta instância, e um booleano continuaria marcado, escondendo
     para sempre a foto do próximo lutador. Comparando com o src atual o estado
     se limpa sozinho quando a imagem muda. */
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (!src || failedSrc === src) return null

  return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />
}
