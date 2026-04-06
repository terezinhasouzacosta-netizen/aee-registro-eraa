import { useEffect, useMemo, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { useAuth } from "../hooks/useAuth";
import { listarAlunos, listarAlunosPorIds } from "../services/alunosService";
import { listarAcompanhamentos } from "../services/acompanhamentoService";
import { listarAtendimentosAEE, gerarSinteseMensalAtendimento } from "../services/atendimentoAeeService";
import { listarMetasPorAlunoId } from "../services/metasService";
import { listarMonitoramentos } from "../services/monitoramentosService";
import {
  atualizarRelatorio,
  criarRelatorio,
  excluirRelatorio,
  listarRelatorios,
} from "../services/relatoriosService";
import { listarSondagens } from "../services/sondagensService";
import { buscarDadosUsuarioPorUid } from "../services/usersService";
import { buscarIdsAlunosVinculados } from "../services/vinculacoesService";
import {
  podeEditarRelatorios,
  podeVisualizarRelatorios,
  visualizaSomenteVinculados,
} from "../utils/permissions";
import { gerarRelatorioMultidisciplinarAutomatico } from "../utils/relatorioMultidisciplinarAutomatico";

const BIMESTRES = ["1\u00BA", "2\u00BA", "3\u00BA", "4\u00BA"];
const OPCOES_FUNCAO = [
  "Professor(a) do SRM",
  "Professor(a) do Atendimento Domiciliar",
];

const initialRelatorioForm = {
  bimestre: "1\u00BA",
  dataInicio: "",
  dataFim: "",
  nomeEscola: "",
  municipio: "",
  localizacao: "Urbana",
  alunoNome: "",
  dataNascimento: "",
  serieAno: "",
  turno: "",
  laudo: "Não",
  comprometimento: "",
  pai: "",
  mae: "",
  profissionalAEE: "",
  responsavelPreenchimento: "",
  funcao: [],
  textoRelatorio: "",
};

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function capitalizarPrimeira(frase) {
  const texto = String(frase || "").trim();
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function finalizarPontuacao(frase) {
  const texto = String(frase || "").trim();
  if (!texto) return "";
  return /[.!?]$/.test(texto) ? texto : `${texto}.`;
}

function limparRepeticoesSimples(texto) {
  const padroes = [
    [/(\bque\b\s+){2,}/gi, "que "],
    [/(\bde\b\s+){2,}/gi, "de "],
    [/(\bo aluno\b[\s,]+){2,}/gi, "o aluno "],
    [/\s{2,}/g, " "],
  ];

  let resultado = texto;
  padroes.forEach(([regex, replace]) => {
    resultado = resultado.replace(regex, replace);
  });
  return resultado.trim();
}

function melhorarTextoPedagogicoInterno(textoOriginal) {
  const base = String(textoOriginal || "")
    .replace(/\r/g, "")
    .trim();

  if (!base) return "";

  const blocos = base
    .split(/\n{2,}/)
    .map((bloco) => bloco.trim())
    .filter(Boolean);

  const frases = (blocos.length ? blocos : [base])
    .flatMap((bloco) =>
      bloco
        .split(/(?<=[.!?])\s+/)
        .map((frase) => frase.trim())
        .filter(Boolean)
    )
    .map((frase) => limparRepeticoesSimples(frase))
    .map((frase) => finalizarPontuacao(capitalizarPrimeira(frase)));

  const conectivos = [
    "Além disso, ",
    "Nesse sentido, ",
    "Dessa forma, ",
    "Ademais, ",
    "Por conseguinte, ",
    "No contexto pedagógico, ",
  ];

  const frasesComConectivos = frases.map((frase, index) => {
    if (index === 0) return frase;

    const jaTemConectivo = /^(al[eé]m disso|nesse sentido|dessa forma|ademais|por conseguinte|no contexto pedag[oó]gico)/i.test(
      frase
    );
    if (jaTemConectivo) return frase;

    const conectivo = conectivos[(index - 1) % conectivos.length];
    return `${conectivo}${frase.charAt(0).toLowerCase()}${frase.slice(1)}`;
  });

  const paragrafo1 = frasesComConectivos.slice(0, 2).join(" ");
  const paragrafo2 = frasesComConectivos.slice(2, 5).join(" ");
  const paragrafo3 = frasesComConectivos.slice(5).join(" ");

  return [paragrafo1, paragrafo2, paragrafo3]
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

function formatarData(data) {
  if (!data?.toDate) return "-";
  return data.toDate().toLocaleDateString("pt-BR");
}

function formatarDataFlex(data) {
  if (!data) return "-";
  if (data?.toDate) return data.toDate().toLocaleDateString("pt-BR");
  if (data instanceof Date) return data.toLocaleDateString("pt-BR");
  const parsed = new Date(data);
  if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString("pt-BR");
  return "-";
}

function extrairBimestreNumero(valor) {
  const texto = String(valor || "");
  const match = texto.match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function obterTimestampRelatorio(relatório) {
  const fonte = relatório?.atualizadoEm || relatório?.criadoEm;
  if (!fonte) return 0;
  if (fonte?.toDate) return fonte.toDate().getTime();
  const parsed = new Date(fonte);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function ordenarHistoricoRelatorios(lista) {
  return [...lista].sort((a, b) => {
    const bimestreDiff = extrairBimestreNumero(a.bimestre) - extrairBimestreNumero(b.bimestre);
    if (bimestreDiff !== 0) return bimestreDiff;
    return obterTimestampRelatorio(a) - obterTimestampRelatorio(b);
  });
}

function agruparHabilidadesPorEixo(habilidades = []) {
  const mapa = habilidades.reduce((acc, item) => {
    const eixoOriginal =
      String(item?.titulo || "Eixo não informado").trim() || "Eixo não informado";
    const eixoNormalizado = normalizarTexto(eixoOriginal).replace(/\s+/g, " ");

    if (!acc[eixoNormalizado]) {
      acc[eixoNormalizado] = {
        eixo: eixoOriginal,
        habilidades: [],
      };
    }

    acc[eixoNormalizado].habilidades.push(item);
    return acc;
  }, {});

  return Object.values(mapa).sort((a, b) => a.eixo.localeCompare(b.eixo));
}

function RelatoriosPage() {
  const { currentUser, perfil } = useAuth();
  const [alunos, setAlunos] = useState([]);
  const [alunoIdSelecionado, setAlunoIdSelecionado] = useState("");
  const [metas, setMetas] = useState([]);
  const [relatórios, setRelatórios] = useState([]);
  const [filtroBimestreRelatorio, setFiltroBimestreRelatorio] = useState("");
  const [relatorioEmEdicao, setRelatorioEmEdicao] = useState(null);
  const [formRelatorio, setFormRelatorio] = useState(initialRelatorioForm);
  const [loading, setLoading] = useState(true);
  const [salvandoRelatorio, setSalvandoRelatorio] = useState(false);
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState("");
  const [idsPermitidos, setIdsPermitidos] = useState(undefined);
  const [responsavelPadrao, setResponsavelPadrao] = useState("");
  const pdfRef = useRef(null);
  const [relatorioVisualizado, setRelatorioVisualizado] = useState(null);
  const [relatorioImpressaoId, setRelatorioImpressaoId] = useState("");
  const [mesReferenciaAtendimento, setMesReferenciaAtendimento] = useState(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = `${hoje.getMonth() + 1}`.padStart(2, "0");
    return `${ano}-${mes}`;
  });
  const [gerandoSinteseAtendimento, setGerandoSinteseAtendimento] = useState(false);
  const [gerandoRelatorioAutomatico, setGerandoRelatorioAutomatico] = useState(false);

  const podeLer = podeVisualizarRelatorios(perfil);
  const podeGerenciarRelatorio = podeEditarRelatorios(perfil);
  const somenteVinculados = visualizaSomenteVinculados(perfil);

  const alunoSelecionado = useMemo(
    () => alunos.find((item) => item.id === alunoIdSelecionado) || null,
    [alunos, alunoIdSelecionado]
  );

  const metasPorBimestre = useMemo(() => {
    const grupos = {
      "1\u00BA": [],
      "2\u00BA": [],
      "3\u00BA": [],
      "4\u00BA": [],
    };
    metas.forEach((meta) => {
      const chave = BIMESTRES.includes(meta.bimestre)
        ? meta.bimestre
        : "1\u00BA";
      grupos[chave].push(meta);
    });
    return grupos;
  }, [metas]);

  const metasDoBimestreSelecionado = useMemo(() => {
    const bimestre = formRelatorio.bimestre || "1\u00BA";
    return metas.filter((meta) => {
      const metaBimestre = meta?.bimestre || "1\u00BA";
      return metaBimestre === bimestre;
    });
  }, [metas, formRelatorio.bimestre]);

  const habilidadesPorEixoBimestreSelecionado = useMemo(
    () => agruparHabilidadesPorEixo(metasDoBimestreSelecionado),
    [metasDoBimestreSelecionado]
  );

  const habilidadesAgrupadasPorBimestre = useMemo(() => {
    const mapa = {};
    BIMESTRES.forEach((bimestre) => {
      mapa[bimestre] = agruparHabilidadesPorEixo(metasPorBimestre[bimestre] || []);
    });
    return mapa;
  }, [metasPorBimestre]);

  const historicoRelatorios = useMemo(
    () => ordenarHistoricoRelatorios(relatórios),
    [relatórios]
  );

  const relatorioParaExportacao = useMemo(() => {
    if (relatorioVisualizado) return relatorioVisualizado;

    if (relatorioEmEdicao) {
      return {
        ...relatorioEmEdicao,
        ...formRelatorio,
        alunoNome: alunoSelecionado?.nome || formRelatorio.alunoNome || relatorioEmEdicao.alunoNome,
        atualizadoEm: new Date(),
      };
    }

    if (relatórios.length > 0) return relatórios[0];

    if (formRelatorio.textoRelatorio?.trim()) {
      return {
        ...formRelatorio,
        alunoNome: alunoSelecionado?.nome || formRelatorio.alunoNome || "-",
        atualizadoEm: new Date(),
      };
    }

    return null;
  }, [relatorioVisualizado, relatorioEmEdicao, formRelatorio, alunoSelecionado, relatórios]);

  useEffect(() => {
    async function carregarResponsavelPadrao() {
      if (!currentUser?.uid) {
        setResponsavelPadrao("");
        return;
      }

      try {
        const userData = await buscarDadosUsuarioPorUid(currentUser.uid);
        const nomeOuEmail =
          userData?.nome?.trim() || currentUser.email || userData?.email || "";
        setResponsavelPadrao(nomeOuEmail);
      } catch (error) {
        setResponsavelPadrao(currentUser.email || "");
      }
    }

    carregarResponsavelPadrao();
  }, [currentUser]);

  useEffect(() => {
    async function carregarBase() {
      if (!currentUser || !podeLer) return;

      setLoading(true);
      setErro("");

      try {
        let alunosData = [];
        let ids = undefined;

        if (somenteVinculados) {
          ids = await buscarIdsAlunosVinculados(currentUser.uid);
          alunosData = await listarAlunosPorIds(ids);
        } else {
          alunosData = await listarAlunos();
        }

        setIdsPermitidos(ids);
        setAlunos(alunosData);
        setAlunoIdSelecionado((prev) =>
          prev && alunosData.some((item) => item.id === prev)
            ? prev
            : alunosData[0]?.id || ""
        );
      } catch (error) {
        setErro("Não foi possível carregar alunos para os relatórios.");
      } finally {
        setLoading(false);
      }
    }

    carregarBase();
  }, [currentUser, podeLer, somenteVinculados]);

  useEffect(() => {
    if (!alunoSelecionado) return;
    setFormRelatorio((prev) => ({
      ...prev,
      alunoNome: alunoSelecionado.nome || "",
      dataNascimento: alunoSelecionado.dataNascimento || "",
      serieAno: prev.serieAno || alunoSelecionado.turma || "",
      responsavelPreenchimento:
        !relatorioEmEdicao && !prev.responsavelPreenchimento
          ? responsavelPadrao
          : prev.responsavelPreenchimento,
    }));
  }, [alunoSelecionado, relatorioEmEdicao, responsavelPadrao]);

  useEffect(() => {
    if (!responsavelPadrao || relatorioEmEdicao) return;

    setFormRelatorio((prev) => {
      if (prev.responsavelPreenchimento) return prev;
      return {
        ...prev,
        responsavelPreenchimento: responsavelPadrao,
      };
    });
  }, [responsavelPadrao, relatorioEmEdicao]);

  useEffect(() => {
    async function carregarMetasAluno() {
      if (!currentUser || !podeLer || !alunoIdSelecionado) {
        setMetas([]);
        return;
      }

      try {
        const metasData = await listarMetasPorAlunoId({
          alunoId: alunoIdSelecionado,
          alunoIdsPermitidos: idsPermitidos,
        });
        setMetas(metasData);
      } catch (error) {
        setErro("Não foi possível carregar habilidades do aluno selecionado.");
      }
    }

    carregarMetasAluno();
  }, [currentUser, podeLer, alunoIdSelecionado, idsPermitidos]);

  useEffect(() => {
    async function carregarRelatoriosAluno() {
      if (!currentUser || !podeLer || !alunoIdSelecionado) {
        setRelatórios([]);
        return;
      }

      try {
        const relatóriosData = await listarRelatorios({
          alunoId: alunoIdSelecionado,
          bimestre: filtroBimestreRelatorio || undefined,
          alunoIdsPermitidos: idsPermitidos,
        });
        setRelatórios(relatóriosData);
      } catch (error) {
        setErro("Não foi possível carregar os relatórios pedagógicos.");
      }
    }

    carregarRelatoriosAluno();
  }, [
    currentUser,
    podeLer,
    alunoIdSelecionado,
    idsPermitidos,
    filtroBimestreRelatorio,
  ]);

  const handleChangeRelatorio = (event) => {
    const { name, value } = event.target;
    setFormRelatorio((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleFuncao = (valor) => {
    setFormRelatorio((prev) => {
      const existe = prev.funcao.includes(valor);
      return {
        ...prev,
        funcao: existe
          ? prev.funcao.filter((item) => item !== valor)
          : [...prev.funcao, valor],
      };
    });
  };

  const handleGerarRascunho = () => {
    const textoGerado = montarRascunhoBase({ completo: false });

    setFormRelatorio((prev) => ({
      ...prev,
      textoRelatorio: textoGerado,
    }));
  };

  const montarRascunhoBase = ({ completo = false } = {}) => {
    const nomeAluno = alunoSelecionado?.nome || formRelatorio.alunoNome || "o aluno";
    const bimestre = formRelatorio.bimestre || "1\u00BA";
    const metasBase = metasDoBimestreSelecionado;

    const listarTitulos = (items) =>
      items
        .map((item) => item.descricao)
        .filter(Boolean)
        .join(", ");

    const introducao = `No ${bimestre} bimestre, o acompanhamento pedagógico individual de ${nomeAluno} foi realizado no contexto escolar, considerando os objetivos planejados para seu desenvolvimento global.`;

    const habilidadesPorEixo = agruparHabilidadesPorEixo(metasBase);
    const desenvolvimentoMetas = habilidadesPorEixo
      .map(({ eixo, habilidades }) => {
        const concluidas = habilidades.filter((item) =>
          normalizarTexto(item.status).includes("conclu")
        );
        const emAndamento = habilidades.filter((item) => {
          const status = normalizarTexto(item.status);
          return status.includes("andamento") || status.includes("processo");
        });
        const pausadas = habilidades.filter((item) =>
          normalizarTexto(item.status).includes("paus")
        );

        const trechos = [
          concluidas.length
            ? `No eixo temático de ${eixo}, o aluno apresentou avanços em ${listarTitulos(concluidas)}.`
            : "",
          emAndamento.length
            ? `No eixo temático de ${eixo}, encontra-se em desenvolvimento quanto a ${listarTitulos(emAndamento)}.`
            : "",
          pausadas.length
            ? `No eixo temático de ${eixo}, ainda apresenta dificuldades relacionadas a ${listarTitulos(pausadas)}.`
            : "",
        ]
          .filter(Boolean)
          .join(" ");

        return trechos;
      })
      .filter(Boolean)
      .join("\n\n");

    const desenvolvimentoFinal = desenvolvimentoMetas ||
      "Neste bimestre, ainda não há habilidades registradas por eixo temático para este aluno. Recomenda-se definir objetivos pedagógicos para orientar o acompanhamento.";

    const blocoAprendizagemComportamento = completo
      ? [
          `No que se refere ao comportamento, ${nomeAluno} apresentou participação compatível com as propostas pedagógicas realizadas no período.`,
          `Quanto à participação, observou-se envolvimento progressivo nas atividades, com necessidade de mediação quando pertinente.`,
          `Em relação à aprendizagem, houve consolidação gradual das habilidades trabalhadas, respeitando o ritmo individual e as especificidades do atendimento.`,
        ].join("\n\n")
      : "";

    const conclusao = `Como conclusão, identifica-se evolução geral de ${nomeAluno}, com permanência de pontos que exigem acompanhamento contínuo. Recomenda-se a continuidade dos encaminhamentos pedagógicos, com ajustes metodológicos e articulação entre os profissionais envolvidos.`;

    return [introducao, desenvolvimentoFinal, blocoAprendizagemComportamento, conclusao]
      .filter(Boolean)
      .join("\n\n");
  };

  const handleGerarRelatorioCompleto = () => {
    const rascunhoCompleto = montarRascunhoBase({ completo: true });
    const textoMelhorado = melhorarTextoPedagogicoInterno(rascunhoCompleto);

    setFormRelatorio((prev) => ({
      ...prev,
      textoRelatorio: textoMelhorado,
    }));
  };

  const handleMelhorarTextoPedagogico = () => {
    setFormRelatorio((prev) => ({
      ...prev,
      textoRelatorio: melhorarTextoPedagogicoInterno(prev.textoRelatorio),
    }));
  };

  const handleInserirSinteseAtendimento = async () => {
    if (!alunoIdSelecionado) {
      setErro("Selecione um aluno para gerar a síntese de Atendimento AEE.");
      return;
    }
    if (!mesReferenciaAtendimento) {
      setErro("Selecione o mês de referência do Atendimento AEE.");
      return;
    }

    setGerandoSinteseAtendimento(true);
    setErro("");

    try {
      const resultado = await gerarSinteseMensalAtendimento({
        alunoId: alunoIdSelecionado,
        mesReferencia: mesReferenciaAtendimento,
        alunoIdsPermitidos: idsPermitidos,
      });

      const blocoSintese = `Síntese mensal do Atendimento AEE (${mesReferenciaAtendimento}):\n${resultado.texto}`;
      setFormRelatorio((prev) => {
        const textoAtual = String(prev.textoRelatorio || "").trim();
        return {
          ...prev,
          textoRelatorio: textoAtual ? `${textoAtual}\n\n${blocoSintese}` : blocoSintese,
        };
      });

      setFeedback(`Síntese mensal inserida no texto do relatório (${resultado.totalRegistros} registro(s)).`);
    } catch (error) {
      setErro("Não foi possível gerar a síntese mensal do Atendimento AEE.");
    } finally {
      setGerandoSinteseAtendimento(false);
    }
  };

  const handleGerarRelatorioAutomaticoCompleto = async () => {
    if (!alunoSelecionado?.id) {
      setErro("Selecione um aluno para gerar o relatório automático.");
      return;
    }
    if (
      formRelatorio.dataInicio &&
      formRelatorio.dataFim &&
      new Date(`${formRelatorio.dataInicio}T00:00:00`) >
        new Date(`${formRelatorio.dataFim}T23:59:59`)
    ) {
      setErro("A data inicial não pode ser maior que a data final.");
      return;
    }

    const bimestreAlvo = filtroBimestreRelatorio || formRelatorio.bimestre || "1º";

    setGerandoRelatorioAutomatico(true);
    setErro("");
    setFeedback("");

    try {
      const [sondagensData, monitoramentosData, acompanhamentosData, atendimentosData] =
        await Promise.all([
          listarSondagens({
            alunoId: alunoSelecionado.id,
            alunoIdsPermitidos: idsPermitidos,
          }),
          listarMonitoramentos({
            alunoId: alunoSelecionado.id,
            alunoIdsPermitidos: idsPermitidos,
          }),
          listarAcompanhamentos({ alunoId: alunoSelecionado.id }),
          listarAtendimentosAEE({
            alunoId: alunoSelecionado.id,
            alunoIdsPermitidos: idsPermitidos,
          }),
        ]);

      const { texto, detalhes } = gerarRelatorioMultidisciplinarAutomatico({
        escola: {
          nomeEscola: formRelatorio.nomeEscola,
          municipio: formRelatorio.municipio,
          localizacao: formRelatorio.localizacao,
          serieAno: formRelatorio.serieAno,
          turno: formRelatorio.turno,
          laudo: formRelatorio.laudo,
          pai: formRelatorio.pai,
          mae: formRelatorio.mae,
        },
        aluno: alunoSelecionado,
        periodo: {
          bimestre: bimestreAlvo,
          dataInicio: formRelatorio.dataInicio,
          dataFim: formRelatorio.dataFim,
        },
        sondagens: sondagensData,
        atendimentosAEE: atendimentosData,
        acompanhamentos: acompanhamentosData,
        monitoramentos: monitoramentosData,
      });

      setFormRelatorio((prev) => ({
        ...prev,
        bimestre: bimestreAlvo,
        dataInicio: prev.dataInicio || "",
        dataFim: prev.dataFim || "",
        textoRelatorio: melhorarTextoPedagogicoInterno(texto),
      }));
      setFeedback(
        `Relatório multidisciplinar gerado com sucesso. Fontes no período: sondagem (${detalhes.fontes.sondagens}), atendimento AEE (${detalhes.fontes.atendimentosAEE}), acompanhamento (${detalhes.fontes.acompanhamentos}) e monitoramento (${detalhes.fontes.monitoramentos}).`
      );
    } catch (error) {
      console.error("[RelatoriosPage] Erro ao gerar relatório automático completo", error);
      setErro("Erro ao salvar. Tente novamente");
    } finally {
      setGerandoRelatorioAutomatico(false);
    }
  };

  const handleBaixarPdf = async (relatórioItem = null) => {
    const alvo = relatórioItem || relatorioParaExportacao;

    if (!alvo || !pdfRef.current) {
      setErro("Não há conteúdo de relatório para exportar em PDF.");
      return;
    }

    setErro("");

    if (relatórioItem) {
      setRelatorioVisualizado(relatórioItem);
    }

    const nomeAluno = (alvo.alunoNome || "aluno")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase();
    const bimestre = alvo.bimestre || "relatório";
    const fileName = `relatório-pedagógico-${nomeAluno}-${bimestre}.pdf`;

    const options = {
      margin: [8, 8, 8, 8],
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };

    try {
      await new Promise((resolve) => setTimeout(resolve, 120));
      await html2pdf().set(options).from(pdfRef.current).save();
    } catch (error) {
      setErro("Não foi possível gerar o PDF do relatório.");
    }
  };

  const preencherFormularioComRelatorio = (relatório, { modoEdicao = false } = {}) => {
    if (!relatório) return;

    if (relatório.alunoId) {
      setAlunoIdSelecionado(relatório.alunoId);
    }

    setRelatorioEmEdicao(modoEdicao ? relatório : null);
    setFormRelatorio({
      bimestre: relatório.bimestre || "1\u00BA",
      dataInicio: relatório.dataInicio || "",
      dataFim: relatório.dataFim || "",
      nomeEscola: relatório.nomeEscola || "",
      municipio: relatório.municipio || "",
      localizacao: relatório.localizacao || "Urbana",
      alunoNome: relatório.alunoNome || "",
      dataNascimento: relatório.dataNascimento || "",
      serieAno: relatório.serieAno || "",
      turno: relatório.turno || "",
      laudo: relatório.laudo || "Não",
      comprometimento: relatório.comprometimento || "",
      pai: relatório.pai || "",
      mae: relatório.mae || "",
      profissionalAEE: relatório.profissionalAEE || "",
      responsavelPreenchimento:
        relatório.responsavelPreenchimento || relatório.coordenadorNome || "",
      funcao: Array.isArray(relatório.funcao) ? relatório.funcao : [],
      textoRelatorio: relatório.textoRelatorio || "",
    });
  };

  const separarItensHabilidade = (descricao) => {
    const texto = String(descricao || "").trim();
    if (!texto) return ["Habilidade não informada"];

    const itensPorPontoVirgula = texto
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);
    if (itensPorPontoVirgula.length > 1) return itensPorPontoVirgula;

    const itensPorNumeracao = texto
      .split(/(?:^|\s)\d+\.\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (itensPorNumeracao.length > 1) return itensPorNumeracao;

    const itensPorLinha = texto
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (itensPorLinha.length > 1) return itensPorLinha;

    return [texto];
  };

  const limparItemLista = (item) => {
    const texto = String(item || "").trim();
    if (!texto) return "";
    if (/^[\d.\-–—()\s]+$/.test(texto)) return "";
    return texto.replace(/\s+/g, " ").trim();
  };

  const separarEixosTematicos = (eixoTexto) => {
    const texto = String(eixoTexto || "").replace(/\s+/g, " ").trim();
    if (!texto) return ["Eixo não informado"];

    const partesNumeradas = texto
      .split(/(?:^|\s)\d+\s*[\.\-–—)]\s*/g)
      .map((item) => item.trim())
      .filter(Boolean);

    if (partesNumeradas.length > 1) {
      return partesNumeradas;
    }

    const partesNumeradasSemPontuacao = texto
      .split(/(?:^|\s)\d+\s+/g)
      .map((item) => item.trim())
      .filter(Boolean);

    if (partesNumeradasSemPontuacao.length > 1) {
      return partesNumeradasSemPontuacao;
    }

    return [texto];
  };

  const renderizarBlocosPorEixo = (grupos = [], prefixo = "eixo") =>
    grupos.flatMap((grupo, grupoIndex) => {
      const eixosSeparados = separarEixosTematicos(grupo.eixo);
      const habilidadesNormalizadas = grupo.habilidades
        .flatMap((habilidade, habilidadeIndex) =>
          separarItensHabilidade(habilidade.descricao).map((itemTexto, itemIndex) => ({
            texto: limparItemLista(itemTexto),
            status: habilidade.status || "-",
            chave: `${prefixo}-${grupo.eixo}-${habilidade.id || habilidadeIndex}-${itemIndex}`,
          }))
        )
        .filter((item) => Boolean(item.texto));

      return eixosSeparados.map((eixoSeparado, eixoIndex) => {
        let itensDoEixo = habilidadesNormalizadas;

        if (
          eixosSeparados.length > 1 &&
          habilidadesNormalizadas.length >= eixosSeparados.length
        ) {
          const itemRelacionado = habilidadesNormalizadas[eixoIndex];
          itensDoEixo = itemRelacionado ? [itemRelacionado] : [];
        }

        return (
          <section
            key={`${prefixo}-${grupoIndex}-${eixoIndex}-${eixoSeparado}`}
            className="eixo-bloco"
          >
            <p className="eixo-titulo">
              <strong>Eixo temático:</strong> {eixoSeparado}
            </p>
            <p className="habilidades-titulo">
              <strong>Habilidades:</strong>
            </p>
            {itensDoEixo.length === 0 ? (
              <p className="muted">Nenhuma habilidade informada.</p>
            ) : (
              <ul className="habilidades-lista">
                {itensDoEixo.map((item) => (
                  <li key={item.chave}>
                    <span>{item.texto}</span>
                    <small className="muted"> Status: {item.status}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      });
    });

  const handleVisualizarRelatorio = (relatório) => {
    preencherFormularioComRelatorio(relatório, { modoEdicao: false });
    setRelatorioVisualizado(relatório);
  };

  const handleImprimirRelatorio = (relatório) => {
    setRelatorioVisualizado(relatório);
    setRelatorioImpressaoId(relatório.id);
    setTimeout(() => {
      window.print();
      setTimeout(() => setRelatorioImpressaoId(""), 200);
    }, 100);
  };

  const limparFormRelatorio = () => {
    setRelatorioEmEdicao(null);
    setFormRelatorio({
      ...initialRelatorioForm,
      alunoNome: alunoSelecionado?.nome || "",
      dataNascimento: alunoSelecionado?.dataNascimento || "",
      serieAno: alunoSelecionado?.turma || "",
      responsavelPreenchimento: responsavelPadrao,
    });
  };

  const recarregarRelatorios = async () => {
    if (!alunoIdSelecionado) return;
    const relatóriosData = await listarRelatorios({
      alunoId: alunoIdSelecionado,
      bimestre: filtroBimestreRelatorio || undefined,
      alunoIdsPermitidos: idsPermitidos,
    });
    setRelatórios(relatóriosData);
  };

  const handleSalvarRelatorio = async (event) => {
    event.preventDefault();
    if (!podeGerenciarRelatorio || !currentUser || !alunoSelecionado) return;

    setSalvandoRelatorio(true);
    setErro("");
    setFeedback("");

    const payload = {
      alunoId: alunoSelecionado.id,
      alunoNome: alunoSelecionado.nome || "",
      bimestre: formRelatorio.bimestre,
      dataInicio: formRelatorio.dataInicio || "",
      dataFim: formRelatorio.dataFim || "",
      nomeEscola: formRelatorio.nomeEscola.trim(),
      municipio: formRelatorio.municipio.trim(),
      localizacao: formRelatorio.localizacao,
      dataNascimento: formRelatorio.dataNascimento,
      serieAno: formRelatorio.serieAno.trim(),
      turno: formRelatorio.turno.trim(),
      laudo: formRelatorio.laudo,
      comprometimento: formRelatorio.comprometimento.trim(),
      pai: formRelatorio.pai.trim(),
      mae: formRelatorio.mae.trim(),
      profissionalAEE: formRelatorio.profissionalAEE.trim(),
      responsavelPreenchimento: formRelatorio.responsavelPreenchimento.trim(),
      funcao: formRelatorio.funcao,
      textoRelatorio: formRelatorio.textoRelatorio.trim(),
    };

    try {
      if (relatorioEmEdicao) {
        await atualizarRelatorio(relatorioEmEdicao.id, payload);
        setFeedback("Relatório atualizado com sucesso.");
      } else {
        await criarRelatorio(payload, currentUser.uid);
        setFeedback("Relatório salvo com sucesso.");
      }

      limparFormRelatorio();
      await recarregarRelatorios();
    } catch (error) {
      setErro("Não foi possível salvar o relatório.");
    } finally {
      setSalvandoRelatorio(false);
    }
  };

  const handleEditarRelatorio = (relatório) => {
    if (!podeGerenciarRelatorio) return;
    preencherFormularioComRelatorio(relatório, { modoEdicao: true });
    setRelatorioVisualizado(relatório);
  };

  const handleExcluirRelatorio = async (relatório) => {
    if (!podeGerenciarRelatorio) return;
    const confirma = window.confirm("Deseja realmente excluir este relatório?");
    if (!confirma) return;

    try {
      await excluirRelatorio(relatório.id);
      if (relatorioEmEdicao?.id === relatório.id) {
        limparFormRelatorio();
      }
      setFeedback("Relatório excluído com sucesso.");
      await recarregarRelatorios();
    } catch (error) {
      setErro("Não foi possível excluir o relatório.");
    }
  };

  if (!podeLer) {
    return (
      <main className="alunos-page">
        <section className="panel">
          <h1>RELATÓRIO MULTIDISCIPLINAR AUTOMÁTICO DO ALUNO</h1>
          <p>Seu perfil não possui permissão para visualizar relatórios.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="alunos-page">
      <header className="page-header">
        <h1>RELATÓRIO MULTIDISCIPLINAR AUTOMÁTICO DO ALUNO</h1>
        <p>Geração automática integrada com dados de AEE, mediadores, assistente educacional e professores regentes.</p>
        <p className="muted">
          Orientação: Este relatório deve ser elaborado pelo(a) professor(a) do AEE ou pelo(a)
          professor(a) do Atendimento Domiciliar, com base nas informações coletadas ao longo do
          acompanhamento do aluno. Tem como objetivo subsidiar o planejamento pedagógico, orientando
          os professores regentes e a coordenação pedagógica na definição de intervenções que
          favoreçam o desenvolvimento, a aprendizagem, a autonomia e a participação dos alunos com
          deficiência.
        </p>
      </header>

      {feedback ? <p className="toast-success">{feedback}</p> : null}
      {erro ? <p className="toast-error">{erro}</p> : null}

      <section className="panel no-print">
        <h2>Filtros</h2>
        <div className="filters-grid">
          <div>
            <label htmlFor="relatorioAlunoId">Aluno</label>
            <select
              id="relatorioAlunoId"
              value={alunoIdSelecionado}
              onChange={(event) => setAlunoIdSelecionado(event.target.value)}
            >
              {alunos.map((aluno) => (
                <option key={aluno.id} value={aluno.id}>
                  {aluno.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtroBimestreRelatorio">Bimestre</label>
            <select
              id="filtroBimestreRelatorio"
              value={filtroBimestreRelatorio}
              onChange={(event) => setFiltroBimestreRelatorio(event.target.value)}
            >
              <option value="">Todos</option>
              {BIMESTRES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" onClick={() => window.print()}>
            Imprimir
          </button>
          <button type="button" onClick={handleBaixarPdf}>
            Baixar PDF
          </button>
        </div>
      </section>

      <section className="panel print-relatorio">
        <h2 className="print-title">RELATÓRIO MULTIDISCIPLINAR AUTOMÁTICO DO ALUNO</h2>

        {podeGerenciarRelatorio ? (
          <form className="aluno-form no-print" onSubmit={handleSalvarRelatorio}>
            <h3>Dados de Identificação</h3>
            <label htmlFor="nomeEscola">Nome da escola</label>
            <input
              id="nomeEscola"
              name="nomeEscola"
              value={formRelatorio.nomeEscola}
              onChange={handleChangeRelatorio}
              required
            />

            <label htmlFor="municipio">Município</label>
            <input
              id="municipio"
              name="municipio"
              value={formRelatorio.municipio}
              onChange={handleChangeRelatorio}
              required
            />

            <label htmlFor="localizacao">Localização</label>
            <select
              id="localizacao"
              name="localizacao"
              value={formRelatorio.localizacao}
              onChange={handleChangeRelatorio}
            >
              <option value="Urbana">Urbana</option>
              <option value="Campo">Campo</option>
            </select>

            <label htmlFor="bimestreRelatorio">Bimestre</label>
            <select
              id="bimestreRelatorio"
              name="bimestre"
              value={formRelatorio.bimestre}
              onChange={handleChangeRelatorio}
            >
              {BIMESTRES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <div className="acompanhamento-inline-grid">
              <div>
                <label htmlFor="dataInicioRelatorio">Data inicial (opcional)</label>
                <input
                  id="dataInicioRelatorio"
                  name="dataInicio"
                  type="date"
                  value={formRelatorio.dataInicio || ""}
                  onChange={handleChangeRelatorio}
                />
              </div>
              <div>
                <label htmlFor="dataFimRelatorio">Data final (opcional)</label>
                <input
                  id="dataFimRelatorio"
                  name="dataFim"
                  type="date"
                  value={formRelatorio.dataFim || ""}
                  onChange={handleChangeRelatorio}
                />
              </div>
            </div>

            <label htmlFor="alunoNome">Aluno</label>
            <input
              id="alunoNome"
              name="alunoNome"
              value={alunoSelecionado?.nome || ""}
              readOnly
            />

            <label htmlFor="dataNascimentoRelatorio">Data de nascimento</label>
            <input
              id="dataNascimentoRelatorio"
              name="dataNascimento"
              type="date"
              value={formRelatorio.dataNascimento}
              onChange={handleChangeRelatorio}
            />

            <label htmlFor="serieAno">Série/Ano</label>
            <input
              id="serieAno"
              name="serieAno"
              value={formRelatorio.serieAno}
              onChange={handleChangeRelatorio}
            />

            <label htmlFor="turno">Turno</label>
            <input
              id="turno"
              name="turno"
              value={formRelatorio.turno}
              onChange={handleChangeRelatorio}
            />

            <label htmlFor="laudo">Laudo</label>
            <select
              id="laudo"
              name="laudo"
              value={formRelatorio.laudo}
              onChange={handleChangeRelatorio}
            >
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>

            <label htmlFor="comprometimento">Comprometimento</label>
            <input
              id="comprometimento"
              name="comprometimento"
              value={formRelatorio.comprometimento}
              onChange={handleChangeRelatorio}
            />

            <label htmlFor="pai">Pai</label>
            <input
              id="pai"
              name="pai"
              value={formRelatorio.pai}
              onChange={handleChangeRelatorio}
            />

            <label htmlFor="mae">Mãe</label>
            <input
              id="mae"
              name="mae"
              value={formRelatorio.mae}
              onChange={handleChangeRelatorio}
            />

            <label htmlFor="profissionalAEE">Professor(a) responsável pelo relatório</label>
            <input
              id="profissionalAEE"
              name="profissionalAEE"
              value={formRelatorio.profissionalAEE}
              onChange={handleChangeRelatorio}
            />

            <div>
              <span className="checkbox-title">Função</span>
              <div className="checkbox-group">
                {OPCOES_FUNCAO.map((item) => (
                  <label key={item} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formRelatorio.funcao.includes(item)}
                      onChange={() => handleToggleFuncao(item)}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <label htmlFor="responsavelPreenchimento">
              Responsável pelo preenchimento do relatório
            </label>
            <input
              id="responsavelPreenchimento"
              name="responsavelPreenchimento"
              value={formRelatorio.responsavelPreenchimento}
              onChange={handleChangeRelatorio}
            />

            <label htmlFor="textoRelatorio">Texto do relatório</label>
            <textarea
              id="textoRelatorio"
              name="textoRelatorio"
              rows={10}
              value={formRelatorio.textoRelatorio}
              onChange={handleChangeRelatorio}
              required
            />

            <section className="form-section">
              <h3>Integração Atendimento AEE (mensal)</h3>
              <div className="acompanhamento-inline-grid">
                <div>
                  <label htmlFor="mesReferenciaAtendimento">Mês de referência</label>
                  <input
                    id="mesReferenciaAtendimento"
                    type="month"
                    value={mesReferenciaAtendimento}
                    onChange={(event) => setMesReferenciaAtendimento(event.target.value)}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleInserirSinteseAtendimento}
                  disabled={gerandoSinteseAtendimento}
                >
                  {gerandoSinteseAtendimento
                    ? "Gerando síntese..."
                    : "Inserir síntese mensal do Atendimento AEE"}
                </button>
              </div>
            </section>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleGerarRelatorioAutomaticoCompleto}
                disabled={gerandoRelatorioAutomatico}
              >
                {gerandoRelatorioAutomatico
                  ? "Gerando relatório multidisciplinar..."
                  : "Gerar relatório multidisciplinar"}
              </button>
              <button type="button" className="btn-secondary" onClick={handleGerarRascunho}>
                Gerar rascunho
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleGerarRelatorioCompleto}
              >
                Gerar relatório completo
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleMelhorarTextoPedagogico}
              >
                Melhorar texto
              </button>
              <button type="submit" disabled={salvandoRelatorio}>
                {salvandoRelatorio
                  ? "Salvando..."
                  : relatorioEmEdicao
                    ? "Atualizar relatório"
                    : "Salvar relatório"}
              </button>
              {relatorioEmEdicao ? (
                <button type="button" className="btn-secondary" onClick={limparFormRelatorio}>
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        ) : (
          <p className="no-print">
            Seu perfil possui acesso de leitura para relatórios pedagógicos.
          </p>
        )}

        {relatorioVisualizado ? (
          <section className="panel no-print">
            <h3>Visualização do relatório selecionado</h3>
            <p>
              <strong>Aluno:</strong> {relatorioVisualizado.alunoNome || "-"}
            </p>
            <p>
              <strong>Bimestre:</strong> {relatorioVisualizado.bimestre || "-"}
            </p>
            <p>
              <strong>Período analisado:</strong>{" "}
              {relatorioVisualizado.dataInicio || relatorioVisualizado.dataFim
                ? `${relatorioVisualizado.dataInicio || "-"} até ${relatorioVisualizado.dataFim || "-"}`
                : relatorioVisualizado.bimestre || "-"}
            </p>
            <div>
              <strong>Habilidades do aluno por eixo temático:</strong>
              {(habilidadesAgrupadasPorBimestre[relatorioVisualizado.bimestre] || []).length === 0 ? (
                <p className="muted">Não há habilidades registradas para este bimestre.</p>
              ) : (
                <div className="eixos-lista">
                  {renderizarBlocosPorEixo(
                    habilidadesAgrupadasPorBimestre[relatorioVisualizado.bimestre] || [],
                    `view-${relatorioVisualizado.id || "atual"}`
                  )}
                </div>
              )}
            </div>
            <p className="report-text">{relatorioVisualizado.textoRelatorio || "-"}</p>
          </section>
        ) : null}

        <section className="panel report-list no-print">
          <h3>Histórico do aluno</h3>
          {historicoRelatorios.length === 0 ? <p>Nenhum relatório cadastrado.</p> : null}
          {historicoRelatorios.map((relatório) => {
            const gruposHistorico = habilidadesAgrupadasPorBimestre[relatório.bimestre] || [];
            return (
            <article key={relatório.id} className="meta-card">
              <p>
                <strong>Aluno:</strong> {relatório.alunoNome || "-"}
              </p>
              <p>
                <strong>Bimestre:</strong> {relatório.bimestre || "-"}
              </p>
              <p>
                <strong>Período analisado:</strong>{" "}
                {relatório.dataInicio || relatório.dataFim
                  ? `${relatório.dataInicio || "-"} até ${relatório.dataFim || "-"}`
                  : relatório.bimestre || "-"}
              </p>
              <p>
                <strong>Data:</strong>{" "}
                {formatarDataFlex(relatório.atualizadoEm || relatório.criadoEm)}
              </p>
              <p>
                <strong>Trecho inicial:</strong>{" "}
                {(relatório.textoRelatorio || "").slice(0, 140)}
                {(relatório.textoRelatorio || "").length > 140 ? "..." : ""}
              </p>
              <div>
                <strong>Habilidades por eixo temático:</strong>
                {gruposHistorico.length === 0 ? (
                  <p className="muted">Não há habilidades registradas para este bimestre.</p>
                ) : (
                  <div className="eixos-lista">
                    {renderizarBlocosPorEixo(gruposHistorico, `hist-${relatório.id}`)}
                  </div>
                )}
              </div>
              <p>
                <strong>Professor(a) responsável pelo relatório:</strong> {relatório.profissionalAEE || "-"}
              </p>
              <p>
                <strong>Responsável preenchimento:</strong>{" "}
                {relatório.responsavelPreenchimento || relatório.coordenadorNome || "-"}
              </p>
              <p>
                <strong>Criado em:</strong> {formatarData(relatório.criadoEm)}
              </p>

                {podeGerenciarRelatorio ? (
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleVisualizarRelatorio(relatório)}
                    >
                      Visualizar
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleEditarRelatorio(relatório)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleImprimirRelatorio(relatório)}
                    >
                      Imprimir
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleBaixarPdf(relatório)}
                    >
                      Baixar PDF
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleExcluirRelatorio(relatório)}
                    >
                      Excluir
                    </button>
                  </div>
                ) : (
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleVisualizarRelatorio(relatório)}
                    >
                      Visualizar
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleImprimirRelatorio(relatório)}
                    >
                      Imprimir
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleBaixarPdf(relatório)}
                    >
                      Baixar PDF
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </section>

          {relatórios
            .filter((relatorio) =>
              relatorioImpressaoId ? relatorio.id === relatorioImpressaoId : true
            )
            .map((relatorio) => (
            <article key={`${relatorio.id}-print`} className="print-report-card">
            <h3>1. DADOS DE IDENTIFICAÇÃO</h3>
            <section className="report-identification">
            <p>
              <strong>Escola:</strong> {relatorio.nomeEscola || "-"}
            </p>
            <p>
              <strong>Município:</strong> {relatorio.municipio || "-"}
            </p>
            <p>
              <strong>Localização:</strong> {relatorio.localizacao || "-"}
            </p>
            <p>
              <strong>Aluno:</strong> {relatorio.alunoNome || "-"}
            </p>
            <p>
              <strong>Data de nascimento:</strong> {relatorio.dataNascimento || "-"}
            </p>
            <p>
              <strong>Série/Ano:</strong> {relatorio.serieAno || "-"}
            </p>
            <p>
              <strong>Turno:</strong> {relatorio.turno || "-"}
            </p>
            <p>
              <strong>Laudo:</strong> {relatorio.laudo || "-"}
            </p>
            <p>
              <strong>Comprometimento:</strong> {relatorio.comprometimento || "-"}
            </p>
            <p>
              <strong>Pai:</strong> {relatorio.pai || "-"}
            </p>
            <p>
              <strong>Mãe:</strong> {relatorio.mae || "-"}
            </p>
            <p>
              <strong>Professor(a) responsável pelo relatório:</strong> {relatorio.profissionalAEE || "-"}
            </p>
            <p>
              <strong>Função:</strong>{" "}
              {Array.isArray(relatorio.funcao) ? relatorio.funcao.join(", ") : "-"}
            </p>
            <p>
              <strong>Bimestre:</strong> {relatorio.bimestre || "-"}
            </p>
            <p>
              <strong>Período analisado:</strong>{" "}
              {relatorio.dataInicio || relatorio.dataFim
                ? `${relatorio.dataInicio || "-"} até ${relatorio.dataFim || "-"}`
                : relatorio.bimestre || "-"}
            </p>
            </section>

            <h3>2. TEXTO DESCRITIVO</h3>
            <p className="report-text">{relatorio.textoRelatorio || "-"}</p>

            <div className="print-signature">
              <p>
                {relatorio.municipio || "Cidade"}, {formatarData(relatorio.atualizadoEm)}
              </p>
            <p>{relatorio.profissionalAEE || "Professor(a) responsável pelo relatório"}</p>
              <p>
                {relatorio.responsavelPreenchimento ||
                  relatorio.coordenadorNome ||
                  "Responsável pelo preenchimento do relatório"}
              </p>
            </div>
          </article>
            ))}
      </section>

      <section className="panel no-print">
        <h2>Relatório de habilidades por bimestre</h2>
        {loading ? <p>Carregando habilidades...</p> : null}

        {!loading &&
          BIMESTRES.map((bimestre) => (
            <div key={bimestre} className="bimestre-group">
              <h3>{bimestre} Bimestre</h3>
              {(habilidadesAgrupadasPorBimestre[bimestre] || []).length === 0 ? (
                <p className="muted">Nenhuma habilidade neste bimestre.</p>
              ) : (
                (habilidadesAgrupadasPorBimestre[bimestre] || []).map((grupo) => (
                  <article key={`${bimestre}-${grupo.eixo}`} className="meta-card">
                    <p>
                      <strong>Nome do aluno:</strong>{" "}
                      {alunoSelecionado?.nome || "-"}
                    </p>
                    <div className="eixos-lista">
                      {renderizarBlocosPorEixo([grupo], `bimestre-${bimestre}`)}
                    </div>
                  </article>
                ))
              )}
            </div>
          ))}
      </section>

      <section className="pdf-export-area" aria-hidden="true">
        <article ref={pdfRef} className="pdf-export-content">
          <h2 className="print-title">RELATÓRIO MULTIDISCIPLINAR AUTOMÁTICO DO ALUNO</h2>

          <h3>1. DADOS DE IDENTIFICAÇÃO</h3>
          <section className="report-identification">
          <p>
            <strong>Escola:</strong> {relatorioParaExportacao?.nomeEscola || "-"}
          </p>
          <p>
            <strong>Município:</strong> {relatorioParaExportacao?.municipio || "-"}
          </p>
          <p>
            <strong>Localização:</strong> {relatorioParaExportacao?.localizacao || "-"}
          </p>
          <p>
            <strong>Aluno:</strong> {relatorioParaExportacao?.alunoNome || "-"}
          </p>
          <p>
            <strong>Data de nascimento:</strong> {relatorioParaExportacao?.dataNascimento || "-"}
          </p>
          <p>
            <strong>Série/Ano:</strong> {relatorioParaExportacao?.serieAno || "-"}
          </p>
          <p>
            <strong>Turno:</strong> {relatorioParaExportacao?.turno || "-"}
          </p>
          <p>
            <strong>Laudo:</strong> {relatorioParaExportacao?.laudo || "-"}
          </p>
          <p>
            <strong>Comprometimento:</strong> {relatorioParaExportacao?.comprometimento || "-"}
          </p>
          <p>
            <strong>Pai:</strong> {relatorioParaExportacao?.pai || "-"}
          </p>
          <p>
            <strong>Mãe:</strong> {relatorioParaExportacao?.mae || "-"}
          </p>
          <p>
            <strong>Professor(a) responsável pelo relatório:</strong> {relatorioParaExportacao?.profissionalAEE || "-"}
          </p>
          <p>
            <strong>Função:</strong>{" "}
            {Array.isArray(relatorioParaExportacao?.funcao)
              ? relatorioParaExportacao.funcao.join(", ")
              : "-"}
          </p>
          <p>
            <strong>Bimestre:</strong> {relatorioParaExportacao?.bimestre || "-"}
          </p>
          <p>
            <strong>Período analisado:</strong>{" "}
            {relatorioParaExportacao?.dataInicio || relatorioParaExportacao?.dataFim
              ? `${relatorioParaExportacao?.dataInicio || "-"} até ${relatorioParaExportacao?.dataFim || "-"}`
              : relatorioParaExportacao?.bimestre || "-"}
          </p>
          </section>

          <h3>2. TEXTO DESCRITIVO</h3>
          <p className="report-text">{relatorioParaExportacao?.textoRelatorio || "-"}</p>

          <div className="print-signature">
            <p>
              {relatorioParaExportacao?.municipio || "Cidade"},{" "}
              {formatarDataFlex(relatorioParaExportacao?.atualizadoEm)}
            </p>
            <p>{relatorioParaExportacao?.profissionalAEE || "Professor(a) responsável pelo relatório"}</p>
            <p>
              {relatorioParaExportacao?.responsavelPreenchimento ||
                "Responsável pelo preenchimento do relatório"}
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}

export default RelatoriosPage;





