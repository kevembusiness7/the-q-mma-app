/**
 * Recebe os eventos do Stripe e é o ÚNICO lugar que marca um pedido como pago.
 *
 * O app nunca faz isso — chegar na tela de sucesso não prova pagamento. O
 * Stripe assina cada evento com um segredo, a assinatura é validada aqui, e
 * só então o pedido muda de estado. É o que impede pedido falso, pagamento
 * forjado pelo dispositivo e confirmação duplicada.
 *
 * Eventos tratados:
 *   checkout.session.completed         checkout concluído. Só vira 'paid' se
 *                                      session.payment_status já for 'paid'.
 *                                      Com metadata.order_type = 'card_verification'
 *                                      (The Q Vault), não é pagamento nenhum —
 *                                      só salva o cartão verificado.
 *   checkout.session.async_payment_succeeded  o dinheiro caiu depois (boleto,
 *                                      débito, Pix) -> paid
 *   checkout.session.async_payment_failed     não caiu -> cancelled
 *   checkout.session.expired           sessão abandonada -> cancelled
 *
 * Segredos esperados (supabase secrets set):
 *   STRIPE_SECRET_KEY       chave secreta do Stripe
 *   STRIPE_WEBHOOK_SECRET   signing secret do endpoint (whsec_...)
 *   RESEND_API_KEY          para os e-mails de confirmação
 *   EMAIL_DESTINO           e-mail da equipe
 *   EMAIL_REMETENTE         remetente verificado no Resend
 *
 * Publique com --no-verify-jwt: quem chama é o Stripe, sem JWT do Supabase.
 * A autenticação real é a assinatura do evento.
 */

import Stripe from 'npm:stripe@17'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const EMAIL_DESTINO = Deno.env.get('EMAIL_DESTINO')
const EMAIL_REMETENTE = Deno.env.get('EMAIL_REMETENTE') ?? 'onboarding@resend.dev'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const db = {
  apikey: SERVICE_ROLE ?? '',
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
}

function centavos(valor: number): string {
  return `$${(valor / 100).toFixed(2)}`
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function enviarEmail(para: string, assunto: string, html: string) {
  if (!RESEND_API_KEY) return
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_REMETENTE, to: [para], subject: assunto, html }),
  })
  if (!r.ok) {
    // Pagamento confirmado com e-mail falho não pode virar retry do Stripe:
    // o estado do pedido já está certo. Fica no log.
    console.error('Resend recusou:', r.status, await r.text())
  }
}

/**
 * Confirma o pagamento de uma reserva de Athlete Promotion.
 *
 * Irmã mais simples do bloco de pedido de loja logo abaixo: sem item, sem
 * frete, sem endereço, sem baixa de estoque. Pagar NUNCA aprova o conteúdo —
 * review_status fica intocado, no 'pending_review' que já trazia por padrão.
 */
async function confirmarPromocao(session: Stripe.Checkout.Session): Promise<Response> {
  const promotionId = session.metadata?.promotion_id
  if (!promotionId) {
    console.error('Sessão de promoção sem promotion_id no metadata:', session.id)
    return new Response('Missing promotion reference', { status: 200 })
  }

  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    console.log('Sessão de promoção concluída mas ainda não paga:', session.id, session.payment_status)
    return new Response(JSON.stringify({ ok: true, aguardando: session.payment_status }), {
      status: 200,
    })
  }

  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirmar_pagamento_promocao`, {
    method: 'POST',
    headers: db,
    body: JSON.stringify({
      promo_id: promotionId,
      dados: {
        payment_intent_id:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        total_cents: session.amount_total,
      },
    }),
  })
  if (!rpc.ok) {
    console.error('Falha ao confirmar pagamento de promoção:', rpc.status, await rpc.text())
    return new Response('Could not confirm payment', { status: 500 })
  }
  const resultado = await rpc.json()
  if (!resultado?.reivindicado) {
    return new Response(JSON.stringify({ ok: true, repetido: true }), { status: 200 })
  }

  const emailCliente = session.customer_details?.email ?? null
  if (emailCliente) {
    await enviarEmail(
      emailCliente,
      `[The Q] Booking ${resultado.request_number} received`,
      `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
        <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b8860b;margin:0 0 4px">THE Q MMA</p>
        <h2 style="margin:0 0 8px;font-size:20px">Payment received — ${resultado.request_number}</h2>
        <p style="font-size:14px;color:#444;margin:0 0 16px">
          We received your payment of ${centavos(resultado.total_cents ?? session.amount_total ?? 0)}.
          Our team will review your campaign and confirm the schedule — you'll see the status
          update under My Promotions in the app.
        </p>
      </div>`,
    )
  }

  if (EMAIL_DESTINO) {
    await enviarEmail(
      EMAIL_DESTINO,
      `[The Q] Nova reserva de promoção ${resultado.request_number} — pendente de revisão`,
      `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
        <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b8860b;margin:0 0 4px">THE Q MMA — nova reserva</p>
        <h2 style="margin:0 0 8px;font-size:20px">${resultado.request_number}</h2>
        <p style="font-size:14px;margin-top:8px">
          Pago: ${centavos(resultado.total_cents ?? session.amount_total ?? 0)}<br/>
          Aguardando revisão no painel Promotion requests.
        </p>
      </div>`,
    )
  }

  return new Response(
    JSON.stringify({ ok: true, promocao: resultado.request_number }),
    { status: 200 },
  )
}

/**
 * Salva o cartão verificado no The Q Vault.
 *
 * Sessão em `mode: 'setup'` não move dinheiro nenhum -- payment_status vem
 * 'no_payment_required', então o gate de "session.payment_status === paid"
 * do resto do arquivo já deixa passar sem precisar de exceção. Só lê o
 * SetupIntent pra pegar o payment_method e grava em profiles.
 */
async function confirmarVerificacaoCartao(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
): Promise<Response> {
  const userId = session.metadata?.supabase_user_id
  const setupIntentId =
    typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id
  if (!userId || !setupIntentId) {
    console.error('Sessão de verificação de cartão sem supabase_user_id/setup_intent:', session.id)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
  const paymentMethodId =
    typeof setupIntent.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id

  if (setupIntent.status !== 'succeeded' || !paymentMethodId) {
    console.log('SetupIntent ainda não confirmado:', setupIntentId, setupIntent.status)
    return new Response(JSON.stringify({ ok: true, aguardando: setupIntent.status }), { status: 200 })
  }

  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: db,
    body: JSON.stringify({
      stripe_payment_method_id: paymentMethodId,
      bid_verified_at: new Date().toISOString(),
    }),
  })

  return new Response(JSON.stringify({ ok: true, verificado: true }), { status: 200 })
}

/**
 * Confirma a cobrança do vencedor de um leilão do The Q Vault.
 *
 * Diferente dos outros dois fluxos deste arquivo, não nasce de uma Checkout
 * Session -- cobrar-vencedor-leilao cria o PaymentIntent direto, off-session.
 * Por isso o evento aqui é payment_intent.succeeded, não
 * checkout.session.completed, e não existe session.customer_details pra
 * tirar o e-mail: busca no endpoint admin do GoTrue pelo user_id.
 */
async function confirmarCobrancaLeilao(paymentIntent: Stripe.PaymentIntent): Promise<Response> {
  const orderId = paymentIntent.metadata?.auction_order_id
  if (!orderId) {
    console.error('PaymentIntent de leilão sem auction_order_id no metadata:', paymentIntent.id)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirmar_cobranca_leilao`, {
    method: 'POST',
    headers: db,
    body: JSON.stringify({ p_order_id: orderId, p_payment_intent_id: paymentIntent.id }),
  })
  if (!rpc.ok) {
    console.error('Falha ao confirmar cobrança de leilão:', rpc.status, await rpc.text())
    return new Response('Could not confirm payment', { status: 500 })
  }
  const resultado = await rpc.json()
  if (!resultado?.reivindicado) {
    return new Response(JSON.stringify({ ok: true, repetido: true }), { status: 200 })
  }

  const perfilRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${resultado.winner_id}`, {
    headers: db,
  })
  const emailVencedor = perfilRes.ok ? ((await perfilRes.json())?.email ?? null) : null

  if (emailVencedor) {
    await enviarEmail(
      emailVencedor,
      `[The Q Vault] Payment confirmed — ${resultado.order_number}`,
      `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
        <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b8860b;margin:0 0 4px">THE Q VAULT</p>
        <h2 style="margin:0 0 8px;font-size:20px">You won it! — ${resultado.order_number}</h2>
        <p style="font-size:14px;color:#444;margin:0 0 16px">
          Your card was charged ${centavos(resultado.winning_bid_cents)} for "${escapar(resultado.item_title_snapshot)}".
          Add your shipping address under My Bids so we can get it moving.
        </p>
      </div>`,
    )
  }

  if (EMAIL_DESTINO) {
    await enviarEmail(
      EMAIL_DESTINO,
      `[The Q Vault] Venda confirmada ${resultado.order_number} — ${centavos(resultado.winning_bid_cents)}`,
      `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
        <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b8860b;margin:0 0 4px">THE Q VAULT — venda confirmada</p>
        <h2 style="margin:0 0 8px;font-size:20px">${resultado.order_number}</h2>
        <p style="font-size:14px;margin-top:8px">"${escapar(resultado.item_title_snapshot)}" — ${centavos(resultado.winning_bid_cents)}</p>
      </div>`,
    )
  }

  return new Response(JSON.stringify({ ok: true, pedido: resultado.order_number }), { status: 200 })
}

/**
 * O PaymentIntent off-session falhou (recusa, exige autenticação que não dá
 * pra pedir de novo automaticamente). Mesma regra do resto do arquivo: só
 * muda o status se ainda estava awaiting_payment.
 */
async function marcarCobrancaFalhouLeilao(paymentIntent: Stripe.PaymentIntent): Promise<Response> {
  const orderId = paymentIntent.metadata?.auction_order_id
  if (!orderId) return new Response(JSON.stringify({ ok: true }), { status: 200 })

  await fetch(`${SUPABASE_URL}/rest/v1/rpc/marcar_cobranca_falhou`, {
    method: 'POST',
    headers: db,
    body: JSON.stringify({ p_order_id: orderId }),
  })

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Faltam segredos do Stripe ou do Supabase.')
    return new Response('Missing configuration', { status: 500 })
  }

  // ------------------------------------------------------------ assinatura --
  // O corpo precisa ser lido CRU: qualquer reserialização muda os bytes e a
  // assinatura deixa de bater.
  const assinatura = req.headers.get('stripe-signature')
  if (!assinatura) return new Response('Missing signature', { status: 400 })

  const corpoCru = await req.text()
  const stripe = new Stripe(STRIPE_SECRET_KEY)

  let evento: Stripe.Event
  try {
    evento = await stripe.webhooks.constructEventAsync(
      corpoCru,
      assinatura,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    )
  } catch (e) {
    console.error('Assinatura inválida:', e)
    return new Response('Invalid signature', { status: 400 })
  }

  // ------------------------------------------------------ abandono / recusa --
  if (
    evento.type === 'checkout.session.expired' ||
    evento.type === 'checkout.session.async_payment_failed'
  ) {
    const session = evento.data.object as Stripe.Checkout.Session

    if (session.metadata?.order_type === 'promotion') {
      const promotionId = session.metadata?.promotion_id
      if (promotionId) {
        // review_status também muda pra 'cancelled' aqui -- é ele, não
        // payment_status, quem segura a vaga no índice único de data em
        // promotion_requests. Sem soltar os dois, a data ficaria travada por
        // um checkout que ninguém nunca vai terminar.
        await fetch(
          `${SUPABASE_URL}/rest/v1/promotion_requests?id=eq.${promotionId}&payment_status=eq.awaiting_payment`,
          {
            method: 'PATCH',
            headers: db,
            body: JSON.stringify({ payment_status: 'cancelled', review_status: 'cancelled' }),
          },
        )
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    const orderId = session.metadata?.order_id
    if (orderId) {
      // Só cancela se ainda estava aguardando: um evento atrasado de expiração
      // nunca pode desfazer um pedido que chegou a ser pago.
      await fetch(
        `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&payment_status=eq.awaiting_payment`,
        { method: 'PATCH', headers: db, body: JSON.stringify({ payment_status: 'cancelled' }) },
      )
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  // ------------------------------------------------------------- estorno --
  // O estorno é feito à mão no painel do Stripe — construir um botão nosso
  // seria assumir risco de dinheiro para economizar um clique. Mas sem ouvir
  // o evento, o pedido continuaria dizendo "Paid" para o cliente e para a
  // equipe. Aqui só o status muda de lado.
  //
  // O estoque NÃO volta sozinho: peça devolvida nem sempre volta vendável, e
  // repor automaticamente criaria peça fantasma no site. Vira anotação para
  // alguém conferir.
  if (evento.type === 'charge.refunded') {
    const charge = evento.data.object as Stripe.Charge
    const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
    if (!pi) return new Response(JSON.stringify({ ok: true }), { status: 200 })

    const total = charge.amount_refunded >= charge.amount

    const achou = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?stripe_payment_intent_id=eq.${pi}&select=id,order_number`,
      { headers: db },
    )
    const [alvo] = achou.ok ? await achou.json() : []
    if (alvo) {
      // Estorno parcial não é pedido estornado: o cliente ficou com a compra e
      // recebeu parte do dinheiro de volta. Marcar tudo como refunded apagaria
      // uma venda que existe.
      if (total) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${alvo.id}`, {
          method: 'PATCH',
          headers: db,
          body: JSON.stringify({ payment_status: 'refunded' }),
        })
      }

      await fetch(`${SUPABASE_URL}/rest/v1/order_admin_notes`, {
        method: 'POST',
        headers: db,
        body: JSON.stringify({
          order_id: alvo.id,
          note: `${total ? 'Estorno total' : 'Estorno parcial'} de ${centavos(charge.amount_refunded)} registrado no Stripe. O estoque NÃO foi reposto — confira a peça antes de devolvê-la ao site.`,
        }),
      })

      return new Response(JSON.stringify({ ok: true, estornado: alvo.order_number }), { status: 200 })
    }

    // Não era pedido de loja -- tenta promoção antes de desistir.
    const achouPromo = await fetch(
      `${SUPABASE_URL}/rest/v1/promotion_requests?stripe_payment_intent_id=eq.${pi}&select=id,request_number`,
      { headers: db },
    )
    const [alvoPromo] = achouPromo.ok ? await achouPromo.json() : []
    if (!alvoPromo) {
      console.error('Estorno sem pedido correspondente:', pi)
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    if (total) {
      await fetch(`${SUPABASE_URL}/rest/v1/promotion_requests?id=eq.${alvoPromo.id}`, {
        method: 'PATCH',
        headers: db,
        body: JSON.stringify({ payment_status: 'refunded' }),
      })
    }

    await fetch(`${SUPABASE_URL}/rest/v1/promotion_admin_notes`, {
      method: 'POST',
      headers: db,
      body: JSON.stringify({
        promotion_id: alvoPromo.id,
        note: `${total ? 'Estorno total' : 'Estorno parcial'} de ${centavos(charge.amount_refunded)} registrado no Stripe.`,
      }),
    })

    return new Response(
      JSON.stringify({ ok: true, estornado: alvoPromo.request_number }),
      { status: 200 },
    )
  }

  // ------------------------------------------------- cobrança de leilão --
  // Nasce fora de uma Checkout Session (cobrar-vencedor-leilao cria o
  // PaymentIntent direto, off-session), então dispara payment_intent.*, não
  // checkout.session.*.
  if (evento.type === 'payment_intent.succeeded') {
    const paymentIntent = evento.data.object as Stripe.PaymentIntent
    if (paymentIntent.metadata?.order_type === 'auction') {
      return await confirmarCobrancaLeilao(paymentIntent)
    }
    return new Response(JSON.stringify({ ignorado: 'payment_intent nao é de leilão' }), { status: 200 })
  }

  if (evento.type === 'payment_intent.payment_failed') {
    const paymentIntent = evento.data.object as Stripe.PaymentIntent
    if (paymentIntent.metadata?.order_type === 'auction') {
      return await marcarCobrancaFalhouLeilao(paymentIntent)
    }
    return new Response(JSON.stringify({ ignorado: 'payment_intent nao é de leilão' }), { status: 200 })
  }

  if (
    evento.type !== 'checkout.session.completed' &&
    evento.type !== 'checkout.session.async_payment_succeeded'
  ) {
    // Evento que não tratamos: 200 para o Stripe não ficar reenviando.
    return new Response(JSON.stringify({ ignorado: evento.type }), { status: 200 })
  }

  // ---------------------------------------------------------------- pagou? --
  const session = evento.data.object as Stripe.Checkout.Session

  if (session.metadata?.order_type === 'promotion') {
    return await confirmarPromocao(session)
  }

  if (session.metadata?.order_type === 'card_verification') {
    return await confirmarVerificacaoCartao(session, stripe)
  }

  const orderId = session.metadata?.order_id
  if (!orderId) {
    console.error('Sessão sem order_id no metadata:', session.id)
    return new Response('Missing order reference', { status: 200 })
  }

  /* completed NÃO significa pago. Com métodos de pagamento assíncronos — que
     no Stripe são um botão no painel, sem uma linha de código aqui — a sessão
     é concluída com payment_status 'unpaid' e o dinheiro cai minutos ou dias
     depois, num async_payment_succeeded. Confiar no nome do evento liberaria
     estoque e mandaria "order confirmed" por um pagamento que ainda pode
     falhar. Quem manda é o campo. ('no_payment_required' é o caso de total
     zero, ex.: cupom de 100%.) */
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    console.log('Sessão concluída mas ainda não paga:', session.id, session.payment_status)
    return new Response(JSON.stringify({ ok: true, aguardando: session.payment_status }), {
      status: 200,
    })
  }

  /* O endereço mudou de lugar entre versões da API do Stripe: contas novas
     entregam em collected_information.shipping_details, as antigas em
     shipping_details na raiz. Cobrir os dois evita perder o endereço de
     entrega conforme a idade da conta. */
  const entrega =
    (session as any).collected_information?.shipping_details ?? (session as any).shipping_details
  const endereco = entrega?.address ?? session.customer_details?.address
  const emailCliente = session.customer_details?.email ?? null

  /* Uma chamada só, uma transação: reivindicar o pedido, gravar os dados do
     Stripe e baixar o estoque acontecem juntos ou não acontecem.

     A reivindicação (só altera quem AINDA está awaiting_payment) fecha a
     corrida do reenvio: o Stripe manda o mesmo evento mais de uma vez, e dois
     processados juntos passariam ambos por um "buscar, checar, atualizar",
     baixando o estoque duas vezes. Aqui só um altera a linha.

     Juntar a baixa na mesma transação fecha o outro buraco: quando eram duas
     chamadas de rede, morrer no meio deixava o pedido pago com o estoque
     intacto — e o reenvio, batendo na reivindicação, ia embora achando que
     era repetido. A baixa nunca mais era tentada. */
  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirmar_pagamento`, {
    method: 'POST',
    headers: db,
    body: JSON.stringify({
      pedido: orderId,
      dados: {
        email: emailCliente,
        payment_intent_id:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        subtotal_cents: session.amount_subtotal,
        shipping_cents: session.shipping_cost?.amount_total ?? 0,
        tax_cents: session.total_details?.amount_tax ?? 0,
        // Cupom aplicado no checkout. O total já vem descontado; guardar o
        // desconto à parte é o que permite, depois, distinguir promoção de
        // erro de preço.
        discount_cents: session.total_details?.amount_discount ?? 0,
        total_cents: session.amount_total,
        ship_name: entrega?.name ?? session.customer_details?.name ?? null,
        ship_line1: endereco?.line1 ?? null,
        ship_line2: endereco?.line2 ?? null,
        ship_city: endereco?.city ?? null,
        ship_state: endereco?.state ?? null,
        ship_postal_code: endereco?.postal_code ?? null,
        ship_country: endereco?.country ?? null,
      },
    }),
  })
  if (!rpc.ok) {
    console.error('Falha ao confirmar pagamento:', rpc.status, await rpc.text())
    // 500 de propósito: o Stripe reenvia, a transação foi desfeita inteira e
    // a próxima tentativa começa do zero.
    return new Response('Could not confirm payment', { status: 500 })
  }
  const pedido = await rpc.json()
  if (!pedido?.reivindicado) {
    // Pedido inexistente, já pago ou já cancelado. Nos três casos não há nada
    // a fazer — e principalmente nada a baixar.
    return new Response(JSON.stringify({ ok: true, repetido: true }), { status: 200 })
  }

  // O Stripe sempre coleta e-mail no checkout; o do pedido é o plano B para
  // o improvável caso de a sessão voltar sem ele.
  const emailFinal = emailCliente ?? pedido.email ?? null
  const faltaram: string[] = pedido.faltaram ?? []

  // -------------------------------------------------------------- e-mails --
  const itensRes = await fetch(
    `${SUPABASE_URL}/rest/v1/order_items?order_id=eq.${orderId}&select=product_name,color_name,size,quantity,unit_price_cents`,
    { headers: db },
  )
  const itens: any[] = itensRes.ok ? await itensRes.json() : []

  const linhasHtml = itens
    .map(
      (i) =>
        `<tr><td style="padding:4px 12px 4px 0">${escapar(i.product_name)} — ${escapar(i.color_name)} / ${escapar(i.size)} × ${i.quantity}</td><td style="text-align:right">${centavos(i.unit_price_cents * i.quantity)}</td></tr>`,
    )
    .join('')

  const totais = `
    <table style="border-collapse:collapse;font-size:14px;width:100%;max-width:420px">
      ${linhasHtml}
      <tr><td style="padding:8px 12px 0 0;color:#666">Shipping</td><td style="text-align:right;padding-top:8px">${centavos(session.shipping_cost?.amount_total ?? 0)}</td></tr>
      ${
        (session.total_details?.amount_discount ?? 0) > 0
          ? `<tr><td style="padding:2px 12px 0 0;color:#666">Discount</td><td style="text-align:right">-${centavos(session.total_details?.amount_discount ?? 0)}</td></tr>`
          : ''
      }
      <tr><td style="padding:2px 12px 0 0;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold">${centavos(session.amount_total ?? 0)}</td></tr>
    </table>`

  if (emailFinal) {
    await enviarEmail(
      emailFinal,
      `[The Q] Order ${pedido.order_number} confirmed`,
      `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
        <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b8860b;margin:0 0 4px">THE Q MMA</p>
        <h2 style="margin:0 0 8px;font-size:20px">Order confirmed — ${pedido.order_number}</h2>
        <p style="font-size:14px;color:#444;margin:0 0 16px">Thanks for your purchase! We're preparing your order and will email you when it ships.</p>
        ${totais}
        <p style="font-size:13px;color:#666;margin-top:20px">You can follow this order under My Orders in the app.</p>
      </div>`,
    )
  }

  if (EMAIL_DESTINO) {
    const alerta =
      faltaram.length > 0
        ? `<p style="color:#b0301f;font-weight:bold">ATENÇÃO: estoque insuficiente para: ${escapar(faltaram.join(', '))}. Decida entre estornar ou repor.</p>`
        : ''
    await enviarEmail(
      EMAIL_DESTINO,
      `[The Q] Nova venda ${pedido.order_number} — ${centavos(session.amount_total ?? 0)}`,
      `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
        <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b8860b;margin:0 0 4px">THE Q MMA — nova venda</p>
        <h2 style="margin:0 0 8px;font-size:20px">${pedido.order_number}</h2>
        ${alerta}
        ${totais}
        <p style="font-size:14px;margin-top:16px">
          Cliente: ${escapar(session.customer_details?.name ?? '—')} · ${escapar(emailCliente ?? '—')}<br/>
          Entrega: ${escapar([endereco?.line1, endereco?.city, endereco?.state, endereco?.postal_code, endereco?.country].filter(Boolean).join(', ') || '—')}
        </p>
      </div>`,
    )
  }

  return new Response(JSON.stringify({ ok: true, pedido: pedido.order_number }), { status: 200 })
})
