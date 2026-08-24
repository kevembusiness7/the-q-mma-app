/**
 * Avisa a equipe por e-mail quando um chamado novo chega.
 *
 * Roda como Edge Function no Supabase, e não no app, por um motivo simples:
 * a chave do Resend não pode sair do servidor. Qualquer coisa embutida no
 * código do app viaja para o navegador do usuário e pode ser lida.
 *
 * Quem chama esta função é um Database Webhook do próprio Supabase, disparado
 * no INSERT em support_tickets. O app não a chama diretamente — assim ninguém
 * consegue usá-la para disparar e-mails à toa.
 *
 * Segredos esperados (supabase secrets set):
 *   RESEND_API_KEY   chave da API do Resend
 *   EMAIL_DESTINO    para onde vai o aviso (o seu e-mail)
 *   EMAIL_REMETENTE  remetente verificado no Resend
 *   WEBHOOK_SEGREDO  string qualquer, conferida no cabeçalho
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const EMAIL_DESTINO = Deno.env.get('EMAIL_DESTINO')
const EMAIL_REMETENTE = Deno.env.get('EMAIL_REMETENTE') ?? 'onboarding@resend.dev'
const WEBHOOK_SEGREDO = Deno.env.get('WEBHOOK_SEGREDO')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const CATEGORIAS: Record<string, string> = {
  question: 'Dúvida',
  order: 'Pedido',
  payment: 'Pagamento',
  technical: 'Problema técnico',
  account: 'Conta',
  suggestion: 'Sugestão',
  other: 'Outro',
}

/** Evita que um nome ou mensagem com < > quebre (ou injete) o HTML do e-mail. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Só o webhook conhece o segredo. Sem ele, qualquer um que descobrisse a
  // URL da função poderia disparar e-mails em nome do app.
  if (WEBHOOK_SEGREDO && req.headers.get('x-webhook-segredo') !== WEBHOOK_SEGREDO) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!RESEND_API_KEY || !EMAIL_DESTINO) {
    console.error('Faltam os segredos RESEND_API_KEY ou EMAIL_DESTINO.')
    return new Response('Missing configuration', { status: 500 })
  }

  let chamado: Record<string, any>
  try {
    const corpo = await req.json()
    // O webhook do Supabase manda { type, table, record, old_record }.
    chamado = corpo.record ?? corpo
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!chamado?.id) {
    return new Response('Missing ticket', { status: 400 })
  }

  // O webhook manda a linha crua, e nela o pedido é um uuid. O número que a
  // equipe reconhece mora em `orders`; sem esta busca o e-mail traria um id
  // que ninguém consegue procurar. Falha aqui não cancela o aviso — chamado
  // sem número de pedido ainda é melhor do que chamado nenhum.
  let numeroPedido: string | null = null
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (UUID.test(String(chamado.order_id ?? '')) && SUPABASE_URL && SERVICE_ROLE) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?id=eq.${chamado.order_id}&select=order_number`,
        { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
      )
      if (r.ok) numeroPedido = (await r.json())[0]?.order_number ?? null
    } catch (e) {
      console.error('Não consegui ler o número do pedido:', e)
    }
  }

  const protocolo = String(chamado.id).slice(0, 8).toUpperCase()
  const categoria = CATEGORIAS[chamado.category] ?? chamado.category
  const temAnexo = Boolean(chamado.screenshot_path)

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b8860b;margin:0 0 4px">
        THE Q MMA — novo chamado
      </p>
      <h2 style="margin:0 0 16px;font-size:20px">#${protocolo} · ${escapar(categoria)}</h2>
      <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Nome</td><td>${escapar(chamado.name ?? '')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">E-mail</td><td><a href="mailto:${escapar(chamado.email ?? '')}">${escapar(chamado.email ?? '')}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Conta</td><td>${chamado.user_id ? 'Usuário logado' : 'Visitante'}</td></tr>
        ${
          numeroPedido
            ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Pedido</td><td><b>${escapar(numeroPedido)}</b></td></tr>`
            : ''
        }
        <tr><td style="padding:4px 12px 4px 0;color:#666">Anexo</td><td>${temAnexo ? 'Sim — veja no painel' : 'Não'}</td></tr>
      </table>
      <div style="white-space:pre-wrap;border-left:3px solid #d6a62e;padding:8px 0 8px 14px;font-size:14px;line-height:1.6">${escapar(chamado.message ?? '')}</div>
      <p style="font-size:13px;color:#666;margin-top:20px">
        Responda pelo Support inbox do app, ou direto no e-mail acima.
      </p>
    </div>
  `

  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_REMETENTE,
      to: [EMAIL_DESTINO],
      // Responder no cliente de e-mail já endereça o cliente, sem copiar e colar.
      reply_to: chamado.email,
      subject: `[The Q] #${protocolo} · ${categoria}${numeroPedido ? ` · ${numeroPedido}` : ''} — ${chamado.name ?? ''}`,
      html,
    }),
  })

  if (!resposta.ok) {
    const detalhe = await resposta.text()
    console.error('Resend recusou o envio:', resposta.status, detalhe)
    // 200 de propósito: o chamado JÁ foi gravado, e devolver erro faria o
    // webhook ficar tentando de novo sem necessidade. A falha fica no log.
    return new Response(JSON.stringify({ enviado: false, detalhe }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ enviado: true, protocolo }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
