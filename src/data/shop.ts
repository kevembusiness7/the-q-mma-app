import type { Coach, Product, ProductColor, Sponsor } from '../types/shop';

const SHIPPING =
  'Ships within 3 business days after payment confirmation. Shipping cost calculated at checkout based on ZIP code. Exchanges and returns within 7 days of delivery, unused and with tags attached.';

const COTTON =
  '100% combed cotton, 180g/m², high-durability screen print. Unisex regular fit. Officially licensed piece with The Q MMA authenticity seal.';

/** As 6 cores que têm arquivo de mockup em /images/shirts/. */
const MOCKUP_COLORS: ProductColor[] = [
  { name: 'Black', hex: '#14110F', slug: 'black' },
  { name: 'White', hex: '#EDE7DE', slug: 'white' },
  { name: 'Burgundy', hex: '#B0301F', slug: 'burgundy' },
  { name: 'Green', hex: '#4fb477', slug: 'green' },
  { name: 'Gray', hex: '#948A81', slug: 'gray' },
  { name: 'Gold', hex: '#C8A03C', slug: 'gold' },
];

export const products: Product[] = [
  {
    id: 'witch-fight-kit',
    name: 'The Witch Fight Kit Shirt',
    category: 'Shirts',
    price: 190,
    badges: ['app'],
    owner: 'dione-barbosa',
    description:
      'Official black fight-night shirt with green-and-gold artwork and Dione "The Witch" Barbosa\'s signature.',
    tags: ['UFC', 'Flyweight', 'DioneBarbosa', 'TheQMMA', 'FightKit'],
    genders: ['Men', 'Women', 'Kids'],
    colors: [
      { name: 'White', hex: '#EDE7DE', slug: 'white' },
      { name: 'Gold', hex: '#C8A03C', slug: 'gold' },
    ],
    details: COTTON,
    shipping: SHIPPING,
    mode: 'art',
    art: 'tee',
  },
  {
    id: 'ozzy-fight-kit',
    name: 'Ozzy Fight Kit Shirt',
    category: 'Shirts',
    price: 190,
    badges: ['app'],
    owner: 'ozzy-diaz',
    description:
      'Official black fight-night shirt with red-and-black artwork and Osman "Ozzy" Diaz\'s signature.',
    tags: ['UFC', 'Middleweight', 'OzzyDiaz', 'TheQMMA', 'FightKit'],
    genders: ['Men', 'Women', 'Kids'],
    colors: [
      { name: 'Black', hex: '#14110F', slug: 'black' },
      { name: 'Red', hex: '#c1392b', slug: 'red' },
      { name: 'Gray', hex: '#948A81', slug: 'gray' },
      { name: 'White', hex: '#EDE7DE', slug: 'white' },
    ],
    details: COTTON,
    shipping: SHIPPING,
    mode: 'art',
    art: 'tee',
  },
  {
    id: 'theq-classic-cap',
    name: 'The Q Classic Cap',
    category: 'Caps',
    price: 99,
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
    name: 'The Q Kids Shirt',
    category: 'Kids',
    price: 129,
    badges: ['low'],
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
    name: 'Dione Witch Art Shirt',
    category: 'Shirts',
    price: 169,
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
    id: 'dione-fight-poster',
    name: 'Dione Barbosa Fight Poster Shirt',
    category: 'Shirts',
    price: 169,
    badges: ['app'],
    owner: 'dione-barbosa',
    description:
      'Shirt with poster-style fight artwork of Dione "The Witch" Barbosa. Choose the shirt color and see front and back.',
    tags: ['UFC', 'Flyweight', 'DioneBarbosa', 'TheQMMA', 'FightPoster'],
    genders: ['Men', 'Women', 'Kids'],
    colors: MOCKUP_COLORS,
    details:
      '100% combed cotton, 180g/m², high-definition poster-format digital print. Unisex regular fit. Choose any shirt color freely — the artwork is applied on top of any color.',
    shipping: SHIPPING,
    mode: 'mockup',
    mockupKey: 'poster',
  },
];

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

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
