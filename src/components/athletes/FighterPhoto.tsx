import { useState } from 'react'

/**
 * <img> que tenta os caminhos em ordem e some se nenhum existir, em vez de
 * deixar o ícone de imagem quebrada no meio do card.
 *
 * Serve a dois casos: o oponente, cujo caminho é derivado do nome e pode não
 * ter arquivo ainda, e o hero da aba Athletes, que tenta a foto de destaque e
 * cai na foto comum enquanto ela não for adicionada.
 */
export function FighterPhoto({
  src,
  fallbackSrc,
  alt,
  className,
}: {
  src: string | null
  /** Tentado se o `src` não carregar. */
  fallbackSrc?: string | null
  alt: string
  className?: string
}) {
  /* Guarda QUAIS caminhos falharam, e não um booleano: ao trocar de atleta o
     React reaproveita esta instância, e um booleano continuaria marcado,
     escondendo para sempre a foto do próximo lutador. Uma lista também deixa
     a queda para o fallback terminar, em vez de alternar entre os dois. */
  const [failed, setFailed] = useState<string[]>([])

  const candidatos = [src, fallbackSrc].filter(
    (c, i, todos): c is string => Boolean(c) && todos.indexOf(c) === i,
  )
  const atual = candidatos.find((c) => !failed.includes(c))
  if (!atual) return null

  return (
    <img
      src={atual}
      alt={alt}
      className={className}
      onError={() => setFailed((f) => (f.includes(atual) ? f : [...f, atual]))}
    />
  )
}
