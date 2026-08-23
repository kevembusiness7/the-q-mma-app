# Notificação por e-mail dos chamados

Avisa você por e-mail sempre que alguém abre um chamado no Help & Support.

A chave da API **nunca** entra no código do app: ela fica guardada como segredo
no Supabase e só a Edge Function enxerga. Qualquer coisa embutida no app viaja
para o navegador do usuário e pode ser lida.

---

## 1. Conta no Resend

1. Crie uma conta em <https://resend.com> — o plano gratuito cobre 3.000
   e-mails por mês e 100 por dia.
2. Em **API Keys**, gere uma chave e copie. Ela aparece uma vez só.

### Sobre o remetente

Sem domínio verificado, o Resend só deixa enviar a partir de
`onboarding@resend.dev`, e **apenas para o e-mail dono da conta**. Serve para
testar.

Para usar um endereço seu (`suporte@seudominio.com`), verifique o domínio em
**Domains** no painel do Resend, que pede alguns registros DNS.

---

## 2. Publicar a função

No terminal, dentro da pasta do projeto:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase functions deploy notificar-chamado --no-verify-jwt
```

O `SEU_PROJECT_REF` é o trecho do meio da URL do seu Supabase:
`https://SEU_PROJECT_REF.supabase.co`.

O `--no-verify-jwt` é necessário porque quem chama a função é um webhook do
banco, e não um usuário logado. A proteção fica por conta do segredo do passo
seguinte.

---

## 3. Guardar os segredos

Troque os valores e rode:

```bash
npx supabase secrets set \
  RESEND_API_KEY=re_sua_chave_aqui \
  EMAIL_DESTINO=seu-email@aqui.com \
  EMAIL_REMETENTE=onboarding@resend.dev \
  WEBHOOK_SEGREDO=uma-frase-longa-e-aleatoria
```

O `WEBHOOK_SEGREDO` é uma senha qualquer inventada por você. Sem ela, quem
descobrisse a URL da função poderia disparar e-mails em nome do app. Guarde,
porque ela é usada no passo 4.

---

## 4. Ligar o gatilho

No painel do Supabase: **Database → Webhooks → Create a new hook**

| Campo | Valor |
|---|---|
| Name | `notificar-chamado` |
| Table | `support_tickets` |
| Events | apenas **Insert** |
| Type | **Supabase Edge Functions** |
| Edge Function | `notificar-chamado` |
| HTTP Headers | adicione `x-webhook-segredo` com a frase do passo 3 |

---

## 5. Testar

Envie um chamado pelo app. O e-mail deve chegar em segundos.

Se não chegar, veja o log em **Edge Functions → notificar-chamado → Logs**. Os
dois erros mais comuns:

- **`Missing configuration`** — algum segredo do passo 3 não foi gravado.
- **`Resend recusou o envio`** — o log mostra a resposta do Resend. Quase
  sempre é o remetente: sem domínio verificado, só `onboarding@resend.dev`
  funciona, e só para o e-mail dono da conta.

A função devolve `200` mesmo quando o Resend recusa, de propósito: o chamado
**já foi gravado** no banco, e devolver erro faria o webhook ficar repetindo a
tentativa sem necessidade. A falha fica registrada no log, e o chamado aparece
normalmente no Support inbox.

---

## O que isto não faz

Envia o aviso **para você**. A resposta ao cliente ainda sai do seu e-mail ou
do Support inbox — o envio automático da resposta ao cliente seria uma próxima
etapa, com um segundo webhook em `support_messages`.
