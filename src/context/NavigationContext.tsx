import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Telas do app. The Q é a raiz e não entra na pilha — é o que aparece
 * quando não há nada empilhado por cima.
 *
 * `product` guarda qual produto está aberto, `fighter` qual atleta.
 */
export type Screen =
  | { name: 'athletes' }
  | { name: 'shop' }
  | { name: 'cart' }
  | { name: 'you' }
  | { name: 'auth' }
  // `support` carrega o pedido quando veio do botão "Get help with this
  // order" — é o que faz o formulário abrir já sabendo do que se trata.
  | { name: 'support'; pedido?: { id: string; numero: string } }
  | { name: 'admin-support' }
  | { name: 'admin-orders' }
  | { name: 'admin-promotion-athletes' }
  | { name: 'promotions' }
  | { name: 'promotion-athlete'; slug: string }
  | { name: 'promotion-booking'; athleteSlug: string; packageId: string }
  | { name: 'my-promotions' }
  | { name: 'admin-promotions' }
  | { name: 'admin-news' }
  | { name: 'admin-auctions' }
  | { name: 'vault' }
  | { name: 'auction-item'; slug: string }
  | { name: 'my-bids' }
  | { name: 'orders' }
  | { name: 'coaches' }
  | { name: 'sponsors' }
  | { name: 'product'; productId: string }
  | { name: 'fighter'; slug: string };

interface NavValue {
  /** Pilha de telas abertas por cima da The Q. Vazia = está na home. */
  stack: Screen[];
  /** Topo da pilha, ou `null` quando o usuário está na The Q. */
  overlay: Screen | null;
  /** Empilha uma tela. O voltar dela devolve para a tela de baixo. */
  openOverlay: (screen: Screen) => void;
  /** Desempilha uma tela — o botão de voltar. */
  closeOverlay: () => void;
  /** Esvazia a pilha e volta para a The Q. */
  goHome: () => void;
}

const NavContext = createContext<NavValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([]);

  const value = useMemo<NavValue>(
    () => ({
      stack,
      overlay: stack.length > 0 ? stack[stack.length - 1] : null,
      openOverlay(screen) {
        setStack((current) => [...current, screen]);
      },
      closeOverlay() {
        setStack((current) => current.slice(0, -1));
      },
      goHome() {
        setStack([]);
      },
    }),
    [stack],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavValue {
  const value = useContext(NavContext);
  if (!value) throw new Error('useNav precisa estar dentro de <NavigationProvider>');
  return value;
}
