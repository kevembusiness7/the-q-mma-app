import { useEffect, useState } from 'react'
import { products as MOCK, comVariacoes } from '../data/shop'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Product, ProductVariant } from '../types/shop'

/**
 * Catálogo da loja.
 *
 * Mesma ideia do useAthletes: com o Supabase configurado, lê do banco; sem
 * ele, cai no mock de src/data/shop.ts para a loja continuar navegável.
 */
export function useProducts() {
  const [produtos, setProdutos] = useState<Product[]>(
    isSupabaseConfigured ? [] : comVariacoes(MOCK),
  )
  const [carregando, setCarregando] = useState(isSupabaseConfigured)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelado = false

    async function carregar() {
      // Uma consulta só: o PostgREST devolve as variações aninhadas.
      const { data, error } = await supabase!
        .from('products')
        .select('*, product_variants(*)')
        .eq('is_active', true)
        .order('sort_order')

      if (cancelado) return

      if (error) {
        setErro(error.message)
        // Sem catálogo a loja fica inutilizável; o mock ao menos mantém as
        // telas navegáveis enquanto o problema é resolvido.
        setProdutos(comVariacoes(MOCK))
      } else {
        setErro(null)
        setProdutos((data ?? []).map(paraProduto))
      }
      setCarregando(false)
    }

    carregar()
    return () => {
      cancelado = true
    }
  }, [])

  return { produtos, carregando, erro }
}

function paraVariacao(row: any): ProductVariant {
  return {
    id: row.id,
    sku: row.sku,
    colorName: row.color_name,
    colorHex: row.color_hex,
    colorSlug: row.color_slug,
    size: row.size,
    priceCents: row.price_cents,
    stock: row.stock,
  }
}

function paraProduto(row: any): Product {
  const variants: ProductVariant[] = (row.product_variants ?? [])
    .filter((v: any) => v.is_active)
    .map(paraVariacao)

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    priceCents: row.price_cents,
    badges: row.badges ?? [],
    owner: row.owner,
    description: row.description ?? '',
    tags: row.tags ?? [],
    genders: row.genders ?? [],
    colors: coresDoProduto(variants),
    variants,
    details: row.details ?? '',
    shipping: row.shipping ?? '',
    mode: row.mode,
    mockupKey: row.mockup_key ?? undefined,
    art: row.art ?? undefined,
    artImage: row.art_image ?? undefined,
  }
}

/* ------------------------------------------------------------- utilidades -- */

/** Cores únicas, na ordem em que aparecem nas variações. */
export function coresDoProduto(variants: ProductVariant[]) {
  const vistas = new Set<string>()
  const cores: { name: string; hex: string; slug: string }[] = []
  for (const v of variants) {
    if (vistas.has(v.colorSlug)) continue
    vistas.add(v.colorSlug)
    cores.push({ name: v.colorName, hex: v.colorHex, slug: v.colorSlug })
  }
  return cores
}

/** Tamanhos de uma cor, na ordem de vestuário e não alfabética. */
const ORDEM_TAMANHO = ['One size', 'S', 'M', 'L', 'XL', 'XXL']

export function variacoesDaCor(product: Product, colorSlug: string): ProductVariant[] {
  return product.variants
    .filter((v) => v.colorSlug === colorSlug)
    .sort((a, b) => ORDEM_TAMANHO.indexOf(a.size) - ORDEM_TAMANHO.indexOf(b.size))
}

export function acharVariacao(
  product: Product,
  colorSlug: string,
  size: string,
): ProductVariant | undefined {
  return product.variants.find((v) => v.colorSlug === colorSlug && v.size === size)
}

export function estoqueTotal(product: Product): number {
  return product.variants.reduce((soma, v) => soma + v.stock, 0)
}

export function estaEsgotado(product: Product): boolean {
  return product.variants.length > 0 && estoqueTotal(product) === 0
}

/** Abaixo disto a vitrine mostra o selo de estoque baixo. */
export const LIMITE_ESTOQUE_BAIXO = 10

export function estoqueBaixo(product: Product): boolean {
  const total = estoqueTotal(product)
  return total > 0 && total <= LIMITE_ESTOQUE_BAIXO
}

/** Formata centavos como dólar. Aceita e devolve só inteiros. */
export function formatarPreco(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}
