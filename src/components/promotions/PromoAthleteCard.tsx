import type { PromotionAthleteWithPackages } from '../../types/promotions'
import { formatarPreco } from '../../hooks/useProducts'
import { paisDoAtleta } from '../../data/fighters'

/**
 * Card da vitrine de Athlete Promotions, no formato do cartaz: foto com a
 * bandeira do país atrás, nome em dourado, preço de entrada e "View packages".
 *
 * Não é ProductCard (esse é tipado pra Product, com cor/tamanho/estoque de
 * peça física — aqui não existe nada disso, só atleta + preço inicial).
 */
export function PromoAthleteCard({
  atleta,
  onOpen,
}: {
  atleta: PromotionAthleteWithPackages
  onOpen: () => void
}) {
  const menorPreco = Math.min(...atleta.packages.map((p) => p.priceCents))
  /* O país não vem do banco (promotion_athletes não tem essa coluna), então
     sai do mesmo cadastro estático que a ficha completa usa. Quem não estiver
     lá fica sem bandeira, só com o fundo escuro. */
  const country = paisDoAtleta(atleta.slug, atleta.name)

  return (
    <button type="button" className="ps-card" onClick={onOpen}>
      <span className="ps-foto">
        {country && (
          <img className="ps-flag" src={`/images/flags/${country}.svg`} alt="" aria-hidden />
        )}
        {atleta.photoUrl ? (
          <img className="ps-atleta" src={atleta.photoUrl} alt="" loading="lazy" />
        ) : (
          <span className="ps-foto-vazia" aria-hidden>
            🥋
          </span>
        )}
        <span className="ps-scrim" />
      </span>

      <b className={`ps-nome ${atleta.name.length > 15 ? 'longo' : ''}`}>{atleta.name}</b>
      <span className="ps-handle">@{atleta.instagramHandle}</span>

      <span className="ps-card-rule" />

      <span className="ps-from">
        <span>Promotions from</span>
        <b>{formatarPreco(menorPreco)}</b>
      </span>

      <span className="ps-cta">View packages</span>
    </button>
  )
}
