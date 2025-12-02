// ------------------------------
// MainShell.tsx — EQF V13
// Layout v2 clássico ajustado
// ------------------------------

import type React from "react";
import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Usuario } from "../types";
import { theme } from "../styles";

// TELAS NÍVEL 1
import { KpiResumoN1 } from "./KpiResumoN1";
import { KpiPlanejadoExecutadoN1 } from "./KpiPlanejadoExecutadoN1";
import { N1CreateRotina } from "./N1CreateRotina";
import { N1ListarRotinas } from "./N1ListarRotinas";
import { N1ExecucaoPorRegional } from "./N1ExecucaoPorRegional";

// TELAS NÍVEL 2
import { KpiResumoN2 } from "./KpiResumoN2";
import { KpiPlanejadoExecutadoN2 } from "./KpiPlanejadoExecutadoN2";
import { N2ExecutarRotina } from "./N2ExecutarRotina";
import { N2ListarRotinas } from "./N2ListarRotinas";
import { N2CriarRotina } from "./N2CriarRotina";

// TELAS NÍVEL 3
import { KpiResumoN3 } from "./KpiResumoN3";
import { KpiPlanejadoExecutadoN3 } from "./KpiPlanejadoExecutadoN3";
import { N3MinhasRotinas } from "./N3MinhasRotinas";
import { N3CriarRotinaAvulsa } from "./N3CriarRotinaAvulsa";

// TELAS GERAIS
import { AgendaHoje } from "./AgendaHoje";

type MainShellProps = {
  session: Session;
  perfil: Usuario;
  onLogout: () => void;
};

type MenuKey = "overview" | "rotinas" | "agenda" | "kpi";

const shellStyles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: theme.colors.bg,
    color: theme.colors.text,
    display: "flex",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  sidebar: {
    width: 260,
    background:
      "radial-gradient(circle at top left, #111827 0, #020617 55%, #000 100%)",
    borderRight: `1px solid ${theme.colors.borderSoft}`,
    padding: "20px 18px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  logoBlock: {
    marginBottom: 8,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: 700,
  },
  logoSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  userCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    background:
      "radial-gradient(circle at top left, rgba(34,197,94,0.35), transparent 55%)",
    border: `1px solid rgba(34,197,94,0.4)`,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 13,
  },
  userEmail: {
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  userBadge: {
    alignSelf: "flex-start",
    marginTop: 4,
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 11,
    background: "rgba(34,197,94,0.22)",
    color: "#4ade80",
  },
  menu: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  menuLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    letterSpacing: 0.08,
    marginBottom: 4,
  },
  menuItem: {
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    color: theme.colors.textSoft,
    cursor: "pointer",
    border: "none",
    background: "transparent",
    textAlign: "left",
  },
  menuItemActive: {
    background: "rgba(34,197,94,0.16)",
    color: theme.colors.neon,
  },
  logoutButton: {
    marginTop: 8,
    borderRadius: 999,
    border: `1px solid ${theme.colors.borderSoft}`,
    padding: "6px 14px",
    fontSize: 12,
    background: "transparent",
    color: theme.colors.textSoft,
    cursor: "pointer",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "radial-gradient(circle at top, #020617 0, #020617 55%, #000)",
  },
  topBar: {
    height: 64,
    borderBottom: `1px solid ${theme.colors.borderSoft}`,
    padding: "12px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: "20px 24px",
    overflow: "auto",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
    gap: 16,
  },
  card: {
    background: "rgba(15,23,42,0.9)",
    borderRadius: 18,
    border: `1px solid ${theme.colors.borderSoft}`,
    padding: 16,
  },
};

// menus padrão (N1 / N2)
const baseMenus: { key: MenuKey; label: string }[] = [
  { key: "overview", label: "Visão geral" },
  { key: "rotinas", label: "Rotinas & Execução" },
  { key: "agenda", label: "Agenda do dia" },
  { key: "kpi", label: "KPI & Relatórios" },
];

export function MainShell({ session, perfil, onLogout }: MainShellProps) {
  // N3 já entra direto na agenda; N1/N2 continuam na visão geral
  const [menu, setMenu] = useState<MenuKey>(
    perfil.nivel === "N3" ? "agenda" : "overview"
  );

  // menus visíveis por nível
  const menus =
    perfil.nivel === "N3"
      ? ([
          { key: "agenda", label: "Agenda do dia" },
          { key: "rotinas", label: "Rotinas & Execução" },
          { key: "kpi", label: "KPI & Relatórios" },
        ] as const)
      : baseMenus;

  const nomeCurto =
    perfil.nome?.split(" ").slice(0, 2).join(" ") ||
    perfil.email.split("@")[0];

  const descricaoNivel =
    perfil.nivel === "N1"
      ? "Gerente Nacional do Setor"
      : perfil.nivel === "N2"
      ? "Líder Regional"
      : perfil.nivel === "N3"
      ? "Executor"
      : perfil.nivel;

  // -------------------------------------------
  // TELAS — VISÃO GERAL
  // (N3 não acessa esse menu)
  // -------------------------------------------
  const renderOverview = () => (
    <div>
      <h2 style={shellStyles.sectionTitle}>Visão geral</h2>
      <p style={shellStyles.sectionSubtitle}>
        Painel principal do setor — visão por nível de acesso.
      </p>

      {/* NÍVEL 1 — visão nacional do setor */}
      {perfil.nivel === "N1" && (
        <div style={shellStyles.grid}>
          <div style={shellStyles.card}>
            <KpiResumoN1 perfil={perfil} />
            <div style={{ height: 12 }} />
            <KpiPlanejadoExecutadoN1 perfil={perfil} />
          </div>
          <div style={shellStyles.card}>
            <h3 style={{ fontSize: 15, marginBottom: 6 }}>Agenda do dia</h3>
            <AgendaHoje perfil={perfil} />
          </div>
        </div>
      )}

      {/* NÍVEL 2 — visão regional + agenda da equipe */}
      {perfil.nivel === "N2" && (
        <div style={shellStyles.grid}>
          <div style={shellStyles.card}>
            <KpiResumoN2 perfil={perfil} />
            <div style={{ height: 12 }} />
            <KpiPlanejadoExecutadoN2 perfil={perfil} />
          </div>
          <div style={shellStyles.card}>
            <h3 style={{ fontSize: 15, marginBottom: 6 }}>Agenda da regional</h3>
            <AgendaHoje perfil={perfil} filtroInicial="equipe" />
          </div>
        </div>
      )}
    </div>
  );

  // -------------------------------------------
  // TELAS — ROTINAS
  // -------------------------------------------
  const renderRotinas = () => (
    <div>
      <h2 style={shellStyles.sectionTitle}>Rotinas & Execução</h2>
      <p style={shellStyles.sectionSubtitle}>
        Criação e gerenciamento de rotinas, de acordo com o nível de acesso.
      </p>

      {/* NÍVEL 1 — cria rotinas nacionais */}
      {perfil.nivel === "N1" && (
        <div style={shellStyles.grid}>
          <div style={shellStyles.card}>
            <h3 style={{ marginBottom: 8 }}>Criar rotina (N1 – nacional)</h3>
            <N1CreateRotina perfil={perfil} />
          </div>
          <div style={shellStyles.card}>
            <h3 style={{ marginBottom: 8 }}>Rotinas criadas por mim</h3>
            <N1ListarRotinas perfil={perfil} />
          </div>
        </div>
      )}

      {/* NÍVEL 2 — cria rotinas da regional e gerencia execução do time */}
      {perfil.nivel === "N2" && (
        <>
          <div style={shellStyles.grid}>
            <div style={shellStyles.card}>
              <h3 style={{ marginBottom: 8 }}>
                Criar rotina (N2 – minha regional)
              </h3>
              <N2CriarRotina perfil={perfil} />
            </div>
            <div style={shellStyles.card}>
              <h3 style={{ marginBottom: 8 }}>Rotinas da minha regional</h3>
              <N2ListarRotinas perfil={perfil} />
            </div>
          </div>
          <div style={{ height: 16 }} />
          <div style={shellStyles.card}>
            <h3 style={{ marginBottom: 8 }}>Execução de rotina (time N3)</h3>
            <N2ExecutarRotina perfil={perfil} />
          </div>
        </>
      )}

      {/* NÍVEL 3 — rotinas pessoais (avulsas + minhas rotinas)
          >>> sem o bloco "Executar rotina N2 – Regional" <<< */}
      {perfil.nivel === "N3" && (
        <div style={shellStyles.grid}>
          <div style={shellStyles.card}>
            <N3CriarRotinaAvulsa perfil={perfil} />
          </div>
          <div style={shellStyles.card}>
            <h3 style={{ marginBottom: 8 }}>Minhas rotinas</h3>
            <N3MinhasRotinas perfil={perfil} />
          </div>
        </div>
      )}
    </div>
  );

  // -------------------------------------------
  // TELAS — AGENDA
  // -------------------------------------------
  const renderAgenda = () => (
    <div>
      <h2 style={shellStyles.sectionTitle}>Agenda do dia</h2>
      <p style={shellStyles.sectionSubtitle}>
        Visualização em linha do tempo (00:00–23:00) das rotinas planejadas.
      </p>

      <div style={shellStyles.card}>
        {perfil.nivel === "N3" ? (
          <AgendaHoje perfil={perfil} filtroInicial="minhas" />
        ) : perfil.nivel === "N2" ? (
          <AgendaHoje perfil={perfil} filtroInicial="equipe" />
        ) : (
          <AgendaHoje perfil={perfil} />
        )}
      </div>
    </div>
  );

  // -------------------------------------------
  // TELAS — KPI & RELATÓRIOS
  // -------------------------------------------
  const renderKpi = () => (
    <div>
      <h2 style={shellStyles.sectionTitle}>KPI & Relatórios</h2>

      {perfil.nivel === "N1" && (
        <>
          <div style={shellStyles.card}>
            <KpiResumoN1 perfil={perfil} />
          </div>

          <div style={{ height: 12 }} />

          <div style={shellStyles.card}>
            <KpiPlanejadoExecutadoN1 perfil={perfil} />
          </div>

          <div style={{ height: 12 }} />

          <div style={shellStyles.card}>
            <N1ExecucaoPorRegional perfil={perfil} />
          </div>
        </>
      )}

      {perfil.nivel === "N2" && (
        <>
          <div style={shellStyles.card}>
            <KpiResumoN2 perfil={perfil} />
          </div>
          <div style={{ height: 12 }} />
          <div style={shellStyles.card}>
            <KpiPlanejadoExecutadoN2 perfil={perfil} />
          </div>
        </>
      )}

      {perfil.nivel === "N3" && (
        <>
          <div style={shellStyles.card}>
            <KpiResumoN3 perfil={perfil} />
          </div>
          <div style={{ height: 12 }} />
          <div style={shellStyles.card}>
            <KpiPlanejadoExecutadoN3 perfil={perfil} />
          </div>
        </>
      )}
    </div>
  );

  const renderContent = () => {
    switch (menu) {
      case "rotinas":
        return renderRotinas();
      case "agenda":
        return renderAgenda();
      case "kpi":
        return renderKpi();
      case "overview":
      default:
        return renderOverview();
    }
  };

  // -------------------------------------------
  // RENDER PRINCIPAL
  // -------------------------------------------
  return (
    <div style={shellStyles.root}>
      {/* MENU LATERAL */}
      <aside style={shellStyles.sidebar}>
        <div style={shellStyles.logoBlock}>
          <div style={shellStyles.logoTitle}>EQF V13</div>
          <div style={shellStyles.logoSubtitle}>Rotina Empresarial</div>
        </div>

        <div style={shellStyles.userCard}>
          <strong>{nomeCurto}</strong>
          <span style={shellStyles.userEmail}>{perfil.email}</span>
          <span style={shellStyles.userBadge}>{descricaoNivel}</span>
        </div>

        <div style={shellStyles.menu}>
          <div style={shellStyles.menuLabel}>Navegação</div>
          {menus.map((item) => (
            <button
              key={item.key}
              onClick={() => setMenu(item.key)}
              style={{
                ...shellStyles.menuItem,
                ...(menu === item.key ? shellStyles.menuItemActive : {}),
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          style={shellStyles.logoutButton}
          onClick={onLogout}
        >
          Sair
        </button>
      </aside>

      {/* CONTEÚDO */}
      <main style={shellStyles.main}>
        <header style={shellStyles.topBar}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Bem-vindo, {nomeCurto}
            </div>
            <div style={{ fontSize: 12, color: theme.colors.textMuted }}>
              {session.user.email} • {descricaoNivel}
            </div>
          </div>

          <div
            style={{
              padding: "4px 12px",
              borderRadius: 12,
              border: `1px solid ${theme.colors.borderSoft}`,
              color: theme.colors.textSoft,
              fontSize: 12,
            }}
          >
            Nível: {perfil.nivel}
          </div>
        </header>

        <div style={shellStyles.content}>{renderContent()}</div>
      </main>
    </div>
  );
}

export default MainShell;
