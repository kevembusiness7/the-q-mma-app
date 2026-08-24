/**
 * Cria o pedido de promoção (reserva) e a sessão de pagamento do Stripe.
 *
 * Mesmo espírito de criar-checkout: o app manda só o id do pacote e a data
 * pedida, preço e disponibilidade são conferidos aqui, no banco, com a
 * service role. Nada que vem do dispositivo entra na conta.
 *
 * Diferenças de propósito em relação ao checkout da loja:
 *   - Exige login. Reserva paga precisa de uma identidade por trás pra
 *     disputa/reembolso -- ao contrário da loja, não existe "comprar visitante".
 *   - Sem frete: é reserva de conteúdo, não peça física.
 *   - Confere a data (athlete_slug + requested_date) antes de criar a sessão,
 *     e a linha nasce ocupando a vaga -- é o que impede duas pessoas com
 *     checkout válido pro mesmo atleta no mesmo dia (ver o índice único em
 *     promotions-schema.sql).
 *   - Se o Stripe recusar a sessão, a linha recém-criada é APAGADA. Diferente
 *     de criar-checkout: lá um pedido de loja sem sessão não trava nada; aqui
 *     ele ficaria segurando a data pra sempre, porque nunca receberia o
 *     evento checkout.session.expired do Stripe.
 *
 * O pedido nasce como awaiting_payment. Quem o marca como pago NUNCA é esta
 * função nem o app: é o webhook do Stripe, depois de validar a assinatura.
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

interface Campanha {
  logoPath: string | null
  mediaPath: string
  caption: string | null
  websiteLink: string | null
  businessInstagram: string
  cta: string | null
  notes: string | null
}

interface CorpoRequisicao {
  athleteSlug: string
  packageId: string
  requestedDate: string
  needsContentCreation: boolean
  campaign: Campanha
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATA = /^\d{4}-\d{2}-\d{2}$/
const LIMITE_TEXTO = 2000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return resposta(405, { erro: 'Method not allowed' })

  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    console.error('Faltam segredos: STRIPE_SECRET_KEY ou variáveis do Supabase.')
    return resposta(500, { erro: 'Missing configuration' })
  }
  const headersDb = db(SERVICE_ROLE)

  // ---------------------------------------------------------------- corpo --
  let corpo: CorpoRequisicao
  try {
    corpo = await req.json()
  } catch {
    return resposta(400, { erro: 'Invalid JSON' })
  }

  if (typeof corpo?.athleteSlug !== 'string' || corpo.athleteSlug.trim() === '') {
    return resposta(400, { erro: 'Missing athlete.' })
  }
  if (typeof corpo?.packageId !== 'string' || !UUID.test(corpo.packageId)) {
    return resposta(400, { erro: 'Malformed package.' })
  }
  if (typeof corpo?.requestedDate !== 'string' || !DATA.test(corpo.requestedDate)) {
    return resposta(400, { erro: 'Malformed date.' })
  }
  // Comparação por string YYYY-MM-DD evita fuso horário mexer no resultado.
  const hoje = new Date().toISOString().slice(0, 10)
  if (corpo.requestedDate < hoje) {
    return resposta(400, { erro: 'Requested date is in the past.' })
  }
  const campanha = corpo.campaign
  if (!campanha || typeof campanha.mediaPath !== 'string' || campanha.mediaPath.trim() === '') {
    return resposta(400, { erro: 'Missing campaign media.' })
  }
  if (typeof campanha.businessInstagram !== 'string' || campanha.businessInstagram.trim() === '') {
    return resposta(400, { erro: 'Missing business Instagram handle.' })
  }
  for (const campo of ['caption', 'websiteLink', 'cta', 'notes'] as const) {
    const valor = campanha[campo]
    if (valor != null && typeof valor === 'string' && valor.length > LIMITE_TEXTO) {
      return resposta(400, { erro: `${campo} is too long.` })
    }
  }

  // ------------------------------------------------------- quem está reservando
  // Ao contrário da loja, aqui NÃO existe reserva de visitante: dinheiro
  // trocado por um serviço que ainda vai ser produzido precisa de uma
  // identidade por trás, para eventual disputa/reembolso.
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt || jwt === ANON_KEY) {
    return resposta(401, { erro: 'Sign in to book a promotion.' })
  }
  const perfilAuth = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` },
  })
  if (!perfilAuth.ok) return resposta(401, { erro: 'Sign in to book a promotion.' })
  const usuarioAuth = await perfilAuth.json()
  const userId: string | null = usuarioAuth.id ?? null
  const userEmail: string | null = usuarioAuth.email ?? null
  if (!userId) return resposta(401, { erro: 'Sign in to book a promotion.' })

  // -------------------------------------------------------- atleta e pacote --
  const consultaAtleta = await fetch(
    `${SUPABASE_URL}/rest/v1/promotion_athletes?slug=eq.${encodeURIComponent(corpo.athleteSlug)}&select=slug,name,allow_promotions`,
    { headers: headersDb },
  )
  if (!consultaAtleta.ok) return resposta(500, { erro: 'Could not load athlete.' })
  const [atleta] = await consultaAtleta.json()
  if (!atleta) return resposta(404, { erro: 'Athlete not found.' })
  if (!atleta.allow_promotions) return resposta(409, { erro: 'This athlete is not accepting promotions right now.' })

  const consultaPacote = await fetch(
    `${SUPABASE_URL}/rest/v1/promotion_packages?id=eq.${corpo.packageId}&select=id,athlete_slug,title,content_type,price_cents,content_creation_fee_cents,is_active`,
    { headers: headersDb },
  )
  if (!consultaPacote.ok) return resposta(500, { erro: 'Could not load package.' })
  const [pacote] = await consultaPacote.json()
  if (!pacote || pacote.athlete_slug !== atleta.slug || !pacote.is_active) {
    return resposta(404, { erro: 'Package not found for this athlete.' })
  }

  const precisaCriacao = corpo.needsContentCreation === true
  const totalCents =
    pacote.price_cents + (precisaCriacao ? pacote.content_creation_fee_cents : 0)

  // ------------------------------------------------------- conflito de data --
  // Checagem cedo, com mensagem legível. O índice único em
  // promotion_requests é quem garante de verdade contra a corrida — esta
  // consulta só evita mandar alguém pro Stripe pra descobrir o erro depois.
  const consultaConflito = await fetch(
    `${SUPABASE_URL}/rest/v1/promotion_requests?athlete_slug=eq.${encodeURIComponent(atleta.slug)}&requested_date=eq.${corpo.requestedDate}&review_status=not.in.(cancelled,rejected)&select=id`,
    { headers: headersDb },
  )
  if (consultaConflito.ok) {
    const conflitos = await consultaConflito.json()
    if (Array.isArray(conflitos) && conflitos.length > 0) {
      return resposta(409, { erro: 'This athlete already has a booking on that date. Pick another day.' })
    }
  }

  // -------------------------------------------------------------- a reserva --
  const criarPedido = await fetch(`${SUPABASE_URL}/rest/v1/promotion_requests`, {
    method: 'POST',
    headers: { ...headersDb, Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      athlete_slug: atleta.slug,
      athlete_name_snapshot: atleta.name,
      package_id: pacote.id,
      package_title_snapshot: pacote.title,
      package_content_type: pacote.content_type,
      package_price_cents: pacote.price_cents,
      needs_content_creation: precisaCriacao,
      content_creation_fee_cents: precisaCriacao ? pacote.content_creation_fee_cents : 0,
      requested_date: corpo.requestedDate,
      total_cents: totalCents,
      campaign_logo_path: campanha.logoPath ?? null,
      campaign_media_path: campanha.mediaPath,
      campaign_caption: campanha.caption ?? null,
      campaign_website_link: campanha.websiteLink ?? null,
      campaign_business_instagram: campanha.businessInstagram,
      campaign_cta: campanha.cta ?? null,
      campaign_notes: campanha.notes ?? null,
    }),
  })
  if (!criarPedido.ok) {
    const texto = await criarPedido.text()
    console.error('Falha ao criar reserva:', criarPedido.status, texto)
    // 23505 = violação do índice único de data -- alguém ganhou a corrida
    // entre a checagem acima e este insert.
    if (texto.includes('23505') || texto.includes('duplicate key')) {
      return resposta(409, { erro: 'This athlete just got booked for that date. Pick another day.' })
    }
    return resposta(500, { erro: 'Could not create the booking.' })
  }
  const [reserva] = await criarPedido.json()

  // -------------------------------------------------------------- Stripe --
  const origem = req.headers.get('origin') ?? 'http://localhost:5173'
  const stripe = new Stripe(STRIPE_SECRET_KEY)

  // Mesmo bloco de criar-checkout: Customer salvo em profiles, criado se não
  // existir, confirmado que ainda vale antes de usar.
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
    }
  }

  const nomeLinha =
    `${atleta.name} — ${pacote.title}` + (precisaCriacao ? ' + content creation' : '')

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: totalCents,
            product_data: { name: nomeLinha },
          },
        },
      ],
      ...(customerId
        ? { customer: customerId, customer_update: { address: 'auto', name: 'auto' } }
        : { customer_email: userEmail ?? undefined }),
      metadata: { promotion_id: reserva.id, order_type: 'promotion' },
      payment_intent_data: {
        metadata: { promotion_id: reserva.id, order_type: 'promotion' },
      },
      success_url: `${origem}/?promocao=sucesso&numero=${encodeURIComponent(reserva.request_number)}`,
      cancel_url: `${origem}/?promocao=cancelado`,
      expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
    })

    await fetch(`${SUPABASE_URL}/rest/v1/promotion_requests?id=eq.${reserva.id}`, {
      method: 'PATCH',
      headers: headersDb,
      body: JSON.stringify({ stripe_session_id: session.id }),
    })

    return resposta(200, { url: session.url, numero: reserva.request_number })
  } catch (e) {
    console.error('Stripe recusou a sessão:', e)
    // Sem sessão, esta linha nunca vai receber checkout.session.expired do
    // Stripe -- e ficaria segurando a data do atleta para sempre. Apaga.
    await fetch(`${SUPABASE_URL}/rest/v1/promotion_requests?id=eq.${reserva.id}`, {
      method: 'DELETE',
      headers: headersDb,
    })
    return resposta(500, { erro: 'Payment could not be started.' })
  }
})
