import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** As 5 abas da barra inferior. */
export type Tab = 'theq' | 'athletes' | 'shop' | 'cart' | 'you';

/**
 * Telas que não são abas — abrem por cima e voltam com o botão de voltar.
 * `product` guarda qual produto está aberto, `fighter` qual atleta.
 */
export type Overlay =
  | { name: 'coaches' }
  | { name: 'sponsors' }
  | { name: 'product'; productId: string }
  | { name: 'fighter'; slug: string }
  | null;

interface NavValue {
  tab: Tab;
  overlay: Overlay;
  /** Troca de aba e fecha qualquer tela interna aberta. */
  goToTab: (tab: Tab) => void;
  openOverlay: (overlay: NonNullable<Overlay>) => void;
  closeOverlay: () => void;
}

const NavContext = createContext<NavValue | null>(null);

export function NavigationProvider({
  children,
  initialTab = 'theq',
}: {
  children: ReactNode;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [overlay, setOverlay] = useState<Overlay>(null);

  const value = useMemo<NavValue>(
    () => ({
      tab,
      overlay,
      goToTab(next) {
        setOverlay(null);
        setTab(next);
      },
      openOverlay: setOverlay,
      closeOverlay: () => setOverlay(null),
    }),
    [tab, overlay],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavValue {
  const value = useContext(NavContext);
  if (!value) throw new Error('useNav precisa estar dentro de <NavigationProvider>');
  return value;
}
