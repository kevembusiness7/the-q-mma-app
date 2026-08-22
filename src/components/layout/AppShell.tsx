import type { ReactNode } from 'react'
import { TabBar } from './TabBar'

interface AppShellProps {
  children: ReactNode
  activeTab: string
  onTabChange: (tab: string) => void
}

/**
 * Mobile app frame. The real deployment target is a phone-width viewport
 * (this mirrors the constraint the original prototype was designed under),
 * so on wider screens we center the app in a phone-shaped card — this is a
 * presentation convenience for desktop preview only.
 *
 * The vertical padding is desktop-only on purpose: on a real phone the inner
 * card is already 100dvh, so any outer padding pushes the bottom of the card
 * (and the tab bar anchored to it) below the visible area.
 */
export function AppShell({ children, activeTab, onTabChange }: AppShellProps) {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center sm:py-6">
      <div className="relative w-full max-w-[430px] h-[100dvh] sm:h-[880px] sm:rounded-[40px] sm:border-[10px] sm:border-[#0a0908] overflow-hidden bg-(--color-bg-main) flex flex-col shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
        <main
          className="flex-1 overflow-y-auto no-scrollbar"
          /* Clears the absolutely-positioned tab bar plus the iPhone home
             indicator, so the last card of every screen stays reachable. */
          style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
        >
          {children}
        </main>
        <TabBar active={activeTab} onChange={onTabChange} />
      </div>
    </div>
  )
}
