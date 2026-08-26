import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { submitVisitorRequest, type DadosSolicitacaoVisitante } from '../hooks/useVisitorRequest'
import { ROTULO_EXPERIENCE, type VisitorExperienceLevel } from '../types/visitor'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/visitors.css'

function idadeEm(dataNascimento: string): number | null {
  if (!dataNascimento) return null
  const [ano, mes, dia] = dataNascimento.split('-').map(Number)
  if (!ano || !mes || !dia) return null
  const nascimento = new Date(ano, mes - 1, dia)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())
  if (aindaNaoFezAniversario) idade -= 1
  return idade
}

const HOJE = new Date().toISOString().slice(0, 10)

/**
 * Formulário de solicitação de aula de visitante. A checagem de 18+ aqui é
 * só UX -- quem barra de verdade é submit_visitor_class_request no banco
 * (visitor-schema.sql), que recalcula a idade a partir da mesma data.
 */
export function VisitorRequestPage() {
  const { closeOverlay, openOverlay } = useNav()
  const { usuario, carregando: carregandoAuth } = useAuth()

  const [fullName, setFullName] = useState((usuario?.user_metadata?.full_name as string | undefined) ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [requestedClassName, setRequestedClassName] = useState('')
  const [requestedDate, setRequestedDate] = useState('')
  const [requestedTime, setRequestedTime] = useState('')
  const [experienceLevel, setExperienceLevel] = useState<VisitorExperienceLevel>('none')
  const [martialArtsExperience, setMartialArtsExperience] = useState('')
  const [notesFromVisitor, setNotesFromVisitor] = useState('')
  const [acknowledgedNoGuarantee, setAcknowledgedNoGuarantee] = useState(false)

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const idade = useMemo(() => idadeEm(dateOfBirth), [dateOfBirth])
  const menorDeIdade = dateOfBirth.length === 10 && idade !== null && idade < 18

  const valido =
    fullName.trim().length >= 2 &&
    email.includes('@') &&
    dateOfBirth.length === 10 &&
    !menorDeIdade &&
    requestedClassName.trim().length >= 2 &&
    requestedDate.length === 10 &&
    acknowledgedNoGuarantee

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!valido) return

    setEnviando(true)
    const dados: DadosSolicitacaoVisitante = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      dateOfBirth,
      requestedClassName: requestedClassName.trim(),
      requestedDate,
      requestedTime,
      experienceLevel,
      martialArtsExperience: martialArtsExperience.trim(),
      notesFromVisitor: notesFromVisitor.trim(),
      acknowledgedNoGuarantee,
    }
    const resultado = await submitVisitorRequest(dados)
    setEnviando(false)

    if ('erro' in resultado) return setErro(resultado.erro)
    closeOverlay()
    openOverlay({ name: 'my-visitor-request' })
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
          <span className="wordmark">Request a Visitor Class</span>
        </div>
      </header>

      {carregandoAuth ? (
        <p className="empty">Loading…</p>
      ) : !usuario ? (
        <div className="auth-aviso">
          <h3>Sign in to request a visitor class</h3>
          <p>Your request, waiver, and Visitor Pass are all tied to your account.</p>
          <button type="button" className="btn" onClick={() => openOverlay({ name: 'auth' })}>
            Sign in
          </button>
        </div>
      ) : (
        <>
          <p className="support-intro">
            Tell us a bit about yourself and the class you&rsquo;d like to try. Our team reviews every
            request — this does not book a spot automatically.
          </p>

          <form className="auth-form" onSubmit={enviar} noValidate>
            <label className="campo">
              <span>Full legal name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                placeholder="Your full name"
              />
            </label>

            <label className="campo">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
              />
            </label>

            <label className="campo">
              <span>Phone — optional</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
              />
            </label>

            <label className="campo">
              <span>Date of birth</span>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={HOJE}
              />
            </label>
            {menorDeIdade && (
              <p className="visitor-age-aviso" role="alert">
                THE Q MMA is an adult-only academy — visitors must be 18 or older to train.
              </p>
            )}
            {dateOfBirth.length === 10 && !menorDeIdade && (
              <p className="visitor-age-ok">You meet the 18+ requirement.</p>
            )}

            <label className="campo">
              <span>Class you&rsquo;d like to try</span>
              <input
                type="text"
                value={requestedClassName}
                onChange={(e) => setRequestedClassName(e.target.value)}
                placeholder="e.g. Muay Thai Fundamentals"
              />
            </label>

            <label className="campo">
              <span>Preferred date</span>
              <input
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                min={HOJE}
              />
            </label>

            <label className="campo">
              <span>Preferred time — optional</span>
              <input
                type="text"
                value={requestedTime}
                onChange={(e) => setRequestedTime(e.target.value)}
                placeholder="e.g. 6:00 PM"
              />
            </label>

            <label className="campo">
              <span>Combat sports experience</span>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as VisitorExperienceLevel)}
              >
                {Object.entries(ROTULO_EXPERIENCE).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo">
              <span>Tell us about your training background — optional</span>
              <textarea
                rows={3}
                value={martialArtsExperience}
                onChange={(e) => setMartialArtsExperience(e.target.value)}
                placeholder="Any gyms, disciplines, or time training…"
              />
            </label>

            <label className="campo">
              <span>Anything else we should know — optional</span>
              <textarea
                rows={3}
                value={notesFromVisitor}
                onChange={(e) => setNotesFromVisitor(e.target.value)}
                placeholder="Injuries, questions, scheduling constraints…"
              />
            </label>

            <label className="waiver-check-row">
              <input
                type="checkbox"
                checked={acknowledgedNoGuarantee}
                onChange={(e) => setAcknowledgedNoGuarantee(e.target.checked)}
              />
              <span>
                I understand that submitting this request does not guarantee approval or a scheduled
                class, and that I will need to sign a liability waiver before training if approved.
              </span>
            </label>

            {erro && (
              <p className="auth-erro" role="alert">
                {erro}
              </p>
            )}

            <button type="submit" className="btn" disabled={!valido || enviando}>
              {enviando ? 'Sending…' : 'Submit request'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default VisitorRequestPage
