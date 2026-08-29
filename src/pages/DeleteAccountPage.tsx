import { useState } from 'react'
import { useNav } from '../context/NavigationContext'
import { useAuth } from '../context/AuthContext'
import { useDeleteAccount } from '../hooks/useDeleteAccount'
import '../styles/shop.css'
import '../styles/auth.css'

/**
 * Auto-serviço de exclusão de conta — exigido pela Apple (guideline
 * 5.1.1(v)): quem deixa criar conta pelo app também precisa deixar apagar
 * pelo app, sem precisar passar por suporte.
 *
 * Confirmação por texto digitado, não só um confirm() de navegador: é uma
 * ação irreversível de verdade, diferente das outras confirmações "esconder
 * item"/"apagar nota" já usadas no app.
 */
export function DeleteAccountPage() {
  const { closeOverlay, goHome } = useNav()
  const { usuario } = useAuth()
  const { excluirConta, excluindo, erro } = useDeleteAccount()
  const [confirmacao, setConfirmacao] = useState('')
  const podeExcluir = confirmacao.trim().toUpperCase() === 'DELETE'

  async function aoConfirmar() {
    if (!podeExcluir) return
    const ok = await excluirConta()
    if (ok) goHome()
  }

  return (
    <div className="support-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">Delete account</span>
        </div>
      </header>

      <div className="pdp">
        <p className="desc">
          This permanently deletes the account signed in as <b>{usuario?.email}</b>. This cannot be
          undone.
        </p>

        <div className="label">What happens</div>
        <ul style={{ margin: '0 0 20px', paddingLeft: 18, color: 'var(--q-dust)', fontSize: 13, lineHeight: 1.7 }}>
          <li>You're signed out immediately and can't sign back in with this email unless you create a new account.</li>
          <li>Past orders and promotion bookings stay on record for our accounting and legal
            obligations, but are no longer linked to an account.</li>
          <li>Any bid you're currently winning in The Q Vault is withdrawn — if the auction is still
            open when you delete your account, you won't be able to complete that purchase.</li>
          <li>Your saved card verification, shipping address, and notifications are deleted.</li>
        </ul>
        <p className="desc">
          Want a copy of your data instead, or only part of this? Use Help &amp; Support instead of
          deleting your account.
        </p>

        <label className="campo">
          <span>Type DELETE to confirm</span>
          <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} placeholder="DELETE" />
        </label>

        {erro && (
          <p className="auth-erro" role="alert">
            {erro}
          </p>
        )}

        <button type="button" className="btn danger" disabled={!podeExcluir || excluindo} onClick={aoConfirmar}>
          {excluindo ? 'Deleting…' : 'Delete my account'}
        </button>
      </div>
    </div>
  )
}

export default DeleteAccountPage
