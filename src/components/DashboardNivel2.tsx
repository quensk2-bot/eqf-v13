// src/components/DashboardNivel2.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Usuario } from '../types'
import { styles } from '../styles'

type RotinaN2 = {
  id: string
  titulo: string
  prioridade: string | null
  periodicidade: string
  dia_semana: string | null
  horario_inicio: string | null
  regional_id: number | null
  setor_id: number | null
}

type ExecucaoRow = {
  id: number
  rotina_id: string
  executor_id: string
  inicio_em: string | null
  finalizado_em: string | null
  duracao_total_segundos: number | null
}

type SerieDia = {
  dia: string // yyyy-mm-dd
  execucoes: number
  concluidas: number
}

type KpiExecucao = {
  execucoesHoje: number
  concluidasHoje: number
  horasExecutadasHoje: number
  colaboradoresAtivosHoje: number
}

type RankingItem = {
  executorId: string
  nome: string
  execucoesConcluidas: number
  horasTotais: number
}

type Props = {
  perfil: Usuario | null
}

export function DashboardNivel2({ perfil }: Props) {
  const [rotinas, setRotinas] = useState<RotinaN2[]>([])
  const [loadingRotinas, setLoadingRotinas] = useState(false)
  const [erroRotinas, setErroRotinas] = useState<string | null>(null)

  const [execucoes, setExecucoes] = useState<ExecucaoRow[]>([])
  const [loadingExecucoes, setLoadingExecucoes] = useState(false)
  const [erroExecucoes, setErroExecucoes] = useState<string | null>(null)

  // ------------------------------------------------------
  // CARREGAR ROTINAS DA REGIONAL / SETOR
  // ------------------------------------------------------
  useEffect(() => {
    if (!perfil) return

    const carregarRotinas = async () => {
      setLoadingRotinas(true)
      setErroRotinas(null)

      try {
        let query = supabase
          .from('rotinas')
          .select(
            'id, titulo, prioridade, periodicidade, dia_semana, horario_inicio, regional_id, setor_id'
          )

        if (perfil.regional_id) {
          query = query.eq('regional_id', perfil.regional_id)
        } else if (perfil.setor_id) {
          query = query.eq('setor_id', perfil.setor_id)
        }

        const { data, error } = await query.order('horario_inicio', {
          ascending: true,
        })

        if (error) {
          setErroRotinas(error.message)
          setRotinas([])
        } else {
          setRotinas((data ?? []) as RotinaN2[])
        }
      } catch (e) {
        setErroRotinas(String(e))
        setRotinas([])
      } finally {
        setLoadingRotinas(false)
      }
    }

    carregarRotinas()
  }, [perfil?.regional_id, perfil?.setor_id])

  // ------------------------------------------------------
  // CARREGAR EXECUÇÕES RELACIONADAS ÀS ROTINAS DA REGIONAL
  // (janela de 30 dias para gráficos e KPIs)
  // ------------------------------------------------------
  useEffect(() => {
    if (!perfil) return
    if (!rotinas.length) {
      setExecucoes([])
      return
    }

    const carregarExecucoes = async () => {
      setLoadingExecucoes(true)
      setErroExecucoes(null)

      try {
        const idsRotinas = rotinas.map((r) => r.id)
        if (idsRotinas.length === 0) {
          setExecucoes([])
          return
        }

        const hoje = new Date()
        const inicioJanela = new Date()
        inicioJanela.setDate(hoje.getDate() - 29) // últimos 30 dias

        const { data, error } = await supabase
          .from('rotina_execucoes')
          .select(
            'id, rotina_id, executor_id, inicio_em, finalizado_em, duracao_total_segundos'
          )
          .in('rotina_id', idsRotinas)
          .gte('inicio_em', inicioJanela.toISOString())
          .order('inicio_em', { ascending: true })

        if (error) {
          setErroExecucoes(error.message)
          setExecucoes([])
        } else {
          setExecucoes((data ?? []) as ExecucaoRow[])
        }
      } catch (e) {
        setErroExecucoes(String(e))
        setExecucoes([])
      } finally {
        setLoadingExecucoes(false)
      }
    }

    carregarExecucoes()
  }, [perfil?.regional_id, perfil?.setor_id, rotinas])

  const recarregarTudo = () => {
    // força o reload refazendo os estados; o useEffect dispara de novo
    setRotinas([])
    setExecucoes([])
  }

  // ------------------------------------------------------
  // CÁLCULOS DE KPIs E SÉRIES (feito em memória)
  // ------------------------------------------------------
  const hojeKey = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const kpiExecucao: KpiExecucao = useMemo(() => {
    if (!execucoes.length) {
      return {
        execucoesHoje: 0,
        concluidasHoje: 0,
        horasExecutadasHoje: 0,
        colaboradoresAtivosHoje: 0,
      }
    }

    let execucoesHoje = 0
    let concluidasHoje = 0
    let horasHoje = 0
    const colaboradoresHoje = new Set<string>()

    for (const e of execucoes) {
      if (!e.inicio_em) continue
      const dia = e.inicio_em.slice(0, 10)
      if (dia !== hojeKey) continue

      execucoesHoje += 1
      if (e.finalizado_em) {
        concluidasHoje += 1
      }
      if (e.duracao_total_segundos) {
        horasHoje += e.duracao_total_segundos / 3600
      }
      colaboradoresHoje.add(e.executor_id)
    }

    return {
      execucoesHoje,
      concluidasHoje,
      horasExecutadasHoje: Number(horasHoje.toFixed(1)),
      colaboradoresAtivosHoje: colaboradoresHoje.size,
    }
  }, [execucoes, hojeKey])

  const serieExecucoes: SerieDia[] = useMemo(() => {
    if (!execucoes.length) return []

    const mapa = new Map<string, SerieDia>()

    for (const e of execucoes) {
      if (!e.inicio_em) continue
      const dia = e.inicio_em.slice(0, 10)
      const atual = mapa.get(dia) ?? { dia, execucoes: 0, concluidas: 0 }
      atual.execucoes += 1
      if (e.finalizado_em) atual.concluidas += 1
      mapa.set(dia, atual)
    }

    return Array.from(mapa.values()).sort((a, b) =>
      a.dia.localeCompare(b.dia)
    )
  }, [execucoes])

  const totalRotinas = rotinas.length
  const totalDiarias = rotinas.filter((r) =>
    r.periodicidade?.toLowerCase().includes('diar')
  ).length
  const totalSemanais = rotinas.filter((r) =>
    r.periodicidade?.toLowerCase().includes('seman')
  ).length
  const totalMensais = rotinas.filter((r) =>
    r.periodicidade?.toLowerCase().includes('mens')
  ).length

  const totalExecucoesJanela = execucoes.length
  const totalConcluidasJanela = execucoes.filter(
    (e) => e.finalizado_em
  ).length

  const rankingN3: RankingItem[] = useMemo(() => {
    if (!execucoes.length) return []

    const mapa = new Map<string, { exec: number; horas: number }>()

    for (const e of execucoes) {
      if (!e.finalizado_em) continue // ranking só de concluídas
      const atual = mapa.get(e.executor_id) ?? { exec: 0, horas: 0 }
      atual.exec += 1
      if (e.duracao_total_segundos) {
        atual.horas += e.duracao_total_segundos / 3600
      }
      mapa.set(e.executor_id, atual)
    }

    const itens: RankingItem[] = Array.from(mapa.entries())
      .map(([executorId, info]) => ({
        executorId,
        nome: executorId, // placeholder; vamos tentar buscar nomes abaixo
        execucoesConcluidas: info.exec,
        horasTotais: Number(info.horas.toFixed(1)),
      }))
      .sort((a, b) => b.execucoesConcluidas - a.execucoesConcluidas)
      .slice(0, 5)

    return itens
  }, [execucoes])

  // Buscar nomes dos executores para o ranking (apenas quando necessário)
  useEffect(() => {
    const carregarNomes = async () => {
      if (!rankingN3.length) return

      const ids = rankingN3.map((r) => r.executorId)
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome')
        .in('id', ids)

      if (error || !data) return

      const mapaNomes = new Map<string, string>()
      for (const u of data) {
        mapaNomes.set(u.id, u.nome)
      }

      // atualiza nomes
      const atualizados = rankingN3.map((r) => ({
        ...r,
        nome: mapaNomes.get(r.executorId) ?? r.nome,
      }))
      setRankingN3(atualizados)
    }

    carregarNomes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankingN3.length])

  // ------------------------------------------------------
  // RENDER
  // ------------------------------------------------------
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* PAGE CARD NO TOPO (PADRÃO LOGIN) */}
      <section
        style={{
          borderRadius: 16,
          padding: 20,
          border: '1px solid #f97316',
          background:
            'radial-gradient(circle at top left, rgba(249,115,22,0.18), #020617)',
          boxShadow: '0 0 32px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px',
            borderRadius: 999,
            border: '1px solid rgba(249,115,22,0.6)',
            background: 'rgba(15,23,42,0.9)',
            fontSize: 11,
            letterSpacing: 0.5,
            color: '#f97316',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '999px',
              background: '#22c55e',
            }}
          />
          <span>NÍVEL · N2</span>
          <span style={{ opacity: 0.6 }}>Painel da regional</span>
        </div>

        <h2
          style={{
            margin: '0 0 4px',
            fontSize: 22,
            color: '#f9fafb',
          }}
        >
          Visão geral da regional
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: '#e5e7eb',
            maxWidth: 640,
          }}
        >
          Painel de acompanhamento das rotinas e execuções da sua regional:
          KPIs de hoje, histórico dos últimos 30 dias e ranking dos
          colaboradores (N3).
        </p>
      </section>

      {/* LINHA 1 – KPIs EXECUÇÃO + DISTRIBUIÇÃO DE ROTINAS */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.5fr',
          gap: 16,
        }}
      >
        {/* KPIs de execução (HOJE) */}
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: '1px solid #111827',
            background:
              'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(15,23,42,0.96))',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  color: '#bbf7d0',
                }}
              >
                Execuções · Hoje
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: '#e5e7eb',
                  opacity: 0.9,
                }}
              >
                Baseado em execuções das rotinas desta regional nos últimos
                30 dias.
              </p>
            </div>
            <button
              type="button"
              onClick={recarregarTudo}
              style={{
                ...styles.button,
                padding: '4px 12px',
                fontSize: 12,
                background:
                  'linear-gradient(90deg, #22c55e 0%, #a3e635 50%, #facc15 100%)',
                color: '#020617',
              }}
            >
              Recarregar
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
              marginTop: 8,
            }}
          >
            <KpiCard
              titulo="Execuções hoje"
              valor={kpiExecucao.execucoesHoje}
              destaque
            />
            <KpiCard
              titulo="Concluídas hoje"
              valor={kpiExecucao.concluidasHoje}
            />
            <KpiCard
              titulo="Horas executadas"
              valor={kpiExecucao.horasExecutadasHoje}
              sufixo="h"
            />
            <KpiCard
              titulo="Colaboradores ativos"
              valor={kpiExecucao.colaboradoresAtivosHoje}
            />
          </div>
        </div>

        {/* Distribuição de rotinas por periodicidade */}
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: '1px solid #111827',
            background:
              'linear-gradient(135deg, rgba(56,189,248,0.16), rgba(15,23,42,0.98))',
          }}
        >
          <h3
            style={{
              margin: '0 0 4px',
              fontSize: 16,
              color: '#bae6fd',
            }}
          >
            Rotinas da regional
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: '#e5e7eb',
              opacity: 0.9,
            }}
          >
            Distribuição das rotinas por periodicidade cadastradas para esta
            regional ou setor.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
              marginTop: 12,
            }}
          >
            <ResumoCard titulo="Total de rotinas" valor={totalRotinas} destaque />
            <ResumoCard titulo="Diárias" valor={totalDiarias} />
            <ResumoCard titulo="Semanais" valor={totalSemanais} />
            <ResumoCard titulo="Mensais" valor={totalMensais} />
          </div>
        </div>
      </section>

      {/* LINHA 2 – GRÁFICOS */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.3fr',
          gap: 16,
        }}
      >
        {/* Gráfico Execuções últimos 30 dias */}
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: '1px solid #111827',
            background:
              'radial-gradient(circle at top left, rgba(34,197,94,0.12), #020617)',
          }}
        >
          <h3
            style={{
              margin: '0 0 4px',
              fontSize: 16,
              color: '#bbf7d0',
            }}
          >
            Execuções · últimos 30 dias
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: '#e5e7eb',
              opacity: 0.9,
            }}
          >
            Cada barra representa o total de execuções iniciadas no dia.
          </p>

          <div style={{ marginTop: 16 }}>
            <ExecucoesChart serie={serieExecucoes} />
          </div>
        </div>

        {/* Planejado x Executado (janela) */}
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: '1px solid #111827',
            background:
              'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(15,23,42,0.98))',
          }}
        >
          <h3
            style={{
              margin: '0 0 4px',
              fontSize: 16,
              color: '#fed7aa',
            }}
          >
            Planejado x Executado
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: '#e5e7eb',
              opacity: 0.9,
            }}
          >
            Comparativo simples entre a quantidade de rotinas cadastradas e
            as execuções registradas nos últimos 30 dias.
          </p>

          <PlanejadoExecutadoChart
            planejado={totalRotinas}
            executado={totalExecucoesJanela}
            concluidas={totalConcluidasJanela}
          />
        </div>
      </section>

      {/* LINHA 3 – RANKING + TABELA DE ROTINAS */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1.3fr 2fr',
          gap: 16,
        }}
      >
        {/* Ranking N3 */}
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: '1px solid #111827',
            background:
              'linear-gradient(135deg, rgba(94,234,212,0.22), rgba(15,23,42,0.98))',
          }}
        >
          <h3
            style={{
              margin: '0 0 4px',
              fontSize: 16,
              color: '#a5f3fc',
            }}
          >
            Ranking · executores (N3)
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: '#e5e7eb',
              opacity: 0.9,
            }}
          >
            Top 5 colaboradores com mais execuções concluídas na janela de 30
            dias.
          </p>

          <RankingTable ranking={rankingN3} loading={loadingExecucoes} />
        </div>

        {/* Tabela de rotinas da regional (já existia, agora refinada) */}
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: '1px solid #111827',
            background:
              'radial-gradient(circle at top right, rgba(248,113,113,0.12), #020617)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
              gap: 8,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  color: '#fed7aa',
                }}
              >
                Rotinas cadastradas da regional
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: '#e5e7eb',
                  opacity: 0.9,
                }}
              >
                Rotinas vinculadas à sua regional ou setor. Esta tabela é a
                base da agenda e da execução (N3).
              </p>
            </div>
          </div>

          {erroRotinas && (
            <p style={{ fontSize: 13, color: '#fecaca' }}>
              Erro ao carregar rotinas: {erroRotinas}
            </p>
          )}

          {!loadingRotinas && !erroRotinas && rotinas.length === 0 && (
            <p style={{ fontSize: 13, color: '#e5e7eb' }}>
              Nenhuma rotina encontrada para esta regional/setor.
            </p>
          )}

          {rotinas.length > 0 && (
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    {[
                      'Título',
                      'Prioridade',
                      'Periodicidade',
                      'Dia da semana',
                      'Horário',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '6px 8px',
                          borderBottom: '1px solid #1f2937',
                          background: '#020617',
                          color: '#e5e7eb',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rotinas.map((r) => (
                    <tr key={r.id}>
                      <td
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #0f172a',
                          color: '#f9fafb',
                        }}
                      >
                        {r.titulo}
                      </td>
                      <td
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #0f172a',
                          color: '#e5e7eb',
                        }}
                      >
                        {r.prioridade ?? '—'}
                      </td>
                      <td
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #0f172a',
                          color: '#e5e7eb',
                        }}
                      >
                        {r.periodicidade}
                      </td>
                      <td
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #0f172a',
                          color: '#e5e7eb',
                        }}
                      >
                        {r.dia_semana ?? '—'}
                      </td>
                      <td
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #0f172a',
                          color: '#e5e7eb',
                        }}
                      >
                        {r.horario_inicio ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Mensagens de erro de execuções (se houver) */}
      {erroExecucoes && (
        <p style={{ fontSize: 12, color: '#fecaca' }}>
          Erro ao carregar execuções: {erroExecucoes}
        </p>
      )}
    </div>
  )
}

// ------------------------------------------------------
// COMPONENTES AUXILIARES
// ------------------------------------------------------

function KpiCard({
  titulo,
  valor,
  sufixo,
  destaque,
}: {
  titulo: string
  valor: number
  sufixo?: string
  destaque?: boolean
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: destaque ? '1px solid #22c55e' : '1px solid #1f2937',
        background: destaque
          ? 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(15,23,42,0.98))'
          : 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))',
        boxShadow: destaque ? '0 0 18px rgba(34,197,94,0.35)' : 'none',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: '#9ca3af',
          marginBottom: 4,
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#f9fafb',
        }}
      >
        {valor}
        {sufixo && (
          <span
            style={{
              fontSize: 13,
              marginLeft: 3,
              color: '#e5e7eb',
              opacity: 0.9,
            }}
          >
            {sufixo}
          </span>
        )}
      </div>
    </div>
  )
}

function ResumoCard({
  titulo,
  valor,
  destaque,
}: {
  titulo: string
  valor: number
  destaque?: boolean
}) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 10,
        border: destaque ? '1px solid #38bdf8' : '1px solid #1f2937',
        background: destaque
          ? 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(15,23,42,0.96))'
          : 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: '#9ca3af',
          marginBottom: 4,
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#e5e7eb',
        }}
      >
        {valor}
      </div>
    </div>
  )
}

function ExecucoesChart({ serie }: { serie: SerieDia[] }) {
  if (!serie.length) {
    return (
      <p style={{ fontSize: 12, color: '#e5e7eb' }}>
        Ainda não há execuções registradas na janela de 30 dias.
      </p>
    )
  }

  const max = Math.max(...serie.map((s) => s.execucoes)) || 1

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        height: 160,
        paddingBottom: 8,
      }}
    >
      {serie.map((s) => {
        const altura = (s.execucoes / max) * 120
        const diaFormatado = formatarDataCurta(s.dia)
        return (
          <div
            key={s.dia}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                width: '100%',
                borderRadius: 6,
                background:
                  'linear-gradient(180deg, #22c55e 0%, #4ade80 40%, #166534 100%)',
                height: `${altura}px`,
                boxShadow: '0 0 12px rgba(34,197,94,0.4)',
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: '#9ca3af',
                whiteSpace: 'nowrap',
              }}
            >
              {diaFormatado}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function PlanejadoExecutadoChart({
  planejado,
  executado,
  concluidas,
}: {
  planejado: number
  executado: number
  concluidas: number
}) {
  const max = Math.max(planejado, executado) || 1

  const barra = (valor: number, cor: string, label: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          height: 18,
          borderRadius: 999,
          overflow: 'hidden',
          background: '#020617',
          border: '1px solid #1f2937',
        }}
      >
        <div
          style={{
            width: `${(valor / max) * 100}%`,
            height: '100%',
            background: cor,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#e5e7eb',
        }}
      >
        <span>{label}</span>
        <span>{valor}</span>
      </div>
    </div>
  )

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {barra(
        planejado,
        'linear-gradient(90deg, #38bdf8, #0ea5e9)',
        'Rotinas cadastradas (planejado)'
      )}
      {barra(
        executado,
        'linear-gradient(90deg, #22c55e, #16a34a)',
        'Execuções registradas'
      )}
      {barra(
        concluidas,
        'linear-gradient(90deg, #f97316, #ea580c)',
        'Execuções concluídas'
      )}
    </div>
  )
}

function RankingTable({
  ranking,
  loading,
}: {
  ranking: RankingItem[]
  loading: boolean
}) {
  if (loading) {
    return (
      <p style={{ fontSize: 12, color: '#e5e7eb', marginTop: 12 }}>
        Carregando execuções...
      </p>
    )
  }

  if (!ranking.length) {
    return (
      <p style={{ fontSize: 12, color: '#e5e7eb', marginTop: 12 }}>
        Ainda não há execuções concluídas para montar o ranking.
      </p>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            {['Posição', 'Colaborador', 'Execuções', 'Horas'].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '6px 8px',
                  borderBottom: '1px solid #0f172a',
                  background: '#020617',
                  color: '#e5e7eb',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranking.map((r, idx) => (
            <tr key={r.executorId}>
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #0f172a',
                  color: '#f9fafb',
                }}
              >
                #{idx + 1}
              </td>
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #0f172a',
                  color: '#f9fafb',
                }}
              >
                {r.nome}
              </td>
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #0f172a',
                  color: '#e5e7eb',
                }}
              >
                {r.execucoesConcluidas}
              </td>
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #0f172a',
                  color: '#e5e7eb',
                }}
              >
                {r.horasTotais} h
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatarDataCurta(isoDate: string) {
  try {
    const [y, m, d] = isoDate.split('-').map((n) => parseInt(n, 10))
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return isoDate
  }
}
