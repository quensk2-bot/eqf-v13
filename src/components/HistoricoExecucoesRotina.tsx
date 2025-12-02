// src/components/HistoricoExecucoesRotina.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Execucao = {
  id: number;
  rotina_id: string;
  executor_id: string;
  inicio_em: string | null;
  finalizado_em: string | null;
  duracao_total_segundos: number | null;
  observacoes: string | null;
};

type Props = {
  rotinaId: string;
};

function formatarDataHora(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

function formatarDuracao(seg: number | null) {
  if (!seg || seg <= 0) return "-";
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function HistoricoExecucoesRotina({ rotinaId }: Props) {
  const [lista, setLista] = useState<Execucao[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setErro(null);
    const { data, error } = await supabase
      .from("rotina_execucoes")
      .select("*")
      .eq("rotina_id", rotinaId)
      .order("inicio_em", { ascending: false });

    if (error) {
      console.error(error);
      setErro("Erro ao carregar histórico.");
      return;
    }

    setLista((data ?? []) as Execucao[]);
  };

  useEffect(() => {
    if (!rotinaId) return;
    carregar();
  }, [rotinaId]);

  if (erro) {
    return (
      <div style={{ fontSize: 12, color: "#fecaca" }}>
        {erro}
      </div>
    );
  }

  if (lista.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "#9ca3af" }}>
        Nenhuma execução registrada ainda.
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12, color: "#e5e7eb" }}>
      {lista.map((e) => (
        <div
          key={e.id}
          style={{
            padding: "4px 0",
            borderBottom: "1px solid #111827",
          }}
        >
          <div>
            <strong>Execução #{e.id}</strong> • Início:{" "}
            {formatarDataHora(e.inicio_em)} • Fim:{" "}
            {formatarDataHora(e.finalizado_em)}
          </div>
          <div>
            Duração: {formatarDuracao(e.duracao_total_segundos)}
          </div>
          {e.observacoes && (
            <div style={{ color: "#9ca3af" }}>
              Obs.: {e.observacoes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
