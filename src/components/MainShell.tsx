// ============================================================================
// MainShell.tsx — EQF V13
// Versão revisada + Relatórios N2 integrado
// ============================================================================

import type React from "react";
import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Usuario } from "../types";
import { theme } from "../styles";

// NÍVEL 1
import { KpiResumoN1 } from "./KpiResumoN1";
import { KpiPlanejadoExecutadoN1 } from "./KpiPlanejadoExecutadoN1";
import { N1CreateRotina } from "./N1CreateRotina";
import { N1ListarRotinas } from "./N1ListarRotinas";
import { N1ExecucaoPorRegional } from "./N1ExecucaoPorRegional";

// NÍVEL 2
import { KpiResumoN2 } from "./KpiResumoN2";
import { KpiPlanejadoExecutadoN2 } from "./KpiPlanejadoExecutadoN2";
import { N2CriarRotina } from "./N2CriarRotina";
import { N2ListarRotinas } from "./N2ListarRotinas";
import { N2ExecutarRotina } from "./N2ExecutarRotina";

// NOVO – RELATÓRIOS N2
import { N2Relatorios } from "./N2Relatorios";

// NÍVEL 3
import { N3CriarRotinaAvulsa } from "./N3CriarRotinaAvulsa";
import { RotinaExecucaoContainer } from "./RotinaExecucaoContainer";

// COMPONENTES COMPARTILHADOS
import { AgendaHoje } from "./AgendaHoje";

type Props = {
  session: Session | null;
  perfil: Usuario;
  onLogout: () => void;
};

type MenuKey =
  | "overview"
  | "rotinas"
  | "agenda"
  | "kpi"
  | "relatorios"; // <--- ADICIONADO

// ============================================================================
// ESTILOS
// ============================================================================
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
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    background:
      "conic-gradient(from 150deg, #22c55e, #f97316, #22c55e, #22c55e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    color: "#020617",
    border: "2px solid #020617",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
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
  sectionTitle: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)",
    gap: 16,
  },
  card: {
    background: "rgba(15,23,42,0.9)",
    borderRadius: 18,
    border: `1px solid ${theme.colors.borderSoft}`,
    padding: 16,
  },
};

// ============================================================================
// MAIN
// ============================================================================
export function MainShell({ perfil, onLogout }: Props) {
  const [menu, setMenu] = useState<MenuKey>("overview");

  // --------------------------------------------------------------------------
  // OVERVIEW
  // --------------------------------------------------------------------------
  const renderOverview = () => {
    if (perfil.nivel === "N2") {
      return (
        <div>
          <h2 style={shellStyles.sectionTitle}>Visão geral</h2>
          <p style={shellStyles.sectionSubtitle}>
            Painel principal da regional – visão N2.
          </p>

          <div style={shellStyles.grid}>
            <div style={shellStyles.card}>
              <KpiResumoN2 perfil={perfil} />
              <div style={{ height: 12 }} />
              <KpiPlanejadoExecutadoN2 perfil={perfil} />
            </div>

            <div style={shellStyles.card}>
              <h3 style={{ marginBottom: 6 }}>Agenda da regional</h3>
              <AgendaHoje perfil={perfil} filtroInicial="equipe" />
            </div>
          </div>
        </div>
      );
    }

    // N1 e N3 ficam iguais ao seu original
    return (
      <div>
        <h2 style={shellStyles.sectionTitle}>Visão geral</h2>
        <p style={shellStyles.sectionSubtitle}>
          Painel principal do setor — visão por nível.
        </p>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // ROTINAS
  // --------------------------------------------------------------------------
  const renderRotinas = () => (
    <div>
      <h2 style={shellStyles.sectionTitle}>Rotinas & Execução</h2>
      <p style={shellStyles.sectionSubtitle}>
        Criação e gerenciamento de rotinas.
      </p>

      {perfil.nivel === "N2" && (
        <>
          <div style={shellStyles.grid}>
            <div style={shellStyles.card}>
              <h3>Criar rotina (N2)</h3>
              <N2CriarRotina perfil={perfil} />
            </div>

            <div style={shellStyles.card}>
              <h3>Rotinas da minha regional</h3>
              <N2ListarRotinas perfil={perfil} />
            </div>
          </div>

          <div style={{ height: 16 }} />

          <div style={shellStyles.card}>
            <h3>Execução do time (N3)</h3>
            <N2ExecutarRotina perfil={perfil} />
          </div>
        </>
      )}
    </div>
  );

  // --------------------------------------------------------------------------
  // AGENDA
  // --------------------------------------------------------------------------
  const renderAgenda = () => (
    <div>
      <h2 style={shellStyles.sectionTitle}>Agenda & Rotinas do dia</h2>

      {perfil.nivel === "N2" && (
        <div style={shellStyles.grid}>
          <div style={shellStyles.card}>
            <h3>Agenda da regional</h3>
            <AgendaHoje perfil={perfil} filtroInicial="equipe" />
          </div>

          <div style={shellStyles.card}>
            <h3>Agenda individual (N2)</h3>
            <AgendaHoje perfil={perfil} filtroInicial="pessoal" />
          </div>
        </div>
      )}
    </div>
  );

  // --------------------------------------------------------------------------
  // KPI
  // --------------------------------------------------------------------------
  const renderKpi = () => (
    <div>
      <h2 style={shellStyles.sectionTitle}>KPI & Indicadores</h2>

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
    </div>
  );

  // --------------------------------------------------------------------------
  // RELATÓRIOS N2 (NOVO)
  // --------------------------------------------------------------------------
  const renderRelatorios = () => (
    <div>
      <h2 style={shellStyles.sectionTitle}>Relatórios N2</h2>
      <p style={shellStyles.sectionSubtitle}>
        Exporte rotinas, anexos e checklist em Excel / PDF.
      </p>

      <div style={shellStyles.card}>
        <N2Relatorios perfil={perfil} />
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // CONTENT SWITCH
  // --------------------------------------------------------------------------
  const renderContent = () => {
    switch (menu) {
      case "rotinas":
        return renderRotinas();
      case "agenda":
        return renderAgenda();
      case "kpi":
        return renderKpi();
      case "relatorios":
        return renderRelatorios();
      default:
        return renderOverview();
    }
  };

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <div style={shellStyles.root}>
      {/* SIDEBAR */}
      <aside style={shellStyles.sidebar}>
        <div style={shellStyles.logoRow}>
          <div style={shellStyles.logoBadge}>EQF</div>
          <div>
            <div style={{ fontWeight: 700 }}>E.Q.F Rotina 2.0</div>
            <div style={{ fontSize: 12, color: theme.colors.textSoft }}>
              Painel Empresarial
            </div>
          </div>
        </div>

        {/* BLOCO DO USUÁRIO */}
        <div style={{ marginTop: 16, fontSize: 13 }}>
          <b>{perfil.nome}</b>
          <div style={{ fontSize: 12, color: theme.colors.textSoft }}>
            {perfil.email}
          </div>
          <div
            style={{
              marginTop: 6,
              padding: "2px 10px",
              borderRadius: 999,
              background: "rgba(34,197,94,0.18)",
              color: "#4ade80",
              fontSize: 11,
              display: "inline-block",
            }}
          >
            Nível {perfil.nivel}
          </div>
        </div>

        {/* MENU */}
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            style={{
              ...menuButton(menu === "overview"),
            }}
            onClick={() => setMenu("overview")}
          >
            Dashboard
          </button>

          <button
            type="button"
            style={menuButton(menu === "rotinas")}
            onClick={() => setMenu("rotinas")}
          >
            Rotinas & Execução
          </button>

          <button
            type="button"
            style={menuButton(menu === "agenda")}
            onClick={() => setMenu("agenda")}
          >
            Agenda
          </button>

          <button
            type="button"
            style={menuButton(menu === "kpi")}
            onClick={() => setMenu("kpi")}
          >
            KPI
          </button>

          {/* BOTÃO APARECE APENAS PARA N2 */}
          {perfil.nivel === "N2" && (
            <button
              type="button"
              style={menuButton(menu === "relatorios")}
              onClick={() => setMenu("relatorios")}
            >
              Relatórios N2
            </button>
          )}
        </div>

        {/* LOGOUT */}
        <button
          type="button"
          style={{
            marginTop: "auto",
            padding: "8px 12px",
            borderRadius: 999,
            border: `1px solid ${theme.colors.borderSoft}`,
            background: "transparent",
            color: theme.colors.textSoft,
            cursor: "pointer",
          }}
          onClick={onLogout}
        >
          Sair
        </button>
      </aside>

      {/* CONTEÚDO */}
      <main style={shellStyles.main}>
        <header style={shellStyles.topBar}>
          <div>
            <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
              Projeto EQF Rotina 2.0
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Painel {perfil.nivel}
            </div>
          </div>
        </header>

        <div style={shellStyles.content}>{renderContent()}</div>
      </main>
    </div>
  );
}

// =====================================================================================
// ESTILO DO MENU BUTTON
// =====================================================================================
function menuButton(active: boolean): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    border: "none",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    cursor: "pointer",
    marginBottom: 6,
    background: active ? "rgba(34,197,94,0.22)" : "transparent",
    color: active ? "#e5e7eb" : "#94a3b8",
  };
}

export default MainShell;
