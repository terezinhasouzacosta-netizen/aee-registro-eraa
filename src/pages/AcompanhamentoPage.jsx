import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { useAuth } from "../hooks/useAuth";
import {
  atualizarAcompanhamento,
  excluirAcompanhamento,
  listarAcompanhamentos,
  listarAlunosAcompanhamento,
  salvarDiarioBordo,
  salvarRegistroProfessor,
  salvarSinteseAcompanhamento,
} from "../services/acompanhamentoService";
import {
  excluirAtendimentoAEE,
  listarAtendimentosAEE,
} from "../services/atendimentoAeeService";
import { buscarIdsAlunosVinculados } from "../services/vinculacoesService";
import {
  podeAcessarAcompanhamento,
  podeEditarDiarioBordo,
  podeEditarHistoricoAcompanhamento,
  podeEditarRegistroProfessor,
  podeGerarSinteseAcompanhamento,
  podeVisualizarDiarioBordo,
  podeVisualizarHistoricoAcompanhamento,
  podeVisualizarRegistroProfessor,
  podeVisualizarSinteseAcompanhamento,
  visualizaSomenteVinculados,
} from "../utils/permissions";

const ABAS = [
  {
    id: "diario",
    tituloAba: "Diário de bordo",
    titulo: "Diário de bordo",
    descricao:
      "Registre observações frequentes do acompanhamento com foco no desenvolvimento do aluno.",
  },
  {
    id: "professor",
    tituloAba: "Registro do professor",
    titulo: "Registro do professor",
    descricao:
      "Organize os apontamentos pedagógicos feitos pelo professor durante as atividades.",
  },
  {
    id: "historico",
    tituloAba: "Histórico",
    titulo: "Histórico",
    descricao:
      "Visualize a linha do tempo dos registros de acompanhamento para apoiar análises.",
  },
  {
    id: "sintese",
    tituloAba: "Síntese",
    titulo: "Síntese",
    descricao:
      "Consolide os principais pontos observados e os encaminhamentos pedagógicos.",
  },
];

const ORIENTACOES_ABA = {
  diario: {
    linha1: "Quem preenche: Mediador e assistente educacional.",
    linha2:
      "Objetivo: Registrar, de forma breve, como o aluno participou das atividades, quais intervenções foram realizadas e como respondeu às estratégias durante o período observado.",
  },
  professor: {
    linha1: "Quem preenche: Professor regente da disciplina.",
    linha2:
      "Objetivo: Descrever, ao final do bimestre, como o aluno se desenvolveu na disciplina, quais intervenções foram realizadas, o que funcionou melhor e quais dificuldades foram observadas.",
  },
  historico: {
    linha1: "Visualização: Coordenação, AEE e gestão escolar.",
    linha2:
      "Objetivo: Acompanhar todos os registros realizados sobre o aluno ao longo do tempo, permitindo análise da evolução e das intervenções pedagógicas.",
  },
  sintese: {
    linha1: "Uso pedagógico: Coordenação, AEE e professores.",
    linha2:
      "Objetivo: Gerar uma análise consolidada com base nos registros, auxiliando na elaboração de relatórios e no planejamento de intervenções pedagógicas.",
  },
};

const TIPO_ATIVIDADE_OPCOES = [
  "atividade escrita",
  "atividade oral",
  "leitura",
  "interpretação",
  "cálculo",
  "avaliação",
  "atividade em grupo",
  "aula prática",
  "outro",
];

const AMBIENTE_OPCOES = ["sala comum", "sala de recursos", "pátio", "laboratório", "outro"];

const PARTICIPACAO_OPCOES = [
  "não participou",
  "participou com muita mediação",
  "participou com apoio",
  "participou parcialmente com autonomia",
  "participou com autonomia",
];

const COMPREENSAO_OPCOES = [
  "não compreendeu",
  "compreendeu com muita ajuda",
  "compreendeu com apoio",
  "compreendeu parcialmente sozinho",
  "compreendeu com autonomia",
];

const ATENCAO_PERMANENCIA_OPCOES = [
  "não conseguiu se manter",
  "manteve-se por pouco tempo",
  "manteve-se com apoio constante",
  "manteve-se na maior parte do tempo",
  "manteve-se com autonomia",
];

const INTERACAO_SOCIAL_OPCOES = [
  "recusou interação",
  "interagiu apenas com adulto",
  "interagiu com colegas com mediação",
  "interagiu parcialmente com autonomia",
  "interagiu bem com colegas e professor",
];

const AUTONOMIA_OPCOES = [
  "dependência total",
  "alta dependência",
  "dependência moderada",
  "pequena necessidade de apoio",
  "autonomia satisfatória",
];

const ESTRATEGIAS_OPCOES = [
  "apoio visual",
  "explicação individual",
  "instrução em etapas",
  "atividade reduzida",
  "leitura mediada",
  "modelagem",
  "repetição orientada",
  "apoio verbal",
  "colega de apoio",
  "tempo ampliado",
  "adaptação de material",
  "outro",
];

const RESULTADO_INTERVENCAO_OPCOES = [
  "não respondeu à estratégia",
  "respondeu minimamente",
  "respondeu parcialmente",
  "respondeu bem",
  "precisa continuidade",
  "precisa adaptação maior",
];

const BIMESTRE_OPCOES = ["1º bimestre", "2º bimestre", "3º bimestre", "4º bimestre"];

const PARTICIPACAO_DISCIPLINA_OPCOES = [
  "muito baixa",
  "baixa",
  "parcial",
  "boa com apoio",
  "boa com autonomia",
];

const COMPREENSAO_CONTEUDO_OPCOES = [
  "não compreende",
  "compreende minimamente",
  "compreende com mediação frequente",
  "compreende com algum apoio",
  "compreende satisfatoriamente",
];

const REALIZACAO_ATIVIDADES_OPCOES = [
  "não realiza",
  "realiza raramente",
  "realiza com muita ajuda",
  "realiza com apoio",
  "realiza com relativa autonomia",
];

const MARCADORES_INTERVENCAO_OPCOES = [
  "atividade adaptada",
  "prova adaptada",
  "leitura mediada",
  "redução de itens",
  "apoio visual",
  "apoio oral",
  "trabalho em dupla",
  "mais tempo para concluir",
  "acompanhamento individual",
  "flexibilização na correção",
];

const DISCIPLINA_OPCOES = [
  "Língua Portuguesa",
  "Matemática",
  "Ciências",
  "História",
  "Geografia",
  "Inglês",
  "Espanhol",
  "Arte",
  "Educação Física",
  "Ensino Religioso",
];

const TIPO_REGISTRO_LABEL = {
  diario_bordo: "Diário de bordo",
  registro_professor: "Registro do professor",
  sintese: "Síntese",
  atendimento_aee: "Atendimento AEE",
};

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function dataAtualISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = `${hoje.getMonth() + 1}`.padStart(2, "0");
  const dia = `${hoje.getDate()}`.padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formInicial({ alunoId = "", responsavelNome = "", funcaoResponsavel = "" } = {}) {
  return {
    alunoId,
    dataRegistro: dataAtualISO(),
    semanaReferencia: "",
    disciplina: "",
    professorAula: "",
    tipoAtividade: "",
    ambiente: "",
    participacao: "",
    compreensao: "",
    atencaoPermanencia: "",
    interacaoSocial: "",
    autonomia: "",
    estrategiasUtilizadas: [],
    resultadoIntervencao: "",
    avancosPercebidos: "",
    dificuldadesObservadas: "",
    observacaoGeral: "",
    encaminhamentos: "",
    responsavelNome,
    funcaoResponsavel,
  };
}

function formInicialProfessor({ alunoId = "", professorNome = "" } = {}) {
  return {
    alunoId,
    disciplina: "",
    professorNome,
    bimestre: "",
    dataRegistro: dataAtualISO(),
    participacaoDisciplina: "",
    compreensaoConteudo: "",
    realizacaoAtividades: "",
    desenvolvimentoDisciplina: "",
    intervencoesRealizadas: "",
    estrategiasQueFuncionaram: "",
    dificuldadesObservadas: "",
    encaminhamentosPedagogicos: "",
    marcadoresIntervencao: [],
  };
}

function obterMensagemErro(error, fallback) {
  const code = String(error?.code || "");
  if (code.includes("permission-denied")) {
    return "Sem permissão para esta operação no Firestore.";
  }
  if (code.includes("failed-precondition")) {
    return "A consulta precisa de índice no Firestore. Verifique o console do Firebase.";
  }
  return fallback;
}

function formatarDataFlex(data) {
  if (!data) return "-";
  if (data?.toDate) return data.toDate().toLocaleDateString("pt-BR");
  const parsed = new Date(data);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString("pt-BR");
}

function resumoRegistro(item) {
  const candidatos = [
    item?.habilidadesTrabalhadas,
    item?.observacaoGeral,
    item?.observacoes,
    item?.desenvolvimentoDisciplina,
    item?.avancosPercebidos,
    item?.dificuldadesObservadas,
    item?.encaminhamentosPedagogicos,
  ];
  const texto = candidatos.find((valor) => String(valor || "").trim()) || "";
  const normalizado = String(texto).replace(/\s+/g, " ").trim();
  if (!normalizado) return "Sem resumo disponível.";
  return normalizado.length > 170 ? `${normalizado.slice(0, 170)}...` : normalizado;
}

function obterNomeProfissional(item) {
  return item?.responsavelNome || item?.professorNome || "-";
}

function obterFuncaoProfissional(item) {
  if (item?.funcaoResponsavel) return item.funcaoResponsavel;
  if (item?.tipoRegistro === "atendimento_aee") return "Professor(a) do AEE";
  if (item?.tipoRegistro === "registro_professor") return "Professor regente";
  return "-";
}

function mapearAtendimentoParaHistorico(item) {
  return {
    ...item,
    idOriginal: item.id,
    id: `aee-${item.id}`,
    tipoRegistro: "atendimento_aee",
    dataRegistro: item.dataAtendimento || "",
    disciplina: item.tipoAtendimento || "Atendimento AEE",
    observacaoGeral: item.observacoes || "",
    dificuldadesObservadas: item.dificuldadesObservadas || "",
    avancosPercebidos: item.avancosPercebidos || "",
  };
}

function AcompanhamentoPage() {
  const { currentUser, perfil, perfilLabel } = useAuth();
  const location = useLocation();
  const [abaAtiva, setAbaAtiva] = useState("diario");
  const [alunos, setAlunos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [salvandoDiario, setSalvandoDiario] = useState(false);
  const [salvandoProfessor, setSalvandoProfessor] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState("");
  const [acompanhamentos, setAcompanhamentos] = useState([]);
  const [registroVisualizado, setRegistroVisualizado] = useState(null);
  const [diarioEmEdicao, setDiarioEmEdicao] = useState(null);
  const [professorEmEdicao, setProfessorEmEdicao] = useState(null);
  const [filtroHistorico, setFiltroHistorico] = useState({
    alunoId: "",
    tipoRegistro: "",
    mesReferencia: "",
    dataInicio: "",
    dataFim: "",
    profissional: "",
  });
  const [form, setForm] = useState(() =>
    formInicial({
      responsavelNome: "",
      funcaoResponsavel: "",
    })
  );
  const [formProfessor, setFormProfessor] = useState(() =>
    formInicialProfessor({
      professorNome: "",
    })
  );
  const [formSintese, setFormSintese] = useState({
    alunoId: "",
    mesReferencia: "",
    dataInicio: "",
    dataFim: "",
    texto: "",
  });
  const [registrosSintese, setRegistrosSintese] = useState([]);
  const [loadingSintese, setLoadingSintese] = useState(false);
  const [salvandoSintese, setSalvandoSintese] = useState(false);
  const sintesePdfRef = useRef(null);

  const podeLer = podeAcessarAcompanhamento(perfil);
  const podeLerDiario = podeVisualizarDiarioBordo(perfil);
  const podeLerProfessor = podeVisualizarRegistroProfessor(perfil);
  const podeLerHistorico = podeVisualizarHistoricoAcompanhamento(perfil);
  const podeLerSintese = podeVisualizarSinteseAcompanhamento(perfil);
  const podeSalvarDiario = podeEditarDiarioBordo(perfil);
  const podeSalvarProfessor = podeEditarRegistroProfessor(perfil);
  const podeSalvarSintese = podeGerarSinteseAcompanhamento(perfil);
  const podeEditarHistorico = podeEditarHistoricoAcompanhamento(perfil);
  const somenteVinculados = visualizaSomenteVinculados(perfil);

  console.log("[AcompanhamentoPage] ENTRADA confirmada na pagina de acompanhamento", {
    rotaAtual: location.pathname,
    emailUsuario: currentUser?.email || null,
    perfilAtual: perfil,
    abaAtiva,
    podeLer: podeLer,
    podeLerDiario,
    podeLerProfessor,
    podeLerHistorico,
    podeLerSintese,
    podeSalvarDiario,
    podeSalvarProfessor,
    podeSalvarSintese,
    somenteVinculados,
  });
  const responsavelNomePadrao = currentUser?.displayName || currentUser?.email || "";
  const nomeUsuarioPadrao = currentUser?.displayName || "Usuário";
  const funcaoResponsavelPadrao = perfilLabel || perfil || "";

  const alunoSelecionado = useMemo(
    () => alunos.find((aluno) => aluno.id === form.alunoId) || null,
    [alunos, form.alunoId]
  );
  const alunoProfessorSelecionado = useMemo(
    () => alunos.find((aluno) => aluno.id === formProfessor.alunoId) || null,
    [alunos, formProfessor.alunoId]
  );
  const profissionaisHistorico = useMemo(() => {
    const nomes = new Set(
      acompanhamentos
        .map((item) => obterNomeProfissional(item))
        .filter((item) => item && item !== "-")
    );
    return Array.from(nomes).sort((a, b) => a.localeCompare(b));
  }, [acompanhamentos]);

  const historicoFiltrado = useMemo(() => {
    const inicioMes = filtroHistorico.mesReferencia
      ? new Date(`${filtroHistorico.mesReferencia}-01T00:00:00`)
      : null;
    const fimMes = inicioMes
      ? new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0, 23, 59, 59)
      : null;
    const inicioIntervalo = filtroHistorico.dataInicio
      ? new Date(`${filtroHistorico.dataInicio}T00:00:00`)
      : null;
    const fimIntervalo = filtroHistorico.dataFim
      ? new Date(`${filtroHistorico.dataFim}T23:59:59`)
      : null;

    return acompanhamentos.filter((item) => {
      const profissional = obterNomeProfissional(item);
      if (
        filtroHistorico.profissional &&
        normalizarTexto(profissional) !== normalizarTexto(filtroHistorico.profissional)
      ) {
        return false;
      }

      const baseData = item.dataRegistro || (item.createdAt?.toDate ? item.createdAt.toDate() : null);
      const data = baseData instanceof Date ? baseData : new Date(baseData);
      if (Number.isNaN(data.getTime())) return true;

      if (inicioMes && fimMes && (data < inicioMes || data > fimMes)) return false;
      if (inicioIntervalo && data < inicioIntervalo) return false;
      if (fimIntervalo && data > fimIntervalo) return false;
      return true;
    });
  }, [acompanhamentos, filtroHistorico]);

  const abasDisponiveis = useMemo(
    () =>
      ABAS.filter((aba) => {
        if (aba.id === "diario") return podeLerDiario;
        if (aba.id === "professor") return podeLerProfessor;
        if (aba.id === "historico") return podeLerHistorico;
        if (aba.id === "sintese") return podeLerSintese;
        return false;
      }),
    [podeLerDiario, podeLerProfessor, podeLerHistorico, podeLerSintese]
  );

  const conteudoAtivo = abasDisponiveis.find((aba) => aba.id === abaAtiva) || abasDisponiveis[0] || ABAS[0];
  const orientacaoAtiva = ORIENTACOES_ABA[abaAtiva];

  useEffect(() => {
    if (!abasDisponiveis.length) return;
    if (!abasDisponiveis.some((aba) => aba.id === abaAtiva)) {
      setAbaAtiva(abasDisponiveis[0].id);
    }
  }, [abasDisponiveis, abaAtiva]);

  useEffect(() => {
    if (!currentUser || !podeLer) return;

    const carregarAlunos = async () => {
      setLoadingAlunos(true);
      setErro("");

      try {
        let alunosData = [];
        if (somenteVinculados) {
          const idsPermitidos = await buscarIdsAlunosVinculados(currentUser.uid);
          alunosData = await listarAlunosAcompanhamento({ idsPermitidos });
        } else {
          alunosData = await listarAlunosAcompanhamento();
        }

        setAlunos(alunosData);
        const alunoPadrao = alunosData[0]?.id || "";
        setForm((prev) => ({
          ...prev,
          alunoId:
            prev.alunoId && alunosData.some((aluno) => aluno.id === prev.alunoId)
              ? prev.alunoId
              : alunoPadrao,
        }));
        setFormProfessor((prev) => ({
          ...prev,
          alunoId:
            prev.alunoId && alunosData.some((aluno) => aluno.id === prev.alunoId)
              ? prev.alunoId
              : alunoPadrao,
        }));
        setFiltroHistorico((prev) => ({
          ...prev,
          alunoId:
            prev.alunoId && alunosData.some((aluno) => aluno.id === prev.alunoId)
              ? prev.alunoId
              : "",
        }));
        setFormSintese((prev) => ({
          ...prev,
          alunoId:
            prev.alunoId && alunosData.some((aluno) => aluno.id === prev.alunoId)
              ? prev.alunoId
              : alunosData[0]?.id || "",
        }));
      } catch (error) {
        setErro(obterMensagemErro(error, "Não foi possível carregar os alunos."));
      } finally {
        setLoadingAlunos(false);
      }
    };

    carregarAlunos();
  }, [currentUser, podeLer, somenteVinculados]);

  useEffect(() => {
    if (!currentUser) return;

    setForm((prev) => ({
      ...prev,
      responsavelNome: prev.responsavelNome || responsavelNomePadrao,
      funcaoResponsavel: prev.funcaoResponsavel || funcaoResponsavelPadrao,
    }));
    setFormProfessor((prev) => ({
      ...prev,
      professorNome: prev.professorNome || nomeUsuarioPadrao,
    }));
  }, [currentUser, responsavelNomePadrao, funcaoResponsavelPadrao, nomeUsuarioPadrao]);

  useEffect(() => {
    setErro("");
    setFeedback("");
  }, [abaAtiva]);

  useEffect(() => {
    if (!podeLerHistorico || !currentUser || abaAtiva !== "historico") return;

    const carregarHistorico = async () => {
      setLoadingHistorico(true);
      setErro("");

      try {
        const tipoSelecionado = String(filtroHistorico.tipoRegistro || "").trim();
        const filtroAcompanhamento =
          tipoSelecionado === "atendimento_aee" ? undefined : tipoSelecionado || undefined;

        let dataAcompanhamento = await listarAcompanhamentos({
          alunoId: filtroHistorico.alunoId || undefined,
          tipoRegistro: filtroAcompanhamento,
        });

        if (tipoSelecionado === "atendimento_aee") {
          dataAcompanhamento = [];
        }

        let dataAtendimentoAEE = [];
        const deveBuscarAtendimentoAEE = !tipoSelecionado || tipoSelecionado === "atendimento_aee";
        if (deveBuscarAtendimentoAEE && filtroHistorico.alunoId) {
          dataAtendimentoAEE = await listarAtendimentosAEE({
            alunoId: filtroHistorico.alunoId,
            mesReferencia: filtroHistorico.mesReferencia || undefined,
          });
        }

        if (somenteVinculados) {
          const idsPermitidos = await buscarIdsAlunosVinculados(currentUser.uid);
          dataAcompanhamento = dataAcompanhamento.filter((item) =>
            idsPermitidos.includes(item.alunoId)
          );
          dataAtendimentoAEE = dataAtendimentoAEE.filter((item) =>
            idsPermitidos.includes(item.alunoId)
          );
        }

        const data = [...dataAcompanhamento, ...dataAtendimentoAEE.map(mapearAtendimentoParaHistorico)];

        data.sort((a, b) => {
          const dataA = a.dataRegistro
            ? new Date(`${a.dataRegistro}T12:00:00`).getTime()
            : a.createdAt?.toDate
              ? a.createdAt.toDate().getTime()
              : 0;
          const dataB = b.dataRegistro
            ? new Date(`${b.dataRegistro}T12:00:00`).getTime()
            : b.createdAt?.toDate
              ? b.createdAt.toDate().getTime()
              : 0;
          return dataB - dataA;
        });

        setAcompanhamentos(data);
      } catch (error) {
        setErro(obterMensagemErro(error, "Não foi possível carregar o histórico."));
      } finally {
        setLoadingHistorico(false);
      }
    };

    carregarHistorico();
  }, [
    abaAtiva,
    currentUser,
    podeLerHistorico,
    somenteVinculados,
    filtroHistorico.alunoId,
    filtroHistorico.mesReferencia,
    filtroHistorico.tipoRegistro,
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeProfessor = (event) => {
    const { name, value } = event.target;
    setFormProfessor((prev) => ({ ...prev, [name]: value }));
  };

  const handleAlternarEstrategia = (estrategia) => {
    setForm((prev) => {
      const existe = prev.estrategiasUtilizadas.includes(estrategia);
      return {
        ...prev,
        estrategiasUtilizadas: existe
          ? prev.estrategiasUtilizadas.filter((item) => item !== estrategia)
          : [...prev.estrategiasUtilizadas, estrategia],
      };
    });
  };

  const handleAlternarMarcadorProfessor = (marcador) => {
    setFormProfessor((prev) => {
      const existe = prev.marcadoresIntervencao.includes(marcador);
      return {
        ...prev,
        marcadoresIntervencao: existe
          ? prev.marcadoresIntervencao.filter((item) => item !== marcador)
          : [...prev.marcadoresIntervencao, marcador],
      };
    });
  };

  const limparFormulario = () => {
    setDiarioEmEdicao(null);
    setForm(
      formInicial({
        alunoId: alunos[0]?.id || "",
        responsavelNome: responsavelNomePadrao,
        funcaoResponsavel: funcaoResponsavelPadrao,
      })
    );
  };

  const limparFormularioProfessor = () => {
    setProfessorEmEdicao(null);
    setFormProfessor(
      formInicialProfessor({
        alunoId: alunos[0]?.id || "",
        professorNome: nomeUsuarioPadrao,
      })
    );
  };

  const handleSalvarDiario = async (event) => {
    event.preventDefault();
    if (!currentUser || !podeSalvarDiario || !alunoSelecionado) return;

    setSalvandoDiario(true);
    setErro("");
    setFeedback("");

    try {
      const payload = {
        alunoId: alunoSelecionado.id,
        alunoNome: alunoSelecionado.nome || "",
        turma: alunoSelecionado.turma || "",
        turno: alunoSelecionado.turno || "",
        responsavelId: currentUser.uid,
        responsavelNome: form.responsavelNome.trim(),
        funcaoResponsavel: form.funcaoResponsavel.trim(),
        dataRegistro: form.dataRegistro,
        semanaReferencia: form.semanaReferencia,
        disciplina: form.disciplina.trim(),
        professorAula: form.professorAula.trim(),
        tipoAtividade: form.tipoAtividade,
        ambiente: form.ambiente,
        participacao: form.participacao,
        compreensao: form.compreensao,
        atencaoPermanencia: form.atencaoPermanencia,
        interacaoSocial: form.interacaoSocial,
        autonomia: form.autonomia,
        estrategiasUtilizadas: form.estrategiasUtilizadas,
        resultadoIntervencao: form.resultadoIntervencao,
        avancosPercebidos: form.avancosPercebidos.trim(),
        dificuldadesObservadas: form.dificuldadesObservadas.trim(),
        observacaoGeral: form.observacaoGeral.trim(),
        encaminhamentos: form.encaminhamentos.trim(),
      };

      if (diarioEmEdicao?.id) {
        await atualizarAcompanhamento(diarioEmEdicao.id, payload);
        setFeedback("Diário de bordo atualizado com sucesso.");
      } else {
        await salvarDiarioBordo(payload);
        setFeedback("Diário de bordo salvo com sucesso.");
      }

      setDiarioEmEdicao(null);
      limparFormulario();
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível salvar o diário de bordo."));
    } finally {
      setSalvandoDiario(false);
    }
  };

  const handleSalvarRegistroProfessor = async (event) => {
    event.preventDefault();
    if (!currentUser || !podeSalvarProfessor || !alunoProfessorSelecionado) return;

    setSalvandoProfessor(true);
    setErro("");
    setFeedback("");

    try {
      const payload = {
        alunoId: alunoProfessorSelecionado.id,
        alunoNome: alunoProfessorSelecionado.nome || "",
        turma: alunoProfessorSelecionado.turma || "",
        turno: alunoProfessorSelecionado.turno || "",
        disciplina: formProfessor.disciplina.trim(),
        professorNome: formProfessor.professorNome.trim(),
        professorId: currentUser.uid,
        bimestre: formProfessor.bimestre,
        dataRegistro: formProfessor.dataRegistro,
        participacaoDisciplina: formProfessor.participacaoDisciplina,
        compreensaoConteudo: formProfessor.compreensaoConteudo,
        realizacaoAtividades: formProfessor.realizacaoAtividades,
        desenvolvimentoDisciplina: formProfessor.desenvolvimentoDisciplina.trim(),
        intervencoesRealizadas: formProfessor.intervencoesRealizadas.trim(),
        estrategiasQueFuncionaram: formProfessor.estrategiasQueFuncionaram.trim(),
        dificuldadesObservadas: formProfessor.dificuldadesObservadas.trim(),
        encaminhamentosPedagogicos: formProfessor.encaminhamentosPedagogicos.trim(),
        marcadoresIntervencao: formProfessor.marcadoresIntervencao,
      };

      if (professorEmEdicao?.id) {
        await atualizarAcompanhamento(professorEmEdicao.id, payload);
        setFeedback("Registro do professor atualizado com sucesso.");
      } else {
        await salvarRegistroProfessor(payload);
        setFeedback("Registro do professor salvo com sucesso.");
      }

      setProfessorEmEdicao(null);
      limparFormularioProfessor();
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível salvar o registro do professor."));
    } finally {
      setSalvandoProfessor(false);
    }
  };

  const handleChangeFiltroHistorico = (event) => {
    const { name, value } = event.target;
    setFiltroHistorico((prev) => ({ ...prev, [name]: value }));
  };

  const handleVisualizarRegistro = (item) => {
    setRegistroVisualizado(item);
  };

  const handleEditarRegistro = (item) => {
    if (!podeEditarHistorico || !item) return;

    setRegistroVisualizado(null);
    setErro("");
    setFeedback("");

    if (item.tipoRegistro === "diario_bordo") {
      setAbaAtiva("diario");
      setDiarioEmEdicao(item);
      setForm({
        alunoId: item.alunoId || "",
        dataRegistro: item.dataRegistro || dataAtualISO(),
        semanaReferencia: item.semanaReferencia || "",
        disciplina: item.disciplina || "",
        professorAula: item.professorAula || "",
        tipoAtividade: item.tipoAtividade || "",
        ambiente: item.ambiente || "",
        participacao: item.participacao || "",
        compreensao: item.compreensao || "",
        atencaoPermanencia: item.atencaoPermanencia || "",
        interacaoSocial: item.interacaoSocial || "",
        autonomia: item.autonomia || "",
        estrategiasUtilizadas: Array.isArray(item.estrategiasUtilizadas)
          ? item.estrategiasUtilizadas
          : [],
        resultadoIntervencao: item.resultadoIntervencao || "",
        avancosPercebidos: item.avancosPercebidos || "",
        dificuldadesObservadas: item.dificuldadesObservadas || "",
        observacaoGeral: item.observacaoGeral || "",
        encaminhamentos: item.encaminhamentos || "",
        responsavelNome: item.responsavelNome || responsavelNomePadrao,
        funcaoResponsavel: item.funcaoResponsavel || funcaoResponsavelPadrao,
      });
      return;
    }

    if (item.tipoRegistro === "registro_professor") {
      setAbaAtiva("professor");
      setProfessorEmEdicao(item);
      setFormProfessor({
        alunoId: item.alunoId || "",
        disciplina: item.disciplina || "",
        professorNome: item.professorNome || nomeUsuarioPadrao,
        bimestre: item.bimestre || "",
        dataRegistro: item.dataRegistro || dataAtualISO(),
        participacaoDisciplina: item.participacaoDisciplina || "",
        compreensaoConteudo: item.compreensaoConteudo || "",
        realizacaoAtividades: item.realizacaoAtividades || "",
        desenvolvimentoDisciplina: item.desenvolvimentoDisciplina || "",
        intervencoesRealizadas: item.intervencoesRealizadas || "",
        estrategiasQueFuncionaram: item.estrategiasQueFuncionaram || "",
        dificuldadesObservadas: item.dificuldadesObservadas || "",
        encaminhamentosPedagogicos: item.encaminhamentosPedagogicos || "",
        marcadoresIntervencao: Array.isArray(item.marcadoresIntervencao)
          ? item.marcadoresIntervencao
          : [],
      });
      return;
    }

    if (item.tipoRegistro === "atendimento_aee") {
      setFeedback(
        "Este registro deve ser editado no módulo Atendimento AEE para manter a consistência dos dados."
      );
    }
  };

  const handleExcluirRegistro = async (item) => {
    if (!podeEditarHistorico || !item?.id) return;
    const confirma = window.confirm("Deseja excluir este registro?");
    if (!confirma) return;

    setErro("");
    setFeedback("");

    try {
      if (item.tipoRegistro === "atendimento_aee") {
        const atendimentoId = item.idOriginal || item.id.replace(/^aee-/, "");
        if (!atendimentoId) {
          throw new Error("ID do atendimento AEE não identificado para exclusão.");
        }
        await excluirAtendimentoAEE(atendimentoId);
      } else {
        await excluirAcompanhamento(item.id);
      }
      setAcompanhamentos((prev) => prev.filter((registro) => registro.id !== item.id));
      if (registroVisualizado?.id === item.id) {
        setRegistroVisualizado(null);
      }
      setFeedback("Registro excluído com sucesso.");
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível excluir o registro."));
    }
  };

  const handleChangeSintese = (event) => {
    const { name, value } = event.target;
    setFormSintese((prev) => ({ ...prev, [name]: value }));
  };

  const melhorarLinguagemPedagogica = (texto) => {
    const base = String(texto || "").replace(/\r/g, "").trim();
    if (!base) return "";
    const paragrafos = base
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item, index) => {
        if (index === 0) return item;
        const inicio = ["Além disso,", "Nesse sentido,", "Dessa forma,", "Por conseguinte,"];
        const prefixo = inicio[(index - 1) % inicio.length];
        const textoBase = item.charAt(0).toLowerCase() + item.slice(1);
        return `${prefixo} ${textoBase}`;
      });
    return paragrafos.join("\n\n");
  };

  const filtrarPorPeriodo = (lista = []) => {
    const inicioMes = formSintese.mesReferencia
      ? new Date(`${formSintese.mesReferencia}-01T00:00:00`)
      : null;
    const fimMes = inicioMes
      ? new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0, 23, 59, 59)
      : null;
    const inicio = formSintese.dataInicio ? new Date(`${formSintese.dataInicio}T00:00:00`) : null;
    const fim = formSintese.dataFim ? new Date(`${formSintese.dataFim}T23:59:59`) : null;

    return lista.filter((item) => {
      const baseData = item.dataRegistro || (item.createdAt?.toDate ? item.createdAt.toDate() : null);
      const data = baseData instanceof Date ? baseData : new Date(baseData);
      if (Number.isNaN(data.getTime())) return true;

      if (inicioMes && fimMes && (data < inicioMes || data > fimMes)) return false;
      if (inicio && data < inicio) return false;
      if (fim && data > fim) return false;
      return true;
    });
  };

  const montarTextoSintese = (registros, nomeAluno) => {
    const diarios = registros.filter((item) => item.tipoRegistro === "diario_bordo");
    const professores = registros.filter((item) => item.tipoRegistro === "registro_professor");
    const atendimentosAEE = registros.filter((item) => item.tipoRegistro === "atendimento_aee");

    const coletar = (lista, campo) =>
      lista
        .map((item) => String(item?.[campo] || "").trim())
        .filter(Boolean);

    const unicosTexto = (lista) => Array.from(new Set(lista));
    const juntar = (lista) => (lista.length ? lista.join("; ") : "sem dados suficientes no período");

    const contarOcorrencias = (lista) =>
      lista.reduce((acc, item) => {
        const chave = normalizarTexto(item);
        if (!chave) return acc;
        acc[chave] = (acc[chave] || 0) + 1;
        return acc;
      }, {});

    const categoriaParticipacao = (lista) => {
      const baixa = [
        "nao participou",
        "participou com muita mediacao",
        "muito baixa",
        "baixa",
      ];
      const media = [
        "participou com apoio",
        "participou parcialmente com autonomia",
        "parcial",
        "boa com apoio",
      ];
      const alta = ["participou com autonomia", "boa com autonomia"];

      let pontosBaixa = 0;
      let pontosMedia = 0;
      let pontosAlta = 0;

      lista.forEach((item) => {
        const valor = normalizarTexto(item);
        if (baixa.some((padrao) => valor.includes(padrao))) pontosBaixa += 1;
        else if (alta.some((padrao) => valor.includes(padrao))) pontosAlta += 1;
        else if (media.some((padrao) => valor.includes(padrao))) pontosMedia += 1;
      });

      if (pontosBaixa > pontosMedia && pontosBaixa >= pontosAlta) return "baixa";
      if (pontosAlta > pontosBaixa && pontosAlta >= pontosMedia) return "alta";
      if (pontosMedia > 0) return "intermediaria";
      return "indefinida";
    };

    const categoriaCompreensao = (lista) => {
      const baixa = [
        "nao compreendeu",
        "nao compreende",
        "compreende minimamente",
        "compreendeu com muita ajuda",
      ];
      const media = [
        "compreendeu com apoio",
        "compreendeu parcialmente sozinho",
        "compreende com mediacao frequente",
        "compreende com algum apoio",
      ];
      const alta = ["compreendeu com autonomia", "compreende satisfatoriamente"];

      let pontosBaixa = 0;
      let pontosMedia = 0;
      let pontosAlta = 0;

      lista.forEach((item) => {
        const valor = normalizarTexto(item);
        if (baixa.some((padrao) => valor.includes(padrao))) pontosBaixa += 1;
        else if (alta.some((padrao) => valor.includes(padrao))) pontosAlta += 1;
        else if (media.some((padrao) => valor.includes(padrao))) pontosMedia += 1;
      });

      if (pontosBaixa > pontosMedia && pontosBaixa >= pontosAlta) return "baixa";
      if (pontosAlta > pontosBaixa && pontosAlta >= pontosMedia) return "alta";
      if (pontosMedia > 0) return "intermediaria";
      return "indefinida";
    };

    const categoriaAutonomia = (lista) => {
      const baixa = ["dependencia total", "alta dependencia", "dependencia moderada"];
      const media = ["pequena necessidade de apoio"];
      const alta = ["autonomia satisfatoria"];

      let pontosBaixa = 0;
      let pontosMedia = 0;
      let pontosAlta = 0;

      lista.forEach((item) => {
        const valor = normalizarTexto(item);
        if (baixa.some((padrao) => valor.includes(padrao))) pontosBaixa += 1;
        else if (alta.some((padrao) => valor.includes(padrao))) pontosAlta += 1;
        else if (media.some((padrao) => valor.includes(padrao))) pontosMedia += 1;
      });

      if (pontosBaixa > pontosMedia && pontosBaixa >= pontosAlta) return "baixa";
      if (pontosAlta > pontosBaixa && pontosAlta >= pontosMedia) return "alta";
      if (pontosMedia > 0) return "intermediaria";
      return "indefinida";
    };

    const categoriaInteracao = (lista) => {
      const baixa = ["recusou interacao", "interagiu apenas com adulto"];
      const media = [
        "interagiu com colegas com mediacao",
        "interagiu parcialmente com autonomia",
      ];
      const alta = ["interagiu bem com colegas e professor"];

      let pontosBaixa = 0;
      let pontosMedia = 0;
      let pontosAlta = 0;

      lista.forEach((item) => {
        const valor = normalizarTexto(item);
        if (baixa.some((padrao) => valor.includes(padrao))) pontosBaixa += 1;
        else if (alta.some((padrao) => valor.includes(padrao))) pontosAlta += 1;
        else if (media.some((padrao) => valor.includes(padrao))) pontosMedia += 1;
      });

      if (pontosBaixa > pontosMedia && pontosBaixa >= pontosAlta) return "baixa";
      if (pontosAlta > pontosBaixa && pontosAlta >= pontosMedia) return "alta";
      if (pontosMedia > 0) return "intermediaria";
      return "indefinida";
    };

    const participacaoBruta = [
      ...coletar(diarios, "participacao"),
      ...coletar(professores, "participacaoDisciplina"),
    ];
    const compreensaoBruta = [
      ...coletar(diarios, "compreensao"),
      ...coletar(professores, "compreensaoConteudo"),
    ];
    const autonomiaBruta = coletar(diarios, "autonomia");
    const interacaoBruta = coletar(diarios, "interacaoSocial");
    const avancosBruto = [
      ...coletar(diarios, "avancosPercebidos"),
      ...coletar(professores, "desenvolvimentoDisciplina"),
      ...coletar(atendimentosAEE, "avancosPercebidos"),
    ];
    const dificuldadesBruto = [
      ...coletar(diarios, "dificuldadesObservadas"),
      ...coletar(professores, "dificuldadesObservadas"),
      ...coletar(atendimentosAEE, "dificuldadesObservadas"),
    ];

    const participacao = unicosTexto(participacaoBruta);
    const compreensao = unicosTexto(compreensaoBruta);
    const autonomia = unicosTexto(autonomiaBruta);
    const interacao = unicosTexto(interacaoBruta);
    const avancos = unicosTexto(avancosBruto);
    const dificuldades = unicosTexto(dificuldadesBruto);
    const estrategias = unicosTexto([
      ...diarios.flatMap((item) =>
        Array.isArray(item.estrategiasUtilizadas) ? item.estrategiasUtilizadas : []
      ),
      ...coletar(professores, "estrategiasQueFuncionaram"),
      ...coletar(professores, "intervencoesRealizadas"),
      ...coletar(atendimentosAEE, "habilidadesTrabalhadas"),
      ...coletar(atendimentosAEE, "eixoTematico"),
    ]);
    const encaminhamentos = unicosTexto([
      ...coletar(diarios, "encaminhamentos"),
      ...coletar(professores, "encaminhamentosPedagogicos"),
      ...coletar(atendimentosAEE, "observacoes"),
    ]);
    const totalAtendimentosAEE = atendimentosAEE.length;

    const freqDificuldades = contarOcorrencias(dificuldadesBruto);
    const freqAvancos = contarOcorrencias(avancosBruto);
    const possuiMuitasDificuldades = Object.values(freqDificuldades).some((total) => total >= 2);
    const possuiAvancosConsistentes = Object.values(freqAvancos).some((total) => total >= 2);
    const participaStatus = categoriaParticipacao(participacao);
    const compreensaoStatus = categoriaCompreensao(compreensao);
    const autonomiaStatus = categoriaAutonomia(autonomia);
    const interacaoStatus = categoriaInteracao(interacao);

    const paragrafo1 = [
      `Durante o período analisado, observou-se que ${nomeAluno} apresentou um percurso de acompanhamento registrado em diário de bordo, em registro do professor e em atendimentos no AEE.`,
      `De modo geral, o conjunto das evidências indica ${participaStatus === "baixa" ? "participação ainda restrita em parte das propostas pedagógicas" : participaStatus === "alta" ? "participação satisfatória nas propostas pedagógicas" : "participação em nível intermediário nas atividades"} e ${possuiMuitasDificuldades ? "necessidade de continuidade de apoios pedagógicos sistemáticos" : "manutenção das estratégias que vêm favorecendo o desenvolvimento acadêmico e social"}.`,
    ].join(" ");

    const paragrafo2 = [
      `Em relação à participação do aluno, os registros indicam: ${juntar(participacao)}.`,
      `No que se refere à compreensão das atividades e à aprendizagem, verifica-se ${compreensaoStatus === "baixa" ? "necessidade de mediação frequente para compreensão dos conteúdos" : compreensaoStatus === "alta" ? "compreensão mais consolidada em diferentes propostas" : "compreensão em processo de consolidação, com apoio pedagógico"}; registros observados: ${juntar(compreensao)}.`,
      `Foram identificados avanços em ${juntar(avancos)}, ${possuiAvancosConsistentes ? "com recorrência de indicadores positivos no período." : "de forma gradual ao longo do período."}`,
    ].join(" ");

    const paragrafo3 = [
      `Quanto à autonomia, observam-se ${autonomiaStatus === "baixa" ? "indicadores de dependência mais frequente para execução das atividades" : autonomiaStatus === "alta" ? "maior iniciativa e autorregulação na realização das tarefas" : "níveis intermediários de autonomia, com necessidade pontual de apoio"}; registros observados: ${juntar(autonomia)}.`,
      `Em relação à interação social e ao comportamento em contexto escolar, os registros apontam ${interacaoStatus === "baixa" ? "interações ainda limitadas, com necessidade de mediação contínua" : interacaoStatus === "alta" ? "interações adequadas com pares e profissionais, favorecendo o acesso às atividades" : "interação em desenvolvimento, com mediação em situações específicas"}; registros observados: ${juntar(interacao)}.`,
      `Persistem dificuldades relacionadas a ${juntar(dificuldades)}.`,
    ].join(" ");

    const paragrafo4 = [
      `As intervenções registradas indicam que ${juntar(estrategias)} contribuíram para a ampliação da participação e para o acesso do aluno às propostas pedagógicas.`,
      totalAtendimentosAEE > 0
        ? `No Atendimento AEE, foram contabilizados ${totalAtendimentosAEE} registros no período, com foco em ${juntar(unicosTexto(coletar(atendimentosAEE, "tipoAtendimento")))}.`
        : "Não houve registros de Atendimento AEE no período selecionado.",
      `Quanto aos encaminhamentos, recomenda-se a continuidade de ${juntar(encaminhamentos)}, com monitoramento sistemático e articulação entre os profissionais envolvidos no atendimento.`,
    ].join(" ");

    const texto = [paragrafo1, paragrafo2, paragrafo3, paragrafo4].join("\n\n");

    return melhorarLinguagemPedagogica(texto);
  };

  const handleGerarSintese = async () => {
    if (!podeSalvarSintese) return;
    if (!formSintese.alunoId) {
      setErro("Selecione um aluno para gerar a síntese.");
      return;
    }

    setLoadingSintese(true);
    setErro("");
    setFeedback("");

    try {
      const alunoBase = alunos.find((item) => item.id === formSintese.alunoId);
      let dados = await listarAcompanhamentos({ alunoId: formSintese.alunoId });
      dados = dados.filter(
        (item) => item.tipoRegistro === "diario_bordo" || item.tipoRegistro === "registro_professor"
      );
      const atendimentosAEE = await listarAtendimentosAEE({
        alunoId: formSintese.alunoId,
        mesReferencia: formSintese.mesReferencia || undefined,
      });
      const dadosComAEE = [...dados, ...atendimentosAEE.map(mapearAtendimentoParaHistorico)];
      const filtrados = filtrarPorPeriodo(dadosComAEE);

      setRegistrosSintese(filtrados);

      if (!filtrados.length) {
        setFormSintese((prev) => ({ ...prev, texto: "" }));
        setFeedback("Nenhum registro encontrado para gerar síntese.");
        return;
      }

      const texto = montarTextoSintese(filtrados, alunoBase?.nome || "o aluno");
      setFormSintese((prev) => ({ ...prev, texto }));
      setFeedback("Síntese gerada com sucesso.");
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível gerar a síntese."));
    } finally {
      setLoadingSintese(false);
    }
  };

  const handleMelhorarSintese = () => {
    if (!podeSalvarSintese) return;
    setFormSintese((prev) => ({
      ...prev,
      texto: melhorarLinguagemPedagogica(prev.texto),
    }));
  };

  const handleSalvarSintese = async () => {
    if (!podeSalvarSintese) return;
    if (!formSintese.alunoId || !formSintese.texto.trim()) {
      setErro("Gere a síntese antes de salvar.");
      return;
    }

    setSalvandoSintese(true);
    setErro("");
    setFeedback("");

    try {
      const alunoBase = alunos.find((item) => item.id === formSintese.alunoId);
      await salvarSinteseAcompanhamento({
        alunoId: formSintese.alunoId,
        alunoNome: alunoBase?.nome || "",
        turma: alunoBase?.turma || "",
        turno: alunoBase?.turno || "",
        mesReferencia: formSintese.mesReferencia,
        dataInicio: formSintese.dataInicio,
        dataFim: formSintese.dataFim,
        textoSintese: formSintese.texto.trim(),
        responsavelId: currentUser?.uid || "",
        responsavelNome: nomeUsuarioPadrao,
        registrosBaseIds: registrosSintese.map((item) => item.id),
      });
      setFeedback("Síntese salva com sucesso.");
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível salvar a síntese."));
    } finally {
      setSalvandoSintese(false);
    }
  };

  const handleImprimirSintese = () => {
    window.print();
  };

  const handleExportarSintesePdf = async () => {
    if (!sintesePdfRef.current || !formSintese.texto.trim()) {
      setErro("Gere a síntese antes de exportar o PDF.");
      return;
    }

    setErro("");
    try {
      const alunoBase = alunos.find((item) => item.id === formSintese.alunoId);
      const nomeArquivo = `sintese-acompanhamento-${(alunoBase?.nome || "aluno")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .toLowerCase()}.pdf`;

      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: nomeArquivo,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(sintesePdfRef.current)
        .save();
    } catch (error) {
      setErro("Não foi possível exportar a síntese em PDF.");
    }
  };

  const renderSelect = (id, label, options, required = true) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} value={form[id]} onChange={handleChange} required={required}>
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );

  const renderSelectProfessor = (id, label, options, required = true) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={id}
        value={formProfessor[id]}
        onChange={handleChangeProfessor}
        required={required}
      >
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );

  const renderDiarioBordo = () => {
    if (!podeLerDiario) {
      return (
        <article className="panel acompanhamento-card">
          <h2>Diário de bordo</h2>
          <p>Seu perfil não possui permissão para acessar este módulo.</p>
        </article>
      );
    }

    return (
      <article className="panel acompanhamento-card acompanhamento-diario-card">
        <h2>Diário de bordo</h2>
        <p className="tab-helper-text">
          <span>{ORIENTACOES_ABA.diario.linha1}</span>
          <br />
          <span>{ORIENTACOES_ABA.diario.linha2}</span>
        </p>
        <p>Registre observações frequentes sobre participação, intervenções e evolução do aluno.</p>

        {feedback ? <p className="toast-success">{feedback}</p> : null}
        {erro ? <p className="toast-error">{erro}</p> : null}

        {loadingAlunos ? <p>Carregando alunos...</p> : null}

        {!loadingAlunos && alunos.length === 0 ? (
          <p>Nenhum aluno vinculado para este usuário no momento.</p>
        ) : null}

        {!loadingAlunos && alunos.length > 0 && podeSalvarDiario ? (
          <form className="aluno-form acompanhamento-diario-form" onSubmit={handleSalvarDiario}>
            <section className="form-section">
              <h3>Dados de identificação</h3>

              <label htmlFor="alunoId">Aluno</label>
              <select
                id="alunoId"
                name="alunoId"
                value={form.alunoId}
                onChange={handleChange}
                required
              >
                <option value="">Selecione</option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome}
                  </option>
                ))}
              </select>

              <div className="acompanhamento-inline-grid">
                <div>
                  <label htmlFor="turma">Turma</label>
                  <input id="turma" value={alunoSelecionado?.turma || ""} readOnly />
                </div>
                <div>
                  <label htmlFor="turno">Turno</label>
                  <input id="turno" value={alunoSelecionado?.turno || ""} readOnly />
                </div>
              </div>

              <div className="acompanhamento-inline-grid">
                <div>
                  <label htmlFor="responsavelNome">Responsável pelo registro</label>
                  <input
                    id="responsavelNome"
                    name="responsavelNome"
                    value={form.responsavelNome}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="funcaoResponsavel">Função do responsável</label>
                  <input
                    id="funcaoResponsavel"
                    name="funcaoResponsavel"
                    value={form.funcaoResponsavel}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="acompanhamento-inline-grid">
                <div>
                  <label htmlFor="dataRegistro">Data do registro</label>
                  <input
                    id="dataRegistro"
                    name="dataRegistro"
                    type="date"
                    value={form.dataRegistro}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="semanaReferencia">Semana de referência</label>
                  <input
                    id="semanaReferencia"
                    name="semanaReferencia"
                    type="week"
                    value={form.semanaReferencia}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="form-section">
              <h3>Contexto da observação</h3>

              <div className="acompanhamento-inline-grid">
                <div>
                  <label htmlFor="disciplina">Disciplina observada</label>
                  <textarea
                    id="disciplina"
                    name="disciplina"
                    value={form.disciplina}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Informe as disciplinas observadas no período (ex: Língua Portuguesa, Matemática, Ciências...)"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="professorAula">Professor da aula</label>
                  <textarea
                    id="professorAula"
                    name="professorAula"
                    value={form.professorAula}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Informe os professores das aulas acompanhadas (ex: Prof. João, Profª Maria...)"
                    required
                  />
                </div>
              </div>

              {renderSelect("tipoAtividade", "Tipo de atividade", TIPO_ATIVIDADE_OPCOES)}
              {renderSelect("ambiente", "Ambiente", AMBIENTE_OPCOES)}
            </section>

            <section className="form-section">
              <h3>Avaliação padronizada</h3>
              {renderSelect("participacao", "Participação do aluno", PARTICIPACAO_OPCOES)}
              {renderSelect("compreensao", "Compreensão da proposta", COMPREENSAO_OPCOES)}
              {renderSelect(
                "atencaoPermanencia",
                "Atenção e permanência",
                ATENCAO_PERMANENCIA_OPCOES
              )}
              {renderSelect("interacaoSocial", "Interação social", INTERACAO_SOCIAL_OPCOES)}
              {renderSelect("autonomia", "Autonomia", AUTONOMIA_OPCOES)}
            </section>

            <section className="form-section">
              <h3>Estratégias / intervenções realizadas</h3>
              <div className="checkbox-group">
                {ESTRATEGIAS_OPCOES.map((opcao) => (
                  <label key={opcao} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.estrategiasUtilizadas.includes(opcao)}
                      onChange={() => handleAlternarEstrategia(opcao)}
                    />
                    {opcao}
                  </label>
                ))}
              </div>

              {renderSelect(
                "resultadoIntervencao",
                "Resultado da intervenção",
                RESULTADO_INTERVENCAO_OPCOES
              )}
            </section>

            <section className="form-section">
              <h3>Campos descritivos</h3>
              <label htmlFor="avancosPercebidos">Avanços percebidos</label>
              <textarea
                id="avancosPercebidos"
                name="avancosPercebidos"
                value={form.avancosPercebidos}
                onChange={handleChange}
                rows={3}
              />

              <label htmlFor="dificuldadesObservadas">Dificuldades observadas</label>
              <textarea
                id="dificuldadesObservadas"
                name="dificuldadesObservadas"
                value={form.dificuldadesObservadas}
                onChange={handleChange}
                rows={3}
              />

              <label htmlFor="observacaoGeral">Observação geral</label>
              <textarea
                id="observacaoGeral"
                name="observacaoGeral"
                value={form.observacaoGeral}
                onChange={handleChange}
                rows={4}
              />

              <label htmlFor="encaminhamentos">Encaminhamentos</label>
              <textarea
                id="encaminhamentos"
                name="encaminhamentos"
                value={form.encaminhamentos}
                onChange={handleChange}
                rows={4}
              />
            </section>

            <div className="form-actions sticky-actions">
              <button type="submit" disabled={salvandoDiario}>
                {salvandoDiario
                  ? "Salvando..."
                  : diarioEmEdicao
                    ? "Atualizar registro"
                    : "Salvar registro"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={limparFormulario}
                disabled={salvandoDiario}
              >
                Limpar formulário
              </button>
            </div>
          </form>
        ) : null}

        {!loadingAlunos && alunos.length > 0 && !podeSalvarDiario ? (
          <p className="muted">
            Seu perfil possui acesso de visualização. Apenas Mediador, Assistente Educacional e
            Professor(a) do AEE podem preencher o Diário de bordo.
          </p>
        ) : null}
      </article>
    );
  };

  const renderRegistroProfessor = () => {
    if (!podeLerProfessor) {
      return (
        <article className="panel acompanhamento-card">
          <h2>Registro do professor</h2>
          <p>Seu perfil não possui permissão para acessar este módulo.</p>
        </article>
      );
    }

    return (
      <article className="panel acompanhamento-card acompanhamento-diario-card">
        <h2>Registro do professor</h2>
        <p className="tab-helper-text">
          <span>{ORIENTACOES_ABA.professor.linha1}</span>
          <br />
          <span>{ORIENTACOES_ABA.professor.linha2}</span>
        </p>
        <p>
          Registre a avaliação bimestral da disciplina, destacando desenvolvimento, intervenções e
          encaminhamentos pedagógicos.
        </p>

        {feedback ? <p className="toast-success">{feedback}</p> : null}
        {erro ? <p className="toast-error">{erro}</p> : null}

        {loadingAlunos ? <p>Carregando alunos...</p> : null}

        {!loadingAlunos && alunos.length === 0 ? (
          <p>Nenhum aluno vinculado para este usuário no momento.</p>
        ) : null}

        {!loadingAlunos && alunos.length > 0 && podeSalvarProfessor ? (
          <form className="aluno-form acompanhamento-diario-form" onSubmit={handleSalvarRegistroProfessor}>
            <section className="form-section">
              <h3>Dados de identificação</h3>

              <label htmlFor="alunoId">Aluno</label>
              <select
                id="alunoId"
                name="alunoId"
                value={formProfessor.alunoId}
                onChange={handleChangeProfessor}
                required
              >
                <option value="">Selecione</option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome}
                  </option>
                ))}
              </select>

              <div className="acompanhamento-inline-grid">
                <div>
                  <label htmlFor="turmaProfessor">Turma</label>
                  <input id="turmaProfessor" value={alunoProfessorSelecionado?.turma || ""} readOnly />
                </div>
                <div>
                  <label htmlFor="turnoProfessor">Turno</label>
                  <input id="turnoProfessor" value={alunoProfessorSelecionado?.turno || ""} readOnly />
                </div>
              </div>

              <label htmlFor="disciplina">Disciplina</label>
              <select
                id="disciplina"
                name="disciplina"
                value={formProfessor.disciplina}
                onChange={handleChangeProfessor}
                required
              >
                <option value="">Selecione</option>
                {DISCIPLINA_OPCOES.map((disciplina) => (
                  <option key={disciplina} value={disciplina}>
                    {disciplina}
                  </option>
                ))}
              </select>

              <div className="acompanhamento-inline-grid">
                <div>
                  <label htmlFor="professorNome">Professor responsável</label>
                  <input
                    id="professorNome"
                    name="professorNome"
                    value={formProfessor.professorNome}
                    onChange={handleChangeProfessor}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dataRegistroProfessor">Data do registro</label>
                  <input
                    id="dataRegistroProfessor"
                    name="dataRegistro"
                    type="date"
                    value={formProfessor.dataRegistro}
                    onChange={handleChangeProfessor}
                    required
                  />
                </div>
              </div>

              {renderSelectProfessor("bimestre", "Bimestre", BIMESTRE_OPCOES)}
            </section>

            <section className="form-section">
              <h3>Análise do desempenho do aluno</h3>
              <div className="acompanhamento-inline-grid">
              {renderSelectProfessor(
                "participacaoDisciplina",
                "Participação do aluno na disciplina",
                PARTICIPACAO_DISCIPLINA_OPCOES
              )}
              {renderSelectProfessor(
                "compreensaoConteudo",
                "Compreensão dos conteúdos",
                COMPREENSAO_CONTEUDO_OPCOES
              )}
              {renderSelectProfessor(
                "realizacaoAtividades",
                "Realização das atividades",
                REALIZACAO_ATIVIDADES_OPCOES
              )}
              </div>
            </section>

            <section className="form-section">
              <h3>Desenvolvimento do aluno na disciplina</h3>
              <textarea
                id="desenvolvimentoDisciplina"
                name="desenvolvimentoDisciplina"
                value={formProfessor.desenvolvimentoDisciplina}
                onChange={handleChangeProfessor}
                rows={4}
                placeholder="Descreva como o aluno participou das atividades da disciplina ao longo do bimestre, considerando compreensão, realização das tarefas, interação e evolução observada."
                required
              />

              <label htmlFor="intervencoesRealizadas">Intervenções realizadas</label>
              <textarea
                id="intervencoesRealizadas"
                name="intervencoesRealizadas"
                value={formProfessor.intervencoesRealizadas}
                onChange={handleChangeProfessor}
                rows={3}
                placeholder="Informe quais adaptações, estratégias ou apoios foram realizados durante o bimestre."
                required
              />

              <label htmlFor="estrategiasQueFuncionaram">Estratégias que funcionaram</label>
              <textarea
                id="estrategiasQueFuncionaram"
                name="estrategiasQueFuncionaram"
                value={formProfessor.estrategiasQueFuncionaram}
                onChange={handleChangeProfessor}
                rows={3}
                placeholder="Registre quais recursos ou intervenções ajudaram o aluno a participar e aprender melhor."
                required
              />

              <label htmlFor="dificuldadesObservadasProfessor">Dificuldades observadas</label>
              <textarea
                id="dificuldadesObservadasProfessor"
                name="dificuldadesObservadas"
                value={formProfessor.dificuldadesObservadas}
                onChange={handleChangeProfessor}
                rows={3}
                placeholder="Descreva as principais dificuldades observadas na sua disciplina."
                required
              />

              <label htmlFor="encaminhamentosPedagogicos">Encaminhamentos pedagógicos</label>
              <textarea
                id="encaminhamentosPedagogicos"
                name="encaminhamentosPedagogicos"
                value={formProfessor.encaminhamentosPedagogicos}
                onChange={handleChangeProfessor}
                rows={3}
                placeholder="Indique sugestões para continuidade do trabalho pedagógico."
                required
              />
            </section>

            <section className="form-section">
              <h3>Marcadores de intervenção</h3>
              <div className="checkbox-group">
                {MARCADORES_INTERVENCAO_OPCOES.map((marcador) => (
                  <label key={marcador} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formProfessor.marcadoresIntervencao.includes(marcador)}
                      onChange={() => handleAlternarMarcadorProfessor(marcador)}
                    />
                    {marcador}
                  </label>
                ))}
              </div>
            </section>

            <div className="form-actions sticky-actions">
              <button type="submit" disabled={salvandoProfessor}>
                {salvandoProfessor
                  ? "Salvando..."
                  : professorEmEdicao
                    ? "Atualizar registro"
                    : "Salvar registro"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={limparFormularioProfessor}
                disabled={salvandoProfessor}
              >
                Limpar formulário
              </button>
            </div>
          </form>
        ) : null}

        {!loadingAlunos && alunos.length > 0 && !podeSalvarProfessor ? (
          <p className="muted">
            Seu perfil possui acesso de visualização. Apenas Professor(a) regente e Professor(a) do
            AEE podem preencher o Registro do professor.
          </p>
        ) : null}
      </article>
    );
  };

  const renderHistorico = () => (
    <article className="panel acompanhamento-card acompanhamento-diario-card">
      <h2>Histórico</h2>
      <p className="tab-helper-text">
        <span>{ORIENTACOES_ABA.historico.linha1}</span>
        <br />
        <span>{ORIENTACOES_ABA.historico.linha2}</span>
      </p>

      {feedback ? <p className="toast-success">{feedback}</p> : null}
      {erro ? <p className="toast-error">{erro}</p> : null}

      <section className="form-section">
        <h3>Filtros</h3>
        <div className="acompanhamento-inline-grid">
          <div>
            <label htmlFor="filtroAlunoHistorico">Aluno</label>
            <select
              id="filtroAlunoHistorico"
              name="alunoId"
              value={filtroHistorico.alunoId}
              onChange={handleChangeFiltroHistorico}
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
            <label htmlFor="filtroTipoHistorico">Tipo de registro</label>
            <select
              id="filtroTipoHistorico"
              name="tipoRegistro"
              value={filtroHistorico.tipoRegistro}
              onChange={handleChangeFiltroHistorico}
            >
              <option value="">Todos</option>
              <option value="diario_bordo">Diário de bordo</option>
              <option value="registro_professor">Registro do professor</option>
              <option value="atendimento_aee">Atendimento AEE</option>
            </select>
          </div>

          <div>
            <label htmlFor="filtroMesHistorico">Mês</label>
            <input
              id="filtroMesHistorico"
              name="mesReferencia"
              type="month"
              value={filtroHistorico.mesReferencia}
              onChange={handleChangeFiltroHistorico}
            />
          </div>

          <div>
            <label htmlFor="filtroProfissionalHistorico">Profissional</label>
            <select
              id="filtroProfissionalHistorico"
              name="profissional"
              value={filtroHistorico.profissional}
              onChange={handleChangeFiltroHistorico}
            >
              <option value="">Todos</option>
              {profissionaisHistorico.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtroDataInicioHistorico">Data inicial</label>
            <input
              id="filtroDataInicioHistorico"
              name="dataInicio"
              type="date"
              value={filtroHistorico.dataInicio}
              onChange={handleChangeFiltroHistorico}
            />
          </div>

          <div>
            <label htmlFor="filtroDataFimHistorico">Data final</label>
            <input
              id="filtroDataFimHistorico"
              name="dataFim"
              type="date"
              value={filtroHistorico.dataFim}
              onChange={handleChangeFiltroHistorico}
            />
          </div>
        </div>
      </section>

      {loadingHistorico ? <p>Carregando...</p> : null}

      {!loadingHistorico && historicoFiltrado.length === 0 ? (
        <p>Nenhum registro encontrado.</p>
      ) : null}

      {!loadingHistorico &&
        historicoFiltrado.map((item) => (
          <article key={item.id} className="meta-card">
            <p>
              <strong>Data:</strong> {item.dataRegistro || formatarDataFlex(item.createdAt)}
            </p>
            <p>
              <strong>Aluno:</strong> {item.alunoNome || "-"}
            </p>
            <p>
              <strong>Tipo:</strong> {TIPO_REGISTRO_LABEL[item.tipoRegistro] || item.tipoRegistro}
            </p>
            <p>
              <strong>Profissional:</strong> {obterNomeProfissional(item)}
            </p>
            <p>
              <strong>Função:</strong> {obterFuncaoProfissional(item)}
            </p>
            <p>
              <strong>Disciplina:</strong> {item.disciplina || "-"}
            </p>
            <p className="report-text">
              <strong>Resumo:</strong> {resumoRegistro(item)}
            </p>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleVisualizarRegistro(item)}
              >
                Visualizar
              </button>
              {podeEditarHistorico ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleEditarRegistro(item)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => handleExcluirRegistro(item)}
                  >
                    Excluir
                  </button>
                </>
              ) : null}
            </div>
          </article>
        ))}

      {registroVisualizado ? (
        <section className="form-section">
          <h3>Visualização do registro</h3>
          <p>
            <strong>Tipo:</strong>{" "}
            {TIPO_REGISTRO_LABEL[registroVisualizado.tipoRegistro] || registroVisualizado.tipoRegistro}
          </p>
          <p className="report-text">{resumoRegistro(registroVisualizado)}</p>
        </section>
      ) : null}
    </article>
  );

  const renderSintese = () => {
    if (!podeLerSintese) {
      return (
        <article className="panel acompanhamento-card">
          <h2>Síntese</h2>
          <p>Seu perfil não possui permissão para acessar esta aba.</p>
        </article>
      );
    }

    const alunoSintese = alunos.find((item) => item.id === formSintese.alunoId);

    return (
      <article className="panel acompanhamento-card acompanhamento-diario-card">
        <h2>Síntese</h2>
        <p className="tab-helper-text">
          <span>{ORIENTACOES_ABA.sintese.linha1}</span>
          <br />
          <span>{ORIENTACOES_ABA.sintese.linha2}</span>
        </p>

        {feedback ? <p className="toast-success">{feedback}</p> : null}
        {erro ? <p className="toast-error">{erro}</p> : null}

        <section className="form-section">
          <h3>Filtros</h3>
          <div className="acompanhamento-inline-grid">
            <div>
              <label htmlFor="sinteseAluno">Aluno</label>
              <select
                id="sinteseAluno"
                name="alunoId"
                value={formSintese.alunoId}
                onChange={handleChangeSintese}
                required
              >
                <option value="">Selecione</option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sinteseMes">Mês</label>
              <input
                id="sinteseMes"
                name="mesReferencia"
                type="month"
                value={formSintese.mesReferencia}
                onChange={handleChangeSintese}
              />
            </div>

            <div>
              <label htmlFor="sinteseDataInicio">Data inicial</label>
              <input
                id="sinteseDataInicio"
                name="dataInicio"
                type="date"
                value={formSintese.dataInicio}
                onChange={handleChangeSintese}
              />
            </div>

            <div>
              <label htmlFor="sinteseDataFim">Data final</label>
              <input
                id="sinteseDataFim"
                name="dataFim"
                type="date"
                value={formSintese.dataFim}
                onChange={handleChangeSintese}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Síntese pedagógica automática</h3>
          {loadingSintese ? <p>Gerando síntese...</p> : null}
          <textarea
            id="textoSintese"
            value={formSintese.texto}
            onChange={(event) =>
              setFormSintese((prev) => ({ ...prev, texto: event.target.value }))
            }
            readOnly={!podeSalvarSintese}
            rows={12}
            placeholder="Clique em Gerar síntese para montar o texto automaticamente."
          />

          <div className="form-actions">
            <button type="button" onClick={handleGerarSintese} disabled={loadingSintese || !podeSalvarSintese}>
              Gerar síntese
            </button>
            <button type="button" className="btn-secondary" onClick={handleMelhorarSintese} disabled={!podeSalvarSintese}>
              Melhorar linguagem pedagógica
            </button>
            <button type="button" className="btn-secondary" onClick={handleSalvarSintese} disabled={salvandoSintese || !podeSalvarSintese}>
              {salvandoSintese ? "Salvando..." : "Salvar síntese"}
            </button>
            <button type="button" className="btn-secondary" onClick={handleImprimirSintese}>
              Imprimir
            </button>
            <button type="button" className="btn-secondary" onClick={handleExportarSintesePdf}>
              Exportar PDF
            </button>
          </div>
          {!podeSalvarSintese ? (
            <p className="muted">
              Seu perfil possui acesso de leitura. Apenas Professor(a) do AEE pode gerar e salvar
              síntese pedagógica.
            </p>
          ) : null}
        </section>

        <article ref={sintesePdfRef} className="print-report-card">
          <h3>Síntese pedagógica de acompanhamento</h3>
          <p>
            <strong>Aluno:</strong> {alunoSintese?.nome || "-"}
          </p>
          <p>
            <strong>Período:</strong>{" "}
            {formSintese.mesReferencia || `${formSintese.dataInicio || "-"} até ${formSintese.dataFim || "-"}`}
          </p>
          <p className="report-text">{formSintese.texto || "-"}</p>
        </article>
      </article>
    );
  };

  return (
    <main className="alunos-page module-page acompanhamento-page">
      <header className="page-header">
        <h1>Acompanhamento</h1>
        <p>Estrutura do módulo de acompanhamento pedagógico do AEE.</p>
        <p className="muted">
          Orientação: Este módulo reúne os registros do acompanhamento do aluno, incluindo o diário
          de bordo, o registro do professor, o histórico e a síntese pedagógica. Permite acompanhar
          a participação, as intervenções realizadas e a evolução do aluno ao longo do tempo,
          subsidiando o planejamento das ações pedagógicas.
        </p>
      </header>

      <section className="panel no-print">
        <div className="acompanhamento-tabs" role="tablist" aria-label="Abas de acompanhamento">
          {abasDisponiveis.map((aba) => (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={abaAtiva === aba.id}
              className={`tab-button ${abaAtiva === aba.id ? "active" : ""}`}
              onClick={() => setAbaAtiva(aba.id)}
            >
              {aba.tituloAba}
            </button>
          ))}
        </div>
      </section>

      <section className="acompanhamento-grid">
        {abaAtiva === "diario" ? renderDiarioBordo() : null}
        {abaAtiva === "professor" ? renderRegistroProfessor() : null}
        {abaAtiva === "historico" ? renderHistorico() : null}
        {abaAtiva === "sintese" ? renderSintese() : null}
        {abaAtiva !== "diario" &&
        abaAtiva !== "professor" &&
        abaAtiva !== "historico" &&
        abaAtiva !== "sintese" ? (
          <article className="panel acompanhamento-card">
            <h2>{conteudoAtivo.titulo}</h2>
            <p className="tab-helper-text">
              <span>{orientacaoAtiva?.linha1}</span>
              <br />
              <span>{orientacaoAtiva?.linha2}</span>
            </p>
            <p>{conteudoAtivo.descricao}</p>
            <div className="form-actions">
              <button type="button">Novo registro</button>
            </div>
          </article>
        ) : null}

        <article className="panel acompanhamento-card">
          <h2>Organização da aba</h2>
          <p>
            Esta área permanece preparada para receber os formulários e listas específicos das
            próximas etapas, mantendo o padrão visual atual do sistema.
          </p>
          <div className="form-actions">
            <button type="button" className="btn-secondary">
              Novo registro
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}

export default AcompanhamentoPage;







