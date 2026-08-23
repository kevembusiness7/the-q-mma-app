import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface ResultadoAuth {
  /** Mensagem pronta para a tela, ou null se deu certo. */
  erro: string | null
}

interface ResultadoCadastro extends ResultadoAuth {
  /** O projeto exige confirmação por e-mail antes do primeiro login. */
  precisaConfirmar: boolean
}

interface AuthValue {
  usuario: User | null
  sessao: Session | null
  /** true enquanto a sessão salva ainda está sendo restaurada. */
  carregando: boolean
  /** Vem da coluna is_admin em `profiles`, não do app. */
  ehAdmin: boolean
  /** true logo depois de voltar do link de confirmação de e-mail. */
  confirmouEmail: boolean
  descartarConfirmacao: () => void
  entrar: (email: string, senha: string) => Promise<ResultadoAuth>
  cadastrar: (nome: string, email: string, senha: string) => Promise<ResultadoCadastro>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

/**
 * Traduz os erros do Supabase, que chegam em inglês e às vezes técnicos
 * demais para mostrar direto na tela.
 */
function traduzErro(mensagem: string): string {
  const m = mensagem.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.'
  if (m.includes('user already registered')) return 'Já existe uma conta com esse e-mail.'
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'E-mail inválido.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas. Espere alguns minutos.'
  return mensagem
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(isSupabaseConfigured)
  const [ehAdmin, setEhAdmin] = useState(false)

  /* Lido uma única vez, na primeira renderização: o supabase-js consome o
     hash da URL e o apaga logo em seguida, então depois disso não há mais como
     saber que o usuário chegou por um link de confirmação. */
  const [confirmouEmail, setConfirmouEmail] = useState(() => {
    if (typeof window === 'undefined') return false
    const hash = window.location.hash
    return hash.includes('access_token') && hash.includes('type=signup')
  })

  useEffect(() => {
    if (!supabase) {
      setCarregando(false)
      return
    }

    // Restaura a sessão que o supabase-js guarda no localStorage.
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // O papel de admin é lido do banco a cada sessão. Guardar isso no app seria
  // inútil como proteção: quem controla o navegador controla o valor. Quem
  // decide de verdade é o RLS no Supabase.
  useEffect(() => {
    const id = sessao?.user?.id
    if (!supabase || !id) {
      setEhAdmin(false)
      return
    }
    let cancelado = false
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado) setEhAdmin(Boolean(data?.is_admin))
      })
    return () => {
      cancelado = true
    }
  }, [sessao?.user?.id])

  const value = useMemo<AuthValue>(
    () => ({
      usuario: sessao?.user ?? null,
      sessao,
      carregando,
      ehAdmin,
      confirmouEmail,
      descartarConfirmacao: () => setConfirmouEmail(false),

      async entrar(email, senha) {
        if (!supabase) return { erro: 'Supabase não está configurado.' }
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
        return { erro: error ? traduzErro(error.message) : null }
      },

      async cadastrar(nome, email, senha) {
        if (!supabase) return { erro: 'Supabase não está configurado.', precisaConfirmar: false }
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { full_name: nome },
            /* Manda o link de confirmação de volta para o endereço onde o app
               está rodando agora, em vez de depender só da Site URL fixa do
               painel. Esse endereço precisa estar na lista de Redirect URLs
               do Supabase, senão ele ignora e usa a Site URL. */
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) return { erro: traduzErro(error.message), precisaConfirmar: false }
        // Sem sessão na resposta = o projeto exige confirmar o e-mail.
        return { erro: null, precisaConfirmar: !data.session }
      },

      async sair() {
        await supabase?.auth.signOut()
      },
    }),
    [sessao, carregando, ehAdmin, confirmouEmail],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return value
}
