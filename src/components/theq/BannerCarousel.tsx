import { useCallback, useEffect, useRef, useState } from 'react';
import { BannerLink } from './BannerLink';

/** Tempo parado em cada banner antes de o próximo subir sozinho. */
const INTERVALO_MS = 4000;
/** Depois que o dedo encosta, o avanço automático fica quieto por esse tempo. */
const PAUSA_APOS_TOQUE_MS = 10000;

export interface BannerSlide {
  src: string;
  /** Descreve o destino, não a imagem: "Ver atletas", "Ir para a loja". */
  alt: string;
  onClick: () => void;
}

interface BannerCarouselProps {
  slides: BannerSlide[];
}

/**
 * Distância de um banner ao próximo. Todos têm a mesma altura (um por vez),
 * então altura + vão dá a posição exata de qualquer índice -- é o que permite
 * usar `scrollTo` sem medir cada slide.
 */
function passoDoTrilho(trilho: HTMLElement): number {
  const slide = trilho.firstElementChild as HTMLElement | null;
  if (!slide) return 0;
  const vao = Number.parseFloat(getComputedStyle(trilho).rowGap) || 0;
  return slide.offsetHeight + vao;
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
 * Carrossel VERTICAL dos banners de destino: um por vez, subindo sozinho e
 * voltando ao primeiro no fim. Mesma mecânica do NewsCarousel, virada no eixo
 * Y -- o trilho rola em `scrollTop` em vez de `scrollLeft`.
 *
 * Cinco banners empilhados custavam cinco telas de rolagem só pra passar por
 * eles; aqui ocupam a altura de um e o resto da home sobe.
 *
 * O arrasto com o dedo continua funcionando: quem toca assume o controle e o
 * automático só volta depois de 10s parado, senão ele briga com o gesto.
 */
export function BannerCarousel({ slides }: BannerCarouselProps) {
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
        if (passo > 0) setAtual(Math.round(trilho.scrollTop / passo));
      });
    };

    trilho.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      trilho.removeEventListener('scroll', aoRolar);
      cancelAnimationFrame(quadro);
    };
  }, []);

  useEffect(() => {
    if (pausado || reduzido || slides.length < 2) return;

    const relogio = window.setInterval(() => {
      const trilho = trilhoRef.current;
      if (!trilho) return;
      const passo = passoDoTrilho(trilho);
      if (passo <= 0) return;
      const proximo = (Math.round(trilho.scrollTop / passo) + 1) % slides.length;
      trilho.scrollTo({ top: proximo * passo, behavior: 'smooth' });
    }, INTERVALO_MS);

    return () => window.clearInterval(relogio);
  }, [pausado, reduzido, slides.length]);

  const irPara = (indice: number) => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    trilho.scrollTo({
      top: indice * passoDoTrilho(trilho),
      behavior: reduzido ? 'auto' : 'smooth',
    });
    pausar();
  };

  return (
    <div className="banner-carousel">
      <div
        className="banner-trilho"
        ref={trilhoRef}
        onPointerDown={pausar}
        role="group"
        aria-roledescription="carrossel"
        aria-label="Áreas do The Q"
      >
        {slides.map((slide, indice) => (
          <BannerLink
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            onClick={slide.onClick}
            // O slide do meio fica inteiro; os vizinhos, que so espiam pelas
            // bordas, entram menores e apagados -- e o contraste entre os
            // dois estados que faz o do meio ler como "o atual".
            className={indice === atual ? 'banner-slide is-active' : 'banner-slide'}
          />
        ))}
      </div>

      {slides.length > 1 && (
        <div className="banner-dots">
          {slides.map((slide, indice) => (
            <button
              key={slide.src}
              type="button"
              className={indice === atual ? 'banner-dot is-active' : 'banner-dot'}
              aria-label={`Ver ${slide.alt}`}
              aria-current={indice === atual}
              onClick={() => irPara(indice)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default BannerCarousel;
