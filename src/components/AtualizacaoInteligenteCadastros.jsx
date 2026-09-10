import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ClipboardCheck, ShieldCheck, X } from "lucide-react";
import { aplicarAtualizacoesInteligentesCadastros } from "../services/alunosService";
import { analisarAtualizacaoCadastros } from "../utils/cadastroNormalization";
import "../styles/atualizacao-cadastros.css";

function ResumoItem({ titulo, valor }) {
  return (
    <article className="dashboard-card">
      <h3 className="card-title">{titulo}</h3>
      <strong className="card-value">{valor}</strong>
    </article>
  );
}

function valoresUnicos(itens, campo) {
  return [...new Set(itens.map((item) => item[campo]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true })
  );
}

function AtualizacaoInteligenteCadastros({ alunos = [], loading = false, onAtualizado }) {
  const [filtros, setFiltros] = useState({ turma: "", serie: "", campo: "", status: "" });
  const [confirmacaoRevisao, setConfirmacaoRevisao] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [alteracoesParaConfirmar, setAlteracoesParaConfirmar] = useState([]);
  const [resumoConfirmacao, setResumoConfirmacao] = useState(null);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState("");
  const [relatorioFinal, setRelatorioFinal] = useState(null);
  const botaoConfirmarRef = useRef(null);
  const analise = useMemo(() => analisarAtualizacaoCadastros(alunos), [alunos]);

  const itensFiltrados = useMemo(
    () =>
      analise.alteracoes.filter((item) => {
        if (filtros.turma && item.turmaReferencia !== filtros.turma) return false;
        if (filtros.serie && item.serieReferencia !== filtros.serie) return false;
        if (filtros.campo && item.campo !== filtros.campo) return false;
        if (filtros.status && item.status !== filtros.status) return false;
        return true;
      }),
    [analise.alteracoes, filtros]
  );

  const sugestoesAprovadas = itensFiltrados.filter((item) => item.status === "Aprovado").length;
  const pendenciasManuais = itensFiltrados.filter(
    (item) => item.status === "Revisão Manual"
  ).length;

  const atualizarFiltro = (campo, valor) => {
    setFiltros((atuais) => ({ ...atuais, [campo]: valor }));
    setConfirmacaoRevisao(false);
    setRelatorioFinal(null);
  };

  const abrirConfirmacaoFinal = () => {
    if (!confirmacaoRevisao) return;
    const aprovadas = analise.alteracoes.filter((item) => item.status === "Aprovado");
    setAlteracoesParaConfirmar(aprovadas);
    setResumoConfirmacao({
      alunos: new Set(aprovadas.map((item) => item.alunoId)).size,
      turmas: aprovadas.filter((item) => item.campo === "turma").length,
      series: aprovadas.filter((item) => item.campo === "serieAno").length,
      turnos: aprovadas.filter((item) => item.campo === "turno").length,
      revisaoManual: analise.registrosEdicaoManual,
      registrosManuais: analise.registrosManuais,
    });
    setErro("");
    setConfirmacaoAberta(true);
  };

  const fecharConfirmacao = () => {
    if (executando) return;
    setConfirmacaoAberta(false);
  };

  const confirmarAtualizacao = async () => {
    if (executando || alteracoesParaConfirmar.length === 0) return;

    setExecutando(true);
    setErro("");

    try {
      const resultado = await aplicarAtualizacoesInteligentesCadastros(
        alteracoesParaConfirmar
      );
      const pendentes = new Set([
        ...(resumoConfirmacao?.registrosManuais || []),
        ...resultado.resultados
          .filter((item) => item.status === "revisao")
          .map((item) => item.alunoId),
      ]);

      setRelatorioFinal({
        atualizados: resultado.registrosAtualizados,
        ignorados: resultado.registrosIgnorados,
        erros: resultado.quantidadeErros,
        pendentes: pendentes.size,
      });
      setConfirmacaoAberta(false);
      setConfirmacaoRevisao(false);
      if (onAtualizado) {
        try {
          await onAtualizado();
        } catch (reloadError) {
          console.error(
            "[AtualizacaoInteligenteCadastros] Falha ao recarregar a lista",
            reloadError
          );
          setErro(
            "A atualização foi concluída, mas a lista não pôde ser recarregada automaticamente."
          );
        }
      }
    } catch (error) {
      console.error("[AtualizacaoInteligenteCadastros] Falha na atualização", error);
      setErro(
        "Não foi possível iniciar a atualização. A leitura de segurança falhou e nenhuma gravação foi executada."
      );
      setConfirmacaoAberta(false);
    } finally {
      setExecutando(false);
    }
  };

  useEffect(() => {
    if (!confirmacaoAberta) return undefined;

    botaoConfirmarRef.current?.focus();
    const fecharComEscape = (event) => {
      if (event.key === "Escape" && !executando) fecharConfirmacao();
    };
    document.addEventListener("keydown", fecharComEscape);
    return () => document.removeEventListener("keydown", fecharComEscape);
  }, [confirmacaoAberta, executando]);

  return (
    <section className="panel" aria-labelledby="atualizacao-inteligente-titulo">
      <h2 id="atualizacao-inteligente-titulo" className="alunos-card-title">
        <span className="alunos-card-title-icon" aria-hidden="true">
          <ClipboardCheck />
        </span>
        Assistente de Atualização dos Cadastros
      </h2>

      <p className="muted">
        Confira integralmente a prévia. A gravação somente será iniciada após duas confirmações
        explícitas de segurança.
      </p>

      <div className="dashboard-grid" aria-label="Resumo geral da prévia">
        <ResumoItem titulo="Total de alunos analisados" valor={analise.totalAlunos} />
        <ResumoItem titulo="Turmas a padronizar" valor={analise.turmasNormalizadas} />
        <ResumoItem titulo="Série/Ano a preencher" valor={analise.seriesSugeridas} />
        <ResumoItem titulo="Sugestões de turno" valor={analise.turnosSugeridos} />
        <ResumoItem
          titulo="Registros para revisão manual"
          valor={analise.registrosEdicaoManual}
        />
      </div>

      <section className="panel" aria-labelledby="filtros-atualizacao-titulo">
        <h3 id="filtros-atualizacao-titulo">Filtros da prévia</h3>
        <div className="filters-grid">
          <div>
            <label htmlFor="filtro-atualizacao-turma">Turma</label>
            <select
              id="filtro-atualizacao-turma"
              value={filtros.turma}
              onChange={(event) => atualizarFiltro("turma", event.target.value)}
            >
              <option value="">Todas</option>
              {valoresUnicos(analise.alteracoes, "turmaReferencia").map((valor) => (
                <option key={valor} value={valor}>{valor}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtro-atualizacao-serie">Série/Ano</label>
            <select
              id="filtro-atualizacao-serie"
              value={filtros.serie}
              onChange={(event) => atualizarFiltro("serie", event.target.value)}
            >
              <option value="">Todas</option>
              {valoresUnicos(analise.alteracoes, "serieReferencia").map((valor) => (
                <option key={valor} value={valor}>{valor}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtro-atualizacao-campo">Campo alterado</label>
            <select
              id="filtro-atualizacao-campo"
              value={filtros.campo}
              onChange={(event) => atualizarFiltro("campo", event.target.value)}
            >
              <option value="">Todos</option>
              <option value="turma">Turma</option>
              <option value="serieAno">Série/Ano</option>
              <option value="turno">Turno</option>
            </select>
          </div>

          <div>
            <label htmlFor="filtro-atualizacao-status">Revisão manual</label>
            <select
              id="filtro-atualizacao-status"
              value={filtros.status}
              onChange={(event) => atualizarFiltro("status", event.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Revisão Manual">Revisão Manual</option>
            </select>
          </div>
        </div>
      </section>

      <div className="dashboard-grid" aria-live="polite" aria-label="Contadores da prévia">
        <ResumoItem titulo="Sugestões aprovadas" valor={sugestoesAprovadas} />
        <ResumoItem titulo="Pendências de revisão manual" valor={pendenciasManuais} />
        <ResumoItem titulo="Linhas exibidas" valor={itensFiltrados.length} />
      </div>

      <div className="table-wrapper">
        <table className="alunos-table">
          <thead>
            <tr>
              <th>Nome do aluno</th>
              <th>Campo</th>
              <th>Valor atual</th>
              <th>Valor sugerido</th>
              <th>Motivo da alteração</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.map((item) => (
              <tr key={item.alteracaoId}>
                <td>{item.alunoNome}</td>
                <td>{item.campoRotulo}</td>
                <td>{item.valorAtual}</td>
                <td>{item.valorSugerido}</td>
                <td>{item.motivo}</td>
                <td><span className="badge">{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && itensFiltrados.length === 0 ? (
        <p className="muted">Nenhuma sugestão corresponde aos filtros selecionados.</p>
      ) : null}

      <section className="panel" role="group" aria-label="Autorização da atualização">
        <label>
          <input
            type="checkbox"
            checked={confirmacaoRevisao}
            onChange={(event) => {
              setConfirmacaoRevisao(event.target.checked);
              setRelatorioFinal(null);
            }}
          />{" "}
          Confirmo que revisei integralmente a prévia apresentada.
        </label>

        <div className="form-actions">
          <button
            type="button"
            className="alunos-page-button alunos-primary-action"
            disabled={!confirmacaoRevisao || loading || executando}
            onClick={abrirConfirmacaoFinal}
          >
            <ShieldCheck aria-hidden="true" />
            Autorizar Atualização
          </button>
        </div>

      </section>

      {erro ? <p className="toast-error" role="alert">{erro}</p> : null}

      {relatorioFinal ? (
        <section className="panel" aria-labelledby="relatorio-final-atualizacao">
          <h3 id="relatorio-final-atualizacao">Relatório resumido da atualização</h3>
          <div className="dashboard-grid" aria-live="polite">
            <ResumoItem titulo="Registros atualizados" valor={relatorioFinal.atualizados} />
            <ResumoItem titulo="Registros ignorados" valor={relatorioFinal.ignorados} />
            <ResumoItem titulo="Registros com erro" valor={relatorioFinal.erros} />
            <ResumoItem titulo="Pendentes de revisão" valor={relatorioFinal.pendentes} />
          </div>
        </section>
      ) : null}

      <p className="muted" role="note">
        Diagnóstico, comorbidades, laudo, escola, município, professor(a) do AEE, nome, data de
        nascimento e tipo de acompanhamento não fazem parte desta atualização.
      </p>

      {confirmacaoAberta && resumoConfirmacao ? (
        <div className="cadastro-update-modal-backdrop" role="presentation">
          <section
            className="cadastro-update-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmacao-atualizacao-titulo"
            aria-describedby="confirmacao-atualizacao-aviso"
          >
            <header className="cadastro-update-modal-header">
              <div>
                <span className="cadastro-update-modal-icon" aria-hidden="true">
                  <AlertTriangle />
                </span>
                <h3 id="confirmacao-atualizacao-titulo">Confirmação final de segurança</h3>
              </div>
              <button
                type="button"
                className="cadastro-update-modal-close"
                aria-label="Fechar confirmação"
                disabled={executando}
                onClick={fecharConfirmacao}
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="cadastro-update-modal-summary">
              <ResumoItem titulo="Alunos que serão atualizados" valor={resumoConfirmacao.alunos} />
              <ResumoItem titulo="Turmas que serão padronizadas" valor={resumoConfirmacao.turmas} />
              <ResumoItem titulo="Série/Ano que será preenchido" valor={resumoConfirmacao.series} />
              <ResumoItem titulo="Sugestões de turno" valor={resumoConfirmacao.turnos} />
              <ResumoItem titulo="Registros em revisão manual" valor={resumoConfirmacao.revisaoManual} />
            </div>

            <div id="confirmacao-atualizacao-aviso" className="cadastro-update-security-notice">
              <strong>Esta operação atualizará somente os campos:</strong>
              <ul>
                <li>Turma</li>
                <li>Série/Ano</li>
                <li>Turno (quando aplicável para EJA)</li>
              </ul>
              <p>
                Nenhum diagnóstico, laudo, escola, professor do AEE ou outro dado pedagógico
                será alterado.
              </p>
            </div>

            <footer className="cadastro-update-modal-actions">
              <button
                type="button"
                className="btn-secondary alunos-page-button"
                disabled={executando}
                onClick={fecharConfirmacao}
              >
                Cancelar
              </button>
              <button
                ref={botaoConfirmarRef}
                type="button"
                className="alunos-page-button alunos-primary-action"
                disabled={executando}
                onClick={confirmarAtualizacao}
              >
                {executando ? "Atualizando cadastros..." : "Confirmar Atualização"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default AtualizacaoInteligenteCadastros;
