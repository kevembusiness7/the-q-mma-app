import type { ReactNode } from 'react'
import '../../styles/legal.css'

interface LegalPageProps {
  title: string
  updated: string
  children: ReactNode
}

/**
 * Casca comum das páginas públicas de Privacy Policy e Terms of Service —
 * mesmas duas telas, mesmo formato. Ficam fora da pilha de navegação normal
 * (ver a checagem de rota em App.tsx, mesmo desenho do /certificate) porque
 * as lojas exigem uma URL que abre sozinha, sem login e sem o app instalado.
 */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="legal-screen">
      <div className="legal-inner">
        <a className="legal-back" href="/">
          ‹ THE Q MMA
        </a>
        <div className="legal-wordmark">THE Q MMA</div>
        <h1 className="legal-title">{title}</h1>
        <p className="legal-updated">Last updated {updated}</p>
        <div className="legal-body">{children}</div>
      </div>
    </div>
  )
}
