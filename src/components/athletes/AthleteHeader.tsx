import { Search, ShoppingBag } from 'lucide-react'

export function AthleteHeader() {
  return (
    <header className="relative overflow-hidden px-4 pt-4 pb-3 flex items-center justify-between">
      <span
        className="diagline"
        style={{ top: -30, right: 90, height: 70, transform: 'rotate(22deg)' }}
        aria-hidden
      />
      <div className="font-(family-name:--font-display) uppercase text-2xl tracking-wide flex items-baseline gap-1">
        <span className="text-(--color-text-primary)">THE</span>
        <span className="text-gold-metallic text-[1.6em] leading-none">Q</span>
        <span className="text-(--color-text-primary)">MMA</span>
      </div>
      <div className="flex items-center gap-4 text-(--color-gold)">
        <button aria-label="Search">
          <Search size={20} strokeWidth={1.6} />
        </button>
        <button aria-label="Shop">
          <ShoppingBag size={20} strokeWidth={1.6} />
        </button>
      </div>
    </header>
  )
}
