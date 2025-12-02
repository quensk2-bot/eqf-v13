// src/components/KpiPlanejadoExecutadoN2.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Usuario } from "../types";
import { styles } from "../styles";

type Props = {
  perfil: Usuario;
};

type RotinaRow = {
  id: string;
  periodicidade: string;
  data_inicio: string;
  dia_semana: string | null;
  responsavel_id: string;
};

type ExecRow = {
  id: number;
  rotina_id: string;
  inicio_em: string | null;
  executor_id: string;
  rotinas: {
    regional_id: number | null;
  } | null;
};

type UsuarioRow = {
  id: string;
  nome: string;
};

type LinhaColab = {
  colaboradorId: string;
  nome: string;
  planejado: number;
  executado: number;
  taxa: number;
};

export function KpiPlanejadoExecutadoN2({ perfil }: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<LinhaColab[]>([]);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.regional_id]);

  const carregarDados = async () => {
    if (!perfil.regional_id) return;

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
      );

      // ROTINAS da regional (planejado) — agrupar por responsavel_id
      const { data: rotinasData, error: rotinasErr } = await supabase
        .from("rotinas")
        .select(
          "id, periodicidade, data_inicio, dia_semana, responsavel_id, regional_id"
        )
        .eq("regional_id", perfil.regional_id);

      if (rotinasErr) throw rotinasErr;

      const rotinas = (rotinasData ?? []) as RotinaRow[];

      // EXECUÇÕES da regional (executado) — agrupar por executor_id
      const { data: execData, error: execErr } = await supabase
        .from("rotina_execucoes")
        .select(
          `
          id,
          rotina_id,
          inicio_em,
          executor_id,
          rotinas!inner(regional_id)
        `
        )
        .gte("inicio_em", inicioJanela.toISOString())
        .lte("inicio_em", hoje.toISOString())
        .eq("rotinas.regional_id", perfil.regional_id);

      if (execErr) throw execErr;

      const execs = (execData ?? []) as ExecRow[];

      // PLANEJADO por colaborador
      const planejadoPorColab = new Map<string, number>();

      for (const r of rotinas) {
        const qtd = contarOcorrenciasNoPeriodo(r, inicioJanela, hoje);
        if (qtd <= 0) continue;
        planejadoPorColab.set(
          r.responsavel_id,
          (planejadoPorColab.get(r.responsavel_id) ?? 0) + qtd
        );
      }

      // EXECUTADO por colaborador (executor)
      const executadoPorColab = new Map<string, number>();

      for (const e of execs) {
        executadoPorColab.set(
          e.executor_id,
          (executadoPorColab.get(e.executor_id) ?? 0) + 1
        );
      }

      // Carrega nomes dos envolvidos (responsáveis + executores)
      const ids = new Set<string>([
        ...planejadoPorColab.keys(),
        ...executadoPorColab.keys(),
      ]);

      let usuariosMap = new Map<string, string>();

      if (ids.size > 0) {
        const idList = Array.from(ids);
        const { data: usuariosData, error: usuariosErr } = await supabase
          .from("usuarios")
          .select("id, nome")
          .in("id", idList);

        if (usuariosErr) throw usuariosErr;

        const usuarios = (usuariosData ?? []) as UsuarioRow[];
        usuariosMap = new Map(usuarios.map((u) => [u.id, u.nome]));
      }

      // Monta linhas
      const linhasArray: LinhaColab[] = [];

      for (const colabId of ids) {
        const planejado = planejadoPorColab.get(colabId) ?? 0;
        const executado = executadoPorColab.get(colabId) ?? 0;
        const taxa = planejado > 0 ? (executado / planejado) * 100 : 0;

        const nome =
          usuariosMap.get(colabId) ?? `Colaborador ${colabId.slice(0, 6)}…`;

        linhasArray.push({
          colaboradorId: colabId,
          nome,
          planejado,
          executado,
          taxa,
        });
      }

      linhasArray.sort((a, b) => b.taxa - a.taxa);

      setLinhas(linhasArray);
    } catch (e: any) {
      console.error(e);
      setErro(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        ...styles.card,
        marginBottom: 12,
        border: "1px solid rgba(59,130,246,0.4)",
        background:
          "linear-gradient(135deg, rgba(59,130,246,0.14), rgba(15,23,42,0.9))",
      }}
    >
      <h2 style={{ marginTop: 0, color: "#3b82f6" }}>
        Planejado x Executado – Regional (30 dias)
      </h2>
      <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
        Ranking por colaborador (N3) da regional
      </p>

      {erro && (
        <p style={{ color: "#fecaca", fontSize: 12, marginTop: 8 }}>
          Erro: {erro}
        </p>
      )}

      {loading ? (
        <p style={{ color: "#e5e7eb", fontSize: 13, marginTop: 8 }}>
          Carregando Planejado x Executado…
        </p>
      ) : (
        <div
          style={{
            marginTop: 10,
            borderRadius: 8,
            border: "1px solid rgba(148,163,184,0.35)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.7fr",
              background: "rgba(15,23,42,0.95)",
              padding: "6px 10px",
              fontSize: 11,
              color: "#9ca3af",
              borderBottom: "1px solid rgba(30,64,175,0.5)",
            }}
          >
            <div>Colaborador</div>
            <div style={{ textAlign: "right" }}>Planejado</div>
            <div style={{ textAlign: "right" }}>Executado</div>
            <div style={{ textAlign: "right" }}>% Cumpr.</div>
          </div>

          {linhas.length === 0 ? (
            <div
              style={{
                padding: "8px 10px",
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              Nenhum dado nos últimos 30 dias.
            </div>
          ) : (
            linhas.map((l) => (
              <div
                key={l.colaboradorId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.7fr",
                  padding: "6px 10px",
                  fontSize: 12,
                  background: "rgba(15,23,42,0.9)",
                  borderBottom: "1px solid rgba(15,23,42,0.9)",
                }}
              >
                <div style={{ color: "#e5e7eb" }}>{l.nome}</div>
                <div style={{ textAlign: "right", color: "#e5e7eb" }}>
                  {l.planejado}
                </div>
                <div style={{ textAlign: "right", color: "#e5e7eb" }}>
                  {l.executado}
                </div>
                <div
                  style={{
                    textAlign: "right",
                    color:
                      l.taxa >= 90
                        ? "#22c55e"
                        : l.taxa >= 70
                        ? "#eab308"
                        : "#f97316",
                  }}
                >
                  {l.taxa.toFixed(0)}%
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// HELPERS (mesmo conceito do N1)
// ----------------------------------------------------
function contarOcorrenciasNoPeriodo(
  rotina: RotinaRow,
  inicioJanela: Date,
  fimJanela: Date
): number {
  const dtInicioRotina = new Date(rotina.data_inicio);
  if (dtInicioRotina > fimJanela) return 0;

  let count = 0;
  for (
    let dt = new Date(inicioJanela);
    dt <= fimJanela;
    dt.setDate(dt.getDate() + 1)
  ) {
    const d = new Date(dt);
    if (d < dtInicioRotina) continue;
    if (aplicaNoDia(rotina, d)) count++;
  }
  return count;
}

function aplicaNoDia(rotina: RotinaRow, dia: Date): boolean {
  const per = (rotina.periodicidade || "").toLowerCase();

  const isoRotina = rotina.data_inicio.slice(0, 10);
  const isoDia = dia.toISOString().slice(0, 10);

  if (per.includes("avul")) {
    return isoRotina === isoDia;
  }

  if (per.includes("diar")) {
    return true;
  }

  if (per.includes("seman")) {
    if (!rotina.dia_semana) return false;
    const alvo = normalizarDiaSemana(rotina.dia_semana);
    const diaSemana = dia.getDay();
    return mapDiaSemanaPT(alvo) === diaSemana;
  }

  if (per.includes("mens")) {
    const diaInicio = new Date(rotina.data_inicio).getDate();
    return dia.getDate() === diaInicio;
  }

  return false;
}

function normalizarDiaSemana(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
