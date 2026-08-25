/**
 * Exclui a conta de quem chamou (auto-serviço, exigido pela Apple —
 * guideline 5.1.1(v): quem deixa criar conta pelo app também precisa deixar
 * apagar pelo app).
 *
 * Só apaga a PRÓPRIA conta -- o id vem do JWT autenticado, nunca do corpo da
 * requisição. profiles cai sozinho por causa do "on delete cascade" em
 * auth-schema.sql; pedidos e reservas de promoção ficam (o user_id vira
 * null, o resto do pedido é uma cópia própria -- é assim que já funciona
 * pra compra de visitante). Isto NÃO apaga nada do lado do Stripe/Resend --
 * é só a conta de login. Um pedido de apagamento completo de dados continua
 * indo pelo Help & Support, como já descrito na Privacy Policy.
 *
 * Segredos esperados (supabase secrets set):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY
 */

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return resposta(405, { erro: 'Method not allowed' })

  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    console.error('Faltam variáveis do Supabase.')
    return resposta(500, { erro: 'Missing configuration' })
  }

  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt || jwt === ANON_KEY) {
    return resposta(401, { erro: 'Sign in to delete your account.' })
  }

  const perfilAuth = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` },
  })
  if (!perfilAuth.ok) return resposta(401, { erro: 'Sign in to delete your account.' })
  const usuarioAuth = await perfilAuth.json()
  const userId: string | null = usuarioAuth.id ?? null
  if (!userId) return resposta(401, { erro: 'Sign in to delete your account.' })

  const exclusao = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
  })

  if (!exclusao.ok) {
    const texto = await exclusao.text()
    console.error('Falha ao excluir conta:', exclusao.status, texto)
    return resposta(500, { erro: 'Could not delete your account. Try again or contact support.' })
  }

  return resposta(200, { ok: true })
})
