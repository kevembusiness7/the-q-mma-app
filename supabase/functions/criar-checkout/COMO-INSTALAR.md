# Pagamentos com Stripe — instalação

Três Edge Functions sustentam a loja:

| Função | Papel |
|---|---|
| `criar-checkout` | cria o pedido e a página de pagamento do Stripe |
| `stripe-webhook` | recebe a confirmação do Stripe e marca o pedido como pago |
| `notificar-envio` | manda o "seu pedido saiu" com o rastreio, a pedido da equipe |

O app **nunca** marca um pedido como pago. Quem faz isso é o webhook, depois
de validar a assinatura do evento. Chegar na tela de sucesso não prova nada.

---

## 1. Rodar o SQL

Copie o conteúdo de `supabase/pedidos-schema.sql` (não o caminho) e cole no
SQL Editor do painel. Cria `orders`, `order_items`, `order_admin_notes`, o
número sequencial de pedido e a função `confirmar_pagamento`, que marca o
pedido como pago e baixa o estoque na mesma transação.

O script é idempotente — rodar de novo depois de uma mudança é seguro e é
assim que colunas novas (como `shipping_email_sent_at`) entram.

## 2. Pegar as chaves do Stripe (modo teste)

No painel do Stripe, canto superior direito, ligue o **Test mode** (ou use a
aba Sandbox). Em **Developers → API keys**, copie a **Secret key**
(`sk_test_...`).

Use as chaves de TESTE até tudo funcionar. Nelas, o cartão
`4242 4242 4242 4242` (qualquer validade futura, qualquer CVC) paga sem
cobrar ninguém.

## 3. Publicar as funções

```bash
npx supabase functions deploy criar-checkout --project-ref nruokuqrmnfvidskxrus
npx supabase functions deploy stripe-webhook --project-ref nruokuqrmnfvidskxrus --no-verify-jwt
npx supabase functions deploy notificar-envio --project-ref nruokuqrmnfvidskxrus
```

O `--no-verify-jwt` é só no webhook: quem o chama é o Stripe, sem JWT do
Supabase — a autenticação dele é a assinatura do evento. A `criar-checkout`
mantém a verificação normal, porque quem a chama é o app. A `notificar-envio`
também: além do JWT, ela confere no banco que quem pediu é admin.

## 4. Registrar o webhook no Stripe

No painel do Stripe (ainda em Test mode):
**Developers → Webhooks → Add endpoint**

| Campo | Valor |
|---|---|
| Endpoint URL | `https://nruokuqrmnfvidskxrus.supabase.co/functions/v1/stripe-webhook` |
| Events | `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded` |

`charge.refunded` é o que faz o estorno aparecer no app. O estorno em si
continua sendo feito à mão no painel do Stripe — de propósito: é dinheiro
saindo, e o painel dele já registra quem clicou e quando. Sem esse evento, o
pedido continuaria dizendo "Paid" depois de devolvido.

Os dois `async_payment_*` só disparam se um dia você ligar um método de
pagamento assíncrono no painel do Stripe. Registrá-los agora é o que impede
que ligar aquele botão quebre o fluxo em silêncio.

Depois de criar, abra o endpoint e copie o **Signing secret** (`whsec_...`).

## 5. Gravar os segredos

Crie um arquivo `.env.secrets` na pasta do projeto (o git já ignora), com:

```
STRIPE_SECRET_KEY=sk_test_sua_chave
STRIPE_WEBHOOK_SECRET=whsec_seu_signing_secret
```

Salve o arquivo (Ctrl+S!) e rode:

```bash
npx supabase secrets set --env-file .env.secrets --project-ref nruokuqrmnfvidskxrus
del .env.secrets
```

Os outros segredos (RESEND_API_KEY, EMAIL_DESTINO, EMAIL_REMETENTE) já
existem do Help & Support e são reaproveitados nos e-mails de pedido.

## 6. Testar

1. No app, ponha itens no carrinho e clique **Checkout**.
2. Na página do Stripe: e-mail qualquer, endereço nos EUA, cartão
   `4242 4242 4242 4242`.
3. Ao pagar, você volta ao app com o banner "Order QMMA-... confirmed".
4. Confira: e-mail de recibo no cliente, e-mail de venda na equipe, pedido
   em My Orders (se estava logado), estoque da variação reduzido no banco.

Cartões de teste úteis:

| Cartão | Resultado |
|---|---|
| 4242 4242 4242 4242 | aprovado |
| 4000 0000 0000 0002 | recusado |
| 4000 0025 0000 3155 | exige autenticação 3D Secure |

## 7. Quando for cobrar de verdade

1. Ative a conta no Stripe (dados da empresa e conta bancária).
2. Desligue o Test mode e repita os passos 2, 4 e 5 com a chave `sk_live_...`
   e um novo webhook (o signing secret muda).
3. Nada no código muda.

---

## Decisões que valem saber

- **Frete:** Standard $6.95 (5–7 dias úteis), Express $19.95 (2–3), grátis
  acima de $150. Valores em `criar-checkout/index.ts`, fáceis de mudar.
- **Países de entrega:** EUA e Brasil. Também em `criar-checkout`.
- **Imposto:** desligado por enquanto. Quando quiser, ative o Stripe Tax no
  painel e me peça para ligar `automatic_tax` na função.
- **Estoque:** baixa só APÓS o pagamento confirmado, e na MESMA transação que
  marca o pedido como pago — então nunca existe pedido pago com estoque
  intacto. Se duas pessoas pagarem pela última peça quase juntas, o segundo
  pedido ganha uma linha em `order_admin_notes` e o e-mail de venda avisa — a
  equipe decide entre estornar ou repor. Reserva de estoque no checkout ficou
  de fora de propósito: complexidade que o volume atual não paga.
- **Anotações internas** ficam em `order_admin_notes`, tabela que só admin
  lê, e não numa coluna de `orders`: o RLS filtra linhas, não colunas, então
  uma nota gravada em `orders` apareceria para o próprio cliente.
- **"Concluído" não é "pago":** o webhook só marca `paid` quando
  `session.payment_status` diz `paid`. Com pagamento assíncrono, a sessão
  fecha antes de o dinheiro cair.
- **E-mail de envio:** não sai sozinho. A equipe clica "Mark as shipped" e o
  painel chama `notificar-envio`, que só manda se o pedido estiver mesmo
  `shipped` no banco e usa o e-mail gravado no pedido — nunca um endereço
  vindo do app. O horário fica em `shipping_email_sent_at`, então o painel
  mostra "Customer notified" em vez de deixar alguém avisar duas vezes.
- **Cupons:** o campo de código aparece sozinho na página do Stripe. Os
  códigos nascem no painel dele, em **Products → Coupons → Promotion codes** —
  validade, limite de uso e valor são responsabilidade do Stripe. Cupom que
  expira sozinho é melhor do que cupom que a gente esquece de desligar. O
  desconto aplicado fica em `orders.discount_cents`.
- **Endereço salvo:** quem tem conta ganha um Customer no Stripe, guardado em
  `profiles.stripe_customer_id`, e a segunda compra já vem com nome e endereço
  preenchidos. O prefill mora no Stripe porque a página de pagamento é dele —
  guardar endereço só no nosso banco não teria onde ser injetado. A coluna tem
  trigger: só o servidor escreve nela, senão bastaria apontar para o Customer
  de outra pessoa para ver o endereço dela.
- **Estorno:** feito no painel do Stripe, não no app. O webhook ouve
  `charge.refunded` e vira o pedido para `refunded` (estorno parcial só gera
  anotação — a venda continua existindo). O estoque **não** volta sozinho:
  peça devolvida nem sempre volta vendável, e repor no automático criaria peça
  fantasma no site.
- **Sessão expira em 30 minutos** (mínimo do Stripe). Pedido abandonado vira
  `cancelled` via webhook e não aparece em My Orders.
