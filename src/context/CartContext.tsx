import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Product, ProductVariant } from '../types/shop';

export interface CartLine {
  /** A variação é a chave: cada cor+tamanho é uma linha própria. */
  variantId: string;
  sku: string;
  productId: string;
  name: string;
  /**
   * Preço em centavos, copiado no momento em que o item entrou no carrinho.
   *
   * Serve para a tela; o servidor vai recalcular o total consultando o preço
   * real da variação antes de cobrar. Nunca confiar no valor vindo do
   * dispositivo — é o caminho clássico de fraude no checkout.
   */
  priceCents: number;
  color: string;
  size: string;
  quantity: number;
  /** Quanto havia em estoque quando o item foi adicionado. */
  stock: number;
  /** Imagem já resolvida, para o carrinho não recalcular o mockup. */
  image?: string;
}

interface CartValue {
  lines: CartLine[];
  /** Soma das quantidades — é o número no badge da sacola. */
  count: number;
  subtotalCents: number;
  add: (product: Product, variant: ProductVariant, quantity: number, image?: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartValue>(() => {
    return {
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotalCents: lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0),

      add(product, variant, quantity, image) {
        setLines((current) => {
          const existing = current.find((l) => l.variantId === variant.id);
          if (existing) {
            // Nunca deixa passar do estoque, mesmo somando com o que já
            // estava no carrinho.
            const total = Math.min(existing.quantity + quantity, variant.stock);
            return current.map((l) =>
              l.variantId === variant.id ? { ...l, quantity: total, stock: variant.stock } : l,
            );
          }
          return [
            ...current,
            {
              variantId: variant.id,
              sku: variant.sku,
              productId: product.id,
              name: product.name,
              priceCents: variant.priceCents,
              color: variant.colorName,
              size: variant.size,
              quantity: Math.min(quantity, variant.stock),
              stock: variant.stock,
              image,
            },
          ];
        });
      },

      setQuantity(variantId, quantity) {
        setLines((current) =>
          quantity <= 0
            ? current.filter((l) => l.variantId !== variantId)
            : current.map((l) =>
                l.variantId === variantId
                  ? { ...l, quantity: Math.min(quantity, l.stock) }
                  : l,
              ),
        );
      },

      remove(variantId) {
        setLines((current) => current.filter((l) => l.variantId !== variantId));
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
