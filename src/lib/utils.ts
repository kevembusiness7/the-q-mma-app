/**
 * Junta classes CSS ignorando o que for falso (undefined, null, '', false).
 *
 * É o `cn` que os componentes de catálogo (shadcn e parecidos) esperam
 * importar de `lib/utils`. A versão original deles é `twMerge(clsx(...))`;
 * aqui é só o join, sem as duas dependências.
 *
 * A diferença prática: o `twMerge` resolve conflito entre utilitários do
 * Tailwind -- em `cn('p-2', 'p-4')` ele mantém só `p-4`. Este join mantém as
 * duas e quem decide vira a ordem do CSS. Para o uso que temos (passar uma
 * className extra pra um componente) dá no mesmo. Se algum dia um componente
 * depender de sobrescrever utilitário por prop, aí sim vale instalar
 * `clsx` + `tailwind-merge` e trocar o corpo desta função.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
