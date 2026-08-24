import { useMemo, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNav } from '../context/NavigationContext';
import { BackBar } from '../components/shop/ShopParts';
import { ProductArt, productImage } from '../lib/productImage';
import {
  acharVariacao,
  formatarPreco,
  useProducts,
  variacoesDaCor,
} from '../hooks/useProducts';
import '../styles/shop.css';

export function ProductPage({ productId }: { productId: string }) {
  const { produtos, carregando } = useProducts();
  const product = produtos.find((p) => p.id === productId);
  const { closeOverlay, openOverlay } = useNav();
  const { add, lines } = useCart();

  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [added, setAdded] = useState(false);

  const color = product?.colors[colorIndex];

  /* Tamanhos da cor escolhida, com o estoque de cada um. É daqui que a tela
     sabe o que riscar como esgotado e quanto ainda dá para comprar. */
  const tamanhos = useMemo(
    () => (product && color ? variacoesDaCor(product, color.slug) : []),
    [product, color],
  );

  const variacao =
    product && color && size ? acharVariacao(product, color.slug, size) : undefined;

  /* O que já está no carrinho conta contra o estoque: sem isto daria para
     adicionar 3 + 3 de um item com estoque 4. */
  const jaNoCarrinho = variacao
    ? (lines.find((l) => l.variantId === variacao.id)?.quantity ?? 0)
    : 0;
  const disponivel = variacao ? Math.max(0, variacao.stock - jaNoCarrinho) : 0;

  if (carregando) {
    return (
      <div>
        <BackBar label="Loja" onBack={closeOverlay} />
        <p className="empty">Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <BackBar label="Produto" onBack={closeOverlay} />
        <p className="empty">Produto não encontrado.</p>
      </div>
    );
  }

  const photo = productImage(product, color?.slug ?? 'black', side);
  const hasBack = product.mode === 'mockup' && product.category !== 'Caps';

  const escolherCor = (index: number) => {
    setColorIndex(index);
    // O tamanho escolhido pode não existir (ou estar esgotado) na cor nova.
    setSize(null);
    setQuantity(1);
  };

  const handleAdd = () => {
    if (!variacao || disponivel <= 0) return;
    add(product, variacao, Math.min(quantity, disponivel), productImage(product, color!.slug) ?? undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="pdp-screen">
      <BackBar label={product.category} onBack={closeOverlay} />

      <div className="hero-img">
        {photo ? (
          <img src={photo} alt={`${product.name} — ${color?.name ?? ''}`} />
        ) : (
          <ProductArt art={product.art} />
        )}
      </div>

      {hasBack && (
        <div className="pill-row pdp-sides">
          <button
            type="button"
            className={`pill ${side === 'front' ? 'on' : ''}`}
            onClick={() => setSide('front')}
          >
            Front
          </button>
          <button
            type="button"
            className={`pill ${side === 'back' ? 'on' : ''}`}
            onClick={() => setSide('back')}
          >
            Back
          </button>
        </div>
      )}

      <div className="pdp">
        {product.badges.length > 0 && (
          <div className="badges-row">
            {product.badges.map((badge) => (
              <span key={badge} className={`badge b-${badge}`}>
                {badge === 'app' ? 'App exclusive' : 'Limited'}
              </span>
            ))}
          </div>
        )}

        <h2>{product.name}</h2>
        {/* O preço acompanha a variação: se um dia XXL custar mais, a tela já
            reflete sem mudança nenhuma. */}
        <div className="price-lg">{formatarPreco(variacao?.priceCents ?? product.priceCents)}</div>
        <p className="desc">{product.description}</p>

        {/* Sem seletor quando só existe uma cor (ex.: os bonés, que só têm
            foto do molde preto) -- escolher entre uma opção não é escolha. */}
        {product.colors.length > 1 && (
          <>
            <div className="label">Color — {color?.name}</div>
            <div className="swatch-row">
              {product.colors.map((c, index) => (
                <button
                  key={c.slug}
                  type="button"
                  className={`swatch ${index === colorIndex ? 'on' : ''}`}
                  style={{ background: c.hex }}
                  onClick={() => escolherCor(index)}
                  aria-label={c.name}
                  aria-pressed={index === colorIndex}
                />
              ))}
            </div>
          </>
        )}

        <div className="label">Size</div>
        <div className="sizes">
          {tamanhos.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`size ${v.size === size ? 'on' : ''} ${v.stock === 0 ? 'off' : ''}`}
              onClick={() => {
                if (v.stock === 0) return;
                setSize(v.size);
                setQuantity(1);
              }}
              disabled={v.stock === 0}
              aria-pressed={v.size === size}
            >
              {v.size}
            </button>
          ))}
        </div>

        {/* Aviso de pouca unidade só depois de escolher o tamanho: antes disso
            o número não se refere a nada que o cliente tenha selecionado. */}
        {variacao && variacao.stock > 0 && variacao.stock <= 5 && (
          <p className="stock-nota">Only {variacao.stock} left in this size.</p>
        )}
        {variacao && disponivel === 0 && jaNoCarrinho > 0 && (
          <p className="stock-nota">All remaining units are already in your cart.</p>
        )}

        <div className="label">Quantity</div>
        <div className="qty-row">
          <button
            type="button"
            className="qty-step"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Diminuir"
          >
            −
          </button>
          <span className="qty-val">{quantity}</span>
          <button
            type="button"
            className="qty-step"
            onClick={() => setQuantity((q) => Math.min(disponivel > 0 ? disponivel : 1, q + 1))}
            aria-label="Aumentar"
          >
            +
          </button>
        </div>

        <button
          type="button"
          className="btn"
          onClick={handleAdd}
          disabled={!variacao || disponivel <= 0}
        >
          {added
            ? 'Added to cart'
            : !size
              ? 'Select a size'
              : disponivel <= 0
                ? 'Out of stock'
                : 'Add to cart'}
        </button>

        {added && (
          <button type="button" className="btn ghost pdp-gocart" onClick={() => openOverlay({ name: 'cart' })}>
            View cart
          </button>
        )}

        <div className="tag-row">
          {product.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              #{tag}
            </span>
          ))}
        </div>

        <details className="accordion">
          <summary>Details</summary>
          <div className="accbody">{product.details}</div>
        </details>
        <details className="accordion">
          <summary>Shipping &amp; returns</summary>
          <div className="accbody">{product.shipping}</div>
        </details>
      </div>
    </div>
  );
}

export default ProductPage;
