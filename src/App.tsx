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
import { CartProvider } from './context/CartContext';
import { NavigationProvider, useNav } from './context/NavigationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
    case 'support':
      return <SupportPage />;
    case 'admin-support':
      return <AdminSupportPage />;
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

function App() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <CartProvider>
          <AppShell>
            <AvisoConfirmacao />
            <Screens />
          </AppShell>
        </CartProvider>
      </AuthProvider>
    </NavigationProvider>
  );
}

export default App;
