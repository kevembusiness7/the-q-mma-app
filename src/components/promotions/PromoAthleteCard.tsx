import type { PromotionAthleteWithPackages } from '../../types/promotions'
import { formatarPreco } from '../../hooks/useProducts'

/**
 * Card da vitrine de Athlete Promotions. Não é ProductCard (esse é tipado
 * pra Product, com cor/tamanho/estoque de peça física — aqui não existe
 * nada disso, só atleta + preço inicial).
 */
export function PromoAthleteCard({
  atleta,
  onOpen,
}: {
  atleta: PromotionAthleteWithPackages
  onOpen: () => void
}) {
  const menorPreco = Math.min(...atleta.packages.map((p) => p.priceCents))

  return (
    <button type="button" className="promo-athlete-card" onClick={onOpen}>
      <div className="promo-photo">
        {atleta.photoUrl ? (
          <img src={atleta.photoUrl} alt="" loading="lazy" />
        ) : (
          <span aria-hidden style={{ fontSize: 32, opacity: 0.4 }}>
            🥋
          </span>
        )}
      </div>
      <div className="promo-athlete-card-body">
        <b>{atleta.name}</b>
        <span>@{atleta.instagramHandle}</span>
        <span className="promo-starting">Starting at {formatarPreco(menorPreco)}</span>
      </div>
    </button>
  )
}
