// src/components/N3MinhasRotinas.tsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Usuario } from '../types'
import { styles } from '../styles'

type Rotina = {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  periodicidade: string
  data_inicio: string
  dia_semana: string | null
  horario_inicio: string | null
  duracao_minutos: number | null
  tem_checklist: boolean
  tem_anexo?: boolean
}

type ChecklistTpl = {
  id: number
  rotina_id: string
  ordem: number
  descricao: string
  obrigatorio?: boolean
  exige_anexo?: boolean
  tipo_valor?: string | null // 'numero' | 'texto' | null
  valor_minimo?: number | null
  valor_maximo?: number | null
}

type Execucao = {
  id: number
  rotina_id: string
  executor_id: string
  inicio_em: string | null
  pausado_em: string | null
  finalizado_em: string | null
  duracao_total_segundos: number | null
  observacoes: string | null
}

type ChecklistExec = {
  id?: number
  execucao_id: number
  checklist_id: number
  concluido: boolean
  valor_numerico: number | null
  valor_texto: string | null
}

export function N3MinhasRotinas({ perfil }: { perfil: Usuario | null }) {
  const [rotinas, setRotinas] = useState<Rotina[]>([])
  const [rotinaSelId, setRotinaSelId] = useState<string>('')

  const [checklistTpl, setChecklistTpl] = useState<ChecklistTpl[]>([])
  const [checklistExec, setChecklistExec] = useState<ChecklistExec[]>([])
  const [execucao, setExecucao] = useState<Execucao | null>(null)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState('')

  const hojeISO = new Date().toISOString().slice(0, 10)
  const hojeSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
    .format(new Date())
    .toLowerCase()

  const rotinaSelecionada = useMemo(
    () => rotinas.find((r) => r.id === rotinaSelId) ?? null,
    [rotinas, rotinaSelId]
  )

  // ------------------------------------
  // Regras de "rotina do dia" (igual antes)
  // ------------------------------------
  const rotinaEhDoDia = (r: Rotina) => {
    const p = r.periodicidade?.toLowerCase() ?? ''
    if (p === 'diaria') return true
    if (p === 'semanal') return r.dia_semana?.toLowerCase() === hojeSemana
    if (p === 'mensal') return r.data_inicio === hojeISO
    return r.data_inicio === hojeISO
  }

  const carregarRotinas = async () => {
    if (!perfil?.id) return
    setLoading(true)
    setMsg(null)

    const { data, error } = await supabase
      .from('rotinas')
      .select(
        `
        id, titulo, descricao, tipo, periodicidade, data_inicio,
        dia_semana, horario_inicio, duracao_minutos, tem_checklist, tem_anexo
      `
      )
      .eq('responsavel_id', perfil.id)

    if (error) {
      console.error(error)
      setMsg('Erro ao carregar rotinas.')
      setRotinas([])
      setLoading(false)
      return
    }

    const lista = (data ?? []) as Rotina[]
    setRotinas(lista.filter(rotinaEhDoDia))
    setLoading(false)
  }

  useEffect(() => {
    carregarRotinas()
  }, [perfil?.id])

  // ------------------------------------
  // Checklist template
  // ------------------------------------
  const carregarChecklistTemplate = async (rotinaId: string) => {
    const { data, error } = await supabase
      .from('rotina_checklist')
      .select(
        'id, rotina_id, ordem, descricao, obrigatorio, exige_anexo, tipo_valor, valor_minimo, valor_maximo'
      )
      .eq('rotina_id', rotinaId)
      .order('ordem', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setChecklistTpl((data ?? []) as ChecklistTpl[])
  }

  const carregarChecklistExec = async (execucaoId: number) => {
    const { data, error } = await supabase
      .from('rotina_checklist_execucao')
      .select('*')
      .eq('execucao_id', execucaoId)

    if (error) {
      console.error(error)
      return
    }

    setChecklistExec((data ?? []) as ChecklistExec[])
  }

  // ------------------------------------
  // Execução HOJE
  // ------------------------------------
  const carregarExecucaoHoje = async (rotinaId: string) => {
    if (!perfil?.id) return

    try {
      const hoje = new Date()
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

      const { data, error } = await supabase
        .from('rotina_execucoes')
        .select(
          'id, rotina_id, executor_id, inicio_em, pausado_em, finalizado_em, duracao_total_segundos, observacoes'
        )
        .eq('rotina_id', rotinaId)
        .eq('executor_id', perfil.id)
        .gte('inicio_em', inicio.toISOString())
        .lte('inicio_em', fim.toISOString())
        .order('inicio_em', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Erro ao carregar execução de hoje (N3):', error)
        return
      }

      const exec = data?.[0] as Execucao
      if (exec) {
        setExecucao(exec)
        setObservacoes(exec.observacoes ?? '')

        await carregarChecklistTemplate(rotinaId)
        await carregarChecklistExec(exec.id)
      } else {
        setExecucao(null)
        setChecklistTpl([])
        setChecklistExec([])
        setObservacoes('')
      }
    } catch (e) {
      console.error('Erro inesperado ao carregar execução de hoje (N3):', e)
    }
  }

  useEffect(() => {
    if (!rotinaSelId) {
      setExecucao(null)
      setChecklistTpl([])
      setChecklistExec([])
      setObservacoes('')
      return
    }
    carregarExecucaoHoje(rotinaSelId)
  }, [rotinaSelId, perfil?.id])

  // ------------------------------------
  // Execução via Edge Function
  // ------------------------------------
  const callExec = async (
    rotina_id: string,
    action: 'start' | 'pause' | 'resume' | 'finish'
  ) => {
    const { data, error } = await supabase.functions.invoke(
      'eqf-rotina-execucao',
      { body: { rotina_id, action } }
    )
    if (error) throw error
    return data
  }

  const getResp = (id: number) =>
    checklistExec.find((x) => x.checklist_id === id) ?? null

  const iniciarExecucao = async () => {
    if (!rotinaSelId) return

    setMsg('Iniciando...')
    try {
      const resp = await callExec(rotinaSelId, 'start')
      const exec = resp.execucao as Execucao
      setExecucao(exec)

      // garantir template + exec
      await carregarChecklistTemplate(rotinaSelId)
      await carregarChecklistExec(exec.id)

      // cria itens faltantes se não tiver na execução
      const faltantes = checklistTpl.filter(
        (tpl) => !checklistExec.find((r) => r.checklist_id === tpl.id)
      )
      if (faltantes.length > 0) {
        await supabase.from('rotina_checklist_execucao').insert(
          faltantes.map((f) => ({
            execucao_id: exec.id,
            checklist_id: f.id,
            concluido: false,
            valor_numerico: null,
            valor_texto: null,
          }))
        )
        await carregarChecklistExec(exec.id)
      }

      if (observacoes.trim()) {
        await supabase
          .from('rotina_execucoes')
          .update({ observacoes })
          .eq('id', exec.id)
      }

      setMsg('Execução iniciada.')
      await carregarExecucaoHoje(rotinaSelId)
    } catch (e: any) {
      console.error(e)
      setMsg('Erro ao iniciar: ' + String(e))
    }
  }

  const pausarExec = async () => {
    if (!execucao) return
    try {
      await callExec(execucao.rotina_id, 'pause')
      setExecucao({ ...execucao, pausado_em: new Date().toISOString() })
      setMsg('Execução pausada.')
    } catch (e: any) {
      console.error(e)
      setMsg('Erro ao pausar: ' + String(e))
    }
  }

  const retomarExec = async () => {
    if (!execucao) return
    try {
      await callExec(execucao.rotina_id, 'resume')
      setExecucao({ ...execucao, pausado_em: null })
      setMsg('Execução retomada.')
    } catch (e: any) {
      console.error(e)
      setMsg('Erro ao retomar: ' + String(e))
    }
  }

  // ------------------------------------
  // Validação avançada + Finalizar
  // ------------------------------------
  const finalizarExec = async () => {
    if (!execucao) return

    const haChecklist = checklistTpl.length > 0
    const checklistMarcado =
      !haChecklist ||
      checklistTpl.every((tpl) => getResp(tpl.id)?.concluido)

    if (haChecklist && !checklistMarcado) {
      setMsg('⚠️ Conclua todos os itens do checklist antes de finalizar.')
      return
    }

    // obrigatórios (valor numérico / texto)
    const obrigatorios = checklistTpl.filter((t) => t.obrigatorio)
    const invalidos: string[] = []

    for (const tpl of obrigatorios) {
      const resp = getResp(tpl.id)

      if (!resp?.concluido) {
        invalidos.push(tpl.descricao)
        continue
      }

      const tipo = (tpl.tipo_valor || '').toLowerCase()

      if (tipo === 'numero') {
        const v = resp.valor_numerico
        if (v === null || Number.isNaN(v)) {
          invalidos.push(tpl.descricao)
          continue
        }
        if (tpl.valor_minimo != null && v < Number(tpl.valor_minimo)) {
          invalidos.push(`${tpl.descricao} (menor que o mínimo)`)
          continue
        }
        if (tpl.valor_maximo != null && v > Number(tpl.valor_maximo)) {
          invalidos.push(`${tpl.descricao} (maior que o máximo)`)
          continue
        }
      }

      if (tipo === 'texto') {
        const t = resp.valor_texto?.trim() ?? ''
        if (!t) {
          invalidos.push(tpl.descricao)
          continue
        }
      }
    }

    if (invalidos.length > 0) {
      setMsg(
        '⚠️ Preencha corretamente todos os itens obrigatórios do checklist antes de finalizar.'
      )
      return
    }

    // anexo obrigatório (se algum item exige_anexo = true)
    const exigeAnexo = checklistTpl.some((t) => t.exige_anexo)
    if (exigeAnexo && rotinaSelecionada && perfil?.id) {
      const { data: anexos, error: errAnexo } = await supabase
        .from('rotina_anexos')
        .select('id')
        .eq('rotina_id', rotinaSelecionada.id)
        .eq('executor_id', perfil.id)
        .limit(1)

      if (errAnexo) {
        console.error('Erro ao verificar anexos (N3):', errAnexo)
        setMsg('❌ Erro ao verificar anexos obrigatórios.')
        return
      }

      if (!anexos || anexos.length === 0) {
        setMsg('📎 Inclua pelo menos um anexo obrigatório antes de finalizar.')
        return
      }
    }

    setMsg('Finalizando...')
    try {
      await callExec(execucao.rotina_id, 'finish')
      setExecucao({ ...execucao, finalizado_em: new Date().toISOString() })
      setMsg('Execução finalizada ✔')
      await carregarExecucaoHoje(execucao.rotina_id)
    } catch (e: any) {
      console.error(e)
      setMsg('Erro ao finalizar: ' + String(e))
    }
  }

  // ------------------------------------
  // Helpers do checklist
  // ------------------------------------
  const salvarChecklist = async (item: ChecklistExec) => {
    if (!item.id) return
    await supabase
      .from('rotina_checklist_execucao')
      .update({
        concluido: item.concluido,
        valor_numerico: item.valor_numerico,
        valor_texto: item.valor_texto,
      })
      .eq('id', item.id)
  }

  const toggle = async (id: number, v: boolean) => {
    if (!execucao) return
    const old = checklistExec
    const novo = old.map((i) =>
      i.checklist_id === id ? { ...i, concluido: v } : i
    )
    setChecklistExec(novo)

    try {
      const item = novo.find((i) => i.checklist_id === id)!
      await salvarChecklist(item)
    } catch (e) {
      console.error(e)
      setChecklistExec(old)
    }
  }

  const changeNum = (id: number, v: string) => {
    const num = v === '' ? null : Number(v)
    setChecklistExec((prev) =>
      prev.map((i) =>
        i.checklist_id === id ? { ...i, valor_numerico: num } : i
      )
    )
  }

  const changeTxt = (id: number, v: string) => {
    setChecklistExec((prev) =>
      prev.map((i) =>
        i.checklist_id === id ? { ...i, valor_texto: v } : i
      )
    )
  }

  const salvarBlur = async (id: number) => {
    const item = getResp(id)
    if (item?.id) await salvarChecklist(item)
  }

  const checklistOK =
    checklistTpl.length > 0 &&
    checklistTpl.every((tpl) => getResp(tpl.id)?.concluido)

  const execucaoPausada = !!execucao?.pausado_em && !execucao?.finalizado_em

  const podeFinalizar =
    !!execucao &&
    !execucao.finalizado_em &&
    (!rotinaSelecionada?.tem_checklist || checklistOK)

  // ------------------------------------
  // UI
  // ------------------------------------
  return (
    <section
      style={{
        borderRadius: 12,
        border: '1px solid #333',
        padding: 16,
        background:
          'radial-gradient(circle at top right, rgba(248,113,113,0.12), #050608)',
        marginTop: 8,
      }}
    >
      <h2 style={{ marginTop: 0, color: '#f97316' }}>
        Bloco 8 – Minhas Rotinas (N3)
      </h2>

      <button
        type="button"
        onClick={carregarRotinas}
        style={{
          ...styles.button,
          padding: '6px 14px',
          fontSize: 12,
          background: 'linear-gradient(90deg, #22c55e, #a3e635)',
          color: '#000',
          marginBottom: 12,
        }}
      >
        Recarregar
      </button>

      {loading && <p style={{ color: '#aaa' }}>Carregando...</p>}
      {msg && (
        <p style={{ color: '#facc15', fontSize: 13, marginTop: 4 }}>{msg}</p>
      )}

      {/* Selecionar rotina */}
      <div style={{ marginTop: 12 }}>
        <label style={styles.label}>Selecione a rotina do dia:</label>
        <select
          value={rotinaSelId}
          onChange={(e) => setRotinaSelId(e.target.value)}
          style={styles.input}
        >
          <option value="">
            {rotinas.length === 0 ? 'Nenhuma rotina do dia' : 'Selecione'}
          </option>
          {rotinas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.titulo} • {r.horario_inicio}
            </option>
          ))}
        </select>
      </div>

      {/* Detalhes */}
      {rotinaSelecionada && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            background: 'rgba(2,6,23,0.8)',
            color: '#e5e7eb',
            display: 'grid',
            gap: 4,
            fontSize: 13,
          }}
        >
          <div>
            <strong>Título:</strong> {rotinaSelecionada.titulo}
          </div>
          {rotinaSelecionada.descricao && (
            <div>
              <strong>Descrição:</strong> {rotinaSelecionada.descricao}
            </div>
          )}
          <div>
            <strong>Periodicidade:</strong>{' '}
            {rotinaSelecionada.periodicidade}
          </div>
          <div>
            <strong>Horário:</strong> {rotinaSelecionada.horario_inicio}
          </div>
          <div>
            <strong>Checklist:</strong>{' '}
            {rotinaSelecionada.tem_checklist ? 'Sim' : 'Não'}
          </div>
        </div>
      )}

      {/* Observações */}
      {rotinaSelecionada && (
        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>Observações:</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            style={{ ...styles.input, minHeight: 60 }}
            placeholder="Digite uma observação opcional..."
          />
        </div>
      )}

      {/* Botões */}
      {rotinaSelecionada && (
        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!execucao && (
            <button
              onClick={iniciarExecucao}
              style={{
                ...styles.button,
                background: 'linear-gradient(90deg,#22c55e,#a3e635)',
                color: '#000',
              }}
            >
              Iniciar
            </button>
          )}

          {execucao && !execucao.finalizado_em && (
            <>
              {!execucaoPausada && (
                <button
                  onClick={pausarExec}
                  style={{
                    ...styles.button,
                    background: '#0f172a',
                    border: '1px solid #334155',
                    color: '#e2e8f0',
                  }}
                >
                  Pausar
                </button>
              )}

              {execucaoPausada && (
                <button
                  onClick={retomarExec}
                  style={{
                    ...styles.button,
                    background: '#0f172a',
                    border: '1px solid #334155',
                    color: '#e2e8f0',
                  }}
                >
                  Retomar
                </button>
              )}

              <button
                onClick={finalizarExec}
                disabled={!podeFinalizar}
                style={{
                  ...styles.button,
                  background: podeFinalizar
                    ? 'linear-gradient(90deg,#00ff88,#ffaa00)'
                    : '#374151',
                  opacity: podeFinalizar ? 1 : 0.6,
                  color: '#000',
                }}
              >
                Finalizar
              </button>
            </>
          )}

          {execucao?.finalizado_em && (
            <p style={{ color: '#86efac', fontSize: 13, marginLeft: 10 }}>
              Finalizado ✔
            </p>
          )}
        </div>
      )}

      {/* Checklist */}
      {rotinaSelecionada && checklistTpl.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ color: '#38bdf8' }}>Checklist</h3>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              marginTop: 6,
            }}
          >
            <thead>
              <tr>
                <th style={{ background: '#020617', padding: 6 }}>OK</th>
                <th style={{ background: '#020617', padding: 6 }}>Descrição</th>
                <th style={{ background: '#020617', padding: 6 }}>
                  Valor num.
                </th>
                <th style={{ background: '#020617', padding: 6 }}>Texto</th>
              </tr>
            </thead>
            <tbody>
              {checklistTpl.map((tpl) => {
                const r = getResp(tpl.id)
                const tipo = (tpl.tipo_valor || '').toLowerCase()
                const obrig = tpl.obrigatorio

                return (
                  <tr key={tpl.id}>
                    <td style={{ padding: 6 }}>
                      <input
                        type="checkbox"
                        checked={!!r?.concluido}
                        disabled={!execucao || !!execucao.finalizado_em}
                        onChange={(e) => toggle(tpl.id, e.target.checked)}
                      />
                    </td>
                    <td style={{ padding: 6 }}>
                      {tpl.descricao}
                      {obrig && (
                        <span style={{ color: '#fb923c', fontSize: 11 }}>
                          {' '}
                          (obrigatório)
                        </span>
                      )}
                      {tpl.exige_anexo && (
                        <span style={{ color: '#38bdf8', fontSize: 11 }}>
                          {' '}
                          • exige anexo
                        </span>
                      )}
                      {tipo === 'numero' && (
                        <span style={{ color: '#a5b4fc', fontSize: 11 }}>
                          {' '}
                          • numérico
                        </span>
                      )}
                      {tipo === 'texto' && (
                        <span style={{ color: '#a5b4fc', fontSize: 11 }}>
                          {' '}
                          • texto
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        type="number"
                        value={r?.valor_numerico ?? ''}
                        disabled={!execucao || !!execucao.finalizado_em}
                        onChange={(e) => changeNum(tpl.id, e.target.value)}
                        onBlur={() => salvarBlur(tpl.id)}
                        style={{ ...styles.input, width: 80 }}
                        placeholder={
                          tipo === 'numero' ? 'obrigatório se marcado' : 'opcional'
                        }
                      />
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        type="text"
                        value={r?.valor_texto ?? ''}
                        disabled={!execucao || !!execucao.finalizado_em}
                        onChange={(e) => changeTxt(tpl.id, e.target.value)}
                        onBlur={() => salvarBlur(tpl.id)}
                        style={{ ...styles.input, width: '100%' }}
                        placeholder={
                          tipo === 'texto' ? 'obrigatório se marcado' : 'opcional'
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {rotinaSelecionada.tem_checklist && (
            <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
              {checklistOK
                ? 'Checklist completo ✔'
                : 'Complete todos os itens para finalizar.'}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
