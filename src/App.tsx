import { AppShell } from './components/layout/AppShell';
import { AthletesPage } from './pages/AthletesPage';
import { TheQPage } from './pages/TheQPage';
import { ShopPage } from './pages/ShopPage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { CoachesPage, SponsorsPage, YouPage } from './pages/AccountAndInfoPages';
import { CartProvider } from './context/CartContext';
import { NavigationProvider, useNav, type Tab } from './context/NavigationContext';

/**
 * Decide o que renderizar. Telas internas (produto, coaches, sponsors) ficam
 * por cima da aba — o botão de voltar fecha e devolve a aba de trás.
 */
function Screens() {
  const { tab, overlay, goToTab, openOverlay } = useNav();

  if (overlay?.name === 'product') return <ProductPage productId={overlay.productId} />;
  if (overlay?.name === 'coaches') return <CoachesPage />;
  if (overlay?.name === 'sponsors') return <SponsorsPage />;

  switch (tab) {
    case 'theq':
      return (
        <TheQPage
          onNavigate={(destino) => {
            if (destino === 'coaches' || destino === 'sponsors') {
              openOverlay({ name: destino });
            } else {
              goToTab(destino as Tab);
            }
          }}
        />
      );
    case 'athletes':
      return <AthletesPage />;
    case 'shop':
      return <ShopPage />;
    case 'cart':
      return <CartPage />;
    case 'you':
      return <YouPage />;
    default:
      return null;
  }
}

function Shell() {
  const { tab, goToTab } = useNav();

  return (
    <AppShell activeTab={tab} onTabChange={(next) => goToTab(next as Tab)}>
      <Screens />
    </AppShell>
  );
}

function App() {
  return (
    <NavigationProvider initialTab="theq">
      <CartProvider>
        <Shell />
      </CartProvider>
    </NavigationProvider>
  );
}

export default App;
