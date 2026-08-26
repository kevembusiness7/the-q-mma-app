# Notificação por e-mail dos pedidos de visita

Avisa você por e-mail sempre que alguém pede uma aula de visitante no app.

Reaproveita a **mesma conta do Resend e os mesmos segredos** já configurados
para `notificar-chamado` -- não é preciso criar nada novo no Resend, só
publicar esta função e ligar um segundo webhook.

---

## 1. Publicar a função

No terminal, dentro da pasta do projeto:

```bash
npx supabase functions deploy notificar-visitante --no-verify-jwt
```

O `--no-verify-jwt` é necessário porque quem chama a função é um webhook do
banco, e não um usuário logado. A proteção fica por conta do segredo abaixo.

---

## 2. Segredos

Se `RESEND_API_KEY`, `EMAIL_DESTINO`, `EMAIL_REMETENTE` e `WEBHOOK_SEGREDO` já
estão configurados (por causa de `notificar-chamado`), não precisa fazer nada
aqui -- segredos são por projeto, não por função. Se ainda não configurou,
veja `supabase/functions/notificar-chamado/COMO-INSTALAR.md`.

---

## 3. Ligar o gatilho

No painel do Supabase: **Database → Webhooks → Create a new hook**

| Campo | Valor |
|---|---|
| Name | `notificar-visitante` |
| Table | `visitor_class_requests` |
| Events | apenas **Insert** |
| Type | **Supabase Edge Functions** |
| Edge Function | `notificar-visitante` |
| HTTP Headers | adicione `x-webhook-segredo` com a mesma frase de `notificar-chamado` |

---

## 4. Testar

Peça uma aula de visitante pelo app (Request a Visitor Class). O e-mail deve
chegar em segundos.

Se não chegar, veja o log em **Edge Functions → notificar-visitante → Logs**.
Os mesmos dois erros de sempre:

- **`Missing configuration`** — algum segredo não foi gravado.
- **`Resend recusou o envio`** — o log mostra a resposta do Resend. Sem
  domínio verificado, só `onboarding@resend.dev` funciona, e só para o
  e-mail dono da conta.

A função devolve `200` mesmo quando o Resend recusa, de propósito: o pedido
**já foi gravado** no banco, e devolver erro faria o webhook ficar repetindo a
tentativa sem necessidade. A falha fica registrada no log, e o pedido aparece
normalmente em Visitor requests no app.
