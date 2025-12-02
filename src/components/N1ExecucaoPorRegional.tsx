// -----------------------------------------------
// N1ExecucaoPorRegional.tsx – Versão Final EQF V13
// -----------------------------------------------

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Usuario } from "../types";
import { styles } from "../styles";

// --------------------------------------------------
// TIPOS
// --------------------------------------------------
type Props = {
  perfil: Usuario;
};

type RotinaRow = {
  id: string;
  titulo: string;
  periodicidade: string;
  data_inicio: string;
  dia_semana: string | null;
  horario_inicio: string | null;
  regional_id: number | null;
  setor_id: number | null;
};

type ExecRow = {
  id: number;
  rotina_id: string;
  executor_id: string | null;
  inicio_em: string | null;
  finalizado_em: string | null;
};

type UsuarioRow = {
  id: string;
  nome: string;
  nivel: string;
  setor_id: number | null;
  regional_id: number | null;
  ativo: boolean;
};

type RegionalRow = {
  id: number;
  nome: string | null;
  sigla: string | null;
};

type StatusExecucao = "Pendente" | "Em execução" | "Concluída";

type RotinaDetalhe = {
  id: string;
  titulo: string;
  horario: string;
  status: StatusExecucao;
  responsavel: string;
  executores: string[];
};

type RegionalDetalhe = {
  id: number | null;
  nome: string;
  rotinas: RotinaDetalhe[];
};

// --------------------------------------------------
// COMPONENTE PRINCIPAL
// --------------------------------------------------
export function N1ExecucaoPorRegional({ perfil }: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dataRef, setDataRef] = useState<Date>(normalizarDia(new Date()));
  const [regionais, setRegionais] = useState<RegionalDetalhe[]>([]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.setor_id, dataRef]);

  const alterarDia = (delta: number) => {
    setDataRef((old) => normalizarDia(addDays(old, delta)));
  };

  // --------------------------------------------------
  // FUNÇÃO PRINCIPAL DE CARGA
  // --------------------------------------------------
  const carregar = async () => {
    if (!perfil.setor_id) return;

    setLoading(true);
    setErro(null);

    try {
      const inicio = inicioDoDia(dataRef);
      const fim = fimDoDia(dataRef);

      // 1) Carregar regionais do setor
      const { data: regData, error: regErr } = await supabase
        .from("regionais")
        .select("id, nome, sigla")
        .eq("setor_id", perfil.setor_id);

      if (regErr) throw regErr;
      const regionaisRaw = (regData ?? []) as RegionalRow[];

      // 2) Carregar usuários N2 e N3 do setor
      const { data: usuData, error: usuErr } = await supabase
        .from("usuarios")
        .select("id, nome, nivel, setor_id, regional_id, ativo")
        .eq("setor_id", perfil.setor_id)
        .eq("ativo", true)
        .in("nivel", ["N2", "N3"]);

      if (usuErr) throw usuErr;
      const usuarios = (usuData ?? []) as UsuarioRow[];

      // 3) Carregar rotinas
      const { data: rotData, error: rotErr } = await supabase
        .from("rotinas")
        .select(
          "id, titulo, periodicidade, data_inicio, dia_semana, horario_inicio, regional_id, setor_id"
        )
        .eq("setor_id", perfil.setor_id);

      if (rotErr) throw rotErr;

      const rotinas = (rotData ?? []) as RotinaRow[];

      // 4) Execuções do dia
      const { data: execData, error: execErr } = await supabase
        .from("rotina_execucoes")
        .select("id, rotina_id, executor_id, inicio_em, finalizado_em")
        .gte("inicio_em", inicio.toISOString())
        .lte("inicio_em", fim.toISOString());

      if (execErr) throw execErr;
      const execs = (execData ?? []) as ExecRow[];

      // --------------------------------------------------
      // INDEXAÇÃO
      // --------------------------------------------------

      // Execuções por rotina
      const execPorRotina = new Map<string, ExecRow[]>();
      for (const e of execs) {
        const lista = execPorRotina.get(e.rotina_id) ?? [];
        lista.push(e);
        execPorRotina.set(e.rotina_id, lista);
      }

      // Filtrar rotinas que acontecem no dia
      const rotinasHoje = rotinas.filter((r) => aplicaNoDia(r, dataRef));

      // Agrupar por regional
      const mapaRegional = new Map<number | null, RotinaDetalhe[]>();

      for (const rotina of rotinasHoje) {
        const regId = rotina.regional_id ?? null;

        // RESPONSÁVEL N2
        const responsavelN2 =
          usuarios.find(
            (u) =>
              u.nivel === "N2" && u.regional_id === regId && u.ativo === true
          )?.nome || "Responsável N2 não encontrado";

        // EXECUTORES (N3)
        const execList = execPorRotina.get(rotina.id) ?? [];
        const executores = execList
          .map((e) => {
            const user = usuarios.find((u) => u.id === e.executor_id);
            return user?.nome ?? null;
          })
          .filter((x) => x !== null) as string[];

        // STATUS
        let status: StatusExecucao = "Pendente";
        const temConcluida = execList.some((e) => e.finalizado_em !== null);
        const temInicio = execList.some((e) => e.inicio_em !== null);

        if (temConcluida) status = "Concluída";
        else if (temInicio) status = "Em execução";

        const detalhe: RotinaDetalhe = {
          id: rotina.id,
          titulo: rotina.titulo,
          horario: rotina.horario_inicio?.slice(0, 5) ?? "--:--",
          status,
          responsavel: responsavelN2,
          executores,
        };

        const atual = mapaRegional.get(regId) ?? [];
        atual.push(detalhe);
        mapaRegional.set(regId, atual);
      }

      // Montar resultado final
      const listaRegionais: RegionalDetalhe[] = [];

      // Regionais cadastradas
      for (const reg of regionaisRaw) {
        listaRegionais.push({
          id: reg.id,
          nome:
            (reg.sigla ? reg.sigla + " – " : "") +
            (reg.nome || `Regional ${reg.id}`),
          rotinas: ordenarRotinas(mapaRegional.get(reg.id) ?? []),
        });
      }

      // Rotinas sem regional
      if (mapaRegional.has(null)) {
        listaRegionais.push({
          id: null,
          nome: "Sem regional",
          rotinas: ordenarRotinas(mapaRegional.get(null) ?? []),
        });
      }

      // Ordenar regionais pelo nome
      listaRegionais.sort((a, b) => a.nome.localeCompare(b.nome));

      setRegionais(listaRegionais);
    } catch (e: any) {
      setErro(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // RENDERIZAÇÃO
  // --------------------------------------------------
  if (!perfil.setor_id) {
    return (
      <div style={styles.card}>
        <h2 style={{ color: "#22c55e" }}>Execução por regional</h2>
        <p>Associe um setor ao N1.</p>
      </div>
    );
  }

  const labelDia = formatarData(dataRef);

  return (
    <div
      style={{
        ...styles.card,
        border: "1px solid rgba(34,197,94,0.4)",
        background:
          "linear-gradient(135deg, rgba(22,163,74,0.1), rgba(15,23,42,0.96))",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#22c55e" }}>
            Execução por regional – {labelDia}
          </h2>
          <p style={{ fontSize: 11, color: "#9ca3af" }}>
            Todas as rotinas do setor, por regional — com responsável (N2) e
            executor(es) N3.
          </p>
        </div>

        {/* Botões de navegação da data */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => alterarDia(-1)}
            style={btnMini()}
          >
            ◀ Ontem
          </button>
          <button
            onClick={() => alterarDia(1)}
            style={btnMini()}
          >
            Amanhã ▶
          </button>
        </div>
      </div>

      {erro && <p style={{ color: "tomato" }}>{erro}</p>}
      {loading && <p>Carregando…</p>}

      {/* GRID DE REGIONAIS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {regionais.map((reg) => (
          <div
            key={reg.id ?? "null"}
            style={{
              background: "rgba(15,23,42,0.92)",
              border: "1px solid rgba(148,163,184,0.25)",
              padding: 10,
              borderRadius: 12,
            }}
          >
            <h3 style={{ margin: 0, color: "#e5e7eb", fontSize: 14 }}>
              {reg.nome}
            </h3>
            <p style={{ color: "#9ca3af", fontSize: 12 }}>
              {reg.rotinas.length} rotina(s)
            </p>

            {reg.rotinas.length === 0 ? (
              <p style={{ fontSize: 12, color: "#94a3b8" }}>
                Nenhuma rotina para esta regional.
              </p>
            ) : (
              reg.rotinas.map((r) => (
                <div
                  key={r.id}
                  style={{
                    marginTop: 6,
                    padding: 8,
                    borderRadius: 10,
                    border: borderStatus(r.status),
                    background: fundoStatus(r.status),
                  }}
                >
                  <div style={{ fontSize: 13, color: "#e5e7eb" }}>
                    {r.titulo}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginTop: 2,
                    }}
                  >
                    ⏰ Horário: {r.horario}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginTop: 2,
                    }}
                  >
                    📍 Responsável: {r.responsavel}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginTop: 2,
                    }}
                  >
                    👤 Executor(es):{" "}
                    {r.executores.length > 0
                      ? r.executores.join(", ")
                      : "—"}
                  </div>
                  <StatusPill status={r.status} />
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------
// STATUS PILL
// --------------------------------------------------
function StatusPill({ status }: { status: StatusExecucao }) {
  const color =
    status === "Concluída"
      ? "#22c55e"
      : status === "Em execução"
      ? "#eab308"
      : "#94a3b8";

  return (
    <div
      style={{
        marginTop: 4,
        fontSize: 10,
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        color,
        border: `1px solid ${color}`,
      }}
    >
      {status}
    </div>
  );
}

// --------------------------------------------------
// HELPERS DE DATA / RECORRÊNCIA
// --------------------------------------------------
function normalizarDia(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatarData(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}/${(
    d.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}`;
}

function inicioDoDia(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function fimDoDia(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function ordenarRotinas(lista: RotinaDetalhe[]) {
  return [...lista].sort((a, b) => a.horario.localeCompare(b.horario));
}

// Recorrência igual ao KpiPlanejadoExecutadoN1
function aplicaNoDia(rotina: RotinaRow, dia: Date) {
  const per = rotina.periodicidade.toLowerCase();
  const isoRotina = rotina.data_inicio.slice(0, 10);
  const isoDia = dia.toISOString().slice(0, 10);

  if (per.includes("avul")) return isoRotina === isoDia;
  if (per.includes("diar")) return new Date(isoDia) >= new Date(isoRotina);

  if (per.includes("seman")) {
    if (!rotina.dia_semana) return false;
    const alvo = rotina.dia_semana.toLowerCase();
    const dSemana = dia.getDay();
    return mapDiaSemanaPT(alvo) === dSemana;
  }

  if (per.includes("mens")) {
    const diaInicio = new Date(rotina.data_inicio).getDate();
    return dia.getDate() === diaInicio;
  }

  return true;
}

function mapDiaSemanaPT(dia: string): number {
  if (dia.includes("domingo")) return 0;
  if (dia.includes("segunda")) return 1;
  if (dia.includes("terca") || dia.includes("terça")) return 2;
  if (dia.includes("quarta")) return 3;
  if (dia.includes("quinta")) return 4;
  if (dia.includes("sexta")) return 5;
  if (dia.includes("sabado") || dia.includes("sábado")) return 6;
  return 0;
}

// --------------------------------------------------
function btnMini() {
  return {
    padding: "4px 10px",
    background: "rgba(15,23,42,0.9)",
    border: "1px solid #334155",
    color: "#e5e7eb",
    borderRadius: 999,
    fontSize: 11,
    cursor: "pointer",
  };
}

function borderStatus(status: StatusExecucao) {
  if (status === "Concluída") return "1px solid rgba(34,197,94,0.6)";
  if (status === "Em execução") return "1px solid rgba(250,204,21,0.6)";
  return "1px solid rgba(148,163,184,0.4)";
}

function fundoStatus(status: StatusExecucao) {
  if (status === "Concluída")
    return "linear-gradient(90deg, rgba(22,163,74,0.25), rgba(15,23,42,1))";
  if (status === "Em execução")
    return "linear-gradient(90deg, rgba(234,179,8,0.25), rgba(15,23,42,1))";
  return "rgba(15,23,42,0.96)";
}
