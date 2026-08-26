import type { ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'

interface AppShellProps {
  children: ReactNode
}

/**
 * Dentro do app iOS o Capacitor já desconta o notch nativamente
 * (contentInset: 'automatic' em capacitor.config.ts) -- somar o
 * env(safe-area-inset-top) do CSS por cima descontava DUAS vezes e abria a
 * faixa preta morta acima do hero. No navegador/PWA não existe o inset
 * nativo, então lá o env() continua sendo quem afasta o conteúdo do notch.
 */
const iosNativo = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'

/**
 * Mobile app frame. The real deployment target is a phone-width viewport
 * (this mirrors the constraint the original prototype was designed under),
 * so on wider screens we center the app in a phone-shaped card — this is a
 * presentation convenience for desktop preview only.
 *
 * The vertical padding is desktop-only on purpose: on a real phone the inner
 * card is already 100dvh, so any outer padding pushes the bottom of the card
 * below the visible area.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center sm:py-6">
      <div className="relative w-full max-w-[430px] h-[100dvh] sm:h-[880px] sm:rounded-[40px] sm:border-[10px] sm:border-[#0a0908] overflow-hidden bg-(--color-bg-main) flex flex-col shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
        <main
          className="flex-1 overflow-y-auto no-scrollbar"
          /* Clears the iPhone status bar/notch at the top and the home
             indicator at the bottom, so every screen's buttons -- back
             arrows, header icons, whatever a page puts first -- land below
             where iOS actually accepts taps instead of under the system UI. */
          style={{
            paddingTop: iosNativo ? '0px' : 'env(safe-area-inset-top, 0px)',
            paddingBottom: iosNativo ? '24px' : 'calc(24px + env(safe-area-inset-bottom, 0px))',
            // A rolagem do app vive NESTE contêiner, não no body -- é aqui
            // que o encadeamento pro elástico nativo do iOS tem que morrer.
            overscrollBehaviorY: 'none',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
