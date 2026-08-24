/**
 * Cria o pedido e a sessão de pagamento do Stripe.
 *
 * O app manda só ids de variação e quantidades. TODO o resto — preço, nome,
 * estoque — é consultado aqui, no banco, com a service role. O valor que o
 * celular acha que vai pagar não entra na conta: confiar no preço vindo do
 * dispositivo é o caminho clássico de fraude em checkout.
 *
 * O pedido nasce como awaiting_payment. Quem o marca como pago NUNCA é esta
 * função nem o app: é o webhook do Stripe (stripe-webhook), depois de validar
 * a assinatura. Chegar na tela de sucesso não prova pagamento.
 *
 * Segredos esperados (supabase secrets set):
 *   STRIPE_SECRET_KEY   chave secreta do Stripe (sk_test_... em teste)
 */

import Stripe from 'npm:stripe@17'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

/** Frete acima deste subtotal sai de graça. */
const FRETE_GRATIS_A_PARTIR_DE = 15000
const FRETE_PADRAO_CENTS = 695
const FRETE_EXPRESSO_CENTS = 1995

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

interface ItemPedido {
  variantId: string
  quantity: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return resposta(405, { erro: 'Method not allowed' })

  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Faltam segredos: STRIPE_SECRET_KEY ou variáveis do Supabase.')
    return resposta(500, { erro: 'Missing configuration' })
  }

  // ---------------------------------------------------------------- corpo --
  let itens: ItemPedido[]
  try {
    const corpo = await req.json()
    itens = corpo.itens
  } catch {
    return resposta(400, { erro: 'Invalid JSON' })
  }

  if (!Array.isArray(itens) || itens.length === 0 || itens.length > 20) {
    return resposta(400, { erro: 'Between 1 and 20 items.' })
  }
  // O id vai interpolado num filtro do PostgREST; exigir o formato de uuid
  // aqui elimina qualquer chance de um valor arbitrário mexer na consulta.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  for (const item of itens) {
    if (typeof item?.variantId !== 'string' || !UUID.test(item.variantId)) {
      return resposta(400, { erro: 'Malformed item.' })
    }
    if (!Number.isInteger(item?.quantity) || item.quantity < 1 || item.quantity > 10) {
      return resposta(400, { erro: 'Quantity must be between 1 and 10.' })
    }
  }
  // Duas linhas da mesma variação seriam uma forma de passar do limite de 10.
  const idsUnicos = new Set(itens.map((i) => i.variantId))
  if (idsUnicos.size !== itens.length) {
    return resposta(400, { erro: 'Duplicated item.' })
  }

  // ------------------------------------------------------- quem está comprando
  // Comprar sem conta é permitido. Se houver sessão, o pedido fica vinculado
  // e aparece em My Orders; o vínculo vem do JWT validado pelo Auth, nunca de
  // um user_id enviado no corpo — senão qualquer um criaria pedidos em nome
  // de outra pessoa.
  let userId: string | null = null
  let userEmail: string | null = null
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (jwt && jwt !== ANON_KEY) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY ?? '', Authorization: `Bearer ${jwt}` },
    })
    if (r.ok) {
      const user = await r.json()
      userId = user.id ?? null
      userEmail = user.email ?? null
    }
  }

  // ------------------------------------------------ variações, direto do banco
  const idsParam = [...idsUnicos].map((id) => `"${id}"`).join(',')
  const consulta = await fetch(
    `${SUPABASE_URL}/rest/v1/product_variants?id=in.(${idsParam})&select=id,sku,color_name,color_slug,size,price_cents,stock,is_active,products(id,name,is_active,mode,mockup_key)`,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
  )
  if (!consulta.ok) {
    console.error('Falha ao consultar variações:', consulta.status, await consulta.text())
    return resposta(500, { erro: 'Could not load products.' })
  }
  const variacoes: any[] = await consulta.json()
  const porId = new Map(variacoes.map((v) => [v.id, v]))

  // ------------------------------------------------------------- validação --
  const problemas: string[] = []
  for (const item of itens) {
    const v = porId.get(item.variantId)
    if (!v || !v.is_active || !v.products?.is_active) {
      problemas.push('One of the items is no longer available.')
      continue
    }
    if (v.stock < item.quantity) {
      problemas.push(
        v.stock === 0
          ? `${v.products.name} (${v.color_name} · ${v.size}) is sold out.`
          : `${v.products.name} (${v.color_name} · ${v.size}): only ${v.stock} left.`,
      )
    }
  }
  if (problemas.length > 0) {
    // 409: o carrinho do cliente ficou para trás em relação ao estoque.
    return resposta(409, { erro: problemas.join(' ') })
  }

  const subtotalCents = itens.reduce((soma, item) => {
    const v = porId.get(item.variantId)!
    return soma + v.price_cents * item.quantity
  }, 0)

  // ------------------------------------------------------------- o pedido --
  const linhas = itens.map((item) => {
    const v = porId.get(item.variantId)!
    const p = v.products
    return {
      variant_id: v.id,
      product_id: p.id,
      sku: v.sku,
      product_name: p.name,
      color_name: v.color_name,
      size: v.size,
      unit_price_cents: v.price_cents,
      quantity: item.quantity,
      // Derivada no servidor, não recebida do app: a imagem é cosmética, mas
      // nada vindo do dispositivo entra no pedido sem necessidade.
      image_url:
        p.mode === 'mockup' && p.mockup_key
          ? `/images/shirts/${p.mockup_key}-${v.color_slug}.png`
          : null,
    }
  })

  const criarPedido = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      email: userEmail,
      subtotal_cents: subtotalCents,
      total_cents: subtotalCents, // frete e imposto entram no webhook, vindos do Stripe
    }),
  })
  if (!criarPedido.ok) {
    console.error('Falha ao criar pedido:', criarPedido.status, await criarPedido.text())
    return resposta(500, { erro: 'Could not create the order.' })
  }
  const [pedido] = await criarPedido.json()

  const criarItens = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(linhas.map((l) => ({ ...l, order_id: pedido.id }))),
  })
  if (!criarItens.ok) {
    console.error('Falha ao criar itens:', criarItens.status, await criarItens.text())
    // Sem itens o pedido não serve para nada — melhor não deixar meia-carcaça.
    await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${pedido.id}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
    })
    return resposta(500, { erro: 'Could not create the order.' })
  }

  // -------------------------------------------------------------- Stripe --
  // A origem vem do cabeçalho que o navegador define, não do corpo: é para
  // onde o Stripe devolve o cliente depois de pagar, e um valor arbitrário no
  // corpo viraria redirecionamento aberto pós-pagamento.
  const origem = req.headers.get('origin') ?? 'http://localhost:5173'

  const stripe = new Stripe(STRIPE_SECRET_KEY)

  const freteGratis = subtotalCents >= FRETE_GRATIS_A_PARTIR_DE

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: linhas.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: l.unit_price_cents,
          product_data: {
            name: `${l.product_name} — ${l.color_name} / ${l.size}`,
            metadata: { sku: l.sku },
          },
        },
      })),
      customer_email: userEmail ?? undefined,
      shipping_address_collection: { allowed_countries: ['US', 'BR'] },
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: freteGratis ? 'Free shipping' : 'Standard shipping',
            type: 'fixed_amount',
            fixed_amount: { currency: 'usd', amount: freteGratis ? 0 : FRETE_PADRAO_CENTS },
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
        {
          shipping_rate_data: {
            display_name: 'Express shipping',
            type: 'fixed_amount',
            fixed_amount: { currency: 'usd', amount: FRETE_EXPRESSO_CENTS },
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 3 },
            },
          },
        },
      ],
      metadata: { order_id: pedido.id, order_number: pedido.order_number },
      payment_intent_data: {
        metadata: { order_id: pedido.id, order_number: pedido.order_number },
      },
      success_url: `${origem}/?pedido=sucesso&numero=${encodeURIComponent(pedido.order_number)}`,
      cancel_url: `${origem}/?pedido=cancelado`,
      // 35 min: o mínimo do Stripe é 30 CONTADOS DO LADO DELES, e mandar
      // exatamente 30 falha por segundos de latência de relógio. Sessão
      // abandonada dispara checkout.session.expired e o webhook cancela.
      expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
    })

    await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${pedido.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stripe_session_id: session.id }),
    })

    return resposta(200, { url: session.url, numero: pedido.order_number })
  } catch (e) {
    console.error('Stripe recusou a sessão:', e)
    return resposta(500, { erro: 'Payment could not be started.' })
  }
})
