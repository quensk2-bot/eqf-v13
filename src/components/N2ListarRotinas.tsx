// src/components/N2ListarRotinas.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { styles, theme } from "../styles";
import type { Usuario } from "../types";
import { ExecucaoModal } from "./ExecucaoModal";

type DiaSemana = "seg" | "ter" | "qua" | "qui" | "sex" | "sab";

type Rotina = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: "normal" | "operacional";
  periodicidade: "diaria" | "semanal" | "mensal";
  duracao_minutos: number;
  prioridade: "BAIXA" | "MEDIA" | "ALTA" | string | null;
  data_inicio: string; // YYYY-MM-DD
  horario_inicio: string | null; // HH:mm:ss
  dia_semana: DiaSemana | "dom" | null;
  regional_id: number | null;
  setor_id: number | null;
  departamento_id: number | null;
  status_execucao?: "pendente" | "em_andamento" | "concluida" | "atrasada" | string | null;
  status?: "pendente" | "em_andamento" | "concluida" | "atrasada" | string | null;
};

const diaSemanaCode = (date: Date): DiaSemana | "dom" => {
  const map = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
  return map[date.getDay()];
};

const ymdLocal = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatHora = (hhmmss?: string | null) => {
  if (!hhmmss) return "-";
  return hhmmss.slice(0, 5); // HH:mm
};

const labelPeriodicidade = (p: Rotina["periodicidade"]) => {
  if (p === "diaria") return "Diária";
  if (p === "semanal") return "Semanal";
  if (p === "mensal") return "Mensal";
  return p;
};

const isRotinaParaHoje = (r: Rotina, hoje: Date) => {
  const hojeYMD = ymdLocal(hoje);

  if (r.data_inicio && r.data_inicio > hojeYMD) return false;

  if (r.periodicidade === "diaria") return true;

  if (r.periodicidade === "semanal") {
    const dw = diaSemanaCode(hoje);
    if (!r.dia_semana) return false;
    return r.dia_semana === dw;
  }

  if (r.periodicidade === "mensal") {
    if (!r.data_inicio) return false;
    const inicio = new Date(r.data_inicio);
    return inicio.getDate() === hoje.getDate();
  }

  return false;
};

const labelStatus = (
  status?: Rotina["status"] | Rotina["status_execucao"]
) => {
  if (!status) return "Pendente";
  if (status === "pendente") return "Pendente";
  if (status === "em_andamento") return "Em andamento";
  if (status === "concluida") return "Concluída";
  if (status === "atrasada") return "Atrasada";
  return status;
};

const getStatusInfo = (r: Rotina, hoje: Date) => {
  const label = labelStatus(r.status_execucao ?? r.status);
  let color = "#6b7280";

  if (label === "Pendente") color = "#e5e7eb";
  if (label === "Em andamento") color = "#22c55e";
  if (label === "Concluída") color = "#38bdf8";
  if (label === "Atrasada") color = "#f97316";

  if (label === "Pendente" && isRotinaParaHoje(r, hoje)) {
    color = "#facc15";
  }

  return { label, color };
};

export function N2ListarRotinas({ perfil }: { perfil: Usuario | null }) {
  const regionalId = perfil?.regional_id ?? null;

  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [mostrarSomenteHoje, setMostrarSomenteHoje] = useState(true);

  // controle do modal de execução
  const [rotinaExecucaoId, setRotinaExecucaoId] = useState<string | null>(
    null
  );
  const [mostrarModalExecucao, setMostrarModalExecucao] = useState(false);

  const carregarRotinas = async () => {
    if (!regionalId) {
      setRotinas([]);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("rotinas")
      .select(
        `
        id,
        titulo,
        descricao,
        tipo,
        periodicidade,
        duracao_minutos,
        prioridade,
        data_inicio,
        horario_inicio,
        dia_semana,
        regional_id,
        setor_id,
        departamento_id,
        status
      `
      )
      .eq("regional_id", regionalId)
      .order("data_inicio", { ascending: true })
      .order("horario_inicio", { ascending: true });

    if (error) {
      console.error("Erro ao carregar rotinas nível 2:", error.message);
      setErrorMsg(error.message);
      setRotinas([]);
    } else {
      setRotinas((data ?? []) as Rotina[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    carregarRotinas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionalId]);

  const hoje = useMemo(() => new Date(), []);
  const hojeYMD = ymdLocal(hoje);

  const rotinasFiltradas = useMemo(() => {
    if (!mostrarSomenteHoje) return rotinas;
    return rotinas.filter((r) => isRotinaParaHoje(r, hoje));
  }, [rotinas, mostrarSomenteHoje, hoje]);

  return (
    <section
      style={{
        borderRadius: 18,
        border: `1px solid ${theme.colors.neon}`,
        padding: 16,
        background:
          "radial-gradient(circle at top left, rgba(249,115,22,0.25), rgba(2,6,23,0.96))",
        boxShadow: "0 0 26px rgba(34,197,94,0.28)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              color: "#f9fafb",
            }}
          >
            Rotinas da Regional (N2)
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#e5e7eb",
              opacity: 0.85,
            }}
          >
            Visão geral das rotinas cadastradas para a sua regional.{" "}
            <span style={{ color: theme.colors.neon }}>
              Hoje: {hojeYMD.split("-").reverse().join("/")}
            </span>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#cbd5e1",
            }}
          >
            <input
              type="checkbox"
              checked={mostrarSomenteHoje}
              onChange={(e) => setMostrarSomenteHoje(e.target.checked)}
            />
            Mostrar apenas rotinas de hoje
          </label>

          <button
            type="button"
            onClick={carregarRotinas}
            style={{
              ...styles.buttonSecondary,
              padding: "4px 10px",
              fontSize: 12,
            }}
          >
            Recarregar
          </button>
        </div>
      </div>

      {loading && (
        <p style={{ color: "#cbd5e1", fontSize: 13 }}>Carregando...</p>
      )}
      {errorMsg && (
        <p style={{ color: "#f97373", fontSize: 13 }}>{errorMsg}</p>
      )}

      {!loading && rotinasFiltradas.length === 0 && (
        <p style={{ color: "#9ca3af", fontSize: 13 }}>
          Nenhuma rotina encontrada para esta regional.
        </p>
      )}

      {!loading && rotinasFiltradas.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              color: "#e5e7eb",
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "linear-gradient(90deg,#020617,#0b1120,#020617)",
                }}
              >
                {[
                  "Data",
                  "Horário",
                  "Título",
                  "Tipo",
                  "Periodicidade",
                  "Duração (min)",
                  "Prioridade",
                  "Status",
                  "Ações",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      borderBottom: "1px solid #1f2933",
                      color: "#9ca3af",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rotinasFiltradas.map((r) => {
                const st = getStatusInfo(r, hoje);
                return (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: "1px solid #0f172a",
                      background:
                        "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
                    }}
                  >
                    <td
                      style={{
                        padding: "6px 10px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.data_inicio}
                    </td>
                    <td
                      style={{
                        padding: "6px 10px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatHora(r.horario_inicio)}
                    </td>
                    <td style={{ padding: "6px 10px" }}>{r.titulo}</td>
                    <td style={{ padding: "6px 10px" }}>{r.tipo}</td>
                    <td style={{ padding: "6px 10px" }}>
                      {labelPeriodicidade(r.periodicidade)}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      {r.duracao_minutos}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      {r.prioridade ?? "-"}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: st.color,
                            display: "inline-block",
                            boxShadow: `0 0 6px ${st.color}`,
                          }}
                        />
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      <button
                        type="button"
                        style={{
                          ...styles.button,
                          padding: "4px 10px",
                          fontSize: 11,
                          background:
                            "linear-gradient(90deg,#22c55e,#bbf7d0)",
                          color: "#000",
                        }}
                        onClick={() => {
                          setRotinaExecucaoId(r.id);
                          setMostrarModalExecucao(true);
                        }}
                      >
                        Executar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {perfil && rotinaExecucaoId && (
        <ExecucaoModal
          open={mostrarModalExecucao}
          rotinaId={rotinaExecucaoId}
          perfil={perfil}
          onClose={() => {
            setMostrarModalExecucao(false);
            setRotinaExecucaoId(null);
            carregarRotinas();
          }}
        />
      )}
    </section>
  );
}
