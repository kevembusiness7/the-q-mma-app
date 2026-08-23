/**
 * Perguntas frequentes do Help & Support.
 *
 * Revisado e aprovado pela The Q MMA em 23/08/2026.
 *
 * Vale reler quando o checkout entrar no ar: quatro respostas falam de prazo
 * de entrega, troca e devolução, orientação de tamanho e rastreio, e essas
 * dependem da operação real da loja. Hoje descrevem o comportamento esperado,
 * não uma política publicada.
 *
 * Com FAQ_REVISADO em false, a tela exibe um aviso de rascunho por cima da
 * lista — útil se um dia o conteúdo precisar de nova revisão.
 */
export const FAQ_REVISADO = true

export interface PerguntaFrequente {
  pergunta: string
  resposta: string
}

export const FAQ: PerguntaFrequente[] = [
  {
    pergunta: 'How do I track my order?',
    resposta:
      'Once your order ships you receive an email with the tracking code. You will also be able to follow it under My orders, in your account, as soon as that section goes live.',
  },
  {
    pergunta: 'How long does shipping take?',
    resposta:
      'Orders are prepared within a few business days. Delivery time depends on your address and the shipping method chosen at checkout.',
  },
  {
    pergunta: 'Can I exchange or return an item?',
    resposta:
      'Yes. Items in original condition, unworn and with tags, can be exchanged or returned. Send us a message through this page with your order number and we will guide you.',
  },
  {
    pergunta: 'How do I choose the right size?',
    resposta:
      'Each product page lists the available sizes. If you are between two sizes, or unsure about fit, message us with your usual size and we will help.',
  },
  {
    pergunta: 'Which payment methods are accepted?',
    resposta:
      'Checkout is not open yet in the app. When it launches, the accepted methods will be shown on the payment step.',
  },
  {
    pergunta: 'What is an app exclusive product?',
    resposta:
      'Items marked App exclusive are released only here, usually in limited runs tied to a fight or a team drop.',
  },
  {
    pergunta: 'I did not get the confirmation email. What now?',
    resposta:
      'Check your spam folder first, since the confirmation comes from an automated address. If it is not there, message us using the Account category and we will confirm it manually.',
  },
  {
    pergunta: 'How do I change my email or password?',
    resposta:
      'Account settings are still being built. For now, send us a message with the Account category and we will make the change for you.',
  },
]
