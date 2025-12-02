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
  tem_checklist: boolean;
  tem_anexo: boolean;
};

type Execucao = {
  id: number;
  rotina_id: string;
  executor_id: string;
  inicio_em: string | null;
  pausado_em: string | null;
  finalizado_em: string | null;
};

type ItemAgenda = {
  rotina: Rotina;
  execucao: Execucao | null;
};

const horasDia = Array.from({ length: 24 }, (_, h) => h);

export function AgendaHoje({ perfil, filtroInicial }: Props) {
  const [dataRef, setDataRef] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().slice(0, 10);
  });
  const [filtro, setFiltro] = useState<FiltroAgenda>(
    filtroInicial ?? "minhas"
  );
  const [itens, setItens] = useState<ItemAgenda[]>([]);
  const [semHorario, setSemHorario] = useState<ItemAgenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [rotinaEmExec, setRotinaEmExec] = useState<Rotina | null>(null);

  const carregarAgenda = async () => {
    try {
      setLoading(true);
      setErro(null);

      let q = supabase
        .from("rotinas")
        .select(
          `
        id, titulo, descricao, tipo, periodicidade,
        data_inicio, dia_semana, horario_inicio, duracao_minutos,
        urgencia, responsavel_id, departamento_id, setor_id, regional_id,
        tem_checklist, tem_anexo
      `
        )
        .eq("data_inicio", dataRef);

      if (filtro === "minhas") {
        q = q.eq("responsavel_id", perfil.id);
      } else if (filtro === "equipe" && perfil.setor_id) {
        q = q.eq("setor_id", perfil.setor_id);
      } else if (filtro === "setor" && perfil.departamento_id) {
        q = q.eq("departamento_id", perfil.departamento_id);
      }

      const { data, error } = await q;

      if (error) {
        console.error(error);
        setErro("Erro ao carregar agenda.");
        return;
      }

      const rotinas = (data as Rotina[]) ?? [];

      const rotinaIds = rotinas.map((r) => r.id);
      if (rotinaIds.length === 0) {
        setItens([]);
        setSemHorario([]);
        return;
      }

      const { data: execucoesData, error: execError } = await supabase
        .from("rotina_execucoes")
        .select("*")
        .in("rotina_id", rotinaIds)
        .order("inicio_em", { ascending: false });

      if (execError) {
        console.error(execError);
        setErro("Erro ao carregar execuções.");
        return;
      }

      const execucoes = (execucoesData as Execucao[]) ?? [];
      const execPorRotina = new Map<string, Execucao>();

      for (const ex of execucoes) {
        if (!execPorRotina.has(ex.rotina_id)) {
          execPorRotina.set(ex.rotina_id, ex);
        }
      }

      const itensMontados: ItemAgenda[] = rotinas.map((r) => ({
        rotina: r,
        execucao: execPorRotina.get(r.id) ?? null,
      }));

      const comHorario = itensMontados.filter(
        (it) => it.rotina.horario_inicio
      );
      const semHorarioLista = itensMontados.filter(
        (it) => !it.rotina.horario_inicio
      );

      comHorario.sort((a, b) => {
        const ha = a.rotina.horario_inicio ?? "23:59";
        const hb = b.rotina.horario_inicio ?? "23:59";
        return ha.localeCompare(hb);
      });

      setItens(comHorario);
      setSemHorario(semHorarioLista);
    } catch (e) {
      console.error(e);
      setErro("Erro inesperado ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataRef, filtro, perfil.id]);

  const itensPorHora = useMemo(() => {
    const mapa = new Map<number, ItemAgenda[]>();
    for (const h of horasDia) {
      mapa.set(h, []);
    }

    for (const item of itens) {
      const hStr = item.rotina.horario_inicio ?? "00:00";
      const h = parseInt(hStr.slice(0, 2), 10);
      if (!mapa.has(h)) mapa.set(h, []);
      mapa.get(h)?.push(item);
    }

    for (const [h, arr] of mapa) {
      arr.sort((a, b) => {
        const ha = a.rotina.horario_inicio ?? "23:59";
        const hb = b.rotina.horario_inicio ?? "23:59";
        return ha.localeCompare(hb);
      });
      mapa.set(h, arr);
    }

    return mapa;
  }, [itens]);

  const mudarDia = (delta: number) => {
    const d = new Date(dataRef);
    d.setDate(d.getDate() + delta);
    setDataRef(d.toISOString().slice(0, 10));
  };

  const abrirExecucao = (rotina: Rotina) => {
    setRotinaEmExec(rotina);
  };

  const fecharExecucao = () => {
    setRotinaEmExec(null);
    carregarAgenda();
  };

  const tituloDia = useMemo(() => {
    const d = new Date(dataRef + "T00:00:00");
    return d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [dataRef]);

  const corStatus = (item: ItemAgenda) => {
    if (!item.execucao) {
      return {
        label: "Pendente",
        bg: "rgba(56,189,248,0.08)",
        border: "rgba(56,189,248,0.8)",
        color: "#7dd3fc",
      };
    }

    if (item.execucao.finalizado_em) {
      return {
        label: "Finalizada",
        bg: "rgba(34,197,94,0.1)",
        border: "rgba(34,197,94,0.8)",
        color: "#4ade80",
      };
    }

    if (item.execucao.inicio_em && !item.execucao.finalizado_em) {
      return {
        label: "Em execução",
        bg: "rgba(251,191,36,0.12)",
        border: "rgba(251,191,36,0.9)",
        color: "#facc15",
      };
    }

    return {
      label: "Pendente",
      bg: "rgba(56,189,248,0.08)",
      border: "rgba(56,189,248,0.8)",
      color: "#7dd3fc",
    };
  };

  const corUrgencia = (urg: string | null) => {
    if (urg === "alta") {
      return {
        bg: "rgba(248,113,113,0.15)",
        border: "rgba(248,113,113,0.8)",
        color: "#fecaca",
      };
    }
    if (urg === "media") {
      return {
        bg: "rgba(251,191,36,0.18)",
        border: "rgba(251,191,36,0.8)",
        color: "#fef3c7",
      };
    }
    return {
      bg: "rgba(52,211,153,0.12)",
      border: "rgba(52,211,153,0.9)",
      color: "#bbf7d0",
    };
  };

  return (
    <div>
      {/* CONTROLES DE DIA E FILTRO */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            style={{
              ...styles.buttonSecondary,
              padding: "4px 10px",
              fontSize: 13,
            }}
            onClick={() => mudarDia(-1)}
          >
            ◀ Ontem
          </button>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              textTransform: "capitalize",
            }}
          >
            {tituloDia}
          </div>
          <button
            type="button"
            style={{
              ...styles.buttonSecondary,
              padding: "4px 10px",
              fontSize: 13,
            }}
            onClick={() => {
              const hoje = new Date();
              setDataRef(hoje.toISOString().slice(0, 10));
            }}
          >
            Hoje
          </button>
          <button
            type="button"
            style={{
              ...styles.buttonSecondary,
              padding: "4px 10px",
              fontSize: 13,
            }}
            onClick={() => mudarDia(1)}
          >
            Amanhã ▶
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Filtro:</span>
          <button
            type="button"
            onClick={() => setFiltro("minhas")}
            style={{
              ...styles.buttonSecondary,
              padding: "4px 8px",
              fontSize: 12,
              ...(filtro === "minhas"
                ? { backgroundColor: "rgba(34,197,94,0.15)" }
                : {}),
            }}
          >
            Minhas
          </button>
          <button
            type="button"
            onClick={() => setFiltro("equipe")}
            style={{
              ...styles.buttonSecondary,
              padding: "4px 8px",
              fontSize: 12,
              ...(filtro === "equipe"
                ? { backgroundColor: "rgba(56,189,248,0.15)" }
                : {}),
            }}
          >
            Equipe
          </button>
          <button
            type="button"
            onClick={() => setFiltro("setor")}
            style={{
              ...styles.buttonSecondary,
              padding: "4px 8px",
              fontSize: 12,
              ...(filtro === "setor"
                ? { backgroundColor: "rgba(251,191,36,0.18)" }
                : {}),
            }}
          >
            Departamento
          </button>
        </div>
      </div>

      {/* LINHA DO TEMPO */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid #1f2937",
          background: "radial-gradient(circle at top left,#020617,#000)",
          padding: 12,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "64px minmax(0,1fr)",
            gap: 8,
          }}
        >
          {horasDia.map((hora) => {
            const itensHora = itensPorHora.get(hora) ?? [];
            return (
              <div
                key={hora}
                style={{
                  display: "contents",
                }}
              >
                <div
                  style={{
                    padding: "4px 0",
                    textAlign: "right",
                    paddingRight: 8,
                    color: "#64748b",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(hora).padStart(2, "0")}:00
                </div>
                <div
                  style={{
                    padding: "4px 0",
                    borderBottom: "1px solid #020617",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {itensHora.map((item) => {
                      const status = corStatus(item);
                      const urg = corUrgencia(item.rotina.urgencia);

                      return (
                        <div
                          key={item.rotina.id}
                          onClick={() => abrirExecucao(item.rotina)}
                          style={{
                            borderRadius: 12,
                            padding: "6px 12px",
                            background: "rgba(15,23,42,0.95)",
                            border: "1px solid #0b1120",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            cursor: "pointer",
                            transition:
                              "transform 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                              }}
                            >
                              {item.rotina.titulo}
                            </div>
                            {item.rotina.descricao && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#94a3b8",
                                }}
                              >
                                {item.rotina.descricao}
                              </div>
                            )}
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                alignItems: "center",
                                marginTop: 2,
                              }}
                            >
                              <span
                                style={{
                                  borderRadius: 999,
                                  padding: "2px 8px",
                                  fontSize: 10,
                                  background: status.bg,
                                  border: `1px solid ${status.border}`,
                                  color: status.color,
                                }}
                              >
                                {status.label}
                              </span>
                              <span
                                style={{
                                  borderRadius: 999,
                                  padding: "2px 8px",
                                  fontSize: 10,
                                  background: urg.bg,
                                  border: `1px solid ${urg.border}`,
                                  color: urg.color,
                                }}
                              >
                                Urgência: {item.rotina.urgencia ?? "baixa"}
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              textAlign: "right",
                              fontSize: 11,
                              color: "#94a3b8",
                            }}
                          >
                            <div>
                              {item.rotina.horario_inicio} •{" "}
                              {item.rotina.duracao_minutos ?? 60} min
                            </div>
                            <div>
                              {item.rotina.tem_checklist && "Checklist • "}
                              {item.rotina.tem_anexo && "Anexo"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ROTINAS SEM HORÁRIO DEFINIDO */}
        {semHorario.length > 0 && (
          <div
            style={{
              marginTop: 12,
              borderTop: "1px dashed #1f2937",
              paddingTop: 8,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 6,
              }}
            >
              Sem horário definido
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {semHorario.map((item) => {
                const status = corStatus(item);
                return (
                  <div
                    key={item.rotina.id}
                    onClick={() => abrirExecucao(item.rotina)}
                    style={{
                      borderRadius: 12,
                      padding: "6px 10px",
                      background: "rgba(15,23,42,0.85)",
                      border: "1px solid #0b1120",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {item.rotina.titulo}
                      </div>
                      {item.rotina.descricao && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#94a3b8",
                          }}
                        >
                          {item.rotina.descricao}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 10,
                          background: status.bg,
                          border: `1px solid ${status.border}`,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Tipo: {item.rotina.tipo} •{" "}
                        {item.rotina.duracao_minutos ?? 60} min
                      </div>
                    </div>
                  </div>
                );
              })}
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
            Nenhuma rotina planejada para este dia com o filtro selecionado.
          </p>
        )}

        {erro && (
          <p
            style={{
              marginTop: 12,
              fontSize: 13,
              color: "#fecaca",
            }}
          >
            {erro}
          </p>
        )}

        {loading && (
          <p
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#64748b",
            }}
          >
            Carregando agenda...
          </p>
        )}
      </div>

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
