import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { listarAlunos, listarAlunosPorIds } from "../services/alunosService";
import {
  listarAtendimentosAEE,
  listarAtendimentosAEEPorNome,
} from "../services/atendimentoAeeService";
import { buscarIdsAlunosVinculados } from "../services/vinculacoesService";
import {
  podeVisualizarMonitoramentos,
  visualizaSomenteVinculados,
} from "../utils/permissions";

function converterData(valor) {
  if (!valor) return null;
  if (valor?.toDate) return valor.toDate();

  const texto = String(valor).trim();
  const data = /^\d{4}-\d{2}-\d{2}$/.test(texto)
    ? new Date(`${texto}T12:00:00`)
    : new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarData(valor) {
  const data = converterData(valor);
  return data ? data.toLocaleDateString("pt-BR") : "Sem registros";
}

function calcularDiasDesde(valor) {
  const data = converterData(valor);
  if (!data) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  data.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((hoje.getTime() - data.getTime()) / 86400000));
}

function listarHabilidadesAtendimento(atendimento) {
  const habilidadesSelecionadas = Array.isArray(atendimento?.habilidadesSelecionadas)
    ? atendimento.habilidadesSelecionadas.filter(Boolean)
    : [];
  const complementares = String(atendimento?.habilidadesComplementares || "").trim();
  const legado = String(atendimento?.habilidadesTrabalhadas || "").trim();

  return [...new Set([...habilidadesSelecionadas, complementares, legado].filter(Boolean))];
}

function resumirHabilidades(atendimento) {
  return listarHabilidadesAtendimento(atendimento).join("; ") || "Não informado";
}

function obterEixoMaisTrabalhado(atendimentos) {
  const contagem = new Map();

  atendimentos.forEach((atendimento) => {
    const eixo = String(atendimento?.eixoTematico || "").trim();
    if (!eixo) return;

    const chave = eixo.toLocaleLowerCase("pt-BR");
    const atual = contagem.get(chave) || { eixo, quantidade: 0 };
    atual.quantidade += 1;
    contagem.set(chave, atual);
  });

  return [...contagem.values()].sort((a, b) => b.quantidade - a.quantidade)[0]?.eixo ||
    "Não informado";
}

function obterTextosRecentes(atendimentos, campo, limite = 3) {
  const textos = atendimentos
    .map((atendimento) => String(atendimento?.[campo] || "").trim())
    .filter(Boolean);

  return [...new Set(textos)].slice(0, limite);
}

function ResumoTextualCard({ titulo, textos }) {
  return (
    <article className="panel monitoramento-indicador-card monitoramento-indicador-card--texto">
      <span>{titulo}</span>
      {textos.length ? (
        <ul>
          {textos.map((texto) => (
            <li key={texto}>{texto}</li>
          ))}
        </ul>
      ) : (
        <strong>Não informado</strong>
      )}
    </article>
  );
}

function obterMensagemErro(error, mensagemPadrao) {
  const code = String(error?.code || "");
  if (code.includes("permission-denied")) {
    return "Acesso negado para consultar os registros de Atendimento AEE.";
  }
  if (code.includes("failed-precondition")) {
    return "A consulta exige um índice no Firestore. Verifique a configuração do projeto.";
  }
  return mensagemPadrao;
}

function MonitoramentosPage() {
  const { currentUser, perfil } = useAuth();
  const [alunos, setAlunos] = useState([]);
  const [alunoIdSelecionado, setAlunoIdSelecionado] = useState("");
  const [atendimentos, setAtendimentos] = useState([]);
  const [idsPermitidos, setIdsPermitidos] = useState(undefined);
  const [loadingAlunos, setLoadingAlunos] = useState(true);
  const [loadingAtendimentos, setLoadingAtendimentos] = useState(false);
  const [erro, setErro] = useState("");

  const podeLer = podeVisualizarMonitoramentos(perfil);
  const somenteVinculados = visualizaSomenteVinculados(perfil);

  useEffect(() => {
    async function carregarAlunos() {
      if (!currentUser || !podeLer) return;

      setLoadingAlunos(true);
      setErro("");

      try {
        let ids = undefined;
        let alunosData = [];

        if (somenteVinculados) {
          ids = await buscarIdsAlunosVinculados(currentUser.uid);
          alunosData = await listarAlunosPorIds(ids);
        } else {
          alunosData = await listarAlunos();
        }

        setIdsPermitidos(ids);
        setAlunos(alunosData);
        setAlunoIdSelecionado((anterior) =>
          anterior && alunosData.some((aluno) => aluno.id === anterior)
            ? anterior
            : alunosData[0]?.id || ""
        );
      } catch (error) {
        setAlunos([]);
        setAlunoIdSelecionado("");
        setErro(obterMensagemErro(error, "Não foi possível carregar os alunos."));
      } finally {
        setLoadingAlunos(false);
      }
    }

    carregarAlunos();
  }, [currentUser, podeLer, somenteVinculados]);

  useEffect(() => {
    async function carregarAtendimentos() {
      if (!currentUser || !podeLer || !alunoIdSelecionado) {
        setAtendimentos([]);
        return;
      }

      setLoadingAtendimentos(true);
      setErro("");

      try {
        let registros = await listarAtendimentosAEE({
          alunoId: alunoIdSelecionado,
          alunoIdsPermitidos: idsPermitidos,
        });

        if (registros.length === 0) {
          const alunoAtual = alunos.find((aluno) => aluno.id === alunoIdSelecionado);
          const alunoNome = String(alunoAtual?.nome || "").trim();

          if (alunoNome) {
            registros = await listarAtendimentosAEEPorNome({
              alunoNome,
              alunoId: alunoIdSelecionado,
              alunoIdsPermitidos: idsPermitidos,
            });
          }
        }

        setAtendimentos(registros);
      } catch (error) {
        setAtendimentos([]);
        setErro(
          obterMensagemErro(error, "Não foi possível carregar os registros de Atendimento AEE.")
        );
      } finally {
        setLoadingAtendimentos(false);
      }
    }

    carregarAtendimentos();
  }, [currentUser, podeLer, alunoIdSelecionado, idsPermitidos, alunos]);

  const alunoSelecionado = useMemo(
    () => alunos.find((aluno) => aluno.id === alunoIdSelecionado) || null,
    [alunos, alunoIdSelecionado]
  );

  const atendimentosOrdenados = useMemo(
    () =>
      [...atendimentos].sort((a, b) => {
        const dataA = converterData(a.dataAtendimento)?.getTime() || 0;
        const dataB = converterData(b.dataAtendimento)?.getTime() || 0;
        return dataB - dataA;
      }),
    [atendimentos]
  );

  const ultimoAtendimento = atendimentosOrdenados[0] || null;
  const ultimosAtendimentos = atendimentosOrdenados.slice(0, 5);
  const diasDesdeUltimoAtendimento = calcularDiasDesde(ultimoAtendimento?.dataAtendimento);
  const nomeAluno = ultimoAtendimento?.alunoNome || alunoSelecionado?.nome || "Não informado";
  const eixoMaisTrabalhado = obterEixoMaisTrabalhado(atendimentosOrdenados);
  const habilidadesDesenvolvidas = [
    ...new Set(atendimentosOrdenados.flatMap(listarHabilidadesAtendimento)),
  ];
  const avancosObservados = obterTextosRecentes(atendimentosOrdenados, "avancosPercebidos");
  const dificuldadesObservadas = obterTextosRecentes(
    atendimentosOrdenados,
    "dificuldadesObservadas"
  );
  const observacoesRecentes = obterTextosRecentes(atendimentosOrdenados, "observacoes");

  if (!podeLer) {
    return (
      <main className="alunos-page module-page monitoramento-page">
        <section className="panel">
          <h1>Painel de Evolução Pedagógica</h1>
          <p>Seu perfil não possui permissão para acessar esta área.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="alunos-page module-page monitoramento-page">
      <header className="page-header">
        <h1>Painel de Evolução Pedagógica</h1>
        <p>Visualização integrada da evolução do aluno a partir dos registros realizados no Atendimento AEE.</p>
      </header>

      {erro ? <p className="toast-error">{erro}</p> : null}

      <section className="panel monitoramento-consulta-panel">
        <h2>Consulta por aluno</h2>
        <label htmlFor="alunoMonitoramentoAutomatico">Aluno</label>
        <select
          id="alunoMonitoramentoAutomatico"
          value={alunoIdSelecionado}
          onChange={(event) => setAlunoIdSelecionado(event.target.value)}
          disabled={loadingAlunos}
        >
          <option value="">Selecione</option>
          {alunos.map((aluno) => (
            <option key={aluno.id} value={aluno.id}>
              {aluno.nome}
            </option>
          ))}
        </select>
        {!loadingAlunos && alunos.length === 0 ? (
          <p className="muted">Nenhum aluno disponível para consulta.</p>
        ) : null}
      </section>

      {loadingAtendimentos ? <p className="muted">Carregando monitoramento pedagógico...</p> : null}

      {alunoIdSelecionado && !loadingAtendimentos ? (
        <>
          <section className="monitoramento-indicadores-grid" aria-label="Resumo do monitoramento">
            <article className="panel monitoramento-indicador-card">
              <span>Nome do aluno</span>
              <strong>{nomeAluno}</strong>
            </article>
            <article className="panel monitoramento-indicador-card">
              <span>Último atendimento</span>
              <strong>{formatarData(ultimoAtendimento?.dataAtendimento)}</strong>
            </article>
            <article className="panel monitoramento-indicador-card">
              <span>Total de atendimentos</span>
              <strong>{atendimentosOrdenados.length}</strong>
            </article>
            <article className="panel monitoramento-indicador-card">
              <span>Dias desde o último atendimento</span>
              <strong>
                {diasDesdeUltimoAtendimento === null
                  ? "Sem registros"
                  : `${diasDesdeUltimoAtendimento} dia${diasDesdeUltimoAtendimento === 1 ? "" : "s"}`}
              </strong>
            </article>
            <article className="panel monitoramento-indicador-card">
              <span>Eixo temático mais trabalhado</span>
              <strong>{eixoMaisTrabalhado}</strong>
            </article>
            <ResumoTextualCard titulo="Habilidades desenvolvidas" textos={habilidadesDesenvolvidas} />
            <ResumoTextualCard titulo="Avanços observados" textos={avancosObservados} />
            <ResumoTextualCard titulo="Dificuldades observadas" textos={dificuldadesObservadas} />
            <ResumoTextualCard titulo="Observações pedagógicas recentes" textos={observacoesRecentes} />
          </section>

          <section className="panel monitoramento-historico-panel">
            <h2>Linha do tempo dos últimos atendimentos</h2>
            <p className="muted">Os cinco registros mais recentes são apresentados do mais novo para o mais antigo.</p>

            {ultimosAtendimentos.length === 0 ? (
              <p className="monitoramento-sem-registros">
                Este aluno ainda não possui registros de Atendimento AEE.
              </p>
            ) : (
              <ol className="monitoramento-linha-tempo">
                {ultimosAtendimentos.map((atendimento) => (
                  <li key={atendimento.id} className="monitoramento-linha-tempo-item">
                    <article className="monitoramento-atendimento-card">
                      <div className="monitoramento-atendimento-header">
                        <strong>{formatarData(atendimento.dataAtendimento)}</strong>
                        <span>Semana: {atendimento.semanaReferencia || "Não informada"}</span>
                      </div>
                      <div className="monitoramento-atendimento-conteudo">
                        <p>
                          <strong>Eixo temático</strong>
                          {atendimento.eixoTematico || "Não informado"}
                        </p>
                        <p>
                          <strong>Habilidades trabalhadas</strong>
                          {resumirHabilidades(atendimento)}
                        </p>
                        <p>
                          <strong>Avanços</strong>
                          {atendimento.avancosPercebidos || "Não informado"}
                        </p>
                        <p>
                          <strong>Dificuldades</strong>
                          {atendimento.dificuldadesObservadas || "Não informado"}
                        </p>
                        <p>
                          <strong>Observações</strong>
                          {atendimento.observacoes || "Não informado"}
                        </p>
                        <p>
                          <strong>Encaminhamentos e próximos passos</strong>
                          {atendimento.encaminhamentos || "Não informado"}
                        </p>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

export default MonitoramentosPage;
