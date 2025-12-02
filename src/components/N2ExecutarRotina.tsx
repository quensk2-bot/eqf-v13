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
  urgencia: string | null
  status: string | null
  tem_checklist: boolean
  tem_anexo?: boolean
}

type ChecklistItemTemplate = {
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

type ChecklistExecucaoItem = {
  id?: number
  execucao_id: number
  checklist_id: number
  concluido: boolean
  valor_numerico: number | null
  valor_texto: string | null
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

export function N2ExecutarRotina({ perfil }: { perfil: Usuario }) {
  const [rotinas, setRotinas] = useState<Rotina[]>([])
  const [loadingRotinas, setLoadingRotinas] = useState(false)
  const [errorRotinas, setErrorRotinas] = useState<string | null>(null)

  const [rotinaSelId, setRotinaSelId] = useState<string>('')
  const rotinaSelecionada = useMemo(
    () => rotinas.find((r) => r.id === rotinaSelId) ?? null,
    [rotinas, rotinaSelId]
  )

  const [checklistTpl, setChecklistTpl] = useState<ChecklistItemTemplate[]>([])
  const [checklistExec, setChecklistExec] = useState<ChecklistExecucaoItem[]>([])
  const [loadingChecklist, setLoadingChecklist] = useState(false)
  const [errorChecklist, setErrorChecklist] = useState<string | null>(null)

  const [execucao, setExecucao] = useState<Execucao | null>(null)
  const [statusExec, setStatusExec] = useState<string | null>(null)

  const [observacoes, setObservacoes] = useState('')

  // -----------------------------
  // carregar rotinas do dia (via view BLOCO 12) — N2 SEMPRE REGIONAL
  // -----------------------------
  const carregarRotinas = async () => {
    // Regra dura: N2 precisa ter regional_id
    if (!perfil.regional_id) {
      setRotinas([])
      setErrorRotinas(
        'Seu perfil N2 está sem regional vinculada. Peça ao ADM para configurar a regional deste usuário.'
      )
      return
    }

    setLoadingRotinas(true)
    setErrorRotinas(null)
    try {
      const { data, error } = await supabase
        .from('vw_rotinas_hoje')
        .select(
          `
          id, titulo, descricao, tipo, periodicidade, data_inicio,
          dia_semana, horario_inicio, duracao_minutos,
          urgencia, status, tem_checklist, tem_anexo,
          departamento_id, setor_id, regional_id
        `
        )
        .eq('regional_id', perfil.regional_id)
        .order('horario_inicio', { ascending: true })

      if (error) throw error

      const lista = (data ?? []) as Rotina[]
      setRotinas(lista)

      // se a rotina selecionada saiu da lista, limpa seleção
      if (rotinaSelId && !lista.find((r) => r.id === rotinaSelId)) {
        setRotinaSelId('')
        setChecklistTpl([])
        setChecklistExec([])
        setExecucao(null)
        setObservacoes('')
      }
    } catch (e: any) {
      setErrorRotinas(e.message ?? String(e))
      setRotinas([])
    } finally {
      setLoadingRotinas(false)
    }
  }

  useEffect(() => {
    carregarRotinas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.regional_id])

  // -----------------------------
  // checklist template da rotina
  // -----------------------------
  const carregarChecklistTemplate = async (rotinaId: string) => {
    setLoadingChecklist(true)
    setErrorChecklist(null)
    try {
      const { data, error } = await supabase
        .from('rotina_checklist')
        .select(
          'id, rotina_id, ordem, descricao, obrigatorio, exige_anexo, tipo_valor, valor_minimo, valor_maximo'
        )
        .eq('rotina_id', rotinaId)
        .order('ordem', { ascending: true })

      if (error) throw error
      setChecklistTpl((data ?? []) as ChecklistItemTemplate[])
    } catch (e: any) {
      setErrorChecklist(e.message ?? String(e))
    } finally {
      setLoadingChecklist(false)
    }
  }

  const carregarChecklistExecucao = async (execucaoId: number) => {
    const { data, error } = await supabase
      .from('rotina_checklist_execucao')
      .select(
        'id, execucao_id, checklist_id, concluido, valor_numerico, valor_texto'
      )
      .eq('execucao_id', execucaoId)

    if (error) throw error
    setChecklistExec((data ?? []) as ChecklistExecucaoItem[])
  }

  const getResposta = (checklistId: number): ChecklistExecucaoItem | null =>
    checklistExec.find((x) => x.checklist_id === checklistId) ?? null

  // -----------------------------
  // Execução HOJE
  // -----------------------------
  const carregarExecucaoHoje = async (rotinaId: string) => {
    try {
      const hoje = new Date()
      const inicio = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate(),
        0,
        0,
        0,
        0
      )
      const fim = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate(),
        23,
        59,
        59,
        999
      )

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
        console.error('Erro ao carregar execução de hoje (N2):', error)
        return
      }

      const exec = (data && data[0]) as Execucao | undefined
      if (exec) {
        setExecucao(exec)
        setObservacoes(exec.observacoes ?? '')
        if (exec.id) {
          await carregarChecklistExecucao(exec.id)
        }
      } else {
        setExecucao(null)
        setChecklistExec([])
        setObservacoes('')
      }
    } catch (e) {
      console.error('Erro inesperado ao carregar execução de hoje (N2):', e)
    }
  }

  // Quando escolhe uma rotina
  useEffect(() => {
    if (rotinaSelId) {
      setChecklistExec([])
      setExecucao(null)
      setObservacoes('')
      carregarChecklistTemplate(rotinaSelId)
      carregarExecucaoHoje(rotinaSelId)
    } else {
      setChecklistTpl([])
      setChecklistExec([])
      setExecucao(null)
      setObservacoes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotinaSelId])

  // -----------------------------
  // Execução via Edge Function
  // -----------------------------
  const callExecucaoFn = async (
    rotinaId: string,
    action: 'start' | 'pause' | 'resume' | 'finish'
  ) => {
    const { data, error } = await supabase.functions.invoke(
      'eqf-rotina-execucao',
      {
        body: { rotina_id: rotinaId, action },
      }
    )
    if (error) throw error
    return data
  }

  const iniciarExecucao = async () => {
    if (!rotinaSelId) return
    setStatusExec('⏳ Iniciando execução...')
    try {
      const data = await callExecucaoFn(rotinaSelId, 'start')
      const exec = data?.execucao as Execucao
      setExecucao(exec)

      if (exec?.id) {
        if (checklistTpl.length === 0) {
          await carregarChecklistTemplate(rotinaSelId)
        }
        await carregarChecklistExecucao(exec.id)

        const faltantes = checklistTpl.filter((tpl) => !getResposta(tpl.id))
        if (faltantes.length > 0) {
          const inserts = faltantes.map((tpl) => ({
            execucao_id: exec.id,
            checklist_id: tpl.id,
            concluido: false,
            valor_numerico: null,
            valor_texto: null,
          }))

          await supabase.from('rotina_checklist_execucao').insert(inserts)
          await carregarChecklistExecucao(exec.id)
        }
      }

      if (observacoes.trim()) {
        await supabase
          .from('rotina_execucoes')
          .update({ observacoes })
          .eq('id', exec.id)
      }

      setStatusExec('✅ Execução iniciada.')
      await carregarExecucaoHoje(rotinaSelId)
    } catch (e: any) {
      console.error(e)
      setStatusExec('❌ Erro ao iniciar execução: ' + (e.message ?? String(e)))
    }
  }

  const pausarExecucao = async () => {
    if (!execucao) return
    setStatusExec('⏳ Pausando...')
    try {
      await callExecucaoFn(execucao.rotina_id, 'pause')
      setExecucao((prev) =>
        prev ? { ...prev, pausado_em: new Date().toISOString() } : prev
      )
      setStatusExec('⏸️ Execução pausada.')
    } catch (e: any) {
      console.error(e)
      setStatusExec('❌ Erro ao pausar: ' + (e.message ?? String(e)))
    }
  }

  const retomarExecucao = async () => {
    if (!execucao) return
    setStatusExec('⏳ Retomando...')
    try {
      await callExecucaoFn(execucao.rotina_id, 'resume')
      setExecucao((prev) => (prev ? { ...prev, pausado_em: null } : prev))
      setStatusExec('▶️ Execução retomada.')
    } catch (e: any) {
      console.error(e)
      setStatusExec('❌ Erro ao retomar: ' + (e.message ?? String(e)))
    }
  }

  // -----------------------------
  // Finalizar com validação avançada
  // -----------------------------
  const finalizarExecucao = async () => {
    if (!execucao) return

    const haChecklist = checklistTpl.length > 0
    const checklistMarcado =
      !haChecklist ||
      checklistTpl.every((tpl) => getResposta(tpl.id)?.concluido)

    if (haChecklist && !checklistMarcado) {
      setStatusExec(
        '⚠️ Conclua todos os itens do checklist antes de finalizar.'
      )
      return
    }

    // campos obrigatórios (valor numérico / texto)
    const obrigatorios = checklistTpl.filter((t) => t.obrigatorio)
    const invalidosObrigatorios: string[] = []

    for (const tpl of obrigatorios) {
      const resp = getResposta(tpl.id)

      if (!resp?.concluido) {
        invalidosObrigatorios.push(tpl.descricao)
        continue
      }

      const tipo = (tpl.tipo_valor || '').toLowerCase()

      if (tipo === 'numero') {
        const v = resp.valor_numerico
        if (v === null || Number.isNaN(v)) {
          invalidosObrigatorios.push(tpl.descricao)
          continue
        }
        if (
          tpl.valor_minimo != null &&
          v < Number(tpl.valor_minimo)
        ) {
          invalidosObrigatorios.push(
            `${tpl.descricao} (menor que o mínimo)`
          )
          continue
        }
        if (
          tpl.valor_maximo != null &&
          v > Number(tpl.valor_maximo)
        ) {
          invalidosObrigatorios.push(
            `${tpl.descricao} (maior que o máximo)`
          )
          continue
        }
      }

      if (tipo === 'texto') {
        const t = resp.valor_texto?.trim() ?? ''
        if (!t) {
          invalidosObrigatorios.push(tpl.descricao)
          continue
        }
      }
    }

    if (invalidosObrigatorios.length > 0) {
      setStatusExec(
        '⚠️ Preencha corretamente todos os itens obrigatórios do checklist antes de finalizar.'
      )
      return
    }

    // anexo obrigatório (nível de rotina)
    const exigeAlgumAnexo = checklistTpl.some((t) => t.exige_anexo)
    if (exigeAlgumAnexo && rotinaSelecionada) {
      const { data: anexos, error: errAnexo } = await supabase
        .from('rotina_anexos')
        .select('id')
        .eq('rotina_id', rotinaSelecionada.id)
        .eq('executor_id', perfil.id)
        .limit(1)

      if (errAnexo) {
        console.error('Erro ao verificar anexos:', errAnexo)
        setStatusExec('❌ Erro ao verificar anexos obrigatórios.')
        return
      }

      if (!anexos || anexos.length === 0) {
        setStatusExec(
          '📎 Inclua pelo menos um anexo obrigatório antes de finalizar.'
        )
        return
      }
    }

    // se passou de todas as validações
    setStatusExec('⏳ Finalizando...')
    try {
      const data = await callExecucaoFn(execucao.rotina_id, 'finish')
      setExecucao(data?.execucao as Execucao)
      setStatusExec('✅ Execução finalizada.')

      await carregarRotinas()
      if (rotinaSelId) {
        await carregarExecucaoHoje(rotinaSelId)
      }
    } catch (e: any) {
      console.error(e)
      setStatusExec('❌ Erro ao finalizar: ' + (e.message ?? String(e)))
    }
  }

  // -----------------------------
  // Salvar checklist
  // -----------------------------
  const salvarRespostaChecklist = async (resp: ChecklistExecucaoItem) => {
    const { error } = await supabase
      .from('rotina_checklist_execucao')
      .update({
        concluido: resp.concluido,
        valor_numerico: resp.valor_numerico,
        valor_texto: resp.valor_texto,
      })
      .eq('id', resp.id!)

    if (error) throw error
  }

  const onToggleConcluido = async (checklistId: number, concluido: boolean) => {
    if (!execucao) return

    const old = checklistExec
    const respAtual = getResposta(checklistId)
    if (!respAtual) return

    const novo = old.map((r) =>
      r.checklist_id === checklistId ? { ...r, concluido } : r
    )
    setChecklistExec(novo)

    try {
      const item = novo.find((r) => r.checklist_id === checklistId)!
      await salvarRespostaChecklist(item)
    } catch (e) {
      console.error(e)
      setChecklistExec(old)
      alert('Erro ao salvar checklist: ' + String(e))
    }
  }

  const onChangeValorNum = (checklistId: number, v: string) => {
    const num = v === '' ? null : Number(v)
    setChecklistExec((prev) =>
      prev.map((r) =>
        r.checklist_id === checklistId ? { ...r, valor_numerico: num } : r
      )
    )
  }

  const onChangeValorTexto = (checklistId: number, v: string) => {
    setChecklistExec((prev) =>
      prev.map((r) =>
        r.checklist_id === checklistId ? { ...r, valor_texto: v } : r
      )
    )
  }

  const onBlurSalvar = async (checklistId: number) => {
    try {
      const resp = getResposta(checklistId)
      if (!resp?.id) return
      await salvarRespostaChecklist(resp)
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar checklist: ' + String(e))
    }
  }

  const checklistConcluido =
    checklistTpl.length > 0 &&
    checklistTpl.every((tpl) => getResposta(tpl.id)?.concluido)

  const podeFinalizar =
    !!execucao &&
    !execucao.finalizado_em &&
    (!rotinaSelecionada?.tem_checklist || checklistConcluido)

  const execucaoPausada = !!execucao?.pausado_em && !execucao?.finalizado_em

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <section
      style={{
        borderRadius: 14,
        border: '1px solid #1f2933',
        padding: 16,
        background:
          'radial-gradient(circle at top left, rgba(34,197,94,0.12), #050608)',
      }}
    >
      <h2 style={{ marginTop: 0, color: '#22c55e' }}>
        Bloco 8 – Executar rotina (N2 – Regional)
      </h2>
      <p style={{ fontSize: 13, color: '#cbd5e1' }}>
        Selecione uma rotina do dia da sua regional, inicie a execução e preencha o checklist.
      </p>

      {/* Seletor de rotina */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 8,
          alignItems: 'end',
          marginTop: 8,
        }}
      >
        <div>
          <label style={styles.label}>Rotina do dia:</label>
          <select
            value={rotinaSelId}
            onChange={(e) => setRotinaSelId(e.target.value)}
            style={styles.input}
          >
            <option value="">
              {loadingRotinas
                ? 'Carregando...'
                : rotinas.length === 0
                ? 'Nenhuma rotina do dia'
                : 'Selecione'}
            </option>
            {rotinas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.titulo} • {r.periodicidade}
                {r.horario_inicio ? ` • ${r.horario_inicio}` : ''}
              </option>
            ))}
          </select>
          {errorRotinas && (
            <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>
              Erro: {errorRotinas}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={carregarRotinas}
          style={{
            ...styles.button,
            padding: '6px 10px',
            fontSize: 12,
            background: '#0f172a',
            border: '1px solid #334155',
            color: '#e2e8f0',
          }}
        >
          Recarregar
        </button>
      </div>

      {/* Detalhes da rotina */}
      {rotinaSelecionada && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: '1px solid #0b1220',
            background: 'rgba(2,6,23,0.8)',
            fontSize: 13,
            color: '#e5e7eb',
            display: 'grid',
            gap: 4,
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
            <strong>Periodicidade:</strong> {rotinaSelecionada.periodicidade}
            {rotinaSelecionada.dia_semana
              ? ` (${rotinaSelecionada.dia_semana})`
              : ''}
          </div>
          <div>
            <strong>Data/Hora:</strong>{' '}
            {rotinaSelecionada.data_inicio}{' '}
            {rotinaSelecionada.horario_inicio ?? ''}
          </div>
          <div>
            <strong>Duração:</strong>{' '}
            {rotinaSelecionada.duracao_minutos ?? '-'} min
          </div>
          <div>
            <strong>Checklist obrigatório:</strong>{' '}
            {rotinaSelecionada.tem_checklist ? 'Sim' : 'Não'}
          </div>
          <div>
            <strong>Status atual (template):</strong>{' '}
            {rotinaSelecionada.status ?? 'pendente'}
          </div>
        </div>
      )}

      {/* Observações */}
      {rotinaSelecionada && (
        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>Observações / ocorrências:</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            style={{ ...styles.input, minHeight: 70 }}
            placeholder="Ex.: faltou item X, equipe reduzida, problema no equipamento..."
          />
        </div>
      )}

      {/* Botões de execução */}
      {rotinaSelecionada && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {!execucao && (
            <button
              type="button"
              onClick={iniciarExecucao}
              style={{
                ...styles.button,
                background: 'linear-gradient(90deg, #22c55e, #a3e635)',
                color: '#000',
              }}
            >
              Iniciar execução
            </button>
          )}

          {execucao && !execucao.finalizado_em && (
            <>
              {!execucaoPausada && (
                <button
                  type="button"
                  onClick={pausarExecucao}
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
                  type="button"
                  onClick={retomarExecucao}
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
                type="button"
                onClick={finalizarExecucao}
                disabled={!podeFinalizar}
                style={{
                  ...styles.button,
                  background: podeFinalizar
                    ? 'linear-gradient(90deg, #00ff88, #ffaa00)'
                    : '#374151',
                  color: '#000',
                  opacity: podeFinalizar ? 1 : 0.7,
                }}
                title={
                  rotinaSelecionada.tem_checklist && !checklistConcluido
                    ? 'Finalize após concluir todo checklist'
                    : ''
                }
              >
                Finalizar execução
              </button>
            </>
          )}

          {execucao?.finalizado_em && (
            <div style={{ color: '#86efac', fontSize: 13, alignSelf: 'center' }}>
              Execução finalizada ✅
            </div>
          )}
        </div>
      )}

      {statusExec && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#fde68a' }}>
          {statusExec}
        </div>
      )}

      {/* Checklist */}
      {rotinaSelecionada && (
        <div style={{ marginTop: 14 }}>
          <h3 style={{ color: '#38bdf8', marginBottom: 6 }}>
            Checklist da rotina
          </h3>

          {loadingChecklist && (
            <p style={{ fontSize: 13, color: '#cbd5e1' }}>Carregando checklist...</p>
          )}
          {errorChecklist && (
            <p style={{ fontSize: 13, color: '#fca5a5' }}>
              Erro: {errorChecklist}
            </p>
          )}

          {!loadingChecklist && checklistTpl.length === 0 && (
            <p style={{ fontSize: 13, color: '#cbd5e1' }}>
              Essa rotina ainda não tem checklist cadastrado.
            </p>
          )}

          {checklistTpl.length > 0 && (
            <div
              style={{
                overflowX: 'auto',
                border: '1px solid #0b1220',
                borderRadius: 10,
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                  background: '#020617',
                }}
              >
                <thead>
                  <tr>
                    {['OK', 'Ordem', 'Descrição', 'Valor num.', 'Valor texto'].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: 'left',
                            padding: '8px 10px',
                            borderBottom: '1px solid #0b1220',
                            color: '#e2e8f0',
                            background: '#0b1220',
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {checklistTpl.map((tpl) => {
                    const resp = getResposta(tpl.id)
                    const tipo = (tpl.tipo_valor || '').toLowerCase()
                    const obrig = tpl.obrigatorio

                    return (
                      <tr key={tpl.id}>
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="checkbox"
                            checked={!!resp?.concluido}
                            onChange={(e) =>
                              onToggleConcluido(tpl.id, e.target.checked)
                            }
                            disabled={!execucao || !!execucao.finalizado_em}
                          />
                        </td>
                        <td style={{ padding: '6px 10px' }}>{tpl.ordem}</td>
                        <td style={{ padding: '6px 10px' }}>
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
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="number"
                            value={resp?.valor_numerico ?? ''}
                            onChange={(e) =>
                              onChangeValorNum(tpl.id, e.target.value)
                            }
                            onBlur={() => onBlurSalvar(tpl.id)}
                            disabled={!execucao || !!execucao.finalizado_em}
                            style={{
                              ...styles.input,
                              width: 120,
                              padding: '4px 6px',
                              fontSize: 12,
                            }}
                            placeholder={
                              tipo === 'numero' ? 'obrigatório se marcado' : 'opcional'
                            }
                          />
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="text"
                            value={resp?.valor_texto ?? ''}
                            onChange={(e) =>
                              onChangeValorTexto(tpl.id, e.target.value)
                            }
                            onBlur={() => onBlurSalvar(tpl.id)}
                            disabled={!execucao || !!execucao.finalizado_em}
                            style={{
                              ...styles.input,
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: 12,
                            }}
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
            </div>
          )}

          {checklistTpl.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
              {checklistConcluido
                ? 'Checklist completo ✅'
                : 'Conclua todos os itens para liberar a finalização.'}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
