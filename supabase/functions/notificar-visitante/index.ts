/**
 * Avisa a equipe por e-mail quando um pedido de visita novo chega.
 *
 * Mesma receita de notificar-chamado: roda como Edge Function porque a chave
 * do Resend não pode sair do servidor, e quem chama é um Database Webhook do
 * Supabase disparado no INSERT em visitor_class_requests -- o app nunca
 * chama esta função direto.
 *
 * Segredos esperados (os mesmos já configurados para notificar-chamado):
 *   RESEND_API_KEY   chave da API do Resend
 *   EMAIL_DESTINO    para onde vai o aviso (o seu e-mail)
 *   EMAIL_REMETENTE  remetente verificado no Resend
 *   WEBHOOK_SEGREDO  string qualquer, conferida no cabeçalho
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const EMAIL_DESTINO = Deno.env.get('EMAIL_DESTINO')
const EMAIL_REMETENTE = Deno.env.get('EMAIL_REMETENTE') ?? 'onboarding@resend.dev'
const WEBHOOK_SEGREDO = Deno.env.get('WEBHOOK_SEGREDO')

const ROTULO_EXPERIENCIA: Record<string, string> = {
  none: 'First time',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

/** Evita que um nome ou mensagem com < > quebre (ou injete) o HTML do e-mail. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function idadeEm(dataNascimento: string): number | null {
  const [ano, mes, dia] = String(dataNascimento).split('-').map(Number)
  if (!ano || !mes || !dia) return null
  const nascimento = new Date(Date.UTC(ano, mes - 1, dia))
  const hoje = new Date()
  let idade = hoje.getUTCFullYear() - nascimento.getUTCFullYear()
  const aindaNao =
    hoje.getUTCMonth() < nascimento.getUTCMonth() ||
    (hoje.getUTCMonth() === nascimento.getUTCMonth() && hoje.getUTCDate() < nascimento.getUTCDate())
  if (aindaNao) idade -= 1
  return idade
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (WEBHOOK_SEGREDO && req.headers.get('x-webhook-segredo') !== WEBHOOK_SEGREDO) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!RESEND_API_KEY || !EMAIL_DESTINO) {
    console.error('Faltam os segredos RESEND_API_KEY ou EMAIL_DESTINO.')
    return new Response('Missing configuration', { status: 500 })
  }

  let pedido: Record<string, any>
  try {
    const corpo = await req.json()
    pedido = corpo.record ?? corpo
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!pedido?.id) {
    return new Response('Missing visitor request', { status: 400 })
  }

  const referencia = String(pedido.id).slice(0, 8).toUpperCase()
  const experiencia = ROTULO_EXPERIENCIA[pedido.experience_level] ?? pedido.experience_level
  const idade = pedido.date_of_birth ? idadeEm(pedido.date_of_birth) : null

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b8860b;margin:0 0 4px">
        THE Q MMA — novo pedido de visita
      </p>
      <h2 style="margin:0 0 16px;font-size:20px">#${referencia} · ${escapar(pedido.full_name ?? '')}</h2>
      <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
        <tr><td style="padding:4px 12px 4px 0;color:#666">E-mail</td><td><a href="mailto:${escapar(pedido.email ?? '')}">${escapar(pedido.email ?? '')}</a></td></tr>
        ${
          pedido.phone
            ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Telefone</td><td>${escapar(pedido.phone)}</td></tr>`
            : ''
        }
        <tr><td style="padding:4px 12px 4px 0;color:#666">Data de nascimento</td><td>${escapar(String(pedido.date_of_birth ?? ''))}${idade !== null ? ` (${idade})` : ''}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Aula</td><td><b>${escapar(pedido.requested_class_name ?? '')}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Data pedida</td><td>${escapar(String(pedido.requested_date ?? ''))}${pedido.requested_time ? ` · ${escapar(pedido.requested_time)}` : ''}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Experiência</td><td>${escapar(experiencia ?? '')}</td></tr>
      </table>
      ${
        pedido.martial_arts_experience
          ? `<div style="white-space:pre-wrap;border-left:3px solid #d6a62e;padding:8px 0 8px 14px;font-size:14px;line-height:1.6;margin-bottom:12px">${escapar(pedido.martial_arts_experience)}</div>`
          : ''
      }
      ${
        pedido.notes_from_visitor
          ? `<div style="white-space:pre-wrap;border-left:3px solid #444;padding:8px 0 8px 14px;font-size:14px;line-height:1.6">${escapar(pedido.notes_from_visitor)}</div>`
          : ''
      }
      <p style="font-size:13px;color:#666;margin-top:20px">
        Revise em My account → Visitor requests no app.
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
      reply_to: pedido.email,
      subject: `[The Q] Visitor request · ${pedido.full_name ?? ''} · ${pedido.requested_class_name ?? ''}`,
      html,
    }),
  })

  if (!resposta.ok) {
    const detalhe = await resposta.text()
    console.error('Resend recusou o envio:', resposta.status, detalhe)
    // 200 de propósito: o pedido JÁ foi gravado, e devolver erro faria o
    // webhook ficar tentando de novo sem necessidade. A falha fica no log.
    return new Response(JSON.stringify({ enviado: false, detalhe }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ enviado: true, referencia }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
