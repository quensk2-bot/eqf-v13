// src/components/N3CriarRotinaAvulsa.tsx
import type React from "react";
import type { FormEvent } from "react";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Usuario } from "../types";
import { styles, theme } from "../styles";

type Props = {
  perfil: Usuario | null;
};

type Urgencia = "alta" | "media" | "baixa";

const headerStyles: Record<string, React.CSSProperties> = {
  pageCard: {
    borderRadius: 24,
    border: `2px solid ${theme.colors.orangeSoft}`,
    background: theme.colors.bgElevated,
    boxShadow: "0 32px 80px rgba(0,0,0,0.85)",
    padding: "16px 18px",
    marginBottom: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  pageTextBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  pagePill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.colors.orangeSoft,
    background: "rgba(249,115,22,0.14)",
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 600,
  },
  pageSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
};

type ChecklistItemForm = {
  id: number;
  descricao: string;
};

export function N3CriarRotinaAvulsa({ perfil }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState<string>(() => {
    const hoje = new Date();
    return hoje.toISOString().slice(0, 10);
  });
  const [horario, setHorario] = useState("08:00");
  const [duracaoMin, setDuracaoMin] = useState("30");
  const [urgencia, setUrgencia] = useState<Urgencia>("baixa");
  const [temChecklist, setTemChecklist] = useState(false);
  const [temAnexo, setTemAnexo] = useState(false);

  const [checklistDescricao, setChecklistDescricao] = useState("");
  const [checklistItens, setChecklistItens] = useState<ChecklistItemForm[]>(
    []
  );

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  const addChecklistItem = () => {
    if (!checklistDescricao.trim()) return;
    setChecklistItens((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        descricao: checklistDescricao.trim(),
      },
    ]);
    setChecklistDescricao("");
  };

  const removeChecklistItem = (id: number) => {
    setChecklistItens((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setDetails(null);

    if (!perfil) {
      setStatusMsg("❌ Perfil não carregado. Faça login novamente.");
      return;
    }

    if (!titulo.trim()) {
      setStatusMsg("⚠️ Informe um título para a rotina.");
      return;
    }

    try {
      const duracao = parseInt(duracaoMin || "0", 10);
      if (!horario) {
        setStatusMsg("⚠️ Defina um horário para a rotina.");
        return;
      }

      const payloadRotina = {
        tipo: "avulsa",
        periodicidade: "diaria",
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        criador_id: perfil.id,
        responsavel_id: perfil.id,
        departamento_id: perfil.departamento_id,
        setor_id: perfil.setor_id,
        regional_id: perfil.regional_id,
        data_inicio: data,
        horario_inicio: horario,
        duracao_minutos: Number.isNaN(duracao) ? 0 : duracao,
        urgencia,
        tem_checklist: temChecklist,
        tem_anexo: temAnexo,
        status: "pendente",
      };

      const { data: rotina, error } = await supabase
        .from("rotinas")
        .insert(payloadRotina)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Erro ao criar rotina avulsa N3:", error);
        setStatusMsg("❌ Erro ao criar rotina avulsa.");
        setDetails(JSON.stringify(error, null, 2));
        return;
      }

      if (!rotina) {
        setStatusMsg("❌ Não foi possível obter a rotina criada.");
        return;
      }

      if (temChecklist && checklistItens.length > 0) {
        const rows = checklistItens.map((item, idx) => ({
          rotina_id: rotina.id,
          ordem: idx + 1,
          descricao: item.descricao,
          obrigatorio: true,
          exige_anexo: false,
          tipo_valor: null,
          valor_minimo: null,
          valor_maximo: null,
        }));

        const { error: errorChecklist } = await supabase
          .from("rotina_checklist")
          .insert(rows);

        if (errorChecklist) {
          console.error(
            "Erro ao salvar checklist da rotina N3:",
            errorChecklist
          );
          setStatusMsg(
            "⚠️ Rotina criada, mas houve erro ao salvar o checklist."
          );
          setDetails(JSON.stringify(errorChecklist, null, 2));
          return;
        }
      }

      setStatusMsg("✅ Rotina avulsa criada com sucesso!");
      setDetails(JSON.stringify(rotina, null, 2));
      setTitulo("");
      setDescricao("");
      setDuracaoMin("30");
      setTemChecklist(false);
      setTemAnexo(false);
      setChecklistItens([]);
    } catch (err) {
      console.error("Erro inesperado ao criar rotina N3:", err);
      setStatusMsg("❌ Erro inesperado ao criar rotina.");
      setDetails(String(err));
    }
  };

  if (!perfil) {
    return (
      <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
        Carregando perfil...
      </div>
    );
  }

  return (
    <section>
      <div style={headerStyles.pageCard}>
        <div style={headerStyles.pageTextBlock}>
          <span style={headerStyles.pagePill}>Nível · N3</span>
          <div style={headerStyles.pageTitle}>Criar rotina avulsa</div>
          <div style={headerStyles.pageSubtitle}>
            Crie uma rotina pontual para hoje ou para uma data específica,
            vinculada ao seu usuário.
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <label style={styles.label}>Título</label>
            <input
              style={styles.input}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Conferir balcão de FLV"
            />
          </div>
          <div>
            <label style={styles.label}>Urgência</label>
            <select
              style={styles.input}
              value={urgencia}
              onChange={(e) => setUrgencia(e.target.value as Urgencia)}
            >
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
        </div>

        <div>
          <label style={styles.label}>Descrição</label>
          <textarea
            style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhe o que precisa ser verificado na rotina..."
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <div>
            <label style={styles.label}>Data</label>
            <input
              type="date"
              style={styles.input}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div>
            <label style={styles.label}>Horário</label>
            <input
              type="time"
              style={styles.input}
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
            />
          </div>
          <div>
            <label style={styles.label}>Duração (minutos)</label>
            <input
              type="number"
              min={0}
              style={styles.input}
              value={duracaoMin}
              onChange={(e) => setDuracaoMin(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
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
            Exige anexo na execução
          </label>
        </div>

        {temChecklist && (
          <div
            style={{
              marginTop: 8,
              padding: 10,
              borderRadius: 10,
              border: `1px dashed ${theme.colors.borderSoft}`,
              background: "#020617",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  ...styles.label,
                  marginBottom: 0,
                }}
              >
                Checklist (modelo)
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{
                    ...styles.input,
                    fontSize: 12,
                    padding: "6px 8px",
                    minWidth: 220,
                  }}
                  placeholder="Descrição do passo do checklist..."
                  value={checklistDescricao}
                  onChange={(e) => setChecklistDescricao(e.target.value)}
                />
                <button
                  type="button"
                  style={{
                    ...styles.buttonPrimary,
                    fontSize: 12,
                    padding: "8px 10px",
                  }}
                  onClick={addChecklistItem}
                >
                  + Adicionar
                </button>
              </div>
            </div>

            {checklistItens.length === 0 && (
              <p style={{ fontSize: 12, color: "#9ca3af" }}>
                Nenhum item de checklist adicionado ainda.
              </p>
            )}

            {checklistItens.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {checklistItens.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span>{item.descricao}</span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.id)}
                      style={{
                        border: "none",
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                        background: "rgba(248,113,113,0.14)",
                        color: "#fecaca",
                      }}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <button type="submit" style={styles.buttonPrimary}>
            Salvar rotina avulsa
          </button>
        </div>

        {statusMsg && (
          <span
            style={{
              display: "block",
              marginTop: 8,
              fontSize: 12,
              padding: 8,
              borderRadius: 8,
              border: `1px solid ${
                statusMsg.startsWith("❌")
                  ? "#fecaca"
                  : statusMsg.startsWith("⚠️")
                  ? "#fde68a"
                  : "#bbf7d0"
              }`,
              background: "#020617",
              color: statusMsg.startsWith("❌")
                ? "#fecaca"
                : statusMsg.startsWith("⚠️")
                ? "#fde68a"
                : "#bbf7d0",
            }}
          >
            {statusMsg}
          </span>
        )}

        {details && (
          <pre
            style={{
              marginTop: 8,
              fontSize: 11,
              background: "#020617",
              padding: 8,
              borderRadius: 8,
              maxHeight: 200,
              overflow: "auto",
              border: `1px solid ${theme.colors.borderSoft}`,
            }}
          >
            {details}
          </pre>
        )}
      </form>
    </section>
  );
}
