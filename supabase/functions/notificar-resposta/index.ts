/**
 * Avisa por e-mail quando alguém responde num chamado.
 *
 * Funciona nos dois sentidos, decidido pelo campo is_staff da mensagem:
 *   - resposta da equipe  -> e-mail para o CLIENTE
 *   - resposta do cliente -> e-mail para a EQUIPE
 *
 * Disparada por um Database Webhook no INSERT de support_messages.
 *
 * A mensagem gravada não carrega o e-mail nem o nome de quem abriu o chamado,
 * só o ticket_id. Por isso a função consulta support_tickets usando a
 * SERVICE_ROLE_KEY, que o Supabase injeta sozinho nas Edge Functions: as
 * políticas de RLS bloqueariam essa leitura, e aqui quem lê é o sistema, não
 * um usuário. Essa chave nunca sai do servidor.
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const EMAIL_DESTINO = Deno.env.get('EMAIL_DESTINO')
const EMAIL_REMETENTE = Deno.env.get('EMAIL_REMETENTE') ?? 'onboarding@resend.dev'
const WEBHOOK_SEGREDO = Deno.env.get('WEBHOOK_SEGREDO')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const CATEGORIAS: Record<string, string> = {
  question: 'Dúvida',
  payment: 'Pagamento',
  technical: 'Problema técnico',
  account: 'Conta',
  suggestion: 'Sugestão',
  other: 'Outro',
}

/** Evita que um texto com < > quebre (ou injete) o HTML do e-mail. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function moldura(titulo: string, corpo: string, rodape: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b8860b;margin:0 0 4px">
        THE Q MMA — Help &amp; Support
      </p>
      <h2 style="margin:0 0 16px;font-size:20px">${titulo}</h2>
      <div style="white-space:pre-wrap;border-left:3px solid #d6a62e;padding:8px 0 8px 14px;font-size:14px;line-height:1.6">${corpo}</div>
      <p style="font-size:13px;color:#666;margin-top:20px">${rodape}</p>
    </div>
  `
}

async function enviarEmail(para: string, responderPara: string, assunto: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_REMETENTE,
      to: [para],
      reply_to: responderPara,
      subject: assunto,
      html,
    }),
  })
  return r
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (WEBHOOK_SEGREDO && req.headers.get('x-webhook-segredo') !== WEBHOOK_SEGREDO) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!RESEND_API_KEY || !EMAIL_DESTINO || !SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Faltam segredos ou variáveis do Supabase.')
    return new Response('Missing configuration', { status: 500 })
  }

  let mensagem: Record<string, any>
  try {
    const corpo = await req.json()
    mensagem = corpo.record ?? corpo
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!mensagem?.ticket_id || !mensagem?.body) {
    return new Response('Missing message', { status: 400 })
  }

  // Busca o chamado para saber quem é o cliente e qual o assunto.
  const consulta = await fetch(
    `${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${mensagem.ticket_id}&select=id,name,email,category`,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
  )

  const chamados = await consulta.json()
  const chamado = Array.isArray(chamados) ? chamados[0] : null
  if (!chamado) {
    console.error('Chamado não encontrado para a mensagem', mensagem.ticket_id)
    return new Response('Ticket not found', { status: 200 })
  }

  const protocolo = String(chamado.id).slice(0, 8).toUpperCase()
  const categoria = CATEGORIAS[chamado.category] ?? chamado.category
  const texto = escapar(String(mensagem.body))

  let destinatario: string
  let responderPara: string
  let assunto: string
  let html: string

  if (mensagem.is_staff) {
    // Resposta da equipe -> vai para o cliente.
    destinatario = chamado.email
    responderPara = EMAIL_DESTINO
    assunto = `Re: [The Q] #${protocolo} · ${categoria}`
    html = moldura(
      `Resposta ao seu chamado #${protocolo}`,
      texto,
      'Para continuar a conversa, responda este e-mail ou acesse Help &amp; Support no app.',
    )
  } else {
    // Resposta do cliente -> avisa a equipe.
    destinatario = EMAIL_DESTINO
    responderPara = chamado.email
    assunto = `[The Q] #${protocolo} · ${categoria} — resposta de ${chamado.name ?? ''}`
    html = moldura(
      `${escapar(chamado.name ?? '')} respondeu no chamado #${protocolo}`,
      texto,
      'Responda pelo Support inbox do app, ou direto neste e-mail.',
    )
  }

  const resposta = await enviarEmail(destinatario, responderPara, assunto, html)

  if (!resposta.ok) {
    const detalhe = await resposta.text()
    console.error('Resend recusou o envio:', resposta.status, detalhe)
    // 200 de propósito: a mensagem JÁ está gravada, e devolver erro faria o
    // webhook repetir a tentativa à toa. A falha fica no log.
    return new Response(JSON.stringify({ enviado: false, detalhe }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({ enviado: true, para: mensagem.is_staff ? 'cliente' : 'equipe', protocolo }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
