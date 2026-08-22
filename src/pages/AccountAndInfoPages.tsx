import { useCart } from '../context/CartContext';
import { useNav } from '../context/NavigationContext';
import { coaches, sponsors } from '../data/shop';
import { BackBar } from '../components/shop/ShopParts';
import '../styles/shop.css';

/* ---------------------------------------------------------------- You ---- */

export function YouPage() {
  const { count } = useCart();
  const { closeOverlay, openOverlay } = useNav();

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

      <div className="memcard">
        <div className="tier">Fan since 2024</div>
        <h3>
          Member
          <br />
          The Q MMA
        </h3>
        <p>Order updates, athlete news, and exclusive app releases.</p>
      </div>

      <button type="button" className="listrow" onClick={() => openOverlay({ name: 'cart' })}>
        Cart <span>{count}</span>
      </button>
      <button type="button" className="listrow" onClick={() => openOverlay({ name: 'athletes' })}>
        Athletes <span>›</span>
      </button>
      <button type="button" className="listrow" onClick={() => openOverlay({ name: 'shop' })}>
        Shop <span>›</span>
      </button>

      {/* Estas precisam de login para funcionar de verdade. */}
      <button type="button" className="listrow" disabled>
        My orders <span>Sign in</span>
      </button>
      <button type="button" className="listrow" disabled>
        Addresses &amp; payment <span>Sign in</span>
      </button>
      <button type="button" className="listrow" disabled>
        Help &amp; returns <span>Em breve</span>
      </button>
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
                  Learn more
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
