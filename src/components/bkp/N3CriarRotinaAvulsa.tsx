// src/components/N3CriarRotinaAvulsa.tsx
import type { FormEvent } from "react";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Usuario } from "../types";
import { styles, theme } from "../styles";

type Props = {
  perfil: Usuario | null;
};

type Urgencia = "alta" | "media" | "baixa";

type ChecklistItemForm = {
  id: number;
  descricao: string;
};

export function N3CriarRotinaAvulsa({ perfil }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataExecucao, setDataExecucao] = useState("");
  const [horarioInicio, setHorarioInicio] = useState("08:00");
  const [duracaoMinutos, setDuracaoMinutos] = useState("60");
  const [urgencia, setUrgencia] = useState<Urgencia>("baixa");

  const [temChecklist, setTemChecklist] = useState(false);
  const [temAnexo, setTemAnexo] = useState(false);

  const [checklistItens, setChecklistItens] = useState<ChecklistItemForm[]>([
    { id: 1, descricao: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  // -----------------------------
  // Helpers do checklist
  // -----------------------------
  const handleAddChecklistItem = () => {
    if (checklistItens.length >= 20) return;
    const nextId =
      checklistItens.length === 0
        ? 1
        : Math.max(...checklistItens.map((i) => i.id)) + 1;
    setChecklistItens((prev) => [...prev, { id: nextId, descricao: "" }]);
  };

  const handleRemoveChecklistItem = (id: number) => {
    setChecklistItens((prev) => prev.filter((i) => i.id !== id));
  };

  const handleChecklistDescricaoChange = (id: number, value: string) => {
    setChecklistItens((prev) =>
      prev.map((i) => (i.id === id ? { ...i, descricao: value } : i)),
    );
  };

  // -----------------------------
  // Submit
  // -----------------------------
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setDetails(null);

    if (!perfil) {
      setStatusMsg("❌ Perfil não carregado. Faça login novamente.");
      return;
    }

    if (!titulo.trim()) {
      setStatusMsg("❌ Informe um título para a rotina.");
      return;
    }

    if (!dataExecucao) {
      setStatusMsg("❌ Escolha a data da execução.");
      return;
    }

    if (!horarioInicio) {
      setStatusMsg("❌ Informe o horário de início.");
      return;
    }

    const minutos = Number(duracaoMinutos || "0") || 0;
    if (minutos <= 0) {
      setStatusMsg("❌ Duração deve ser maior que 0 minutos.");
      return;
    }

    // Monta checklist (se marcado)
    let checklistPayload:
      | { ordem: number; descricao: string }[]
      | null = null;

    if (temChecklist) {
      const descricoesValidas = checklistItens
        .map((i) => i.descricao.trim())
        .filter((t) => t.length > 0);

      if (descricoesValidas.length === 0) {
        setStatusMsg(
          "❌ Você marcou 'Tem checklist', mas não informou nenhum item.",
        );
        return;
      }

      checklistPayload = descricoesValidas.map((descricao, idx) => ({
        ordem: idx + 1,
        descricao,
      }));
    }

    try {
      setLoading(true);
      setStatusMsg("⏳ Criando rotina avulsa...");

      // 1) Cria a rotina avulsa na tabela rotinas
      // tipo = 'avulsa', periodicidade = 'diaria' (data única)
      const { data: rotina, error: rotinaError } = await supabase
        .from("rotinas")
        .insert({
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          tipo: "avulsa",
          periodicidade: "diaria",
          data_inicio: dataExecucao,
          horario_inicio: horarioInicio,
          duracao_minutos: minutos,
          urgencia,
          tem_checklist: temChecklist,
          tem_anexo: temAnexo,
          criador_id: perfil.id,
          responsavel_id: perfil.id,
          departamento_id: perfil.departamento_id ?? null,
          setor_id: perfil.setor_id ?? null,
          regional_id: perfil.regional_id ?? null,
        })
        .select("id, titulo, data_inicio, horario_inicio, urgencia, tem_checklist")
        .single();

      if (rotinaError) {
        console.error("Erro ao criar rotina avulsa (N3):", rotinaError);
        setStatusMsg("❌ Erro ao criar a rotina. Verifique os dados.");
        setDetails(rotinaError.message ?? String(rotinaError));
        return;
      }

      // 2) Cria o checklist template (tabela rotina_checklist), se tiver
      if (temChecklist && checklistPayload && rotina?.id) {
        const rows = checklistPayload.map((item) => ({
          rotina_id: rotina.id,
          ordem: item.ordem,
          descricao: item.descricao,
          obrigatorio: true,
          exige_anexo: false,
          tipo_valor: null,
          valor_minimo: null,
          valor_maximo: null,
        }));

        const { error: checklistError } = await supabase
          .from("rotina_checklist")
          .insert(rows);

        if (checklistError) {
          console.error(
            "Rotina criada, mas erro ao salvar checklist:",
            checklistError,
          );
          setStatusMsg(
            "⚠️ Rotina criada, mas houve erro ao salvar o checklist.",
          );
          setDetails(
            JSON.stringify(
              { rotina, checklistError: checklistError.message },
              null,
              2,
            ),
          );
          return;
        }
      }

      setStatusMsg("✅ Rotina avulsa criada com sucesso!");
      setDetails(JSON.stringify(rotina, null, 2));

      // Reset do formulário
      setTitulo("");
      setDescricao("");
      setDataExecucao("");
      setHorarioInicio("08:00");
      setDuracaoMinutos("60");
      setUrgencia("baixa");
      setTemChecklist(false);
      setTemAnexo(false);
      setChecklistItens([{ id: 1, descricao: "" }]);
    } catch (e: any) {
      console.error("Erro inesperado ao criar rotina avulsa (N3):", e);
      setStatusMsg("❌ Erro inesperado ao criar a rotina.");
      setDetails(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Render
  // -----------------------------
  if (!perfil) {
    return (
      <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
        Carregando perfil...
      </div>
    );
  }

  return (
    <section>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 8,
          color: theme.colors.neon,
        }}
      >
        Criar rotina avulsa (N3)
      </h3>
      <p
        style={{
          fontSize: 13,
          color: theme.colors.textMuted,
          marginBottom: 12,
        }}
      >
        Rotina pontual para o seu dia, vinculada automaticamente ao seu
        departamento, setor e regional.
      </p>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2.5fr) minmax(0, 1.5fr)",
            gap: 16,
            marginBottom: 16,
          }}
        >
          {/* Coluna 1 - Título e descrição */}
          <div>
            <label style={styles.label}>Título da rotina</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Ex.: Conferência de estoque da câmara fria"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />

            <label style={{ ...styles.label, marginTop: 10 }}>
              Descrição (opcional)
            </label>
            <textarea
              style={{
                ...styles.input,
                minHeight: 80,
                resize: "vertical",
              }}
              placeholder="Detalhes adicionais da rotina..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          {/* Coluna 2 - Dados de execução */}
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <label style={styles.label}>Data de execução</label>
                <input
                  style={styles.input}
                  type="date"
                  value={dataExecucao}
                  onChange={(e) => setDataExecucao(e.target.value)}
                />
              </div>
              <div>
                <label style={styles.label}>Horário de início</label>
                <input
                  style={styles.input}
                  type="time"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 10,
                marginTop: 10,
              }}
            >
              <div>
                <label style={styles.label}>Duração (minutos)</label>
                <input
                  style={styles.input}
                  type="number"
                  min={5}
                  step={5}
                  value={duracaoMinutos}
                  onChange={(e) => setDuracaoMinutos(e.target.value)}
                />
              </div>
              <div>
                <label style={styles.label}>Urgência</label>
                <select
                  style={styles.input}
                  value={urgencia}
                  onChange={(e) =>
                    setUrgencia(e.target.value as Urgencia)
                  }
                >
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
            </div>

            {/* Flags checklist / anexo */}
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <label
                style={{
                  fontSize: 13,
                  color: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={temChecklist}
                  onChange={(e) => setTemChecklist(e.target.checked)}
                />
                Tem checklist
              </label>

              <label
                style={{
                  fontSize: 13,
                  color: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={temAnexo}
                  onChange={(e) => setTemAnexo(e.target.checked)}
                />
                Vai exigir anexo na execução
              </label>
            </div>
          </div>
        </div>

        {/* CHECKLIST ITENS (criado na hora da criação) */}
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
                Checklist da rotina (máx. 20 itens)
              </span>
              <button
                type="button"
                onClick={handleAddChecklistItem}
                disabled={checklistItens.length >= 20}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${theme.colors.neon}`,
                  padding: "4px 10px",
                  fontSize: 12,
                  background: "transparent",
                  color: theme.colors.neon,
                  cursor:
                    checklistItens.length >= 20 ? "not-allowed" : "pointer",
                }}
              >
                + Adicionar item
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              {checklistItens.map((item, index) => (
                <div
                  key={item.id}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: theme.colors.textMuted,
                      width: 20,
                    }}
                  >
                    {index + 1}.
                  </span>
                  <input
                    style={{ ...styles.input, flex: 1 }}
                    type="text"
                    placeholder="Descreva o passo (ex.: Conferir temperatura, contar itens, registrar no sistema...)"
                    value={item.descricao}
                    onChange={(e) =>
                      handleChecklistDescricaoChange(
                        item.id,
                        e.target.value,
                      )
                    }
                  />
                  {checklistItens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      style={{
                        borderRadius: 999,
                        border: "none",
                        padding: "4px 8px",
                        fontSize: 11,
                        background: "#1f2937",
                        color: "#f97373",
                        cursor: "pointer",
                      }}
                    >
                      X
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p
              style={{
                fontSize: 11,
                color: theme.colors.textMuted,
                marginTop: 6,
              }}
            >
              Esses itens serão usados como base no momento de execução da
              rotina (N2/N3), com marcação de concluído e possibilidade de
              valores/anexos conforme o modelo do seu sistema.
            </p>
          </div>
        )}

        {/* AÇÕES */}
        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="submit"
            disabled={loading}
            style={{
              borderRadius: 999,
              border: "none",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              background: theme.colors.neon,
              color: "#000",
              boxShadow: theme.shadow.glowNeon,
            }}
          >
            {loading ? "Criando rotina..." : "Criar rotina avulsa"}
          </button>

          {statusMsg && (
            <span
              style={{
                fontSize: 13,
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
        </div>

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
