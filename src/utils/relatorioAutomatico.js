function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function extrairNumeroBimestre(valor) {
  const texto = String(valor || "");
  const match = texto.match(/[1-4]/);
  return match ? Number(match[0]) : null;
}

function bimestrePorData(data) {
  const base = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(base.getTime())) return null;
  const mes = base.getMonth() + 1;
  if (mes <= 3) return 1;
  if (mes <= 6) return 2;
  if (mes <= 9) return 3;
  return 4;
}

function obterDataItem(item, campos = []) {
  const candidatos = [
    ...campos,
    "dataRegistro",
    "dataSondagem",
    "dataAtendimento",
    "updatedAt",
    "createdAt",
    "atualizadoEm",
    "criadoEm",
  ];

  for (const campo of candidatos) {
    const valor = item?.[campo];
    if (!valor) continue;
    if (valor?.toDate) {
      const dt = valor.toDate();
      if (!Number.isNaN(dt.getTime())) return dt;
      continue;
    }
    const dt = new Date(valor);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  return null;
}

function filtrarPorBimestre(lista = [], bimestreNumero, camposData = []) {
  if (!bimestreNumero) return lista;
  return lista.filter((item) => {
    if (item?.bimestre) {
      const b = extrairNumeroBimestre(item.bimestre);
      if (b) return b === bimestreNumero;
    }
    const data = obterDataItem(item, camposData);
    if (!data) return true;
    return bimestrePorData(data) === bimestreNumero;
  });
}

const RESULTADOS_DIFICULDADE = new Set([
  "realiza com muito apoio",
  "realiza com apoio",
  "realiza parcialmente",
  "alta dependencia",
  "compreendeu com muita ajuda",
  "manteve-se com apoio constante",
  "respondeu parcialmente",
]);

const CAMPOS_SONDAGEM = [
  { campo: "leitura", rotulo: "Leitura" },
  { campo: "escrita", rotulo: "Escrita" },
  { campo: "comunicacao", rotulo: "Comunicação" },
  { campo: "matematica", rotulo: "Matemática" },
  { campo: "atencaoConcentracao", rotulo: "Atenção e concentração" },
  { campo: "interacaoSocial", rotulo: "Interação social" },
  { campo: "autonomia", rotulo: "Autonomia" },
  { campo: "comportamento", rotulo: "Comportamento" },
];

function textoLista(lista = []) {
  const itens = lista.filter(Boolean);
  if (!itens.length) return "";
  if (itens.length === 1) return itens[0];
  if (itens.length === 2) return `${itens[0]} e ${itens[1]}`;
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
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

function reduzirRepeticoes(texto) {
  return String(texto || "")
    .replace(/(\bque\b\s+){2,}/gi, "que ")
    .replace(/(\bde\b\s+){2,}/gi, "de ")
    .replace(/(\bo aluno\b[\s,]+){2,}/gi, "o aluno ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function coesaoParagrafos(paragrafos = []) {
  const conectivos = [
    "Além disso,",
    "No mesmo sentido,",
    "Sob essa perspectiva,",
    "Paralelamente,",
    "Com base nesses registros,",
    "Em complemento,",
  ];

  return paragrafos
    .map((item) => reduzirRepeticoes(finalizarPontuacao(capitalizarPrimeira(item))))
    .filter(Boolean)
    .map((item, index) => {
      if (index === 0) return item;
      const jaTemConectivo = /^(al[eé]m disso|no mesmo sentido|sob essa perspectiva|paralelamente|com base nesses registros|em complemento)/i.test(
        item
      );
      if (jaTemConectivo) return item;
      const conectivo = conectivos[(index - 1) % conectivos.length];
      return `${conectivo} ${item.charAt(0).toLowerCase()}${item.slice(1)}`;
    })
    .join("\n\n");
}

export function resumirSondagem(sondagens = [], bimestreNumero) {
  const base = filtrarPorBimestre(sondagens, bimestreNumero, ["dataSondagem", "updatedAt", "createdAt"]);
  if (!base.length) {
    return {
      texto: "Não há sondagem diagnóstica registrada para o período selecionado.",
      totalDificuldades: 0,
      camposComDificuldade: [],
    };
  }

  const maisRecente = [...base].sort((a, b) => {
    const dataA = obterDataItem(a, ["dataSondagem", "updatedAt", "createdAt"])?.getTime() || 0;
    const dataB = obterDataItem(b, ["dataSondagem", "updatedAt", "createdAt"])?.getTime() || 0;
    return dataB - dataA;
  })[0];

  const camposComDificuldade = CAMPOS_SONDAGEM.filter(({ campo }) =>
    RESULTADOS_DIFICULDADE.has(normalizarTexto(maisRecente?.[campo]))
  ).map((item) => item.rotulo);

  const texto =
    camposComDificuldade.length > 0
      ? `A sondagem diagnóstica mais recente aponta necessidade de intervenção em ${textoLista(camposComDificuldade)}.`
      : "A sondagem diagnóstica disponível não indica comprometimentos acentuados no período analisado.";

  return {
    texto,
    totalDificuldades: camposComDificuldade.length,
    camposComDificuldade,
  };
}

export function resumirHabilidades(metas = [], bimestreNumero) {
  const base = filtrarPorBimestre(metas, bimestreNumero, ["updatedAt", "createdAt"]);
  if (!base.length) {
    return {
      texto: "Não há habilidades pedagógicas cadastradas para o período selecionado.",
      totais: { andamento: 0, pausadas: 0, concluidas: 0 },
    };
  }

  const emAndamento = base.filter((item) => normalizarTexto(item.status).includes("andamento"));
  const pausadas = base.filter((item) => normalizarTexto(item.status).includes("paus"));
  const concluidas = base.filter((item) => normalizarTexto(item.status).includes("conclu"));
  const eixos = Array.from(
    new Set(base.map((item) => String(item.titulo || "").trim()).filter(Boolean))
  ).slice(0, 6);

  const texto = [
    `Foram registradas ${base.length} habilidades pedagógicas no período.`,
    eixos.length ? `Os eixos mais presentes incluem ${textoLista(eixos)}.` : "",
    emAndamento.length ? `${emAndamento.length} habilidade(s) permanecem em andamento.` : "",
    pausadas.length
      ? `${pausadas.length} habilidade(s) encontram-se pausadas e demandam revisão de estratégia.`
      : "",
    concluidas.length ? `${concluidas.length} habilidade(s) apresentam indicativo de consolidação.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    texto,
    totais: {
      andamento: emAndamento.length,
      pausadas: pausadas.length,
      concluidas: concluidas.length,
    },
  };
}

export function resumirAtendimentosAEE(atendimentos = [], bimestreNumero) {
  const base = filtrarPorBimestre(atendimentos, bimestreNumero, ["dataAtendimento", "updatedAt", "createdAt"]);
  if (!base.length) {
    return {
      texto: "Não há registros de atendimento AEE para o período selecionado.",
      total: 0,
    };
  }

  const presencas = base.filter((item) => normalizarTexto(item.statusPresenca) === "presente").length;
  const ausencias = base.length - presencas;
  const dificuldades = base.map((item) => item.dificuldadesObservadas).filter(Boolean).slice(0, 3);
  const avancos = base.map((item) => item.avancosPercebidos).filter(Boolean).slice(0, 3);

  const texto = [
    `No Atendimento AEE, há ${base.length} registro(s) no período, com ${presencas} presença(s) e ${ausencias} ausência(s).`,
    avancos.length ? `Entre os avanços mais recorrentes, destacam-se: ${textoLista(avancos)}.` : "",
    dificuldades.length ? `As dificuldades observadas concentram-se em: ${textoLista(dificuldades)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { texto, total: base.length };
}

export function resumirAcompanhamento(acompanhamentos = [], bimestreNumero) {
  const base = filtrarPorBimestre(acompanhamentos, bimestreNumero, ["dataRegistro", "updatedAt", "createdAt"]);
  if (!base.length) {
    return {
      texto: "Não há registros de acompanhamento pedagógico no período selecionado.",
      total: 0,
      sinteseMensal: "",
    };
  }

  const diarioBordo = base.filter((item) => item.tipoRegistro === "diario_bordo").length;
  const registroProfessor = base.filter((item) => item.tipoRegistro === "registro_professor").length;
  const sintese = [...base]
    .filter((item) => item.tipoRegistro === "sintese")
    .sort((a, b) => {
      const dataA = obterDataItem(a, ["updatedAt", "createdAt"])?.getTime() || 0;
      const dataB = obterDataItem(b, ["updatedAt", "createdAt"])?.getTime() || 0;
      return dataB - dataA;
    })[0];

  const texto = [
    `Foram identificados ${base.length} registro(s) de acompanhamento pedagógico.`,
    diarioBordo ? `${diarioBordo} registro(s) de diário de bordo.` : "",
    registroProfessor ? `${registroProfessor} registro(s) do professor regente.` : "",
    sintese?.texto ? "Há síntese mensal registrada, incorporada à análise final." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    texto,
    total: base.length,
    sinteseMensal: String(sintese?.texto || "").trim(),
  };
}

export function resumirMonitoramento(monitoramentos = [], bimestreNumero) {
  const base = filtrarPorBimestre(monitoramentos, bimestreNumero, ["dataRegistro", "updatedAt", "createdAt"]);
  if (!base.length) {
    return {
      texto: "Não há registros de monitoramento para o período selecionado.",
      total: 0,
    };
  }

  const eixos = Array.from(
    new Set(
      base
        .map((item) => item.eixoObservado || item.eixoTematico || item.eixo)
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 6);

  const texto = [
    `Foram registrados ${base.length} monitoramento(s) pedagógico(s) no período.`,
    eixos.length ? `Os eixos observados com maior frequência foram ${textoLista(eixos)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { texto, total: base.length };
}

export function montarIntroducao({ aluno, bimestre }) {
  const nomeAluno = aluno?.nome || "o estudante";
  const turma = aluno?.turma ? `, da turma ${aluno.turma}` : "";
  const turno = aluno?.turno ? `, no turno ${aluno.turno}` : "";

  return `Este relatório pedagógico apresenta a análise do desenvolvimento de ${nomeAluno}${turma}${turno}, no ${bimestre} bimestre. O documento tem como objetivo consolidar os registros disponíveis no sistema e subsidiar decisões pedagógicas quanto às intervenções necessárias para o processo de aprendizagem.`;
}

export function montarDesenvolvimento({
  resumoSondagem,
  resumoHabilidades,
  resumoAtendimentosAEE,
  resumoAcompanhamento,
  resumoMonitoramento,
  sinteseMensal,
}) {
  const paragrafoDiagnostico = [
    resumoSondagem?.texto,
    "A leitura desses dados permite compreender com maior precisão as necessidades educacionais atuais e orientar a definição de prioridades no planejamento.",
  ]
    .filter(Boolean)
    .join(" ");

  const paragrafoIntervencoes = [
    resumoHabilidades?.texto,
    resumoAtendimentosAEE?.texto,
    "Observa-se, portanto, que as ações pedagógicas vêm sendo organizadas para favorecer a participação do estudante e ampliar as oportunidades de aprendizagem no contexto escolar.",
  ]
    .filter(Boolean)
    .join(" ");

  const paragrafoAcompanhamento = [
    resumoAcompanhamento?.texto,
    resumoMonitoramento?.texto,
    sinteseMensal ? `Como síntese mensal disponível, destaca-se: ${sinteseMensal}` : "",
    "Esse conjunto de evidências reforça a importância do acompanhamento contínuo, com ajustes metodológicos coerentes com a evolução observada ao longo do período.",
  ]
    .filter(Boolean)
    .join(" ");

  return coesaoParagrafos([
    paragrafoDiagnostico,
    paragrafoIntervencoes,
    paragrafoAcompanhamento,
  ]);
}

export function montarConclusao({
  aluno,
  resumoSondagem,
  resumoHabilidades,
  resumoAtendimentosAEE,
  resumoAcompanhamento,
}) {
  const nomeAluno = aluno?.nome || "o estudante";
  const semDadosCriticos =
    resumoSondagem.totalDificuldades === 0 &&
    resumoHabilidades.totais.pausadas === 0 &&
    resumoAtendimentosAEE.total > 0 &&
    resumoAcompanhamento.total > 0;

  const linhaEvolucao = semDadosCriticos
    ? `${nomeAluno} apresenta evolução pedagógica acompanhada no período, com indicadores de progresso e manutenção de estratégias que têm favorecido sua aprendizagem.`
    : `${nomeAluno} ainda demanda continuidade e fortalecimento das intervenções pedagógicas, com acompanhamento sistemático e revisão periódica das estratégias aplicadas.`;

  const linhaArticulacao =
    "Destaca-se a necessidade de manter o trabalho articulado entre professor(a) do AEE, professor(a) regente, mediador, assistente educacional e coordenação pedagógica, assegurando coerência entre as ações e acompanhamento permanente dos resultados.";

  return coesaoParagrafos([linhaEvolucao, linhaArticulacao]);
}

export function gerarRelatorioAutomaticoCompleto({
  aluno,
  bimestre,
  sondagens = [],
  metas = [],
  acompanhamentos = [],
  atendimentosAEE = [],
  monitoramentos = [],
  sinteseMensal = "",
}) {
  const bimestreNumero = extrairNumeroBimestre(bimestre);
  const resumoSondagem = resumirSondagem(sondagens, bimestreNumero);
  const resumoHabilidades = resumirHabilidades(metas, bimestreNumero);
  const resumoAtendimentosAEE = resumirAtendimentosAEE(atendimentosAEE, bimestreNumero);
  const resumoAcompanhamento = resumirAcompanhamento(acompanhamentos, bimestreNumero);
  const resumoMonitoramento = resumirMonitoramento(monitoramentos, bimestreNumero);

  const introducao = montarIntroducao({ aluno, bimestre });
  const desenvolvimento = montarDesenvolvimento({
    resumoSondagem,
    resumoHabilidades,
    resumoAtendimentosAEE,
    resumoAcompanhamento,
    resumoMonitoramento,
    sinteseMensal: String(sinteseMensal || resumoAcompanhamento.sinteseMensal || "").trim(),
  });
  const conclusao = montarConclusao({
    aluno,
    resumoSondagem,
    resumoHabilidades,
    resumoAtendimentosAEE,
    resumoAcompanhamento,
  });

  const textoFinal = [
    `1. Introdução\n${introducao}`,
    `2. Desenvolvimento\n${desenvolvimento}`,
    `3. Conclusão\n${conclusao}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    texto: textoFinal,
    detalhes: {
      resumoSondagem,
      resumoHabilidades,
      resumoAtendimentosAEE,
      resumoAcompanhamento,
      resumoMonitoramento,
    },
  };
}
