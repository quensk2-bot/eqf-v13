// src/components/KpiPlanejadoExecutadoN3.tsx
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
};

type ExecRow = {
  id: number;
  rotina_id: string;
  inicio_em: string | null;
};

export function KpiPlanejadoExecutadoN3({ perfil }: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [planejado, setPlanejado] = useState(0);
  const [executado, setExecutado] = useState(0);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.id]);

  const carregarDados = async () => {
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

      // ROTINAS onde esse N3 é o responsável (planejado)
      const { data: rotinasData, error: rotinasErr } = await supabase
        .from("rotinas")
        .select("id, periodicidade, data_inicio, dia_semana, responsavel_id")
        .eq("responsavel_id", perfil.id);

      if (rotinasErr) throw rotinasErr;

      const rotinas = (rotinasData ?? []) as RotinaRow[];

      let totalPlanejado = 0;
      for (const r of rotinas) {
        totalPlanejado += contarOcorrenciasNoPeriodo(r, inicioJanela, hoje);
      }

      // EXECUÇÕES desse N3 como executor
      const { data: execData, error: execErr } = await supabase
        .from("rotina_execucoes")
        .select("id, rotina_id, inicio_em")
        .eq("executor_id", perfil.id)
        .gte("inicio_em", inicioJanela.toISOString())
        .lte("inicio_em", hoje.toISOString());

      if (execErr) throw execErr;

      const execs = (execData ?? []) as ExecRow[];
      const totalExecutado = execs.length;

      setPlanejado(totalPlanejado);
      setExecutado(totalExecutado);
    } catch (e: any) {
      console.error(e);
      setErro(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const taxa = planejado > 0 ? (executado / planejado) * 100 : 0;

  return (
    <div
      style={{
        ...styles.card,
        marginBottom: 12,
        border: "1px solid rgba(249,115,22,0.4)",
        background:
          "linear-gradient(135deg, rgba(249,115,22,0.14), rgba(15,23,42,0.9))",
      }}
    >
      <h2 style={{ marginTop: 0, color: "#f97316" }}>
        Meu Planejado x Executado (30 dias)
      </h2>
      <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
        Rotinas que foram agendadas para você vs execuções registradas
      </p>

      {erro && (
        <p style={{ color: "#fecaca", fontSize: 12, marginTop: 8 }}>
          Erro: {erro}
        </p>
      )}

      {loading ? (
        <p style={{ color: "#e5e7eb", fontSize: 13, marginTop: 8 }}>
          Carregando dados…
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            marginTop: 10,
          }}
        >
          <KpiBox titulo="Planejado (30 dias)" valor={planejado.toString()} />
          <KpiBox titulo="Executado (30 dias)" valor={executado.toString()} />
          <KpiBox
            titulo="% Cumprimento"
            valor={planejado > 0 ? taxa.toFixed(0) + "%" : "-"}
            highlight
          />
        </div>
      )}
    </div>
  );
}

type KpiBoxProps = {
  titulo: string;
  valor: string;
  highlight?: boolean;
};

function KpiBox({ titulo, valor, highlight }: KpiBoxProps) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: highlight
          ? "1px solid rgba(249,115,22,0.8)"
          : "1px solid rgba(148,163,184,0.4)",
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

// -----------------------------------
// HELPERS
// -----------------------------------
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
