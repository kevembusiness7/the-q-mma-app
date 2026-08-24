/**
 * Avisa o cliente por e-mail que o pedido saiu, com o código de rastreio.
 *
 * Chamada pelo painel da equipe logo depois de "Mark as shipped". Não é um
 * Database Webhook de propósito: assim a pessoa que despachou vê na hora se o
 * e-mail saiu ou falhou, e pode reenviar — num webhook a falha morreria no log.
 *
 * QUEM PODE CHAMAR: só admin. O JWT do usuário é resolvido no Auth e o
 * is_admin é lido de `profiles` com a service role. A função NUNCA aceita
 * "sou admin" vindo do corpo, nem o e-mail de destino vindo do corpo — o
 * destinatário sai do pedido no banco. Do contrário, qualquer pessoa logada
 * mandaria e-mail com a marca da loja para quem quisesse.
 *
 * Segredos esperados (já existem, do Help & Support):
 *   RESEND_API_KEY, EMAIL_REMETENTE
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const EMAIL_REMETENTE = Deno.env.get('EMAIL_REMETENTE') ?? 'onboarding@resend.dev'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const db = {
  apikey: SERVICE_ROLE ?? '',
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
}

function resposta(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function centavos(valor: number): string {
  return `$${(valor / 100).toFixed(2)}`
}

/**
 * Link de rastreio das transportadoras que a gente usa. Transportadora
 * desconhecida devolve null e o e-mail mostra só o código — melhor do que
 * mandar o cliente para uma página de erro.
 */
function linkDeRastreio(transportadora: string | null, codigo: string | null): string | null {
  if (!transportadora || !codigo) return null
  const c = encodeURIComponent(codigo.replace(/\s+/g, ''))
  switch (transportadora.trim().toLowerCase()) {
    case 'usps':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${c}`
    case 'ups':
      return `https://www.ups.com/track?tracknum=${c}`
    case 'fedex':
      return `https://www.fedex.com/fedextrack/?trknbr=${c}`
    case 'dhl':
      return `https://www.dhl.com/en/express/tracking.html?AWB=${c}`
    default:
      return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return resposta(405, { erro: 'Method not allowed' })

  if (!SUPABASE_URL || !SERVICE_ROLE || !RESEND_API_KEY) {
    console.error('Faltam segredos: RESEND_API_KEY ou variáveis do Supabase.')
    return resposta(500, { erro: 'Missing configuration' })
  }

  // ------------------------------------------------------------- entrada --
  let orderId: string
  try {
    orderId = (await req.json()).order_id
  } catch {
    return resposta(400, { erro: 'Invalid JSON' })
  }
  // O id vai interpolado num filtro do PostgREST; exigir o formato de uuid
  // elimina qualquer chance de um valor arbitrário mexer na consulta.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (typeof orderId !== 'string' || !UUID.test(orderId)) {
    return resposta(400, { erro: 'Malformed order id.' })
  }

  // ------------------------------------------------------------ quem chama --
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt || jwt === ANON_KEY) return resposta(401, { erro: 'Sign in required.' })

  const quem = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY ?? '', Authorization: `Bearer ${jwt}` },
  })
  if (!quem.ok) return resposta(401, { erro: 'Invalid session.' })
  const userId = (await quem.json()).id

  const perfil = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=is_admin`,
    { headers: db },
  )
  const [linhaPerfil] = perfil.ok ? await perfil.json() : []
  if (!linhaPerfil?.is_admin) return resposta(403, { erro: 'Team accounts only.' })

  // -------------------------------------------------------------- pedido --
  const consulta = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=order_number,email,payment_status,fulfillment_status,tracking_carrier,tracking_number,total_cents,ship_name,shipping_email_sent_at,order_items(product_name,color_name,size,quantity,unit_price_cents)`,
    { headers: db },
  )
  if (!consulta.ok) {
    console.error('Falha ao ler pedido:', consulta.status, await consulta.text())
    return resposta(500, { erro: 'Could not load the order.' })
  }
  const [pedido] = await consulta.json()
  if (!pedido) return resposta(404, { erro: 'Order not found.' })

  // O e-mail promete uma coisa; o banco tem que concordar com ela. Avisar
  // "seu pedido saiu" sobre um pedido que não está despachado é pior do que
  // não avisar nada.
  if (pedido.fulfillment_status !== 'shipped') {
    return resposta(409, { erro: 'This order is not marked as shipped.' })
  }
  if (!pedido.email) {
    return resposta(409, { erro: 'This order has no email address on file.' })
  }

  // --------------------------------------------------------------- e-mail --
  const link = linkDeRastreio(pedido.tracking_carrier, pedido.tracking_number)
  const itens: any[] = pedido.order_items ?? []

  const linhasHtml = itens
    .map(
      (i) =>
        `<tr><td style="padding:4px 12px 4px 0">${escapar(i.product_name)} — ${escapar(i.color_name)} / ${escapar(i.size)} × ${i.quantity}</td><td style="text-align:right">${centavos(i.unit_price_cents * i.quantity)}</td></tr>`,
    )
    .join('')

  const blocoRastreio = pedido.tracking_number
    ? `
      <div style="border:1px solid #e5e0d8;border-radius:10px;padding:14px;margin:18px 0">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#8a8178">Tracking</p>
        <p style="margin:0;font-size:15px"><b>${escapar(pedido.tracking_carrier ?? '')}</b> · ${escapar(pedido.tracking_number)}</p>
        ${
          link
            ? `<p style="margin:10px 0 0"><a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:9px 16px;border-radius:6px;font-size:13px">Track my package</a></p>`
            : `<p style="margin:8px 0 0;font-size:13px;color:#666">Use this number on your carrier's website to follow the delivery.</p>`
        }
      </div>`
    : ''

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b8860b;margin:0 0 4px">THE Q MMA</p>
      <h2 style="margin:0 0 8px;font-size:20px">Your order is on its way</h2>
      <p style="font-size:14px;color:#444;margin:0">
        ${escapar(pedido.ship_name ? pedido.ship_name.split(' ')[0] : 'Hey')}, order
        <b>${escapar(pedido.order_number)}</b> just shipped.
      </p>
      ${blocoRastreio}
      <table style="border-collapse:collapse;font-size:14px;width:100%;max-width:420px">
        ${linhasHtml}
        <tr><td style="padding:8px 12px 0 0;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold;padding-top:8px">${centavos(pedido.total_cents)}</td></tr>
      </table>
      <p style="font-size:13px;color:#666;margin-top:20px">
        Questions about this delivery? Just reply to this email, or use Help &amp; Support in the app.
      </p>
    </div>`

  const envio = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: EMAIL_REMETENTE,
      to: [pedido.email],
      subject: `[The Q] Order ${pedido.order_number} shipped`,
      html,
    }),
  })
  if (!envio.ok) {
    const detalhe = await envio.text()
    console.error('Resend recusou:', envio.status, detalhe)
    return resposta(502, { erro: 'The email service refused the message.' })
  }

  // Marca o envio para o painel poder distinguir "ainda não avisei" de "já
  // avisei" — e para um clique duplo não virar dois e-mails para o cliente.
  await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
    method: 'PATCH',
    headers: db,
    body: JSON.stringify({ shipping_email_sent_at: new Date().toISOString() }),
  })

  return resposta(200, { ok: true, para: pedido.email })
})
