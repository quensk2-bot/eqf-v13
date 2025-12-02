// src/components/KpiResumoN1.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Usuario } from "../types";
import { styles } from "../styles";

type Props = {
  perfil: Usuario;
};

type ExecucaoRow = {
  id: number;
  executor_id: string;
  inicio_em: string | null;
  finalizado_em: string | null;
  duracao_total_segundos: number | null;
  rotinas: {
    setor_id: number | null;
  } | null;
};

type ViewMode = "hoje" | "30d";

export function KpiResumoN1({ perfil }: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("hoje");

  const [rows, setRows] = useState<ExecucaoRow[]>([]);

  useEffect(() => {
    carregarKpi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.setor_id]);

  const carregarKpi = async () => {
    if (!perfil.setor_id) return;

    setLoading(true);
    setErro(null);

    try {
      const hoje = new Date();
      const inicioJanela = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate() - 29,
        0,
        0,
        0,
        0
      ); // últimos 30 dias

      const { data, error } = await supabase
        .from("rotina_execucoes")
        .select(
          `
          id,
          executor_id,
          inicio_em,
          finalizado_em,
          duracao_total_segundos,
          rotinas!inner(setor_id)
        `
        )
        .gte("inicio_em", inicioJanela.toISOString())
        .lte("inicio_em", hoje.toISOString())
        .eq("rotinas.setor_id", perfil.setor_id);

      if (error) throw error;

      setRows((data ?? []) as ExecucaoRow[]);
    } catch (e: any) {
      console.error(e);
      setErro(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  // Se o usuário não estiver vinculado a um setor, não faz sentido mostrar KPI de N1
  if (!perfil.setor_id) {
    return (
      <div
        style={{
          ...styles.card,
          marginBottom: 12,
          border: "1px solid rgba(148,163,184,0.4)",
          background: "rgba(15,23,42,0.95)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 4, color: "#22c55e" }}>
          KPI nacional do setor – Nível 1
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
          Seu usuário ainda não está vinculado a um setor. Associe o N1 a um
          setor para visualizar os indicadores nacionais.
        </p>
      </div>
    );
  }

  // ---------------- KPIs derivadas ----------------
  const todayISO = new Date().toISOString().slice(0, 10);

  const rowsHoje = rows.filter((r) =>
    r.inicio_em ? r.inicio_em.slice(0, 10) === todayISO : false
  );

  const rows30d = rows;

  const buildResumo = (lista: ExecucaoRow[]) => {
    const total = lista.length;
    const concl = lista.filter((r) => r.finalizado_em !== null).length;
    const segundos = lista.reduce(
      (acc, r) => acc + (r.duracao_total_segundos ?? 0),
      0
    );
    const horas = segundos / 3600;
    const uniqExec = new Set(lista.map((r) => r.executor_id)).size;

    return { total, concl, horas, uniqExec };
  };

  const resumoHoje = buildResumo(rowsHoje);
  const resumo30d = buildResumo(rows30d);

  const resumoAtual = view === "hoje" ? resumoHoje : resumo30d;

  const taxa =
    resumoAtual.total > 0
      ? (resumoAtual.concl / resumoAtual.total) * 100
      : 0;

  const mediaHoras =
    resumoAtual.total > 0 ? resumoAtual.horas / resumoAtual.total : 0;

  // --------- Série diária para o gráfico (últimos 30 dias) ---------
  type DiaSeries = { date: string; label: string; horas: number };

  const series30d: DiaSeries[] = (() => {
    const mapa: Record<string, number> = {};
    rows30d.forEach((r) => {
      if (!r.inicio_em) return;
      const d = r.inicio_em.slice(0, 10);
      mapa[d] = (mapa[d] ?? 0) + (r.duracao_total_segundos ?? 0);
    });

    const hoje = new Date();
    const lista: DiaSeries[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate() - i,
        0,
        0,
        0,
        0
      );
      const iso = d.toISOString().slice(0, 10);
      const segundos = mapa[iso] ?? 0;
      const horas = segundos / 3600;
      const label =
        d.getDate().toString().padStart(2, "0") +
        "/" +
        (d.getMonth() + 1).toString().padStart(2, "0");
      lista.push({ date: iso, label, horas });
    }
    return lista;
  })();

  const maxHoras =
    series30d.reduce((m, d) => (d.horas > m ? d.horas : m), 0) || 1;

  return (
    <div
      style={{
        ...styles.card,
        marginBottom: 12,
        border: "1px solid rgba(34,197,94,0.4)",
        background:
          "linear-gradient(135deg, rgba(22,163,74,0.14), rgba(15,23,42,0.9))",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 4, color: "#22c55e" }}>
            KPI nacional do setor – Nível 1
          </h2>
          <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
            Execuções de rotina (N2 + N3) do seu setor em todas as regionais.
          </p>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => setView("hoje")}
            style={{
              ...styles.smallButton,
              padding: "4px 8px",
              fontSize: 11,
              background:
                view === "hoje" ? "#22c55e" : "rgba(15,23,42,0.9)",
              color: view === "hoje" ? "#000" : "#e5e7eb",
              border:
                view === "hoje"
                  ? "1px solid #22c55e"
                  : "1px solid #334155",
            }}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setView("30d")}
            style={{
              ...styles.smallButton,
              padding: "4px 8px",
              fontSize: 11,
              background:
                view === "30d" ? "#22c55e" : "rgba(15,23,42,0.9)",
              color: view === "30d" ? "#000" : "#e5e7eb",
              border:
                view === "30d"
                  ? "1px solid #22c55e"
                  : "1px solid #334155",
            }}
          >
            Últimos 30 dias
          </button>
        </div>
      </div>

      {erro && (
        <p style={{ color: "#fecaca", fontSize: 12, marginTop: 6 }}>
          Erro ao carregar KPIs: {erro}
        </p>
      )}

      {loading ? (
        <p style={{ color: "#e5e7eb", fontSize: 13, marginTop: 8 }}>
          Carregando KPIs…
        </p>
      ) : resumoAtual.total === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 8 }}>
          Nenhuma execução encontrada para o período selecionado.
        </p>
      ) : (
        <>
          {/* Cards principais */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginTop: 8,
            }}
          >
            <KpiBox
              titulo={
                view === "hoje"
                  ? "Execuções do setor hoje"
                  : "Execuções do setor (30 dias)"
              }
              valor={resumoAtual.total.toString()}
            />
            <KpiBox
              titulo="Concluídas"
              valor={`${resumoAtual.concl} (${taxa.toFixed(0)}%)`}
            />
            <KpiBox
              titulo={
                view === "hoje"
                  ? "Horas executadas"
                  : "Horas executadas (30d)"
              }
              valor={resumoAtual.horas.toFixed(1) + " h"}
            />
            <KpiBox
              titulo="Média por execução"
              valor={mediaHoras.toFixed(1) + " h"}
            />
          </div>

          {/* Gráfico só na visão 30 dias */}
          {view === "30d" && (
            <div style={{ marginTop: 10 }}>
              <p
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                Horas executadas por dia (últimos 30 dias)
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
              >
                {series30d.map((d) => (
                  <div
                    key={d.date}
                    style={{
                      minWidth: 46,
                      textAlign: "center",
                      fontSize: 10,
                    }}
                  >
                    <div
                      style={{
                        height: 70,
                        borderRadius: 6,
                        background: "#020617",
                        border: "1px solid #0f172a",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        padding: 3,
                      }}
                    >
                      <div
                        style={{
                          width: "70%",
                          borderRadius: 4,
                          height: `${(d.horas / maxHoras) * 100}%`,
                          background:
                            "linear-gradient(180deg,#22c55e,#16a34a)",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        color: "#9ca3af",
                      }}
                    >
                      {d.label}
                    </div>
                    <div
                      style={{
                        color: "#e5e7eb",
                      }}
                    >
                      {d.horas.toFixed(1)}h
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type KpiBoxProps = {
  titulo: string;
  valor: string;
};

function KpiBox({ titulo, valor }: KpiBoxProps) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.4)",
        padding: "8px 10px",
        background: "rgba(15,23,42,0.9)",
      }}
    >
      <div style={{ fontSize: 11, color: "#94a3b8" }}>{titulo}</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "#e5e7eb",
          marginTop: 2,
        }}
      >
        {valor}
      </div>
    </div>
  );
}
