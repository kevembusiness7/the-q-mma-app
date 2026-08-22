import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '../types/shop';

export interface CartLine {
  /** Combina produto + cor + tamanho: dois tamanhos do mesmo item são linhas separadas. */
  key: string;
  productId: string;
  name: string;
  price: number;
  color: string;
  size: string;
  quantity: number;
  /** Imagem já resolvida, para o carrinho não precisar recalcular o mockup. */
  image?: string;
}

interface CartValue {
  lines: CartLine[];
  /** Soma das quantidades — é o número no badge da sacola. */
  count: number;
  subtotal: number;
  add: (product: Product, color: string, size: string, quantity: number, image?: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartValue>(() => {
    return {
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),

      add(product, color, size, quantity, image) {
        const key = `${product.id}|${color}|${size}`;
        setLines((current) => {
          const existing = current.find((l) => l.key === key);
          if (existing) {
            return current.map((l) =>
              l.key === key ? { ...l, quantity: l.quantity + quantity } : l,
            );
          }
          return [
            ...current,
            {
              key,
              productId: product.id,
              name: product.name,
              price: product.price,
              color,
              size,
              quantity,
              image,
            },
          ];
        });
      },

      setQuantity(key, quantity) {
        setLines((current) =>
          quantity <= 0
            ? current.filter((l) => l.key !== key)
            : current.map((l) => (l.key === key ? { ...l, quantity } : l)),
        );
      },

      remove(key) {
        setLines((current) => current.filter((l) => l.key !== key));
      },

      clear() {
        setLines([]);
      },
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart precisa estar dentro de <CartProvider>');
  return value;
}
