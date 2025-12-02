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
        return <AdmPanel perfil={perfil} />
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
// PAINEL ADM COM ABAS
// ---------------------------------------------------------
function AdmPanel({ perfil }: { perfil: Usuario | null }) {
  // --------- MENU DE ABAS DO ADM ----------
  const [admTab, setAdmTab] = useState<
    'status' | 'usuarios' | 'rotinas' | 'cadastros'
  >('status')

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

  // --------- ESTADO BLOCO 6 – CRIAR ROTINA (DIÁRIA/SEMANAL/MENSAL) ----------
  const [duracaoMinutos, setDuracaoMinutos] = useState<number>(60)
  const [prioridade, setPrioridade] =
    useState<'ALTA' | 'MEDIA' | 'BAIXA'>('ALTA')
  const [tipoRotina, setTipoRotina] =
    useState<'normal' | 'operacional'>('normal')
  const [periodicidade, setPeriodicidade] = useState<
    'diaria' | 'semanal' | 'mensal'
  >('diaria')

  const [createStatus, setCreateStatus] = useState<string | null>(null)
  const [createDetails, setCreateDetails] = useState<string | null>(null)
  const [isCreatingRotina, setIsCreatingRotina] = useState(false)

  // --------- ESTADO BLOCO 6C – MINHAS ROTINAS ----------
  const [emailMinhasRotinas, setEmailMinhasRotinas] = useState(
    perfil?.email ?? ''
  )

  // sempre que o perfil carregar/alterar, atualiza o e-mail usado no bloco 6C
  useEffect(() => {
    if (perfil?.email) {
      setEmailMinhasRotinas(perfil.email)
    }
  }, [perfil?.email])

  const [minhasRotinas, setMinhasRotinas] = useState<any[] | null>(null)
  const [listStatus, setListStatus] = useState<string | null>(null)
  const [listErrorDetails, setListErrorDetails] = useState<string | null>(null)
  const [isLoadingMinhas, setIsLoadingMinhas] = useState(false)

  // --------- ESTADO CADASTROS BASE ----------
  const [depNome, setDepNome] = useState('')
  const [depStatus, setDepStatus] = useState<string | null>(null)

  const [setorNome, setSetorNome] = useState('')
  const [setorDepId, setSetorDepId] = useState('')
  const [setorStatusMsg, setSetorStatusMsg] = useState<string | null>(null)

  const [regionalNome, setRegionalNome] = useState('')
  const [regionalStatusMsg, setRegionalStatusMsg] = useState<string | null>(null)

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

  // --------- HANDLER BLOCO 6 – CRIAR ROTINA ----------
  const handleCreateRotina = async (e: FormEvent) => {
    e.preventDefault()
    setIsCreatingRotina(true)
    setCreateStatus('⏳ Chamando eqf-create-rotina-diaria...')
    setCreateDetails(null)

    try {
      const { data, error } = await supabase.functions.invoke(
        'eqf-create-rotina-diaria',
        {
          body: {
            duracao_minutos: duracaoMinutos,
            prioridade,
            tipo: tipoRotina,
            periodicidade, // "diaria", "semanal" ou "mensal"
          },
        }
      )

      if (error) {
        const anyError = error as any
        setCreateStatus('❌ Erro ao chamar eqf-create-rotina-diaria')
        setCreateDetails(
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

      const labelPeriodicidade =
        periodicidade === 'diaria'
          ? 'DIÁRIA'
          : periodicidade === 'semanal'
          ? 'SEMANAL'
          : 'MENSAL'

      setCreateStatus(`✅ Rotina ${labelPeriodicidade} criada com sucesso.`)
      setCreateDetails(JSON.stringify(data, null, 2))
    } catch (e) {
      setCreateStatus('❌ Erro inesperado ao criar rotina')
      setCreateDetails(String(e))
    } finally {
      setIsCreatingRotina(false)
    }
  }

  // --------- HANDLER BLOCO 6C – LISTAR “MINHAS ROTINAS” ----------
  const handleListMinhasRotinas = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoadingMinhas(true)
    setListStatus('⏳ Buscando rotinas do usuário...')
    setListErrorDetails(null)
    setMinhasRotinas(null)

    try {
      const { data, error } = await supabase.functions.invoke(
        'eqf-list-minhas-rotinas',
        {
          body: {
            email: emailMinhasRotinas,
            limit: 20,
          },
        }
      )

      if (error) {
        const anyError = error as any
        setListStatus('❌ Erro ao chamar eqf-list-minhas-rotinas')
        setListErrorDetails(
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

      setListStatus('✅ Rotinas carregadas com sucesso.')
      setMinhasRotinas((data as any)?.rotinas ?? [])
      setListErrorDetails(JSON.stringify(data, null, 2))
    } catch (e) {
      setListStatus('❌ Erro inesperado ao listar rotinas')
      setListErrorDetails(String(e))
    } finally {
      setIsLoadingMinhas(false)
    }
  }

  // --------- HANDLERS CADASTROS BASE ----------
  const handleCreateDepartamento = async (e: FormEvent) => {
    e.preventDefault()
    setDepStatus('⏳ Gravando departamento...')
    try {
      const { error } = await supabase.from('departamentos').insert({
        nome: depNome,
      })
      if (error) {
        setDepStatus(`❌ Erro: ${error.message}`)
      } else {
        setDepStatus('✅ Departamento criado com sucesso.')
        setDepNome('')
      }
    } catch (err) {
      setDepStatus(`❌ Erro inesperado: ${String(err)}`)
    }
  }

  const handleCreateSetor = async (e: FormEvent) => {
    e.preventDefault()
    setSetorStatusMsg('⏳ Gravando setor...')
    try {
      const { error } = await supabase.from('setores').insert({
        nome: setorNome,
        departamento_id: setorDepId ? Number(setorDepId) : null,
      })
      if (error) {
        setSetorStatusMsg(`❌ Erro: ${error.message}`)
      } else {
        setSetorStatusMsg('✅ Setor criado com sucesso.')
        setSetorNome('')
        setSetorDepId('')
      }
    } catch (err) {
      setSetorStatusMsg(`❌ Erro inesperado: ${String(err)}`)
    }
  }

  const handleCreateRegional = async (e: FormEvent) => {
    e.preventDefault()
    setRegionalStatusMsg('⏳ Gravando regional...')
    try {
      const { error } = await supabase.from('regionais').insert({
        nome: regionalNome,
      })
      if (error) {
        setRegionalStatusMsg(`❌ Erro: ${error.message}`)
      } else {
        setRegionalStatusMsg('✅ Regional criada com sucesso.')
        setRegionalNome('')
      }
    } catch (err) {
      setRegionalStatusMsg(`❌ Erro inesperado: ${String(err)}`)
    }
  }

  // ---------- RENDER ----------
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* MENU DE ABAS DO ADM */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 8,
          borderBottom: '1px solid #1f2933',
          paddingBottom: 8,
        }}
      >
        {[
          { id: 'status', label: 'Status / Health' },
          { id: 'usuarios', label: 'Usuários' },
          { id: 'rotinas', label: 'Rotinas (B6 / 6C)' },
          { id: 'cadastros', label: 'Cadastros base' },
        ].map((tab) => {
          const active = admTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() =>
                setAdmTab(tab.id as 'status' | 'usuarios' | 'rotinas' | 'cadastros')
              }
              style={{
                ...styles.button,
                padding: '6px 12px',
                fontSize: 12,
                borderRadius: 999,
                border: active ? '1px solid #22c55e' : '1px solid #374151',
                background: active ? '#022c22' : '#020617',
                color: active ? '#bbf7d0' : '#e5e7eb',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ABA: STATUS / HEALTH */}
      {admTab === 'status' && (
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
      )}

      {/* ABA: USUÁRIOS */}
      {admTab === 'usuarios' && (
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
            Esta tela usa a função <strong>eqf-provision-user</strong> para
            criar usuário em <code>auth.users</code> e em{' '}
            <code>public.usuarios</code>.
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
      )}

      {/* ABA: ROTINAS (B6 + 6C) */}
      {admTab === 'rotinas' && (
        <>
          {/* BLOCO 6 */}
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
              Bloco 6 – Criar rotina (teste)
            </h2>
            <p style={{ fontSize: 13, color: '#ccc' }}>
              Este bloco chama a função <code>eqf-create-rotina-diaria</code>{' '}
              para criar uma rotina simples no banco usando o usuário logado
              como responsável. Teste{' '}
              <strong>rotina DIÁRIA, SEMANAL ou MENSAL</strong> abaixo.
            </p>

            <form
              onSubmit={handleCreateRotina}
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
                  min={5}
                  value={duracaoMinutos}
                  onChange={(e) =>
                    setDuracaoMinutos(Number(e.target.value || 0))
                  }
                  style={styles.input}
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
                    value={prioridade}
                    onChange={(e) =>
                      setPrioridade(
                        e.target.value as 'BAIXA' | 'MEDIA' | 'ALTA'
                      )
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
                    value={tipoRotina}
                    onChange={(e) =>
                      setTipoRotina(
                        e.target.value as 'normal' | 'operacional'
                      )
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
                    value={periodicidade}
                    onChange={(e) =>
                      setPeriodicidade(
                        e.target.value as 'diaria' | 'semanal' | 'mensal'
                      )
                    }
                    style={styles.input}
                  >
                    <option value="diaria">diária</option>
                    <option value="semanal">semanal</option>
                    <option value="mensal">mensal</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingRotina}
                style={{
                  ...styles.button,
                  background: isCreatingRotina
                    ? '#555'
                    : 'linear-gradient(90deg, #00ff88, #ffaa00)',
                  color: '#000',
                }}
              >
                {isCreatingRotina ? 'Criando...' : 'Criar rotina'}
              </button>
            </form>

            {createStatus && <p>{createStatus}</p>}

            {createDetails && (
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
                  {createDetails}
                </pre>
              </>
            )}
          </section>

          {/* BLOCO 6C */}
          <section
            style={{
              borderRadius: 12,
              border: '1px solid #333',
              padding: 16,
              background:
                'radial-gradient(circle at top left, rgba(248,113,113,0.15), #050608)',
            }}
          >
            <h2 style={{ marginTop: 0, color: '#f97316' }}>
              Bloco 6C – Minhas rotinas (teste)
            </h2>
            <p style={{ fontSize: 13, color: '#ccc' }}>
              Este bloco usa a função <code>eqf-list-minhas-rotinas</code> para
              buscar as rotinas em que o usuário é o{' '}
              <strong>responsável</strong>.
            </p>

            <form
              onSubmit={handleListMinhasRotinas}
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
                <label style={styles.label}>E-mail do usuário:</label>
                <input
                  type="email"
                  value={emailMinhasRotinas}
                  onChange={(e) => setEmailMinhasRotinas(e.target.value)}
                  style={styles.input}
                  required
                  disabled={!!perfil?.email}
                />
                <small style={{ color: '#777' }}>
                  Usa o e-mail do usuário logado (public.usuarios).
                </small>
              </div>

              <button
                type="submit"
                disabled={isLoadingMinhas}
                style={{
                  ...styles.button,
                  background: isLoadingMinhas
                    ? '#555'
                    : 'linear-gradient(90deg, #00ff88, #ffaa00)',
                  color: '#000',
                }}
              >
                {isLoadingMinhas ? 'Carregando...' : 'Buscar rotinas'}
              </button>
            </form>

            {listStatus && <p>{listStatus}</p>}

            {minhasRotinas && minhasRotinas.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 8, color: '#22c55e' }}>
                  Rotinas encontradas
                </h3>
                <div style={{ overflowX: 'auto' }}>
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
                          'Data',
                          'Início',
                          'Título',
                          'Tipo',
                          'Periodicidade',
                          'Duração (min)',
                          'Urgência',
                          'Status',
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              borderBottom: '1px solid #374151',
                              background: '#020617',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {minhasRotinas.map((r: any) => (
                        <tr key={r.id}>
                          <td
                            style={{
                              padding: '4px 8px',
                              borderBottom: '1px solid #111827',
                            }}
                          >
                            {r.data_inicio}
                          </td>
                          <td
                            style={{
                              padding: '4px 8px',
                              borderBottom: '1px solid #111827',
                            }}
                          >
                            {r.horario_inicio}
                          </td>
                          <td
                            style={{
                              padding: '4px 8px',
                              borderBottom: '1px solid #111827',
                            }}
                          >
                            {r.titulo}
                          </td>
                          <td
                            style={{
                              padding: '4px 8px',
                              borderBottom: '1px solid #111827',
                            }}
                          >
                            {r.tipo}
                          </td>
                          <td
                            style={{
                              padding: '4px 8px',
                              borderBottom: '1px solid #111827',
                            }}
                          >
                            {r.periodicidade}
                          </td>
                          <td
                            style={{
                              padding: '4px 8px',
                              borderBottom: '1px solid #111827',
                            }}
                          >
                            {r.duracao_minutos}
                          </td>
                          <td
                            style={{
                              padding: '4px 8px',
                              borderBottom: '1px solid #111827',
                            }}
                          >
                            {r.urgencia}
                          </td>
                          <td
                            style={{
                              padding: '4px 8px',
                              borderBottom: '1px solid #111827',
                            }}
                          >
                            {r.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {listErrorDetails && (
              <>
                <h3 style={{ marginTop: 16, color: '#ffaa00' }}>
                  Detalhes (eqf-list-minhas-rotinas)
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
                  {listErrorDetails}
                </pre>
              </>
            )}
          </section>
        </>
      )}

      {/* ABA: CADASTROS BASE */}
      {admTab === 'cadastros' && (
        <section
          style={{
            borderRadius: 12,
            border: '1px solid #333',
            padding: 16,
            background:
              'radial-gradient(circle at top right, rgba(56,189,248,0.15), #050608)',
          }}
        >
          <h2 style={{ marginTop: 0, color: '#38bdf8' }}>
            Cadastros base – Estrutura EQF
          </h2>
          <p style={{ fontSize: 13, color: '#ccc' }}>
            Cadastre a base da hierarquia:{' '}
            <strong>departamento → setor → regional</strong>. Esses cadastros
            serão usados depois para vincular rotinas por área.
          </p>

          {/* Departamento */}
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 10,
              border: '1px solid #1f2933',
              background:
                'linear-gradient(135deg, rgba(8,47,73,0.6), rgba(15,23,42,0.95))',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#e0f2fe' }}>Departamento</h3>
            <form
              onSubmit={handleCreateDepartamento}
              style={{ display: 'grid', gap: 8, maxWidth: 420 }}
            >
              <div>
                <label style={styles.label}>Nome do departamento:</label>
                <input
                  type="text"
                  value={depNome}
                  onChange={(e) => setDepNome(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <button
                type="submit"
                style={{
                  ...styles.button,
                  background: 'linear-gradient(90deg, #38bdf8, #22c55e)',
                  color: '#000',
                }}
              >
                Gravar departamento
              </button>
            </form>
            {depStatus && (
              <p style={{ marginTop: 8, fontSize: 12, color: '#e0f2fe' }}>
                {depStatus}
              </p>
            )}
          </div>

          {/* Setor */}
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 10,
              border: '1px solid #1f2933',
              background:
                'linear-gradient(135deg, rgba(30,64,175,0.5), rgba(15,23,42,0.95))',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#e0e7ff' }}>Setor</h3>
            <form
              onSubmit={handleCreateSetor}
              style={{ display: 'grid', gap: 8, maxWidth: 420 }}
            >
              <div>
                <label style={styles.label}>Nome do setor:</label>
                <input
                  type="text"
                  value={setorNome}
                  onChange={(e) => setSetorNome(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div>
                <label style={styles.label}>Departamento ID (opcional):</label>
                <input
                  type="number"
                  value={setorDepId}
                  onChange={(e) => setSetorDepId(e.target.value)}
                  style={styles.input}
                  placeholder="ID do departamento (se já existir)"
                />
              </div>
              <button
                type="submit"
                style={{
                  ...styles.button,
                  background: 'linear-gradient(90deg, #6366f1, #22c55e)',
                  color: '#000',
                }}
              >
                Gravar setor
              </button>
            </form>
            {setorStatusMsg && (
              <p style={{ marginTop: 8, fontSize: 12, color: '#e0e7ff' }}>
                {setorStatusMsg}
              </p>
            )}
          </div>

          {/* Regional */}
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 10,
              border: '1px solid #1f2933',
              background:
                'linear-gradient(135deg, rgba(88,28,135,0.55), rgba(15,23,42,0.96))',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#f5d0fe' }}>Regional</h3>
            <form
              onSubmit={handleCreateRegional}
              style={{ display: 'grid', gap: 8, maxWidth: 420 }}
            >
              <div>
                <label style={styles.label}>Nome da regional:</label>
                <input
                  type="text"
                  value={regionalNome}
                  onChange={(e) => setRegionalNome(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <button
                type="submit"
                style={{
                  ...styles.button,
                  background: 'linear-gradient(90deg, #f97316, #ec4899)',
                  color: '#000',
                }}
              >
                Gravar regional
              </button>
            </form>
            {regionalStatusMsg && (
              <p style={{ marginTop: 8, fontSize: 12, color: '#f5d0fe' }}>
                {regionalStatusMsg}
              </p>
            )}
          </div>
        </section>
      )}
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
