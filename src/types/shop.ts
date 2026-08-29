/** Categorias da loja. 'All' é só filtro de tela, não vai pro banco. */
export type ProductCategory = 'Shirts' | 'Caps' | 'Kids';

/**
 * 'app' = exclusivo do app, 'lim' = edição limitada.
 *
 * 'low' saiu daqui: estoque baixo passou a ser calculado das variações. Como
 * selo escrito à mão, ele mentia assim que o estoque mudava.
 */
export type ProductBadge = 'app' | 'lim';

export interface ProductColor {
  name: string;
  /** Cor do seletor redondo. */
  hex: string;
  /** Sufixo do arquivo de mockup: witch-<slug>.png. Só para mode 'mockup'. */
  slug: string;
}

/**
 * Uma combinação vendável: produto + cor + tamanho.
 *
 * É a unidade que tem SKU, preço e estoque. Sem isto, "camisa preta M" não
 * existe em lugar nenhum — vira só texto concatenado — e não há como controlar
 * estoque nem registrar no pedido o que de fato foi comprado.
 */
export interface ProductVariant {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string;
  colorSlug: string;
  /** 'S'..'XXL', ou 'One size' para itens sem numeração, como bonés. */
  size: string;
  priceCents: number;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  /**
   * Sempre em centavos inteiros. Float em conta de dinheiro perde centavo no
   * arredondamento, e o erro aparece ao somar imposto, frete e desconto.
   * O preço que vale na compra é o da variação; este é o de vitrine.
   */
  priceCents: number;
  badges: ProductBadge[];
  /** slug do atleta dono da peça, ou 'team' para itens do time. */
  owner: string;
  description: string;
  tags: string[];
  genders: string[];
  /** Cores oferecidas. Derivadas das variações — ver `coresDoProduto`. */
  colors: ProductColor[];
  variants: ProductVariant[];
  details: string;
  shipping: string;
  /**
   * 'mockup' troca a foto conforme a cor escolhida e tem verso.
   * 'art' usa um desenho SVG genérico (bonés, infantil).
   */
  mode: 'mockup' | 'art';
  /** 'witch' | 'poster' — prefixo dos arquivos em /images/shirts/. */
  mockupKey?: string;
  /** Desenho usado quando mode = 'art'. */
  art?: 'tee' | 'cap' | 'kid';
  /** Foto real do design (mode = 'art'). Sem isto, cai no desenho de `art`. */
  artImage?: string;
}

export interface Coach {
  id: string;
  name: string;
  role: string;
  belt: string;
  specialty: string;
  city: string;
  instagram: string;
  /** Atletas que o treinador prepara. */
  notable: string;
  /** Versão curta — é a que fica visível no card fechado. */
  bio: string;
  /** Versão longa, um item por parágrafo. Aparece ao abrir "Read full bio". */
  fullBio: string[];
  /** Números que resumem a carreira, na linha abaixo do nome. */
  stats: { label: string; value: string }[];
  /** Frase que resume a filosofia de trabalho. */
  quote?: string;
  photo: string;
}

export interface Sponsor {
  id: string;
  name: string;
  description: string;
  logo: string;
  website?: string;
  instagram?: string;
  /** Destaca o card com borda dourada. */
  featured?: boolean;
}
