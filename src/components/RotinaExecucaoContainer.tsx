import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { theme } from "../styles";
import type { Rotina } from "../types";

type RotinaExecucaoContainerProps = {
  open: boolean;
  rotina: Rotina | null;
  onClose: () => void;
};

type ChecklistItemExec = {
  ordem: number;
  descricao: string;
  valor: string;
  concluido: boolean;
};

type Anexo = {
  id: number;
  storage_path: string;
  descricao: string | null;
  created_at: string;
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.96)",
  zIndex: 50,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalStyle: React.CSSProperties = {
  width: "96%",
  maxWidth: 1200,
  maxHeight: "92vh",
  background: "rgba(15,23,42,1)",
  borderRadius: 24,
  border: `1px solid ${theme.colors.neon}`,
  boxShadow: "0 0 40px rgba(34,197,94,0.3)",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const headerLeftStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const tituloStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
};

const rotinaIdStyle: React.CSSProperties = {
  fontSize: 11,
  color: theme.colors.textMuted,
};

const headerRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const statusBadgeStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 11,
  background: "rgba(34,197,94,0.15)",
  color: "#4ade80",
};

const statusBadgePausada: React.CSSProperties = {
  ...statusBadgeStyle,
  background: "rgba(234,179,8,0.15)",
  color: "#facc15",
};

const statusBadgeFinalizada: React.CSSProperties = {
  ...statusBadgeStyle,
  background: "rgba(34,197,94,0.2)",
  color: "#4ade80",
};

const cronometroStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 20,
  fontWeight: 700,
};

const btnNeonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "none",
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const btnMinimizarStyle: React.CSSProperties = {
  ...btnNeonStyle,
  background: "transparent",
  border: `1px solid ${theme.colors.neon}`,
  color: theme.colors.neon,
};

const btnFecharStyle: React.CSSProperties = {
  ...btnNeonStyle,
  background: "#991b1b",
  color: "#fee2e2",
};

const bodyGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
  gap: 16,
  flex: 1,
  minHeight: 0,
};

const colunaStyle: React.CSSProperties = {
  background: "rgba(15,23,42,0.9)",
  borderRadius: 16,
  border: `1px solid ${theme.colors.borderSoft}`,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

const colunaTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 8,
};

const checklistListStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  paddingRight: 4,
};

const checklistRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1.6fr) minmax(0, 0.8fr)",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
  fontSize: 13,
};

const checklistTextStyle: React.CSSProperties = {
  background: "rgba(15,23,42,1)",
  borderRadius: 10,
  border: `1px solid ${theme.colors.borderSoft}`,
  padding: "6px 8px",
  color: theme.colors.text,
  fontSize: 13,
};

const checklistValorInputStyle: React.CSSProperties = {
  background: "rgba(15,23,42,1)",
  borderRadius: 10,
  border: `1px solid ${theme.colors.borderSoft}`,
  padding: "6px 8px",
  color: theme.colors.text,
  fontSize: 13,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const textareaStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(15,23,42,1)",
  borderRadius: 12,
  border: `1px solid ${theme.colors.borderSoft}`,
  padding: 10,
  color: theme.colors.text,
  fontSize: 13,
  resize: "none",
  minHeight: 120,
};

const footerRowStyle: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const btnPausarStyle: React.CSSProperties = {
  ...btnNeonStyle,
  background: "#f97316",
  color: "#111827",
};

const btnFinalizarStyle: React.CSSProperties = {
  ...btnNeonStyle,
  background: "#dc2626",
  color: "#fee2e2",
};

const footerInfoStyle: React.CSSProperties = {
  fontSize: 12,
  color: theme.colors.textMuted,
};

const floatingPanelStyle: React.CSSProperties = {
  position: "fixed",
  right: 20,
  bottom: 20,
  width: 320,
  background: "rgba(15,23,42,0.98)",
  borderRadius: 16,
  border: `1px solid ${theme.colors.neon}`,
  boxShadow: "0 0 25px rgba(34,197,94,0.35)",
  padding: 12,
  zIndex: 40,
};

const floatingTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4,
};

const floatingRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const floatingTimeStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 14,
};

const floatingButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
};

const btnRetomarStyle: React.CSSProperties = {
  ...btnNeonStyle,
  padding: "4px 10px",
  background: theme.colors.neon,
  color: "#000",
};

const btnFinalizarMiniStyle: React.CSSProperties = {
  ...btnNeonStyle,
  padding: "4px 10px",
  background: "#dc2626",
  color: "#fee2e2",
};

const anexosListStyle: React.CSSProperties = {
  marginTop: 8,
  maxHeight: 130,
  overflowY: "auto",
  fontSize: 12,
};

const anexosItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  padding: "4px 0",
  borderBottom: `1px solid ${theme.colors.borderSoft}`,
};

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RotinaExecucaoContainer({
  open,
  rotina,
  onClose,
}: RotinaExecucaoContainerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinalizada, setIsFinalizada] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [observacoes, setObservacoes] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItemExec[]>([]);

  const [execucaoId, setExecucaoId] = useState<number | null>(null);
  const [executorId, setExecutorId] = useState<string | null>(null);

  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);

  const [loadingInicial, setLoadingInicial] = useState(false);
  const [erroInicial, setErroInicial] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Inicialização — carrega/ cria execução apenas UMA vez por rotina+executor
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // já tem execução carregada → não reinicia
    if (!open || !rotina) return;
    if (execucaoId !== null) return;

    const init = async () => {
      setIsMinimized(false);
      setErroInicial(null);
      setLoadingInicial(true);

      try {
        // 1) Usuário atual
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError || !userData?.user) {
          setErroInicial("Não foi possível carregar o usuário atual.");
          return;
        }
        const uid = userData.user.id;
        setExecutorId(uid);

        // 2) Checklist base da rotina
        const { data: itensChecklist, error: checklistErr } = await supabase
          .from("rotina_checklist")
          .select("ordem, descricao")
          .eq("rotina_id", rotina.id)
          .order("ordem", { ascending: true });

        if (checklistErr) {
          console.error("Erro ao carregar checklist da rotina:", checklistErr);
          setErroInicial("Erro ao carregar checklist da rotina.");
          return;
        }

        let base: ChecklistItemExec[] = [];
        if (itensChecklist && itensChecklist.length > 0) {
          base = itensChecklist.map((item: any) => ({
            ordem: item.ordem,
            descricao: item.descricao ?? "",
            valor: "",
            concluido: false,
          }));
        } else {
          base = [
            {
              ordem: 1,
              descricao: rotina.titulo ?? "Etapa principal",
              valor: "",
              concluido: false,
            },
          ];
        }

        // 3) Busca execução existente para essa rotina + executor
        const { data: execs, error: execErr } = await supabase
          .from("rotina_execucoes")
          .select(
            "id, inicio_em, pausado_em, finalizado_em, duracao_total_segundos, observacoes, checklist_execucao"
          )
          .eq("rotina_id", rotina.id)
          .eq("executor_id", uid)
          .order("id", { ascending: false })
          .limit(1);

        if (execErr) {
          console.error("Erro ao carregar execução:", execErr);
          setErroInicial("Erro ao carregar dados de execução.");
          return;
        }

        // 4) Se não existir, cria nova execução
        let execId: number;
        let finalizada = false;
        let pausada = false;
        let segundos = 0;
        let obs = "";
        let checklistExec: ChecklistItemExec[] = base;

        if (!execs || execs.length === 0) {
          const { data: created, error: createErr } = await supabase
            .from("rotina_execucoes")
            .insert({
              rotina_id: rotina.id,
              executor_id: uid,
              inicio_em: new Date().toISOString(),
              duracao_total_segundos: 0,
              observacoes: null,
              checklist_execucao: null,
            })
            .select("id")
            .single();

          if (createErr || !created) {
            console.error("Erro ao criar execução:", createErr);
            setErroInicial("Erro ao iniciar execução da rotina.");
            return;
          }
          execId = created.id;
        } else {
          const ex = execs[0] as any;
          execId = ex.id;
          finalizada = !!ex.finalizado_em;
          pausada = !!ex.pausado_em;
          segundos = ex.duracao_total_segundos ?? 0;
          obs = ex.observacoes ?? "";

          if (ex.checklist_execucao && Array.isArray(ex.checklist_execucao)) {
            checklistExec = ex.checklist_execucao.map((i: any) => ({
              ordem: i.ordem,
              descricao: i.descricao ?? "",
              valor: i.valor ?? "",
              concluido: !!i.concluido,
            }));
          }
        }

        setExecucaoId(execId);
        setIsFinalizada(finalizada);
        setIsPaused(pausada || finalizada);
        setElapsedSeconds(segundos);
        setObservacoes(obs);
        setChecklist(checklistExec);

        // 5) Carregar anexos dessa execução
        if (execId) {
          const { data: anexoRows, error: anexoErr } = await supabase
            .from("rotina_anexos")
            .select("id, storage_path, descricao, created_at")
            .eq("rotina_id", rotina.id)
            .eq("execucao_id", execId)
            .order("created_at", { ascending: false });

          if (!anexoErr && anexoRows) {
            setAnexos(anexoRows as Anexo[]);
          }
        }
      } catch (e: any) {
        console.error("Erro inesperado na inicialização da execução:", e);
        setErroInicial("Erro inesperado ao iniciar execução.");
      } finally {
        setLoadingInicial(false);
      }
    };

    init();
  }, [open, rotina?.id, execucaoId]);

  // ---------------------------------------------------------------------------
  // Cronômetro em memória
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!open || isPaused || isFinalizada) return;
    const id = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [open, isPaused, isFinalizada]);

  // ---------------------------------------------------------------------------
  // Salvamento contínuo do tempo no banco (a cada 5s)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!execucaoId) return;

    const id = setInterval(() => {
      supabase
        .from("rotina_execucoes")
        .update({ duracao_total_segundos: elapsedSeconds })
        .eq("id", execucaoId)
        .catch((e) =>
          console.error("Erro ao salvar tempo contínuo da execução:", e)
        );
    }, 5000);

    return () => clearInterval(id);
  }, [elapsedSeconds, execucaoId]);

  if (!open || !rotina) return null;

  const handleToggleChecklistItem = (ordem: number) => {
    if (isFinalizada) return;
    setChecklist((prev) =>
      prev.map((i) =>
        i.ordem === ordem ? { ...i, concluido: !i.concluido } : i
      )
    );
  };

  const handleUpdateValor = (ordem: number, valor: string) => {
    if (isFinalizada) return;
    setChecklist((prev) =>
      prev.map((i) => (i.ordem === ordem ? { ...i, valor } : i))
    );
  };

  const persistEstadoParcial = async (extra: Record<string, any> = {}) => {
    if (!execucaoId) return;
    try {
      await supabase
        .from("rotina_execucoes")
        .update({
          duracao_total_segundos: elapsedSeconds,
          observacoes,
          checklist_execucao: checklist,
          ...extra,
        })
        .eq("id", execucaoId);
    } catch (e) {
      console.error("Erro ao salvar estado parcial da execução:", e);
    }
  };

  const handlePausar = async () => {
    if (!execucaoId) return;
    const novoPausado = !isPaused;
    setIsPaused(novoPausado);

    await persistEstadoParcial({
      pausado_em: novoPausado ? new Date().toISOString() : null,
    });
  };

  const handleFinalizar = async () => {
    if (!execucaoId) return;
    try {
      await supabase
        .from("rotina_execucoes")
        .update({
          finalizado_em: new Date().toISOString(),
          duracao_total_segundos: elapsedSeconds,
          observacoes,
          checklist_execucao: checklist,
          pausado_em: null,
        })
        .eq("id", execucaoId);

      setIsFinalizada(true);
      setIsPaused(true);
      onClose();
    } catch (e) {
      console.error("Erro ao finalizar rotina:", e);
      alert("Erro ao finalizar rotina. Tente novamente.");
    }
  };

  const handleMinimizar = () => setIsMinimized(true);
  const handleRetomar = () => setIsMinimized(false);

  // Upload de anexos
  const handleUploadAnexos = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!execucaoId || !rotina || !executorId) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setErroUpload(null);

    const bucket = "rotina-anexos";
    const novos: Anexo[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `rotinas/${rotina.id}/execucoes/${execucaoId}/${Date.now()}-${i}.${ext}`;

        const { error: upError } = await supabase.storage
          .from(bucket)
          .upload(path, file);

        if (upError) {
          console.error("Erro upload anexo:", upError);
          setErroUpload("Erro ao enviar um dos anexos.");
          continue;
        }

        const { data: inserted, error: insErr } = await supabase
          .from("rotina_anexos")
          .insert({
            rotina_id: rotina.id,
            execucao_id: execucaoId,
            executor_id: executorId,
            storage_path: path,
            descricao: file.name,
          })
          .select("id, storage_path, descricao, created_at")
          .single();

        if (!insErr && inserted) {
          novos.push(inserted as Anexo);
        }
      }

      if (novos.length > 0) {
        setAnexos((prev) => [...novos, ...prev]);
      }
    } catch (err: any) {
      console.error("Erro inesperado ao enviar anexos:", err);
      setErroUpload("Erro inesperado ao enviar anexos.");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const renderStatusBadge = () => {
    if (isFinalizada)
      return <span style={statusBadgeFinalizada}>Finalizada</span>;
    if (isPaused) return <span style={statusBadgePausada}>Pausada</span>;
    return <span style={statusBadgeStyle}>Em execução</span>;
  };

  const modal = !isMinimized && (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <header style={headerRowStyle}>
          <div style={headerLeftStyle}>
            <div style={tituloStyle}>{rotina.titulo}</div>
            <div style={rotinaIdStyle}>
              ID: {rotina.id} • Duração planejada:{" "}
              {rotina.duracao_minutos ?? 0} min
            </div>
          </div>

          <div style={headerRightStyle}>
            {renderStatusBadge()}
            <span style={cronometroStyle}>{formatSeconds(elapsedSeconds)}</span>
            <button
              type="button"
              style={btnMinimizarStyle}
              onClick={handleMinimizar}
            >
              Minimizar
            </button>
            <button type="button" style={btnFecharStyle} onClick={onClose}>
              Fechar
            </button>
          </div>
        </header>

        {erroInicial ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "rgba(220,38,38,0.18)",
              color: "#fecaca",
              fontSize: 13,
            }}
          >
            {erroInicial}
          </div>
        ) : (
          <>
            {loadingInicial ? (
              <div style={{ color: "#e5e7eb", fontSize: 13 }}>
                Carregando dados da execução...
              </div>
            ) : (
              <>
                <div style={bodyGridStyle}>
                  {/* COLUNA 1: CHECKLIST */}
                  <div style={colunaStyle}>
                    <div style={colunaTitleStyle}>Checklist da execução</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: theme.colors.textMuted,
                        marginBottom: 6,
                      }}
                    >
                      Marque o item concluído e registre o valor da
                      conferência (quantidade, valor, etc.). Este checklist foi
                      criado na rotina.
                    </div>
                    <div style={checklistListStyle}>
                      {checklist.map((item) => (
                        <div key={item.ordem} style={checklistRowStyle}>
                          <input
                            type="checkbox"
                            checked={item.concluido}
                            disabled={isFinalizada}
                            onChange={() =>
                              handleToggleChecklistItem(item.ordem)
                            }
                          />
                          <div
                            style={{
                              ...checklistTextStyle,
                              borderStyle: "solid",
                            }}
                          >
                            {item.descricao || (
                              <span style={{ color: "#64748b" }}>
                                (sem descrição)
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            style={checklistValorInputStyle}
                            placeholder="Valor / Qtd"
                            value={item.valor}
                            disabled={isFinalizada}
                            onChange={(e) =>
                              handleUpdateValor(item.ordem, e.target.value)
                            }
                          />
                        </div>
                      ))}

                      {checklist.length === 0 && (
                        <div
                          style={{
                            fontSize: 12,
                            color: theme.colors.textMuted,
                          }}
                        >
                          Esta rotina não possui checklist cadastrado.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COLUNA 2: OBSERVAÇÕES / ANEXOS */}
                  <div style={colunaStyle}>
                    <div style={colunaTitleStyle}>Observações</div>
                    <textarea
                      style={textareaStyle}
                      placeholder="Registre divergências, ocorrências, observações importantes..."
                      value={observacoes}
                      disabled={isFinalizada}
                      onChange={(e) => setObservacoes(e.target.value)}
                    />

                    <div style={{ marginTop: 12 }}>
                      <div style={colunaTitleStyle}>Anexos da execução</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: theme.colors.textMuted,
                          marginBottom: 4,
                        }}
                      >
                        Envie fotos, prints ou documentos que comprovem a
                        execução. Múltiplos arquivos são permitidos.
                      </div>
                      <input
                        type="file"
                        multiple
                        disabled={isFinalizada || uploading}
                        onChange={handleUploadAnexos}
                        style={{ fontSize: 12, marginBottom: 4 }}
                      />
                      {erroUpload && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#fecaca",
                            marginBottom: 4,
                          }}
                        >
                          {erroUpload}
                        </div>
                      )}
                      {uploading && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#e5e7eb",
                            marginBottom: 4,
                          }}
                        >
                          Enviando anexos...
                        </div>
                      )}

                      <div style={anexosListStyle}>
                        {anexos.length === 0 && (
                          <div
                            style={{
                              fontSize: 12,
                              color: theme.colors.textMuted,
                            }}
                          >
                            Nenhum anexo enviado ainda.
                          </div>
                        )}
                        {anexos.map((a) => {
                          const publicUrl =
                            supabase.storage
                              .from("rotina-anexos")
                              .getPublicUrl(a.storage_path).data.publicUrl ?? "#";
                          return (
                            <div key={a.id} style={anexosItemStyle}>
                              <a
                                href={publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: theme.colors.neon,
                                  textDecoration: "none",
                                }}
                              >
                                {a.descricao ?? "arquivo"}
                              </a>
                              <span
                                style={{
                                  fontSize: 10,
                                  color: theme.colors.textMuted,
                                }}
                              >
                                {new Date(a.created_at).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <footer style={footerRowStyle}>
                  <div style={footerInfoStyle}>
                    O cronômetro registra o tempo total da execução. Você pode
                    pausar ou minimizar sem perder o tempo. Ao finalizar, os
                    dados de checklist, tempo, observações e anexos ficam
                    salvos para auditoria.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!isFinalizada && (
                      <button
                        type="button"
                        style={btnPausarStyle}
                        onClick={handlePausar}
                      >
                        {isPaused ? "Retomar" : "Pausar"}
                      </button>
                    )}
                    {!isFinalizada && (
                      <button
                        type="button"
                        style={btnFinalizarStyle}
                        onClick={handleFinalizar}
                      >
                        Finalizar rotina
                      </button>
                    )}
                  </div>
                </footer>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Painel flutuante
  const floating = isMinimized && (
    <div style={floatingPanelStyle}>
      <div style={floatingTitleStyle}>
        Em execução:{" "}
        <span style={{ color: theme.colors.neon }}>{rotina.titulo}</span>
      </div>
      <div style={floatingRowStyle}>
        <span style={floatingTimeStyle}>{formatSeconds(elapsedSeconds)}</span>
        <div style={floatingButtonsStyle}>
          {!isFinalizada && (
            <button
              type="button"
              style={btnRetomarStyle}
              onClick={handleRetomar}
            >
              Maximizar
            </button>
          )}
          {!isFinalizada && (
            <button
              type="button"
              style={btnFinalizarMiniStyle}
              onClick={handleFinalizar}
            >
              Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {modal}
      {floating}
    </>
  );
}
