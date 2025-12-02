import type React from 'react'
import { useEffect, useState, FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'

type HealthData = any

type Usuario = {
  id: string
  nome: string
  email: string
  nivel: 'ADM' | 'N0' | 'N1' | 'N2' | 'N3' | 'N99'
  departamento_id: number | null
  setor_id: number | null
  regional_id: number | null
}

// ---------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------
function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [loadingApp, setLoadingApp] = useState(true)

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session ?? null)

      if (session?.user?.id) {
        await carregarPerfil(session.user.id)
      }

      setLoadingApp(false)
    }

    run()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      if (sess?.user?.id) {
        carregarPerfil(sess.user.id)
      } else {
        setPerfil(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const carregarPerfil = async (userId: string) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!error && data) {
      setPerfil(data as Usuario)
    }
  }

  if (loadingApp) {
    return (
      <div style={styles.fullScreen}>
        <div style={styles.card}>
          <h1 style={styles.logoTitle}>Rotina Empresarial EQF V13</h1>
          <p style={{ color: '#ccc', marginTop: 16 }}>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  return (
    <MainShell
      session={session}
      perfil={perfil}
      onLogout={async () => {
        await supabase.auth.signOut()
        setSession(null)
        setPerfil(null)
      }}
    />
  )
}

// ---------------------------------------------------------
// TELA DE LOGIN (tema preto + laranja + verde neon + branco)
// ---------------------------------------------------------
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErrorMsg(error.message)
    }

    setLoading(false)
  }

  return (
    <div style={styles.fullScreen}>
      <div style={styles.loginGlow}></div>
      <div style={styles.card}>
        <h1 style={styles.logoTitle}>Rotina Empresarial EQF V13</h1>
        <p style={{ color: '#ccc', marginBottom: 24 }}>
          Gestão de rotina empresarial • EQF • V13
        </p>

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={styles.label}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div>
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {errorMsg && (
            <div
              style={{
                background: '#330000',
                borderLeft: '4px solid #ff4d4f',
                padding: '8px 10px',
                borderRadius: 6,
                color: '#ffcccc',
                fontSize: 12,
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              background: loading
                ? '#444'
                : 'linear-gradient(90deg, #00ff88, #ffaa00)',
              color: '#000',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ color: '#666', fontSize: 11, marginTop: 16 }}>
          Powered by Supabase • Node 22 portátil • Projeto EQF V13
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// SHELL PRINCIPAL DEPOIS DO LOGIN
// ---------------------------------------------------------
function MainShell({
  session,
  perfil,
  onLogout,
}: {
  session: Session
  perfil: Usuario | null
  onLogout: () => void
}) {
  const nivel = perfil?.nivel ?? 'N3'
  const nome = perfil?.nome ?? session.user.email ?? 'Usuário'

  const renderDashboard = () => {
    if (!perfil) {
      return <DashboardNivel3 perfil={null} />
    }

    switch (perfil.nivel) {
      case 'ADM':
        return <AdmPanel />
      case 'N0':
        return <DashboardNivel0 perfil={perfil} />
      case 'N1':
        return <DashboardNivel1 perfil={perfil} />
      case 'N2':
        return <DashboardNivel2 perfil={perfil} />
      case 'N99':
        return <DashboardNivel99 perfil={perfil} />
      case 'N3':
      default:
        return <DashboardNivel3 perfil={perfil} />
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050608',
        color: '#f5f5f5',
      }}
    >
      {/* Barra superior */}
      <header
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background:
            'linear-gradient(90deg, #000000, #111111, #1b1b1b, #000000)',
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 20,
              color: '#ffffff',
            }}
          >
            EQF V13
            <span style={{ color: '#00ff88' }}> • Rotina Empresarial</span>
          </div>
          <div style={{ fontSize: 12, color: '#aaa' }}>
            Logado como{' '}
            <span style={{ color: '#ffffff', fontWeight: 600 }}>{nome}</span> •
            nível{' '}
            <span style={{ color: '#ffaa00', fontWeight: 600 }}>{nivel}</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            ...styles.button,
            padding: '6px 12px',
            background: '#111',
            border: '1px solid #ff5555',
            color: '#ffcccc',
            fontSize: 12,
          }}
        >
          Sair
        </button>
      </header>

      {/* Conteúdo principal */}
      <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        {renderDashboard()}
      </main>
    </div>
  )
}

// ---------------------------------------------------------
// PAINEL ADM: HEALTH-CHECK + CADASTRO DE USUÁRIO + CRIAR ROTINA DIÁRIA
// ---------------------------------------------------------
function AdmPanel() {
  // --------- ESTADO HEALTH-CHECK ----------
  const [healthStatus, setHealthStatus] = useState(
    'Testando conexão com Supabase + Edge Function...'
  )
  const [healthDetails, setHealthDetails] = useState<string | null>(null)

  // --------- ESTADO FORM DE USUÁRIO ----------
  const [adminKey, setAdminKey] = useState('dev-admin-key-123')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nivel, setNivel] = useState<'ADM' | 'N0' | 'N1' | 'N2' | 'N3' | 'N99'>(
    'N3'
  )
  const [departamentoId, setDepartamentoId] = useState<string>('')
  const [setorId, setSetorId] = useState<string>('')
  const [regionalId, setRegionalId] = useState<string>('')

  const [provisionStatus, setProvisionStatus] = useState<string | null>(null)
  const [provisionDetails, setProvisionDetails] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --------- ESTADO BLOCO 6 – CRIAR ROTINA DIÁRIA ----------
  const [rotinaDuracao, setRotinaDuracao] = useState('60')
  const [rotinaPrioridade, setRotinaPrioridade] =
    useState<'BAIXA' | 'MEDIA' | 'ALTA'>('ALTA')
  const [rotinaTipo, setRotinaTipo] = useState<'normal' | 'operacional'>(
    'normal'
  )
  const [rotinaPeriodicidade, setRotinaPeriodicidade] = useState<
    'diaria' | 'semanal'
  >('diaria')
  const [rotinaStatusMsg, setRotinaStatusMsg] = useState<string | null>(null)
  const [rotinaDetails, setRotinaDetails] = useState<string | null>(null)
  const [rotinaLoading, setRotinaLoading] = useState(false)

  // --------- HEALTH CHECK NA MONTAGEM ----------
  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase.functions.invoke<HealthData>(
          'eqf-health-check',
          {
            body: { name: 'EQF V13' },
          }
        )

        if (error) {
          const anyError = error as any
          setHealthStatus('❌ Erro ao chamar eqf-health-check (invoke)')
          setHealthDetails(
            JSON.stringify(
              {
                name: anyError?.name,
                message: anyError?.message,
                context: anyError?.context,
              },
              null,
              2
            )
          )
          return
        }

        if (data?.ok) {
          setHealthStatus(
            '✅ Conexão OK: Front → Edge Function → Supabase (invoke)'
          )
        } else {
          setHealthStatus('⚠️ Função respondeu, mas indicou problema')
        }
        setHealthDetails(JSON.stringify(data, null, 2))
      } catch (e) {
        setHealthStatus('❌ Erro inesperado ao chamar a função (invoke)')
        setHealthDetails(String(e))
      }
    }

    run()
  }, [])

  // --------- HANDLER CADASTRO USUÁRIO ----------
  const handleProvision = async (e: FormEvent) => {
    e.preventDefault()
    setProvisionStatus('⏳ Enviando dados para eqf-provision-user...')
    setProvisionDetails(null)
    setIsSubmitting(true)

    try {
      const { data, error } = await supabase.functions.invoke(
        'eqf-provision-user',
        {
          body: {
            admin_key: adminKey,
            email,
            password: senha,
            nome,
            nivel,
            departamento_id: departamentoId ? Number(departamentoId) : null,
            setor_id: setorId ? Number(setorId) : null,
            regional_id: regionalId ? Number(regionalId) : null,
          },
        }
      )

      if (error) {
        const anyError = error as any
        let extra: any = {}

        if (anyError?.context?.response) {
          try {
            const res: Response = anyError.context.response
            const text = await res.text()
            extra = {
              httpStatus: res.status,
              httpStatusText: res.statusText,
              httpBody: text,
            }
          } catch (e) {
            extra = { errorReadingBody: String(e) }
          }
        }

        setProvisionStatus('❌ Erro ao chamar eqf-provision-user')
        setProvisionDetails(
          JSON.stringify(
            {
              name: anyError?.name,
              message: anyError?.message,
              context: anyError?.context,
              ...extra,
            },
            null,
            2
          )
        )
      } else {
        setProvisionStatus(
          '✅ Usuário criado com sucesso (veja detalhes abaixo).'
        )
        setProvisionDetails(JSON.stringify(data, null, 2))

        setNome('')
        setEmail('')
        setSenha('')
      }
    } catch (e) {
      setProvisionStatus('❌ Erro inesperado ao chamar eqf-provision-user')
      setProvisionDetails(String(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  // --------- HANDLER BLOCO 6 – CRIAR ROTINA DIÁRIA ----------
  const handleCreateRotinaDiaria = async (e: FormEvent) => {
    e.preventDefault()
    setRotinaLoading(true)
    setRotinaStatusMsg('⏳ Enviando dados para eqf-create-rotina-diaria...')
    setRotinaDetails(null)

    try {
      const { data, error } = await supabase.functions.invoke(
        'eqf-create-rotina-diaria',
        {
          body: {
            duracao_minutos: Number(rotinaDuracao) || 0,
            prioridade: rotinaPrioridade,
            tipo: rotinaTipo,
            periodicidade: rotinaPeriodicidade,
          },
        }
      )

      if (error) {
        const anyError = error as any
        setRotinaStatusMsg('❌ Erro ao chamar eqf-create-rotina-diaria')
        setRotinaDetails(
          JSON.stringify(
            {
              name: anyError?.name,
              message: anyError?.message,
              context: anyError?.context,
            },
            null,
            2
          )
        )
      } else {
        setRotinaStatusMsg('✅ Rotina DIÁRIA criada com sucesso.')
        setRotinaDetails(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      setRotinaStatusMsg('❌ Erro inesperado ao chamar eqf-create-rotina-diaria')
      setRotinaDetails(String(err))
    } finally {
      setRotinaLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* BLOCO HEALTH CHECK */}
      <section
        style={{
          borderRadius: 12,
          border: '1px solid #222',
          padding: 16,
          background: '#050608',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#00ff88' }}>
          Status da verificação
        </h2>
        <p>{healthStatus}</p>

        {healthDetails && (
          <>
            <h3 style={{ marginTop: 16, color: '#ffaa00' }}>
              Detalhes (eqf-health-check)
            </h3>
            <pre
              style={{
                background: '#000',
                color: '#0f0',
                padding: 16,
                borderRadius: 8,
                maxHeight: 260,
                overflow: 'auto',
                fontSize: 12,
              }}
            >
              {healthDetails}
            </pre>
          </>
        )}
      </section>

      {/* BLOCO CADASTRO USUÁRIO */}
      <section
        style={{
          borderRadius: 12,
          border: '1px solid #333',
          padding: 16,
          background:
            'radial-gradient(circle at top right, rgba(255,170,0,0.08), #050608)',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#00ff88' }}>
          Cadastro de Usuário (ADM-CADASTRO)
        </h2>
        <p style={{ fontSize: 13, color: '#ccc' }}>
          Esta tela usa a função <strong>eqf-provision-user</strong> para criar
          usuário em <code>auth.users</code> e em <code>public.usuarios</code>.
        </p>

        <form
          onSubmit={handleProvision}
          style={{
            display: 'grid',
            gap: 12,
            padding: 16,
            borderRadius: 8,
            border: '1px solid #222',
            marginTop: 12,
            marginBottom: 16,
            backgroundColor: '#050608',
          }}
        >
          <div>
            <label style={styles.label}>
              Admin key (desenvolvimento):{' '}
              <input
                type="text"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                style={styles.input}
              />
            </label>
            <small style={{ color: '#777' }}>Padrão: dev-admin-key-123</small>
          </div>

          <div>
            <label style={styles.label}>Nome completo:</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div>
            <label style={styles.label}>E-mail:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div>
            <label style={styles.label}>Senha inicial:</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div>
            <label style={styles.label}>Nível:</label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value as any)}
              style={styles.input}
            >
              <option value="ADM">ADM (cadastro)</option>
              <option value="N0">Nível 00 (diretor)</option>
              <option value="N1">Nível 1 (gerente nacional setor)</option>
              <option value="N2">Nível 2 (responsável regional)</option>
              <option value="N3">Nível 3 (colaborador)</option>
              <option value="N99">Nível 99 (super admin operacional)</option>
            </select>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}
          >
            <div>
              <label style={styles.label}>Departamento ID:</label>
              <input
                type="number"
                value={departamentoId}
                onChange={(e) => setDepartamentoId(e.target.value)}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Setor ID:</label>
              <input
                type="number"
                value={setorId}
                onChange={(e) => setSetorId(e.target.value)}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Regional ID:</label>
              <input
                type="number"
                value={regionalId}
                onChange={(e) => setRegionalId(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.button,
              background: isSubmitting ? '#555' : '#00ff88',
              color: '#000',
            }}
          >
            {isSubmitting ? 'Enviando...' : 'Criar usuário'}
          </button>
        </form>

        {provisionStatus && <p>{provisionStatus}</p>}

        {provisionDetails && (
          <>
            <h3 style={{ color: '#ffaa00' }}>Detalhes (eqf-provision-user)</h3>
            <pre
              style={{
                background: '#000',
                color: '#0f0',
                padding: 16,
                borderRadius: 8,
                maxHeight: 260,
                overflow: 'auto',
                fontSize: 12,
              }}
            >
              {provisionDetails}
            </pre>
          </>
        )}
      </section>

      {/* BLOCO 6 – TESTE CRIAR ROTINA DIÁRIA */}
      <section
        style={{
          borderRadius: 12,
          border: '1px solid #333',
          padding: 16,
          background:
            'radial-gradient(circle at top left, rgba(0,255,136,0.08), #050608)',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#00ff88' }}>
          Bloco 6 – Criar rotina DIÁRIA (teste)
        </h2>
        <p style={{ fontSize: 13, color: '#ccc' }}>
          Este bloco chama a função <strong>eqf-create-rotina-diaria</strong>{' '}
          para criar uma rotina diária simples no banco, usando o usuário
          logado como criador/responsável.
        </p>

        <form
          onSubmit={handleCreateRotinaDiaria}
          style={{
            display: 'grid',
            gap: 12,
            padding: 16,
            borderRadius: 8,
            border: '1px solid #222',
            marginTop: 12,
            marginBottom: 16,
            backgroundColor: '#050608',
          }}
        >
          <div>
            <label style={styles.label}>Duração (minutos):</label>
            <input
              type="number"
              value={rotinaDuracao}
              onChange={(e) => setRotinaDuracao(e.target.value)}
              style={styles.input}
              min={5}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            <div>
              <label style={styles.label}>Prioridade:</label>
              <select
                value={rotinaPrioridade}
                onChange={(e) =>
                  setRotinaPrioridade(e.target.value as 'BAIXA' | 'MEDIA' | 'ALTA')
                }
                style={styles.input}
              >
                <option value="BAIXA">BAIXA</option>
                <option value="MEDIA">MÉDIA</option>
                <option value="ALTA">ALTA</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Tipo de rotina:</label>
              <select
                value={rotinaTipo}
                onChange={(e) =>
                  setRotinaTipo(e.target.value as 'normal' | 'operacional')
                }
                style={styles.input}
              >
                <option value="normal">normal</option>
                <option value="operacional">operacional</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Periodicidade:</label>
              <select
                value={rotinaPeriodicidade}
                onChange={(e) =>
                  setRotinaPeriodicidade(e.target.value as 'diaria' | 'semanal')
                }
                style={styles.input}
              >
                <option value="diaria">diária</option>
                <option value="semanal">semanal (teste)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={rotinaLoading}
            style={{
              ...styles.button,
              background: rotinaLoading
                ? '#555'
                : 'linear-gradient(90deg, #00ff88, #ffaa00)',
              color: '#000',
            }}
          >
            {rotinaLoading ? 'Criando...' : 'Criar rotina diária'}
          </button>
        </form>

        {rotinaStatusMsg && <p>{rotinaStatusMsg}</p>}

        {rotinaDetails && (
          <>
            <h3 style={{ color: '#ffaa00' }}>
              Detalhes (eqf-create-rotina-diaria)
            </h3>
            <pre
              style={{
                background: '#000',
                color: '#0f0',
                padding: 16,
                borderRadius: 8,
                maxHeight: 260,
                overflow: 'auto',
                fontSize: 12,
              }}
            >
              {rotinaDetails}
            </pre>
          </>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------
// DASHBOARDS POR NÍVEL (N0 / N1 / N2 / N3 / N99)
// ---------------------------------------------------------
function DashboardNivel0({ perfil }: { perfil: Usuario | null }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section
        style={{
          borderRadius: 12,
          border: '1px solid #222',
          padding: 16,
          background:
            'radial-gradient(circle at top left, rgba(0,255,136,0.1), #050608)',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#00ff88' }}>
          Visão da Diretoria (Nível 00)
        </h2>
        <p style={{ color: '#ccc', fontSize: 14 }}>
          Aqui será a visão macro de todas as rotinas da empresa: consolidados
          por departamento, setor e regional. Ideal para o diretor enxergar se
          a operação está dentro da rotina ou não.
        </p>
        {perfil && <InfoPerfil perfil={perfil} />}
      </section>
    </div>
  )
}

function DashboardNivel1({ perfil }: { perfil: Usuario | null }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section
        style={{
          borderRadius: 12,
          border: '1px solid #222',
          padding: 16,
          background:
            'radial-gradient(circle at top left, rgba(0,255,136,0.1), #050608)',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#00ff88' }}>
          Painel do Gerente Nacional (Nível 1)
        </h2>
        <p style={{ color: '#ccc', fontSize: 14 }}>
          Este painel será usado para o Nível 1 acompanhar todas as regionais
          do seu setor, criar rotinas para Nível 2 e Nível 3, e ver KPIs como:
          quantidade de rotinas por regional, tempo planejado x executado e
          rotinas avulsas do dia.
        </p>
        {perfil && <InfoPerfil perfil={perfil} />}
      </section>
    </div>
  )
}

function DashboardNivel2({ perfil }: { perfil: Usuario | null }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section
        style={{
          borderRadius: 12,
          border: '1px solid #222',
          padding: 16,
          background:
            'radial-gradient(circle at top left, rgba(0,255,136,0.1), #050608)',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#00ff88' }}>
          Painel do Responsável Regional (Nível 2)
        </h2>
        <p style={{ color: '#ccc', fontSize: 14 }}>
          Aqui o Nível 2 vai enxergar apenas a sua regional: agenda das rotinas
          do time, status (pendente, em execução, finalizada) e desempenho dos
          colaboradores. Também será o lugar para cadastrar rotinas para Nível
          3 da mesma regional.
        </p>
        {perfil && <InfoPerfil perfil={perfil} />}
      </section>
    </div>
  )
}

function DashboardNivel3({ perfil }: { perfil: Usuario | null }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section
        style={{
          borderRadius: 12,
          border: '1px solid #222',
          padding: 16,
          background:
            'radial-gradient(circle at top left, rgba(0,255,136,0.1), #050608)',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#00ff88' }}>
          Painel do Colaborador (Nível 3)
        </h2>
        <p style={{ color: '#ccc', fontSize: 14 }}>
          Este painel será focado na rotina do dia a dia do colaborador:
          calendário de tarefas por horário, botão para iniciar / pausar /
          finalizar rotina, checklist e anexos. Tudo que você descreveu da
          execução entra aqui.
        </p>
        {perfil && <InfoPerfil perfil={perfil} />}
      </section>
    </div>
  )
}

function DashboardNivel99({ perfil }: { perfil: Usuario | null }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section
        style={{
          borderRadius: 12,
          border: '1px solid #222',
          padding: 16,
          background:
            'radial-gradient(circle at top left, rgba(0,255,136,0.1), #050608)',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#00ff88' }}>
          Painel Super Admin Operacional (Nível 99)
        </h2>
        <p style={{ color: '#ccc', fontSize: 14 }}>
          O Nível 99 terá visão técnica e operacional do sistema: estrutura de
          departamentos / setores / regionais, manutenção de cadastros,
          parametrizações e visão geral de saúde das rotinas.
        </p>
        {perfil && <InfoPerfil perfil={perfil} />}
      </section>
    </div>
  )
}

// Card reutilizável com dados básicos do usuário
function InfoPerfil({ perfil }: { perfil: Usuario }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
        border: '1px solid #333',
        background:
          'linear-gradient(135deg, rgba(255,170,0,0.08), rgba(0,0,0,0.9))',
        fontSize: 13,
        color: '#ddd',
      }}
    >
      <div>
        <strong>Nome:</strong> {perfil.nome}
      </div>
      <div>
        <strong>E-mail:</strong> {perfil.email}
      </div>
      <div>
        <strong>Nível:</strong> {perfil.nivel}
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// ESTILOS COMPARTILHADOS (tema preto + laranja + neon verde + branco)
// ---------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  fullScreen: {
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    background:
      'radial-gradient(circle at top, #111111 0, #000000 45%, #020407 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f5f5f5',
    position: 'relative',
    overflow: 'hidden',
  },
  loginGlow: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,255,136,0.25), transparent 60%)',
    top: -80,
    right: -60,
    filter: 'blur(2px)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(5, 5, 5, 0.96)',
    borderRadius: 18,
    padding: '28px 26px',
    maxWidth: 420,
    width: '90%',
    border: '1px solid rgba(0,255,136,0.35)',
    boxShadow:
      '0 0 25px rgba(0,0,0,0.8), 0 0 40px rgba(0,255,136,0.15), 0 0 30px rgba(255,170,0,0.15)',
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: 1,
    margin: 0,
    color: '#ffffff',
    textShadow:
      '0 0 4px rgba(255,255,255,0.5), 0 0 10px rgba(0,255,136,0.4), 0 0 18px rgba(255,170,0,0.35)',
  },
  label: {
    display: 'block',
    fontSize: 12,
    marginBottom: 4,
    color: '#cccccc',
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #333',
    background: '#050608',
    color: '#f5f5f5',
    fontSize: 13,
  },
  button: {
    border: 'none',
    borderRadius: 999,
    padding: '8px 10px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
}

export default App
