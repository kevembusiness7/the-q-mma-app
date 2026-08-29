import type { CapacitorConfig } from '@capacitor/cli';

/**
 * O app nativo carrega o site ao vivo (server.url), não uma cópia estática
 * dentro do instalador. Loja, atletas, notícias e o Vault já são 100%
 * dinâmicos via Supabase/Vercel — empacotar um snapshot fixo congelaria tudo
 * isso na data de publicação e exigiria uma nova revisão de loja a cada
 * mudança de conteúdo, o oposto de como este app foi construído a sessão
 * inteira. webDir ainda precisa apontar para uma pasta buildada: o Capacitor
 * usa `dist/` como fallback local e é o que `cap sync` copia para dentro dos
 * projetos nativos, mesmo não sendo o que carrega em produção.
 */
const config: CapacitorConfig = {
  appId: 'com.theqmma.app',
  appName: 'THE Q MMA',
  webDir: 'dist',
  server: {
    url: 'https://the-q-mma-app.vercel.app',
    androidScheme: 'https',
  },
  ios: {
    // 'never' (o padrão do Capacitor): o WKWebView não empurra a página pra
    // baixo por conta própria -- quem afasta o conteúdo da status bar é só o
    // env(safe-area-inset-top) do CSS (AppShell.tsx), igual ao PWA. Com
    // 'automatic' o iOS somava um recuo nativo POR CIMA do recuo do CSS e
    // abria uma faixa preta morta no topo de todas as telas do app nativo.
    // Esta mudança só vale a partir do próximo build iOS (config é embutida
    // no instalador).
    contentInset: 'never',
    // Desliga o scroll do UIScrollView do próprio WebView. Quem rola é o
    // <main> do AppShell, não a página -- e é o scroll do WebView que
    // produzia o elástico: puxar pra baixo deslocava tudo e abria uma faixa
    // preta acima do logo. Com ele desligado o app fica colado no topo.
    // O CSS em ios-webview.css resolve o mesmo pelo lado web e já vale sem
    // build novo; esta linha é a trava de verdade, e como config nativa só
    // passa a valer a partir do próximo build iOS.
    scrollEnabled: false,
  },
  backgroundColor: '#000000',
  plugins: {
    SplashScreen: {
      // Some no autoHide de 3s padrão: em server.url o app depende de
      // buscar a página remota antes de ter algo pra mostrar, então quem
      // decide a hora certa de esconder a splash é o próprio app assim que
      // monta (ver src/lib/nativeApp.ts), não um temporizador fixo.
      launchAutoHide: false,
      backgroundColor: '#000000',
    },
  },
};

export default config;
