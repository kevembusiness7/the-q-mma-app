import { useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import {
  useLutasAdmin,
  type AtletaCartel,
  type DadosLuta,
  type LutaAdmin,
} from '../hooks/useAdminFights'
import type { FightResult } from '../types/athlete'
import '../styles/shop.css'
import '../styles/auth.css'
import '../styles/support.css'
import '../styles/orders.css'
import '../styles/promotions.css'
import '../styles/visitors.css'

const ROTULO_RESULTADO: Record<FightResult, string> = {
  win: 'Win',
  loss: 'Loss',
  draw: 'Draw',
  nc: 'No contest',
}

/**
 * Cartel de lutas dos atletas do roster. Cada luta cadastrada aqui aparece
 * em três lugares de uma vez: na aba Fights do perfil do atleta, no card
 * automático do feed de notícias (src/lib/autoNews.ts) e -- ao registrar o
 * resultado -- no record do topo do perfil.
 *
 * Esconder a tela é conveniência, não segurança: o RLS é quem barra de fato
 * (ver "admin gerencia lutas" em fights-admin-schema.sql).
 */
export function AdminFightsPage() {
  const { closeOverlay } = useNav()
  const { usuario, ehAdmin, carregando: carregandoAuth } = useAuth()
  const { atletas, lutas, carregando, erro, criar, atualizar, remover, atualizarCartel } =
    useLutasAdmin(ehAdmin)
  const [atletaId, setAtletaId] = useState<string | null>(null)

  if (carregandoAuth) {
    return (
      <Casca titulo="Fight records" aoVoltar={closeOverlay}>
        <p className="empty">Loading…</p>
      </Casca>
    )
  }

  if (!usuario || !ehAdmin) {
    return (
      <Casca titulo="Fight records" aoVoltar={closeOverlay}>
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

  const atleta = atletaId ? (atletas.find((a) => a.id === atletaId) ?? null) : null

  if (atleta) {
    return (
      <Casca titulo={atleta.name} aoVoltar={() => setAtletaId(null)}>
        <DetalheAtleta
          atleta={atleta}
          lutas={lutas.filter((l) => l.athleteId === atleta.id)}
          aoCriar={(dados) => criar(atleta.id, dados)}
          aoAtualizar={atualizar}
          aoRemover={remover}
          aoAtualizarCartel={(cartel) => atualizarCartel(atleta.id, cartel)}
        />
      </Casca>
    )
  }

  return (
    <Casca titulo="Fight records" aoVoltar={closeOverlay}>
      <p className="cart-note">
        Scheduled fights and results for every athlete on the roster. Each fight added here also
        creates the Next Fight / Fight Result card on the home feed automatically.
      </p>

      {carregando && <p className="empty">Loading…</p>}
      {erro && <p className="empty">Could not load: {erro}</p>}

      <div className="promo-admin-lista">
        {atletas.map((a) => {
          const proxima = lutas.find((l) => l.athleteId === a.id && l.isNextFight)
          return (
            <button
              key={a.id}
              type="button"
              className="ticket ticket-clicavel"
              onClick={() => setAtletaId(a.id)}
            >
              <div className="ticket-topo">
                <span className="ticket-ref">{a.record}</span>
                <span className="ticket-ref">{a.division}</span>
              </div>
              <div className="pedido-resumo">
                <b>{a.name}</b>
              </div>
              <div className="ticket-cat">
                {proxima
                  ? `Next: vs. ${proxima.opponentName} · ${formatarDataCurta(proxima.eventDate)}`
                  : 'No fight scheduled'}
              </div>
            </button>
          )
        })}
      </div>
    </Casca>
  )
}

/* ------------------------------------------------------------ atleta aberto -- */

function DetalheAtleta({
  atleta,
  lutas,
  aoCriar,
  aoAtualizar,
  aoRemover,
  aoAtualizarCartel,
}: {
  atleta: AtletaCartel
  lutas: LutaAdmin[]
  aoCriar: (dados: DadosLuta) => Promise<string | null>
  aoAtualizar: (id: string, dados: DadosLuta) => Promise<string | null>
  aoRemover: (id: string) => Promise<string | null>
  aoAtualizarCartel: (cartel: { wins: number; losses: number; draws: number }) => Promise<string | null>
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const editando = editandoId ? (lutas.find((l) => l.id === editandoId) ?? null) : null

  /**
   * Depois de registrar um resultado, soma no cartel do atleta também --
   * numa ação só o admin não corre o risco de atualizar a luta e esquecer
   * o record do topo do perfil.
   */
  async function salvarComCartel(
    dados: DadosLuta,
    salvar: () => Promise<string | null>,
    somarNoCartel: boolean,
  ): Promise<string | null> {
    const falha = await salvar()
    if (falha) return falha
    if (somarNoCartel && !dados.isNextFight) {
      const cartel = { wins: atleta.wins, losses: atleta.losses, draws: atleta.draws }
      if (dados.result === 'win') cartel.wins += 1
      else if (dados.result === 'loss') cartel.losses += 1
      else if (dados.result === 'draw') cartel.draws += 1
      if (dados.result !== 'nc') {
        const falhaCartel = await aoAtualizarCartel(cartel)
        if (falhaCartel) return `Fight saved, but the record update failed: ${falhaCartel}`
      }
    }
    return null
  }

  if (editando) {
    return (
      <LutaForm
        chaveAtual={editando.id}
        inicial={editando}
        aoSalvar={(dados, somar) =>
          salvarComCartel(dados, () => aoAtualizar(editando.id, dados), somar)
        }
        aoConcluir={() => setEditandoId(null)}
        aoCancelar={() => setEditandoId(null)}
        aoRemover={async () => {
          if (!confirm(`Delete the fight vs. ${editando.opponentName}? This can't be undone.`)) return
          const falha = await aoRemover(editando.id)
          if (falha) setErro(falha)
          else setEditandoId(null)
        }}
      />
    )
  }

  if (criando) {
    return (
      <LutaForm
        aoSalvar={(dados, somar) => salvarComCartel(dados, () => aoCriar(dados), somar)}
        aoConcluir={() => setCriando(false)}
        aoCancelar={() => setCriando(false)}
      />
    )
  }

  return (
    <div className="pedido-detalhe">
      <div className="admin-ficha">
        <div className="admin-linha">
          <span>Record</span>
          <b>
            {atleta.record} ({atleta.wins}W · {atleta.losses}L · {atleta.draws}D)
          </b>
        </div>
        <div className="admin-linha">
          <span>Division</span>
          <b>{atleta.division}</b>
        </div>
      </div>

      {erro && (
        <p className="auth-erro" role="alert">
          {erro}
        </p>
      )}

      {lutas.length === 0 && <p className="empty">No fights on record yet.</p>}

      <div className="promo-admin-lista" style={{ padding: 0 }}>
        {lutas.map((l) => (
          <button
            key={l.id}
            type="button"
            className="ticket ticket-clicavel"
            onClick={() => setEditandoId(l.id)}
          >
            <div className="ticket-topo">
              {l.isNextFight ? (
                <span className="ticket-status s-new">Scheduled</span>
              ) : (
                <span className={`ticket-status ${l.result === 'win' ? 's-resolved' : 'pr-rejected'}`}>
                  {ROTULO_RESULTADO[l.result]}
                </span>
              )}
              <span className="ticket-ref">{formatarDataCurta(l.eventDate)}</span>
            </div>
            <div className="pedido-resumo">
              vs. <b>{l.opponentName}</b>
              {l.opponentRecord ? ` (${l.opponentRecord})` : ''}
            </div>
            <div className="ticket-cat">
              {l.eventName}
              {!l.isNextFight && l.method ? ` · ${l.method}` : ''}
            </div>
          </button>
        ))}
      </div>

      <button type="button" className="btn ghost" onClick={() => setCriando(true)}>
        + Add a fight
      </button>
    </div>
  )
}

/* -------------------------------------------------------------- formulário -- */

function LutaForm({
  chaveAtual,
  inicial,
  aoSalvar,
  aoConcluir,
  aoCancelar,
  aoRemover,
}: {
  chaveAtual?: string
  inicial?: LutaAdmin
  /** `somarNoCartel` = registrar o resultado também no record do atleta. */
  aoSalvar: (dados: DadosLuta, somarNoCartel: boolean) => Promise<string | null>
  aoConcluir: () => void
  aoCancelar: () => void
  aoRemover?: () => void
}) {
  // "Registrar resultado de uma luta agendada" é o caminho mais comum de
  // edição -- por isso o modo vem do estado da luta, não de um toggle solto.
  const [agendada, setAgendada] = useState(inicial ? inicial.isNextFight : true)
  const [oponente, setOponente] = useState(inicial?.opponentName ?? '')
  const [cartelOponente, setCartelOponente] = useState(inicial?.opponentRecord ?? '')
  const [evento, setEvento] = useState(inicial?.eventName ?? '')
  const [dataEvento, setDataEvento] = useState(inicial?.eventDate ?? '')
  const [local, setLocal] = useState(inicial?.venue ?? '')
  const [cidade, setCidade] = useState(inicial?.city ?? '')
  const [transmissao, setTransmissao] = useState(inicial?.broadcaster ?? '')
  const [resultado, setResultado] = useState<FightResult>(
    inicial && !inicial.isNextFight ? inicial.result : 'win',
  )
  const [metodo, setMetodo] = useState(inicial && !inicial.isNextFight ? inicial.method : '')
  const [round, setRound] = useState(inicial?.round ?? '')
  const [tempo, setTempo] = useState(inicial?.time ?? '')
  const [somarNoCartel, setSomarNoCartel] = useState(inicial ? inicial.isNextFight : false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const valido = oponente.trim().length >= 2 && evento.trim().length >= 2 && dataEvento.length === 10

  async function salvar() {
    if (!valido) return
    setSalvando(true)
    const falha = await aoSalvar(
      {
        opponentName: oponente,
        opponentRecord: cartelOponente,
        // Luta agendada guarda 'nc' + método vazio, mesma convenção do seed
        // em schema.sql -- o resultado de verdade só entra quando acontecer.
        result: agendada ? 'nc' : resultado,
        method: agendada ? '' : metodo,
        round: agendada ? '' : round,
        time: agendada ? '' : tempo,
        eventName: evento,
        eventDate: dataEvento,
        venue: local,
        city: cidade,
        broadcaster: transmissao,
        isNextFight: agendada,
      },
      somarNoCartel,
    )
    setSalvando(false)
    if (falha) setErro(falha)
    else aoConcluir()
  }

  return (
    <div className="pedido-detalhe" key={chaveAtual}>
      <div className="admin-acoes">
        <h4>{inicial ? 'Edit fight' : 'New fight'}</h4>

        <label className="campo">
          <span>Status</span>
          <select
            value={agendada ? 'scheduled' : 'completed'}
            onChange={(e) => {
              const nova = e.target.value === 'scheduled'
              setAgendada(nova)
              // Virou "resultado"? Já liga a soma no cartel, que é o fluxo
              // normal de registrar uma luta que acabou de acontecer.
              if (!nova && inicial?.isNextFight) setSomarNoCartel(true)
            }}
          >
            <option value="scheduled">Scheduled (upcoming fight)</option>
            <option value="completed">Completed (has a result)</option>
          </select>
        </label>

        <label className="campo">
          <span>Opponent</span>
          <input value={oponente} onChange={(e) => setOponente(e.target.value)} placeholder="Francisco Prado" />
        </label>
        <label className="campo">
          <span>Opponent record — optional</span>
          <input value={cartelOponente} onChange={(e) => setCartelOponente(e.target.value)} placeholder="12-1" />
        </label>
        <label className="campo">
          <span>Event</span>
          <input value={evento} onChange={(e) => setEvento(e.target.value)} placeholder="UFC Fight Night" />
        </label>
        <label className="campo">
          <span>Event date</span>
          <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
        </label>
        <label className="campo">
          <span>Venue — optional</span>
          <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="UFC APEX" />
        </label>
        <label className="campo">
          <span>City — optional</span>
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Las Vegas, NV" />
        </label>
        <label className="campo">
          <span>Broadcaster — optional</span>
          <input value={transmissao} onChange={(e) => setTransmissao(e.target.value)} placeholder="ESPN+" />
        </label>
      </div>

      {!agendada && (
        <div className="admin-acoes">
          <h4>Result</h4>
          <label className="campo">
            <span>Result</span>
            <select value={resultado} onChange={(e) => setResultado(e.target.value as FightResult)}>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="draw">Draw</option>
              <option value="nc">No contest</option>
            </select>
          </label>
          <label className="campo">
            <span>Method</span>
            <input
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              placeholder="Submission · rear-naked choke"
            />
          </label>
          <label className="campo">
            <span>Round — optional</span>
            <input value={round} onChange={(e) => setRound(e.target.value)} placeholder="Round 2" />
          </label>
          <label className="campo">
            <span>Time — optional</span>
            <input value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="3:12" />
          </label>

          <label className="waiver-check-row" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={somarNoCartel}
              onChange={(e) => setSomarNoCartel(e.target.checked)}
            />
            <span>
              Also update the athlete&rsquo;s record (adds this result to the W-L-D shown on their
              profile). Leave off when fixing a typo on a fight that was already counted.
            </span>
          </label>
        </div>
      )}

      {erro && (
        <p className="auth-erro" role="alert">
          {erro}
        </p>
      )}

      <div className="admin-botoes">
        <button type="button" className="btn" disabled={salvando || !valido} onClick={salvar}>
          {salvando ? 'Saving…' : inicial ? 'Save changes' : 'Add fight'}
        </button>
        <button type="button" className="btn ghost" onClick={aoCancelar}>
          Cancel
        </button>
      </div>

      {aoRemover && (
        <button type="button" className="empty-link" onClick={aoRemover}>
          Delete this fight
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ casca -- */

function Casca({ titulo, aoVoltar, children }: { titulo: string; aoVoltar: () => void; children: ReactNode }) {
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

function formatarDataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default AdminFightsPage
