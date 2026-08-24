# Como publicar o app na internet (Vercel)

O código já está pronto: o build gera o site, o manifest e o service worker
do PWA, e o `vercel.json` cuida das rotas. O que falta são três passos que
só você pode fazer, porque envolvem as suas contas.

---

## 1. Subir o código para o GitHub

O repositório remoto já existe (`github.com/kevembusiness7/the-q-mma-app`),
só falta empurrar os commits locais:

```
git push
```

> A partir daqui, todo `git push` futuro publica uma versão nova sozinho —
> a Vercel observa o repositório.

## 2. Criar o projeto na Vercel

1. Entre em https://vercel.com e faça login **com a conta do GitHub**.
2. **Add New → Project** → escolha o repositório `the-q-mma-app` → **Import**.
3. A Vercel detecta Vite sozinha (build `npm run build`, saída `dist`).
   Não mude nada disso.
4. **Antes de clicar em Deploy**, abra a seção **Environment Variables** e
   crie estas duas (os mesmos valores do seu `.env.local`):

   | Nome | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | a URL do projeto no Supabase |
   | `VITE_SUPABASE_ANON_KEY` | a anon key (a pública, **nunca** a service role) |

5. **Deploy**. Ao final você ganha um endereço tipo
   `https://the-q-mma-app.vercel.app`.

> Esses dois valores já aparecem no app de qualquer pessoa que abrir o site
> (são públicos por natureza — quem protege os dados é o RLS). A service
> role e a chave do Stripe continuam onde sempre estiveram: nos secrets das
> Edge Functions, nunca aqui.

## 3. Avisar o Supabase do endereço novo

Painel do Supabase → **Authentication → URL Configuration**:

- **Site URL**: troque para `https://the-q-mma-app.vercel.app`
  (o endereço que a Vercel te deu).
- **Redirect URLs**: adicione o endereço da Vercel **e mantenha**
  `http://localhost:5173` na lista — sem ele o login no seu computador
  para de funcionar.

Sem este passo, o link de confirmação de e-mail e o retorno do checkout
continuam apontando para `localhost`, que só existe na sua máquina.

---

## Conferir no celular

1. Abra o endereço da Vercel no navegador do celular.
2. **Android (Chrome)**: aparece o aviso "Adicionar à tela inicial" — ou
   menu ⋮ → *Instalar app*.
3. **iPhone (Safari)**: botão Compartilhar → *Adicionar à Tela de Início*.

O app abre em tela cheia, com ícone próprio, sem a barra do navegador.

## Quando algo mudar

| Mudança | O que fazer |
|---|---|
| Código novo | `git push` — a Vercel publica sozinha |
| Ícone/logo novo | `npm run icones` e depois `git push` |
| Stripe ao vivo | siga a seção "indo ao vivo" do `supabase/functions/criar-checkout/COMO-INSTALAR.md` |

## Domínio próprio (opcional)

Se um dia comprar um domínio (ex.: `theqmma.com`): Vercel → Settings →
Domains → adicione o domínio e siga as instruções de DNS. Depois repita o
passo 3 com o endereço novo.
