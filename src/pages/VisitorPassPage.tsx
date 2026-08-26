import { useVisitorPass } from '../hooks/useVisitorPass'
import { VisitorPassCard } from '../components/visitor/VisitorPassCard'
import '../styles/auction.css'
import '../styles/certificate.css'
import '../styles/visitors.css'

/**
 * Página pública, sem login e sem o shell do app -- destino do QR Code do
 * Visitor Pass. Mesma receita de CertificatePage.tsx: ver a checagem de
 * rota em App.tsx, é a única outra tela que foge da pilha de navegação
 * normal. visitor_passes só guarda nome/classe/status/datas -- nunca DOB,
 * telefone ou e-mail, então esta página nunca pode vazar mais que isso.
 */
export function VisitorPassPage({ code }: { code: string }) {
  const { pass, loading, error } = useVisitorPass(code)

  return (
    <div className="cert-screen">
      <div className="cert-wordmark">THE Q MMA</div>
      <h1 className="cert-title">Visitor Pass</h1>

      {loading && <p className="cert-empty">Loading…</p>}
      {!loading && (error || !pass) && (
        <p className="cert-empty">This pass could not be found. Check the code and try again.</p>
      )}

      {pass && <VisitorPassCard pass={pass} url={window.location.href} />}
    </div>
  )
}

export default VisitorPassPage
