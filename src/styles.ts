// src/styles.ts

// 🎨 Paleta oficial EQF V13 – Neon Futurista
export const theme = {
  colors: {
    bg: '#050509', // fundo geral
    bgElevated: '#0b0b12', // cards/painéis
    bgSoft: '#111120',
    border: '#26263a',
    borderSoft: '#1b1b2b',
    text: '#f9fafb',
    textSoft: '#cbd5f5',
    textMuted: '#9ca3af',
    orange: '#ff7a00',      // laranja premium
    orangeSoft: '#ff9a3c',
    neon: '#00ff88',        // verde neon
    neonSoft: '#4dffae',
    danger: '#fb3f5c',
    warning: '#facc15',
    kpiGood: '#22c55e',
    kpiBad: '#ef4444',
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
  },
  shadow: {
    soft: '0 18px 45px rgba(0,0,0,0.55)',
    glowNeon: '0 0 30px rgba(0,255,136,0.35)',
    glowOrange: '0 0 30px rgba(255,122,0,0.35)',
  },
};

// 👇 Estilos compartilhados usados no App.tsx, MainShell e componentes
export const styles: Record<string, React.CSSProperties> = {
  // Tela cheia centralizada
  fullScreen: {
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at top, rgba(0,255,136,0.08), transparent 55%), ' +
      'radial-gradient(circle at bottom, rgba(255,122,0,0.08), transparent 55%), ' +
      theme.colors.bg,
    color: theme.colors.text,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, system-ui, -system-ui, sans-serif',
  },

  // Card padrão (login, caixas de diálogo)
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: theme.radius.xl,
    border: `1px solid ${theme.colors.border}`,
    background:
      'linear-gradient(135deg, rgba(10,10,18,0.95), rgba(8,8,16,0.98))',
    boxShadow: theme.shadow.soft,
    backdropFilter: 'blur(18px)',
  },

  // Título principal
  logoTitle: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: 1,
    background:
      'linear-gradient(120deg, #ff7a00, #ffbf3c, #00ff88, #4dffae)',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    textShadow: '0 0 18px rgba(0,0,0,0.6)',
    margin: 0,
  },

  // Campo label
  label: {
    display: 'block',
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },

  // Input padrão
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.borderSoft}`,
    backgroundColor: '#050511',
    color: theme.colors.text,
    fontSize: 13,
    outline: 'none',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
  },

  // Botão padrão
  button: {
    border: 'none',
    borderRadius: theme.radius.md,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s',
    boxShadow: '0 14px 35px rgba(0,0,0,0.65)',
  },

  // Glow que fica atrás do card de login
  loginGlow: {
    position: 'absolute',
    inset: '-40%',
    background:
      'radial-gradient(circle at top, rgba(0,255,136,0.2), transparent 55%), ' +
      'radial-gradient(circle at bottom, rgba(255,122,0,0.18), transparent 55%)',
    opacity: 0.8,
    zIndex: -1,
    filter: 'blur(10px)',
  },

  // ====== MAIN SHELL / DASHBOARD ======

  appShell: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: theme.colors.bg,
    color: theme.colors.text,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, system-ui, -system-ui, sans-serif',
  },

  sidebar: {
    width: 240,
    padding: 16,
    borderRight: `1px solid ${theme.colors.border}`,
    background:
      'radial-gradient(circle at top, rgba(255,122,0,0.15), transparent 60%), ' +
      'radial-gradient(circle at bottom, rgba(0,255,136,0.1), transparent 55%), ' +
      '#050509',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  sidebarHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 12,
  },

  sidebarLogo: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: theme.colors.text,
  },

  sidebarTag: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginTop: 8,
  },

  sidebarNavButton: {
    width: '100%',
    textAlign: 'left',
    padding: '7px 10px',
    borderRadius: theme.radius.md,
    border: 'none',
    backgroundColor: 'transparent',
    color: theme.colors.textSoft,
    fontSize: 13,
    cursor: 'pointer',
  },

  sidebarNavButtonActive: {
    background:
      'linear-gradient(120deg, rgba(255,122,0,0.16), rgba(0,255,136,0.18))',
    color: theme.colors.text,
    boxShadow: theme.shadow.glowNeon,
  },

  sidebarFooter: {
    marginTop: 'auto',
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },

  topBar: {
    height: 56,
    padding: '10px 18px',
    borderBottom: `1px solid ${theme.colors.border}`,
    background:
      'linear-gradient(90deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  topBarUser: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    fontSize: 13,
  },

  topBarUserName: {
    fontWeight: 600,
    color: theme.colors.text,
  },

  topBarUserRole: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  chipNivel: {
    padding: '3px 8px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.neonSoft}`,
    fontSize: 11,
    color: theme.colors.neonSoft,
  },

  logoutButton: {
    borderRadius: 999,
    padding: '6px 10px',
    border: `1px solid ${theme.colors.borderSoft}`,
    backgroundColor: '#050510',
    color: theme.colors.textSoft,
    fontSize: 12,
    cursor: 'pointer',
  },

  contentWrapper: {
    flex: 1,
    padding: 16,
    background:
      'radial-gradient(circle at top left, rgba(56,189,248,0.09), transparent 55%), ' +
      'radial-gradient(circle at bottom right, rgba(34,197,94,0.09), transparent 55%), ' +
      '#020617',
    overflow: 'auto',
  },

  contentCard: {
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
    background:
      'linear-gradient(135deg, rgba(6,12,30,0.98), rgba(3,7,18,0.98))',
    boxShadow: theme.shadow.soft,
    padding: 16,
  },

  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginTop: 8,
  },

  kpiCard: {
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.borderSoft}`,
    background:
      'radial-gradient(circle at top, rgba(0,255,136,0.12), transparent 65%)',
    padding: 10,
    fontSize: 12,
    color: theme.colors.textSoft,
  },
};
