import { AppShell } from './components/layout/AppShell';
import { AthletesPage } from './pages/AthletesPage';
import { TheQPage } from './pages/TheQPage';
import { ShopPage } from './pages/ShopPage';
import { ProductPage } from './pages/ProductPage';
import { FighterPage } from './pages/FighterPage';
import { CartPage } from './pages/CartPage';
import { CoachesPage, SponsorsPage, YouPage } from './pages/AccountAndInfoPages';
import { AuthPage } from './pages/AuthPage';
import { SupportPage } from './pages/SupportPage';
import { AdminSupportPage } from './pages/AdminSupportPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';
import { AdminPromotionAthletesPage } from './pages/AdminPromotionAthletesPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { PromotionAthleteProfilePage } from './pages/PromotionAthleteProfilePage';
import { PromotionBookingPage } from './pages/PromotionBookingPage';
import { MyPromotionsPage } from './pages/MyPromotionsPage';
import { AdminPromotionQueuePage } from './pages/AdminPromotionQueuePage';
import { AdminNewsPage } from './pages/AdminNewsPage';
import { AdminAuctionsPage } from './pages/AdminAuctionsPage';
import { VaultPage } from './pages/VaultPage';
import { AuctionItemPage } from './pages/AuctionItemPage';
import { MyBidsPage } from './pages/MyBidsPage';
import { CertificatePage } from './pages/CertificatePage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { DeleteAccountPage } from './pages/DeleteAccountPage';
import { AdminAuctionQueuePage } from './pages/AdminAuctionQueuePage';
import { OrdersPage } from './pages/OrdersPage';
import { CartProvider } from './context/CartContext';
import { NavigationProvider, useNav } from './context/NavigationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { useEffect, useState } from 'react';
import './styles/auth.css';

/**
 * The Q é a raiz do app. Todo o resto abre por cima dela, empilhado, e o
 * botão de voltar de cada tela desempilha uma de cada vez — por isso
 * Loja → Produto → voltar devolve para a loja, e não para a home.
 */
function Screens() {
  const { overlay, openOverlay } = useNav();

  switch (overlay?.name) {
    case 'athletes':
      return <AthletesPage />;
    case 'shop':
      return <ShopPage />;
    case 'cart':
      return <CartPage />;
    case 'you':
      return <YouPage />;
    case 'auth':
      return <AuthPage />;
    case 'delete-account':
      return <DeleteAccountPage />;
    case 'support':
      return <SupportPage pedido={overlay.pedido} />;
    case 'admin-support':
      return <AdminSupportPage />;
    case 'admin-orders':
      return <AdminOrdersPage />;
    case 'admin-promotion-athletes':
      return <AdminPromotionAthletesPage />;
    case 'promotions':
      return <PromotionsPage />;
    case 'promotion-athlete':
      return <PromotionAthleteProfilePage slug={overlay.slug} />;
    case 'promotion-booking':
      return <PromotionBookingPage athleteSlug={overlay.athleteSlug} packageId={overlay.packageId} />;
    case 'my-promotions':
      return <MyPromotionsPage />;
    case 'admin-promotions':
      return <AdminPromotionQueuePage />;
    case 'admin-news':
      return <AdminNewsPage />;
    case 'admin-auctions':
      return <AdminAuctionsPage />;
    case 'admin-auction-queue':
      return <AdminAuctionQueuePage />;
    case 'vault':
      return <VaultPage />;
    case 'auction-item':
      return <AuctionItemPage slug={overlay.slug} />;
    case 'my-bids':
      return <MyBidsPage />;
    case 'orders':
      return <OrdersPage />;
    case 'coaches':
      return <CoachesPage />;
    case 'sponsors':
      return <SponsorsPage />;
    case 'product':
      return <ProductPage productId={overlay.productId} />;
    case 'fighter':
      return <FighterPage slug={overlay.slug} />;
    default:
      return <TheQPage onNavigate={(destino) => openOverlay({ name: destino })} />;
  }
}

/**
 * Aviso de que o e-mail foi confirmado.
 *
 * Sem isto, quem clica no link do e-mail cai na home já logado mas sem nenhum
 * retorno — parece que nada aconteceu, que foi exatamente o sintoma relatado.
 */
function AvisoConfirmacao() {
  const { confirmouEmail, descartarConfirmacao } = useAuth();
  if (!confirmouEmail) return null;

  return (
    <div className="aviso-topo" role="status">
      <span>✓ E-mail confirmado. Você já está conectado.</span>
      <button type="button" onClick={descartarConfirmacao} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}

/**
 * Retorno do Stripe. O checkout sai do app e volta com ?pedido=sucesso ou
 * ?pedido=cancelado na URL.
 *
 * No sucesso o carrinho é esvaziado AQUI, e não antes do redirecionamento:
 * quem desiste no meio do pagamento volta com os itens intactos. O banner é
 * só notícia — quem de fato confirma o pagamento é o webhook do Stripe no
 * servidor; esta tela não muda estado de pedido nenhum.
 */
function AvisoPedido() {
  const { clear } = useCart();
  const [estado] = useState(() => {
    if (typeof window === 'undefined') return null;
    const q = new URLSearchParams(window.location.search);
    const resultado = q.get('pedido');
    if (!resultado) return null;
    const numero = q.get('numero');
    // Limpa a URL para o F5 não repetir o aviso (nem re-esvaziar o carrinho).
    window.history.replaceState({}, '', window.location.pathname);
    return { resultado, numero };
  });
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    if (estado?.resultado === 'sucesso') clear();
    // `clear` é estável (useMemo no provider); roda uma vez por retorno.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado?.resultado]);

  if (!estado || !visivel) return null;

  return (
    <div className="aviso-topo" role="status">
      <span>
        {estado.resultado === 'sucesso'
          ? `✓ Order ${estado.numero ?? ''} confirmed! Check your email for the receipt.`
          : 'Payment was not completed. Your items are still in the cart.'}
      </span>
      <button type="button" onClick={() => setVisivel(false)} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}

/**
 * Retorno do Stripe pra uma reserva de Athlete Promotion. Mesmo espírito de
 * AvisoPedido, só que sem carrinho pra esvaziar — não existe carrinho aqui.
 */
function AvisoPromocao() {
  const [estado] = useState(() => {
    if (typeof window === 'undefined') return null;
    const q = new URLSearchParams(window.location.search);
    const resultado = q.get('promocao');
    if (!resultado) return null;
    const numero = q.get('numero');
    window.history.replaceState({}, '', window.location.pathname);
    return { resultado, numero };
  });
  const [visivel, setVisivel] = useState(true);

  if (!estado || !visivel) return null;

  return (
    <div className="aviso-topo" role="status">
      <span>
        {estado.resultado === 'sucesso'
          ? `✓ Booking ${estado.numero ?? ''} received! We'll review your campaign and confirm the schedule — check My Promotions for updates.`
          : 'Payment was not completed. You can try booking again.'}
      </span>
      <button type="button" onClick={() => setVisivel(false)} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}

/**
 * Retorno do Stripe pra verificação de cartão do The Q Vault (mode:
 * 'setup', sem carrinho e sem pedido — só confirma que o cartão foi
 * salvo). Quem de fato grava bid_verified_at é o webhook; este aviso é só
 * notícia de que o Stripe terminou o passo dele.
 */
function AvisoVerificacaoLeilao() {
  const [estado] = useState(() => {
    if (typeof window === 'undefined') return null;
    const q = new URLSearchParams(window.location.search);
    const resultado = q.get('leilao_cartao');
    if (!resultado) return null;
    window.history.replaceState({}, '', window.location.pathname);
    return { resultado };
  });
  const [visivel, setVisivel] = useState(true);

  if (!estado || !visivel) return null;

  return (
    <div className="aviso-topo" role="status">
      <span>
        {estado.resultado === 'sucesso'
          ? '✓ Card verified! You can now place bids in The Q Vault.'
          : 'Card verification was not completed. You can try again from the item page.'}
      </span>
      <button type="button" onClick={() => setVisivel(false)} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}

/**
 * Único desvio da pilha de navegação normal: o QR Code do certificado de
 * autenticidade precisa abrir direto numa URL real (/certificate/CODIGO),
 * pra funcionar pra quem nunca abriu o app antes — sem login, sem carrinho,
 * sem nada da árvore de providers de baixo. A checagem fica aqui, antes de
 * tudo o mais renderizar.
 */
function certificadoDaUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/certificate\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function App() {
  const codigoCertificado = certificadoDaUrl();
  if (codigoCertificado) {
    return <CertificatePage code={codigoCertificado} />;
  }

  // Mesmo motivo do certificado: as lojas (Apple/Google) exigem uma URL
  // pública que abra sozinha, sem login e sem o app instalado.
  if (typeof window !== 'undefined') {
    if (window.location.pathname === '/privacy') return <PrivacyPolicyPage />;
    if (window.location.pathname === '/terms') return <TermsPage />;
  }

  return (
    <NavigationProvider>
      <AuthProvider>
        <CartProvider>
          <AppShell>
            <AvisoConfirmacao />
            <AvisoPedido />
            <AvisoPromocao />
            <AvisoVerificacaoLeilao />
            <Screens />
          </AppShell>
        </CartProvider>
      </AuthProvider>
    </NavigationProvider>
  );
}

export default App;
