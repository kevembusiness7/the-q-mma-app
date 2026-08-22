/** Categorias da loja. 'All' é só filtro de tela, não vai pro banco. */
export type ProductCategory = 'Shirts' | 'Caps' | 'Kids';

/** 'app' = exclusivo do app, 'low' = estoque baixo, 'lim' = edição limitada. */
export type ProductBadge = 'app' | 'low' | 'lim';

export interface ProductColor {
  name: string;
  /** Cor do seletor redondo. */
  hex: string;
  /** Sufixo do arquivo de mockup: witch-<slug>.png. Só para mode 'mockup'. */
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  /** Em dólares, sem centavos — o mockup usa valores inteiros. */
  price: number;
  badges: ProductBadge[];
  /** slug do atleta dono da peça, ou 'team' para itens do time. */
  owner: string;
  description: string;
  tags: string[];
  genders: string[];
  colors: ProductColor[];
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
  bio: string;
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
