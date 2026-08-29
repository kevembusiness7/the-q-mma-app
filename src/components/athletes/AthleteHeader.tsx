import { ChevronLeft, ShoppingBag } from 'lucide-react'
import { useNav } from '../../context/NavigationContext'

export function AthleteHeader() {
  const { closeOverlay, openOverlay } = useNav()

  return (
    /* A seta de voltar desta tela flutua no topo sem appbar, entao o respiro
       do topo seguro entra no proprio header. */
    <header
      className="relative overflow-hidden px-4 pt-4 pb-3 flex items-center justify-between"
      style={{ paddingTop: 'calc(16px + var(--topo-seguro))' }}
    >
      <span
        className="diagline"
        style={{ top: -30, right: 90, height: 70, transform: 'rotate(22deg)' }}
        aria-hidden
      />
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={closeOverlay}
          aria-label="Voltar"
          className="text-(--color-gold) shrink-0"
        >
          <ChevronLeft size={22} strokeWidth={1.6} />
        </button>
        <div className="font-(family-name:--font-display) uppercase text-2xl tracking-wide flex items-baseline gap-1">
          <span className="text-(--color-text-primary)">THE</span>
          <span className="text-gold-metallic text-[1.6em] leading-none">Q</span>
          <span className="text-(--color-text-primary)">MMA</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-(--color-gold)">
        <button onClick={() => openOverlay({ name: 'shop' })} aria-label="Shop">
          <ShoppingBag size={20} strokeWidth={1.6} />
        </button>
      </div>
    </header>
  )
}
