import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { news as fallbackNews } from '../data/news';
import { buildAutoNews } from '../lib/autoNews';
import { useAthletes } from './useAthletes';
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
 *
 * O feed final junta as notícias cadastradas à mão (Supabase ou fallback,
 * nessa ordem de tentativa) com as que nascem sozinhas do cartel de cada
 * atleta (ver src/lib/autoNews.ts) — por isso também lê useAthletes aqui.
 */
export function useNews(): UseNewsResult {
  const [manualNews, setManualNews] = useState<NewsItem[]>(fallbackNews);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(true);
  const { athletes } = useAthletes();

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

      setManualNews(
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

  const news = useMemo(
    () => [...manualNews, ...buildAutoNews(athletes)],
    [manualNews, athletes],
  );

  return { news, loading, isFallback };
}
