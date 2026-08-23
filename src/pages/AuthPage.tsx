import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import '../styles/shop.css'
import '../styles/auth.css'

type Modo = 'entrar' | 'cadastrar'

export function AuthPage() {
  const { entrar, cadastrar } = useAuth()
  const { closeOverlay } = useNav()

  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmarEmail, setConfirmarEmail] = useState(false)

  const trocarModo = (novo: Modo) => {
    setModo(novo)
    setErro(null)
    setSenha('')
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (modo === 'cadastrar' && nome.trim().length < 2) {
      setErro('Digite seu nome.')
      return
    }
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setEnviando(true)
    if (modo === 'entrar') {
      const { erro } = await entrar(email.trim(), senha)
      setEnviando(false)
      if (erro) return setErro(erro)
      closeOverlay()
      return
    }

    const { erro: erroCadastro, precisaConfirmar } = await cadastrar(nome.trim(), email.trim(), senha)
    setEnviando(false)
    if (erroCadastro) return setErro(erroCadastro)
    // Sem confirmação exigida o Supabase já devolve sessão e o usuário entra
    // direto; com confirmação, mostramos o aviso da caixa de entrada.
    if (precisaConfirmar) setConfirmarEmail(true)
    else closeOverlay()
  }

  if (confirmarEmail) {
    return (
      <div className="auth-screen">
        <Cabecalho titulo="Check your email" />
        <div className="auth-aviso">
          <div className="auth-aviso-icone" aria-hidden>
            ✉
          </div>
          <h3>Confirm your email</h3>
          <p>
            We sent a confirmation link to <b>{email}</b>. Open it to activate your account, then
            come back and sign in.
          </p>
          <button type="button" className="btn" onClick={() => { setConfirmarEmail(false); trocarModo('entrar') }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <Cabecalho titulo={modo === 'entrar' ? 'Sign in' : 'Create account'} />

      <div className="auth-abas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'entrar'}
          className={`auth-aba ${modo === 'entrar' ? 'on' : ''}`}
          onClick={() => trocarModo('entrar')}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'cadastrar'}
          className={`auth-aba ${modo === 'cadastrar' ? 'on' : ''}`}
          onClick={() => trocarModo('cadastrar')}
        >
          Create account
        </button>
      </div>

      <form className="auth-form" onSubmit={enviar} noValidate>
        {modo === 'cadastrar' && (
          <label className="campo">
            <span>Name</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
            />
          </label>
        )}

        <label className="campo">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="campo">
          <span>Password</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            placeholder="At least 6 characters"
            required
          />
        </label>

        {erro && (
          <p className="auth-erro" role="alert">
            {erro}
          </p>
        )}

        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? 'Please wait…' : modo === 'entrar' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

function Cabecalho({ titulo }: { titulo: string }) {
  const { closeOverlay } = useNav()
  return (
    <header className="appbar">
      <div className="appbar-lead">
        <button type="button" className="appbar-back" onClick={closeOverlay} aria-label="Voltar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <span className="wordmark">{titulo}</span>
      </div>
    </header>
  )
}
