import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { listarAlunos, listarAlunosPorIds } from "../services/alunosService";
import { listarAcompanhamentos } from "../services/acompanhamentoService";
import { listarAtendimentosAEE } from "../services/atendimentoAeeService";
import { listarMetas } from "../services/metasService";
import { listarMonitoramentos } from "../services/monitoramentosService";
import { listarSondagens } from "../services/sondagensService";
import {
  classificarNivelAtencaoPedagogica,
  contarDificuldadesSondagem,
} from "../utils/classificacaoAtencaoPedagogica";
import { buscarIdsAlunosVinculados } from "../services/vinculacoesService";
import {
  podeVisualizarAlunos,
  podeVisualizarPainelCoordenacao,
  visualizaSomenteVinculados,
} from "../utils/permissions";

const DIAS_ALERTA_ACOMPANHAMENTO = 15;

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatarData(data) {
  if (!data) return "Sem registros";
  const base = data?.toDate ? data.toDate() : new Date(data);
  return Number.isNaN(base.getTime()) ? "Sem registros" : base.toLocaleDateString("pt-BR");
}

function obterDataRegistro(item, campos = []) {
  const candidatos = [
    ...campos,
    "dataRegistro",
    "dataSondagem",
    "updatedAt",
    "createdAt",
    "atualizadoEm",
    "criadoEm",
  ];

  for (const campo of candidatos) {
    const valor = item?.[campo];
    if (!valor) continue;
    if (valor?.toDate) {
      const convertido = valor.toDate();
      if (!Number.isNaN(convertido.getTime())) return convertido;
      continue;
    }
    const convertido = new Date(valor);
    if (!Number.isNaN(convertido.getTime())) return convertido;
  }

  return null;
}

function possuiConteudoTexto(valor) {
  return String(valor || "").trim().length > 0;
}

function obterInicioFimMes(anoMes) {
  const base = anoMes ? new Date(`${anoMes}-01T00:00:00`) : new Date();
  const inicio = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0);
  const fim = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
  return { inicio, fim };
}

function obterBimestrePorData(data) {
  const mes = (data.getMonth() || 0) + 1;
  if (mes <= 3) return "1º bimestre";
  if (mes <= 6) return "2º bimestre";
  if (mes <= 9) return "3º bimestre";
  return "4º bimestre";
}

function obterMensagemErro(error, mensagemPadrao) {
  const code = String(error?.code || "");
  if (code.includes("permission-denied")) {
    return "Acesso negado para consultar os dados no Firestore.";
  }
  if (code.includes("failed-precondition")) {
    return "A consulta exige índice no Firestore. Verifique o console do Firebase.";
  }
  return mensagemPadrao;
}

function extrairProfissional(item) {
  return (
    item?.responsavelNome ||
    item?.professorNome ||
    item?.responsavelRegistro ||
    item?.responsavelAplicacao ||
    ""
  );
}

function categorizarPerfilRegistro(item) {
  const texto = normalizarTexto(
    item?.funcaoResponsavel || item?.autorPerfil || item?.perfil || item?.tipoRegistro || ""
  );
  if (texto.includes("registro_professor") || texto.includes("regente")) {
    return "Professor regente";
  }
  if (texto.includes("aee") || texto.includes("srm") || texto.includes("domiciliar")) {
    return "Professor(a) do AEE";
  }
  if (texto.includes("mediador")) {
    return "Mediador";
  }
  if (texto.includes("assistente")) {
    return "Assistente educacional";
  }
  return "Outros";
}

function PainelCoordenacaoPage() {
  const navigate = useNavigate();
  const { currentUser, perfil } = useAuth();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [idsPermitidos, setIdsPermitidos] = useState(undefined);
  const [alunos, setAlunos] = useState([]);
  const [sondagens, setSondagens] = useState([]);
  const [metas, setMetas] = useState([]);
  const [monitoramentos, setMonitoramentos] = useState([]);
  const [acompanhamentos, setAcompanhamentos] = useState([]);
  const [atendimentosAEE, setAtendimentosAEE] = useState([]);
  const [filtros, setFiltros] = useState({
    turma: "",
    turno: "",
    alunoId: "",
    profissional: "",
    mesReferencia: "",
    dataInicio: "",
    dataFim: "",
  });

  const podeLer = podeVisualizarAlunos(perfil);
  const acessoCoordenacao = podeVisualizarPainelCoordenacao(perfil);
  const somenteVinculados = visualizaSomenteVinculados(perfil);

  useEffect(() => {
    async function carregar() {
      if (!currentUser || !podeLer) return;

      setLoading(true);
      setErro("");

      try {
        let idsPermitidos = undefined;
        let alunosData = [];

        if (somenteVinculados) {
          idsPermitidos = await buscarIdsAlunosVinculados(currentUser.uid);
          alunosData = await listarAlunosPorIds(idsPermitidos);
        } else {
          alunosData = await listarAlunos();
        }

        const [sondagensData, monitoramentosData, acompanhamentosData, metasData] = await Promise.all([
          listarSondagens({ alunoIdsPermitidos: idsPermitidos }),
          listarMonitoramentos({ alunoIdsPermitidos: idsPermitidos }),
          listarAcompanhamentos(),
          listarMetas({ alunoIds: idsPermitidos }),
        ]);

        const acompanhamentosPermitidos = Array.isArray(idsPermitidos)
          ? acompanhamentosData.filter((item) => idsPermitidos.includes(item.alunoId))
          : acompanhamentosData;

        setIdsPermitidos(idsPermitidos);
        setAlunos(alunosData);
        setSondagens(sondagensData);
        setMetas(metasData);
        setMonitoramentos(monitoramentosData);
        setAcompanhamentos(acompanhamentosPermitidos);
      } catch (error) {
        setErro(
          obterMensagemErro(error, "Não foi possível carregar o Painel da Coordenação.")
        );
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [currentUser, podeLer, somenteVinculados]);

  const turmas = useMemo(
    () =>
      Array.from(new Set(alunos.map((item) => String(item.turma || "").trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [alunos]
  );

  const turnos = useMemo(
    () =>
      Array.from(new Set(alunos.map((item) => String(item.turno || "").trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [alunos]
  );

  const profissionais = useMemo(() => {
    const nomes = [
      ...acompanhamentos.map(extrairProfissional),
      ...atendimentosAEE.map(extrairProfissional),
      ...monitoramentos.map((item) => item?.responsavelRegistro || ""),
      ...sondagens.map((item) => item?.responsavelAplicacao || ""),
    ]
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b));
  }, [acompanhamentos, atendimentosAEE, monitoramentos, sondagens]);

  const alunosFiltrados = useMemo(() => {
    return alunos.filter((aluno) => {
      if (filtros.alunoId && aluno.id !== filtros.alunoId) return false;
      if (filtros.turma && String(aluno.turma || "") !== filtros.turma) return false;
      if (filtros.turno && String(aluno.turno || "") !== filtros.turno) return false;
      return true;
    });
  }, [alunos, filtros.alunoId, filtros.turma, filtros.turno]);

  const idsAlunosFiltrados = useMemo(
    () => new Set(alunosFiltrados.map((item) => item.id)),
    [alunosFiltrados]
  );

  useEffect(() => {
    async function carregarAtendimentosAEE() {
      if (!currentUser || !podeLer || alunosFiltrados.length === 0) {
        setAtendimentosAEE([]);
        return;
      }

      try {
        const requests = alunosFiltrados.map((aluno) =>
          listarAtendimentosAEE({
            alunoId: aluno.id,
            mesReferencia: filtros.mesReferencia || undefined,
            alunoIdsPermitidos: idsPermitidos,
          })
        );
        const response = await Promise.all(requests);
        setAtendimentosAEE(response.flat());
      } catch (error) {
        setAtendimentosAEE([]);
      }
    }

    carregarAtendimentosAEE();
  }, [currentUser, podeLer, alunosFiltrados, filtros.mesReferencia, idsPermitidos]);

  const filtroPeriodo = (item) => {
    const data = obterDataRegistro(item);
    if (!data) return true;

    const { inicio, fim } = obterInicioFimMes(filtros.mesReferencia);
    const inicioManual = filtros.dataInicio ? new Date(`${filtros.dataInicio}T00:00:00`) : null;
    const fimManual = filtros.dataFim ? new Date(`${filtros.dataFim}T23:59:59`) : null;

    if (filtros.mesReferencia && (data < inicio || data > fim)) return false;
    if (inicioManual && data < inicioManual) return false;
    if (fimManual && data > fimManual) return false;
    return true;
  };

  const filtroProfissional = (item) => {
    if (!filtros.profissional) return true;
    return normalizarTexto(extrairProfissional(item)) === normalizarTexto(filtros.profissional);
  };

  const sondagensFiltradas = useMemo(
    () =>
      sondagens.filter(
        (item) =>
          idsAlunosFiltrados.has(item.alunoId) && filtroPeriodo(item) && filtroProfissional(item)
      ),
    [sondagens, idsAlunosFiltrados, filtros]
  );

  const monitoramentosFiltrados = useMemo(
    () =>
      monitoramentos.filter(
        (item) =>
          idsAlunosFiltrados.has(item.alunoId) && filtroPeriodo(item) && filtroProfissional(item)
      ),
    [monitoramentos, idsAlunosFiltrados, filtros]
  );

  const acompanhamentosFiltrados = useMemo(
    () =>
      acompanhamentos.filter(
        (item) =>
          idsAlunosFiltrados.has(item.alunoId) && filtroPeriodo(item) && filtroProfissional(item)
      ),
    [acompanhamentos, idsAlunosFiltrados, filtros]
  );

  const metasFiltradas = useMemo(
    () =>
      metas.filter(
        (item) =>
          idsAlunosFiltrados.has(item.alunoId) && filtroPeriodo(item) && filtroProfissional(item)
      ),
    [metas, idsAlunosFiltrados, filtros]
  );

  const atendimentosAEEFiltrados = useMemo(
    () =>
      atendimentosAEE.filter(
        (item) =>
          idsAlunosFiltrados.has(item.alunoId) && filtroPeriodo(item) && filtroProfissional(item)
      ),
    [atendimentosAEE, idsAlunosFiltrados, filtros]
  );

  const acompanhamentosBase = useMemo(
    () =>
      acompanhamentosFiltrados.filter(
        (item) => item.tipoRegistro === "diario_bordo" || item.tipoRegistro === "registro_professor"
      ),
    [acompanhamentosFiltrados]
  );

  const sintesesFiltradas = useMemo(
    () => acompanhamentosFiltrados.filter((item) => item.tipoRegistro === "sintese"),
    [acompanhamentosFiltrados]
  );

  const registrosProfessorFiltrados = useMemo(
    () => acompanhamentosBase.filter((item) => item.tipoRegistro === "registro_professor"),
    [acompanhamentosBase]
  );

  const idsComSondagem = useMemo(
    () => new Set(sondagensFiltradas.map((item) => item.alunoId).filter(Boolean)),
    [sondagensFiltradas]
  );

  const limiteRecente = useMemo(
    () => Date.now() - DIAS_ALERTA_ACOMPANHAMENTO * 24 * 60 * 60 * 1000,
    []
  );

  const registrosAcompanhamentoRecente = useMemo(() => {
    const combinados = [
      ...acompanhamentosBase.map((item) => ({ alunoId: item.alunoId, data: obterDataRegistro(item) })),
      ...monitoramentosFiltrados.map((item) => ({ alunoId: item.alunoId, data: obterDataRegistro(item) })),
    ];

    return new Set(
      combinados
        .filter((item) => item.alunoId && item.data && item.data.getTime() >= limiteRecente)
        .map((item) => item.alunoId)
    );
  }, [acompanhamentosBase, monitoramentosFiltrados, limiteRecente]);

  const registrosAtendimentoAEERecente = useMemo(
    () =>
      new Set(
        atendimentosAEEFiltrados
          .map((item) => ({ alunoId: item.alunoId, data: obterDataRegistro(item, ["dataAtendimento"]) }))
          .filter((item) => item.alunoId && item.data && item.data.getTime() >= limiteRecente)
          .map((item) => item.alunoId)
      ),
    [atendimentosAEEFiltrados, limiteRecente]
  );

  const bimestreReferencia = useMemo(() => {
    if (filtros.mesReferencia) {
      return obterBimestrePorData(new Date(`${filtros.mesReferencia}-01T00:00:00`));
    }
    if (filtros.dataInicio) {
      return obterBimestrePorData(new Date(`${filtros.dataInicio}T00:00:00`));
    }
    return obterBimestrePorData(new Date());
  }, [filtros.mesReferencia, filtros.dataInicio]);

  const idsComRegistroProfessorNoBimestre = useMemo(
    () =>
      new Set(
        registrosProfessorFiltrados
          .filter((item) => normalizarTexto(item.bimestre) === normalizarTexto(bimestreReferencia))
          .map((item) => item.alunoId)
          .filter(Boolean)
      ),
    [registrosProfessorFiltrados, bimestreReferencia]
  );

  const idsComSintese = useMemo(
    () => new Set(sintesesFiltradas.map((item) => item.alunoId).filter(Boolean)),
    [sintesesFiltradas]
  );

  const alunosSemSondagem = useMemo(
    () => alunosFiltrados.filter((aluno) => !idsComSondagem.has(aluno.id)),
    [alunosFiltrados, idsComSondagem]
  );

  const idsComHabilidades = useMemo(
    () => new Set(metasFiltradas.map((item) => item.alunoId).filter(Boolean)),
    [metasFiltradas]
  );

  const alunosSemHabilidades = useMemo(
    () => alunosFiltrados.filter((aluno) => !idsComHabilidades.has(aluno.id)),
    [alunosFiltrados, idsComHabilidades]
  );

  const idsComAtendimentoAEE = useMemo(
    () => new Set(atendimentosAEEFiltrados.map((item) => item.alunoId).filter(Boolean)),
    [atendimentosAEEFiltrados]
  );

  const alunosSemAtendimentoAEE = useMemo(
    () => alunosFiltrados.filter((aluno) => !idsComAtendimentoAEE.has(aluno.id)),
    [alunosFiltrados, idsComAtendimentoAEE]
  );

  const alunosSemAcompanhamentoRecente = useMemo(
    () => alunosFiltrados.filter((aluno) => !registrosAcompanhamentoRecente.has(aluno.id)),
    [alunosFiltrados, registrosAcompanhamentoRecente]
  );

  const idsComAcompanhamento = useMemo(
    () =>
      new Set(
        [...acompanhamentosBase, ...monitoramentosFiltrados, ...atendimentosAEEFiltrados]
          .map((item) => item.alunoId)
          .filter(Boolean)
      ),
    [acompanhamentosBase, monitoramentosFiltrados, atendimentosAEEFiltrados]
  );

  const alunosSemAcompanhamento = useMemo(
    () => alunosFiltrados.filter((aluno) => !idsComAcompanhamento.has(aluno.id)),
    [alunosFiltrados, idsComAcompanhamento]
  );

  const alunosSemRegistroProfessorBimestre = useMemo(
    () => alunosFiltrados.filter((aluno) => !idsComRegistroProfessorNoBimestre.has(aluno.id)),
    [alunosFiltrados, idsComRegistroProfessorNoBimestre]
  );

  const alunosSemSintese = useMemo(
    () => alunosFiltrados.filter((aluno) => !idsComSintese.has(aluno.id)),
    [alunosFiltrados, idsComSintese]
  );

  const totalRegistrosMes = useMemo(() => {
    const { inicio, fim } = obterInicioFimMes(filtros.mesReferencia);
    const colecoes = [
      ...sondagensFiltradas,
      ...metasFiltradas,
      ...monitoramentosFiltrados,
      ...acompanhamentosFiltrados,
      ...atendimentosAEEFiltrados,
    ];
    return colecoes.filter((item) => {
      const data = obterDataRegistro(item);
      return data && data >= inicio && data <= fim;
    }).length;
  }, [
    filtros.mesReferencia,
    sondagensFiltradas,
    metasFiltradas,
    monitoramentosFiltrados,
    acompanhamentosFiltrados,
    atendimentosAEEFiltrados,
  ]);

  const alunosQuePrecisamAtencao = useMemo(() => {
    const prioridadeNivel = {
      Alto: 1,
      Medio: 2,
      Baixo: 3,
    };

    return alunosFiltrados
      .map((aluno) => {
        const sondagemMaisRecente = sondagensFiltradas
          .filter((item) => item.alunoId === aluno.id)
          .sort((a, b) => {
            const dataA = obterDataRegistro(a)?.getTime() || 0;
            const dataB = obterDataRegistro(b)?.getTime() || 0;
            return dataB - dataA;
          })[0];

        const totalDificuldadesSondagem = contarDificuldadesSondagem(sondagemMaisRecente);

        const metasAluno = metasFiltradas.filter((item) => item.alunoId === aluno.id);
        const metasConcluidas = metasAluno.filter((item) =>
          normalizarTexto(item.status).includes("conclu")
        ).length;
        const habilidadesEmAndamento = metasAluno.filter((item) =>
          normalizarTexto(item.status).includes("andamento")
        ).length;
        const habilidadesPausadas = metasAluno.filter((item) =>
          normalizarTexto(item.status).includes("paus")
        ).length;
        const metasPendentes = metasAluno.length - metasConcluidas;

        const registrosAtendimentoAEE = atendimentosAEEFiltrados.filter(
          (item) => item.alunoId === aluno.id
        );
        const ausenciasAtendimentoAEE = registrosAtendimentoAEE.filter((item) => {
          const status = normalizarTexto(item.statusPresenca);
          return status.includes("ausente") || status.includes("falta justificada");
        }).length;

        const registrosAcompanhamentoAluno = [
          ...acompanhamentosBase.filter((item) => item.alunoId === aluno.id),
          ...monitoramentosFiltrados.filter((item) => item.alunoId === aluno.id),
        ];

        const totalRegistrosDificuldades = [...registrosAcompanhamentoAluno, ...registrosAtendimentoAEE].filter(
          (item) =>
            possuiConteudoTexto(item?.dificuldades) ||
            possuiConteudoTexto(item?.dificuldadesObservadas) ||
            possuiConteudoTexto(item?.dificuldadesContextoAula)
        ).length;

        const totalRegistrosAvancos = [...registrosAcompanhamentoAluno, ...registrosAtendimentoAEE].filter(
          (item) => possuiConteudoTexto(item?.avancos) || possuiConteudoTexto(item?.avancosPercebidos)
        ).length;

        const classificacao = classificarNivelAtencaoPedagogica({
          possuiSondagem: Boolean(sondagemMaisRecente),
          totalHabilidades: metasAluno.length,
          habilidadesEmAndamento,
          habilidadesPausadas,
          possuiAtendimentoAEERecente: registrosAtendimentoAEERecente.has(aluno.id),
          possuiAcompanhamentoRecente: registrosAcompanhamentoRecente.has(aluno.id),
          totalDificuldadesSondagem,
          totalRegistrosDificuldades,
          totalRegistrosAvancos,
        });

        const ultimoAcomp = [...acompanhamentosBase, ...monitoramentosFiltrados, ...atendimentosAEEFiltrados]
          .filter((item) => item.alunoId === aluno.id)
          .map((item) => obterDataRegistro(item))
          .filter(Boolean)
          .sort((a, b) => b.getTime() - a.getTime())[0];

        const ultimoProfessor = registrosProfessorFiltrados
          .filter((item) => item.alunoId === aluno.id)
          .map((item) => obterDataRegistro(item))
          .filter(Boolean)
          .sort((a, b) => b.getTime() - a.getTime())[0];

        const statusSondagem = sondagemMaisRecente ? "Com sondagem" : "Sem sondagem";

        return {
          ...aluno,
          statusSondagem,
          ultimoAcompanhamento: ultimoAcomp,
          ultimoRegistroProfessor: ultimoProfessor,
          nivelAtencao: classificacao.nivelAtencao,
          nivelAtencaoLabel: classificacao.nivelAtencaoLabel,
          scoreAtencao: classificacao.scoreAtencao,
          totalDificuldadesSondagem,
          totalHabilidades: metasAluno.length,
          habilidadesEmAndamento,
          habilidadesPausadas,
          metasPendentes,
          ausenciasAtendimentoAEE,
          totalRegistrosAcompanhamento: registrosAcompanhamentoAluno.length,
          totalRegistrosAtendimentoAEE: registrosAtendimentoAEE.length,
          totalRegistrosDificuldades,
          totalRegistrosAvancos,
          motivosAtencao: classificacao.motivosRisco,
        };
      })
      .sort((a, b) => {
        const prioridadeA = prioridadeNivel[a.nivelAtencao] || 99;
        const prioridadeB = prioridadeNivel[b.nivelAtencao] || 99;
        if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
        if (b.scoreAtencao !== a.scoreAtencao) return b.scoreAtencao - a.scoreAtencao;
        return String(a.nome || "").localeCompare(String(b.nome || ""));
      });
  }, [
    alunosFiltrados,
    sondagensFiltradas,
    metasFiltradas,
    atendimentosAEEFiltrados,
    acompanhamentosBase,
    monitoramentosFiltrados,
    registrosProfessorFiltrados,
    registrosAtendimentoAEERecente,
    registrosAcompanhamentoRecente,
  ]);

  const totaisPorNivelAtencao = useMemo(() => {
    return alunosQuePrecisamAtencao.reduce(
      (acc, item) => {
        if (item.nivelAtencao === "Alto") acc.alto += 1;
        else if (item.nivelAtencao === "Medio") acc.medio += 1;
        else acc.baixo += 1;
        return acc;
      },
      { alto: 0, medio: 0, baixo: 0 }
    );
  }, [alunosQuePrecisamAtencao]);

  const alunosCriticos = useMemo(
    () => alunosQuePrecisamAtencao.filter((item) => item.nivelAtencao === "Alto"),
    [alunosQuePrecisamAtencao]
  );

  const resumoPorPerfil = useMemo(() => {
    const mapa = new Map();
    [
      ...acompanhamentosFiltrados,
      ...atendimentosAEEFiltrados,
      ...monitoramentosFiltrados,
      ...sondagensFiltradas,
    ].forEach((item) => {
      const perfilProfissional = categorizarPerfilRegistro(item);
      mapa.set(perfilProfissional, (mapa.get(perfilProfissional) || 0) + 1);
    });

    return Array.from(mapa.entries())
      .map(([perfilNome, total]) => ({ perfilNome, total }))
      .sort((a, b) => b.total - a.total);
  }, [
    acompanhamentosFiltrados,
    atendimentosAEEFiltrados,
    monitoramentosFiltrados,
    sondagensFiltradas,
  ]);

  const resumoPorProfissional = useMemo(() => {
    const mapa = new Map();
    [
      ...acompanhamentosFiltrados,
      ...atendimentosAEEFiltrados,
      ...monitoramentosFiltrados,
      ...sondagensFiltradas,
    ].forEach((item) => {
      const nome = extrairProfissional(item).trim();
      if (!nome) return;
      mapa.set(nome, (mapa.get(nome) || 0) + 1);
    });

    return Array.from(mapa.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [
    acompanhamentosFiltrados,
    atendimentosAEEFiltrados,
    monitoramentosFiltrados,
    sondagensFiltradas,
  ]);

  const obterUltimaDataAluno = (alunoId, lista) => {
    const data = lista
      .filter((item) => item.alunoId === alunoId)
      .map((item) => obterDataRegistro(item))
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return formatarData(data);
  };

  if (!podeLer) {
    return (
      <main className="alunos-page module-page painel-coordenacao-page painel-coordenacao">
        <section className="panel">
          <h1>Painel da Coordenação</h1>
          <p>Seu perfil não possui permissão para acessar este painel.</p>
        </section>
      </main>
    );
  }

  if (!acessoCoordenacao) {
    return (
      <main className="alunos-page module-page painel-coordenacao-page painel-coordenacao">
        <section className="panel">
          <h1>Painel da Coordenação</h1>
          <p>Este painel é destinado à coordenação pedagógica e à gestão escolar.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="alunos-page module-page painel-coordenacao-page painel-coordenacao">
      <div className="painel-topo-institucional">
<div  
className="painel-topo-logo"
style={{ display: "flex", alignItems: "center", gap: "15px" }}
>
  <img
    src="/logo-eraa.jpg"
    alt="Logo da Escola Raimundo Augusto de Araújo"
    style={{ width: "70px", borderRadius: "10px" }}
  />
</div>
         
        <div className="painel-topo-textos">
          <div className="painel-topo-titulo-linha">
            <h1>
              <span className="icone-titulo">📊</span> Painel da Coordenação
            </h1>
            <span className="painel-topo-selo">ERAA</span>
          </div>

          <p className="painel-topo-escola">Escola Raimundo Augusto de Araújo</p>

          <p className="painel-topo-descricao">
            Visão institucional para acompanhamento pedagógico dos alunos público-alvo da educação
            especial.
          </p>

          <p className="painel-topo-orientacao">
            Orientação: Este painel é destinado à coordenação pedagógica, equipe do AEE e gestão
            escolar, permitindo acompanhar, de forma geral, os registros realizados no sistema.
          </p>
        </div>
      </div>

      {erro ? <p className="toast-error">{erro}</p> : null}

      <section className="panel">
        <h2>Filtros</h2>
        <div className="coordenacao-filtros-grid">
          <div>
            <label htmlFor="filtroTurma">Turma</label>
            <select
              id="filtroTurma"
              value={filtros.turma}
              onChange={(event) =>
                setFiltros((prev) => ({ ...prev, turma: event.target.value }))
              }
            >
              <option value="">Todas</option>
              {turmas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtroTurno">Turno</label>
            <select
              id="filtroTurno"
              value={filtros.turno}
              onChange={(event) =>
                setFiltros((prev) => ({ ...prev, turno: event.target.value }))
              }
            >
              <option value="">Todos</option>
              {turnos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtroAluno">Aluno</label>
            <select
              id="filtroAluno"
              value={filtros.alunoId}
              onChange={(event) =>
                setFiltros((prev) => ({ ...prev, alunoId: event.target.value }))
              }
            >
              <option value="">Todos</option>
              {alunos.map((aluno) => (
                <option key={aluno.id} value={aluno.id}>
                  {aluno.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtroProfissional">Profissional</label>
            <select
              id="filtroProfissional"
              value={filtros.profissional}
              onChange={(event) =>
                setFiltros((prev) => ({ ...prev, profissional: event.target.value }))
              }
            >
              <option value="">Todos</option>
              {profissionais.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtroMes">Período (mês)</label>
            <input
              id="filtroMes"
              type="month"
              value={filtros.mesReferencia}
              onChange={(event) =>
                setFiltros((prev) => ({ ...prev, mesReferencia: event.target.value }))
              }
            />
          </div>

          <div>
            <label htmlFor="filtroDataInicio">Data inicial</label>
            <input
              id="filtroDataInicio"
              type="date"
              value={filtros.dataInicio}
              onChange={(event) =>
                setFiltros((prev) => ({ ...prev, dataInicio: event.target.value }))
              }
            />
          </div>

          <div>
            <label htmlFor="filtroDataFim">Data final</label>
            <input
              id="filtroDataFim"
              type="date"
              value={filtros.dataFim}
              onChange={(event) =>
                setFiltros((prev) => ({ ...prev, dataFim: event.target.value }))
              }
            />
          </div>
        </div>
      </section>

      {loading ? <p className="card-text">Carregando painel da coordenação...</p> : null}

      {!loading ? (
        <>
          <section className="dashboard-grid coordenacao-indicadores-grid">
            <article className="panel stat-card painel-resumo-card">
              <h2 className="card-title">Total de alunos cadastrados</h2>
              <strong className="card-value valor">{alunosFiltrados.length}</strong>
            </article>
            <article className="panel stat-card painel-resumo-card">
              <h2 className="card-title">Total de alunos com sondagem</h2>
              <strong className="card-value valor">{alunosFiltrados.length - alunosSemSondagem.length}</strong>
            </article>
            <article className="panel stat-card painel-resumo-card">
              <h2 className="card-title">Total de alunos sem sondagem</h2>
              <strong className="card-value valor">{alunosSemSondagem.length}</strong>
            </article>
            <article className="panel stat-card painel-resumo-card">
              <h2 className="card-title">Alunos com acompanhamento recente</h2>
              <strong className="card-value valor">{alunosFiltrados.length - alunosSemAcompanhamentoRecente.length}</strong>
            </article>
            <article className="panel stat-card painel-resumo-card">
              <h2 className="card-title">Sem acompanhamento recente</h2>
              <strong className="card-value valor">{alunosSemAcompanhamentoRecente.length}</strong>
            </article>
            <article className="panel stat-card painel-resumo-card">
              <h2 className="card-title">Total de registros no mês</h2>
              <strong className="card-value valor">{totalRegistrosMes}</strong>
            </article>
          </section>

          <section className="panel">
            <h2>Alertas pedagógicos</h2>
            <div className="coordenacao-alertas-grid alertas-grid">
              <div className="alert-group alerta-card critico">
                <h4>Alunos sem sondagem diagnóstica ({alunosSemSondagem.length})</h4>
                {alunosSemSondagem.length === 0 ? <p className="muted">Nenhum alerta nesta categoria.</p> : null}
                {alunosSemSondagem.length > 0 ? (
                  <ul>
                    {alunosSemSondagem.map((aluno) => (
                      <li key={`sem-sondagem-${aluno.id}`}>
                        {aluno.nome} {aluno.turma ? `(${aluno.turma})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="alert-group alerta-card atencao">
                <h4>Alunos sem habilidades cadastradas ({alunosSemHabilidades.length})</h4>
                {alunosSemHabilidades.length === 0 ? <p className="muted">Nenhum alerta nesta categoria.</p> : null}
                {alunosSemHabilidades.length > 0 ? (
                  <ul>
                    {alunosSemHabilidades.map((aluno) => (
                      <li key={`sem-habilidades-${aluno.id}`}>
                        {aluno.nome} {aluno.turma ? `(${aluno.turma})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="alert-group alerta-card critico">
                <h4>Alunos sem atendimento AEE ({alunosSemAtendimentoAEE.length})</h4>
                {alunosSemAtendimentoAEE.length === 0 ? (
                  <p className="muted">Nenhum alerta nesta categoria.</p>
                ) : null}
                {alunosSemAtendimentoAEE.length > 0 ? (
                  <ul>
                    {alunosSemAtendimentoAEE.map((aluno) => (
                      <li key={`sem-atendimento-aee-${aluno.id}`}>
                        {aluno.nome} {aluno.turma ? `(${aluno.turma})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="alert-group alerta-card atencao">
                <h4>Alunos sem acompanhamento ({alunosSemAcompanhamento.length})</h4>
                {alunosSemAcompanhamento.length === 0 ? (
                  <p className="muted">Nenhum alerta nesta categoria.</p>
                ) : null}
                {alunosSemAcompanhamento.length > 0 ? (
                  <ul>
                    {alunosSemAcompanhamento.map((aluno) => (
                      <li key={`sem-acomp-total-${aluno.id}`}>
                        {aluno.nome} {aluno.turma ? `(${aluno.turma})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="alert-group alerta-card atencao">
                <h4>
                  Sem acompanhamento nos últimos {DIAS_ALERTA_ACOMPANHAMENTO} dias (
                  {alunosSemAcompanhamentoRecente.length})
                </h4>
                {alunosSemAcompanhamentoRecente.length === 0 ? (
                  <p className="muted">Nenhum alerta nesta categoria.</p>
                ) : null}
                {alunosSemAcompanhamentoRecente.length > 0 ? (
                  <ul>
                    {alunosSemAcompanhamentoRecente.map((aluno) => (
                      <li key={`sem-acomp-${aluno.id}`}>
                        {aluno.nome} {aluno.turma ? `(${aluno.turma})` : ""} | Último registro:{" "}
                        {obterUltimaDataAluno(aluno.id, [...acompanhamentosBase, ...monitoramentosFiltrados])}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="alert-group alerta-card atencao">
                <h4>
                  Alunos sem registro do professor no {bimestreReferencia} (
                  {alunosSemRegistroProfessorBimestre.length})
                </h4>
                {alunosSemRegistroProfessorBimestre.length === 0 ? (
                  <p className="muted">Nenhum alerta nesta categoria.</p>
                ) : null}
                {alunosSemRegistroProfessorBimestre.length > 0 ? (
                  <ul>
                    {alunosSemRegistroProfessorBimestre.map((aluno) => (
                      <li key={`sem-professor-${aluno.id}`}>
                        {aluno.nome} {aluno.turma ? `(${aluno.turma})` : ""} | Último registro do professor:{" "}
                        {obterUltimaDataAluno(aluno.id, registrosProfessorFiltrados)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="alert-group alerta-card ok">
                <h4>Alunos sem síntese no período ({alunosSemSintese.length})</h4>
                {alunosSemSintese.length === 0 ? <p className="muted">Nenhum alerta nesta categoria.</p> : null}
                {alunosSemSintese.length > 0 ? (
                  <ul>
                    {alunosSemSintese.map((aluno) => (
                      <li key={`sem-sintese-${aluno.id}`}>
                        {aluno.nome} {aluno.turma ? `(${aluno.turma})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>Alunos que precisam de atenção</h2>
            <div className="dashboard-grid coordenacao-indicadores-grid">
              <article className="panel stat-card painel-resumo-card">
                <h2 className="card-title">Nível alto de atenção</h2>
                <strong className="card-value valor contador-alto">{totaisPorNivelAtencao.alto}</strong>
              </article>
              <article className="panel stat-card painel-resumo-card">
                <h2 className="card-title">Nível médio de atenção</h2>
                <strong className="card-value valor contador-medio">{totaisPorNivelAtencao.medio}</strong>
              </article>
              <article className="panel stat-card painel-resumo-card">
                <h2 className="card-title">Nível baixo de atenção</h2>
                <strong className="card-value valor contador-baixo">{totaisPorNivelAtencao.baixo}</strong>
              </article>
            </div>

            {alunosCriticos.length > 0 ? (
              <article className="alert-group alerta-urgente painel-alerta-urgente">
                <h3>Alunos que precisam de intervenção urgente</h3>
                {alunosCriticos.map((aluno) => (
                  <p key={`critico-${aluno.id}`} className="muted motivos">
                    - {aluno.nome} {aluno.turma ? `(${aluno.turma})` : ""} | Pontuação:{" "}
                    {aluno.scoreAtencao}
                    {aluno.motivosAtencao?.length
                      ? ` | Motivos: ${aluno.motivosAtencao.join(", ")}`
                      : ""}
                  </p>
                ))}
              </article>
            ) : (
              <p className="muted">Nenhum aluno crítico para os filtros atuais.</p>
            )}

            {alunosQuePrecisamAtencao.length === 0 ? (
              <p>Nenhum aluno encontrado para os filtros selecionados.</p>
            ) : (
              <div className="table-wrapper painel-coordenacao-table-wrapper table-container">
                <table className="alunos-table painel-coordenacao-table">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Turma</th>
                      <th>Status da sondagem</th>
                      <th className="col-date">Último acompanhamento</th>
                      <th className="col-date">Último registro do professor</th>
                      <th className="col-num">Dificuldades na sondagem</th>
                      <th className="col-num">Habilidades em andamento</th>
                      <th className="col-num">Habilidades pausadas</th>
                      <th className="col-num">Habilidades pendentes</th>
                      <th className="col-num">Atendimentos AEE</th>
                      <th className="col-num">Registros de acompanhamento</th>
                      <th className="col-status">Nível de atenção</th>
                      <th className="col-actions">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosQuePrecisamAtencao.map((item) => (
                      <tr key={item.id} className={item.nivelAtencao === "Alto" ? "linha-alerta" : ""}>
                        <td>{item.nome || "Não informado"}</td>
                        <td>{item.turma || "Não informado"}</td>
                        <td>{item.statusSondagem}</td>
                        <td className="col-date">{formatarData(item.ultimoAcompanhamento)}</td>
                        <td className="col-date">{formatarData(item.ultimoRegistroProfessor)}</td>
                        <td className="col-num">{item.totalDificuldadesSondagem}</td>
                        <td className="col-num">{item.habilidadesEmAndamento}</td>
                        <td className="col-num">{item.habilidadesPausadas}</td>
                        <td className="col-num">{item.metasPendentes}</td>
                        <td className="col-num">{item.totalRegistrosAtendimentoAEE}</td>
                        <td className="col-num">{item.totalRegistrosAcompanhamento}</td>
                        <td className="col-status">
                          <span className={`badge-nivel nivel-${normalizarTexto(item.nivelAtencao)}`}>
                            {item.nivelAtencaoLabel}
                          </span>
                        </td>
                        <td className="col-actions">
                          <button
                            type="button"
                            className="btn-ver-aluno"
                            onClick={() => navigate(`/acompanhamento?alunoId=${item.id}`)}
                          >
                            Ver aluno
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Resumo por profissional</h2>
            <div className="coordenacao-resumo-grid">
              <article className="form-section">
                <h3>Registros por perfil</h3>
                {resumoPorPerfil.length === 0 ? <p className="muted">Nenhum registro encontrado.</p> : null}
                {resumoPorPerfil.map((item) => (
                  <p key={item.perfilNome} className="muted">
                    <strong>{item.perfilNome}:</strong> {item.total}
                  </p>
                ))}
              </article>

              <article className="form-section">
                <h3>Profissionais com mais registros</h3>
                {resumoPorProfissional.length === 0 ? (
                  <p className="muted">Nenhum registro encontrado.</p>
                ) : null}
                {resumoPorProfissional.map((item) => (
                  <p key={item.nome} className="muted">
                    <strong>{item.nome}:</strong> {item.total}
                  </p>
                ))}
              </article>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

export default PainelCoordenacaoPage;

