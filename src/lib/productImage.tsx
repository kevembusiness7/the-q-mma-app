import type { Product } from '../types/shop';

/**
 * Resolve qual imagem mostrar para um produto.
 *
 * Produtos 'mockup' têm foto real por cor:
 *   /images/shirts/witch-black.png, /images/shirts/back-black.png (camisa,
 *   tem verso genérico) ou /images/caps/ozzy-black.png (boné, só frente —
 *   ver hasBack em ProductPage.tsx).
 * Produtos 'art' com `artImage` mostram essa foto (a arte não muda com a
 * cor escolhida — a cor é só a base da peça). Sem `artImage`, cai no
 * desenho SVG genérico e o componente desenha o SVG.
 */
export function productImage(
  product: Product,
  colorSlug: string,
  side: 'front' | 'back' = 'front',
): string | null {
  if (product.mode === 'mockup' && product.mockupKey) {
    const pasta = product.category === 'Caps' ? 'caps' : 'shirts';
    const prefix = side === 'back' ? 'back' : product.mockupKey;
    return `/images/${pasta}/${prefix}-${colorSlug}.png`;
  }
  if (product.mode === 'art' && product.artImage) return product.artImage;
  return null;
}

/** Traços dos desenhos usados quando o produto não tem foto. */
export const ART_PATHS: Record<string, string> = {
  tee: 'M22 14l-8 4 3 9 5-2v39h26V25l5 2 3-9-8-4-6-2a5 5 0 01-14 0z',
  cap: 'M12 46c0-14 8-24 23-24s23 10 23 24H12zm0 0h46v6H12z',
  kid: 'M25 16l-6 3 2 7 4-1v31h20V25l4 1 2-7-6-3-4-1a4 4 0 01-12 0z',
};

/** Um desenho simples, no lugar da foto, para bonés e infantil. */
export function ProductArt({ art = 'tee' }: { art?: string }) {
  return (
    <svg viewBox="0 0 70 80" fill="none" stroke="#EDE7DE" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d={ART_PATHS[art] ?? ART_PATHS.tee} />
    </svg>
  );
}

/** Preço formatado em dólar, sem centavos — igual ao mockup. */
export function formatPrice(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}
