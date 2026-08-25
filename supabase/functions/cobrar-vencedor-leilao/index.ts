/**
 * Cobra o vencedor de um leilão do The Q Vault, off-session, usando o cartão
 * verificado em verificar-cartao-leilao.
 *
 * Nunca é chamada pelo app nem por um usuário — quem chama é
 * processar_leiloes() (SQL, via pg_net) assim que fecha um leilão ou passa a
 * vaga pro segundo colocado. Por isso não valida JWT de usuário nenhum:
 * publique com --no-verify-jwt, igual stripe-webhook. A única entrada é
 * { order_id }.
 *
 * Esta função só INICIA a cobrança. Quem de fato marca o pedido como pago ou
 * falho é o webhook (payment_intent.succeeded / payment_intent.payment_failed)
 * — o resultado de uma cobrança off-session pode chegar de forma assíncrona
 * (ex.: o banco pede autenticação extra), então confiar só no retorno
 * síncrono daqui deixaria pedido "preso" se o Stripe decidir resolver depois.
 *
 * Segredos esperados (supabase secrets set):
 *   STRIPE_SECRET_KEY   chave secreta do Stripe (sk_test_... em teste)
 */

import Stripe from 'npm:stripe@17'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function resposta(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

const db = {
  apikey: SERVICE_ROLE ?? '',
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return resposta(405, { erro: 'Method not allowed' })

  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Faltam segredos: STRIPE_SECRET_KEY ou variáveis do Supabase.')
    return resposta(500, { erro: 'Missing configuration' })
  }

  let corpo: { order_id?: string }
  try {
    corpo = await req.json()
  } catch {
    return resposta(400, { erro: 'Invalid JSON' })
  }
  const orderId = corpo.order_id
  if (!orderId) return resposta(400, { erro: 'Missing order_id' })

  const consultaPedido = await fetch(
    `${SUPABASE_URL}/rest/v1/auction_orders?id=eq.${orderId}&select=id,winner_id,winning_bid_cents,payment_status,item_title_snapshot`,
    { headers: db },
  )
  if (!consultaPedido.ok) return resposta(500, { erro: 'Could not load order.' })
  const [pedido] = await consultaPedido.json()
  if (!pedido) return resposta(404, { erro: 'Order not found.' })

  if (pedido.payment_status !== 'awaiting_payment') {
    // Já processado (reenvio, ou webhook chegou antes) -- nada a fazer.
    return resposta(200, { ok: true, repetido: true })
  }

  const consultaPerfil = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${pedido.winner_id}&select=stripe_customer_id,stripe_payment_method_id`,
    { headers: db },
  )
  const [perfil] = consultaPerfil.ok ? await consultaPerfil.json() : []

  if (!perfil?.stripe_customer_id || !perfil?.stripe_payment_method_id) {
    // Não devia acontecer -- dar_lance() exige cartão verificado antes de
    // aceitar lance. Defensivo: marca falho pra entrar no ciclo de retry/
    // repasse em vez de travar em awaiting_payment pra sempre.
    console.error('Vencedor sem cartão verificado:', pedido.winner_id, orderId)
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/marcar_cobranca_falhou`, {
      method: 'POST',
      headers: db,
      body: JSON.stringify({ p_order_id: orderId }),
    })
    return resposta(200, { ok: true, semCartao: true })
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY)

  try {
    await stripe.paymentIntents.create({
      amount: pedido.winning_bid_cents,
      currency: 'usd',
      customer: perfil.stripe_customer_id,
      payment_method: perfil.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description: `The Q Vault — ${pedido.item_title_snapshot}`,
      metadata: { order_type: 'auction', auction_order_id: orderId },
    })
    // Sucesso ou falha "de verdade" (recusa, exige autenticação) chegam pelo
    // webhook — inclusive quando confirm:true já resolve tudo de forma
    // síncrona, o Stripe ainda dispara o evento correspondente.
    return resposta(200, { ok: true })
  } catch (e) {
    console.error('Cobrança off-session falhou:', e)
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/marcar_cobranca_falhou`, {
      method: 'POST',
      headers: db,
      body: JSON.stringify({ p_order_id: orderId }),
    })
    return resposta(200, { ok: true, falhou: true })
  }
})
