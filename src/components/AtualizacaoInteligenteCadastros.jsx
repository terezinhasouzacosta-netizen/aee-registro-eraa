import { useMemo, useState } from "react";
import { ClipboardCheck, ShieldCheck } from "lucide-react";
import { analisarAtualizacaoCadastros } from "../utils/cadastroNormalization";

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

function AtualizacaoInteligenteCadastros({ alunos = [], loading = false }) {
  const [filtros, setFiltros] = useState({ turma: "", serie: "", campo: "", status: "" });
  const [confirmacaoRevisao, setConfirmacaoRevisao] = useState(false);
  const [autorizacaoRegistrada, setAutorizacaoRegistrada] = useState(false);
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
    setAutorizacaoRegistrada(false);
  };

  const registrarAutorizacao = () => {
    if (!confirmacaoRevisao) return;
    setAutorizacaoRegistrada(true);
  };

  return (
    <section className="panel" aria-labelledby="atualizacao-inteligente-titulo">
      <h2 id="atualizacao-inteligente-titulo" className="alunos-card-title">
        <span className="alunos-card-title-icon" aria-hidden="true">
          <ClipboardCheck />
        </span>
        Assistente de Atualização dos Cadastros
      </h2>

      <p className="muted">
        Versão para conferência da prévia. Nenhuma atualização será aplicada ao Firebase nesta
        etapa.
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
              setAutorizacaoRegistrada(false);
            }}
          />{" "}
          Confirmo que revisei integralmente a prévia apresentada.
        </label>

        <div className="form-actions">
          <button
            type="button"
            className="alunos-page-button alunos-primary-action"
            disabled={!confirmacaoRevisao || autorizacaoRegistrada}
            onClick={registrarAutorizacao}
          >
            <ShieldCheck aria-hidden="true" />
            Autorizar Atualização
          </button>
        </div>

        {autorizacaoRegistrada ? (
          <p className="toast-success" role="status">
            Autorização registrada somente nesta tela. Nenhum cadastro foi atualizado.
          </p>
        ) : null}
      </section>

      <p className="muted" role="note">
        Diagnóstico, comorbidades, laudo, escola, município, professor(a) do AEE, nome, data de
        nascimento e tipo de acompanhamento não fazem parte desta atualização.
      </p>
    </section>
  );
}

export default AtualizacaoInteligenteCadastros;
