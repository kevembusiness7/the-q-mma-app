import type { NewsItem } from '../types/news';

/**
 * Conteúdo de fallback, usado quando o Supabase não responde ou não está
 * configurado. Mesmo conteúdo do seed em supabase/theq-schema.sql.
 *
 * Notícias de última/próxima luta NÃO ficam aqui — elas nascem sozinhas do
 * cartel de cada atleta (ver src/lib/autoNews.ts), então este arquivo só
 * guarda o que nenhum cartel cobre (agenda da academia, avisos).
 */
export const news: NewsItem[] = [
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
