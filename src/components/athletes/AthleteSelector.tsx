import { useState } from 'react'
import { Hexagon, ChevronDown } from 'lucide-react'
import type { Athlete } from '../../types/athlete'

interface AthleteSelectorProps {
  athletes: Athlete[]
  selected: Athlete
  onSelect: (athlete: Athlete) => void
}

export function AthleteSelector({ athletes, selected, onSelect }: AthleteSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative px-4 pb-3.5">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="relative overflow-hidden w-full flex items-center gap-2.5 rounded-[14px] border border-(--color-border-gold) bg-(--color-bg-card) px-4 py-3.5 glow-gold-sm"
      >
        <span
          className="diagline"
          style={{ top: -20, right: 60, height: 60, transform: 'rotate(20deg)' }}
          aria-hidden
        />
        <Hexagon size={16} strokeWidth={1.6} className="text-(--color-gold) shrink-0" />
        <span className="flex-1 text-left text-xs tracking-[0.15em] uppercase text-(--color-text-primary)">
          {selected.division} <span className="text-(--color-text-secondary)">•</span> {selected.name}
        </span>
        <ChevronDown
          size={18}
          className={`text-(--color-gold) shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-4 right-4 top-[calc(100%-4px)] z-20 rounded-xl border border-(--color-border-gold) bg-(--color-bg-card) overflow-hidden shadow-xl">
          {athletes.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onSelect(a)
                setOpen(false)
              }}
              className={`w-full text-left px-4 py-3 text-xs uppercase tracking-wide border-b border-(--color-border-gold)/30 last:border-0 ${
                a.id === selected.id ? 'bg-(--color-bg-elevated) text-(--color-gold)' : 'text-(--color-text-primary)'
              }`}
            >
              {a.name}
              <span className="block text-[10px] text-(--color-text-secondary) normal-case tracking-normal mt-0.5">
                {a.division} · {a.record}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
