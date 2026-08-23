import { useState } from 'react';
import { useNav } from '../context/NavigationContext';
import { fighters } from '../data/fighters';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/shop/ShopParts';
import type { ScheduledBout } from '../data/fighters';
import '../styles/shop.css';
import '../styles/fighter.css';

type Panel = 'profile' | 'fights' | 'products';

function BoutCard({ bout, isNext }: { bout: ScheduledBout; isNext: boolean }) {
  return (
    <div className={`fightcard ${isNext ? 'next' : ''}`}>
      <div className="when">{isNext ? 'Next fight' : 'Last fight'}</div>
      <div className="vs">
        <strong>{bout.opponent}</strong>
        <em>
          {bout.myRecord} · {bout.opponentRecord}
        </em>
      </div>
      <div className="where">
        {bout.division} · {bout.when}
      </div>

      {bout.result && (
        <div className="boutresult">
          <span className={`boutpill ${bout.result}`}>
            {bout.result === 'win' ? 'Win' : 'Loss'} · {bout.method}
          </span>
          <small>{bout.time}</small>
        </div>
      )}

      {/* Antes só a luta futura mostrava o local. Uma luta passada com cidade
          registrada tem a mesma informação e não havia motivo para escondê-la. */}
      {(bout.venue || bout.city || bout.broadcaster) && (
        <div className="where">
          {[bout.venue, bout.city, bout.broadcaster].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  );
}

export function FighterPage({ slug }: { slug: string }) {
  const fighter = fighters.find((f) => f.slug === slug);
  const { closeOverlay, openOverlay } = useNav();
  const { produtos } = useProducts();
  const [panel, setPanel] = useState<Panel>('profile');
  const [showRecord, setShowRecord] = useState(false);
  const [following, setFollowing] = useState(false);

  if (!fighter) {
    return (
      <div>
        <button type="button" className="fh-back" onClick={closeOverlay} aria-label="Voltar">
          ‹
        </button>
        <p className="empty">Atleta não encontrado.</p>
      </div>
    );
  }

  const wins = fighter.record_list.filter((b) => b.result === 'W');
  const subs = wins.filter((b) => b.method.startsWith('Submission')).length;
  const kos = wins.filter((b) => b.method.startsWith('TKO') || b.method.startsWith('KO')).length;

  const athleteProducts = produtos.filter((p) => p.owner === fighter.slug);
  const [firstName, ...rest] = fighter.name.split(' ');

  return (
    <div className="fighter-screen">
      <div className="fighter-hero">
        <button type="button" className="fh-back" onClick={closeOverlay} aria-label="Voltar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        {/* Bandeira do país como marca d'água, atrás da foto. */}
        <img className="fh-flag" src={`/images/flags/${fighter.country}.svg`} alt="" aria-hidden />

        <img className="fh-photo" src={fighter.photo} alt="" />
        <div className="fh-scrim" />

        {/* O apelido sumia por cima da foto quando era só texto dourado, então
            ganhou uma tarja com borda, como a do hero da aba Athletes. */}
        <div className="nick">{fighter.nickname}</div>
        <h2>
          {firstName}
          <br />
          {rest.join(' ')}
        </h2>
        <div className="recordrow">
          <div>
            <b>{fighter.record}</b>
            <i>Record</i>
          </div>
          <div>
            <b>{fighter.age}</b>
            <i>Age</i>
          </div>
          <div>
            <b>{fighter.divisionShort}</b>
            <i>Division</i>
          </div>
        </div>
      </div>

      <div className="followbar">
        <button
          type="button"
          className={`btn ${following ? 'ghost' : ''}`}
          onClick={() => setFollowing((v) => !v)}
        >
          {following ? 'Following' : 'Follow athlete'}
        </button>
      </div>

      <div className="tabs" role="tablist">
        {(['profile', 'fights', 'products'] as Panel[]).map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={panel === name}
            className={`tab ${panel === name ? 'on' : ''}`}
            onClick={() => setPanel(name)}
          >
            {name === 'profile' ? 'Profile' : name === 'fights' ? 'Fights' : 'Products'}
          </button>
        ))}
      </div>

      {panel === 'profile' && (
        <div className="panel">
          <div className="camplist">
            {fighter.bio.map(([label, value]) => (
              <div key={label} className="camprow">
                <span className="what">
                  <small>{label}</small>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {panel === 'fights' && (
        <div className="panel">
          {fighter.nextFight ? (
            <BoutCard bout={fighter.nextFight} isNext />
          ) : (
            <div className="fightcard next">
              <div className="when">Next fight</div>
              <div className="vs">
                <strong>TBA</strong>
              </div>
              <div className="where">Aparece aqui assim que a luta for anunciada.</div>
            </div>
          )}

          {fighter.lastFight && <BoutCard bout={fighter.lastFight} isNext={false} />}

          <button
            type="button"
            className="btn ghost"
            onClick={() => setShowRecord((v) => !v)}
            aria-expanded={showRecord}
          >
            {showRecord ? 'Hide full record' : `View full record (${fighter.record})`}
          </button>

          {showRecord && (
            <>
              <div className="recsum">
                <div>
                  <b>{wins.length}</b>
                  <i>Wins</i>
                </div>
                <div>
                  <b>{subs + kos}</b>
                  <i>Finishes</i>
                </div>
                <div>
                  <b>
                    {subs}/{kos}
                  </b>
                  <i>Sub / KO</i>
                </div>
              </div>

              <div className="reclist">
                {fighter.record_list.map((bout, index) => (
                  <div key={`${bout.opponent}-${index}`} className="boutrow">
                    <span
                      className={`boutres ${bout.result === 'L' ? 'l' : bout.result === '?' ? 'u' : ''}`}
                    >
                      {bout.result === '?' ? '—' : bout.result}
                    </span>
                    <span className="boutmain">
                      <b>{bout.opponent}</b>
                      <small>
                        {bout.method} · {bout.time}
                        <br />
                        {bout.card}
                      </small>
                    </span>
                    <span className="boutrec">{bout.opponentRecord}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {panel === 'products' && (
        <div className="panel">
          <p className="panel-intro">A linha oficial deste atleta na loja.</p>
          {athleteProducts.length === 0 ? (
            <p className="panel-intro">Nenhum produto deste atleta ainda.</p>
          ) : (
            <div className="grid grid-flush">
              {athleteProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={() => openOverlay({ name: 'product', productId: product.id })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FighterPage;
