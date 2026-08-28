import { useCallback, useEffect, useRef, useState } from 'react';
import { NewsCard } from './NewsCard';
import type { NewsItem } from '../../types/news';

/** Quanto tempo cada card fica parado antes de o próximo entrar sozinho. */
const INTERVALO_MS = 5000;
/** Depois que o dedo encosta, o avanço automático fica quieto por esse tempo. */
const PAUSA_APOS_TOQUE_MS = 10000;

interface NewsCarouselProps {
  items: NewsItem[];
}

/**
 * Distância de um card ao próximo. Todos têm a mesma largura (um por tela),
 * então largura + vão dá a posição exata de qualquer índice — é o que permite
 * usar `scrollTo` sem depender de medir cada card.
 */
function passoDoTrilho(trilho: HTMLElement): number {
  const card = trilho.firstElementChild as HTMLElement | null;
  if (!card) return 0;
  const vao = Number.parseFloat(getComputedStyle(trilho).columnGap) || 0;
  return card.offsetWidth + vao;
}

/** Quem pediu menos animação no sistema não recebe carrossel se mexendo. */
function useMenosMovimento(): boolean {
  const [reduzido, setReduzido] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aoMudar = () => setReduzido(consulta.matches);
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  return reduzido;
}

/**
 * Feed de notícias como carrossel: um card por tela, avançando sozinho e
 * voltando ao primeiro no fim. O arrasto com o dedo continua funcionando —
 * quem toca assume o controle e o automático só volta depois de 10s parado.
 */
export function NewsCarousel({ items }: NewsCarouselProps) {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const retomarRef = useRef<number | null>(null);
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const reduzido = useMenosMovimento();

  const pausar = useCallback(() => {
    setPausado(true);
    if (retomarRef.current) window.clearTimeout(retomarRef.current);
    retomarRef.current = window.setTimeout(() => setPausado(false), PAUSA_APOS_TOQUE_MS);
  }, []);

  useEffect(() => () => {
    if (retomarRef.current) window.clearTimeout(retomarRef.current);
  }, []);

  // Quem manda no índice é a posição real da rolagem, não um contador à parte:
  // assim arrastar com o dedo e o avanço automático nunca discordam da bolinha.
  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;

    let quadro = 0;
    const aoRolar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const passo = passoDoTrilho(trilho);
        if (passo > 0) setAtual(Math.round(trilho.scrollLeft / passo));
      });
    };

    trilho.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      trilho.removeEventListener('scroll', aoRolar);
      cancelAnimationFrame(quadro);
    };
  }, []);

  useEffect(() => {
    if (pausado || reduzido || items.length < 2) return;

    const relogio = window.setInterval(() => {
      const trilho = trilhoRef.current;
      if (!trilho) return;
      const passo = passoDoTrilho(trilho);
      if (passo <= 0) return;
      const proximo = (Math.round(trilho.scrollLeft / passo) + 1) % items.length;
      trilho.scrollTo({ left: proximo * passo, behavior: 'smooth' });
    }, INTERVALO_MS);

    return () => window.clearInterval(relogio);
  }, [pausado, reduzido, items.length]);

  const irPara = (indice: number) => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    trilho.scrollTo({
      left: indice * passoDoTrilho(trilho),
      behavior: reduzido ? 'auto' : 'smooth',
    });
    pausar();
  };

  return (
    <div className="news-carousel">
      <div
        className="news-feed"
        ref={trilhoRef}
        onPointerDown={pausar}
        role="group"
        aria-roledescription="carrossel"
        aria-label="Notícias e eventos"
      >
        {items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>

      {items.length > 1 && (
        <div className="news-dots">
          {items.map((item, indice) => (
            <button
              key={item.id}
              type="button"
              className={indice === atual ? 'news-dot is-active' : 'news-dot'}
              aria-label={`Ver a notícia ${indice + 1} de ${items.length}`}
              aria-current={indice === atual}
              onClick={() => irPara(indice)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default NewsCarousel;
