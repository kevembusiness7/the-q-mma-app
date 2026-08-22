import type { NewsItem } from '../types/news';

/**
 * Conteúdo de fallback, usado quando o Supabase não responde ou não está
 * configurado. Mesmo conteúdo do seed em supabase/theq-schema.sql.
 */
export const news: NewsItem[] = [
  {
    id: 'dione-def-melisano',
    type: 'result',
    tag: 'Fight Result',
    title: 'Dione Barbosa def. Anna Melisano',
    body: '"The Witch" got the standing rear-naked choke finish in Round 1 at UFC Fight Night, extending her winning streak to two.',
    date: 'Jul 18, 2026',
    photo: '/images/news/dione-def-melisano.jpg',
  },
  {
    id: 'ozzy-vs-gandra',
    type: 'next',
    tag: 'Next Fight',
    title: 'Ozzy Diaz faces Ryan Gandra',
    body: 'Osman "Ozzy" Diaz is set for UFC 331: Van vs. Pantoja 2, September 19 at Crypto.com Arena, Los Angeles.',
    date: 'Sep 19, 2026',
    photo: '/images/news/ozzy-vs-gandra.jpg',
  },
  {
    id: 'open-mat',
    type: 'event',
    tag: 'Academy Schedule',
    title: 'Open Mat & Trial Class',
    body: 'Free open mat and trial class for anyone curious about training at The Q MMA. All levels welcome, no experience needed.',
    date: 'Every Saturday · 10 AM',
    photo: '/images/news/open-mat.jpg',
  },
];
