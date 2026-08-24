interface BannerLinkProps {
  src: string;
  /** Descreve o destino, não a imagem: "Ver atletas", "Ir para a loja". */
  alt: string;
  /** Ação interna. Se `href` for passado, é ignorado. */
  onClick?: () => void;
  /** Link externo. Abre em nova aba. */
  href?: string;
  /** Classe extra no botão/link, pra banners que precisam de um recorte próprio. */
  className?: string;
}

/**
 * Os banners da tela The Q são imagens inteiras clicáveis — o texto faz parte
 * da arte. Por isso o `alt` precisa descrever para onde o botão leva, senão
 * quem usa leitor de tela não tem como saber.
 */
export function BannerLink({ src, alt, onClick, href, className }: BannerLinkProps) {
  const classes = className ? `banner-btn ${className}` : 'banner-btn';

  if (href) {
    return (
      <a className={classes} href={href} target="_blank" rel="noopener noreferrer">
        <img src={src} alt={alt} />
      </a>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      <img src={src} alt={alt} />
    </button>
  );
}
