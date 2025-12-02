// src/components/KpiPlanejadoExecutadoN1.tsx
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
  regional_id: number | null;
};

type ExecRow = {
  id: number;
  rotina_id: string;
  inicio_em: string | null;
  rotinas: {
    regional_id: number | null;
    setor_id: number | null;
  } | null;
};

type LinhaRegional = {
  regionalId: number | null;
  nome: string;
  planejado: number;
  executado: number;
  taxa: number;
};

export function KpiPlanejadoExecutadoN1({ perfil }: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<LinhaRegional[]>([]);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.setor_id]);

  const carregarDados = async () => {
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
      );

      // ROTINAS (planejado) do setor
      const { data: rotinasData, error: rotinasErr } = await supabase
        .from("rotinas")
        .select(
          "id, periodicidade, data_inicio, dia_semana, regional_id, setor_id"
        )
        .eq("setor_id", perfil.setor_id);

      if (rotinasErr) throw rotinasErr;

      const rotinas = (rotinasData ?? []) as RotinaRow[];

      // EXECUÇÕES (executado) dos últimos 30 dias, setor do N1
      const { data: execData, error: execErr } = await supabase
        .from("rotina_execucoes")
        .select(
          `
          id,
          rotina_id,
          inicio_em,
          rotinas!inner(regional_id,setor_id)
        `
        )
        .gte("inicio_em", inicioJanela.toISOString())
        .lte("inicio_em", hoje.toISOString())
        .eq("rotinas.setor_id", perfil.setor_id);

      if (execErr) throw execErr;

      const execs = (execData ?? []) as ExecRow[];

      // ---- PLANEJADO por regional ----
      const planejadoPorRegional = new Map<number | null, number>();

      for (const r of rotinas) {
        const qtd = contarOcorrenciasNoPeriodo(r, inicioJanela, hoje);
        if (qtd <= 0) continue;
        const key = r.regional_id ?? null;
        planejadoPorRegional.set(
          key,
          (planejadoPorRegional.get(key) ?? 0) + qtd
        );
      }

      // ---- EXECUTADO por regional ----
      const executadoPorRegional = new Map<number | null, number>();

      for (const e of execs) {
        const regId = e.rotinas?.regional_id ?? null;
        executadoPorRegional.set(
          regId,
          (executadoPorRegional.get(regId) ?? 0) + 1
        );
      }

      // ---- Monta linhas para tabela ----
      const keys = new Set<number | null>([
        ...planejadoPorRegional.keys(),
        ...executadoPorRegional.keys(),
      ]);

      const linhasArray: LinhaRegional[] = [];

      for (const regId of keys) {
        const planejado = planejadoPorRegional.get(regId) ?? 0;
        const executado = executadoPorRegional.get(regId) ?? 0;
        const taxa = planejado > 0 ? (executado / planejado) * 100 : 0;

        linhasArray.push({
          regionalId: regId,
          nome: regId === null ? "Sem regional" : `Regional ${regId}`,
          planejado,
          executado,
          taxa,
        });
      }

      // ordena do melhor para o pior desempenho
      linhasArray.sort((a, b) => b.taxa - a.taxa);

      setLinhas(linhasArray);
    } catch (e: any) {
      console.error(e);
      setErro(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  // Se o usuário N1 não estiver vinculado a um setor, não faz sentido mostrar ranking
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
        <h2 style={{ marginTop: 0, color: "#22c55e" }}>
          Planejado x Executado – Setor (30 dias)
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
          Vincule o gerente N1 a um setor para visualizar o comparativo por
          regional.
        </p>
      </div>
    );
  }

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
      <h2 style={{ marginTop: 0, color: "#22c55e" }}>
        Planejado x Executado – Regionais do setor (30 dias)
      </h2>
      <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
        Visão nacional para o gerente N1: desempenho por regional, com base em
        rotinas planejadas x execuções realizadas nos últimos 30 dias.
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
          {/* Cabeçalho da tabela */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.4fr 1.5fr 0.7fr 0.7fr 0.7fr",
              background: "rgba(15,23,42,0.95)",
              padding: "6px 10px",
              fontSize: 11,
              color: "#9ca3af",
              borderBottom: "1px solid rgba(30,64,175,0.5)",
            }}
          >
            <div>Rank</div>
            <div>Regional</div>
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
                background: "rgba(15,23,42,0.9)",
              }}
            >
              Nenhum dado nos últimos 30 dias.
            </div>
          ) : (
            linhas.map((l, idx) => {
              const rank = idx + 1;
              const isTop = rank === 1;

              return (
                <div
                  key={l.regionalId ?? `null-${idx}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "0.4fr 1.5fr 0.7fr 0.7fr 0.7fr",
                    padding: "6px 10px",
                    fontSize: 12,
                    background: isTop
                      ? "linear-gradient(90deg, rgba(22,163,74,0.35), rgba(15,23,42,0.9))"
                      : idx % 2 === 0
                      ? "rgba(15,23,42,0.9)"
                      : "rgba(15,23,42,0.7)",
                  }}
                >
                  <div
                    style={{
                      color: isTop ? "#22c55e" : "#e5e7eb",
                      fontWeight: isTop ? 600 : 400,
                    }}
                  >
                    {rank}º
                  </div>
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
                      fontWeight: isTop ? 600 : 400,
                    }}
                  >
                    {l.taxa.toFixed(0)}%
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// HELPERS
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
    const diaSemana = dia.getDay(); // 0 = domingo
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
  // 0=domingo ... 6=sabado
  if (dia.includes("domingo")) return 0;
  if (dia.includes("segunda")) return 1;
  if (dia.includes("terca") || dia.includes("terça")) return 2;
  if (dia.includes("quarta")) return 3;
  if (dia.includes("quinta")) return 4;
  if (dia.includes("sexta")) return 5;
  if (dia.includes("sabado") || dia.includes("sábado")) return 6;

  // fallback
  return 0;
}
