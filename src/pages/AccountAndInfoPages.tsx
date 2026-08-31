import { useState, type ReactNode } from 'react';
import { ArrowLeft, BookOpen, Calendar, ChevronLeft, Crosshair, ExternalLink, MapPin, Settings, Star, User, Users } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNav } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { coaches, sponsors } from '../data/shop';
import type { Coach, Sponsor } from '../types/shop';
import { useVisitorPendingCount } from '../hooks/useAdminVisitors';
import '../styles/shop.css';
import '../styles/auth.css';
import '../styles/support.css';
import '../styles/menu.css';
import '../styles/coaches.css';
import '../styles/sponsors.css';

/* ---------------------------------------------------------------- You ---- */

type AbaMenu = 'main' | 'admin';

/**
 * Tela You no formato "Menu": grade de cards com ícones dourados, separada
 * em Main (todo mundo) e Admin (só contas da equipe -- e esconder a aba é
 * conveniência, não segurança: o RLS é quem barra de fato cada tela).
 */
export function YouPage() {
  const { count } = useCart();
  const { closeOverlay, openOverlay } = useNav();
  const { usuario, ehAdmin, carregando, sair } = useAuth();
  const pendentesVisitantes = useVisitorPendingCount(ehAdmin);
  const [aba, setAba] = useState<AbaMenu>('main');

  const nome = (usuario?.user_metadata?.full_name as string | undefined) ?? usuario?.email ?? '';
  const inicial = nome.trim().charAt(0) || '?';

  return (
    <div className="you-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        </div>
      </header>

      <div className="menu-cabeca">
        <h2 className="menu-titulo">Menu</h2>
        <div className="menu-divisor" />
      </div>

      {usuario ? (
        <div className="conta-logada">
          <div className="conta-avatar" aria-hidden>
            {inicial}
          </div>
          <div className="conta-info">
            <b>{nome}</b>
            <span>{usuario.email}</span>
            {ehAdmin && <span className="selo-admin">Admin</span>}
          </div>
          <button type="button" className="conta-sair" onClick={sair}>
            Sign out
          </button>
        </div>
      ) : (
        !carregando && (
          <button
            type="button"
            className="btn conta-entrar"
            onClick={() => openOverlay({ name: 'auth' })}
          >
            Sign in or create account
          </button>
        )
      )}

      {ehAdmin && (
        <div className="menu-abas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'main'}
            className={`menu-aba ${aba === 'main' ? 'on' : ''}`}
            onClick={() => setAba('main')}
          >
            Main
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'admin'}
            className={`menu-aba ${aba === 'admin' ? 'on' : ''}`}
            onClick={() => setAba('admin')}
          >
            Admin
          </button>
        </div>
      )}

      {aba === 'main' ? (
        <div className="menu-grade">
          {/* Athletes e Shop entram pelos banners da home -- eram os mesmos
              destinos duplicados aqui. */}
          <MenuCard rotulo="Cart" badge={count} onClick={() => openOverlay({ name: 'cart' })}>
            <IconeCarrinho />
          </MenuCard>
          <MenuCard rotulo="My Orders" onClick={() => openOverlay({ name: usuario ? 'orders' : 'auth' })}>
            <IconeCaixa />
          </MenuCard>
          <MenuCard
            rotulo="My Promotions"
            onClick={() => openOverlay({ name: usuario ? 'my-promotions' : 'auth' })}
          >
            <IconeIngresso />
          </MenuCard>
          <MenuCard rotulo="My Bids" onClick={() => openOverlay({ name: usuario ? 'my-bids' : 'auth' })}>
            <IconeMartelo />
          </MenuCard>
          {/* Pedido de visita entra só pelo banner da home -- era o mesmo
              destino duplicado aqui. */}
          <MenuCard rotulo="Addresses & Payment" breve>
            <IconeCarteira />
          </MenuCard>
          <MenuCard rotulo="Help & Support" onClick={() => openOverlay({ name: 'support' })}>
            <IconeFone />
          </MenuCard>
        </div>
      ) : (
        <div className="menu-grade">
          <MenuCard rotulo="Orders to Ship" onClick={() => openOverlay({ name: 'admin-orders' })}>
            <IconeCaixa />
          </MenuCard>
          <MenuCard rotulo="Support Inbox" onClick={() => openOverlay({ name: 'admin-support' })}>
            <IconeBalao />
          </MenuCard>
          <MenuCard rotulo="News & Events" onClick={() => openOverlay({ name: 'admin-news' })}>
            <IconeJornal />
          </MenuCard>
          <MenuCard
            rotulo="Promotion Athletes"
            onClick={() => openOverlay({ name: 'admin-promotion-athletes' })}
          >
            <IconePulso />
          </MenuCard>
          <MenuCard rotulo="Promotion Requests" onClick={() => openOverlay({ name: 'admin-promotions' })}>
            <IconeChecagem />
          </MenuCard>
          <MenuCard rotulo="Vault Items" onClick={() => openOverlay({ name: 'admin-auctions' })}>
            <IconeEtiqueta />
          </MenuCard>
          <MenuCard rotulo="Vault Orders & Bids" onClick={() => openOverlay({ name: 'admin-auction-queue' })}>
            <IconeAgenda />
          </MenuCard>
          <MenuCard rotulo="Fight Records" onClick={() => openOverlay({ name: 'admin-fights' })}>
            <IconeTrofeu />
          </MenuCard>
          <MenuCard
            rotulo="Visitor Requests"
            badge={pendentesVisitantes}
            onClick={() => openOverlay({ name: 'admin-visitors' })}
          >
            <IconePessoa />
          </MenuCard>
        </div>
      )}

      <div className="menu-rodape">
        <p className="cart-note" style={{ textAlign: 'center', margin: '18px 0 0' }}>
          <a href="/terms">Terms of Service</a> · <a href="/privacy">Privacy Policy</a>
        </p>

        {usuario && (
          <p style={{ textAlign: 'center', margin: '10px 0 0' }}>
            <button
              type="button"
              className="empty-link"
              style={{ fontSize: 12 }}
              onClick={() => openOverlay({ name: 'delete-account' })}
            >
              Delete account
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- card do menu -- */

function MenuCard({
  rotulo,
  badge,
  breve,
  onClick,
  children,
}: {
  rotulo: string;
  badge?: number;
  breve?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (breve) {
    return (
      <div className="menu-card breve">
        <span className="menu-card-icone">{children}</span>
        <span className="menu-card-rotulo">{rotulo}</span>
        <span className="menu-card-breve">Coming Soon</span>
      </div>
    );
  }

  return (
    <button type="button" className="menu-card" onClick={onClick}>
      {badge !== undefined && badge > 0 && <span className="menu-card-badge">{badge}</span>}
      <span className="menu-card-icone">{children}</span>
      <span className="menu-card-rotulo">{rotulo}</span>
    </button>
  );
}

/* Ícones em traço, todos no mesmo peso, pra grade ler como uma família. */

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IconeCarrinho() {
  return (
    <Svg>
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
      <path d="M3 4h2.2L7.6 16h10.2l2.7-8.5H6" />
    </Svg>
  );
}

function IconeCaixa() {
  return (
    <Svg>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </Svg>
  );
}

function IconeIngresso() {
  return (
    <Svg>
      <path d="M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z" />
      <path d="M12 9.6l.8 1.6 1.8.3-1.3 1.2.3 1.8-1.6-.8-1.6.8.3-1.8-1.3-1.2 1.8-.3z" />
    </Svg>
  );
}

function IconeMartelo() {
  return (
    <Svg>
      <path d="M14 3l7 7-8.5 8.5a2.12 2.12 0 01-3 0l-4-4a2.12 2.12 0 010-3L14 3z" />
      <path d="M4.5 15.5L2 22l6.5-2.5" />
    </Svg>
  );
}

function IconeCarteira() {
  return (
    <Svg>
      <path d="M4 7h14a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
      <path d="M4 7V6a2 2 0 012-2h11" />
      <circle cx="16.5" cy="14.5" r="1" />
    </Svg>
  );
}

function IconeFone() {
  return (
    <Svg>
      <path d="M4 14v-2a8 8 0 0116 0v2" />
      <path d="M4 14h2a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
      <path d="M20 14h-2a1 1 0 00-1 1v3a1 1 0 001 1h1a1 1 0 001-1z" />
      <path d="M20 19a3 3 0 01-3 3h-2" />
    </Svg>
  );
}

function IconeBalao() {
  return (
    <Svg>
      <path d="M4 5h16v11H8l-4 4z" />
    </Svg>
  );
}

function IconeJornal() {
  return (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </Svg>
  );
}

function IconePulso() {
  return (
    <Svg>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </Svg>
  );
}

function IconeChecagem() {
  return (
    <Svg>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </Svg>
  );
}

function IconeEtiqueta() {
  return (
    <Svg>
      <path d="M3 3h8l10 10-8 8L3 11z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </Svg>
  );
}

function IconeAgenda() {
  return (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
      <path d="M8 15l2.5 2.5L16 12" />
    </Svg>
  );
}

function IconeTrofeu() {
  return (
    <Svg>
      <path d="M7 4h10v5a5 5 0 01-10 0z" />
      <path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3" />
      <path d="M12 14v3M9 20h6M10 17h4" />
    </Svg>
  );
}

function IconePessoa() {
  return (
    <Svg>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0114 0" />
    </Svg>
  );
}

/* ------------------------------------------------------------ Coaches ---- */

/* A luva, o escudo com estrela e o cavalo do xadrez do cartaz não existem no
   lucide (a biblioteca de ícones do app), então vêm desenhados aqui. O resto
   dos ícones da tela é lucide. */

function IconeLuva() {
  return (
    <Svg>
      <path d="M9 10a4.5 4.5 0 0 1 9 0v4.5a3.5 3.5 0 0 1-3.5 3.5h-2A3.5 3.5 0 0 1 9 14.5z" />
      <path d="M9 11.5H7.5A2.5 2.5 0 0 0 7.5 16.5H9" />
      <path d="M9.5 18h8v1.6a1.4 1.4 0 0 1-1.4 1.4h-5.2A1.4 1.4 0 0 1 9.5 19.6z" />
    </Svg>
  );
}

function IconeEscudoEstrela() {
  return (
    <Svg>
      <path d="M12 3l7 2.8v5.2c0 4.3-3 8.1-7 9.3-4-1.2-7-5-7-9.3V5.8z" />
      <path d="M12 8.4l1.25 2.5 2.75.4-2 1.95.47 2.75L12 14.7l-2.47 1.3.47-2.75-2-1.95 2.75-.4z" />
    </Svg>
  );
}

function IconeCavalo() {
  return (
    <Svg>
      <path d="M7.5 21h9" />
      <path d="M9.5 21c0-3.1 1.3-4.9 3.6-6.5" />
      <path d="M13.1 14.5 9.6 15.7a2.1 2.1 0 0 1-2.4-3.1l2-2.9A7 7 0 0 1 12 7V3.9l2.7 1.7A7 7 0 0 1 18 11.6V21" />
      <circle cx="10.4" cy="10.6" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

function IconeInstagram() {
  return (
    <Svg>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Um ícone por número, na ordem em que os stats estão cadastrados. */
const ICONES_STAT = [Calendar, IconeLuva, IconeEscudoEstrela];

/** Idem para as frentes de trabalho do bloco Expertise. */
const ICONES_EXPERTISE = [IconeCavalo, Settings, Crosshair];

export function CoachesPage() {
  const { closeOverlay } = useNav();

  return (
    <div className="coaches-screen">
      <header className="co-bar">
        <button type="button" className="co-bar-back" onClick={closeOverlay} aria-label="Voltar">
          <ArrowLeft size={22} strokeWidth={2} aria-hidden />
        </button>
        <img className="co-bar-logo" src="/images/brand/logo-theq.png" alt="THE Q MMA" />
        <span className="co-bar-divisor" aria-hidden />
        <h1 className="co-bar-titulo">Coaches</h1>
      </header>

      {coaches.map((coach) => (
        <CoachCard key={coach.id} coach={coach} />
      ))}
    </div>
  );
}

/**
 * A bio do coach tem duas versões: a curta fica sempre à vista e a completa
 * abre no botão "Read full bio". Cabe tudo num bloco só porque a longa passa
 * de seis parágrafos -- aberta de cara, ela empurraria o Instagram e a cidade
 * pra muito longe da dobra.
 */
function CoachCard({ coach }: { coach: Coach }) {
  const [aberto, setAberto] = useState(false);
  const idBio = `coach-bio-${coach.id}`;

  return (
    <article className="co-card">
      <div className="co-foto">
        <img src={coach.photo} alt={coach.name} loading="lazy" />
      </div>

      <h2 className="co-nome">{coach.name}</h2>
      <p className="co-role">{coach.role}</p>
      {coach.disciplines.length > 0 && (
        <ul className="co-disciplinas">
          {coach.disciplines.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}

      {coach.stats.length > 0 && (
        <div className="co-stats">
          {coach.stats.map((stat, i) => {
            const Icone = ICONES_STAT[i] ?? IconeEscudoEstrela;
            return (
              <div key={stat.label} className="co-stat">
                <Icone aria-hidden />
                <b>{stat.value}</b>
                <span>{stat.label}</span>
              </div>
            );
          })}
        </div>
      )}

      <h3 className="co-sec-titulo">
        <User aria-hidden /> Coach profile
      </h3>
      <div className="co-box">
        <p>{coach.bio}</p>

        {aberto && (
          <div id={idBio}>
            {coach.fullBio.map((paragrafo) => (
              <p key={paragrafo.slice(0, 40)}>{paragrafo}</p>
            ))}

            {coach.quote && <p className="co-quote">{coach.quote}</p>}

            <span className="co-label">Athletes coached</span>
            <p>{coach.notable}</p>

            <span className="co-label">Credentials</span>
            <p>
              {coach.belt} · {coach.specialty}
            </p>
          </div>
        )}
      </div>

      {coach.expertise.length > 0 && (
        <>
          <h3 className="co-sec-titulo">
            <Star aria-hidden /> Expertise
          </h3>
          <ul className="co-expertise">
            {coach.expertise.map((item, i) => {
              const Icone = ICONES_EXPERTISE[i] ?? Star;
              return (
                <li key={item}>
                  <Icone aria-hidden />
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <button
        type="button"
        className="co-btn"
        onClick={() => setAberto((estava) => !estava)}
        aria-expanded={aberto}
        aria-controls={idBio}
      >
        <BookOpen aria-hidden />
        {aberto ? 'Show less' : 'Read full bio'}
      </button>

      <a
        className="co-btn cheio"
        href={coach.instagram}
        target="_blank"
        rel="noopener noreferrer"
      >
        <IconeInstagram />
        Instagram
      </a>

      <p className="co-local">
        <MapPin aria-hidden />
        {coach.city}
      </p>
    </article>
  );
}


/* ----------------------------------------------------------- Sponsors ---- */

/** Carta de coleção do primeiro destaque -- o lucide não tem esse desenho. */
function IconeCarta() {
  return (
    <Svg>
      <rect x="6" y="3.5" width="12" height="17" rx="2" />
      <path d="M12 8l1.15 2.3 2.55.37-1.85 1.8.44 2.53L12 13.8l-2.29 1.2.44-2.53-1.85-1.8 2.55-.37z" />
    </Svg>
  );
}

/** Um ícone por destaque, na ordem em que estão cadastrados. */
const ICONES_HIGHLIGHT = [IconeCarta, Users];

export function SponsorsPage() {
  const { closeOverlay, openOverlay } = useNav();

  const destaques = sponsors.filter((s) => s.featured);
  const demais = sponsors.filter((s) => !s.featured);

  return (
    <div className="sp-screen">
      <header className="sp-bar">
        <button type="button" className="sp-bar-back" onClick={closeOverlay} aria-label="Voltar">
          <ChevronLeft size={24} strokeWidth={2} aria-hidden />
        </button>
        <img className="sp-bar-logo" src="/images/brand/logo-theq.png" alt="THE Q MMA" />
        <span className="sp-bar-divisor" aria-hidden />
        <h1 className="sp-bar-titulo">Official sponsors</h1>
      </header>

      <div className="sp-hero">
        <img
          className="sp-hero-art"
          src="/images/brand/hero-sponsors-arena.webp"
          alt=""
          aria-hidden
        />
        <div className="sp-hero-texto">
          <h2>
            <span>Powering</span>
            <span>the team</span>
          </h2>
          <p>Meet the partners supporting The Q MMA.</p>
        </div>
      </div>

      {destaques.length > 0 && (
        <>
          <h3 className="sp-sec">{destaques.length > 1 ? 'Featured partners' : 'Featured partner'}</h3>
          {destaques.map((sponsor) => (
            <SponsorCard key={sponsor.id} sponsor={sponsor} />
          ))}
        </>
      )}

      {demais.length > 0 && (
        <>
          <h3 className="sp-sec">Partners</h3>
          {demais.map((sponsor) => (
            <SponsorCard key={sponsor.id} sponsor={sponsor} />
          ))}
        </>
      )}

      {sponsors.length === 0 && <p className="sp-vazio">No partners announced yet.</p>}

      {/* "Become a partner" abre o suporte: é o único canal de contato que o
          app tem hoje, e um botão que não leva a lugar nenhum seria pior que
          não ter botão. */}
      <div className="sp-cta">
        <img className="sp-cta-crest" src="/images/brand/crest-theq.webp" alt="" aria-hidden />
        <div className="sp-cta-texto">
          <h3>Build with The Q</h3>
          <p>Connect your brand with our athletes, events, and community.</p>
          <button type="button" onClick={() => openOverlay({ name: 'support' })}>
            Become a partner
          </button>
        </div>
      </div>

      <footer className="sp-footer">
        Official partnerships <span aria-hidden>•</span> The Q MMA
      </footer>
    </div>
  );
}

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  return (
    <article className={`sp-card ${sponsor.featured ? 'destaque' : ''}`}>
      <div className="sp-logo">
        {sponsor.featured && <span className="sp-selo">Official partner</span>}
        <img src={sponsor.logo} alt={sponsor.name} loading="lazy" />
      </div>

      <div className="sp-info">
        <h4>{sponsor.name}</h4>
        <p>{sponsor.description}</p>

        {sponsor.highlights && sponsor.highlights.length > 0 && (
          <ul className="sp-highlights">
            {sponsor.highlights.map((item, i) => {
              const Icone = ICONES_HIGHLIGHT[i] ?? IconeCarta;
              return (
                <li key={item}>
                  <span className="sp-highlight-icone" aria-hidden>
                    <Icone />
                  </span>
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
        )}

        {sponsor.website && (
          <a className="sp-visit" href={sponsor.website} target="_blank" rel="noopener noreferrer">
            Visit partner
            <ExternalLink size={17} strokeWidth={1.8} aria-hidden />
          </a>
        )}
      </div>
    </article>
  );
}

