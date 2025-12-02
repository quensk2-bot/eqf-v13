// src/components/AgendaHoje.tsx
// Agenda do dia unificada (N1, N2, N3) + execução fullscreen

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Usuario } from "../types";
import { styles } from "../styles";
import { RotinaExecucaoContainer } from "./RotinaExecucaoContainer";

type FiltroAgenda = "minhas" | "equipe" | "setor";

type Props = {
  perfil: Usuario;
  filtroInicial?: FiltroAgenda;
};

type Rotina = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  periodicidade: string;
  data_inicio: string;
  dia_semana: string | null;
  horario_inicio: string | null;
  duracao_minutos: number | null;
  urgencia: string | null;
  responsavel_id: string;
  departamento_id: number | null;
  setor_id: number | null;
  regional_id: number | null;
  tem_checklist?: boolean;
  tem_anexo?: boolean;
};

type Execucao = {
  id: number;
  rotina_id: string;
  executor_id: string;
  inicio_em: string | null;
  pausado_em: string | null;
  finalizado_em: string | null;
  duracao_total_segundos: number | null;
  observacoes: string | null;
};

type ItemAgenda = {
  rotina: Rotina;
  execucaoHoje: Execucao | null;
};

/* Utils */

function formatarDataLabel(data: Date) {
  const dias = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
  const diaSemana = dias[data.getDay()];
  const dd = String(data.getDate()).padStart(2, "0");
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  return `${diaSemana}, ${dd}/${mm}`;
}

function getStatusFromExec(exec: Execucao | null): "Pendente" | "Em execução" | "Finalizada" {
  if (!exec) return "Pendente";
  if (exec.finalizado_em) return "Finalizada";
  if (exec.inicio_em && !exec.finalizado_em) return "Em execução";
  return "Pendente";
}

function getStatusColor(status: string) {
  if (status === "Finalizada") return "#22c55e";
  if (status === "Em execução") return "#eab308";
  return "#f97316";
}

const horarioStyles: Record<string, React.CSSProperties> = {
  wrap: {
    marginTop: 16,
    borderRadius: 20,
    border: "1px solid #020617",
    background: "linear-gradient(135deg,#020617,#020617)",
    padding: 16,
    maxHeight: 620,
    overflowY: "auto",
  },
  hourRow: {
    display: "grid",
    gridTemplateColumns: "72px 1fr",
    padding: "4px 0",
    borderBottom: "1px solid #020617",
    gap: 8,
    fontSize: 13,
  },
  hourLabel: {
    textAlign: "right",
    paddingRight: 8,
    color: "#64748b",
    fontVariantNumeric: "tabular-nums",
  },
  hourContent: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  eventCard: {
    borderRadius: 12,
    padding: "6px 12px",
    background: "rgba(15,23,42,0.95)",
    border: "1px solid #0b1120",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    transition: "transform 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease",
  },
  eventInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  statusTag: {
    alignSelf: "flex-start",
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 11,
  },
};

export function AgendaHoje({ perfil, filtroInicial }: Props) {
  const [dataRef, setDataRef] = useState<Date>(new Date());
  const [filtro, setFiltro] = useState<FiltroAgenda>(() => {
    if (filtroInicial) return filtroInicial;
    if (perfil.nivel === "N3") return "minhas";
    if (perfil.nivel === "N2") return "equipe";
    return "setor";
  });

  const [itens, setItens] = useState<ItemAgenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // 🔥 rotina atualmente em execução (para o modal fullscreen)
  const [rotinaEmExec, setRotinaEmExec] = useState<Rotina | null>(null);

  const dataLabel = formatarDataLabel(dataRef);
  const horas = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const itensPorHora = useMemo(() => {
    const mapa: Record<number, ItemAgenda[]> = {};
    horas.forEach((h) => (mapa[h] = []));
    itens.forEach((item) => {
      if (item.rotina.horario_inicio) {
        const h = Number(item.rotina.horario_inicio.split(":")[0]);
        if (!isNaN(h)) mapa[h].push(item);
      }
    });
    return mapa;
  }, [itens, horas]);

  const semHorario = itens.filter((i) => !i.rotina.horario_inicio);

  async function carregarAgenda() {
    setLoading(true);
    setErro(null);
    try {
      const inicio = new Date(dataRef);
      inicio.setHours(0, 0, 0, 0);

      let q = supabase.from("rotinas").select(`
        id, titulo, descricao, tipo, periodicidade,
        data_inicio, horario_inicio, duracao_minutos,
        urgencia, responsavel_id, departamento_id, setor_id, regional_id,
        tem_checklist, tem_anexo
      `);

      if (filtro === "minhas") {
        q = q.eq("responsavel_id", perfil.id);
      } else if (filtro === "equipe" && perfil.setor_id) {
        q = q.eq("setor_id", perfil.setor_id);
      } else if (filtro === "setor" && perfil.departamento_id) {
        q = q.eq("departamento_id", perfil.departamento_id);
      }

      // até a data escolhida
      q = q.lte("data_inicio", inicio.toISOString());

      const { data: rotinasData, error } = await q;
      if (error) throw error;

      const rotinas = (rotinasData ?? []) as Rotina[];
      if (rotinas.length === 0) {
        setItens([]);
        return;
      }

      const { data: execData, error: execErr } = await supabase
        .from("rotina_execucoes")
        .select("*")
        .in("rotina_id", rotinas.map((r) => r.id));
      if (execErr) throw execErr;

      const execucoes = execData as Execucao[];
      const mapaExec: Record<string, Execucao> = {};
      execucoes.forEach((e) => {
        if (!mapaExec[e.rotina_id]) mapaExec[e.rotina_id] = e;
      });

      const montados: ItemAgenda[] = rotinas.map((r) => ({
        rotina: r,
        execucaoHoje: mapaExec[r.id] ?? null,
      }));

      setItens(montados);
    } catch (e: any) {
      console.error("Erro ao carregar agenda:", e);
      setErro(e.message || "Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataRef, filtro]);

  function mudarDia(delta: number) {
    setDataRef((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }

  function abrirExecucao(rotina: Rotina) {
    console.log("Abrindo execução para rotina:", rotina.id, rotina.titulo);
    setRotinaEmExec(rotina);
  }

  function fecharExecucao() {
    setRotinaEmExec(null);
    carregarAgenda();
  }

  const formatHora = (h: number) => `${String(h).padStart(2, "0")}:00`;

  return (
    <div
      style={{
        ...styles.card,
        marginTop: 0,
        padding: 24,
        borderRadius: 24,
        maxWidth: "100%",
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Agenda do dia</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
            Visualização em linha do tempo (00:00–23:00) • {dataLabel} • filtro:{" "}
            <strong>{filtro}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => mudarDia(-1)}
            style={styles.buttonSecondary}
          >
            ◀ Ontem
          </button>
          <button
            type="button"
            onClick={() => setDataRef(new Date())}
            style={styles.button}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => mudarDia(1)}
            style={styles.buttonSecondary}
          >
            Amanhã ▶
          </button>
        </div>
      </div>

      {/* Filtro */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {(["minhas", "equipe", "setor"] as FiltroAgenda[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            style={{
              borderRadius: 999,
              padding: "4px 14px",
              background:
                filtro === f ? "rgba(34,197,94,0.18)" : "rgba(15,23,42,0.95)",
              border:
                filtro === f ? "1px solid #22c55e" : "1px solid #1e293b",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {f === "minhas"
              ? "Minhas"
              : f === "equipe"
              ? "Equipe"
              : "Departamento"}
          </button>
        ))}
      </div>

      {/* Erro */}
      {erro && (
        <div
          style={{
            padding: 8,
            borderRadius: 10,
            background: "rgba(220,38,38,0.15)",
            color: "#fecaca",
            marginBottom: 8,
          }}
        >
          {erro}
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <p style={{ color: "#cbd5e1", marginTop: 16 }}>Carregando…</p>
      ) : (
        <>
          <div style={horarioStyles.wrap}>
            {horas.map((h) => {
              const eventos = itensPorHora[h] ?? [];
              return (
                <div key={h} style={horarioStyles.hourRow}>
                  <div style={horarioStyles.hourLabel}>{formatHora(h)}</div>
                  <div style={horarioStyles.hourContent}>
                    {eventos.length === 0 ? (
                      <span style={{ fontSize: 11, color: "#334155" }}>—</span>
                    ) : (
                      eventos.map(({ rotina, execucaoHoje }) => {
                        const status = getStatusFromExec(execucaoHoje);
                        const corStatus = getStatusColor(status);
                        return (
                          <div
                            key={rotina.id}
                            style={horarioStyles.eventCard}
                            onClick={() => abrirExecucao(rotina)}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLDivElement).style.transform =
                                "translateY(-1px)";
                              (e.currentTarget as HTMLDivElement).style.boxShadow =
                                "0 8px 18px rgba(15,23,42,0.65)";
                              (e.currentTarget as HTMLDivElement).style.borderColor =
                                "#1f2937";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).style.transform =
                                "none";
                              (e.currentTarget as HTMLDivElement).style.boxShadow =
                                "none";
                              (e.currentTarget as HTMLDivElement).style.borderColor =
                                "#0b1120";
                            }}
                          >
                            <div style={horarioStyles.eventInfo}>
                              <strong style={{ color: "#e5e7eb" }}>
                                {rotina.titulo}
                              </strong>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "#94a3b8",
                                  display: "flex",
                                  gap: 8,
                                }}
                              >
                                <span>
                                  {rotina.horario_inicio?.slice(0, 5) ??
                                    "Sem horário"}
                                </span>
                                <span>• {rotina.duracao_minutos ?? 60} min</span>
                                {rotina.tem_checklist && (
                                  <span style={{ color: "#22c55e" }}>
                                    • Checklist
                                  </span>
                                )}
                                {rotina.tem_anexo && (
                                  <span style={{ color: "#38bdf8" }}>
                                    • Anexo
                                  </span>
                                )}
                              </span>
                            </div>

                            <div>
                              <span
                                style={{
                                  ...horarioStyles.statusTag,
                                  color: corStatus,
                                  border: `1px solid ${corStatus}`,
                                  background: "rgba(15,23,42,0.90)",
                                }}
                              >
                                {status}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sem horário fixo */}
          {semHorario.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                Sem horário definido:
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {semHorario.map(({ rotina }) => (
                  <div
                    key={rotina.id}
                    style={horarioStyles.eventCard}
                    onClick={() => abrirExecucao(rotina)}
                  >
                    <div>
                      <strong style={{ color: "#e5e7eb" }}>
                        {rotina.titulo}
                      </strong>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>
                        Tipo: {rotina.tipo} • {rotina.duracao_minutos ?? 60} min
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {itens.length === 0 && !erro && (
            <p
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              Nenhuma rotina encontrada para esse dia / filtro.
            </p>
          )}
        </>
      )}

      {/* 🔥 Execução fullscreen + painel flutuante */}
      {rotinaEmExec && (
        <RotinaExecucaoContainer
          open
          rotina={rotinaEmExec}
          onClose={fecharExecucao}
        />
      )}
    </div>
  );
}
