import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Só faz alguma coisa dentro do app nativo (iOS/Android via Capacitor) — na
 * web, `isNativePlatform()` volta false e a função não faz nada, então dá
 * pra chamar sem guarda nenhuma no lado de fora.
 *
 * `Style.Dark` no plugin de status bar do Capacitor quer dizer "texto/ícones
 * claros" (pensado pra fundo escuro) — não "cor escura". Combina com o tema
 * do app inteiro (#000000).
 */
export async function initNativeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#000000' });
    }
  } catch {
    // Plugin ainda não pronto ou indisponível na plataforma -- não trava o
    // app por causa da cor da status bar.
  }

  await SplashScreen.hide();
}
