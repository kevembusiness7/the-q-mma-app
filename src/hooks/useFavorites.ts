import { useSyncExternalStore } from 'react'

/**
 * Coração dos cards da loja.
 *
 * Guarda só no aparelho (localStorage), sem tabela nem login: o resto do app
 * já tem carrinho e watchlist no Supabase, mas nenhum dos dois serve para
 * produto favorito — `auction_watchlist` é de leilão. Enquanto não existir uma
 * tela de favoritos, salvar local resolve o que o botão promete (marcar e
 * continuar marcado ao voltar) sem inventar esquema no banco.
 *
 * A lista vive fora do React para que todos os cards vejam a mesma coisa: sem
 * isso, dois cards do mesmo produto (ele aparece em "App exclusives" e em "All
 * products") ficariam com corações diferentes.
 */

const CHAVE = 'theq:favoritos'

const ouvintes = new Set<() => void>()

function ler(): string[] {
  /* localStorage lança em aba privada e em WebView com cookies bloqueados --
     um favorito não vale derrubar a loja. */
  try {
    const bruto = localStorage.getItem(CHAVE)
    const lista = bruto ? JSON.parse(bruto) : []
    return Array.isArray(lista) ? lista.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

let favoritos = ler()

function inscrever(aoMudar: () => void) {
  ouvintes.add(aoMudar)
  return () => {
    ouvintes.delete(aoMudar)
  }
}

/* A referência só muda quando a lista muda de verdade -- é o que o
   useSyncExternalStore exige para não re-renderizar em loop. */
function instantaneo() {
  return favoritos
}

export function alternarFavorito(id: string) {
  favoritos = favoritos.includes(id) ? favoritos.filter((x) => x !== id) : [...favoritos, id]
  try {
    localStorage.setItem(CHAVE, JSON.stringify(favoritos))
  } catch {
    /* Sem espaço ou sem permissão: a marcação vale só nesta sessão. */
  }
  ouvintes.forEach((aoMudar) => aoMudar())
}

export function useFavoritos() {
  const lista = useSyncExternalStore(inscrever, instantaneo, instantaneo)
  return {
    lista,
    ehFavorito: (id: string) => lista.includes(id),
    alternar: alternarFavorito,
  }
}
