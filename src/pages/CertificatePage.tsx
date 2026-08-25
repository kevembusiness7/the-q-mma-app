import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useCertificate } from '../hooks/useCertificate'
import '../styles/auction.css'
import '../styles/certificate.css'

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatarDataLuta(iso: string | null): string | null {
  if (!iso) return null
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/**
 * Página pública, sem login e sem o shell do app — é o destino do QR Code
 * impresso/anexado ao item físico. Ver a checagem de rota em App.tsx: essa
 * é a única tela deste projeto que não passa pela pilha de navegação normal.
 */
export function CertificatePage({ code }: { code: string }) {
  const { certificate, loading, error } = useCertificate(code)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!certificate) return
    let ativo = true
    QRCode.toDataURL(window.location.href, {
      width: 240,
      margin: 1,
      color: { dark: '#0b0908', light: '#ede7de' },
    })
      .then((url) => {
        if (ativo) setQrDataUrl(url)
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [certificate])

  return (
    <div className="cert-screen">
      <div className="cert-wordmark">THE Q VAULT</div>
      <h1 className="cert-title">Certificate of Authenticity</h1>

      {loading && <p className="cert-empty">Loading…</p>}
      {!loading && (error || !certificate) && (
        <p className="cert-empty">This certificate could not be found. Check the number and try again.</p>
      )}

      {certificate && (
        <div className="cert-card">
          {certificate.photoUrl && (
            <div className="cert-photo">
              <img src={certificate.photoUrl} alt="" />
            </div>
          )}

          <div className="cert-body">
            <div className="cert-label">{certificate.athleteName}</div>
            <h2 className="cert-item-title">{certificate.itemTitle}</h2>

            {(certificate.eventName || certificate.fightDate) && (
              <p className="cert-desc">
                {[certificate.eventName, formatarDataLuta(certificate.fightDate)].filter(Boolean).join(' · ')}
              </p>
            )}

            <div className="auction-badges">
              {certificate.fightWorn && <span className="auction-badge">Fight-Worn</span>}
              {certificate.autographed && <span className="auction-badge">Autographed</span>}
            </div>

            {certificate.autographLocation && (
              <p className="cert-desc">Autograph location: {certificate.autographLocation}</p>
            )}

            <div className="cert-divider" />

            <p className="cert-number">{certificate.certNumber}</p>
            <p className="cert-desc">Issued {formatarData(certificate.issuedAt)}</p>

            {qrDataUrl && (
              <div className="cert-qr">
                <img src={qrDataUrl} alt="QR code linking to this certificate" width={160} height={160} />
              </div>
            )}

            <p className="cert-footer">
              This page confirms this item was sold through The Q Vault as described above. Keep this
              link or the QR code with the item for future verification.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default CertificatePage
