import type { LucideIcon } from 'lucide-react'

interface AthleteStatCardProps {
  icon: LucideIcon
  label: string
  value: string
  unit?: string
}

export function AthleteStatCard({ icon: Icon, label, value, unit }: AthleteStatCardProps) {
  return (
    <div className="rounded-xl border border-(--color-border-gold) bg-(--color-bg-card) px-1 py-2.5 text-center">
      {/* Ícone e rótulo na mesma linha, como no mockup. */}
      <div className="flex items-center justify-center gap-1">
        <Icon size={13} strokeWidth={1.8} className="shrink-0 text-(--color-gold)" />
        <span className="text-[8px] tracking-[0.1em] uppercase text-(--color-text-secondary)">
          {label}
        </span>
      </div>
      {/* whitespace-nowrap: num quarto da tela o cartel ("10-4-0") quebraria. */}
      <div className="mt-1 font-(family-name:--font-display) font-black italic text-[19px] leading-none text-(--color-text-primary) whitespace-nowrap">
        {value}
        {unit && (
          <span className="ml-0.5 text-[9px] not-italic font-normal text-(--color-text-secondary)">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
