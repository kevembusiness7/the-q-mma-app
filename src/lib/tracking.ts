/**
 * Link de rastreio das transportadoras que a loja usa.
 *
 * Transportadora fora da lista devolve `null` de propósito: o campo é texto
 * livre, então "correios br" ou um nome digitado errado chegariam aqui. Sem
 * link, a tela mostra só o código — melhor do que mandar o cliente para uma
 * página de erro de uma transportadora que não é a dele.
 *
 * A cópia deste mapa que roda no servidor está em
 * supabase/functions/notificar-envio (Deno não compartilha módulo com o app).
 * Se um dia mudar aqui, mude lá também.
 */
export function linkDeRastreio(
  transportadora: string | null,
  codigo: string | null,
): string | null {
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
