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
  "Mediador",
  "Assistente Educacional",
  "Intérprete",
  "Professor(a) da SRM",
  "Professor(a) do AEE",
  "Professor(a) do Atendimento Domiciliar",
  "Outro",
];
const OPCOES_LOCALIZACAO = ["Urbana", "Rural", "Campo"];
const OPCOES_LAUDO = ["Sim", "Não"];
const OPCOES_SITUACAO_OBJETIVOS = [
  "Plenamente alcançados",
  "Parcialmente alcançados",
  "Ainda não alcançados",
  "Em desenvolvimento",
  "Não se aplica",
];
const OPCOES_TIPO_ACOMPANHAMENTO = [
  "Sem mediação",
  "Com mediador",
  "Com assistente educacional",
  "Atendimento domiciliar",
];

const initialRelatorioForm = {
  bimestre: "1\u00BA",
  dataInicio: "",
  dataFim: "",
  nomeEscola: "",
  municipio: "",
  localizacao: "",
  alunoNome: "",
  dataNascimento: "",
  serieAno: "",
  turma: "",
  turno: "",
  diagnostico: "",
  laudo: "",
  comprometimento: "",
  pai: "",
  mae: "",
  profissionalAEE: "",
  tipoAcompanhamento: "",
  profissionalAcompanhamentoNome: "",
  responsavelPreenchimento: "",
  funcao: [],
  introducao: "",
  interacaoComunicacao: "",
  habilidadesMotoras: "",
  habilidadesCognitivas: "",
  autonomiaIndependencia: "",
  outrasInformacoes: "",
  conclusaoParecer: "",
  situacaoObjetivos: "",
  localAssinatura: "",
  dataAssinatura: "",
  assinaturaProfissional: "",
  cargoFuncao: "",
  assinaturaGestao: "",
  textoRelatorio: "",
};

function normalizarTipoAcompanhamento(valor) {
  const texto = normalizarTexto(valor);
  if (!texto) return "";
  if (texto === "sem mediacao" || texto === "sem mediador") return "Sem mediação";
  if (texto === "com mediador") return "Com mediador";
  if (texto === "com assistente educacional") return "Com assistente educacional";
  if (texto === "atendimento domiciliar") return "Atendimento domiciliar";
  return String(valor || "").trim();
}

function obterDadosCadastroAlunoParaRelatorio(aluno) {
  if (!aluno) {
    return {
      nomeEscola: "",
      municipio: "",
      localizacao: "",
      alunoNome: "",
      dataNascimento: "",
      serieAno: "",
      turma: "",
      turno: "",
      diagnostico: "",
      laudo: "",
      comprometimento: "",
      profissionalAEE: "",
      tipoAcompanhamento: "",
      profissionalAcompanhamentoNome: "",
    };
  }

  return {
    nomeEscola: aluno.nomeEscola || "",
    municipio: aluno.municipio || "",
    localizacao: aluno.localizacao || "",
    alunoNome: aluno.nome || "",
    dataNascimento: aluno.dataNascimento || "",
    serieAno: aluno.serieAno || "",
    turma: aluno.turma || "",
    turno: aluno.turno || "",
    diagnostico: aluno.diagnostico || "",
    laudo: aluno.laudo || "",
    comprometimento:
      aluno.comprometimento ||
      aluno.condicaoInformada ||
      aluno.condicao ||
      aluno.diagnostico ||
      "",
    profissionalAEE: aluno.professorAee || "",
    tipoAcompanhamento: normalizarTipoAcompanhamento(aluno.tipoAcompanhamento),
    profissionalAcompanhamentoNome:
      aluno.profissionalAcompanhamentoNome ||
      (Array.isArray(aluno.responsaveis) ? aluno.responsaveis.join(", ") : ""),
  };
}

function preencherCamposVazios(prev, dados) {
  let alterou = false;
  const next = { ...prev };

  Object.entries(dados).forEach(([campo, valor]) => {
    if (String(prev[campo] || "").trim()) return;
    const novoValor = valor || "";
    if ((prev[campo] || "") !== novoValor) {
      next[campo] = novoValor;
      alterou = true;
    }
  });

  return alterou ? next : prev;
}

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

function textoOuNaoInformado(valor) {
  const texto = String(valor || "").trim();
  return texto || "Não informado.";
}

function formatarDataCampo(valor) {
  const texto = String(valor || "").trim();
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes) return textoOuNaoInformado(texto);
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

function formatarFuncoesRelatorio(valor) {
  if (Array.isArray(valor)) return valor.filter(Boolean).join(", ") || "Não informado.";
  return textoOuNaoInformado(valor);
}

function possuiConteudoPedagogico(relatorio) {
  return [
    relatorio?.introducao,
    relatorio?.interacaoComunicacao,
    relatorio?.habilidadesMotoras,
    relatorio?.habilidadesCognitivas,
    relatorio?.autonomiaIndependencia,
    relatorio?.outrasInformacoes,
    relatorio?.conclusaoParecer,
    relatorio?.textoRelatorio,
  ].some((valor) => String(valor || "").trim());
}

function DocumentoRelatorioPedagogico({ relatorio = {} }) {
  const textoLegado = String(relatorio.textoRelatorio || "").trim();
  const introducao = relatorio.introducao || textoLegado;
  const outrasInformacoes =
    relatorio.outrasInformacoes || (relatorio.introducao ? textoLegado : "");
  const dataDocumento = relatorio.dataAssinatura
    ? formatarDataCampo(relatorio.dataAssinatura)
    : formatarDataFlex(relatorio.atualizadoEm || relatorio.criadoEm);

  return (
    <div className="relatorio-documento-estrutura">
      <section className="relatorio-documento-bloco">
        <h3>1. DADOS DE IDENTIFICAÇÃO</h3>
        <div className="report-identification relatorio-documento-grid">
          <p><strong>Nome da escola:</strong> {textoOuNaoInformado(relatorio.nomeEscola)}</p>
          <p><strong>Município:</strong> {textoOuNaoInformado(relatorio.municipio)}</p>
          <p><strong>Localização:</strong> {textoOuNaoInformado(relatorio.localizacao)}</p>
          <p><strong>Aluno:</strong> {textoOuNaoInformado(relatorio.alunoNome)}</p>
          <p><strong>Data de nascimento:</strong> {formatarDataCampo(relatorio.dataNascimento)}</p>
          <p><strong>Série/Ano:</strong> {textoOuNaoInformado(relatorio.serieAno)}</p>
          <p><strong>Turno:</strong> {textoOuNaoInformado(relatorio.turno)}</p>
          <p><strong>Laudo:</strong> {textoOuNaoInformado(relatorio.laudo)}</p>
          <p className="relatorio-documento-campo-largo">
            <strong>Comprometimento/condição informada:</strong>{" "}
            {textoOuNaoInformado(relatorio.comprometimento || relatorio.diagnostico)}
          </p>
          <p><strong>Pai:</strong> {textoOuNaoInformado(relatorio.pai)}</p>
          <p><strong>Mãe:</strong> {textoOuNaoInformado(relatorio.mae)}</p>
          <p>
            <strong>Profissional da Educação Especial:</strong>{" "}
            {textoOuNaoInformado(
              relatorio.profissionalAEE || relatorio.profissionalAcompanhamentoNome
            )}
          </p>
          <p>
            <strong>Função do profissional:</strong>{" "}
            {formatarFuncoesRelatorio(relatorio.funcao)}
          </p>
          <p><strong>Bimestre:</strong> {textoOuNaoInformado(relatorio.bimestre)}</p>
          <p>
            <strong>Período analisado:</strong>{" "}
            {relatorio.dataInicio || relatorio.dataFim
              ? `${relatorio.dataInicio || "-"} até ${relatorio.dataFim || "-"}`
              : textoOuNaoInformado(relatorio.bimestre)}
          </p>
        </div>
      </section>

      <section className="relatorio-documento-bloco">
        <h3>2. INTRODUÇÃO — CONTEXTUALIZAÇÃO DO ALUNO</h3>
        <p className="report-text">{textoOuNaoInformado(introducao)}</p>
      </section>

      <section className="relatorio-documento-bloco">
        <h3>3. DESENVOLVIMENTO — HABILIDADES E PROGRESSOS</h3>
        <div className="relatorio-documento-subbloco">
          <h4>3.1 Interação social, comportamento e comunicação</h4>
          <p className="report-text">{textoOuNaoInformado(relatorio.interacaoComunicacao)}</p>
        </div>
        <div className="relatorio-documento-subbloco">
          <h4>3.2 Habilidades motoras</h4>
          <p className="report-text">{textoOuNaoInformado(relatorio.habilidadesMotoras)}</p>
        </div>
        <div className="relatorio-documento-subbloco">
          <h4>3.3 Habilidades cognitivas</h4>
          <p className="report-text">{textoOuNaoInformado(relatorio.habilidadesCognitivas)}</p>
        </div>
        <div className="relatorio-documento-subbloco">
          <h4>3.4 Autonomia e independência</h4>
          <p className="report-text">{textoOuNaoInformado(relatorio.autonomiaIndependencia)}</p>
        </div>
        <div className="relatorio-documento-subbloco">
          <h4>3.5 Outras informações relevantes observadas</h4>
          <p className="report-text">{textoOuNaoInformado(outrasInformacoes)}</p>
        </div>
      </section>

      <section className="relatorio-documento-bloco">
        <h3>4. CONCLUSÃO — PARECER FINAL</h3>
        <p>
          <strong>Situação dos objetivos:</strong>{" "}
          {textoOuNaoInformado(relatorio.situacaoObjetivos)}
        </p>
        <p className="report-text">{textoOuNaoInformado(relatorio.conclusaoParecer)}</p>
      </section>

      <section className="relatorio-documento-bloco">
        <h3>5. LOCAL, DATA E ASSINATURAS</h3>
        <div className="report-identification relatorio-documento-grid">
          <p>
            <strong>Local:</strong>{" "}
            {textoOuNaoInformado(relatorio.localAssinatura || relatorio.municipio)}
          </p>
          <p><strong>Data:</strong> {dataDocumento}</p>
          <p>
            <strong>Assinatura do profissional:</strong>{" "}
            {textoOuNaoInformado(
              relatorio.assinaturaProfissional || relatorio.responsavelPreenchimento
            )}
          </p>
          <p>
            <strong>Cargo/função:</strong>{" "}
            {textoOuNaoInformado(
              relatorio.cargoFuncao || formatarFuncoesRelatorio(relatorio.funcao)
            )}
          </p>
          <p className="relatorio-documento-campo-largo">
            <strong>Assinatura da gestão escolar:</strong>{" "}
            {textoOuNaoInformado(relatorio.assinaturaGestao)}
          </p>
        </div>
      </section>

      <section className="relatorio-documento-bloco relatorio-anexos-futuro">
        <h3>6. ANEXOS/EVIDÊNCIAS</h3>
        <p>
          Recurso futuro para incluir evidências do acompanhamento, como atividades, fotos
          autorizadas, registros, cronogramas ou documentos complementares.
        </p>
      </section>
    </div>
  );
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
  const ultimoAlunoSincronizadoRef = useRef("");

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
        alunoNome:
          formRelatorio.alunoNome || relatorioEmEdicao.alunoNome || alunoSelecionado?.nome || "-",
        atualizadoEm: new Date(),
      };
    }

    if (relatórios.length > 0) return relatórios[0];

    if (possuiConteudoPedagogico(formRelatorio)) {
      return {
        ...formRelatorio,
        alunoNome: formRelatorio.alunoNome || alunoSelecionado?.nome || "-",
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
    const dadosAluno = obterDadosCadastroAlunoParaRelatorio(alunoSelecionado);
    const mudouAluno = ultimoAlunoSincronizadoRef.current !== alunoIdSelecionado;

    setFormRelatorio((prev) => ({
      ...(relatorioEmEdicao
        ? preencherCamposVazios(prev, dadosAluno)
        : mudouAluno
          ? {
              ...prev,
              ...dadosAluno,
            }
          : prev),
      responsavelPreenchimento:
        !relatorioEmEdicao && !prev.responsavelPreenchimento
          ? responsavelPadrao
          : prev.responsavelPreenchimento,
    }));
    ultimoAlunoSincronizadoRef.current = alunoIdSelecionado;
  }, [alunoSelecionado, alunoIdSelecionado, relatorioEmEdicao, responsavelPadrao]);

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
      setErro("Selecione um aluno para gerar o relatório pedagógico.");
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
          turma: formRelatorio.turma,
          turno: formRelatorio.turno,
          diagnostico: formRelatorio.diagnostico,
          laudo: formRelatorio.laudo,
          pai: formRelatorio.pai,
          mae: formRelatorio.mae,
          profissionalAEE: formRelatorio.profissionalAEE,
          tipoAcompanhamento: formRelatorio.tipoAcompanhamento,
          profissionalAcompanhamentoNome: formRelatorio.profissionalAcompanhamentoNome,
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
        `Relatório pedagógico gerado com sucesso. Fontes no período: sondagem (${detalhes.fontes.sondagens}), atendimento AEE (${detalhes.fontes.atendimentosAEE}), acompanhamento (${detalhes.fontes.acompanhamentos}) e monitoramento (${detalhes.fontes.monitoramentos}).`
      );
    } catch (error) {
      console.error("[RelatoriosPage] Erro ao gerar relatório pedagógico completo", error);
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
      localizacao: relatório.localizacao || "",
      alunoNome: relatório.alunoNome || "",
      dataNascimento: relatório.dataNascimento || "",
      serieAno: relatório.serieAno || "",
      turma: relatório.turma || "",
      turno: relatório.turno || "",
      diagnostico: relatório.diagnostico || "",
      laudo: relatório.laudo || "",
      comprometimento: relatório.comprometimento || relatório.diagnostico || "",
      pai: relatório.pai || "",
      mae: relatório.mae || "",
      profissionalAEE: relatório.profissionalAEE || "",
      tipoAcompanhamento: normalizarTipoAcompanhamento(relatório.tipoAcompanhamento),
      profissionalAcompanhamentoNome: relatório.profissionalAcompanhamentoNome || "",
      responsavelPreenchimento:
        relatório.responsavelPreenchimento || relatório.coordenadorNome || "",
      funcao: Array.isArray(relatório.funcao)
        ? relatório.funcao.map((item) =>
            item === "Professor(a) do SRM" ? "Professor(a) da SRM" : item
          )
        : relatório.funcao
          ? [relatório.funcao]
          : [],
      introducao: relatório.introducao || "",
      interacaoComunicacao: relatório.interacaoComunicacao || "",
      habilidadesMotoras: relatório.habilidadesMotoras || "",
      habilidadesCognitivas: relatório.habilidadesCognitivas || "",
      autonomiaIndependencia: relatório.autonomiaIndependencia || "",
      outrasInformacoes: relatório.outrasInformacoes || "",
      conclusaoParecer: relatório.conclusaoParecer || "",
      situacaoObjetivos: relatório.situacaoObjetivos || "",
      localAssinatura: relatório.localAssinatura || relatório.municipio || "",
      dataAssinatura: relatório.dataAssinatura || "",
      assinaturaProfissional: relatório.assinaturaProfissional || "",
      cargoFuncao: relatório.cargoFuncao || "",
      assinaturaGestao: relatório.assinaturaGestao || "",
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
    const dadosAluno = obterDadosCadastroAlunoParaRelatorio(alunoSelecionado);
    setRelatorioEmEdicao(null);
    setFormRelatorio({
      ...initialRelatorioForm,
      ...dadosAluno,
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
      alunoNome: formRelatorio.alunoNome.trim() || alunoSelecionado.nome || "",
      bimestre: formRelatorio.bimestre,
      dataInicio: formRelatorio.dataInicio || "",
      dataFim: formRelatorio.dataFim || "",
      nomeEscola: formRelatorio.nomeEscola.trim(),
      municipio: formRelatorio.municipio.trim(),
      localizacao: formRelatorio.localizacao,
      dataNascimento: formRelatorio.dataNascimento,
      serieAno: formRelatorio.serieAno.trim(),
      turma: formRelatorio.turma.trim(),
      turno: formRelatorio.turno.trim(),
      diagnostico: formRelatorio.diagnostico.trim(),
      laudo: formRelatorio.laudo,
      comprometimento: formRelatorio.comprometimento.trim(),
      pai: formRelatorio.pai.trim(),
      mae: formRelatorio.mae.trim(),
      profissionalAEE: formRelatorio.profissionalAEE.trim(),
      tipoAcompanhamento: formRelatorio.tipoAcompanhamento,
      profissionalAcompanhamentoNome: formRelatorio.profissionalAcompanhamentoNome.trim(),
      responsavelPreenchimento: formRelatorio.responsavelPreenchimento.trim(),
      funcao: formRelatorio.funcao,
      introducao: formRelatorio.introducao.trim(),
      interacaoComunicacao: formRelatorio.interacaoComunicacao.trim(),
      habilidadesMotoras: formRelatorio.habilidadesMotoras.trim(),
      habilidadesCognitivas: formRelatorio.habilidadesCognitivas.trim(),
      autonomiaIndependencia: formRelatorio.autonomiaIndependencia.trim(),
      outrasInformacoes: formRelatorio.outrasInformacoes.trim(),
      conclusaoParecer: formRelatorio.conclusaoParecer.trim(),
      situacaoObjetivos: formRelatorio.situacaoObjetivos,
      localAssinatura: formRelatorio.localAssinatura.trim(),
      dataAssinatura: formRelatorio.dataAssinatura,
      assinaturaProfissional: formRelatorio.assinaturaProfissional.trim(),
      cargoFuncao: formRelatorio.cargoFuncao.trim(),
      assinaturaGestao: formRelatorio.assinaturaGestao.trim(),
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
      <main className="alunos-page relatorios-page">
        <section className="panel">
          <h1>Relatório Pedagógico do Aluno</h1>
          <p>Seu perfil não possui permissão para visualizar relatórios.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="alunos-page relatorios-page">
      <header className="page-header">
        <h1>Relatório Pedagógico do Aluno</h1>
        <p>
          Organiza informações registradas na plataforma sobre o desenvolvimento, participação,
          aprendizagem, intervenções e acompanhamento pedagógico do estudante.
        </p>
        <p className="muted">
          Orientação: este relatório deve ser elaborado, conferido e validado pelo(a) professor(a)
          do AEE ou profissional responsável, com base nas informações registradas ao longo do
          acompanhamento do estudante. O objetivo é subsidiar o planejamento pedagógico, os
          encaminhamentos e a articulação entre AEE, professores regentes, mediadores, assistentes
          educacionais, coordenação pedagógica e família.
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
        <h2 className="print-title">Relatório Pedagógico do Aluno</h2>

        {podeGerenciarRelatorio ? (
          <form className="aluno-form no-print" onSubmit={handleSalvarRelatorio}>
            <section className="form-section relatorio-form-bloco">
              <h3>Período do relatório</h3>
              <div className="relatorio-form-grid">
                <div>
                  <label htmlFor="bimestreRelatorio">Bimestre</label>
                  <select
                    id="bimestreRelatorio"
                    name="bimestre"
                    value={formRelatorio.bimestre}
                    onChange={handleChangeRelatorio}
                  >
                    {BIMESTRES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
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
            </section>

            <section className="form-section relatorio-form-bloco">
              <h3>1. Dados de identificação</h3>
              <div className="relatorio-form-grid">
                <div>
                  <label htmlFor="nomeEscola">Nome da escola</label>
                  <input id="nomeEscola" name="nomeEscola" value={formRelatorio.nomeEscola} onChange={handleChangeRelatorio} required />
                </div>
                <div>
                  <label htmlFor="municipio">Município</label>
                  <input id="municipio" name="municipio" value={formRelatorio.municipio} onChange={handleChangeRelatorio} required />
                </div>
                <div>
                  <label htmlFor="localizacao">Localização</label>
                  <select id="localizacao" name="localizacao" value={formRelatorio.localizacao} onChange={handleChangeRelatorio}>
                    <option value="">Selecione</option>
                    {OPCOES_LOCALIZACAO.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="alunoNome">Aluno</label>
                  <input id="alunoNome" name="alunoNome" value={formRelatorio.alunoNome} readOnly />
                </div>
                <div>
                  <label htmlFor="dataNascimentoRelatorio">Data de nascimento</label>
                  <input id="dataNascimentoRelatorio" name="dataNascimento" type="date" value={formRelatorio.dataNascimento} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="serieAno">Série/Ano</label>
                  <input id="serieAno" name="serieAno" value={formRelatorio.serieAno} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="turma">Turma</label>
                  <input id="turma" name="turma" value={formRelatorio.turma} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="turno">Turno</label>
                  <input id="turno" name="turno" value={formRelatorio.turno} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="laudo">Laudo</label>
                  <select id="laudo" name="laudo" value={formRelatorio.laudo} onChange={handleChangeRelatorio}>
                    <option value="">Selecione</option>
                    {OPCOES_LAUDO.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="pai">Pai</label>
                  <input id="pai" name="pai" value={formRelatorio.pai} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="mae">Mãe</label>
                  <input id="mae" name="mae" value={formRelatorio.mae} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="profissionalAEE">Profissional da Educação Especial</label>
                  <input id="profissionalAEE" name="profissionalAEE" value={formRelatorio.profissionalAEE} onChange={handleChangeRelatorio} />
                </div>
                <div className="relatorio-form-campo-largo">
                  <label htmlFor="comprometimentoRelatorio">Comprometimento/condição informada</label>
                  <textarea id="comprometimentoRelatorio" name="comprometimento" rows={3} value={formRelatorio.comprometimento} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="tipoAcompanhamentoRelatorio">Tipo de acompanhamento</label>
                  <select id="tipoAcompanhamentoRelatorio" name="tipoAcompanhamento" value={formRelatorio.tipoAcompanhamento} onChange={handleChangeRelatorio}>
                    <option value="">Selecione</option>
                    {OPCOES_TIPO_ACOMPANHAMENTO.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="profissionalAcompanhamentoNome">Nome do profissional de acompanhamento</label>
                  <input id="profissionalAcompanhamentoNome" name="profissionalAcompanhamentoNome" value={formRelatorio.profissionalAcompanhamentoNome} onChange={handleChangeRelatorio} />
                </div>
                <div className="relatorio-form-campo-largo">
                  <span className="checkbox-title">Função do profissional</span>
                  <div className="checkbox-group">
                    {OPCOES_FUNCAO.map((item) => (
                      <label key={item} className="checkbox-item">
                        <input type="checkbox" checked={formRelatorio.funcao.includes(item)} onChange={() => handleToggleFuncao(item)} />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="form-section relatorio-form-bloco">
              <h3>2. Introdução — contextualização do aluno</h3>
              <label htmlFor="introducaoRelatorio">Contextualização do estudante</label>
              <textarea
                id="introducaoRelatorio"
                name="introducao"
                rows={6}
                value={formRelatorio.introducao}
                onChange={handleChangeRelatorio}
                placeholder="Descreva o objetivo do relatório e apresente o estudante. Inclua idade, turma, rotina escolar, histórico de atendimento, principais características observadas e necessidades educacionais específicas."
              />
            </section>

            <section className="form-section relatorio-form-bloco">
              <h3>3. Desenvolvimento — habilidades e progressos</h3>
              <label htmlFor="interacaoComunicacao">3.1 Interação social, comportamento e comunicação</label>
              <textarea id="interacaoComunicacao" name="interacaoComunicacao" rows={5} value={formRelatorio.interacaoComunicacao} onChange={handleChangeRelatorio} placeholder="Descreva como o estudante interage com colegas e professores, como se comunica, participa de grupos, segue regras, compreende comandos e reage a mudanças ou frustrações." />

              <label htmlFor="habilidadesMotoras">3.2 Habilidades motoras</label>
              <textarea id="habilidadesMotoras" name="habilidadesMotoras" rows={5} value={formRelatorio.habilidadesMotoras} onChange={handleChangeRelatorio} placeholder="Descreva aspectos relacionados à coordenação motora fina e grossa, como escrita, recorte, manuseio de objetos, equilíbrio, deslocamentos, força, agilidade ou resistência nas atividades." />

              <label htmlFor="habilidadesCognitivas">3.3 Habilidades cognitivas</label>
              <textarea id="habilidadesCognitivas" name="habilidadesCognitivas" rows={5} value={formRelatorio.habilidadesCognitivas} onChange={handleChangeRelatorio} placeholder="Descreva atenção, memória, raciocínio, percepção visual e auditiva, compreensão de instruções, resolução de desafios, imaginação, criatividade e transferência de aprendizagens." />

              <label htmlFor="autonomiaIndependencia">3.4 Autonomia e independência</label>
              <textarea id="autonomiaIndependencia" name="autonomiaIndependencia" rows={5} value={formRelatorio.autonomiaIndependencia} onChange={handleChangeRelatorio} placeholder="Descreva a autonomia do estudante na organização de materiais, higiene, alimentação, deslocamentos, cumprimento de horários e regras, autocuidado, autorregulação emocional e capacidade de fazer escolhas." />

              <label htmlFor="outrasInformacoes">3.5 Outras informações relevantes observadas</label>
              <textarea id="outrasInformacoes" name="outrasInformacoes" rows={5} value={formRelatorio.outrasInformacoes} onChange={handleChangeRelatorio} placeholder="Registre outras informações importantes observadas durante o percurso que não se encaixam nos eixos anteriores, mas que ajudam a compreender o desenvolvimento e o acompanhamento do estudante." />
            </section>

            <section className="form-section relatorio-form-bloco">
              <h3>4. Conclusão — parecer final</h3>
              <label htmlFor="situacaoObjetivos">Situação dos objetivos</label>
              <select id="situacaoObjetivos" name="situacaoObjetivos" value={formRelatorio.situacaoObjetivos} onChange={handleChangeRelatorio}>
                <option value="">Selecione</option>
                {OPCOES_SITUACAO_OBJETIVOS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <label htmlFor="conclusaoParecer">Parecer final</label>
              <textarea id="conclusaoParecer" name="conclusaoParecer" rows={6} value={formRelatorio.conclusaoParecer} onChange={handleChangeRelatorio} placeholder="Elabore uma síntese dos avanços, desafios e necessidades de continuidade. Indique se os objetivos foram alcançados plenamente, parcialmente ou ainda não alcançados, e proponha estratégias para o próximo período." />
            </section>

            <section className="form-section relatorio-form-bloco">
              <h3>5. Local, data e assinaturas</h3>
              <div className="relatorio-form-grid">
                <div>
                  <label htmlFor="localAssinatura">Local</label>
                  <input id="localAssinatura" name="localAssinatura" value={formRelatorio.localAssinatura} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="dataAssinatura">Data</label>
                  <input id="dataAssinatura" name="dataAssinatura" type="date" value={formRelatorio.dataAssinatura} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="responsavelPreenchimento">Responsável pelo preenchimento</label>
                  <input id="responsavelPreenchimento" name="responsavelPreenchimento" value={formRelatorio.responsavelPreenchimento} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="assinaturaProfissional">Assinatura do profissional</label>
                  <input id="assinaturaProfissional" name="assinaturaProfissional" value={formRelatorio.assinaturaProfissional} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="cargoFuncao">Cargo/função</label>
                  <input id="cargoFuncao" name="cargoFuncao" value={formRelatorio.cargoFuncao} onChange={handleChangeRelatorio} />
                </div>
                <div>
                  <label htmlFor="assinaturaGestao">Assinatura da gestão escolar</label>
                  <input id="assinaturaGestao" name="assinaturaGestao" value={formRelatorio.assinaturaGestao} onChange={handleChangeRelatorio} />
                </div>
              </div>
            </section>

            <section className="form-section relatorio-form-bloco relatorio-anexos-futuro">
              <h3>6. Anexos/evidências</h3>
              <p>
                Recurso futuro para incluir evidências do acompanhamento, como atividades, fotos
                autorizadas, registros, cronogramas ou documentos complementares.
              </p>
            </section>

            <section className="form-section relatorio-form-bloco">
              <h3>Texto pedagógico complementar</h3>
              <p className="muted">
                Este campo preserva os geradores atuais como texto de apoio. Revise o conteúdo e
                distribua as informações nos blocos pedagógicos antes do uso oficial.
              </p>
              <label htmlFor="textoRelatorio">Texto base gerado ou complementar</label>
              <textarea id="textoRelatorio" name="textoRelatorio" rows={10} value={formRelatorio.textoRelatorio} onChange={handleChangeRelatorio} />
            </section>

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
                  ? "Gerando relatório pedagógico..."
                  : "Gerar relatório pedagógico"}
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
            <DocumentoRelatorioPedagogico relatorio={relatorioVisualizado} />
            <div className="relatorio-registros-apoio">
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
          </section>
        ) : null}

        <section className="panel report-list no-print">
          <h3>Histórico do aluno</h3>
          {historicoRelatorios.length === 0 ? <p>Nenhum relatório cadastrado.</p> : null}
          {historicoRelatorios.map((relatório) => {
            const gruposHistorico = habilidadesAgrupadasPorBimestre[relatório.bimestre] || [];
            const trechoHistorico =
              relatório.introducao || relatório.textoRelatorio || relatório.conclusaoParecer || "";
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
                {trechoHistorico.slice(0, 140)}
                {trechoHistorico.length > 140 ? "..." : ""}
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
                <strong>Professor(a) do AEE:</strong> {relatório.profissionalAEE || "-"}
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
              <DocumentoRelatorioPedagogico relatorio={relatorio} />
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
          <h2 className="print-title">Relatório Pedagógico do Aluno</h2>
          <DocumentoRelatorioPedagogico relatorio={relatorioParaExportacao || {}} />
        </article>
      </section>
    </main>
  );
}

export default RelatoriosPage;





