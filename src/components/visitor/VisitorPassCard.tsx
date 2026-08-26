import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { VisitorPass } from '../../types/visitor'

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/**
 * Cartão do Visitor Pass -- mesma receita de CertificatePage (QR gerado no
 * cliente com o pacote `qrcode`, apontando pra /visitor-pass/{code}).
 * Reaproveitado tanto no hub do visitante (logado) quanto na página pública
 * standalone (VisitorPassPage) -- por isso recebe a URL pronta, não monta
 * `window.location.href` sozinho.
 */
export function VisitorPassCard({ pass, url }: { pass: VisitorPass; url: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const expirado = pass.status === 'expired' || (pass.expiresAt !== null && new Date(pass.expiresAt) < new Date())

  useEffect(() => {
    let ativo = true
    QRCode.toDataURL(url, {
      width: 240,
      margin: 1,
      color: { dark: '#0b0908', light: '#ede7de' },
    })
      .then((dataUrl) => {
        if (ativo) setQrDataUrl(dataUrl)
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [url])

  return (
    <div className="cert-card">
      <div className="cert-body">
        <div className="cert-label">THE Q MMA — VISITOR PASS</div>
        <h2 className="cert-item-title">{pass.fullName}</h2>
        <p className="cert-desc">{pass.requestedClassName}</p>

        <div className="auction-badges">
          <span className={`ticket-status ${expirado ? 'vr-expired' : 'vr-cleared_to_train'}`}>
            {expirado ? 'Expired' : 'Cleared to train'}
          </span>
        </div>

        <div className="cert-divider" />

        <p className="cert-number">{pass.passCode}</p>
        <p className="cert-desc">Cleared {formatarData(pass.clearedAt)}</p>
        {pass.expiresAt && <p className="cert-desc">Valid through {formatarData(pass.expiresAt)}</p>}

        {qrDataUrl && (
          <div className="cert-qr">
            <img src={qrDataUrl} alt="QR code for this Visitor Pass" width={160} height={160} />
          </div>
        )}

        <p className="cert-footer">
          Show this pass to a coach at the front desk before your first class. This confirms your
          liability waiver is on file and you are cleared to train at THE Q MMA.
        </p>
      </div>
    </div>
  )
}

export default VisitorPassCard
