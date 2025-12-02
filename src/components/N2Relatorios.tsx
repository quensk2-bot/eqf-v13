// src/components/N2Relatorios.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Usuario } from "../types";
import { styles, theme } from "../styles";

type Props = {
  perfil: Usuario | null;
};

type ExecucaoDb = {
  id: number;
  rotina_id: string;
  executor_id: string;
  inicio_em: string | null;
  finalizado_em: string | null;
  duracao_total_segundos: number | null;
  checklist_execucao: any | null;
};

type RotinaDb = {
  id: string;
  titulo: string;
  tem_checklist: boolean;
};

type UsuarioDb = {
  id: string;
  nome: string;
};

type AnexoDb = {
  id: number;
  execucao_id: number | null;
  descricao: string | null;
  storage_path: string;
  created_at: string;
};

type RelatorioRow = {
  execucaoId: number;
  data: string;
  hora: string;
  rotina: string;
  executor: string;
  status: "Concluída" | "Pendente";
  qtdChecklist: number;
  qtdAnexos: number;
};

type StatusFiltro = "todas" | "concluida" | "pendente";

const STORAGE_BUCKET =
  import.meta.env.VITE_EQF_ANEXOS_BUCKET ?? "rotinas-anexos";

export function N2Relatorios({ perfil }: Props) {
  const hoje = useMemo(() => new Date(), []);
  const seteDiasAtras = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const [dataInicio, setDataInicio] = useState(
    seteDiasAtras.toISOString().slice(0, 10)
  );
  const [dataFim, setDataFim] = useState(hoje.toISOString().slice(0, 10));
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todas");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<RelatorioRow[]>([]);
  const [anexosPorExecucao, setAnexosPorExecucao] = useState<
    Record<number, AnexoDb[]>
  >({});

  const [execucaoSelecionada, setExecucaoSelecionada] = useState<
    number | null
  >(null);

  const anexosSelecionados =
    execucaoSelecionada != null ? anexosPorExecucao[execucaoSelecionada] ?? [] : [];

  const podeGerar = perfil && dataInicio && dataFim;

  const handleCarregar = async () => {
    if (!perfil) return;
    setCarregando(true);
    setErro(null);
    setLinhas([]);
    setAnexosPorExecucao({});

    try {
      // 1) Rotinas da regional / setor
      let qRotinas = supabase
        .from("rotinas")
        .select("id, titulo, tem_checklist, regional_id, setor_id");

      if (perfil.regional_id) {
        qRotinas = qRotinas.eq("regional_id", perfil.regional_id);
      } else if (perfil.setor_id) {
        qRotinas = qRotinas.eq("setor_id", perfil.setor_id);
      }

      const { data: rotinasData, error: erroRotinas } = await qRotinas;

      if (erroRotinas) {
        console.error("Erro ao buscar rotinas para relatórios:", erroRotinas);
        setErro("Erro ao buscar rotinas da regional.");
        setCarregando(false);
        return;
      }

      const rotinas = (rotinasData ?? []) as RotinaDb[];

      if (!rotinas.length) {
        setLinhas([]);
        setCarregando(false);
        return;
      }

      const mapaRotinas = new Map<string, RotinaDb>();
      for (const r of rotinas) {
        mapaRotinas.set(r.id, r);
      }

      const idsRotinas = rotinas.map((r) => r.id);

      // 2) Execuções no período
      const inicioIso = dataInicio + "T00:00:00";
      const fimIso = dataFim + "T23:59:59";

      const { data: execsData, error: erroExecs } = await supabase
        .from("rotina_execucoes")
        .select(
          "id, rotina_id, executor_id, inicio_em, finalizado_em, duracao_total_segundos, checklist_execucao"
        )
        .in("rotina_id", idsRotinas)
        .gte("inicio_em", inicioIso)
        .lte("inicio_em", fimIso)
        .order("inicio_em", { ascending: false });

      if (erroExecs) {
        console.error(
          "Erro ao buscar execuções para relatórios:",
          erroExecs
        );
        setErro("Erro ao buscar execuções no período.");
        setCarregando(false);
        return;
      }

      let execucoes = (execsData ?? []) as ExecucaoDb[];

      // filtro de status em memória
      if (statusFiltro === "concluida") {
        execucoes = execucoes.filter((e) => e.finalizado_em != null);
      } else if (statusFiltro === "pendente") {
        execucoes = execucoes.filter((e) => e.finalizado_em == null);
      }

      if (!execucoes.length) {
        setLinhas([]);
        setCarregando(false);
        return;
      }

      const execIds = execucoes.map((e) => e.id);
      const executorIds = Array.from(
        new Set(execucoes.map((e) => e.executor_id))
      );

      // 3) Usuários (para nomes)
      const { data: usuariosData, error: erroUsuarios } = await supabase
        .from("usuarios")
        .select("id, nome")
        .in("id", executorIds);

      if (erroUsuarios) {
        console.error("Erro ao buscar usuários:", erroUsuarios);
      }

      const mapaUsuarios = new Map<string, UsuarioDb>();
      for (const u of (usuariosData ?? []) as UsuarioDb[]) {
        mapaUsuarios.set(u.id, u);
      }

      // 4) Anexos por execução
      const { data: anexosData, error: erroAnexos } = await supabase
        .from("rotina_anexos")
        .select("id, execucao_id, descricao, storage_path, created_at")
        .in("execucao_id", execIds);

      if (erroAnexos) {
        console.error("Erro ao buscar anexos:", erroAnexos);
      }

      const mapaAnexos: Record<number, AnexoDb[]> = {};
      for (const a of (anexosData ?? []) as AnexoDb[]) {
        if (!a.execucao_id) continue;
        if (!mapaAnexos[a.execucao_id]) {
          mapaAnexos[a.execucao_id] = [];
        }
        mapaAnexos[a.execucao_id].push(a);
      }

      // 5) Montar linhas do relatório
      const linhasRelatorio: RelatorioRow[] = execucoes
        .filter((e) => !!e.inicio_em)
        .map((e) => {
          const rotina = mapaRotinas.get(e.rotina_id);
          const usuario = mapaUsuarios.get(e.executor_id);
          const d = e.inicio_em ? new Date(e.inicio_em) : null;
          const data =
            d?.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            }) ?? "";
          const hora =
            d?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ??
            "";

          const status: "Concluída" | "Pendente" = e.finalizado_em
            ? "Concluída"
            : "Pendente";

          let qtdChecklist = 0;
          if (Array.isArray(e.checklist_execucao)) {
            qtdChecklist = e.checklist_execucao.length;
          }

          const qtdAnexos = mapaAnexos[e.id]?.length ?? 0;

          return {
            execucaoId: e.id,
            data,
            hora,
            rotina: rotina?.titulo ?? e.rotina_id,
            executor: usuario?.nome ?? e.executor_id,
            status,
            qtdChecklist,
            qtdAnexos,
          };
        });

      setLinhas(linhasRelatorio);
      setAnexosPorExecucao(mapaAnexos);
    } catch (err) {
      console.error("Erro inesperado ao montar relatório N2:", err);
      setErro("Erro inesperado ao montar relatório.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    // carregamento inicial automático
    if (perfil) {
      void handleCarregar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  const handleExportarCsv = () => {
    if (!linhas.length) return;

    const header = [
      "Execução ID",
      "Data",
      "Hora",
      "Rotina",
      "Executor",
      "Status",
      "Qtd Checklist",
      "Qtd Anexos",
    ];

    const rows = linhas.map((l) => [
      l.execucaoId,
      l.data,
      l.hora,
      l.rotina,
      l.executor,
      l.status,
      l.qtdChecklist,
      l.qtdAnexos,
    ]);

    const csv = [header, ...rows]
      .map((r) => r.join(";"))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio_rotinas_regional.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImprimir = () => {
    if (!linhas.length) return;

    const win = window.open("", "_blank", "width=1024,height=768");
    if (!win) return;

    const htmlRows = linhas
      .map(
        (l) => `
      <tr>
        <td>${l.execucaoId}</td>
        <td>${l.data}</td>
        <td>${l.hora}</td>
        <td>${l.rotina}</td>
        <td>${l.executor}</td>
        <td>${l.status}</td>
        <td>${l.qtdChecklist}</td>
        <td>${l.qtdAnexos}</td>
      </tr>
    `
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Relatório – Rotinas Regional</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              padding: 16px;
              background: #ffffff;
              color: #111827;
            }
            h1 {
              font-size: 18px;
              margin-bottom: 4px;
            }
            p {
              font-size: 12px;
              margin-top: 0;
              margin-bottom: 12px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 4px 6px;
              text-align: left;
            }
            th {
              background: #f3f4f6;
            }
          </style>
        </head>
        <body>
          <h1>Relatório de execuções – Regional</h1>
          <p>Período: ${dataInicio} a ${dataFim}</p>
          <table>
            <thead>
              <tr>
                <th>Execução</th>
                <th>Data</th>
                <th>Hora</th>
                <th>Rotina</th>
                <th>Executor</th>
                <th>Status</th>
                <th>Checklist (itens)</th>
                <th>Anexos</th>
              </tr>
            </thead>
            <tbody>
              ${htmlRows}
            </tbody>
          </table>
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
  };

  const handleAbrirAnexos = (execucaoId: number) => {
    setExecucaoSelecionada(execucaoId);
  };

  const handleFecharAnexos = () => {
    setExecucaoSelecionada(null);
  };

  const handleDownloadAnexo = async (anexo: AnexoDb) => {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(anexo.storage_path);

      if (error || !data) {
        console.error("Erro ao baixar anexo:", error);
        alert("Não foi possível baixar o anexo.");
        return;
      }

      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = blobUrl;
      const nomeArquivo =
        anexo.descricao && anexo.descricao.trim().length > 0
          ? anexo.descricao.trim()
          : `anexo_${anexo.id}`;
      a.download = nomeArquivo;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Erro inesperado ao baixar anexo:", err);
      alert("Erro inesperado ao baixar anexo.");
    }
  };

  return (
    <section>
      {/* PageCard interno da área de relatórios */}
      <div
        style={{
          borderRadius: 16,
          padding: 14,
          border: `1px solid ${theme.colors.orangeSoft}`,
          background:
            "radial-gradient(circle at top left, rgba(249,115,22,0.15), #020617)",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 10px",
            borderRadius: 999,
            border: `1px solid rgba(249,115,22,0.7)`,
            background: "rgba(15,23,42,0.95)",
            fontSize: 11,
            letterSpacing: 0.5,
            color: theme.colors.orangeSoft,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "999px",
              background: "#22c55e",
              marginRight: 6,
            }}
          />
          <span>Relatórios · N2</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#f9fafb" }}>
          Relatórios da regional (execuções & anexos)
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 12,
            color: "#e5e7eb",
            maxWidth: 640,
          }}
        >
          Gere uma visão tabular das execuções da regional no período,
          exporte para Excel / PDF e consulte anexos vinculados às rotinas.
        </div>
      </div>

      {/* Filtros */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "flex-end",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={styles.label}>Data inicial</label>
          <input
            type="date"
            style={{ ...styles.input, minWidth: 160 }}
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={styles.label}>Data final</label>
          <input
            type="date"
            style={{ ...styles.input, minWidth: 160 }}
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={styles.label}>Status da execução</label>
          <select
            style={{ ...styles.input, minWidth: 160 }}
            value={statusFiltro}
            onChange={(e) =>
              setStatusFiltro(e.target.value as StatusFiltro)
            }
          >
            <option value="todas">Todas</option>
            <option value="concluida">Apenas concluídas</option>
            <option value="pendente">Apenas pendentes</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button
            type="button"
            onClick={handleCarregar}
            disabled={!podeGerar || carregando}
            style={{
              ...styles.buttonPrimary,
              padding: "8px 14px",
              fontSize: 13,
              opacity: !podeGerar ? 0.6 : 1,
            }}
          >
            {carregando ? "Carregando..." : "Gerar relatório"}
          </button>
          <button
            type="button"
            onClick={handleExportarCsv}
            disabled={!linhas.length}
            style={{
              ...styles.button,
              padding: "8px 14px",
              fontSize: 13,
              borderRadius: 999,
              border: `1px solid ${theme.colors.borderSoft}`,
              background: "transparent",
              color: "#e5e7eb",
              opacity: !linhas.length ? 0.5 : 1,
            }}
          >
            Exportar Excel (CSV)
          </button>
          <button
            type="button"
            onClick={handleImprimir}
            disabled={!linhas.length}
            style={{
              ...styles.button,
              padding: "8px 14px",
              fontSize: 13,
              borderRadius: 999,
              border: `1px solid ${theme.colors.borderSoft}`,
              background: "transparent",
              color: "#e5e7eb",
              opacity: !linhas.length ? 0.5 : 1,
            }}
          >
            Imprimir / PDF
          </button>
        </div>
      </div>

      {erro && (
        <div
          style={{
            marginBottom: 8,
            fontSize: 12,
            color: "#fecaca",
          }}
        >
          {erro}
        </div>
      )}

      {/* Tabela */}
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${theme.colors.borderSoft}`,
          background: theme.colors.bgElevated,
          maxHeight: 320,
          overflow: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              {[
                "Execução",
                "Data",
                "Hora",
                "Rotina",
                "Executor",
                "Status",
                "Checklist (itens)",
                "Anexos",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: `1px solid ${theme.colors.borderSoft}`,
                    background: "#020617",
                    color: "#e5e7eb",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: 8,
                    textAlign: "center",
                    color: "#e5e7eb",
                  }}
                >
                  Carregando dados...
                </td>
              </tr>
            )}
            {!carregando && !linhas.length && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: 8,
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  Nenhuma execução encontrada para o período e filtros
                  selecionados.
                </td>
              </tr>
            )}
            {!carregando &&
              linhas.map((l) => (
                <tr key={l.execucaoId}>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${theme.colors.borderSoft}`,
                      color: "#e5e7eb",
                    }}
                  >
                    {l.execucaoId}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${theme.colors.borderSoft}`,
                      color: "#e5e7eb",
                    }}
                  >
                    {l.data}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${theme.colors.borderSoft}`,
                      color: "#e5e7eb",
                    }}
                  >
                    {l.hora}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${theme.colors.borderSoft}`,
                      color: "#f9fafb",
                    }}
                  >
                    {l.rotina}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${theme.colors.borderSoft}`,
                      color: "#e5e7eb",
                    }}
                  >
                    {l.executor}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${theme.colors.borderSoft}`,
                      color:
                        l.status === "Concluída" ? "#bbf7d0" : "#fde68a",
                    }}
                  >
                    {l.status}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${theme.colors.borderSoft}`,
                      color: "#e5e7eb",
                      textAlign: "center",
                    }}
                  >
                    {l.qtdChecklist}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${theme.colors.borderSoft}`,
                      color: "#e5e7eb",
                    }}
                  >
                    {l.qtdAnexos > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleAbrirAnexos(l.execucaoId)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: theme.colors.orangeSoft,
                          cursor: "pointer",
                          fontSize: 12,
                          textDecoration: "underline",
                        }}
                      >
                        Ver ({l.qtdAnexos})
                      </button>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal simples de anexos */}
      {execucaoSelecionada != null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: theme.colors.bgElevated,
              borderRadius: 16,
              border: `1px solid ${theme.colors.borderSoft}`,
              padding: 16,
              boxShadow: "0 24px 80px rgba(0,0,0,0.9)",
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
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: theme.colors.textMuted,
                  }}
                >
                  Execução #{execucaoSelecionada}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#f9fafb",
                  }}
                >
                  Anexos da execução
                </div>
              </div>
              <button
                type="button"
                onClick={handleFecharAnexos}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${theme.colors.borderSoft}`,
                  padding: "4px 10px",
                  background: "transparent",
                  color: "#e5e7eb",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Fechar
              </button>
            </div>

            {anexosSelecionados.length === 0 && (
              <p
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                Nenhum anexo encontrado para esta execução.
              </p>
            )}

            {anexosSelecionados.length > 0 && (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  maxHeight: 280,
                  overflow: "auto",
                }}
              >
                {anexosSelecionados.map((a) => (
                  <li
                    key={a.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: `1px solid ${theme.colors.borderSoft}`,
                      gap: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#f9fafb",
                        }}
                      >
                        {a.descricao && a.descricao.trim().length > 0
                          ? a.descricao
                          : `Anexo ${a.id}`}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                        }}
                      >
                        {new Date(a.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadAnexo(a)}
                      style={{
                        borderRadius: 999,
                        border: "none",
                        fontSize: 12,
                        padding: "6px 10px",
                        cursor: "pointer",
                        background:
                          "linear-gradient(90deg,#22c55e,#a3e635)",
                        color: "#020617",
                        fontWeight: 600,
                      }}
                    >
                      Baixar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
