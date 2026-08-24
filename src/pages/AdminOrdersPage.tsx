import { useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { formatarPreco } from '../hooks/useProducts'
import { linkDeRastreio } from '../lib/tracking'
import { ROTULO_ENTREGA, ROTULO_PAGAMENTO, type Pedido } from '../hooks/useOrders'
import {
  FILTROS_PEDIDO,
  seEncaixa,
  useAnotacoes,
  usePedidosAdmin,
  type FiltroPedido,
} from '../hooks/useAdminOrders'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/orders.css'

/**
 * A fila de trabalho da equipe.
 *
 * Antes desta tela, a única notícia de uma venda era o e-mail — despachar
 * dependia de alguém achar a mensagem certa na caixa de entrada, e não havia
 * onde registrar que o pedido saiu. Aqui o estado do pedido é o próprio
 * registro: o que está em "To ship" é exatamente o que falta fazer hoje.
 */
export function AdminOrdersPage() {
  const { closeOverlay } = useNav()
  const { usuario, ehAdmin, carregando: carregandoAuth } = useAuth()
  const {
    pedidos,
    carregando,
    erro,
    recarregar,
    despachar,
    avisarEnvio,
    marcarEntregue,
    voltarParaPreparo,
  } = usePedidosAdmin(ehAdmin)
  const [filtro, setFiltro] = useState<FiltroPedido>('to_ship')
  const [abertoId, setAbertoId] = useState<string | null>(null)

  if (carregandoAuth) {
    return (
      <Casca titulo="Orders" aoVoltar={closeOverlay}>
        <p className="empty">Loading…</p>
      </Casca>
    )
  }

  // Esconder a tela é conveniência, não segurança: o RLS é quem barra de fato.
  if (!usuario || !ehAdmin) {
    return (
      <Casca titulo="Orders" aoVoltar={closeOverlay}>
        <div className="auth-aviso">
          <h3>Restricted area</h3>
          <p>This screen is only available to team accounts.</p>
          <button type="button" className="btn" onClick={closeOverlay}>
            Go back
          </button>
        </div>
      </Casca>
    )
  }

  // Guardo o id, não o objeto: assim o detalhe reflete na hora o que as ações
  // mudaram na lista, sem uma segunda cópia do pedido para manter em dia.
  const aberto = abertoId ? (pedidos.find((p) => p.id === abertoId) ?? null) : null

  if (aberto) {
    return (
      <Casca titulo={aberto.orderNumber} aoVoltar={() => setAbertoId(null)}>
        <Detalhe
          pedido={aberto}
          aoDespachar={(t, c) => despachar(aberto.id, t, c)}
          aoAvisar={() => avisarEnvio(aberto.id)}
          aoEntregar={() => marcarEntregue(aberto.id)}
          aoReabrir={() => voltarParaPreparo(aberto.id)}
        />
      </Casca>
    )
  }

  const visiveis = pedidos.filter((p) => seEncaixa(p, filtro))
  const contar = (f: FiltroPedido) => pedidos.filter((p) => seEncaixa(p, f)).length

  return (
    <Casca titulo="Orders" aoVoltar={closeOverlay}>
      <div className="admin-filtros">
        {FILTROS_PEDIDO.map((f) => (
          <button
            key={f.valor}
            type="button"
            className={`auth-aba ${filtro === f.valor ? 'on' : ''}`}
            onClick={() => setFiltro(f.valor)}
          >
            {f.rotulo}
            <b> {contar(f.valor)}</b>
          </button>
        ))}
      </div>

      {carregando && <p className="empty">Loading orders…</p>}
      {erro && <p className="empty">Could not load: {erro}</p>}
      {!carregando && visiveis.length === 0 && (
        <p className="empty">
          {filtro === 'to_ship' ? 'Nothing waiting to ship. All caught up.' : 'No orders here.'}
        </p>
      )}

      <div className="support-lista">
        {visiveis.map((p) => (
          <button
            key={p.id}
            type="button"
            className="ticket ticket-clicavel"
            onClick={() => setAbertoId(p.id)}
          >
            <div className="ticket-topo">
              <span className={`ticket-status pg-${p.paymentStatus}`}>
                {ROTULO_PAGAMENTO[p.paymentStatus]}
              </span>
              <span className="ticket-ref">{p.orderNumber}</span>
            </div>
            <div className="pedido-resumo">
              {contarPecas(p)} {contarPecas(p) === 1 ? 'item' : 'items'} ·{' '}
              <b>{formatarPreco(p.totalCents)}</b>
              {p.anotacoes > 0 && (
                <span className="pedido-alerta" title="Tem anotação da equipe">
                  {' '}
                  · ⚑ {p.anotacoes}
                </span>
              )}
            </div>
            <div className="ticket-de">
              {p.shipName ?? '—'}
              {p.email ? ` · ${p.email}` : ''}
            </div>
            <div className="ticket-cat">
              {ROTULO_ENTREGA[p.fulfillmentStatus]}
              {p.shipCity ? ` · ${[p.shipCity, p.shipState, p.shipCountry].filter(Boolean).join(', ')}` : ''}
            </div>
            <time className="ticket-data" dateTime={p.createdAt}>
              {formatarData(p.createdAt)}
            </time>
          </button>
        ))}
      </div>

      {!carregando && (
        <div className="admin-rodape">
          <button type="button" className="empty-link" onClick={recarregar}>
            Refresh
          </button>
        </div>
      )}
    </Casca>
  )
}

/* ---------------------------------------------------------------- detalhe -- */

function Detalhe({
  pedido,
  aoDespachar,
  aoAvisar,
  aoEntregar,
  aoReabrir,
}: {
  pedido: Pedido
  aoDespachar: (transportadora: string, codigo: string) => Promise<string | null>
  aoAvisar: () => Promise<string | null>
  aoEntregar: () => Promise<string | null>
  aoReabrir: () => Promise<string | null>
}) {
  const { usuario } = useAuth()
  const { anotacoes, anotar } = useAnotacoes(pedido.id)
  const [transportadora, setTransportadora] = useState(pedido.trackingCarrier ?? '')
  const [codigo, setCodigo] = useState(pedido.trackingNumber ?? '')
  const [salvando, setSalvando] = useState(false)
  const [avisando, setAvisando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [nota, setNota] = useState('')

  const link = linkDeRastreio(pedido.trackingCarrier, pedido.trackingNumber)

  async function enviarAviso() {
    setAvisando(true)
    const falha = await aoAvisar()
    setErro(falha ? `Shipping email failed: ${falha}` : null)
    setAvisando(false)
  }

  /**
   * Despachar e avisar são um gesto só para quem opera, mas dois passos no
   * código — e nessa ordem. O estado do pedido é o que importa; se o Resend
   * estiver fora do ar, o despacho fica registrado do mesmo jeito e o botão
   * de reenviar resolve depois.
   */
  async function despacharEAvisar() {
    setSalvando(true)
    const falha = await aoDespachar(transportadora, codigo)
    setSalvando(false)
    if (falha) {
      setErro(falha)
      return
    }
    await enviarAviso()
  }

  const endereco = [
    pedido.shipName,
    pedido.shipLine1,
    pedido.shipLine2,
    [pedido.shipCity, pedido.shipState, pedido.shipPostalCode].filter(Boolean).join(', '),
    pedido.shipCountry,
  ].filter(Boolean) as string[]

  async function executar(acao: () => Promise<string | null>) {
    setSalvando(true)
    setErro(await acao())
    setSalvando(false)
  }

  async function copiarEndereco() {
    try {
      await navigator.clipboard.writeText(endereco.join('\n'))
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Área de transferência bloqueada (contexto inseguro, permissão negada).
      // O endereço está na tela; copiar é atalho, não a única saída.
      setErro('Could not copy — select the address above instead.')
    }
  }

  return (
    <div className="pedido-detalhe">
      <div className="ticket-topo">
        <span className={`ticket-status pg-${pedido.paymentStatus}`}>
          {ROTULO_PAGAMENTO[pedido.paymentStatus]}
        </span>
        <span className="ticket-cat">{ROTULO_ENTREGA[pedido.fulfillmentStatus]}</span>
      </div>

      {/* ---------------------------------------------------------- itens -- */}
      <div className="pedido-itens">
        {pedido.itens.map((i) => (
          <div key={i.id} className="pedido-item">
            <div className="pedido-item-thumb">
              {i.imageUrl ? <img src={i.imageUrl} alt="" /> : <span aria-hidden>🥋</span>}
            </div>
            <div className="pedido-item-info">
              <b>{i.productName}</b>
              <span>
                {i.colorName} · {i.size} × {i.quantity}
              </span>
            </div>
            <span className="pedido-item-preco">{formatarPreco(i.unitPriceCents * i.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="totals">
        <div>
          <span>Subtotal</span>
          <span>{formatarPreco(pedido.subtotalCents)}</span>
        </div>
        <div>
          <span>Shipping</span>
          <span>{pedido.shippingCents === 0 ? 'Free' : formatarPreco(pedido.shippingCents)}</span>
        </div>
        {pedido.taxCents > 0 && (
          <div>
            <span>Tax</span>
            <span>{formatarPreco(pedido.taxCents)}</span>
          </div>
        )}
        <div className="totals-final">
          <span>Total</span>
          <span>{formatarPreco(pedido.totalCents)}</span>
        </div>
      </div>

      {/* ------------------------------------------------------- endereço -- */}
      <div className="admin-ficha">
        <div className="admin-linha">
          <span>Customer</span>
          <b>{pedido.email ?? '—'}</b>
        </div>
        <div className="admin-linha">
          <span>Ship to</span>
          <b className="admin-endereco">{endereco.length > 0 ? endereco.join('\n') : '—'}</b>
        </div>
        {pedido.stripePaymentIntentId && (
          <div className="admin-linha">
            <span>Stripe</span>
            <b className="admin-id">{pedido.stripePaymentIntentId}</b>
          </div>
        )}
        <div className="admin-linha">
          <span>Placed</span>
          <b>{formatarData(pedido.createdAt)}</b>
        </div>
        {pedido.shippedAt && (
          <div className="admin-linha">
            <span>Shipped</span>
            <b>{formatarData(pedido.shippedAt)}</b>
          </div>
        )}
      </div>

      {endereco.length > 0 && (
        <button type="button" className="empty-link" onClick={copiarEndereco}>
          {copiado ? '✓ Address copied' : 'Copy shipping address'}
        </button>
      )}

      {/* -------------------------------------------------------- despacho -- */}
      {pedido.paymentStatus === 'paid' && (
        <div className="admin-acoes">
          <h4>Fulfillment</h4>

          {pedido.fulfillmentStatus === 'shipped' || pedido.fulfillmentStatus === 'delivered' ? (
            <>
              <p className="admin-rastreio">
                {pedido.trackingCarrier ?? 'Carrier not set'}
                {pedido.trackingNumber ? ` · ${pedido.trackingNumber}` : ' · no tracking number'}
              </p>
              {link && (
                <a className="empty-link" href={link} target="_blank" rel="noopener noreferrer">
                  Open tracking page
                </a>
              )}

              {/* O aviso ao cliente é separado do despacho de propósito: se o
                  e-mail falhar, o pedido continua corretamente despachado e dá
                  para reenviar sem mexer no estado dele. */}
              {pedido.shippingEmailSentAt ? (
                <p className="cart-note">
                  ✓ Customer notified on {formatarData(pedido.shippingEmailSentAt)}.{' '}
                  <button type="button" className="empty-link" onClick={enviarAviso}>
                    {avisando ? 'Sending…' : 'Send again'}
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  className="btn ghost"
                  disabled={avisando || !pedido.email}
                  onClick={enviarAviso}
                >
                  {avisando ? 'Sending…' : 'Send shipping email'}
                </button>
              )}

              <div className="admin-botoes">
                {pedido.fulfillmentStatus === 'shipped' && (
                  <button
                    type="button"
                    className="btn"
                    disabled={salvando}
                    onClick={() => executar(aoEntregar)}
                  >
                    Mark as delivered
                  </button>
                )}
                <button
                  type="button"
                  className="btn ghost"
                  disabled={salvando}
                  onClick={() => executar(aoReabrir)}
                >
                  Undo shipment
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="campo">
                <span>Carrier</span>
                <input
                  value={transportadora}
                  onChange={(e) => setTransportadora(e.target.value)}
                  list="transportadoras"
                  placeholder="USPS, UPS, FedEx…"
                />
              </label>
              <datalist id="transportadoras">
                <option value="USPS" />
                <option value="UPS" />
                <option value="FedEx" />
                <option value="DHL" />
                <option value="Correios" />
              </datalist>

              <label className="campo">
                <span>Tracking number</span>
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="9400 1000 0000 0000 0000 00"
                />
              </label>

              <button
                type="button"
                className="btn"
                disabled={
                  salvando || avisando || transportadora.trim() === '' || codigo.trim() === ''
                }
                onClick={despacharEAvisar}
              >
                {salvando ? 'Saving…' : avisando ? 'Sending email…' : 'Mark as shipped'}
              </button>
              {/* Exigir os dois campos é de propósito: "Shipped" sem código de
                  rastreio vira pergunta do cliente no suporte no dia seguinte. */}
              <p className="cart-note">
                Both fields are required. Marking as shipped emails the customer the tracking and
                shows it in My orders.
              </p>
            </>
          )}
        </div>
      )}

      {erro && (
        <p className="auth-erro" role="alert">
          {erro}
        </p>
      )}

      {/* ------------------------------------------------------ anotações -- */}
      <div className="admin-acoes">
        <h4>Internal notes</h4>
        <p className="cart-note">Only the team sees these. The customer never does.</p>

        {anotacoes.length > 0 && (
          <div className="admin-notas">
            {anotacoes.map((a) => (
              <div key={a.id} className="admin-nota">
                <p>{a.note}</p>
                <time dateTime={a.createdAt}>
                  {a.authorId ? '' : 'System · '}
                  {formatarData(a.createdAt)}
                </time>
              </div>
            ))}
          </div>
        )}

        <label className="campo">
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            placeholder="Refunded shipping, customer asked to change size…"
          />
        </label>
        <button
          type="button"
          className="btn ghost"
          disabled={nota.trim().length < 2 || !usuario}
          onClick={async () => {
            const falha = await anotar(nota.trim(), usuario!.id)
            if (falha) setErro(falha)
            else setNota('')
          }}
        >
          Add note
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ casca -- */

function Casca({
  titulo,
  aoVoltar,
  children,
}: {
  titulo: string
  aoVoltar: () => void
  children: ReactNode
}) {
  return (
    <div className="support-screen">
      <header className="appbar">
        <div className="appbar-lead">
          <button type="button" className="appbar-back" onClick={aoVoltar} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="wordmark">{titulo}</span>
        </div>
      </header>
      {children}
    </div>
  )
}

function contarPecas(p: Pedido): number {
  return p.itens.reduce((s, i) => s + i.quantity, 0)
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
