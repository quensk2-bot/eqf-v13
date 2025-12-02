// src/components/N1CreateRotina.tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { styles } from '../styles'
import type { Usuario } from '../types'

type Props = {
  perfil: Usuario | null
}

type Urgencia = 'alta' | 'media' | 'baixa'
type Periodicidade = 'diaria' | 'semanal' | 'mensal'
type TipoRotina = 'normal' | 'avulsa'

type UsuarioOption = {
  id: string
  nome: string
  email: string
  nivel: string
  setor_id: number | null
  departamento_id: number | null
  regional_id: number | null
}

export function N1CreateRotina({ perfil }: Props) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [duracaoMinutos, setDuracaoMinutos] = useState('60')

  const [urgencia, setUrgencia] = useState<Urgencia>('alta')
  const [tipoRotina, setTipoRotina] = useState<TipoRotina>('normal')
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('diaria')

  const [diaSemana, setDiaSemana] =
    useState<'2' | '3' | '4' | '5' | '6' | '7' | ''>('2')

  const [dataInicio, setDataInicio] = useState('')
  const [horarioInicio, setHorarioInicio] = useState('08:00')

  const [temChecklist, setTemChecklist] = useState(false)
  const [temAnexo, setTemAnexo] = useState(false)

  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([])
  const [responsavelId, setResponsavelId] = useState<string>('')

  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [details, setDetails] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [avisoScope, setAvisoScope] = useState<string | null>(null)

  // --------------------------------------------------
  // CARREGAR RESPONSÁVEIS (N2 e N3)
  // --------------------------------------------------
  useEffect(() => {
    if (!perfil?.id) return
    void carregarUsuarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id, perfil?.setor_id, perfil?.departamento_id])

  const carregarUsuarios = async () => {
  if (!perfil) return
  setAvisoScope(null)

  try {
    const { data, error } = await supabase.rpc(
      'eqf_responsaveis_rotina_n1',
      { p_usuario_id: perfil.id }
    )

    if (error) {
      console.error('Erro ao buscar responsáveis (RPC):', error)
      setAvisoScope('Erro ao carregar responsáveis.')
      setUsuarios([])
      setResponsavelId('')
      return
    }

    const lista = (data || []) as UsuarioOption[]

    if (!lista.length) {
      setAvisoScope(
        'Nenhum usuário N2/N3 encontrado para o seu setor/departamento.'
      )
    }

    setUsuarios(lista)
    setResponsavelId(lista[0]?.id ?? '')
  } catch (e) {
    console.error('Erro inesperado ao carregar responsáveis:', e)
    setAvisoScope('Erro inesperado ao carregar responsáveis.')
    setUsuarios([])
    setResponsavelId('')
  }
}

  // --------------------------------------------------
  // SUBMIT
  // --------------------------------------------------
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!perfil) {
      setStatusMsg('❌ Perfil não carregado. Faça login novamente.')
      return
    }
    if (!responsavelId) {
      setStatusMsg('❌ Selecione um responsável (N2 ou N3).')
      return
    }

    setLoading(true)
    setStatusMsg('⏳ Validando conflito diária...')
    setDetails(null)

    try {
      const minutos = Number(duracaoMinutos) || 0

      const precisaChecarConflito =
        tipoRotina === 'normal' && periodicidade === 'diaria'

      if (precisaChecarConflito) {
        const { data: temConflito, error: errRpc } = await supabase.rpc(
          'check_conflito_diaria',
          {
            p_responsavel: responsavelId,
            p_horario: horarioInicio,
            p_duracao_min: minutos,
          }
        )

        if (errRpc) throw errRpc
        if (temConflito) {
          setStatusMsg(
            '❌ Já existe rotina diária nesse horário para esse usuário.'
          )
          setLoading(false)
          return
        }
      }

      setStatusMsg('⏳ Enviando rotina para o Supabase...')

      const { data, error } = await supabase.functions.invoke(
        'eqf-create-rotina-diaria',
        {
          body: {
            duracao_minutos: minutos,
            urgencia,
            tipo: tipoRotina,
            periodicidade,

            titulo,
            descricao,
            dia_semana: periodicidade === 'semanal' ? diaSemana : null,
            data_inicio: dataInicio || null,
            horario_inicio: horarioInicio || null,

            tem_checklist: temChecklist,
            tem_anexo: temAnexo,

            responsavel_id: responsavelId, // 🔥 sempre N2/N3
            criador_id: perfil.id, // N1 criador
            departamento_id: perfil.departamento_id ?? null,
            setor_id: perfil.setor_id ?? null,
            regional_id: perfil.regional_id ?? null,
          },
        }
      )

      if (error) {
        setStatusMsg(`❌ Erro ao criar rotina: ${error.message}`)
        setDetails(JSON.stringify(error, null, 2))
      } else {
        setStatusMsg('✅ Rotina criada com sucesso.')
        setDetails(JSON.stringify(data, null, 2))

        setTitulo('')
        setDescricao('')
        setDuracaoMinutos('60')
        setUrgencia('alta')
        setTipoRotina('normal')
        setPeriodicidade('diaria')
        setDiaSemana('2')
        setDataInicio('')
        setHorarioInicio('08:00')
        setTemChecklist(false)
        setTemAnexo(false)

        // mantém o mesmo responsável se ainda existir, senão volta ao primeiro da lista
        setResponsavelId((prev) => {
          if (prev && usuarios.some((u) => u.id === prev)) return prev
          return usuarios[0]?.id ?? ''
        })
      }
    } catch (err) {
      setStatusMsg(`❌ Erro inesperado: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------
  // DERIVADOS
  // --------------------------------------------------
  const duracao = Number(duracaoMinutos) || 0
  const [hora, minuto] = horarioInicio.split(':').map((x) => Number(x) || 0)

  const responsavelSelecionado = useMemo(
    () => usuarios.find((u) => u.id === responsavelId),
    [usuarios, responsavelId]
  )

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <section
      style={{
        borderRadius: 12,
        border: '1px solid #222',
        padding: 16,
        background:
          'radial-gradient(circle at top left, rgba(0,255,136,0.08), #050608)',
      }}
    >
      <h3 style={{ marginTop: 0, color: '#00ff88' }}>
        Bloco 6B — Criar rotina (N1)
      </h3>

      <p style={{ fontSize: 13, color: '#ccc' }}>
        Este bloco chama a função <strong>eqf-create-rotina-diaria</strong>.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={styles.label}>Título da rotina</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            style={styles.input}
            placeholder="Ex.: Conferir validade de perecíveis"
            required
          />
        </div>

        <div>
          <label style={styles.label}>Descrição / Observações</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            style={{ ...styles.input, minHeight: 80 }}
            placeholder="Detalhe aqui o objetivo da rotina..."
          />
        </div>

        {/* RESPONSÁVEL */}
        <div>
          <label style={styles.label}>Responsável pela rotina</label>
          <select
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
            style={styles.input}
            required
          >
            <option value="">— selecione —</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome} ({u.nivel})
              </option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            N1 deve escolher o responsável N2/N3 do setor/departamento.
          </div>
          {avisoScope && (
            <div
              style={{
                fontSize: 11,
                color: '#f97316',
                marginTop: 4,
              }}
            >
              {avisoScope}
            </div>
          )}
        </div>

        {/* PARAMS PRINCIPAIS */}
        <div
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'repeat(4,1fr)',
          }}
        >
          <div>
            <label style={styles.label}>Duração (minutos)</label>
            <input
              type="number"
              min={0}
              value={duracaoMinutos}
              onChange={(e) => setDuracaoMinutos(e.target.value)}
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Urgência</label>
            <select
              value={urgencia}
              onChange={(e) => setUrgencia(e.target.value as Urgencia)}
              style={styles.input}
            >
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Tipo de rotina</label>
            <select
              value={tipoRotina}
              onChange={(e) => setTipoRotina(e.target.value as TipoRotina)}
              style={styles.input}
            >
              <option value="normal">Normal</option>
              <option value="avulsa">Avulsa (1 dia)</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Periodicidade</label>
            <select
              value={periodicidade}
              onChange={(e) =>
                setPeriodicidade(e.target.value as Periodicidade)
              }
              style={styles.input}
              disabled={tipoRotina === 'avulsa'}
            >
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>
        </div>

        {tipoRotina === 'avulsa' && (
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            Rotina avulsa sempre vale para 1 dia (periodicidade diária).
          </div>
        )}

        {periodicidade === 'semanal' && tipoRotina === 'normal' && (
          <div>
            <label style={styles.label}>Dia da semana</label>
            <select
              value={diaSemana}
              onChange={(e) => setDiaSemana(e.target.value as any)}
              style={styles.input}
            >
              <option value="2">Segunda-feira</option>
              <option value="3">Terça-feira</option>
              <option value="4">Quarta-feira</option>
              <option value="5">Quinta-feira</option>
              <option value="6">Sexta-feira</option>
              <option value="7">Sábado</option>
            </select>
          </div>
        )}

        {/* DATA/HORA */}
        <div
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: '1fr 1fr',
          }}
        >
          <div>
            <label style={styles.label}>Data de início (opcional)</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Horário (agenda)</label>
            <input
              type="time"
              value={horarioInicio}
              onChange={(e) => setHorarioInicio(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        {/* CHECKLIST / ANEXO */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: '#e5e7eb',
            }}
          >
            <input
              type="checkbox"
              checked={temChecklist}
              onChange={(e) => setTemChecklist(e.target.checked)}
            />
            Terá checklist?
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: '#e5e7eb',
            }}
          >
            <input
              type="checkbox"
              checked={temAnexo}
              onChange={(e) => setTemAnexo(e.target.checked)}
            />
            Terá anexo obrigatório?
          </label>
        </div>

        {/* RESUMO */}
        <div
          style={{
            marginTop: 4,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #1f2933',
            background: '#020617',
            fontSize: 12,
            color: '#e5e7eb',
          }}
        >
          <strong>Resumo:</strong>
          <div>Título: {titulo || '(sem título)'}</div>
          <div>
            Responsável:{' '}
            {responsavelSelecionado
              ? `${responsavelSelecionado.nome} (${responsavelSelecionado.nivel})`
              : '(não selecionado)'}
          </div>
          <div>
            Urgência: {urgencia} • Tipo: {tipoRotina} • Periodicidade:{' '}
            {tipoRotina === 'avulsa' ? 'diaria' : periodicidade}
          </div>
          <div>
            Horário: {String(hora).padStart(2, '0')}:
            {String(minuto).padStart(2, '0')} • Duração: {duracao} min
          </div>
          <div>
            Checklist: {temChecklist ? 'Sim' : 'Não'} • Anexo:{' '}
            {temAnexo ? 'Sim' : 'Não'}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.button,
            marginTop: 8,
            background: loading
              ? '#14532d'
              : 'linear-gradient(90deg, #22c55e, #eab308)',
            color: '#000',
            fontSize: 15,
          }}
        >
          {loading ? 'Criando rotina...' : 'Criar rotina'}
        </button>
      </form>

      {statusMsg && (
        <p style={{ fontSize: 13, color: '#bbf7d0', marginTop: 10 }}>
          {statusMsg}
        </p>
      )}

      {details && (
        <>
          <h4
            style={{
              marginTop: 8,
              color: '#facc15',
              fontSize: 13,
            }}
          >
            Retorno da função
          </h4>
          <pre
            style={{
              background: '#000',
              color: '#4ade80',
              padding: 12,
              borderRadius: 8,
              maxHeight: 260,
              overflow: 'auto',
              fontSize: 11,
            }}
          >
            {details}
          </pre>
        </>
      )}
    </section>
  )
}
