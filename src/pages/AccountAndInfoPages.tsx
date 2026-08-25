import { useCart } from '../context/CartContext';
import { useNav } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { coaches, sponsors } from '../data/shop';
import { BackBar } from '../components/shop/ShopParts';
import '../styles/shop.css';
import '../styles/auth.css';
import '../styles/support.css';

/* ---------------------------------------------------------------- You ---- */

export function YouPage() {
  const { count } = useCart();
  const { closeOverlay, openOverlay } = useNav();
  const { usuario, ehAdmin, carregando, sair } = useAuth();

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
          <span className="wordmark">My account</span>
        </div>
      </header>

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
        <div className="memcard">
          <div className="tier">Fan since 2024</div>
          <h3>
            Member
            <br />
            The Q MMA
          </h3>
          <p>Order updates, athlete news, and exclusive app releases.</p>
        </div>
      )}

      {!usuario && !carregando && (
        <button
          type="button"
          className="listrow"
          onClick={() => openOverlay({ name: 'auth' })}
        >
          Sign in or create account <span>›</span>
        </button>
      )}

      <button type="button" className="listrow" onClick={() => openOverlay({ name: 'cart' })}>
        Cart <span>{count}</span>
      </button>
      <button type="button" className="listrow" onClick={() => openOverlay({ name: 'athletes' })}>
        Athletes <span>›</span>
      </button>
      <button type="button" className="listrow" onClick={() => openOverlay({ name: 'shop' })}>
        Shop <span>›</span>
      </button>

      <button
        type="button"
        className="listrow"
        onClick={() => openOverlay({ name: usuario ? 'orders' : 'auth' })}
      >
        My orders <span>{usuario ? '›' : 'Sign in'}</span>
      </button>
      <button
        type="button"
        className="listrow"
        onClick={() => openOverlay({ name: usuario ? 'my-promotions' : 'auth' })}
      >
        My promotions <span>{usuario ? '›' : 'Sign in'}</span>
      </button>
      <button
        type="button"
        className="listrow"
        onClick={() => openOverlay({ name: usuario ? 'my-bids' : 'auth' })}
      >
        My bids <span>{usuario ? '›' : 'Sign in'}</span>
      </button>
      <button type="button" className="listrow" disabled>
        Addresses &amp; payment <span>{usuario ? 'Em breve' : 'Sign in'}</span>
      </button>
      <button
        type="button"
        className="listrow"
        onClick={() => openOverlay({ name: 'support' })}
      >
        <span className="listrow-titulo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M4 14v-2a8 8 0 0116 0v2" />
            <path d="M4 14h2a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
            <path d="M20 14h-2a1 1 0 00-1 1v3a1 1 0 001 1h1a1 1 0 001-1z" />
            <path d="M20 19a3 3 0 01-3 3h-2" />
          </svg>
          Help &amp; Support
        </span>
        <span>›</span>
      </button>

      {/* Esconder a linha é conveniência, não segurança: quem barra de fato é
          o RLS no Supabase, que só entrega os chamados a quem é admin. */}
      {ehAdmin && (
        <button
          type="button"
          className="listrow"
          onClick={() => openOverlay({ name: 'admin-orders' })}
        >
          <span className="listrow-titulo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M3 7l9-4 9 4-9 4-9-4z" />
              <path d="M3 7v10l9 4 9-4V7" />
              <path d="M12 11v10" />
            </svg>
            Orders to ship
          </span>
          <span>›</span>
        </button>
      )}

      {ehAdmin && (
        <button
          type="button"
          className="listrow"
          onClick={() => openOverlay({ name: 'admin-support' })}
        >
          <span className="listrow-titulo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M4 5h16v11H8l-4 4z" />
            </svg>
            Support inbox
          </span>
          <span>›</span>
        </button>
      )}

      {ehAdmin && (
        <button
          type="button"
          className="listrow"
          onClick={() => openOverlay({ name: 'admin-news' })}
        >
          <span className="listrow-titulo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M7 8h10M7 12h10M7 16h6" />
            </svg>
            News &amp; Events
          </span>
          <span>›</span>
        </button>
      )}

      {ehAdmin && (
        <button
          type="button"
          className="listrow"
          onClick={() => openOverlay({ name: 'admin-promotion-athletes' })}
        >
          <span className="listrow-titulo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            Promotion athletes
          </span>
          <span>›</span>
        </button>
      )}

      {ehAdmin && (
        <button
          type="button"
          className="listrow"
          onClick={() => openOverlay({ name: 'admin-promotions' })}
        >
          <span className="listrow-titulo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            Promotion requests
          </span>
          <span>›</span>
        </button>
      )}

      {ehAdmin && (
        <button
          type="button"
          className="listrow"
          onClick={() => openOverlay({ name: 'admin-auctions' })}
        >
          <span className="listrow-titulo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M14 3l7 7-8.5 8.5a2.12 2.12 0 01-3 0l-4-4a2.12 2.12 0 010-3L14 3z" />
              <path d="M14 3l7 7" />
              <path d="M4.5 15.5L2 22l6.5-2.5" />
            </svg>
            Vault items
          </span>
          <span>›</span>
        </button>
      )}

      {ehAdmin && (
        <button
          type="button"
          className="listrow"
          onClick={() => openOverlay({ name: 'admin-auction-queue' })}
        >
          <span className="listrow-titulo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M8 2v4M16 2v4M3 10h18" />
              <path d="M8 15l2.5 2.5L16 12" />
            </svg>
            Vault orders &amp; bids
          </span>
          <span>›</span>
        </button>
      )}

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
  );
}

/* ------------------------------------------------------------ Coaches ---- */

export function CoachesPage() {
  const { closeOverlay } = useNav();

  return (
    <div className="sub-screen">
      <BackBar label="Coaches" onBack={closeOverlay} />
      <div className="coach-grid">
        {coaches.map((coach) => (
          <article key={coach.id} className="coach-card">
            <div className="coach-photo">
              <img src={coach.photo} alt={coach.name} loading="lazy" />
            </div>
            <div className="coach-body">
              <h4>{coach.name}</h4>
              <div className="spec">{coach.role}</div>
              <p className="bio">{coach.bio}</p>
              <p className="bio coach-meta">
                {coach.belt}
                <br />
                {coach.city}
              </p>
              <a
                className="coach-ig"
                href={coach.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                </svg>
                <b>Instagram</b>
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Sponsors ---- */

export function SponsorsPage() {
  const { closeOverlay } = useNav();

  return (
    <div className="sub-screen">
      <BackBar label="Official sponsors" onBack={closeOverlay} />
      <div className="sponsor-rail">
        {sponsors.map((sponsor) => (
          <article
            key={sponsor.id}
            className={`sponsor-card ${sponsor.featured ? 'featured' : ''}`}
          >
            <div className="sponsor-logo-wrap">
              <img src={sponsor.logo} alt={sponsor.name} loading="lazy" />
              {sponsor.featured && <span className="sponsor-badge">Official partner</span>}
            </div>
            <div className="sponsor-info">
              <div className="sname">{sponsor.name}</div>
              <p className="sdesc">{sponsor.description}</p>
              {sponsor.website && (
                <a
                  className="slearn"
                  href={sponsor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Check It Out
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
