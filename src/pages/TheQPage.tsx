import { BannerLink } from '../components/theq/BannerLink';
import { NewsCard } from '../components/theq/NewsCard';
import { useNews } from '../hooks/useNews';
import './TheQPage.css';

/** Destinos que os banners desta tela abrem. */
export type TheQDestination = 'athletes' | 'shop' | 'sponsors' | 'coaches';

interface TheQPageProps {
  /** Chamado quando um banner é tocado. Ligue na navegação do App. */
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
      </div>

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
        src="/images/brand/banner-shopnow.png"
        alt="Ir para a loja"
        onClick={go('shop')}
      />
      <BannerLink
        src="/images/brand/banner-sponsors.jpg"
        alt="Ver os patrocinadores oficiais"
        onClick={go('sponsors')}
      />

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
        src="/images/brand/banner-instagram.jpg"
        alt="Seguir The Q MMA no Instagram"
        href={INSTAGRAM_URL}
      />
    </div>
  );
}

export default TheQPage;
