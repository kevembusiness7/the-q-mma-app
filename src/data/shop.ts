import type { Coach, Product, ProductColor, Sponsor } from '../types/shop';

type ProdutoBase = Omit<Product, 'variants'>;

const SHIPPING =
  'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.';

/** As 6 cores que têm arquivo de mockup em /images/shirts/. */
const MOCKUP_COLORS: ProductColor[] = [
  { name: 'Black', hex: '#14110F', slug: 'black' },
  { name: 'White', hex: '#EDE7DE', slug: 'white' },
  { name: 'Burgundy', hex: '#B0301F', slug: 'burgundy' },
  { name: 'Green', hex: '#4fb477', slug: 'green' },
  { name: 'Gray', hex: '#948A81', slug: 'gray' },
  { name: 'Gold', hex: '#C8A03C', slug: 'gold' },
];

/** Paleta do boné clássico, reaproveitada nos bonés de arte dos atletas. */
const CAP_COLORS: ProductColor[] = [
  { name: 'Black', hex: '#14110F', slug: 'black' },
  { name: 'Burgundy', hex: '#B0301F', slug: 'burgundy' },
  { name: 'Beige', hex: '#948A81', slug: 'beige' },
];

const ART_SHIRT_DETAILS =
  '100% combed cotton, 180g/m², high-durability screen print. Unisex regular fit. Officially licensed piece with The Q MMA authenticity seal.';

const ART_CAP_DETAILS =
  'Structured six-panel cap, front artwork print, adjustable snapback closure.';

/** Sem as variações: quem monta é comVariacoes(), com a mesma regra do SQL. */
export const products: ProdutoBase[] = [
  {
    id: 'theq-classic-cap',
    slug: 'theq-classic-cap',
    name: 'The Q Classic Cap',
    category: 'Caps',
    priceCents: 9900,
    badges: [],
    owner: 'team',
    description:
      'Curved-brim cap with the team logo embroidered on front, snapback adjustable strap.',
    tags: ['TheQMMA', 'Cap', 'Classic'],
    genders: ['Men', 'Women'],
    colors: [
      { name: 'Black', hex: '#14110F', slug: 'black' },
      { name: 'Burgundy', hex: '#B0301F', slug: 'burgundy' },
      { name: 'Beige', hex: '#948A81', slug: 'beige' },
    ],
    details:
      'Structured 6-panel cap, pre-curved brim, embroidered raised logo. Snapback adjustable strap, one size fits all.',
    shipping: SHIPPING,
    mode: 'art',
    art: 'cap',
  },
  {
    id: 'theq-kids-shirt',
    slug: 'theq-kids-shirt',
    name: 'The Q Kids Shirt',
    category: 'Kids',
    priceCents: 12900,
    badges: [],
    owner: 'team',
    description: 'Kids shirt with the team crest, soft 100% cotton fabric.',
    tags: ['TheQMMA', 'Kids'],
    genders: ['Kids'],
    colors: [
      { name: 'Black', hex: '#14110F', slug: 'black' },
      { name: 'Gold', hex: '#C8A03C', slug: 'gold' },
    ],
    details:
      '100% cotton kids shirt, reinforced crew neck, team crest printed in high-durability heat-transfer vinyl.',
    shipping: SHIPPING,
    mode: 'art',
    art: 'kid',
  },
  {
    id: 'dione-witch-art',
    slug: 'dione-witch-art',
    name: 'Dione Witch Art Shirt',
    category: 'Shirts',
    priceCents: 16900,
    badges: ['app'],
    owner: 'dione-barbosa',
    description:
      'Shirt with Dione "The Witch" Barbosa\'s exclusive illustrated artwork. Choose the shirt color and see front and back.',
    tags: ['UFC', 'Flyweight', 'DioneBarbosa', 'TheQMMA', 'ExclusiveArt'],
    genders: ['Men', 'Women', 'Kids'],
    colors: MOCKUP_COLORS,
    details:
      '100% combed cotton, 180g/m², high-definition digital print. Unisex regular fit. Choose any shirt color freely — the artwork is applied on top of any color.',
    shipping: SHIPPING,
    mode: 'mockup',
    mockupKey: 'witch',
  },
  {
    id: 'ozzy-diaz-art',
    slug: 'ozzy-diaz-art',
    name: 'Ozzy Diaz Art Shirt',
    category: 'Shirts',
    priceCents: 16900,
    badges: ['app'],
    owner: 'ozzy-diaz',
    description: 'Shirt with Osman "Ozzy" Diaz\'s exclusive illustrated artwork.',
    tags: ['UFC', 'OzzyDiaz', 'TheQMMA', 'Art'],
    genders: ['Men', 'Women'],
    colors: MOCKUP_COLORS,
    details: ART_SHIRT_DETAILS,
    shipping: SHIPPING,
    mode: 'art',
    art: 'tee',
    artImage: '/images/shirts/ozzyshirt.png',
  },
  {
    id: 'shane-collins-art',
    slug: 'shane-collins-art',
    name: 'Shane Collins Art Shirt',
    category: 'Shirts',
    priceCents: 16900,
    badges: ['app'],
    owner: 'shane-collins',
    description: 'Shirt with Shane "Hollywood" Collins\'s exclusive illustrated artwork.',
    tags: ['UFC', 'ShaneCollins', 'TheQMMA', 'Art'],
    genders: ['Men', 'Women'],
    colors: MOCKUP_COLORS,
    details: ART_SHIRT_DETAILS,
    shipping: SHIPPING,
    mode: 'art',
    art: 'tee',
    artImage: '/images/shirts/hollywoodshirt.png',
  },
  {
    id: 'jp-lebosnoyani-art',
    slug: 'jp-lebosnoyani-art',
    name: 'Jean Paul Art Shirt',
    category: 'Shirts',
    priceCents: 16900,
    badges: ['app'],
    owner: 'jp-lebosnoyani',
    description: 'Shirt with Jean-Paul "Mufasa" Lebosnoyani\'s exclusive illustrated artwork.',
    tags: ['UFC', 'JeanPaulLebosnoyani', 'TheQMMA', 'Art'],
    genders: ['Men', 'Women'],
    colors: MOCKUP_COLORS,
    details: ART_SHIRT_DETAILS,
    shipping: SHIPPING,
    mode: 'art',
    art: 'tee',
    artImage: '/images/shirts/jplshirt.png',
  },
  {
    id: 'ozzy-diaz-cap',
    slug: 'ozzy-diaz-cap',
    name: 'Ozzy Diaz Art Cap',
    category: 'Caps',
    priceCents: 9900,
    badges: ['app'],
    owner: 'ozzy-diaz',
    description:
      'Curved-brim cap with Osman "Ozzy" Diaz\'s exclusive illustrated artwork embroidered on front.',
    tags: ['UFC', 'OzzyDiaz', 'TheQMMA', 'Art', 'Cap'],
    genders: ['Men', 'Women'],
    colors: CAP_COLORS,
    details: ART_CAP_DETAILS,
    shipping: SHIPPING,
    mode: 'art',
    art: 'cap',
    artImage: '/images/caps/ozzycap.png',
  },
  {
    id: 'shane-collins-cap',
    slug: 'shane-collins-cap',
    name: 'Shane Collins Art Cap',
    category: 'Caps',
    priceCents: 9900,
    badges: ['app'],
    owner: 'shane-collins',
    description:
      'Curved-brim cap with Shane "Hollywood" Collins\'s exclusive illustrated artwork embroidered on front.',
    tags: ['UFC', 'ShaneCollins', 'TheQMMA', 'Art', 'Cap'],
    genders: ['Men', 'Women'],
    colors: CAP_COLORS,
    details: ART_CAP_DETAILS,
    shipping: SHIPPING,
    mode: 'art',
    art: 'cap',
    artImage: '/images/caps/hollywoodcap.png',
  },
  {
    id: 'jp-lebosnoyani-cap',
    slug: 'jp-lebosnoyani-cap',
    name: 'Jean Paul Art Cap',
    category: 'Caps',
    priceCents: 9900,
    badges: ['app'],
    owner: 'jp-lebosnoyani',
    description:
      'Curved-brim cap with Jean-Paul "Mufasa" Lebosnoyani\'s exclusive illustrated artwork embroidered on front.',
    tags: ['UFC', 'JeanPaulLebosnoyani', 'TheQMMA', 'Art', 'Cap'],
    genders: ['Men', 'Women'],
    colors: CAP_COLORS,
    details: ART_CAP_DETAILS,
    shipping: SHIPPING,
    mode: 'art',
    art: 'cap',
    artImage: '/images/caps/jplcap.png',
  },
];

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

/**
 * Expande cores × tamanhos em variações, para o mock ter a mesma forma que o
 * banco devolve.
 *
 * A regra é a mesma do loja-schema.sql, inclusive o estoque de exemplo — se
 * divergirem, a loja muda de comportamento ao ligar o Supabase, e esse tipo
 * de diferença é difícil de perceber.
 *
 * Boné usa 'One size': a lista SIZES era única para a loja inteira, então o
 * app chegava a oferecer boné tamanho XXL.
 */
export function comVariacoes(lista: ProdutoBase[]): Product[] {
  return lista.map((p) => {
    const tamanhos = p.category === 'Caps' ? ['One size'] : SIZES;
    return {
      ...p,
      variants: p.colors.flatMap((cor) =>
        tamanhos.map((size) => ({
          id: `${p.slug}-${cor.slug}-${size.replace(/\s/g, '').toLowerCase()}`,
          sku: `${p.slug}-${cor.slug}-${size.replace(/\s/g, '')}`.toUpperCase(),
          colorName: cor.name,
          colorHex: cor.hex,
          colorSlug: cor.slug,
          size,
          priceCents: p.priceCents,
          stock:
            size === 'XXL' && cor.slug === 'gold'
              ? 0
              : size === 'S'
                ? 3
                : size === 'XXL'
                  ? 4
                  : 12 + cor.slug.length * 2,
        })),
      ),
    };
  });
}

export const coaches: Coach[] = [
  {
    id: 'matheus-naccache',
    name: 'Matheus Naccache',
    role: 'Head Coach',
    belt: 'Black Belt · Muay Thai',
    specialty: 'Fight Camp Preparation',
    city: 'Rio de Janeiro, RJ',
    instagram: 'https://www.instagram.com/matheusnaccache/',
    notable: 'Osman "Ozzy" Diaz, Dione Barbosa',
    bio: 'Head coach at The Q MMA, originally from Rio de Janeiro, RJ. Black belt in Muay Thai, specializing in fight camp preparation. Leads training for the team\'s pro roster, including Ozzy Diaz and Dione Barbosa.',
    photo: '/images/coaches/matheus-naccache.jpg',
  },
];

export const sponsors: Sponsor[] = [
  {
    id: 'blez-sports-cards',
    name: 'Blez Sports Cards',
    description:
      'Official trading card partner of The Q MMA, producing collectible cards for the team roster.',
    logo: '/images/sponsors/blez-sports-cards.jpg',
    website: 'https://www.blezonline.com/',
    featured: true,
  },
];
