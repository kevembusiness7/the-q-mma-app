import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initNativeApp } from './lib/nativeApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Depois do primeiro render: é o sinal de que tem algo real na tela pra
// esconder a splash nativa em cima (ver capacitor.config.ts, launchAutoHide
// desligado de propósito).
void initNativeApp()
