// src/components/N2CriarRotina.tsx
import type React from "react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { styles, theme } from "../styles";
import type { Usuario } from "../types";

type Props = {
  perfil: Usuario | null;
};

type Urgencia = "alta" | "media" | "baixa";
type Periodicidade = "diaria" | "semanal" | "mensal";
type TipoRotina = "normal" | "avulsa";

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

type ResponsavelOption = {
  id: string;
  nome: string;
  nivel: string;
};

type ChecklistTemplateItem = {
  ordem: number;
  descricao: string;
};

export function N2CriarRotina({ perfil }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const hoje = new Date();
    return hoje.toISOString().slice(0, 10);
  });
  const [horarioInicio, setHorarioInicio] = useState<string>("08:00");
  const [duracaoMinutos, setDuracaoMinutos] = useState<string>("60");
  const [urgencia, setUrgencia] = useState<Urgencia>("baixa");
  const [periodicidade, setPeriodicidade] =
    useState<Periodicidade>("diaria");
  const [tipoRotina, setTipoRotina] = useState<TipoRotina>("normal");
  const [temChecklist, setTemChecklist] = useState(false);
  const [temAnexo, setTemAnexo] = useState(false);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  const [responsaveis, setResponsaveis] = useState<ResponsavelOption[]>([]);
  const [responsavelId, setResponsavelId] = useState<string>("");

  const [checklistItens, setChecklistItens] = useState<ChecklistTemplateItem[]>(
    []
  );
  const [checklistDescricao, setChecklistDescricao] = useState("");

  const responsavelSelecionado = useMemo(
    () => responsaveis.find((r) => r.id === responsavelId) ?? null,
    [responsaveis, responsavelId]
  );

  // -------------------------
  // Carrega N2 + N3 da MESMA regional
  // -------------------------
  useEffect(() => {
    const carregarResponsaveis = async () => {
      if (!perfil?.regional_id) return;

      setStatusMsg(null);

      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nome, nivel, regional_id")
          .eq("regional_id", perfil.regional_id)
          .in("nivel", ["N2", "N3"])
          .eq("ativo", true)
          .order("nome", { ascending: true });

        if (error) {
          console.error("Erro ao carregar responsáveis:", error);
          setStatusMsg("❌ Erro ao carregar responsáveis da regional.");
          return;
        }

        const options: ResponsavelOption[] =
          (data ?? []).map((u) => ({
            id: u.id as string,
            nome: u.nome as string,
            nivel: u.nivel as string,
          })) ?? [];

        setResponsaveis(options);

        if (options.length > 0) {
          const myself = options.find((o) => o.id === perfil.id);
          setResponsavelId(myself?.id ?? options[0].id);
        }
      } catch (err) {
        console.error("Erro inesperado ao carregar responsáveis:", err);
        setStatusMsg("❌ Erro inesperado ao carregar responsáveis.");
      }
    };

    carregarResponsaveis();
  }, [perfil?.id, perfil?.regional_id]);

  // -------------------------
  // Checklist template (na criação)
  // -------------------------
  const addChecklistItem = () => {
    if (!checklistDescricao.trim()) return;

    setChecklistItens((prev) => [
      ...prev,
      {
        ordem: prev.length + 1,
        descricao: checklistDescricao.trim(),
      },
    ]);
    setChecklistDescricao("");
  };

  const removeChecklistItem = (ordem: number) => {
    setChecklistItens((prev) =>
      prev.filter((item) => item.ordem !== ordem).map((item, idx) => ({
        ...item,
        ordem: idx + 1,
      }))
    );
  };

  const checklistPayload: ChecklistTemplateItem[] | null = useMemo(() => {
    if (!temChecklist || checklistItens.length === 0) return null;
    return checklistItens;
  }, [temChecklist, checklistItens]);

  // -------------------------
  // Submit
  // -------------------------
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

    if (!responsavelId) {
      setStatusMsg("⚠️ Selecione um responsável para a rotina.");
      return;
    }

    try {
      const dataInicioSql = dataInicio;
      const duracao = parseInt(duracaoMinutos || "0", 10);

      if (!horarioInicio) {
        setStatusMsg("⚠️ Defina um horário de início.");
        return;
      }

      const payload = {
        tipo: tipoRotina,
        periodicidade,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        criador_id: perfil.id,
        responsavel_id: responsavelId,
        departamento_id: perfil.departamento_id,
        setor_id: perfil.setor_id,
        regional_id: perfil.regional_id,
        data_inicio: dataInicioSql,
        horario_inicio: horarioInicio,
        duracao_minutos: Number.isNaN(duracao) ? 0 : duracao,
        urgencia,
        tem_checklist: temChecklist,
        tem_anexo: temAnexo,
        status: "pendente",
      };

      const { data: rotina, error } = await supabase
        .from("rotinas")
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Erro ao criar rotina N2:", error);
        setStatusMsg("❌ Erro ao criar rotina.");
        setDetails(JSON.stringify(error, null, 2));
        return;
      }

      if (!rotina) {
        setStatusMsg("❌ Não foi possível obter a rotina criada.");
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

        const { error: errorChecklist } = await supabase
          .from("rotina_checklist")
          .insert(rows);

        if (errorChecklist) {
          console.error(
            "Erro ao salvar checklist template:",
            errorChecklist
          );
          setStatusMsg(
            "⚠️ Rotina criada, mas houve erro ao salvar o checklist."
          );
          setDetails(JSON.stringify(errorChecklist, null, 2));
          return;
        }
      }

      setStatusMsg("✅ Rotina criada com sucesso!");
      setDetails(JSON.stringify(rotina, null, 2));
      setTitulo("");
      setDescricao("");
      setDuracaoMinutos("60");
      setTemChecklist(false);
      setTemAnexo(false);
      setChecklistItens([]);
    } catch (err) {
      console.error("Erro inesperado ao criar rotina N2:", err);
      setStatusMsg("❌ Erro inesperado ao criar rotina.");
      setDetails(String(err));
    }
  };

  if (!perfil) {
    return (
      <div style={{ fontSize: 13, color: "#fca5a5" }}>
        Perfil não carregado.
      </div>
    );
  }

  return (
    <section>
      <div style={headerStyles.pageCard}>
        <div style={headerStyles.pageTextBlock}>
          <span style={headerStyles.pagePill}>Nível · N2</span>
          <div style={headerStyles.pageTitle}>
            Criar rotina (minha regional)
          </div>
          <div style={headerStyles.pageSubtitle}>
            Defina rotinas recorrentes para o time (N3) ou uma rotina avulsa
            de 1 dia, sempre vinculadas à sua regional.
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <label style={styles.label}>Título da rotina</label>
            <input
              style={styles.input}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Verificar execução da rotina da regional"
            />
          </div>
          <div>
            <label style={styles.label}>Responsável</label>
            <select
              style={styles.input}
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome} ({r.nivel})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={styles.label}>Descrição</label>
          <textarea
            style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Contextualize a rotina para o time..."
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
            <label style={styles.label}>Data de início</label>
            <input
              type="date"
              style={styles.input}
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <label style={styles.label}>Horário de início</label>
            <input
              type="time"
              style={styles.input}
              value={horarioInicio}
              onChange={(e) => setHorarioInicio(e.target.value)}
            />
          </div>
          <div>
            <label style={styles.label}>Duração (minutos)</label>
            <input
              type="number"
              min={0}
              style={styles.input}
              value={duracaoMinutos}
              onChange={(e) => setDuracaoMinutos(e.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
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

          <div>
            <label style={styles.label}>Tipo de rotina</label>
            <select
              style={styles.input}
              value={tipoRotina}
              onChange={(e) => setTipoRotina(e.target.value as TipoRotina)}
            >
              <option value="normal">Normal (recorrente)</option>
              <option value="avulsa">Avulsa (1 dia)</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Periodicidade</label>
            <select
              style={styles.input}
              value={periodicidade}
              onChange={(e) =>
                setPeriodicidade(e.target.value as Periodicidade)
              }
              disabled={tipoRotina === "avulsa"}
            >
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
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
                Checklist (modelo da rotina)
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
                    key={item.ordem}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span>
                      <strong>{item.ordem}.</strong> {item.descricao}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.ordem)}
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
            Salvar rotina
          </button>
        </div>

        {statusMsg && (
          <div
            style={{
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
          </div>
        )}

        {details && (
          <pre
            style={{
              marginTop: 8,
              maxHeight: 220,
              overflow: "auto",
              background: "#020617",
              fontSize: 11,
            }}
          >
            {details}
          </pre>
        )}

        {responsavelSelecionado && (
          <p style={{ fontSize: 11, color: "#9ca3af" }}>
            Responsável selecionado:{" "}
            <strong>
              {responsavelSelecionado.nome} ({responsavelSelecionado.nivel})
            </strong>
          </p>
        )}
      </form>
    </section>
  );
}
