import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { news as fallbackNews } from '../data/news';
import type { NewsItem } from '../types/news';

interface UseNewsResult {
  news: NewsItem[];
  loading: boolean;
  /** true quando os dados vieram de src/data/news.ts, não do banco. */
  isFallback: boolean;
}

/**
 * Mesma estratégia de useAthletes: tenta o Supabase, cai no mock se falhar.
 * Assim a tela nunca aparece vazia, mesmo sem banco configurado.
 */
export function useNews(): UseNewsResult {
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!supabase) {
        if (active) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!active) return;

      if (error || !data || data.length === 0) {
        // Mantém o fallback já carregado no estado inicial.
        setLoading(false);
        return;
      }

      setNews(
        data.map((row) => ({
          id: row.id,
          type: row.type,
          tag: row.tag,
          title: row.title,
          body: row.body,
          date: row.display_date,
          photo: row.photo_url,
        })),
      );
      setIsFallback(false);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return { news, loading, isFallback };
}
