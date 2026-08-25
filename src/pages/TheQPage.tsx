import { BannerLink } from '../components/theq/BannerLink';
import { NewsCard } from '../components/theq/NewsCard';
import { useNews } from '../hooks/useNews';
import './TheQPage.css';

/** Destinos que esta tela abre — pelos banners ou pelo botão de conta. */
export type TheQDestination = 'athletes' | 'shop' | 'sponsors' | 'coaches' | 'you' | 'promotions';

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
        <img src="/images/brand/theq-hero.jpg" alt="The Q MMA — Las Vegas, NV" />
        {/* Conta do usuário. Fica sobre a arte do hero porque, sem a barra
            de abas, este é o único ponto de entrada para a tela You. */}
        <button type="button" className="theq-you" onClick={go('you')} aria-label="Minha conta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
        </button>
      </div>

      <div className="theq-section-banner">
        <img src="/images/brand/banner-news.jpg" alt="Notícias e eventos" />
      </div>

      <div className="news-feed">
        {loading && news.length === 0 ? (
          <p className="news-empty">Carregando novidades…</p>
        ) : news.length === 0 ? (
          <p className="news-empty">Nenhuma novidade por enquanto. Volte em breve.</p>
        ) : (
          news.map((item) => <NewsCard key={item.id} item={item} />)
        )}
      </div>

      <BannerLink
        src="/images/brand/banner-athletes.jpg"
        alt="Ver os atletas do time"
        onClick={go('athletes')}
      />
      <BannerLink
        src="/images/brand/banner-promotions.png"
        alt="Divulgar sua marca com um atleta"
        onClick={go('promotions')}
      />
      <BannerLink
        src="/images/brand/banner-shopnow.png"
        alt="Ir para a loja"
        onClick={go('shop')}
      />
      <BannerLink
        src="/images/brand/banner-coaches.png"
        alt="Conhecer os treinadores"
        onClick={go('coaches')}
      />
      <BannerLink
        src="/images/brand/banner-sponsors.jpg"
        alt="Ver os patrocinadores oficiais"
        onClick={go('sponsors')}
      />

      <BannerLink
        src="/images/brand/banner-instagram.jpg"
        alt="Seguir The Q MMA no Instagram"
        href={INSTAGRAM_URL}
        className="banner-instagram"
      />
    </div>
  );
}

export default TheQPage;
