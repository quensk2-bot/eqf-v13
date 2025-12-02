// src/components/N1ListarRotinas.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Usuario } from "../types";
import type { Database } from "../types_db";
import { styles } from "../styles";
import { RotinaEditorModal } from "./RotinaEditorModal";

type RotinaRow = Database["public"]["Tables"]["rotinas"]["Row"];

type Props = {
  perfil: Usuario;
};

export function N1ListarRotinas({ perfil }: Props) {
  const [rotinas, setRotinas] = useState<RotinaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [editando, setEditando] = useState<RotinaRow | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  useEffect(() => {
    carregarRotinas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.id]);

  const carregarRotinas = async () => {
    setLoading(true);
    setErro(null);

    try {
      const { data, error } = await supabase
        .from("rotinas")
        .select("*")
        .eq("criador_id", perfil.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setErro(error.message);
        return;
      }

      setRotinas((data ?? []) as RotinaRow[]);
    } catch (e: any) {
      console.error(e);
      setErro(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm(
      "Tem certeza que deseja excluir esta rotina? Esta operação não pode ser desfeita."
    );
    if (!ok) return;

    setDeletandoId(id);
    setErro(null);

    try {
      const { error } = await supabase.from("rotinas").delete().eq("id", id);
      if (error) {
        console.error(error);
        setErro(error.message);
        return;
      }
      await carregarRotinas();
    } catch (e: any) {
      console.error(e);
      setErro(e.message ?? String(e));
    } finally {
      setDeletandoId(null);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={{ marginTop: 0 }}>Rotinas criadas por mim (N1)</h2>
      <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
        Aqui você pode visualizar, editar e excluir as rotinas que criou
        para N2 / N3.
      </p>

      {erro && (
        <p style={{ color: "#fecaca", fontSize: 12, marginTop: 8 }}>
          Erro: {erro}
        </p>
      )}

      {loading ? (
        <p style={{ color: "#e5e7eb", fontSize: 13, marginTop: 12 }}>
          Carregando rotinas…
        </p>
      ) : rotinas.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 12 }}>
          Nenhuma rotina encontrada. Crie uma rotina no painel acima.
        </p>
      ) : (
        <div
          style={{
            marginTop: 12,
            borderRadius: 8,
            border: "1px solid rgba(148,163,184,0.4)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 0.8fr 0.9fr",
              padding: "6px 10px",
              fontSize: 11,
              background: "rgba(15,23,42,0.95)",
              color: "#9ca3af",
              borderBottom: "1px solid rgba(30,64,175,0.6)",
            }}
          >
            <div>Título</div>
            <div>Periodicidade</div>
            <div>Início</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Ações</div>
          </div>

          {rotinas.map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 0.8fr 0.9fr",
                padding: "6px 10px",
                fontSize: 12,
                background: "rgba(15,23,42,0.9)",
                borderBottom: "1px solid rgba(15,23,42,0.9)",
              }}
            >
              <div style={{ color: "#e5e7eb" }}>
                <div>{r.titulo}</div>
                {r.descricao && (
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    {r.descricao}
                  </div>
                )}
              </div>

              <div style={{ color: "#e5e7eb" }}>
                {formatPeriodicidade(r.periodicidade)}
              </div>

              <div style={{ color: "#e5e7eb" }}>
                {r.data_inicio
                  ? new Date(r.data_inicio).toLocaleDateString("pt-BR")
                  : "-"}
                <br />
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                  {r.horario_inicio
                    ? r.horario_inicio.toString().slice(0, 5)
                    : "--:--"}
                </span>
              </div>

              <div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 999,
                    background:
                      r.status === "finalizada"
                        ? "rgba(22,163,74,0.2)"
                        : r.status === "em_execucao"
                        ? "rgba(59,130,246,0.2)"
                        : r.status === "cancelada"
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(148,163,184,0.15)",
                    color:
                      r.status === "finalizada"
                        ? "#22c55e"
                        : r.status === "em_execucao"
                        ? "#3b82f6"
                        : r.status === "cancelada"
                        ? "#f97373"
                        : "#e5e7eb",
                  }}
                >
                  {formatStatus(r.status)}
                </span>
              </div>

              <div
                style={{
                  textAlign: "right",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 6,
                }}
              >
                <button
                  type="button"
                  style={{
                    ...styles.smallButton,
                    fontSize: 11,
                    padding: "3px 7px",
                    background: "rgba(59,130,246,0.2)",
                    border: "1px solid rgba(59,130,246,0.7)",
                    color: "#e5e7eb",
                  }}
                  onClick={() => setEditando(r)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.smallButton,
                    fontSize: 11,
                    padding: "3px 7px",
                    background: "rgba(127,29,29,0.9)",
                    border: "1px solid rgba(248,113,113,0.7)",
                    color: "#fee2e2",
                  }}
                  disabled={deletandoId === r.id}
                  onClick={() => handleDelete(r.id)}
                >
                  {deletandoId === r.id ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edição */}
      {editando && (
        <RotinaEditorModal
          rotina={editando}
          onClose={() => setEditando(null)}
          onSaved={carregarRotinas}
        />
      )}
    </div>
  );
}

// helpers de formatação
function formatPeriodicidade(p: RotinaRow["periodicidade"]) {
  switch (p) {
    case "diaria":
      return "Diária";
    case "semanal":
      return "Semanal";
    case "mensal":
      return "Mensal";
    case "avulsa":
      return "Avulsa";
    default:
      return p;
  }
}

function formatStatus(s: RotinaRow["status"]) {
  switch (s) {
    case "pendente":
      return "Pendente";
    case "em_execucao":
      return "Em execução";
    case "finalizada":
      return "Finalizada";
    case "cancelada":
      return "Cancelada";
    default:
      return s;
  }
}
