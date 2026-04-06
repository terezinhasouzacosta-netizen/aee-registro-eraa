import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { listarAlunos, listarAlunosPorIds } from "../services/alunosService";
import { listarMonitoramentos } from "../services/monitoramentosService";
import { listarSondagens } from "../services/sondagensService";
import { buscarIdsAlunosVinculados } from "../services/vinculacoesService";
import { podeVisualizarAlunos, visualizaSomenteVinculados } from "../utils/permissions";

const DIAS_ALERTA_MONITORAMENTO = 15;
const PERFIS_RESPONSABILIDADES = [
  {
    perfil: "Professor(a) do AEE",
    funcao:
      "Atuar como referência pedagógica do AEE, organizando o acompanhamento especializado dos alunos.",
    modulos: "Alunos, Sondagem, Habilidades, Acompanhamento, Atendimento AEE, Monitoramento, Relatórios e Painel da Coordenação.",
    registros:
      "Cadastro de alunos, sondagem diagnóstica, habilidades pedagógicas, monitoramento, síntese e relatórios pedagógicos.",
  },
  {
    perfil: "Diretor(a)",
    funcao:
      "Realizar a gestão institucional dos registros e acompanhar indicadores para tomada de decisão escolar.",
    modulos: "Início, Alunos, Sondagem, Habilidades, Acompanhamento, Atendimento AEE, Monitoramento, Relatórios e Painel da Coordenação.",
    registros:
      "Acompanhamento gerencial, validação institucional e apoio na organização dos registros pedagógicos.",
  },
  {
    perfil: "Coordenador(a) Pedagógico(a)",
    funcao:
      "Atuar na organização pedagógica da escola, orientando professores regentes, mediadores, assistentes educacionais e professor do atendimento domiciliar no planejamento, execução e acompanhamento das práticas pedagógicas inclusivas, garantindo intervenções adequadas para os alunos com deficiência.",
    modulos:
      "Início, Alunos, Sondagem, Habilidades, Acompanhamento, Atendimento AEE, Monitoramento, Relatórios e Painel da Coordenação.",
    registros:
      "Acompanhamento pedagógico das turmas, orientação do planejamento docente, análise de sondagens diagnósticas, monitoramento das intervenções realizadas em sala de aula, validação de registros pedagógicos e apoio na elaboração de relatórios.",
  },
  {
    perfil: "Professor(a) regente",
    funcao:
      "Registrar o desenvolvimento do aluno no contexto da sala regular e apoiar o trabalho pedagógico integrado.",
      modulos: "Início, Alunos (leitura), Habilidades (leitura), Acompanhamento, Atendimento AEE e Relatórios (leitura).",
    registros: "Registro do professor no módulo Acompanhamento, por disciplina e por bimestre.",
  },
  {
    perfil: "Mediador",
    funcao:
      "Acompanhar o aluno nas atividades escolares e registrar observações sobre participação e resposta às intervenções.",
    modulos: "Início, Alunos (leitura), Habilidades (leitura), Acompanhamento, Atendimento AEE e Relatórios (leitura).",
    registros: "Diário de bordo no módulo Acompanhamento.",
  },
  {
    perfil: "Assistente educacional",
    funcao:
      "Apoiar o aluno nas rotinas escolares e colaborar com os registros de acompanhamento pedagógico.",
    modulos: "Início, Alunos (leitura), Habilidades (leitura), Acompanhamento, Atendimento AEE e Relatórios (leitura).",
    registros: "Diário de bordo no módulo Acompanhamento.",
  },
  {
    perfil: "Professor(a) do atendimento domiciliar",
    funcao:
      "Conduzir o acompanhamento pedagógico em contexto domiciliar, articulando registros com a equipe escolar.",
    modulos: "Início, Alunos, Habilidades, Acompanhamento, Atendimento AEE e Relatórios.",
    registros:
      "Relatório Pedagógico Individual do AEE e registros de acompanhamento compatíveis com o atendimento realizado.",
  },
];

function formatarDataFlex(data) {
  if (!data) return "-";
  if (data?.toDate) return data.toDate().toLocaleDateString("pt-BR");
  const parsed = new Date(data);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString("pt-BR");
}

function obterMensagemErro(error, mensagemPadrao) {
  const code = String(error?.code || "");
  if (code.includes("permission-denied")) {
    return "Acesso negado para esta consulta no Firestore.";
  }
  if (code.includes("failed-precondition")) {
    return "A consulta exige índice no Firestore. Verifique o console do Firebase.";
  }
  return mensagemPadrao;
}

function DashboardPage() {
  const { currentUser, perfil } = useAuth();
  const location = useLocation();
  const [alunos, setAlunos] = useState([]);
  const [sondagens, setSondagens] = useState([]);
  const [monitoramentos, setMonitoramentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const podeLer = podeVisualizarAlunos(perfil);
  const somenteVinculados = visualizaSomenteVinculados(perfil);

  console.log("[DashboardPage] checagem de acesso", {
    rotaAtual: location.pathname,
    perfilAtual: perfil,
    condicaoPodeLer: "podeVisualizarAlunos(perfil)",
    resultadoPodeLer: podeLer,
    condicaoSomenteVinculados: "visualizaSomenteVinculados(perfil)",
    resultadoSomenteVinculados: somenteVinculados,
  });

  useEffect(() => {
    async function carregarPainel() {
      if (!currentUser || !podeLer) return;

      setLoading(true);
      setErro("");

      try {
        let alunosData = [];
        let idsPermitidos = undefined;

        if (somenteVinculados) {
          idsPermitidos = await buscarIdsAlunosVinculados(currentUser.uid);
          alunosData = await listarAlunosPorIds(idsPermitidos);
        } else {
          alunosData = await listarAlunos();
        }

        const [sondagensData, monitoramentosData] = await Promise.all([
          listarSondagens({ alunoIdsPermitidos: idsPermitidos }),
          listarMonitoramentos({ alunoIdsPermitidos: idsPermitidos }),
        ]);

        setAlunos(alunosData);
        setSondagens(sondagensData);
        setMonitoramentos(monitoramentosData);
      } catch (error) {
        setErro(obterMensagemErro(error, "Não foi possível carregar os indicadores do painel."));
      } finally {
        setLoading(false);
      }
    }

    carregarPainel();
  }, [currentUser, perfil]);

  const monitoramentosRecentes = useMemo(
    () => [...monitoramentos].slice(0, 6),
    [monitoramentos]
  );

  const alunosSemSondagem = useMemo(() => {
    const alunosComSondagem = new Set(sondagens.map((item) => item.alunoId).filter(Boolean));
    return alunos.filter((aluno) => !alunosComSondagem.has(aluno.id));
  }, [alunos, sondagens]);

  const alunosSemMonitoramentoRecente = useMemo(() => {
    const limite = Date.now() - DIAS_ALERTA_MONITORAMENTO * 24 * 60 * 60 * 1000;
    const monitoramentosRecentesPorAluno = new Set(
      monitoramentos
        .filter((item) => {
          const data = item.atualizadoEm?.toDate
            ? item.atualizadoEm.toDate().getTime()
            : item.criadoEm?.toDate
              ? item.criadoEm.toDate().getTime()
              : 0;
          return data >= limite;
        })
        .map((item) => item.alunoId)
        .filter(Boolean)
    );

    return alunos.filter((aluno) => !monitoramentosRecentesPorAluno.has(aluno.id));
  }, [alunos, monitoramentos]);

  useEffect(() => {
    const seletores = [
      ".dashboard-page-wrapper",
      ".dashboard-grid",
      ".alunos-grid",
      ".quick-links",
      ".dashboard-content-block",
      ".dashboard-card",
      ".panel",
      ".stat-card",
      ".meta-card",
    ];

    seletores.forEach((seletor) => {
      const elementos = Array.from(document.querySelectorAll(seletor)).slice(0, 8);
      elementos.forEach((elemento, index) => {
        const computed = window.getComputedStyle(elemento);
        console.log("[DashboardVisualDebug] Estado visual do elemento", {
          seletor,
          index,
          className: elemento.className,
          opacity: computed.opacity,
          filter: computed.filter,
          backgroundColor: computed.backgroundColor,
          boxShadow: computed.boxShadow,
          position: computed.position,
          zIndex: computed.zIndex,
        });
      });
    });
  }, [loading, monitoramentos.length, sondagens.length, alunos.length]);

  if (!podeLer) {
    return (
      <main className="alunos-page">
        <section className="panel">
          <h1>Painel inicial</h1>
          <p>Seu perfil não possui permissão para visualizar o painel.</p>
        </section>
      </main>
    );
  }

  return (
    <main
      className="alunos-page module-page dashboard-page-wrapper"
      style={{
        opacity: 1,
        filter: "none",
        backgroundColor: "#f8fafc",
        boxShadow: "none",
      }}
    >
      <header className="page-header">
        <h1>Painel inicial</h1>
        <p>Visão geral dos registros de sondagem e monitoramento dos alunos.</p>
        <p className="muted">
          Orientação: Este painel inicial apresenta um resumo das informações do sistema,
          permitindo acompanhar os registros realizados e identificar rapidamente situações que
          necessitam de atenção pedagógica.
        </p>
      </header>

      {erro ? <p className="toast-error">{erro}</p> : null}

      <section
        className="dashboard-grid dashboard-content-block"
        style={{ opacity: 1, filter: "none", backgroundColor: "#f8fafc", boxShadow: "none" }}
      >
        <article
          className="panel stat-card dashboard-card"
          style={{ opacity: 1, filter: "none", backgroundColor: "#f8fafc", boxShadow: "none" }}
        >
          <h2>Total de alunos</h2>
          <strong>{alunos.length}</strong>
        </article>
        <article
          className="panel stat-card dashboard-card"
          style={{ opacity: 1, filter: "none", backgroundColor: "#f8fafc", boxShadow: "none" }}
        >
          <h2>Total de sondagens</h2>
          <strong>{sondagens.length}</strong>
        </article>
        <article
          className="panel stat-card dashboard-card"
          style={{ opacity: 1, filter: "none", backgroundColor: "#f8fafc", boxShadow: "none" }}
        >
          <h2>Total de monitoramentos</h2>
          <strong>{monitoramentos.length}</strong>
        </article>
      </section>

      <section
        className="panel quick-links no-print dashboard-content-block dashboard-card"
        style={{ opacity: 1, filter: "none", backgroundColor: "#f8fafc", boxShadow: "none" }}
      >
        <h2>Atalhos</h2>
        <div className="form-actions">
          <Link className="btn-secondary" to="/sondagens">
            Abrir Sondagem
          </Link>
          <Link className="btn-secondary" to="/monitoramentos">
            Abrir Monitoramento
          </Link>
          <Link className="btn-secondary" to="/relatorios">
            Abrir Relatórios
          </Link>
          <Link className="btn-secondary" to="/atendimento-aee">
            Abrir Atendimento AEE
          </Link>
        </div>
      </section>

      <div
        className="alunos-grid dashboard-content-block"
        style={{ opacity: 1, filter: "none", backgroundColor: "#f8fafc", boxShadow: "none" }}
      >
        <section
          className="panel dashboard-card"
          style={{ opacity: 1, filter: "none", backgroundColor: "#f8fafc", boxShadow: "none" }}
        >
          <h2>Monitoramentos recentes</h2>
          {loading ? <p>Carregando...</p> : null}
          {!loading && monitoramentosRecentes.length === 0 ? (
            <p>Nenhum monitoramento recente encontrado.</p>
          ) : null}
          {monitoramentosRecentes.map((item) => (
            <article
              key={item.id}
              className="meta-card dashboard-card"
              style={{ opacity: 1, filter: "none", backgroundColor: "#f8fafc", boxShadow: "none" }}
            >
              <p>
                <strong>Aluno:</strong> {item.alunoNome || "-"}
              </p>
              <p>
                <strong>Data:</strong> {item.dataRegistro || "-"}
              </p>
              <p className="report-text">
                <strong>Observação:</strong> {item.observacao || "-"}
              </p>
              <p className="muted">
                Atualizado em: {formatarDataFlex(item.atualizadoEm || item.criadoEm)}
              </p>
            </article>
          ))}
        </section>

        <section
          className="panel alerts-panel dashboard-card"
          style={{ opacity: 1, filter: "none", backgroundColor: "#f8fafc", boxShadow: "none" }}
        >
          <h2>Alertas pedagógicos</h2>
          <div className="alert-group">
            <p>
              <strong>Alunos sem sondagem:</strong> {alunosSemSondagem.length}
            </p>
            {alunosSemSondagem.length === 0 ? <p className="muted">Nenhum alerta.</p> : null}
            {alunosSemSondagem.slice(0, 8).map((aluno) => (
              <p key={`sem-sondagem-${aluno.id}`} className="muted">
                - {aluno.nome}
              </p>
            ))}
          </div>

          <div className="alert-group">
            <p>
              <strong>Sem monitoramento recente ({DIAS_ALERTA_MONITORAMENTO} dias):</strong>{" "}
              {alunosSemMonitoramentoRecente.length}
            </p>
            {alunosSemMonitoramentoRecente.length === 0 ? (
              <p className="muted">Nenhum alerta.</p>
            ) : null}
            {alunosSemMonitoramentoRecente.slice(0, 8).map((aluno) => (
              <p key={`sem-monitoramento-${aluno.id}`} className="muted">
                - {aluno.nome}
              </p>
            ))}
          </div>
        </section>
      </div>

      <section
        className="panel dashboard-content-block dashboard-card"
        style={{ opacity: 1, filter: "none", backgroundColor: "#f8fafc", boxShadow: "none" }}
      >
        <h2>Perfis e responsabilidades</h2>
        <p className="muted">
          Esta seção orienta o papel de cada usuário na plataforma e os principais registros
          pedagógicos esperados por perfil.
        </p>
        <div className="perfis-grid">
          {PERFIS_RESPONSABILIDADES.map((item) => (
            <article
              key={item.perfil}
              className="perfil-card dashboard-card"
              style={{ opacity: 1, filter: "none", backgroundColor: "#f8fafc", boxShadow: "none" }}
            >
              <h3>{item.perfil}</h3>
              <p>
                <strong>Função no sistema:</strong> {item.funcao}
              </p>
              <p>
                <strong>Módulos que pode utilizar:</strong> {item.modulos}
              </p>
              <p>
                <strong>Registros que deve preencher:</strong> {item.registros}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;



