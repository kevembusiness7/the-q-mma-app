import type { LucideIcon } from 'lucide-react'

interface AthleteStatCardProps {
  icon: LucideIcon
  label: string
  value: string
  unit?: string
}

export function AthleteStatCard({ icon: Icon, label, value, unit }: AthleteStatCardProps) {
  return (
    <div className="rounded-lg border border-(--color-border-gold) bg-(--color-bg-card) px-1.5 py-3 text-center">
      <Icon size={16} strokeWidth={1.6} className="mx-auto mb-1.5 text-(--color-gold)" />
      <div className="text-[8px] tracking-wide uppercase text-(--color-text-secondary)">{label}</div>
      <div className="mt-0.5 font-(family-name:--font-display) text-lg leading-none text-(--color-text-primary)">
        {value}
        {unit && <span className="ml-0.5 text-[9px] text-(--color-text-secondary)">{unit}</span>}
      </div>
    </div>
  )
}
