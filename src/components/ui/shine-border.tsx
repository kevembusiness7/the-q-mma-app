import type { ReactNode } from "react"

import { cn } from "../../lib/utils"

type TColorProp = string | string[]

interface ShineBorderProps {
  borderRadius?: number
  borderWidth?: number
  duration?: number
  color?: TColorProp
  className?: string
  children: ReactNode
}

/**
 * @name Shine Border
 * @description It is an animated background border effect component with easy to use and configurable props.
 * @param borderRadius defines the radius of the border.
 * @param borderWidth defines the width of the border.
 * @param duration defines the animation duration to be applied on the shining border
 * @param color a string or string array to define border color.
 * @param className defines the class name to be applied to the component
 * @param children contains react node elements.
 *
 * Adaptações para este projeto:
 * - Sem `"use client"`: é diretiva do Next, e aqui é Vite.
 * - `cn` vem de `lib/utils` local (import relativo -- não existe alias `@/`).
 * - A animação `shine` é registrada em index.css via `@theme`, não em
 *   tailwind.config.js: este projeto é Tailwind v4 e não tem esse arquivo.
 * - Saiu a classe `before:bg-shine-size`, que não existe em lugar nenhum e
 *   não fazia nada -- o tamanho do fundo já vem do
 *   `before:[background-size:300%_300%]` logo ao lado.
 * - Entrou `relative` na caixa de fora: o `before:absolute` precisa de um
 *   ancestral posicionado, e no componente original isso dependia de quem
 *   chamava lembrar de passar `relative` na className.
 */
export function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = "#000000",
  className,
  children,
}: ShineBorderProps) {
  return (
    <div
      style={
        {
          "--border-radius": `${borderRadius}px`,
        } as React.CSSProperties
      }
      className={cn(
        "relative min-h-[60px] w-fit min-w-[300px] place-items-center rounded-[--border-radius] bg-white p-3 text-black dark:bg-black dark:text-white",
        className,
      )}
    >
      <div
        style={
          {
            "--border-width": `${borderWidth}px`,
            "--border-radius": `${borderRadius}px`,
            "--duration": `${duration}s`,
            "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            "--background-radial-gradient": `radial-gradient(transparent,transparent, ${color instanceof Array ? color.join(",") : color},transparent,transparent)`,
          } as React.CSSProperties
        }
        className={`before:absolute before:inset-0 before:aspect-square before:size-full before:rounded-[--border-radius] before:p-[--border-width] before:will-change-[background-position] before:content-[""] before:![-webkit-mask-composite:xor] before:![mask-composite:exclude] before:[background-image:--background-radial-gradient] before:[background-size:300%_300%] before:[mask:--mask-linear-gradient] motion-safe:before:animate-shine`}
      ></div>
      {children}
    </div>
  )
}

export default ShineBorder
