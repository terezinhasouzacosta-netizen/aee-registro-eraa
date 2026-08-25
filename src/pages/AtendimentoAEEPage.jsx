import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { listarAlunos, listarAlunosPorIds } from "../services/alunosService";
import {
  criarAtendimentoAEE,
  EIXOS_TEMATICOS_OPCOES,
  excluirAtendimentoAEE,
  gerarSinteseMensalAtendimento,
  listarAtendimentosAEE,
  listarAtendimentosAEEPorNome,
  obterSemanaReferenciaPorData,
  STATUS_PRESENCA_OPCOES,
  atualizarAtendimentoAEE,
} from "../services/atendimentoAeeService";
import { listarMetasPorAlunoId } from "../services/metasService";
import { buscarIdsAlunosVinculados } from "../services/vinculacoesService";
import {
  podeAcessarAcompanhamento,
  podeEditarHistoricoAcompanhamento,
  visualizaSomenteVinculados,
} from "../utils/permissions";

function dataAtualISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = `${hoje.getMonth() + 1}`.padStart(2, "0");
  const dia = `${hoje.getDate()}`.padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function mesAtualISO() {
  return dataAtualISO().slice(0, 7);
}

function obterMesPorData(dataIso) {
  const data = String(dataIso || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data.slice(0, 7);
  return mesAtualISO();
}

function formInicial({ alunoId = "", responsavelNome = "" } = {}) {
  const dataAtendimento = dataAtualISO();
  return {
    alunoId,
    dataAtendimento,
    semanaReferencia: obterSemanaReferenciaPorData(dataAtendimento),
    mesReferencia: dataAtendimento.slice(0, 7),
    statusPresenca: "Presente",
    tipoAtendimento: "Atendimento na Sala AEE",
    eixoTematico: "",
    habilidadesSelecionadas: [],
    habilidadesComplementares: "",
    habilidadesTrabalhadas: "",
    dificuldadesObservadas: "",
    avancosPercebidos: "",
    observacoes: "",
    encaminhamentos: "",
    observacaoSala: "",
    interacao: "",
    participacao: "",
    comportamento: "",
    dificuldadesContextoAula: "",
    apoioRecebido: "",
    responsavelNome,
  };
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatarData(valor) {
  if (!valor) return "-";
  const parsed = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return valor;
  return parsed.toLocaleDateString("pt-BR");
}

const MAPA_CHAVES_HABILIDADE_EIXO = [
  { chaves: ["leitura", "escrita", "palavra"], eixo: "Leitura e escrita" },
  { chaves: ["comunicacao", "oral"], eixo: "Comunicação oral" },
  { chaves: ["matematica", "numer", "calculo"], eixo: "Matemática funcional" },
  { chaves: ["atencao", "concentracao", "foco"], eixo: "Atenção e concentração" },
  { chaves: ["interacao", "social", "conviv"], eixo: "Interação social" },
  { chaves: ["autonomia"], eixo: "Autonomia nas atividades" },
  { chaves: ["comportamento", "autorregulacao"], eixo: "Comportamento e autorregulação" },
  { chaves: ["coordenacao", "motora"], eixo: "Outro" },
];

const EIXOS_EQUIVALENTES_HABILIDADES = {
  "leitura e escrita": ["Leitura e escrita", "Leitura", "Escrita"],
  "comunicacao oral": ["Comunicação oral", "Comunicação e Linguagem"],
  "matematica funcional": ["Matemática funcional", "Raciocínio Lógico-Matemático"],
  "atencao e concentracao": ["Atenção e concentração", "Atenção e Funções Executivas"],
  "interacao social": ["Interação social"],
  "autonomia nas atividades": [
    "Autonomia nas atividades",
    "Alimentação, Higiene e Autonomia Pessoal",
    "Autonomia Escolar",
  ],
  "comportamento e autorregulacao": [
    "Comportamento e autorregulação",
    "Convivência e Autorregulação",
  ],
  outro: ["Outro", "Coordenação Motora"],
};

function extrairTextoHabilidade(item) {
  if (typeof item === "string") return item.trim();
  if (!item || typeof item !== "object") return "";
  return String(item.habilidade || item.nome || item.titulo || item.descricao || "").trim();
}

function inferirEixoPorHabilidade(habilidade) {
  if (!habilidade || typeof habilidade !== "object") {
    const texto = normalizarTexto(habilidade);
    if (!texto) return "";
    const encontrado = MAPA_CHAVES_HABILIDADE_EIXO.find(({ chaves }) =>
      chaves.some((chave) => texto.includes(chave))
    );
    return encontrado?.eixo || "";
  }

  const eixoDireto = String(habilidade.eixoTematico || habilidade.eixo || habilidade.titulo || "").trim();
  if (eixoDireto) return eixoDireto;

  const texto = extrairTextoHabilidade(habilidade);
  const textoNormalizado = normalizarTexto(texto);
  if (!textoNormalizado) return "";
  const encontrado = MAPA_CHAVES_HABILIDADE_EIXO.find(({ chaves }) =>
    chaves.some((chave) => textoNormalizado.includes(chave))
  );
  return encontrado?.eixo || "";
}

function habilidadePertenceAoEixo(habilidade, eixoTematico) {
  const eixo = String(eixoTematico || "").trim();
  if (!eixo) return true;
  const eixoDaHabilidade = inferirEixoPorHabilidade(habilidade);
  if (!eixoDaHabilidade) return false;
  return normalizarTexto(eixoDaHabilidade) === normalizarTexto(eixo);
}

function metaPertenceAoEixo(meta, eixoTematico) {
  const eixoNormalizado = normalizarTexto(eixoTematico);
  const tituloNormalizado = normalizarTexto(meta?.eixoTematico || meta?.eixo || meta?.titulo);
  if (!eixoNormalizado || !tituloNormalizado) return false;

  const equivalentes = EIXOS_EQUIVALENTES_HABILIDADES[eixoNormalizado] || [eixoTematico];
  return equivalentes.some(
    (tituloEquivalente) => normalizarTexto(tituloEquivalente) === tituloNormalizado
  );
}

function obterHabilidadesDoRegistroEmEdicao(registroEmEdicao, eixoSelecionado, selecionadas) {
  const pertenceAoMesmoEixo =
    registroEmEdicao &&
    normalizarTexto(registroEmEdicao.eixoTematico) === normalizarTexto(eixoSelecionado);

  return pertenceAoMesmoEixo && Array.isArray(selecionadas)
    ? selecionadas.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function formatarHabilidadesRegistro(item) {
  const eixoTematico = String(item?.eixoTematico || "").trim();
  const selecionadas = Array.isArray(item?.habilidadesSelecionadas)
    ? item.habilidadesSelecionadas
        .filter((habilidade) => habilidadePertenceAoEixo(habilidade, eixoTematico))
        .map(extrairTextoHabilidade)
        .filter(Boolean)
    : [];
  const complementares = String(item?.habilidadesComplementares || "").trim();
  if (selecionadas.length || complementares) {
    return [
      selecionadas.length ? `Selecionadas: ${selecionadas.join("; ")}` : "",
      complementares ? `Complementação: ${complementares}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return item?.habilidadesTrabalhadas || "-";
}

function extrairCampoRotulado(texto, rotulo) {
  const base = String(texto || "");
  if (!base) return "";
  const regex = new RegExp(`${rotulo}\\s*:\\s*([^\\n|]+)`, "i");
  const match = base.match(regex);
  return String(match?.[1] || "")
    .trim()
    .replace(/^-\s*/, "");
}

function resolverModoAtendimento(item) {
  const modo = String(item?.modoAtendimento || "")
    .trim()
    .toUpperCase();
  if (modo === "AEE" || modo === "REGULAR") return modo;
  if (modo.includes("SALA REGULAR") || modo === "ACOMPANHAMENTO") return "REGULAR";
  if (modo.includes("SALA AEE") || modo.includes("ATENDIMENTO")) return "AEE";

  const tipo = String(item?.tipoAtendimento || "")
    .trim()
    .toLowerCase();
  if (tipo === "regular" || tipo.includes("sala regular")) return "REGULAR";
  if (tipo === "aee" || tipo.includes("sala aee")) return "AEE";
  return "AEE";
}

function obterRotuloTipoAtendimento(item) {
  return resolverModoAtendimento(item) === "REGULAR"
    ? "Acompanhamento na Sala Regular"
    : "Atendimento na Sala AEE";
}

function AtendimentoAEEPage() {
  const { currentUser, perfil } = useAuth();
  const [alunos, setAlunos] = useState([]);
  const [idsPermitidos, setIdsPermitidos] = useState(undefined);
  const [filtroAlunoId, setFiltroAlunoId] = useState("");
  const [filtroMes, setFiltroMes] = useState(mesAtualISO());
  const [filtroSemana, setFiltroSemana] = useState("");
  const [atendimentos, setAtendimentos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [gerandoSintese, setGerandoSintese] = useState(false);
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState("");
  const [registroEmEdicao, setRegistroEmEdicao] = useState(null);
  const [sinteseMensal, setSinteseMensal] = useState("");
  const [resumoSintese, setResumoSintese] = useState(null);
  const [loadingSondagem, setLoadingSondagem] = useState(false);
  const [habilidadesSugeridas, setHabilidadesSugeridas] = useState([]);
  const [form, setForm] = useState(() => formInicial());
  const [modoAtendimento, setModoAtendimento] = useState("AEE");

  const podeLer = podeAcessarAcompanhamento(perfil);
  const podeEditar = podeEditarHistoricoAcompanhamento(perfil);
  const somenteVinculados = visualizaSomenteVinculados(perfil);

  const alunoSelecionado = useMemo(
    () => alunos.find((item) => item.id === (form.alunoId || filtroAlunoId)) || null,
    [alunos, filtroAlunoId, form.alunoId]
  );

  const semanasDisponiveis = useMemo(() => {
    const semanas = new Set(
      atendimentos
        .map((item) => item.semanaReferencia)
        .filter(Boolean)
    );
    return [...semanas].sort((a, b) => (a < b ? 1 : -1));
  }, [atendimentos]);

  const atendimentosFiltrados = atendimentos;

  useEffect(() => {
    if (filtroSemana && !semanasDisponiveis.includes(filtroSemana)) {
      setFiltroSemana("");
    }
  }, [filtroSemana, semanasDisponiveis]);

  useEffect(() => {
    async function carregarAlunos() {
      if (!currentUser || !podeLer) return;
      setLoadingAlunos(true);
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

        const alunoPadrao = alunosData[0]?.id || "";
        setFiltroAlunoId((prev) => prev || alunoPadrao);
        setForm((prev) => {
          if (prev.alunoId) return prev;
          return {
            ...prev,
            alunoId: alunoPadrao,
          };
        });
      } catch (error) {
        setErro("Não foi possível carregar os alunos para o Atendimento AEE.");
      } finally {
        setLoadingAlunos(false);
      }
    }

    carregarAlunos();
  }, [currentUser, podeLer, somenteVinculados]);

  useEffect(() => {
    async function carregarHistorico() {
      if (!currentUser || !podeLer || !filtroAlunoId) {
        setAtendimentos([]);
        return;
      }

      setLoadingHistorico(true);
      setErro("");

      try {
        let registros = await listarAtendimentosAEE({
          alunoId: filtroAlunoId,
          mesReferencia: filtroMes || undefined,
          semanaReferencia: filtroSemana || undefined,
          alunoIdsPermitidos: idsPermitidos,
        });

        if (!registros.length) {
          const alunoAtual = alunos.find((item) => item.id === filtroAlunoId);
          const nomeAluno = String(alunoAtual?.nome || "").trim();
          if (nomeAluno) {
            registros = await listarAtendimentosAEEPorNome({
              alunoNome: nomeAluno,
              alunoId: filtroAlunoId,
              mesReferencia: filtroMes || undefined,
              semanaReferencia: filtroSemana || undefined,
              alunoIdsPermitidos: idsPermitidos,
            });
          }
        }

        setAtendimentos(registros);
      } catch (error) {
        setErro("Não foi possível carregar o histórico de atendimentos.");
      } finally {
        setLoadingHistorico(false);
      }
    }

    carregarHistorico();
  }, [currentUser, podeLer, filtroAlunoId, filtroMes, filtroSemana, idsPermitidos, alunos]);

  useEffect(() => {
    async function carregarHabilidadesPorEixo() {
      const alunoAlvo = String(form.alunoId || filtroAlunoId || "").trim();
      const eixoSelecionado = String(form.eixoTematico || "").trim();

      if (!alunoAlvo || !eixoSelecionado) {
        setHabilidadesSugeridas([]);
        setForm((prev) => ({
          ...prev,
          habilidadesSelecionadas: [],
        }));
        return;
      }

      setLoadingSondagem(true);
      try {
        const metasAluno = await listarMetasPorAlunoId({
          alunoId: alunoAlvo,
          alunoIdsPermitidos: idsPermitidos,
        });

        const sugestoesCadastradas = [
          ...new Set(
            (Array.isArray(metasAluno) ? metasAluno : [])
              .filter((item) => metaPertenceAoEixo(item, eixoSelecionado))
              .map((item) => String(item?.descricao || "").trim())
              .filter(Boolean)
          ),
        ];

        const habilidadesDoRegistro = obterHabilidadesDoRegistroEmEdicao(
          registroEmEdicao,
          eixoSelecionado,
          form.habilidadesSelecionadas
        );
        const sugestoes = [...new Set([...sugestoesCadastradas, ...habilidadesDoRegistro])].sort(
          (a, b) => a.localeCompare(b, "pt-BR")
        );

        setHabilidadesSugeridas(sugestoes);
        setForm((prev) => ({
          ...prev,
          habilidadesSelecionadas: Array.isArray(prev.habilidadesSelecionadas)
            ? prev.habilidadesSelecionadas.filter((item) => sugestoes.includes(item))
            : [],
        }));
      } catch (error) {
        const habilidadesDoRegistro = obterHabilidadesDoRegistroEmEdicao(
          registroEmEdicao,
          eixoSelecionado,
          form.habilidadesSelecionadas
        );
        setHabilidadesSugeridas(habilidadesDoRegistro);
        setForm((prev) => ({
          ...prev,
          habilidadesSelecionadas: habilidadesDoRegistro,
        }));
      } finally {
        setLoadingSondagem(false);
      }
    }

    carregarHabilidadesPorEixo();
  }, [form.alunoId, filtroAlunoId, form.eixoTematico, idsPermitidos, registroEmEdicao]);

  const limparFormulario = () => {
    const alunoBase = filtroAlunoId || form.alunoId || "";
    setRegistroEmEdicao(null);
    setModoAtendimento("AEE");
    setForm(
      formInicial({
        alunoId: alunoBase,
        responsavelNome: currentUser?.displayName || currentUser?.email || "",
      })
    );
  };

  const handleChangeForm = (event) => {
    const { name, value } = event.target;

    if (name === "dataAtendimento") {
      const semana = obterSemanaReferenciaPorData(value);
      setForm((prev) => ({
        ...prev,
        dataAtendimento: value,
        semanaReferencia: semana,
        mesReferencia: String(value || "").slice(0, 7),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggleHabilidade = (habilidade, marcada) => {
    setForm((prev) => {
      const selecionadas = Array.isArray(prev.habilidadesSelecionadas)
        ? prev.habilidadesSelecionadas
        : [];

      return {
        ...prev,
        habilidadesSelecionadas: marcada
          ? [...new Set([...selecionadas, habilidade])]
          : selecionadas.filter((item) => item !== habilidade),
      };
    });
  };

  const handleSalvar = async (event) => {
    event.preventDefault();
    if (!podeEditar || !currentUser) return;

    const aluno = alunos.find((item) => item.id === form.alunoId);
    if (!aluno) {
      setErro("Selecione um aluno válido para salvar o atendimento.");
      return;
    }

    const tipoAtendimentoPorModo =
      modoAtendimento === "REGULAR"
        ? "Acompanhamento na Sala Regular"
        : "Atendimento na Sala AEE";
    const habilidadesSelecionadas = Array.isArray(form.habilidadesSelecionadas)
      ? form.habilidadesSelecionadas.filter(Boolean)
      : [];
    const habilidadesComplementares = String(form.habilidadesComplementares || "").trim();

    if (modoAtendimento === "AEE" && !habilidadesSelecionadas.length && !habilidadesComplementares) {
      setErro(
        "Selecione ao menos uma habilidade sugerida da sondagem ou preencha o campo de complementação."
      );
      return;
    }

    const habilidadesModoRegular = [
      `Participação: ${form.participacao || "-"}`,
      `Interação: ${form.interacao || "-"}`,
      `Comportamento: ${form.comportamento || "-"}`,
      `Apoio recebido: ${form.apoioRecebido || "-"}`,
    ].join("\n");

    const habilidadesAEEConsolidadas = [
      habilidadesSelecionadas.length
        ? `Selecionadas: ${habilidadesSelecionadas.join("; ")}`
        : "",
      habilidadesComplementares ? `Complementação: ${habilidadesComplementares}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const payload = {
      alunoId: aluno.id,
      alunoNome: aluno.nome || "",
      dataAtendimento: form.dataAtendimento,
      semanaReferencia: form.semanaReferencia,
      mesReferencia: form.mesReferencia,
      statusPresenca: form.statusPresenca,
      modoAtendimento,
      tipoAtendimento: tipoAtendimentoPorModo,
      eixoTematico: modoAtendimento === "AEE" ? form.eixoTematico : "Contexto da sala regular",
      habilidadesSelecionadas: modoAtendimento === "AEE" ? habilidadesSelecionadas : [],
      habilidadesComplementares: modoAtendimento === "AEE" ? habilidadesComplementares : "",
      habilidadesTrabalhadas:
        modoAtendimento === "AEE" ? habilidadesAEEConsolidadas : habilidadesModoRegular,
      dificuldadesObservadas:
        modoAtendimento === "AEE" ? form.dificuldadesObservadas : form.dificuldadesContextoAula,
      avancosPercebidos: modoAtendimento === "AEE" ? form.avancosPercebidos : form.participacao,
      observacoes:
        modoAtendimento === "AEE" ? form.observacoes : form.observacoes,
      encaminhamentos: form.encaminhamentos,
      observacaoSala: modoAtendimento === "REGULAR" ? form.observacaoSala : "",
      interacao: modoAtendimento === "REGULAR" ? form.interacao : "",
      participacao: modoAtendimento === "REGULAR" ? form.participacao : "",
      comportamento: modoAtendimento === "REGULAR" ? form.comportamento : "",
      dificuldadesContextoAula:
        modoAtendimento === "REGULAR" ? form.dificuldadesContextoAula : "",
      apoioRecebido: modoAtendimento === "REGULAR" ? form.apoioRecebido : "",
      responsavelId: currentUser.uid,
      responsavelNome:
        form.responsavelNome || currentUser.displayName || currentUser.email || "Usuário",
      responsavelEmail: currentUser.email || "",
    };

    setSalvando(true);
    setErro("");
    setFeedback("");

    try {
      if (registroEmEdicao?.id) {
        await atualizarAtendimentoAEE(registroEmEdicao.id, payload);
        setFeedback("Atendimento atualizado com sucesso.");
      } else {
        await criarAtendimentoAEE(payload);
        setFeedback("Atendimento registrado com sucesso.");
      }

      setFiltroAlunoId(payload.alunoId);
      setFiltroMes(payload.mesReferencia || filtroMes);
      limparFormulario();

      const registrosAtualizados = await listarAtendimentosAEE({
        alunoId: payload.alunoId,
        mesReferencia: payload.mesReferencia || undefined,
        semanaReferencia: filtroSemana || undefined,
        alunoIdsPermitidos: idsPermitidos,
      });
      setAtendimentos(registrosAtualizados);
    } catch (error) {
      setErro("Não foi possível salvar o atendimento.");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (item) => {
    if (!podeEditar) return;

    const modo = resolverModoAtendimento(item);
    const habilidadesTextoLegado = String(item.habilidadesTrabalhadas || "");
    const observacoesLegado = String(item.observacoes || "");
    setModoAtendimento(modo);

    setRegistroEmEdicao(item);
    const habilidadesSelecionadas = Array.isArray(item.habilidadesSelecionadas)
      ? item.habilidadesSelecionadas
      : [];
    setForm({
      alunoId: item.alunoId || "",
      dataAtendimento: item.dataAtendimento || dataAtualISO(),
      semanaReferencia:
        item.semanaReferencia || obterSemanaReferenciaPorData(item.dataAtendimento || dataAtualISO()),
      mesReferencia: item.mesReferencia || obterMesPorData(item.dataAtendimento),
      statusPresenca: item.statusPresenca || "Presente",
      tipoAtendimento: item.tipoAtendimento || "Atendimento na Sala AEE",
      eixoTematico: item.eixoTematico || "",
      habilidadesSelecionadas,
      habilidadesComplementares:
        item.habilidadesComplementares || (!habilidadesSelecionadas.length ? item.habilidadesTrabalhadas || "" : ""),
      habilidadesTrabalhadas: item.habilidadesTrabalhadas || "",
      dificuldadesObservadas: item.dificuldadesObservadas || "",
      avancosPercebidos: item.avancosPercebidos || "",
      observacoes: item.observacoes || "",
      encaminhamentos: item.encaminhamentos || item.encaminhamento || "",
      observacaoSala:
        modo === "REGULAR"
          ? item.observacaoSala || observacoesLegado
          : "",
      interacao:
        modo === "REGULAR"
          ? item.interacao || extrairCampoRotulado(habilidadesTextoLegado, "Interação")
          : "",
      participacao:
        modo === "REGULAR"
          ? item.participacao || extrairCampoRotulado(habilidadesTextoLegado, "Participação")
          : "",
      comportamento:
        modo === "REGULAR"
          ? item.comportamento || extrairCampoRotulado(habilidadesTextoLegado, "Comportamento")
          : "",
      dificuldadesContextoAula:
        modo === "REGULAR"
          ? item.dificuldadesContextoAula || item.dificuldadesObservadas || ""
          : "",
      apoioRecebido:
        modo === "REGULAR"
          ? item.apoioRecebido || extrairCampoRotulado(habilidadesTextoLegado, "Apoio recebido")
          : "",
      responsavelNome: item.responsavelNome || "",
    });
  };

  const handleExcluir = async (item) => {
    if (!podeEditar || !item?.id) return;
    const confirma = window.confirm("Deseja excluir este atendimento?");
    if (!confirma) return;

    setErro("");
    setFeedback("");

    try {
      await excluirAtendimentoAEE(item.id);
      if (registroEmEdicao?.id === item.id) {
        limparFormulario();
      }

      const registrosAtualizados = await listarAtendimentosAEE({
        alunoId: filtroAlunoId,
        mesReferencia: filtroMes || undefined,
        semanaReferencia: filtroSemana || undefined,
        alunoIdsPermitidos: idsPermitidos,
      });
      setAtendimentos(registrosAtualizados);
      setFeedback("Atendimento excluído com sucesso.");
    } catch (error) {
      setErro("Não foi possível excluir o atendimento.");
    }
  };

  const handleGerarSinteseMensal = async () => {
    if (!filtroAlunoId || !filtroMes) {
      setErro("Selecione aluno e mês para gerar a síntese mensal.");
      return;
    }

    setGerandoSintese(true);
    setErro("");
    setFeedback("");

    try {
      const resultado = await gerarSinteseMensalAtendimento({
        alunoId: filtroAlunoId,
        mesReferencia: filtroMes,
        alunoIdsPermitidos: idsPermitidos,
      });
      setResumoSintese(resultado);
      setSinteseMensal(resultado.texto || "");
      setFeedback(`Síntese mensal gerada com ${resultado.totalRegistros} registro(s).`);
    } catch (error) {
      setErro("Não foi possível gerar a síntese mensal automática.");
    } finally {
      setGerandoSintese(false);
    }
  };

  if (!podeLer) {
    return (
      <main className="alunos-page">
        <section className="panel">
          <h1>Atendimento AEE</h1>
          <p>Seu perfil não possui permissão para visualizar este módulo.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="alunos-page module-page">
      <header className="page-header">
        <h1>Atendimento AEE</h1>
        <p>
          Registro semanal dos atendimentos realizados na Sala AEE e das observações pedagógicas
          por aluno.
        </p>
      </header>

      {feedback ? <p className="toast-success">{feedback}</p> : null}
      {erro ? <p className="toast-error">{erro}</p> : null}

      <section className="panel filtros-panel">
        <h2>Consulta rápida</h2>
        <div className="filters-grid">
          <div>
            <label htmlFor="filtroAtendimentoAluno">Aluno</label>
            <select
              id="filtroAtendimentoAluno"
              value={filtroAlunoId}
              onChange={(event) => {
                const alunoId = event.target.value;
                setFiltroAlunoId(alunoId);
                setForm((prev) => ({ ...prev, alunoId }));
              }}
              disabled={loadingAlunos}
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
            <label htmlFor="filtroAtendimentoMes">Mês</label>
            <input
              id="filtroAtendimentoMes"
              type="month"
              value={filtroMes}
              onChange={(event) => setFiltroMes(event.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="module-layout">
        <section className="panel module-form-panel">
          <h2>{registroEmEdicao ? "Editar atendimento" : "Novo atendimento semanal"}</h2>
          <form className="aluno-form" onSubmit={handleSalvar}>
            <section className="form-section" style={{ display: "grid", gap: "0.85rem" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Dados do Atendimento</h3>

              <div>
                <label htmlFor="alunoId">Aluno</label>
                <select
                  id="alunoId"
                  name="alunoId"
                  value={form.alunoId}
                  onChange={handleChangeForm}
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

              <div className="acompanhamento-inline-grid">
                <div>
                  <label htmlFor="dataAtendimento">Data do atendimento</label>
                  <input
                    id="dataAtendimento"
                    name="dataAtendimento"
                    type="date"
                    value={form.dataAtendimento}
                    onChange={handleChangeForm}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="semanaReferencia">Semana de referência</label>
                  <input
                    id="semanaReferencia"
                    name="semanaReferencia"
                    value={form.semanaReferencia}
                    onChange={handleChangeForm}
                    required
                  />
                </div>
              </div>

              <div className="acompanhamento-inline-grid">
                <div>
                  <label htmlFor="statusPresenca">Chamada semanal</label>
                  <select
                    id="statusPresenca"
                    name="statusPresenca"
                    value={form.statusPresenca}
                    onChange={handleChangeForm}
                    required
                  >
                    {STATUS_PRESENCA_OPCOES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {modoAtendimento === "AEE" ? (
              <>
                <section className="form-section" style={{ display: "grid", gap: "0.85rem" }}>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                    Planejamento do Atendimento
                  </h3>

                  <div>
                    <label htmlFor="eixoTematico">Eixo temático</label>
                    <select
                      id="eixoTematico"
                      name="eixoTematico"
                      value={form.eixoTematico}
                      onChange={handleChangeForm}
                      required
                    >
                      <option value="">Selecione</option>
                      {EIXOS_TEMATICOS_OPCOES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Habilidades do aluno por eixo temático</label>
                    {!loadingSondagem && habilidadesSugeridas.length > 0 ? (
                      <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                        Marque as habilidades trabalhadas neste atendimento.
                      </p>
                    ) : null}
                    {loadingSondagem ? <p className="muted">Carregando habilidades...</p> : null}
                    {!loadingSondagem && !form.alunoId ? (
                      <p className="muted">Selecione um aluno para carregar as habilidades.</p>
                    ) : null}
                    {!loadingSondagem && form.alunoId && !form.eixoTematico ? (
                      <p className="muted">Selecione um eixo temático para exibir as habilidades.</p>
                    ) : null}
                    {!loadingSondagem &&
                    form.alunoId &&
                    form.eixoTematico &&
                    habilidadesSugeridas.length === 0 ? (
                      <p className="muted">Nenhuma habilidade cadastrada para este eixo temático.</p>
                    ) : null}
                    {!loadingSondagem && habilidadesSugeridas.length > 0 ? (
                      <div
                        role="group"
                        aria-label="Habilidades cadastradas para o eixo temático"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                          gap: "0.65rem",
                          marginTop: "0.55rem",
                        }}
                      >
                        {habilidadesSugeridas.map((habilidade, index) => (
                          <label
                            key={`${habilidade}-${index}`}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "0.6rem",
                              margin: 0,
                              padding: "0.75rem",
                              border: "1px solid #dbe5f0",
                              borderRadius: "10px",
                              background: "#ffffff",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={(form.habilidadesSelecionadas || []).includes(habilidade)}
                              onChange={(event) =>
                                handleToggleHabilidade(habilidade, event.target.checked)
                              }
                              style={{
                                width: "18px",
                                minWidth: "18px",
                                height: "18px",
                                margin: "2px 0 0",
                                padding: 0,
                                accentColor: "#1d4ed8",
                                cursor: "pointer",
                              }}
                            />
                            <span style={{ lineHeight: 1.45, overflowWrap: "anywhere" }}>
                              {habilidade}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="habilidadesComplementares">Complementações do atendimento</label>
                    <textarea
                      id="habilidadesComplementares"
                      name="habilidadesComplementares"
                      value={form.habilidadesComplementares}
                      onChange={handleChangeForm}
                      rows={5}
                      style={{ minHeight: "120px", resize: "vertical", lineHeight: "1.5" }}
                      placeholder="Registre complementações ou outras habilidades trabalhadas no atendimento."
                    />
                  </div>
                </section>

                <section className="form-section" style={{ display: "grid", gap: "0.85rem" }}>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Registro Pedagógico</h3>

                  <div>
                    <label htmlFor="dificuldadesObservadas">Dificuldades observadas</label>
                    <textarea
                      id="dificuldadesObservadas"
                      name="dificuldadesObservadas"
                      value={form.dificuldadesObservadas}
                      onChange={handleChangeForm}
                      rows={5}
                      style={{ minHeight: "120px", resize: "vertical", lineHeight: "1.5" }}
                    />
                  </div>

                  <div>
                    <label htmlFor="avancosPercebidos">Avanços percebidos</label>
                    <textarea
                      id="avancosPercebidos"
                      name="avancosPercebidos"
                      value={form.avancosPercebidos}
                      onChange={handleChangeForm}
                      rows={5}
                      style={{ minHeight: "120px", resize: "vertical", lineHeight: "1.5" }}
                    />
                  </div>

                  <div>
                    <label htmlFor="observacoes">Observações pedagógicas</label>
                    <textarea
                      id="observacoes"
                      name="observacoes"
                      value={form.observacoes}
                      onChange={handleChangeForm}
                      rows={5}
                      style={{ minHeight: "120px", resize: "vertical", lineHeight: "1.5" }}
                    />
                  </div>

                  <div>
                    <label htmlFor="encaminhamentos">Encaminhamentos e próximos passos</label>
                    <textarea
                      id="encaminhamentos"
                      name="encaminhamentos"
                      value={form.encaminhamentos}
                      onChange={handleChangeForm}
                      rows={6}
                      style={{ minHeight: "145px", resize: "vertical", lineHeight: "1.5" }}
                      placeholder={
                        "Exemplo:\n• orientar a família;\n• reforçar consciência fonológica;\n• revisar leitura de sílabas complexas;\n• trabalhar autonomia nas próximas semanas."
                      }
                    />
                  </div>
                </section>
              </>
            ) : (
              <>
                <label htmlFor="observacaoSala">Observação em sala</label>
                <textarea
                  id="observacaoSala"
                  name="observacaoSala"
                  value={form.observacaoSala}
                  onChange={handleChangeForm}
                  rows={3}
                  required
                />

                <label htmlFor="interacao">Interação</label>
                <textarea
                  id="interacao"
                  name="interacao"
                  value={form.interacao}
                  onChange={handleChangeForm}
                  rows={5}
                  style={{ minHeight: "120px", resize: "vertical", lineHeight: "1.5" }}
                  required
                />

                <label htmlFor="participacao">Participação</label>
                <textarea
                  id="participacao"
                  name="participacao"
                  value={form.participacao}
                  onChange={handleChangeForm}
                  rows={5}
                  style={{ minHeight: "120px", resize: "vertical", lineHeight: "1.5" }}
                  required
                />

                <label htmlFor="comportamento">Comportamento</label>
                <textarea
                  id="comportamento"
                  name="comportamento"
                  value={form.comportamento}
                  onChange={handleChangeForm}
                  rows={5}
                  style={{ minHeight: "120px", resize: "vertical", lineHeight: "1.5" }}
                  required
                />

                <label htmlFor="dificuldadesContextoAula">Dificuldades no contexto da aula</label>
                <textarea
                  id="dificuldadesContextoAula"
                  name="dificuldadesContextoAula"
                  value={form.dificuldadesContextoAula}
                  onChange={handleChangeForm}
                  rows={3}
                />

                <label htmlFor="apoioRecebido">Apoio recebido</label>
                <textarea
                  id="apoioRecebido"
                  name="apoioRecebido"
                  value={form.apoioRecebido}
                  onChange={handleChangeForm}
                  rows={2}
                />
              </>
            )}

            <div className="form-actions">
              <button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : registroEmEdicao ? "Salvar edição" : "Registrar atendimento"}
              </button>
              {registroEmEdicao ? (
                <button type="button" className="btn-secondary" onClick={limparFormulario}>
                  Cancelar edição
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="panel module-list-panel">
          <h2>Histórico de atendimentos</h2>
          {alunoSelecionado ? (
            <p className="muted">
              <strong>Aluno:</strong> {alunoSelecionado.nome}
            </p>
          ) : null}
          <div className="filters-grid">
            <div>
              <label htmlFor="filtroSemanaAtendimento">Semana</label>
              <select
                id="filtroSemanaAtendimento"
                value={filtroSemana}
                onChange={(event) => setFiltroSemana(event.target.value)}
              >
                <option value="">Todas</option>
                {semanasDisponiveis.map((semana) => (
                  <option key={semana} value={semana}>
                    {semana}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingHistorico ? <p>Carregando histórico...</p> : null}
          {!loadingHistorico && atendimentosFiltrados.length === 0 ? (
            <p className="muted">Nenhum atendimento encontrado para os filtros selecionados.</p>
          ) : null}

          {atendimentosFiltrados.map((item) => {
            const ehRegular = resolverModoAtendimento(item) === "REGULAR";
            const observacaoSalaLimpa = String(item.observacaoSala || "").trim();

            return (
              <article key={item.id} className="meta-card">
                <p>
                  <strong>Data:</strong> {formatarData(item.dataAtendimento)} | <strong>Semana:</strong>{" "}
                  {item.semanaReferencia || "-"}
                </p>
                <p>
                  <strong>Presença:</strong> {item.statusPresenca || "-"} | <strong>Tipo:</strong>{" "}
                  {obterRotuloTipoAtendimento(item)}
                </p>
                <p>
                  <strong>Eixo:</strong> {item.eixoTematico || "-"}
                </p>

                {ehRegular ? (
                  <>
                    <p className="report-text">
                      <strong>Interação:</strong> {String(item.interacao || "").trim() || "-"}
                    </p>
                    <p className="report-text">
                      <strong>Participação:</strong> {String(item.participacao || "").trim() || "-"}
                    </p>
                    <p className="report-text">
                      <strong>Comportamento:</strong> {String(item.comportamento || "").trim() || "-"}
                    </p>
                    <p className="report-text">
                      <strong>Dificuldades no contexto da aula:</strong>{" "}
                      {String(item.dificuldadesContextoAula || "").trim() || "-"}
                    </p>
                    <p className="report-text">
                      <strong>Apoio recebido:</strong> {String(item.apoioRecebido || "").trim() || "-"}
                    </p>
                    <p className="report-text">
                      <strong>Observação em sala:</strong> {observacaoSalaLimpa || "-"}
                    </p>
                    <p className="report-text">
                      <strong>Avanços:</strong> {String(item.avancosPercebidos || "").trim() || "-"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="report-text">
                      <strong>Habilidades:</strong> {formatarHabilidadesRegistro(item)}
                    </p>
                    <p className="report-text">
                      <strong>Dificuldades:</strong> {item.dificuldadesObservadas || "-"}
                    </p>
                    <p className="report-text">
                      <strong>Avanços:</strong> {item.avancosPercebidos || "-"}
                    </p>
                    <p className="report-text">
                      <strong>Observações:</strong> {item.observacoes || "-"}
                    </p>
                  </>
                )}

                {String(item.encaminhamentos || "").trim() ? (
                  <p className="report-text">
                    <strong>Encaminhamentos e próximos passos:</strong> {item.encaminhamentos}
                  </p>
                ) : null}

                {podeEditar ? (
                  <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={() => handleEditar(item)}>
                      Editar
                    </button>
                    <button type="button" className="btn-danger" onClick={() => handleExcluir(item)}>
                      Excluir
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>

      <section className="panel">
        <h2>Relatório mensal automático</h2>
        <p className="muted">
          Gera uma síntese mensal com base nos registros semanais do aluno selecionado.
        </p>
        <div className="form-actions">
          <button type="button" onClick={handleGerarSinteseMensal} disabled={gerandoSintese}>
            {gerandoSintese ? "Gerando síntese..." : "Gerar síntese mensal"}
          </button>
        </div>

        {resumoSintese ? (
          <p className="muted">
            Registros considerados: {resumoSintese.totalRegistros} | Aluno:{" "}
            {alunoSelecionado?.nome || "Não selecionado"} | Mês: {filtroMes || "-"}
          </p>
        ) : null}

        {sinteseMensal ? (
          <article className="meta-card">
            <p className="report-text">{sinteseMensal}</p>
          </article>
        ) : null}
      </section>
    </main>
  );
}

export default AtendimentoAEEPage;









