import { BannerLink } from '../components/theq/BannerLink';
import RecursiveErosionBackground from '../components/ui/recursive-erosion';
import { NewsCarousel } from '../components/theq/NewsCarousel';
import { useNews } from '../hooks/useNews';
import './TheQPage.css';

/** Destinos que esta tela abre — pelos banners ou pelo botão de conta. */
export type TheQDestination =
  | 'athletes'
  | 'shop'
  | 'sponsors'
  | 'coaches'
  | 'you'
  | 'promotions'
  | 'vault'
  | 'visitor-request'
  | 'my-visitor-request';

interface TheQPageProps {
  /** Chamado quando um banner ou o botão de conta é tocado. */
  onNavigate?: (destination: TheQDestination) => void;
}

const INSTAGRAM_URL = 'https://www.instagram.com/the_qmma/';

export function TheQPage({ onNavigate }: TheQPageProps) {
  const { news, loading } = useNews();

  const go = (destination: TheQDestination) => () => onNavigate?.(destination);

  return (
    <div className="theq-screen">
      <div className="theq-hero">
        {/* Fundo animado atrás da marca. aria-hidden porque é decoração pura:
            quem usa leitor de tela precisa ouvir o alt do logo, não a esfera. */}
        <div className="theq-hero-bg" aria-hidden="true">
          <RecursiveErosionBackground mode="dark" />
        </div>
        {/* Logo no canto, pareado com o botão de conta do outro lado: saiu do
            centro pra esfera aparecer inteira, que é o ponto do fundo animado. */}
        <img className="theq-hero-logo" src="/images/brand/logo-theq.png" alt="The Q MMA" />
        {/* Único texto sobre a animação. Era pintado na arte antiga
            (theq-hero.jpg); virou texto quando o JPG saiu. */}
        <span className="theq-hero-city">Las Vegas, NV</span>
        {/* Conta do usuário. Fica sobre a arte do hero porque, sem a barra
            de abas, este é o único ponto de entrada para a tela You. */}
        <button type="button" className="theq-you" onClick={go('you')} aria-label="Minha conta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
        </button>
      </div>

      {/* Era um JPG com o texto pintado (banner-news.jpg). Virou texto de
          verdade pra receber o gradiente dourado -- e de quebra fica legível
          em leitor de tela e nítido em qualquer densidade de tela. */}
      <header className="news-heading">
        <h2>News &amp; Events</h2>
        <p>Stay updated. Never miss a moment.</p>
      </header>

      {loading && news.length === 0 ? (
        <p className="news-empty">Carregando novidades…</p>
      ) : news.length === 0 ? (
        <p className="news-empty">Nenhuma novidade por enquanto. Volte em breve.</p>
      ) : (
        <NewsCarousel items={news} />
      )}

      <BannerLink
        src="/images/brand/banner-visitorclass.png"
        alt="Pedir uma aula de visitante na academia"
        onClick={go('my-visitor-request')}
      />
      <BannerLink
        src="/images/brand/banner-athletes.jpg"
        alt="Ver os atletas do time"
        onClick={go('athletes')}
      />
      <BannerLink
        src="/images/brand/banner-coaches.png"
        alt="Conhecer os treinadores"
        onClick={go('coaches')}
      />
      <BannerLink
        src="/images/brand/banner-promotions.png"
        alt="Divulgar sua marca com um atleta"
        onClick={go('promotions')}
        className="banner-respiro"
      />
      <BannerLink
        src="/images/brand/banner-shopnow.png"
        alt="Ir para a loja"
        onClick={go('shop')}
      />
      <BannerLink
        src="/images/brand/banner-vault.png"
        alt="Ver o leilão de itens dos atletas"
        onClick={go('vault')}
      />
      <BannerLink
        src="/images/brand/banner-sponsors.jpg"
        alt="Ver os patrocinadores oficiais"
        onClick={go('sponsors')}
      />

      <BannerLink
        src="/images/brand/banner-instagram.png"
        alt="Seguir The Q MMA no Instagram"
        href={INSTAGRAM_URL}
      />
    </div>
  );
}

export default TheQPage;
