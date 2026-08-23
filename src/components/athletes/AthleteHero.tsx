import { User, Ruler, Weight, Move3d } from 'lucide-react'
import type { Athlete } from '../../types/athlete'
import { AthleteStatCard } from './AthleteStatCard'
import { FighterPhoto } from './FighterPhoto'

interface AthleteHeroProps {
  athlete: Athlete
}

/**
 * Tamanho do nome conforme a palavra mais longa.
 *
 * A coluna do nome tem ~210px, e sem isto um sobrenome longo quebra no meio da
 * palavra: "LEBOSNOYANI" a 38px pede 304px e virava "LEBOSNO / YANI".
 *
 * As faixas saíram de medição na própria página, não de estimativa: com 11
 * caracteres, 27px pede 216px (não cabe) e 24px cabe. Isso dá ~0,73px de
 * largura por caractere para cada 1px de fonte, que é de onde vêm os demais
 * degraus. Nomes curtos como "Barbosa" e "Diaz" ficam nos 38px de sempre.
 */
function tamanhoDoNome(primeiro: string, ultimo: string): string {
  const maior = Math.max(primeiro.length, ultimo.length)
  if (maior <= 8) return 'text-[38px]'
  if (maior <= 9) return 'text-[30px]'
  if (maior <= 11) return 'text-[24px]'
  return 'text-[20px]'
}

export function AthleteHero({ athlete }: AthleteHeroProps) {
  return (
    <section className="px-4">
      <div className="relative overflow-hidden rounded-2xl border border-(--color-border-gold) bg-(--color-bg-card) bg-honeycomb glow-gold-sm">
        <span
          className="diagline"
          style={{ top: -40, right: 46, height: 170, transform: 'rotate(20deg)' }}
          aria-hidden
        />
        <span
          className="diagline"
          style={{ bottom: -30, left: 30, height: 120, transform: 'rotate(20deg)' }}
          aria-hidden
        />

        <div className="relative flex min-h-[290px]">
          {/* Foto sangrando até as bordas, como no mockup — sem moldura interna. */}
          <div className="relative w-[47%] shrink-0">
            <FighterPhoto
              src={athlete.heroImageUrl ?? athlete.imageUrl}
              fallbackSrc={athlete.imageUrl}
              alt={athlete.imageAlt}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
            {/* Dissolve a borda direita da foto no fundo do card, para a imagem
                não terminar num corte reto no meio do card. */}
            <div className="pointer-events-none absolute inset-y-0 -right-px w-16 bg-gradient-to-r from-transparent to-(--color-bg-card)" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-(--color-bg-card) to-transparent" />
          </div>

          <div className="relative flex-1 min-w-0 flex flex-col justify-center py-4 pr-3.5 -ml-6">
            <span className="self-start mb-2 border border-(--color-gold) bg-black/50 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-(--color-gold) whitespace-nowrap [clip-path:polygon(0_0,100%_0,calc(100%-8px)_100%,0_100%)] pr-4">
              &ldquo;{athlete.nickname}&rdquo;
            </span>

            <h1
              className={`font-(family-name:--font-display) font-black italic uppercase leading-[0.84] ${tamanhoDoNome(
                athlete.firstName,
                athlete.lastName,
              )} text-silver-metallic break-words drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]`}
            >
              <span className="block">{athlete.firstName}</span>
              <span className="block">{athlete.lastName}</span>
            </h1>

            {/* Bloco do cartel, destacado do nome por uma linha dourada. */}
            <div className="mt-3.5 border-t border-(--color-border-gold) bg-black/40 pt-2.5 pb-1">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-(--color-gold)">
                Pro Record
              </div>
              <div className="font-(family-name:--font-display) font-black italic text-[30px] leading-none text-silver-metallic">
                {athlete.record}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        <AthleteStatCard icon={User} label="Age" value={String(athlete.age)} />
        <AthleteStatCard icon={Ruler} label="Height" value={athlete.heightLabel} />
        <AthleteStatCard icon={Weight} label="Weight" value={String(athlete.weightLbs)} unit="lbs" />
        <AthleteStatCard icon={Move3d} label="Reach" value={athlete.reachLabel} />
      </div>
    </section>
  )
}
