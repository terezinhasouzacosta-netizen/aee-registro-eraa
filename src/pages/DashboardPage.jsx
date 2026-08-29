import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  ClipboardList,
  ClipboardPen,
  Clock3,
  FileCheck2,
  FileBarChart,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  MessagesSquare,
  NotebookPen,
  School,
  Stethoscope,
  SunMedium,
  Target,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { listarAlunos, listarAlunosPorIds } from "../services/alunosService";
import { listarEstudosCaso } from "../services/estudosCasoService";
import { listarMonitoramentos } from "../services/monitoramentosService";
import { listarPaees, listarPaeesPorAlunoId } from "../services/paeesService";
import { listarPeis, listarPeisPorAlunoId } from "../services/peisService";
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

function obterSaudacaoPorHorario(dataAtual = new Date()) {
  const hora = dataAtual.getHours();

  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

function obterNomeUsuario(currentUser) {
  const nomeExibicao = currentUser?.displayName?.trim();
  if (!nomeExibicao) return "";

  const nomeNormalizado = nomeExibicao
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (nomeNormalizado === "aee" || nomeNormalizado.startsWith("aee ")) return "";
  return nomeExibicao;
}

const ORDEM_DIAGNOSTICOS = [
  "TEA",
  "TDAH",
  "Deficiência Intelectual (DI)",
  "Dislexia",
  "Deficiência Física",
  "Deficiência Visual",
  "Deficiência Auditiva",
  "Síndrome de Down",
  "Altas Habilidades/Superdotação",
  "Outros",
  "Não informado",
];

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function classificarDiagnostico(valor) {
  const diagnostico = normalizarTexto(valor);
  if (!diagnostico) return "Não informado";
  if (/altas habilidades|superdot/.test(diagnostico)) return "Altas Habilidades/Superdotação";
  if (/tdah|deficit de atencao|hiperativ/.test(diagnostico)) return "TDAH";
  if (/\btea\b|autis/.test(diagnostico)) return "TEA";
  if (/sindrome de down|\bdown\b/.test(diagnostico)) return "Síndrome de Down";
  if (/dislexia/.test(diagnostico)) return "Dislexia";
  if (/deficiencia visual|baixa visao|cegueira/.test(diagnostico)) return "Deficiência Visual";
  if (/deficiencia auditiva|surdez|surdo/.test(diagnostico)) return "Deficiência Auditiva";
  if (/deficiencia fisica|mobilidade|motora/.test(diagnostico)) return "Deficiência Física";
  if (/deficiencia intelectual|\bdi\b/.test(diagnostico)) {
    return "Deficiência Intelectual (DI)";
  }
  return "Outros";
}

function agruparDistribuicao(alunos, obterValor, ordemPreferencial) {
  const contagens = alunos.reduce((resultado, aluno) => {
    const valor = obterValor(aluno) || "Não informado";
    resultado.set(valor, (resultado.get(valor) || 0) + 1);
    return resultado;
  }, new Map());

  const ordem = ordemPreferencial || [];
  return Array.from(contagens, ([label, total]) => ({
    label,
    total,
    percentual: alunos.length ? Math.round((total / alunos.length) * 100) : 0,
  })).sort((a, b) => {
    if (ordem.length) {
      const indiceA = ordem.indexOf(a.label);
      const indiceB = ordem.indexOf(b.label);
      return (indiceA < 0 ? ordem.length : indiceA) - (indiceB < 0 ? ordem.length : indiceB);
    }
    if (a.label === "Não informado") return 1;
    if (b.label === "Não informado") return -1;
    return a.label.localeCompare(b.label, "pt-BR", { numeric: true });
  });
}

function obterRegistrosMaisRecentes(registros) {
  return registros.reduce((resultado, registro) => {
    if (!registro.alunoId) return resultado;
    const atual = resultado.get(registro.alunoId);
    const obterTempo = (item) => {
      const data = item?.atualizadoEm || item?.criadoEm || item?.updatedAt || item?.createdAt;
      if (data?.toDate) return data.toDate().getTime();
      const dataConvertida = new Date(data || 0);
      return Number.isNaN(dataConvertida.getTime()) ? 0 : dataConvertida.getTime();
    };
    if (!atual || obterTempo(registro) > obterTempo(atual)) {
      resultado.set(registro.alunoId, registro);
    }
    return resultado;
  }, new Map());
}

function registroConcluido(registro) {
  if (!registro) return false;
  return normalizarTexto(registro.statusGeral || registro.status).includes("conclu") || Boolean(registro.dataConclusao);
}

function estaEmInvestigacaoDiagnostica(aluno) {
  const indicadorDireto = normalizarTexto(aluno?.emInvestigacao);
  const situacao = normalizarTexto(
    aluno?.situacaoDiagnostica ||
      aluno?.statusDiagnostico ||
      aluno?.statusAvaliacao ||
      aluno?.situacaoAvaliacao
  );

  return (
    aluno?.emInvestigacao === true ||
    indicadorDireto === "sim" ||
    /investig|avaliacao|avaliando|em analise/.test(situacao)
  );
}

function possuiHipoteseDiagnostica(aluno) {
  const situacao = normalizarTexto(aluno?.situacaoDiagnostica || aluno?.statusDiagnostico);
  return Boolean(
    String(aluno?.hipoteseDiagnostica || aluno?.diagnostico || "").trim() ||
      /hipotese/.test(situacao)
  );
}

function DistributionCard({ icon: Icon, title, description, data, tone = "blue" }) {
  return (
    <article className={`dashboard-distribution-card dashboard-distribution-${tone}`}>
      <header className="dashboard-distribution-header">
        <span className="dashboard-indicator-icon" aria-hidden="true"><Icon /></span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </header>
      {data.length ? (
        <div className="dashboard-distribution-list">
          {data.map((item) => (
            <div className="dashboard-distribution-row" key={item.label}>
              <div className="dashboard-distribution-label">
                <span>{item.label}</span>
                <strong>{item.total} <small>({item.percentual}%)</small></strong>
              </div>
              <div
                className="dashboard-distribution-track"
                role="progressbar"
                aria-label={`${item.label}: ${item.percentual}%`}
                aria-valuenow={item.percentual}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <span style={{ width: `${item.percentual}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : <p className="dashboard-indicators-empty">Nenhum aluno disponível para este indicador.</p>}
    </article>
  );
}

function DocumentationCard({ icon: Icon, label, value, total, tone, mostrarPercentual = true }) {
  const percentual = total ? Math.round((value / total) * 100) : 0;
  return (
    <article className={`dashboard-document-card dashboard-document-${tone}`}>
      <span className="dashboard-document-icon" aria-hidden="true"><Icon /></span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {mostrarPercentual ? <small>{percentual}% dos alunos</small> : null}
      </div>
    </article>
  );
}

function DashboardPage() {
  const { currentUser, perfil, perfilLabel } = useAuth();
  const location = useLocation();
  const [alunos, setAlunos] = useState([]);
  const [sondagens, setSondagens] = useState([]);
  const [monitoramentos, setMonitoramentos] = useState([]);
  const [peis, setPeis] = useState([]);
  const [paees, setPaees] = useState([]);
  const [estudosCaso, setEstudosCaso] = useState([]);
  const [indicadoresAtualizadosEm, setIndicadoresAtualizadosEm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const podeLer = podeVisualizarAlunos(perfil);
  const somenteVinculados = visualizaSomenteVinculados(perfil);
  const nomeUsuario = obterNomeUsuario(currentUser);
  const saudacaoHorario = obterSaudacaoPorHorario();
  const saudacaoPerfil = perfilLabel || perfil || "Perfil não configurado";

  console.log("[DashboardPage] checagem de acesso", {
    rotaAtual: location.pathname,
    perfilAtual: perfil,
    condicaoPodeLer: "podeVisualizarAlunos(perfil)",
    resultadoPodeLer: podeLer,
    condicaoSomenteVinculados: "visualizaSomenteVinculados(perfil)",
    resultadoSomenteVinculados: somenteVinculados,
  });

  useEffect(() => {
    let efeitoAtivo = true;

    async function carregarPainel({ silencioso = false } = {}) {
      if (!currentUser || !podeLer) return;

      if (!silencioso) setLoading(true);
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

        const peisRequest = Array.isArray(idsPermitidos)
          ? Promise.all(idsPermitidos.map((alunoId) => listarPeisPorAlunoId(alunoId))).then((listas) => listas.flat())
          : listarPeis();
        const paeesRequest = Array.isArray(idsPermitidos)
          ? Promise.all(idsPermitidos.map((alunoId) => listarPaeesPorAlunoId(alunoId))).then((listas) => listas.flat())
          : listarPaees();
        const estudosRequest = Array.isArray(idsPermitidos)
          ? Promise.all(idsPermitidos.map((alunoId) => listarEstudosCaso({ alunoId }))).then((listas) => listas.flat())
          : listarEstudosCaso();

        const [sondagensData, monitoramentosData, peisData, paeesData, estudosData] = await Promise.all([
          listarSondagens({ alunoIdsPermitidos: idsPermitidos }),
          listarMonitoramentos({ alunoIdsPermitidos: idsPermitidos }),
          peisRequest,
          paeesRequest,
          estudosRequest,
        ]);

        if (!efeitoAtivo) return;
        setAlunos(alunosData);
        setSondagens(sondagensData);
        setMonitoramentos(monitoramentosData);
        setPeis(peisData);
        setPaees(paeesData);
        setEstudosCaso(estudosData);
        setIndicadoresAtualizadosEm(new Date());
      } catch (error) {
        if (!efeitoAtivo) return;
        setErro(obterMensagemErro(error, "Não foi possível carregar os indicadores do painel."));
      } finally {
        if (efeitoAtivo && !silencioso) setLoading(false);
      }
    }

    carregarPainel();

    const atualizarAoRetomar = () => carregarPainel({ silencioso: true });
    const atualizarAoExibir = () => {
      if (document.visibilityState === "visible") atualizarAoRetomar();
    };

    window.addEventListener("focus", atualizarAoRetomar);
    document.addEventListener("visibilitychange", atualizarAoExibir);

    return () => {
      efeitoAtivo = false;
      window.removeEventListener("focus", atualizarAoRetomar);
      document.removeEventListener("visibilitychange", atualizarAoExibir);
    };
  }, [currentUser, perfil, podeLer, somenteVinculados]);

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

  const indicadoresPedagogicos = useMemo(() => {
    const totalAlunos = alunos.length;
    const peisRecentes = obterRegistrosMaisRecentes(peis);
    const paeesRecentes = obterRegistrosMaisRecentes(paees);
    const estudosRecentes = obterRegistrosMaisRecentes(estudosCaso);
    const alunosComSondagem = new Set(sondagens.map((item) => item.alunoId).filter(Boolean));

    const peiConcluido = alunos.filter((aluno) => registroConcluido(peisRecentes.get(aluno.id))).length;
    const paeeConcluido = alunos.filter((aluno) => registroConcluido(paeesRecentes.get(aluno.id))).length;
    const estudoConcluido = alunos.filter((aluno) => registroConcluido(estudosRecentes.get(aluno.id))).length;
    const comLaudo = alunos.filter((aluno) => normalizarTexto(aluno.laudo) === "sim").length;
    const situacaoDiagnostica = alunos.reduce(
      (totais, aluno) => {
        if (normalizarTexto(aluno.laudo) === "sim") {
          totais.comLaudo += 1;
        } else if (estaEmInvestigacaoDiagnostica(aluno)) {
          totais.emInvestigacao += 1;
        } else if (possuiHipoteseDiagnostica(aluno)) {
          totais.comHipotese += 1;
        } else {
          totais.semLaudoNemHipotese += 1;
        }
        return totais;
      },
      { comLaudo: 0, comHipotese: 0, emInvestigacao: 0, semLaudoNemHipotese: 0 }
    );

    const diagnosticos = agruparDistribuicao(
      alunos,
      (aluno) => classificarDiagnostico(aluno.diagnostico),
      ORDEM_DIAGNOSTICOS
    );
    const series = agruparDistribuicao(alunos, (aluno) => String(aluno.serieAno || "").trim());
    const turnos = agruparDistribuicao(alunos, (aluno) => String(aluno.turno || "").trim());
    const escolas = agruparDistribuicao(alunos, (aluno) => String(aluno.nomeEscola || "").trim());
    const totalEscolasInformadas = new Set(
      alunos.map((aluno) => normalizarTexto(aluno.nomeEscola)).filter(Boolean)
    ).size;

    return {
      totalAlunos,
      diagnosticos,
      series,
      turnos,
      escolas,
      exibirEscolas: totalEscolasInformadas > 1,
      situacaoDiagnostica: [
        { label: "Com laudo", value: situacaoDiagnostica.comLaudo, tone: "success", icon: FileCheck2 },
        { label: "Com hipótese diagnóstica", value: situacaoDiagnostica.comHipotese, tone: "info", icon: ClipboardList },
        { label: "Em investigação/avaliação", value: situacaoDiagnostica.emInvestigacao, tone: "warning", icon: Clock3 },
        { label: "Sem laudo e sem hipótese diagnóstica", value: situacaoDiagnostica.semLaudoNemHipotese, tone: "warning", icon: FileText },
      ],
      documentacao: [
        { label: "Alunos com laudo", value: comLaudo, tone: "success", icon: FileCheck2 },
        { label: "Alunos sem laudo", value: totalAlunos - comLaudo, tone: "warning", icon: Clock3 },
        { label: "PEI concluído", value: peiConcluido, tone: "success", icon: BadgeCheck },
        { label: "PEI pendente", value: totalAlunos - peiConcluido, tone: "warning", icon: Clock3 },
        { label: "PAEE concluído", value: paeeConcluido, tone: "success", icon: BadgeCheck },
        { label: "PAEE pendente", value: totalAlunos - paeeConcluido, tone: "warning", icon: Clock3 },
        { label: "Sondagem concluída", value: alunos.filter((aluno) => alunosComSondagem.has(aluno.id)).length, tone: "info", icon: ClipboardList },
        { label: "Estudo de Caso concluído", value: estudoConcluido, tone: "info", icon: FileText },
      ],
    };
  }, [alunos, estudosCaso, paees, peis, sondagens]);

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
    <main className="alunos-page module-page dashboard-page-wrapper dashboard-aee-page">
      <header className="page-header dashboard-hero">
        <div className="dashboard-hero-badge">Painel inicial AEE Registro</div>
        <div className="dashboard-hero-heading">
          <div className="dashboard-hero-copy">
            <h1 className="dashboard-hero-greeting">
              {saudacaoHorario}{nomeUsuario ? `, ${nomeUsuario}` : ""}!
            </h1>
            <p className="dashboard-hero-tagline">
              Transformando registros pedagógicos em decisões para a inclusão.
            </p>
          </div>
          <div className="dashboard-hero-profile-card" aria-label="Perfil atual">
            <span className="dashboard-icon-badge" aria-hidden="true">
              <UserRound />
            </span>
            <div>
              <strong>{saudacaoPerfil}</strong>
              <p>Acompanhamento institucional da Educação Especial</p>
            </div>
          </div>
        </div>
      </header>

      {erro ? <p className="toast-error">{erro}</p> : null}

      <section className="dashboard-grid dashboard-content-block dashboard-stats-grid">
        <article className="panel stat-card dashboard-card dashboard-stat-card">
          <span className="dashboard-card-icon" aria-hidden="true">
            <Users />
          </span>
          <h2>Total de alunos</h2>
          <strong>{alunos.length}</strong>
        </article>
        <article className="panel stat-card dashboard-card dashboard-stat-card">
          <span className="dashboard-card-icon" aria-hidden="true">
            <ClipboardList />
          </span>
          <h2>Total de sondagens</h2>
          <strong>{sondagens.length}</strong>
        </article>
        <article className="panel stat-card dashboard-card dashboard-stat-card">
          <span className="dashboard-card-icon" aria-hidden="true">
            <LineChart />
          </span>
          <h2>Total de monitoramentos</h2>
          <strong>{monitoramentos.length}</strong>
        </article>
      </section>

      <section className="panel dashboard-content-block dashboard-card dashboard-indicators-panel" aria-labelledby="indicadores-pedagogicos-titulo">
        <header className="dashboard-indicators-heading">
          <div className="dashboard-indicators-title">
            <span className="dashboard-indicators-heading-icon" aria-hidden="true"><BarChart3 /></span>
            <div>
              <h2 id="indicadores-pedagogicos-titulo">Indicadores Pedagógicos da Escola</h2>
              <p>Visão consolidada a partir do Cadastro de Alunos e dos módulos pedagógicos.</p>
            </div>
          </div>
          <div className="dashboard-indicators-update" aria-live="polite">
            <span aria-hidden="true">●</span>
            {loading
              ? "Atualizando indicadores..."
              : indicadoresAtualizadosEm
                ? `Atualizado em ${indicadoresAtualizadosEm.toLocaleDateString("pt-BR")} às ${indicadoresAtualizadosEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "Indicadores disponíveis ao carregar o painel"}
          </div>
        </header>

        <div className="dashboard-indicators-section-heading">
          <div>
            <h3>Resumo Pedagógico</h3>
            <p>Cada indicador representa alunos únicos; pendências incluem módulos ainda não iniciados.</p>
          </div>
          <span>{indicadoresPedagogicos.totalAlunos} alunos acompanhados</span>
        </div>
        <div className="dashboard-document-grid">
          {indicadoresPedagogicos.documentacao.map((indicador) => (
            <DocumentationCard
              key={indicador.label}
              {...indicador}
              total={indicadoresPedagogicos.totalAlunos}
            />
          ))}
        </div>

        <div className="dashboard-indicators-section-heading dashboard-distributions-heading">
          <div>
            <h3>🩺 Situação Diagnóstica dos Estudantes</h3>
            <p>Quantidades calculadas exclusivamente a partir das informações atuais do Cadastro de Alunos.</p>
          </div>
        </div>
        <div className="dashboard-document-grid">
          {indicadoresPedagogicos.situacaoDiagnostica.map((indicador) => (
            <DocumentationCard
              key={indicador.label}
              {...indicador}
              total={indicadoresPedagogicos.totalAlunos}
              mostrarPercentual={false}
            />
          ))}
        </div>

        <div className="dashboard-indicators-section-heading dashboard-distributions-heading">
          <div>
            <h3>Perfil dos estudantes</h3>
            <p>Distribuições calculadas diretamente com as informações atuais do cadastro.</p>
          </div>
        </div>
        <div className="dashboard-distributions-grid">
          <DistributionCard
            icon={Stethoscope}
            title="Diagnósticos principais"
            description="Classificação institucional conforme o diagnóstico informado no cadastro."
            data={indicadoresPedagogicos.diagnosticos}
            tone="blue"
          />
          <DistributionCard
            icon={GraduationCap}
            title="Alunos por série/ano"
            description="Distribuição dos estudantes por etapa de escolarização."
            data={indicadoresPedagogicos.series}
            tone="violet"
          />
          <DistributionCard
            icon={SunMedium}
            title="Alunos por turno"
            description="Organização dos estudantes por turno informado."
            data={indicadoresPedagogicos.turnos}
            tone="amber"
          />
          {indicadoresPedagogicos.exibirEscolas ? (
            <DistributionCard
              icon={School}
              title="Escola"
              description="Comparativo exibido porque há mais de uma escola cadastrada."
              data={indicadoresPedagogicos.escolas}
              tone="green"
            />
          ) : null}
        </div>
      </section>

      <section className="panel no-print dashboard-content-block dashboard-card dashboard-shortcuts dashboard-quick-actions">
        <h2>Ações Rápidas</h2>
        <p className="dashboard-quick-actions-group-title">Ação principal</p>
        <div className="dashboard-quick-action-primary-wrap">
          <Link className="dashboard-quick-action dashboard-quick-action-primary" to="/alunos">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <UserPlus />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>Cadastrar Novo Aluno</strong>
              <small>Inclua um novo estudante na plataforma.</small>
            </span>
          </Link>
        </div>
        <p className="dashboard-quick-actions-group-title">Módulos pedagógicos</p>
        <div className="dashboard-quick-actions-grid">
          <Link className="dashboard-quick-action" to="/sondagens">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <ClipboardList />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>Nova Sondagem</strong>
              <small>Inicie uma sondagem diagnóstica.</small>
            </span>
          </Link>
          <Link className="dashboard-quick-action" to="/estudo-de-caso">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <FileText />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>Estudo de Caso</strong>
              <small>Registre e retome o estudo pedagógico.</small>
            </span>
          </Link>
          <Link className="dashboard-quick-action" to="/metas">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <Target />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>Habilidades</strong>
              <small>Organize habilidades e metas pedagógicas.</small>
            </span>
          </Link>
          <Link className="dashboard-quick-action" to="/paee">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <BookOpen />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>PAEE</strong>
              <small>Organize o Plano de Atendimento Educacional Especializado.</small>
            </span>
          </Link>
          <Link className="dashboard-quick-action" to="/pei">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <NotebookPen />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>PEI</strong>
              <small>Acesse o Plano Educacional Individualizado.</small>
            </span>
          </Link>
          <Link className="dashboard-quick-action" to="/atendimento-aee">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <ClipboardPen />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>Atendimento AEE</strong>
              <small>Registre um atendimento especializado.</small>
            </span>
          </Link>
          <Link className="dashboard-quick-action" to="/acompanhamento">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <MessagesSquare />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>Acompanhamento</strong>
              <small>Acesse os registros de acompanhamento.</small>
            </span>
          </Link>
          <Link className="dashboard-quick-action" to="/monitoramentos">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <LineChart />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>Monitoramento</strong>
              <small>Acompanhe os indicadores pedagógicos do estudante.</small>
            </span>
          </Link>
          <Link className="dashboard-quick-action" to="/relatorios">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <FileBarChart />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>Relatório Pedagógico</strong>
              <small>Elabore e consulte relatórios do aluno.</small>
            </span>
          </Link>
          <Link className="dashboard-quick-action" to="/monitoramentos">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <BarChart3 />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>Evolução Pedagógica</strong>
              <small>Consulte a evolução pelos atendimentos.</small>
            </span>
          </Link>
          <Link className="dashboard-quick-action" to="/painel-coordenacao">
            <span className="dashboard-quick-action-icon" aria-hidden="true">
              <LayoutDashboard />
            </span>
            <span className="dashboard-quick-action-content">
              <strong>Painel da Coordenação</strong>
              <small>Acompanhe indicadores institucionais.</small>
            </span>
          </Link>
        </div>
      </section>

      <div className="alunos-grid dashboard-content-block dashboard-columns">
        <section className="panel dashboard-card dashboard-section-card">
          <h2>Monitoramentos recentes</h2>
          {loading ? <p>Carregando...</p> : null}
          {!loading && monitoramentosRecentes.length === 0 ? (
            <p>Nenhum monitoramento recente encontrado.</p>
          ) : null}
          {monitoramentosRecentes.map((item) => (
            <article key={item.id} className="meta-card dashboard-card dashboard-meta-card">
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

        <section className="panel alerts-panel dashboard-card dashboard-section-card">
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

      <section className="panel dashboard-content-block dashboard-card dashboard-section-card">
        <h2>Perfis e responsabilidades</h2>
        <p className="muted">
          Esta seção orienta o papel de cada usuário na plataforma e os principais registros
          pedagógicos esperados por perfil.
        </p>
        <div className="perfis-grid">
          {PERFIS_RESPONSABILIDADES.map((item) => (
            <article key={item.perfil} className="perfil-card dashboard-card dashboard-profile-card">
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



