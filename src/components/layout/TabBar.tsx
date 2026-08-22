import { Hexagon, Trophy, ShoppingBag, ShoppingCart, User } from 'lucide-react'

const TABS = [
  { id: 'theq', label: 'The Q', icon: Hexagon },
  { id: 'athletes', label: 'Athletes', icon: Trophy },
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'cart', label: 'Cart', icon: ShoppingCart },
  { id: 'you', label: 'You', icon: User },
] as const

interface TabBarProps {
  active: string
  onChange: (tab: string) => void
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-30 px-1.5 pt-2.5 bg-black/95 backdrop-blur-md border-t border-(--color-border-gold)/30 grid grid-cols-5"
      /* Grows by the home indicator height on iPhone, so the labels never sit
         under it. On devices without one, env() resolves to 0 and nothing
         changes. */
      style={{
        height: 'calc(82px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center justify-center gap-1 group"
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              size={20}
              strokeWidth={1.6}
              className={isActive ? 'text-(--color-gold)' : 'text-(--color-text-secondary)'}
            />
            <span
              className={`text-[10px] tracking-wide ${
                isActive ? 'text-(--color-gold)' : 'text-(--color-text-secondary)'
              }`}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
