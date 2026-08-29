import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /* Instalável na tela inicial do celular.
       No Android, o Chrome só oferece "instalar" se houver manifest COM os
       ícones de 192 e 512 E um service worker que trate fetch — por isso o
       plugin, e não só um manifest solto. O iOS não exige service worker,
       mas exige o apple-touch-icon em PNG: sem ele o ícone da tela inicial
       vira uma miniatura da página. */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'The Q MMA',
        short_name: 'The Q',
        description: 'The Q MMA — atletas, notícias e loja oficial.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: '/icons/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icone-512.png', sizes: '512x512', type: 'image/png' },
          // `maskable` é o que o Android recorta em círculo ou quadrado
          // arredondado conforme o aparelho. Sem uma versão com margem, o
          // recorte come a borda do logo.
          {
            src: '/icons/icone-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        /* Só o esqueleto do app entra no precache. Precarregar as fotos dos
           atletas e os banners encheria dezenas de megabytes no celular de
           quem talvez nunca abra aquelas telas — elas vêm da rede quando
           forem pedidas. */
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        /* O retorno do Stripe cai em /?pedido=sucesso. A navegação resolve
           pelo index em cache e a query sobrevive — mas o webhook é quem
           confirma o pagamento, então nada aqui depende dessa tela. */
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    /* Porta fixa, e não a primeira livre.
       O link de confirmação de e-mail do Supabase volta para a Site URL
       cadastrada no painel, que é um endereço só. Com a porta mudando a cada
       reinício (5173, 5174, 5190…) esse endereço nunca batia e a confirmação
       caía numa página morta. strictPort faz o Vite falhar em vez de pular
       para outra porta, para o problema aparecer na hora. */
    port: 5173,
    strictPort: true,
  },
})
