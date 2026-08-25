/**
 * Verifica o cartão do licitante antes de liberar lances no The Q Vault.
 *
 * Não cobra nada agora — cria uma sessão do Stripe em `mode: 'setup'`, que só
 * salva um meio de pagamento reutilizável no Customer (o próprio Stripe já
 * confere se o cartão é válido nesse passo, sem reter valor nenhum). Quem
 * cobra de verdade é a função cobrar-vencedor-leilao, só se e quando o
 * usuário vencer um leilão (fase 5).
 *
 * Mesmo espírito de criar-checkout-promocao: exige login (verificação de
 * cartão sem identidade por trás não serve pra nada), mesmo bloco de
 * Customer salvo em profiles. O webhook (checkout.session.completed com
 * metadata.order_type = 'card_verification') é quem de fato lê o
 * SetupIntent e grava stripe_payment_method_id.
 *
 * Segredos esperados (supabase secrets set):
 *   STRIPE_SECRET_KEY   chave secreta do Stripe (sk_test_... em teste)
 */

import Stripe from 'npm:stripe@17'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function resposta(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

const db = (SERVICE_ROLE: string) => ({
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return resposta(405, { erro: 'Method not allowed' })

  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    console.error('Faltam segredos: STRIPE_SECRET_KEY ou variáveis do Supabase.')
    return resposta(500, { erro: 'Missing configuration' })
  }
  const headersDb = db(SERVICE_ROLE)

  // ------------------------------------------------------- quem está verificando --
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt || jwt === ANON_KEY) {
    return resposta(401, { erro: 'Sign in to verify a card.' })
  }
  const perfilAuth = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` },
  })
  if (!perfilAuth.ok) return resposta(401, { erro: 'Sign in to verify a card.' })
  const usuarioAuth = await perfilAuth.json()
  const userId: string | null = usuarioAuth.id ?? null
  const userEmail: string | null = usuarioAuth.email ?? null
  if (!userId) return resposta(401, { erro: 'Sign in to verify a card.' })

  // -------------------------------------------------------------- Stripe --
  const origem = req.headers.get('origin') ?? 'http://localhost:5173'
  const stripe = new Stripe(STRIPE_SECRET_KEY)

  // Mesmo bloco de criar-checkout/criar-checkout-promocao: Customer salvo em
  // profiles, criado se não existir, confirmado que ainda vale antes de usar.
  let customerId: string | null = null
  const perfil = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id`,
    { headers: headersDb },
  )
  if (perfil.ok) customerId = (await perfil.json())[0]?.stripe_customer_id ?? null

  if (customerId) {
    try {
      const atual = await stripe.customers.retrieve(customerId)
      if ((atual as { deleted?: boolean }).deleted) customerId = null
    } catch {
      customerId = null
    }
  }

  if (!customerId) {
    try {
      const cliente = await stripe.customers.create({
        email: userEmail ?? undefined,
        metadata: { supabase_user_id: userId },
      })
      customerId = cliente.id
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: headersDb,
        body: JSON.stringify({ stripe_customer_id: customerId }),
      })
    } catch (e) {
      console.error('Não consegui criar o Customer no Stripe:', e)
      return resposta(500, { erro: 'Could not start card verification.' })
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId!,
      metadata: { order_type: 'card_verification', supabase_user_id: userId },
      success_url: `${origem}/?leilao_cartao=sucesso`,
      cancel_url: `${origem}/?leilao_cartao=cancelado`,
    })

    return resposta(200, { url: session.url })
  } catch (e) {
    console.error('Stripe recusou a sessão de verificação:', e)
    return resposta(500, { erro: 'Could not start card verification.' })
  }
})
