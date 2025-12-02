// src/components/ExecucaoModal.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { styles } from "../styles";
import { HistoricoExecucoesRotina } from "./HistoricoExecucoesRotina";
import { KpiPorRotina } from "./KpiPorRotina";

type Props = {
  open: boolean;
  rotinaId: string;
  perfil: any;
  onClose: () => void;
};

type Rotina = {
  id: string;
  titulo: string;
  descricao: string | null;
  tem_checklist: boolean;
  tem_anexo: boolean;
};

type Execucao = {
  id: number;
  rotina_id: string;
  executor_id: string;
  inicio_em: string | null;
  pausado_em: string | null;
  finalizado_em: string | null;
  duracao_total_segundos: number | null;
  observacoes: string | null;
};

type ChecklistItem = {
  id: number;
  rotina_id: string;
  ordem: number;
  descricao: string;
  concluido: boolean;
};

type Anexo = {
  name: string;
  url: string;
};

export function ExecucaoModal({ open, rotinaId, perfil, onClose }: Props) {
  const [rotina, setRotina] = useState<Rotina | null>(null);
  const [execucao, setExecucao] = useState<Execucao | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [observacao, setObservacao] = useState("");

  // cronômetro
  const [cronometro, setCronometro] = useState("00:00:00");
  const [intervalId, setIntervalId] = useState<any>(null);

  // histórico
  const [verHistorico, setVerHistorico] = useState(false);

  // ----------------------------------
  // FORMATA SEGUNDOS → hh:mm:ss
  // ----------------------------------
  const formatTime = (seg: number) => {
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    const s = seg % 60;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  };

  // ----------------------------------
  // CARREGAR ROTINA
  // ----------------------------------
  const carregarRotina = async () => {
    const { data, error } = await supabase
      .from("rotinas")
      .select(
        `
        id,
        titulo,
        descricao,
        tem_checklist,
        tem_anexo
      `
      )
      .eq("id", rotinaId)
      .single();

    if (error) {
      console.error(error);
      setErro("Erro ao carregar rotina.");
      return;
    }

    setRotina(data as Rotina);
  };

  // ----------------------------------
  // CARREGAR EXECUÇÃO ATUAL (OU NENHUMA)
  // ----------------------------------
  const carregarExecucao = async () => {
    const { data, error } = await supabase
      .from("rotina_execucoes")
      .select("*")
      .eq("rotina_id", rotinaId)
      .eq("executor_id", perfil.id)
      .order("inicio_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      const e = data as Execucao;
      setExecucao(e);
      if (e.observacoes) setObservacao(e.observacoes);
    }
  };

  // ----------------------------------
  // CARREGAR CHECKLIST (SE EXISTIR)
  // Tabela sugerida: rotina_checklist
  // id, rotina_id, ordem, descricao, concluido
  // ----------------------------------
  const carregarChecklist = async () => {
    const { data, error } = await supabase
      .from("rotina_checklist")
      .select("*")
      .eq("rotina_id", rotinaId)
      .order("ordem", { ascending: true });

    if (error) {
      console.warn("Erro ao carregar checklist (opcional):", error.message);
      return;
    }

    setChecklist((data ?? []) as ChecklistItem[]);
  };

  // ----------------------------------
  // INICIAR EXECUÇÃO (SE AINDA NÃO TIVER)
  // ----------------------------------
  const iniciarExecucao = async () => {
    if (!rotinaId || execucao) return;

    const { data, error } = await supabase
      .from("rotina_execucoes")
      .insert({
        rotina_id: rotinaId,
        executor_id: perfil.id,
        inicio_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      setErro("Erro ao iniciar execução.");
      return;
    }

    setExecucao(data as Execucao);
  };

  // ----------------------------------
  // CRONÔMETRO EM TEMPO REAL
  // ----------------------------------
  useEffect(() => {
    if (!execucao || !execucao.inicio_em || execucao.finalizado_em) {
      setCronometro("00:00:00");
      if (intervalId) clearInterval(intervalId);
      return;
    }

    const inicio = new Date(execucao.inicio_em).getTime();

    const t = setInterval(() => {
      const now = Date.now();
      const total = Math.floor((now - inicio) / 1000);
      setCronometro(formatTime(total));
    }, 1000);

    setIntervalId(t);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execucao?.inicio_em, execucao?.finalizado_em]);

  // ----------------------------------
  // PAUSAR
  // ----------------------------------
  const pausar = async () => {
    if (!execucao) return;

    if (intervalId) clearInterval(intervalId);

    const { data, error } = await supabase
      .from("rotina_execucoes")
      .update({ pausado_em: new Date().toISOString() })
      .eq("id", execucao.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      setErro("Erro ao pausar execução.");
      return;
    }

    setExecucao(data as Execucao);
  };

  // ----------------------------------
  // RETOMAR
  // ----------------------------------
  const retomar = async () => {
    if (!execucao) return;

    const { data, error } = await supabase
      .from("rotina_execucoes")
      .update({ pausado_em: null })
      .eq("id", execucao.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      setErro("Erro ao retomar execução.");
      return;
    }

    setExecucao(data as Execucao);
  };

  // ----------------------------------
  // FINALIZAR EXECUÇÃO
  // ----------------------------------
  const finalizar = async () => {
    if (!execucao || !execucao.inicio_em) return;

    if (intervalId) clearInterval(intervalId);

    const inicio = new Date(execucao.inicio_em).getTime();
    const fim = Date.now();

    const total = Math.floor((fim - inicio) / 1000);

    const { error } = await supabase
      .from("rotina_execucoes")
      .update({
        finalizado_em: new Date().toISOString(),
        duracao_total_segundos: total,
        observacoes: observacao || null,
      })
      .eq("id", execucao.id);

    if (error) {
      console.error(error);
      setErro("Erro ao finalizar execução.");
      return;
    }

    onClose();
  };

  // ----------------------------------
  // MARCAR ITEM DE CHECKLIST
  // ----------------------------------
  const toggleChecklistItem = async (item: ChecklistItem, novoValor: boolean) => {
    setChecklist((prev) =>
      prev.map((c) =>
        c.id === item.id ? { ...c, concluido: novoValor } : c
      )
    );

    const { error } = await supabase
      .from("rotina_checklist")
      .update({ concluido: novoValor })
      .eq("id", item.id);

    if (error) {
      console.error(error);
      setErro("Erro ao atualizar checklist.");
    }
  };

  // ----------------------------------
  // UPLOAD DE ANEXOS (Supabase Storage)
  // Bucket sugerido: rotina-anexos
  // ----------------------------------
  const handleUploadAnexo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !rotinaId) return;

    const bucket = supabase.storage.from("rotina-anexos");

    const novos: Anexo[] = [];

    for (const file of Array.from(files)) {
      const path = `${rotinaId}/${Date.now()}-${file.name}`;
      const { error } = await bucket.upload(path, file);

      if (error) {
        console.error("Erro upload:", error.message);
        setErro("Erro ao enviar anexo.");
      } else {
        const { data: urlData } = bucket.getPublicUrl(path);
        if (urlData?.publicUrl) {
          novos.push({ name: file.name, url: urlData.publicUrl });
        }
      }
    }

    if (novos.length > 0) {
      setAnexos((prev) => [...prev, ...novos]);
    }
  };

  // ----------------------------------
  // QUANDO O MODAL ABRIR
  // ----------------------------------
  useEffect(() => {
    if (!open || !rotinaId) return;

    setErro(null);
    setExecucao(null);
    setCronometro("00:00:00");
    setChecklist([]);
    setAnexos([]);
    setVerHistorico(false);

    (async () => {
      setLoading(true);
      await carregarRotina();
      await carregarExecucao();
      await carregarChecklist();
      setLoading(false);
      await iniciarExecucao(); // cria execução se não existir
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rotinaId]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#020617",
          borderRadius: 18,
          padding: 18,
          minWidth: 420,
          maxWidth: 720,
          width: "100%",
          border: "1px solid #1e293b",
          color: "#e5e7eb",
        }}
      >
        {loading || !rotina ? (
          <p style={{ color: "#cbd5e1" }}>Carregando…</p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>{rotina.titulo}</h3>
                {rotina.descricao && (
                  <p
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "#94a3b8",
                    }}
                  >
                    {rotina.descricao}
                  </p>
                )}
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: "#22c55e",
                  }}
                >
                  {cronometro}
                </div>
                <button
                  type="button"
                  onClick={() => setVerHistorico((v) => !v)}
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: "1px solid #334155",
                    background: "rgba(15,23,42,0.9)",
                    cursor: "pointer",
                    color: "#e5e7eb",
                  }}
                >
                  {verHistorico ? "Ocultar histórico" : "Ver histórico"}
                </button>
              </div>
            </div>

            {/* KPIs da rotina */}
            <div style={{ marginBottom: 8 }}>
              <KpiPorRotina rotinaId={rotinaId} />
            </div>

            {erro && (
              <div
                style={{
                  background: "rgba(220,38,38,0.15)",
                  padding: 6,
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#fecaca",
                  marginBottom: 8,
                }}
              >
                {erro}
              </div>
            )}

            {/* HISTÓRICO */}
            {verHistorico && (
              <div
                style={{
                  marginBottom: 12,
                  maxHeight: 180,
                  overflowY: "auto",
                  borderRadius: 8,
                  border: "1px solid #1f2937",
                  padding: 8,
                  background: "#020617",
                }}
              >
                <HistoricoExecucoesRotina rotinaId={rotinaId} />
              </div>
            )}

            {/* CHECKLIST */}
            {rotina.tem_checklist && checklist.length > 0 && (
              <div
                style={{
                  marginTop: 4,
                  marginBottom: 10,
                  padding: 8,
                  borderRadius: 10,
                  border: "1px solid #1f2937",
                  background: "#020617",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#e5e7eb",
                    marginBottom: 4,
                    fontWeight: 500,
                  }}
                >
                  Checklist
                </div>
                {checklist.map((item) => (
                  <label
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      fontSize: 13,
                      padding: "2px 0",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.concluido}
                      onChange={(e) =>
                        toggleChecklistItem(item, e.target.checked)
                      }
                    />
                    <span
                      style={{
                        textDecoration: item.concluido
                          ? "line-through"
                          : "none",
                        color: item.concluido ? "#6ee7b7" : "#e5e7eb",
                      }}
                    >
                      {item.descricao}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* OBSERVAÇÃO */}
            <label style={{ fontSize: 12, color: "#cbd5e1" }}>
              Observação
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: 60,
                  marginTop: 6,
                  ...styles.input,
                }}
              />
            </label>

            {/* ANEXOS */}
            {rotina.tem_anexo && (
              <div style={{ marginTop: 10, marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#cbd5e1",
                    marginBottom: 4,
                  }}
                >
                  Anexos
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleUploadAnexo}
                  style={{ fontSize: 12 }}
                />
                {anexos.length > 0 && (
                  <ul
                    style={{
                      marginTop: 6,
                      paddingLeft: 16,
                      fontSize: 12,
                      maxHeight: 100,
                      overflowY: "auto",
                    }}
                  >
                    {anexos.map((a, idx) => (
                      <li key={idx}>
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#38bdf8" }}
                        >
                          {a.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* BOTÕES */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 16,
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                {!execucao?.finalizado_em && (
                  <>
                    {execucao?.pausado_em ? (
                      <button
                        type="button"
                        onClick={retomar}
                        style={{
                          ...styles.button,
                          background: "#22c55e",
                          color: "#000",
                        }}
                      >
                        Retomar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={pausar}
                        style={{
                          ...styles.button,
                          background: "#f59e0b",
                          color: "#000",
                        }}
                      >
                        Pausar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={finalizar}
                      style={{
                        ...styles.button,
                        background: "#ef4444",
                        color: "#fff",
                      }}
                    >
                      Finalizar
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  ...styles.buttonSecondary,
                  background: "#1e293b",
                  border: "1px solid #334155",
                }}
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
