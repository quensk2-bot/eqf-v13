// ============================================================================
// MainShell.tsx — EQF V13 FINAL
// Base do BKP + Adição da tela "Relatórios N2"
// ============================================================================

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

// NOVO — RELATÓRIOS N2
import { N2Relatorios } from "./N2Relatorios";

// TELAS NÍVEL 3
import { KpiResumoN3 } from "./KpiResumoN3";
import { KpiPlanejadoExecutadoN3 } from "./KpiPlanejadoExecutadoN3";
import { N3MinhasRotinas } from "./N3MinhasRotinas";
import { N3CriarRotinaAvulsa } from "./N3CriarRotinaAvulsa";

// GERAL
import { AgendaHoje } from "./AgendaHoje";

type Props = {
  session: Session | null;
  perfil: Usuario;
  onLogout: () => void;
};

type MenuKey = "overview" | "rotinas" | "agenda" | "kpi" | "relatorios";

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
  main: { flex: 1, display: "flex", flexDirection: "column" },
  topBar: {
    height: 64,
    borderBottom: `1px solid ${theme.colors.borderSoft}`,
    padding: "12px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: { flex: 1, padding: "20px 24px", overflow: "auto" },
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
  const [menu, setMenu] = useState<MenuKey>(
    perfil.nivel === "N3" ? "agenda" : "overview"
  );

  // --------------------------------------------------------------------------
  // VISÃO GERAL
  // --------------------------------------------------------------------------
  const renderOverview = () => (
    <div>
      <h2 style={shellStyles.sectionTitle}>Visão geral</h2>
      <p style={shellStyles.sectionSubtitle}>
        Painel principal do setor — visão por nível de acesso.
      </p>

      {perfil.nivel === "N1" && (
        <div style={shellStyles.grid}>
          <div style={shellStyles.card}>
            <KpiResumoN1 perfil={perfil} />
            <div style={{ height: 12 }} />
            <KpiPlanejadoExecutadoN1 perfil={perfil} />
          </div>
          <div style={shellStyles.card}>
            <AgendaHoje perfil={perfil} />
          </div>
        </div>
      )}

      {perfil.nivel === "N2" && (
        <div style={shellStyles.grid}>
          <div style={shellStyles.card}>
            <KpiResumoN2 perfil={perfil} />
            <div style={{ height: 12 }} />
            <KpiPlanejadoExecutadoN2 perfil={perfil} />
          </div>

          <div style={shellStyles.card}>
            <AgendaHoje perfil={perfil} filtroInicial="equipe" />
          </div>
        </div>
      )}

      {perfil.nivel === "N3" && (
        <div style={shellStyles.card}>
          <AgendaHoje perfil={perfil} filtroInicial="minhas" />
        </div>
      )}
    </div>
  );

  // --------------------------------------------------------------------------
  // ROTINAS
  // --------------------------------------------------------------------------
  const renderRotinas = () => (
    <div>
      <h2 style={shellStyles.sectionTitle}>Rotinas & Execução</h2>

      {perfil.nivel === "N1" && (
        <div style={shellStyles.grid}>
          <div style={shellStyles.card}>
            <N1CreateRotina perfil={perfil} />
          </div>
          <div style={shellStyles.card}>
            <N1ListarRotinas perfil={perfil} />
          </div>
        </div>
      )}

      {perfil.nivel === "N2" && (
        <>
          <div style={shellStyles.grid}>
            <div style={shellStyles.card}>
              <N2CriarRotina perfil={perfil} />
            </div>
            <div style={shellStyles.card}>
              <N2ListarRotinas perfil={perfil} />
            </div>
          </div>

          <div style={{ height: 16 }} />

          <div style={shellStyles.card}>
            <N2ExecutarRotina perfil={perfil} />
          </div>
        </>
      )}

      {perfil.nivel === "N3" && (
        <div style={shellStyles.grid}>
          <div style={shellStyles.card}>
            <N3CriarRotinaAvulsa perfil={perfil} />
          </div>
          <div style={shellStyles.card}>
            <N3MinhasRotinas perfil={perfil} />
          </div>
        </div>
      )}
    </div>
  );

  // --------------------------------------------------------------------------
  // AGENDA
  // --------------------------------------------------------------------------
  const renderAgenda = () => (
    <div>
      <h2 style={shellStyles.sectionTitle}>Agenda do dia</h2>

      <div style={shellStyles.card}>
        {perfil.nivel === "N3" && (
          <AgendaHoje perfil={perfil} filtroInicial="minhas" />
        )}

        {perfil.nivel === "N2" && (
          <AgendaHoje perfil={perfil} filtroInicial="equipe" />
        )}

        {perfil.nivel === "N1" && <AgendaHoje perfil={perfil} />}
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // KPI & RELATÓRIOS
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // RELATÓRIOS N2
  // --------------------------------------------------------------------------
  const renderRelatorios = () =>
    perfil.nivel === "N2" && (
      <div>
        <h2 style={shellStyles.sectionTitle}>Relatórios N2</h2>
        <p style={shellStyles.sectionSubtitle}>
          Exportação de rotinas, checklist e anexos.
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
  // RENDER PRINCIPAL
  // ====================================================================
  return (
    <div style={shellStyles.root}>
      {/* SIDEBAR */}
      <aside style={shellStyles.sidebar}>
        <div>
          <div style={{ fontWeight: 700 }}>EQF V13</div>
          <div style={{ fontSize: 12, color: theme.colors.textMuted }}>
            Rotina Empresarial
          </div>
        </div>

        <div style={{ fontSize: 13 }}>
          <b>{perfil.nome}</b>
          <div style={{ fontSize: 12, color: theme.colors.textMuted }}>
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

        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            style={menuButton(menu === "overview")}
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

        <button
          type="button"
          style={{
            marginTop: "auto",
            padding: "8px 12px",
            borderRadius: 999,
            border: `1px solid ${theme.colors.borderSoft}`,
            background: "transparent",
            color: theme.colors.textSoft,
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

// BOTÃO DO MENU
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
