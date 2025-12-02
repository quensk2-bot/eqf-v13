// src/components/N2CriarRotina.tsx
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

type ResponsavelOption = {
  id: string;
  nome: string;
  nivel: string;
};

type ChecklistItemForm = {
  id: number;
  descricao: string;
};

export function N2CriarRotina({ perfil }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [duracaoMinutos, setDuracaoMinutos] = useState("60");
  const [urgencia, setUrgencia] = useState<Urgencia>("alta");
  const [tipoRotina, setTipoRotina] = useState<TipoRotina>("normal");
  const [periodicidade, setPeriodicidade] =
    useState<Periodicidade>("diaria");
  const [diaSemana, setDiaSemana] = useState("2"); // 2 = segunda
  const [diaMes, setDiaMes] = useState("1");
  const [dataInicio, setDataInicio] = useState("");
  const [horarioInicio, setHorarioInicio] = useState("08:00");

  const [temChecklist, setTemChecklist] = useState(false);
  const [checklistItens, setChecklistItens] = useState<ChecklistItemForm[]>([
    { id: 1, descricao: "" },
  ]);
  const [temAnexo, setTemAnexo] = useState(false);

  const [responsaveis, setResponsaveis] = useState<ResponsavelOption[]>([]);
  const [responsavelId, setResponsavelId] = useState<string>("");

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // -------------------------
  // Carrega N3 da MESMA regional + adiciona o próprio N2
  // -------------------------
  useEffect(() => {
    const carregarResponsaveis = async () => {
      if (!perfil?.regional_id || !perfil?.id) return;

      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nome, nivel, regional_id")
          .eq("regional_id", perfil.regional_id)
          .eq("nivel", "N3")
          .order("nome", { ascending: true });

        if (error) throw error;

        const lista = (data || []) as ResponsavelOption[];

        const euMesmo: ResponsavelOption = {
          id: perfil.id,
          nome: perfil.nome || "Nível 2 da regional",
          nivel: perfil.nivel || "N2",
        };

        const jaTemEu = lista.some((u) => u.id === perfil.id);
        const listaFinal = jaTemEu ? lista : [euMesmo, ...lista];

        setResponsaveis(listaFinal);
        setResponsavelId(perfil.id); // default: N2
      } catch (e) {
        console.error("Erro ao carregar responsáveis (N2):", e);
        setStatusMsg(
          "Erro ao carregar responsáveis da regional. Verifique o cadastro de usuários."
        );
      }
    };

    carregarResponsaveis();
  }, [perfil?.id, perfil?.regional_id, perfil?.nome, perfil?.nivel]);

  // Quando mudar para avulsa, joga o padrão para o próprio N2
  useEffect(() => {
    if (!perfil?.id) return;
    if (tipoRotina === "avulsa") {
      setResponsavelId(perfil.id);
    }
  }, [tipoRotina, perfil?.id]);

  const responsavelSelecionado = useMemo(
    () => responsaveis.find((r) => r.id === responsavelId) ?? null,
    [responsaveis, responsavelId]
  );

  // -------------------------
  // Helpers de checklist
  // -------------------------
  const handleAddChecklistItem = () => {
    setChecklistItens((prev) => {
      if (prev.length >= 30) return prev;
      const maxId = prev.reduce((m, it) => (it.id > m ? it.id : m), 0);
      return [...prev, { id: maxId + 1, descricao: "" }];
    });
  };

  const handleRemoveChecklistItem = (id: number) => {
    setChecklistItens((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((it) => it.id !== id);
    });
  };

  const handleChecklistDescricaoChange = (id: number, value: string) => {
    setChecklistItens((prev) =>
      prev.map((it) => (it.id === id ? { ...it, descricao: value } : it))
    );
  };

  // -------------------------
  // Submit: checa conflito (diária normal) + cria rotina + checklist
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
      setStatusMsg("❌ Informe um título para a rotina.");
      return;
    }

    if (!responsavelId) {
      setStatusMsg("❌ Selecione o responsável pela rotina.");
      return;
    }

    const minutos = Number(duracaoMinutos || "0") || 0;
    if (minutos <= 0) {
      setStatusMsg("❌ Duração inválida. Informe em minutos.");
      return;
    }

    // rotina avulsa = 1 dia só → exige data
    if (tipoRotina === "avulsa" && !dataInicio) {
      setStatusMsg("❌ Para rotina avulsa, escolha a data única de execução.");
      return;
    }

    if (temChecklist) {
      const temAlgum = checklistItens.some((it) => it.descricao.trim());
      if (!temAlgum) {
        setStatusMsg(
          "⚠ Você marcou 'Tem checklist', mas não preencheu nenhum item."
        );
        return;
      }
    }

    try {
      setLoading(true);
      setStatusMsg("⏳ Validando horário...");

      const precisaChecarConflito =
        tipoRotina === "normal" && periodicidade === "diaria" && !!horarioInicio;

      if (precisaChecarConflito) {
        const { data: temConflito, error: errRpc } = await supabase.rpc(
          "check_conflito_diaria",
          {
            p_responsavel: responsavelId,
            p_horario: horarioInicio,
            p_duracao_min: minutos,
          }
        );

        if (errRpc) throw errRpc;

        if (temConflito === true) {
          setStatusMsg(
            "⚠ Já existe rotina diária nesse horário para esse responsável."
          );
          setLoading(false);
          return;
        }
      }

      setStatusMsg("⏳ Salvando rotina...");

      // Monta payload para tabela "rotinas"
      const isAvulsa = tipoRotina === "avulsa";

      const payload: any = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        tipo: isAvulsa ? "avulsa" : "normal",
        periodicidade: isAvulsa ? "diaria" : periodicidade,
        data_inicio: dataInicio || null,
        horario_inicio: horarioInicio || null,
        duracao_minutos: minutos,
        urgencia,
        tem_checklist: temChecklist,
        tem_anexo: temAnexo,
        criador_id: perfil.id,
        responsavel_id: responsavelId,
        departamento_id: perfil.departamento_id ?? null,
        setor_id: perfil.setor_id ?? null,
        regional_id: perfil.regional_id ?? null,
        dia_semana: null,
        dia_mes: null,
      };

      if (!isAvulsa) {
        if (periodicidade === "semanal") {
          payload.dia_semana = diaSemana;
        } else if (periodicidade === "mensal") {
          payload.dia_mes = Number(diaMes);
        }
      }

      const { data: rotina, error: rotinaError } = await supabase
        .from("rotinas")
        .insert(payload)
        .select("id, titulo, data_inicio, horario_inicio, urgencia, tem_checklist")
        .single();

      if (rotinaError) {
        console.error("Erro ao criar rotina (N2):", rotinaError);
        setStatusMsg("❌ Erro ao criar a rotina. Verifique os dados.");
        setDetails(rotinaError.message ?? String(rotinaError));
        setLoading(false);
        return;
      }

      let checklistCriado: any[] = [];

      if (temChecklist) {
        const itensParaSalvar = checklistItens
          .filter((it) => it.descricao.trim())
          .map((it, idx) => ({
            rotina_id: rotina.id,
            ordem: idx + 1,
            descricao: it.descricao.trim(),
          }));

        if (itensParaSalvar.length > 0) {
          const { data: checklistData, error: checklistError } = await supabase
            .from("rotina_checklist")
            .insert(itensParaSalvar)
            .select("id, rotina_id, ordem, descricao");

          if (checklistError) {
            console.error(
              "Erro ao criar checklist da rotina (N2):",
              checklistError
            );
            setStatusMsg(
              "⚠ Rotina criada, mas ocorreu erro ao salvar o checklist."
            );
          } else {
            checklistCriado = checklistData || [];
          }
        }
      }

      setStatusMsg("✅ Rotina criada com sucesso!");
      setDetails(
        JSON.stringify(
          {
            rotina,
            checklist: checklistCriado,
          },
          null,
          2
        )
      );

      // limpa campos
      setTitulo("");
      setDescricao("");
      setDuracaoMinutos("60");
      setUrgencia("alta");
      setTipoRotina("normal");
      setPeriodicidade("diaria");
      setDiaSemana("2");
      setDiaMes("1");
      setDataInicio("");
      setHorarioInicio("08:00");
      setTemChecklist(false);
      setChecklistItens([{ id: 1, descricao: "" }]);
      setTemAnexo(false);
      if (perfil.id) {
        setResponsavelId(perfil.id);
      }
    } catch (e: any) {
      console.error("Erro inesperado ao criar rotina (N2):", e);
      setStatusMsg("❌ Erro inesperado ao criar rotina.");
      setDetails(String(e));
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // UI
  // -------------------------
  if (!perfil) {
    return (
      <div style={{ fontSize: 13, color: "#fca5a5" }}>
        Perfil não carregado.
      </div>
    );
  }

  return (
    <section>
      {/* Cabeçalho mais sutil, sem neon forte */}
      <div
        style={{
          borderRadius: 14,
          padding: "10px 16px",
          marginBottom: 14,
          background:
            "linear-gradient(135deg, #020617 0%, #020617 65%, #030712 100%)",
          border: "1px solid rgba(249,115,22,0.7)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 0.12,
            color: "#f97316",
          }}
        >
          Nível 2 • Regional
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#f9fafb",
            marginTop: 2,
          }}
        >
          Criar rotina (N2 – minha regional)
        </div>
        <p
          style={{
            fontSize: 12,
            color: theme.colors.textMuted,
            marginTop: 4,
          }}
        >
          Defina rotinas recorrentes para o time ou uma rotina avulsa de 1 dia.
          Você pode direcionar para um N3 ou para você (N2).
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: 10, maxWidth: 720 }}
      >
        <div>
          <label style={styles.label}>Título</label>
          <input
            style={styles.input}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Conferência diária de preços – MT"
          />
        </div>

        <div>
          <label style={styles.label}>Descrição (opcional)</label>
          <textarea
            style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div>
            <label style={styles.label}>
              Responsável{" "}
              <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
                (N3 ou você mesmo)
              </span>
            </label>
            <select
              style={styles.input}
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
            >
              {responsaveis.length === 0 && (
                <option value="">Nenhum usuário encontrado na regional</option>
              )}
              {responsaveis.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.nivel})
                </option>
              ))}
            </select>
          </div>

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
              onChange={(e) =>
                setTipoRotina(e.target.value as TipoRotina)
              }
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

        {tipoRotina === "normal" && periodicidade === "semanal" && (
          <div>
            <label style={styles.label}>Dia da semana</label>
            <select
              style={styles.input}
              value={diaSemana}
              onChange={(e) => setDiaSemana(e.target.value)}
            >
              <option value="2">Segunda</option>
              <option value="3">Terça</option>
              <option value="4">Quarta</option>
              <option value="5">Quinta</option>
              <option value="6">Sexta</option>
              <option value="7">Sábado</option>
            </select>
          </div>
        )}

        {tipoRotina === "normal" && periodicidade === "mensal" && (
          <div>
            <label style={styles.label}>Dia do mês</label>
            <input
              type="number"
              min={1}
              max={31}
              style={styles.input}
              value={diaMes}
              onChange={(e) => setDiaMes(e.target.value)}
            />
          </div>
        )}

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div>
            <label style={styles.label}>
              {tipoRotina === "avulsa" ? "Data única" : "Data de início"}
            </label>
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
            Tem anexo
          </label>
        </div>

        {/* Bloco do checklist */}
        {temChecklist && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 12,
              border: `1px dashed ${theme.colors.borderSoft}`,
              background:
                "radial-gradient(circle at top left,#020617,#000)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={styles.label}>
                Checklist da rotina (máx. 30 itens)
              </span>
              <button
                type="button"
                onClick={handleAddChecklistItem}
                style={{
                  ...styles.buttonSecondary,
                  padding: "4px 10px",
                  fontSize: 12,
                }}
              >
                + Adicionar item
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 220,
                overflow: "auto",
              }}
            >
              {checklistItens.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      fontSize: 12,
                      color: theme.colors.textMuted,
                    }}
                  >
                    {idx + 1}.
                  </span>
                  <input
                    style={{ ...styles.input, flex: 1 }}
                    value={item.descricao}
                    onChange={(e) =>
                      handleChecklistDescricaoChange(
                        item.id,
                        e.target.value
                      )
                    }
                    placeholder="Descrição do item do checklist..."
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
                        background: "rgba(248,113,113,0.16)",
                        color: "#fecaca",
                        cursor: "pointer",
                      }}
                    >
                      remover
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              padding: "8px 18px",
              background: loading
                ? "#374151"
                : "linear-gradient(90deg,#22c55e,#bbf7d0)",
              color: "#000",
              boxShadow: "0 0 16px rgba(34,197,94,0.55)",
            }}
          >
            {loading ? "Criando..." : "Criar rotina"}
          </button>

          {statusMsg && (
            <span style={{ fontSize: 12, color: "#e5e7eb" }}>
              {statusMsg}
            </span>
          )}
        </div>

        {details && (
          <pre
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 8,
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
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
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
