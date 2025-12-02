// src/components/RotinaEditorModal.tsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Database } from "../types_db";
import { styles } from "../styles";

type RotinaRow = Database["public"]["Tables"]["rotinas"]["Row"];

type Props = {
  rotina: RotinaRow;
  onClose: () => void;
  onSaved: () => void;
};

export function RotinaEditorModal({ rotina, onClose, onSaved }: Props) {
  const [titulo, setTitulo] = useState(rotina.titulo ?? "");
  const [descricao, setDescricao] = useState(rotina.descricao ?? "");
  const [periodicidade, setPeriodicidade] = useState(rotina.periodicidade);
  const [dataInicio, setDataInicio] = useState(
    rotina.data_inicio ? rotina.data_inicio.toString().slice(0, 10) : ""
  );
  const [horarioInicio, setHorarioInicio] = useState(
    rotina.horario_inicio ? rotina.horario_inicio.toString().slice(0, 5) : ""
  );
  const [duracaoMinutos, setDuracaoMinutos] = useState(
    rotina.duracao_minutos ?? 60
  );
  const [urgencia, setUrgencia] = useState(rotina.urgencia);
  const [temChecklist, setTemChecklist] = useState(rotina.tem_checklist);
  const [temAnexo, setTemAnexo] = useState(rotina.tem_anexo);
  const [status, setStatus] = useState(rotina.status);

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setErro(null);

    try {
      const payload = {
        titulo,
        descricao,
        periodicidade,
        data_inicio: dataInicio || rotina.data_inicio,
        horario_inicio: horarioInicio ? `${horarioInicio}:00` : rotina.horario_inicio,
        duracao_minutos: duracaoMinutos || rotina.duracao_minutos,
        urgencia,
        tem_checklist: temChecklist,
        tem_anexo: temAnexo,
        status,
      };

      const { error } = await supabase
        .from("rotinas")
        .update(payload)
        .eq("id", rotina.id);

      if (error) {
        console.error("Erro ao atualizar rotina:", error);
        setErro(error.message);
        return;
      }

      onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      setErro(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
      }}
    >
      <div
        style={{
          ...styles.card,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Editar rotina</h2>
        <p style={{ fontSize: 12, color: "#9ca3af" }}>
          ID: <code>{rotina.id}</code>
        </p>

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <div>
            <label style={styles.label}>Título</label>
            <input
              style={styles.input}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div>
            <label style={styles.label}>Descrição</label>
            <textarea
              style={{ ...styles.input, minHeight: 60 }}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={styles.label}>Periodicidade</label>
              <select
                style={styles.input}
                value={periodicidade}
                onChange={(e) =>
                  setPeriodicidade(e.target.value as RotinaRow["periodicidade"])
                }
              >
                <option value="diaria">Diária</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
                <option value="avulsa">Avulsa</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Urgência</label>
              <select
                style={styles.input}
                value={urgencia}
                onChange={(e) =>
                  setUrgencia(e.target.value as RotinaRow["urgencia"])
                }
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={styles.label}>Data de início</label>
              <input
                type="date"
                style={styles.input}
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div>
              <label style={styles.label}>Horário</label>
              <input
                type="time"
                style={styles.input}
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={styles.label}>Duração (minutos)</label>
            <input
              type="number"
              min={5}
              step={5}
              style={styles.input}
              value={duracaoMinutos}
              onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <label style={{ fontSize: 13, color: "#e5e7eb" }}>
              <input
                type="checkbox"
                checked={temChecklist}
                onChange={(e) => setTemChecklist(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Tem checklist
            </label>
            <label style={{ fontSize: 13, color: "#e5e7eb" }}>
              <input
                type="checkbox"
                checked={temAnexo}
                onChange={(e) => setTemAnexo(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Tem anexo obrigatório
            </label>
          </div>

          <div>
            <label style={styles.label}>Status</label>
            <select
              style={styles.input}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as RotinaRow["status"])
              }
            >
              <option value="pendente">Pendente</option>
              <option value="em_execucao">Em execução</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          {erro && (
            <div
              style={{
                background: "#450a0a",
                borderLeft: "3px solid #f87171",
                padding: "6px 8px",
                fontSize: 12,
                color: "#fecaca",
                borderRadius: 6,
              }}
            >
              {erro}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 6,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                ...styles.button,
                background: "#111827",
                color: "#e5e7eb",
              }}
              disabled={saving}
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                ...styles.button,
                background: saving
                  ? "#4b5563"
                  : "linear-gradient(90deg,#22c55e,#a3e635)",
                color: "#000",
              }}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
