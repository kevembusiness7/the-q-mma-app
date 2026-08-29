import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

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
          style={{
            /* SEM recuo no topo, de proposito -- o app comeca colado na
               borda de cima e usa a tela inteira.

               ATENCAO, isto anda de maos dadas com o `ios.contentInset` do
               capacitor.config.ts: o build instalado hoje ainda insere o
               recuo pelo lado NATIVO (o `never` do config so passa a valer
               num build novo). Com o env() aqui somando por cima, davam dois
               recuos e a faixa preta no topo ficava com quase o dobro da
               altura de uma status bar -- e o comentario do .theq-hero no
               TheQPage.css ja registrava esse mesmo contentInset atrapalhando
               outra tentativa.

               Quando um build novo entrar com `contentInset: 'never'`, o
               recuo nativo some e o conteudo vai subir ate y=0, atras do
               relogio e da bateria. Nessa hora o recuo precisa voltar -- mas
               nos controles do topo (.appbar, .theq-you, .theq-hero-logo,
               .fh-back), nao aqui, senao a arte da home perde o full-bleed
               de novo. */
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
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
