import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
