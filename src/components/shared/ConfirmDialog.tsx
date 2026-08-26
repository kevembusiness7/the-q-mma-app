/**
 * Primeiro modal do app. Confinado ao frame do telefone via position:
 * absolute + inset: 0 -- ver .confirm-dialog-overlay em visitors.css e o
 * porquê em AppShell.tsx (o wrapper .relative é o ancestral mais próximo).
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirming = false,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="confirm-dialog-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="confirm-dialog-card">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-dialog-botoes">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={confirming}>
            {cancelLabel}
          </button>
          <button type="button" className="btn" onClick={onConfirm} disabled={confirming}>
            {confirming ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
