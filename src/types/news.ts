/**
 * Tipos da tela The Q (home da academia).
 *
 * Espelha a tabela `news` em supabase/theq-schema.sql — se adicionar um campo
 * aqui, adicione lá também e em src/hooks/useNews.ts.
 */

/** Define a cor da etiqueta no card: verde, vermelho ou dourado. */
export type NewsType = 'result' | 'next' | 'event';

export interface NewsItem {
  id: string;
  /** Controla a cor da etiqueta. */
  type: NewsType;
  /** Texto da etiqueta: "Fight Result", "Next Fight", "Academy Schedule". */
  tag: string;
  title: string;
  body: string;
  /** Data já formatada para exibição — o mockup usa texto livre
   *  ("Jul 18, 2026", "Every Saturday · 10 AM"). */
  date: string;
  /** Caminho da imagem em /public, ex: "/images/news/open-mat.jpg" */
  photo: string;
}
