import { AppShell } from './components/layout/AppShell';
import { AthletesPage } from './pages/AthletesPage';
import { TheQPage } from './pages/TheQPage';
import { ShopPage } from './pages/ShopPage';
import { ProductPage } from './pages/ProductPage';
import { FighterPage } from './pages/FighterPage';
import { CartPage } from './pages/CartPage';
import { CoachesPage, SponsorsPage, YouPage } from './pages/AccountAndInfoPages';
import { AuthPage } from './pages/AuthPage';
import { CartProvider } from './context/CartContext';
import { NavigationProvider, useNav } from './context/NavigationContext';
import { AuthProvider } from './context/AuthContext';

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

function App() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <CartProvider>
          <AppShell>
            <Screens />
          </AppShell>
        </CartProvider>
      </AuthProvider>
    </NavigationProvider>
  );
}

export default App;
