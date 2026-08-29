import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BannerLink } from './BannerLink';

/** Tempo parado em cada banner antes de o próximo subir sozinho. */
const INTERVALO_MS = 4000;
/** Depois que o dedo encosta, o avanço automático fica quieto por esse tempo. */
const PAUSA_APOS_TOQUE_MS = 10000;
/** Tempo sem evento de rolagem que conta como "parou": é aí que o trilho volta
 *  pra cópia do meio, com a rolagem suave já terminada. */
const PARADA_MS = 160;
/** Cópias da lista no trilho: uma acima, a que vale, uma abaixo. Com uma
 *  sobrando de cada lado, o trilho nunca chega numa ponta. */
const COPIAS = 3;

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
 * Carrossel VERTICAL dos banners de destino: um por vez, subindo sozinho e sem
 * fim. Mesma mecânica do NewsCarousel, virada no eixo Y -- o trilho rola em
 * `scrollTop` em vez de `scrollLeft`.
 *
 * Sete banners empilhados custavam sete telas de rolagem só pra passar por
 * eles; aqui ocupam a altura de um e o resto da home sobe.
 *
 * O infinito é a lista repetida três vezes com o trilho parado na cópia do
 * meio: quando a rolagem para, ele salta seco (sem animação) para o mesmo
 * banner da cópia central. Como o slide de destino é a mesma arte que já está
 * na tela, o olho não vê o salto -- e o último nunca precisa desfilar de volta
 * até o primeiro.
 *
 * O arrasto com o dedo continua funcionando: quem toca assume o controle e o
 * automático só volta depois de 10s parado, senão ele briga com o gesto.
 */
export function BannerCarousel({ slides }: BannerCarouselProps) {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const retomarRef = useRef<number | null>(null);
  const paradaRef = useRef<number | null>(null);
  const total = slides.length;
  // Com um banner só não há o que girar: uma cópia, sem salto.
  const infinito = total > 1;
  const copias = infinito ? COPIAS : 1;
  /** Primeiro índice da cópia do meio -- a posição de repouso do trilho. */
  const base = infinito ? total : 0;

  // O índice é o do trilho inteiro (as três cópias), não o da lista: é ele que
  // diz qual slide está no meio e, pelo resto da divisão, qual bolinha acende.
  const [atual, setAtual] = useState(base);
  const [pausado, setPausado] = useState(false);
  const reduzido = useMenosMovimento();
  const foco = ((atual % total) + total) % total;

  const pausar = useCallback(() => {
    setPausado(true);
    if (retomarRef.current) window.clearTimeout(retomarRef.current);
    retomarRef.current = window.setTimeout(() => setPausado(false), PAUSA_APOS_TOQUE_MS);
  }, []);

  useEffect(() => () => {
    if (retomarRef.current) window.clearTimeout(retomarRef.current);
  }, []);

  // Começa na cópia do meio, senão o primeiro gesto pra cima esbarraria no
  // topo do trilho.
  useLayoutEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;

    let quadro = 0;
    const centrar = () => {
      const passo = passoDoTrilho(trilho);
      // O trilho tem aspect-ratio fixo, então o passo já existe antes de as
      // imagens carregarem -- mas se ainda for 0, tenta no quadro seguinte em
      // vez de deixar o trilho preso no topo.
      if (passo <= 0) {
        quadro = requestAnimationFrame(centrar);
        return;
      }
      trilho.scrollTop = base * passo;
      setAtual(base);
    };

    centrar();
    return () => cancelAnimationFrame(quadro);
  }, [base]);

  // Quem manda no índice é a posição real da rolagem, não um contador à parte:
  // assim arrastar com o dedo e o avanço automático nunca discordam da bolinha.
  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;

    let quadro = 0;

    // Só depois que tudo parou: mexer no scrollTop no meio de uma rolagem
    // suave cortaria a animação pela metade.
    const voltarProMeio = () => {
      if (!infinito) return;
      const passo = passoDoTrilho(trilho);
      if (passo <= 0) return;
      const indice = Math.round(trilho.scrollTop / passo);
      const alvo = base + (((indice % total) + total) % total);
      if (alvo === indice) return;
      trilho.scrollTo({ top: alvo * passo, behavior: 'auto' });
      setAtual(alvo);
    };

    const aoRolar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const passo = passoDoTrilho(trilho);
        if (passo > 0) setAtual(Math.round(trilho.scrollTop / passo));
      });

      if (paradaRef.current) window.clearTimeout(paradaRef.current);
      paradaRef.current = window.setTimeout(voltarProMeio, PARADA_MS);
    };

    trilho.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      trilho.removeEventListener('scroll', aoRolar);
      cancelAnimationFrame(quadro);
      if (paradaRef.current) window.clearTimeout(paradaRef.current);
    };
  }, [base, infinito, total]);

  useEffect(() => {
    if (pausado || reduzido || !infinito) return;

    const relogio = window.setInterval(() => {
      const trilho = trilhoRef.current;
      if (!trilho) return;
      const passo = passoDoTrilho(trilho);
      if (passo <= 0) return;
      // Sempre pra frente, sem `%`: o trilho descansa na cópia do meio, então
      // sempre sobra cópia abaixo pra onde subir. É isso que tira o rebobinar
      // do último banner de volta até o primeiro.
      const proximo = Math.round(trilho.scrollTop / passo) + 1;
      trilho.scrollTo({ top: proximo * passo, behavior: 'smooth' });
    }, INTERVALO_MS);

    return () => window.clearInterval(relogio);
  }, [pausado, reduzido, infinito]);

  const irPara = (indice: number) => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    const passo = passoDoTrilho(trilho);
    if (passo <= 0) return;

    // O banner escolhido existe nas três cópias; vai pela mais perto, senão
    // tocar na primeira bolinha estando no último desfilaria a lista inteira
    // de volta -- exatamente o que o infinito veio tirar.
    const aqui = Math.round(trilho.scrollTop / passo);
    const bloco = Math.floor(aqui / total) * total;
    const alvo = [bloco - total, bloco, bloco + total]
      .map((inicio) => inicio + indice)
      .filter((posicao) => posicao >= 0 && posicao < total * copias)
      .reduce((melhor, posicao) =>
        Math.abs(posicao - aqui) < Math.abs(melhor - aqui) ? posicao : melhor,
      );

    trilho.scrollTo({ top: alvo * passo, behavior: reduzido ? 'auto' : 'smooth' });
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
        {Array.from({ length: copias }, (_, copia) =>
          slides.map((slide, indice) => {
            const posicao = copia * total + indice;
            return (
              <BannerLink
                key={`${copia}-${slide.src}`}
                src={slide.src}
                alt={slide.alt}
                onClick={slide.onClick}
                duplicado={infinito && copia !== 1}
                // O slide do meio fica inteiro; os vizinhos, que so espiam pelas
                // bordas, entram menores e apagados -- e o contraste entre os
                // dois estados que faz o do meio ler como "o atual".
                className={posicao === atual ? 'banner-slide is-active' : 'banner-slide'}
              />
            );
          }),
        ).flat()}
      </div>

      {infinito && (
        <div className="banner-dots">
          {slides.map((slide, indice) => (
            <button
              key={slide.src}
              type="button"
              className={indice === foco ? 'banner-dot is-active' : 'banner-dot'}
              aria-label={`Ver ${slide.alt}`}
              aria-current={indice === foco}
              onClick={() => irPara(indice)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default BannerCarousel;
