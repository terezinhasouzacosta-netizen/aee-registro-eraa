function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function textoLista(lista = []) {
  const itens = lista.filter(Boolean);
  if (!itens.length) return "";
  if (itens.length === 1) return itens[0];
  if (itens.length === 2) return `${itens[0]} e ${itens[1]}`;
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

function formatarData(data) {
  if (!data) return null;
  if (data?.toDate) return data.toDate();
  const parsed = new Date(data);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function obterData(item, campos = []) {
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
    const data = formatarData(item?.[campo]);
    if (data) return data;
  }
  return null;
}

function extrairBimestreNumero(bimestre) {
  const texto = String(bimestre || "");
  const match = texto.match(/[1-4]/);
  return match ? Number(match[0]) : null;
}

function obterBimestrePorData(data) {
  const base = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(base.getTime())) return null;
  const mes = base.getMonth() + 1;
  if (mes <= 3) return 1;
  if (mes <= 6) return 2;
  if (mes <= 9) return 3;
  return 4;
}

function filtrarPorPeriodo(
  lista = [],
  { bimestreNumero = null, dataInicio = "", dataFim = "", camposData = [] } = {}
) {
  const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
  const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

  return lista.filter((item) => {
    const data = obterData(item, camposData);
    if (!data) return !inicio && !fim;

    if (bimestreNumero) {
      const bimestreItem = item?.bimestre ? extrairBimestreNumero(item.bimestre) : null;
      const bimestreData = bimestreItem || obterBimestrePorData(data);
      if (bimestreData && bimestreData !== bimestreNumero) return false;
    }

    if (inicio && data < inicio) return false;
    if (fim && data > fim) return false;
    return true;
  });
}

function topItens(lista = [], limite = 5) {
  const mapa = new Map();
  lista
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .forEach((item) => mapa.set(item, (mapa.get(item) || 0) + 1));
  return [...mapa.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([item]) => item);
}

function extrairIntervencoesSondagem(sondagem) {
  if (!sondagem) return [];
  const regras = [
    ["leitura", "Leitura e reconhecimento de palavras"],
    ["escrita", "Escrita com apoio"],
    ["comunicacao", "Comunicação oral"],
    ["matematica", "Noções matemáticas funcionais"],
    ["atencaoConcentracao", "Atenção e concentração"],
    ["interacaoSocial", "Interação social"],
    ["autonomia", "Autonomia na realização das atividades"],
    ["comportamento", "Comportamento e autorregulação"],
    ["coordenacaoMotora", "Coordenação motora fina/global"],
  ];

  const precisaIntervencao = (valor) => {
    const texto = normalizarTexto(valor);
    if (!texto) return false;
    const semIntervencao = ["realiza com autonomia", "autonomia satisfatoria", "compreendeu com autonomia"];
    if (semIntervencao.some((item) => texto.includes(item))) return false;
    return /(apoio|parcial|dependenc|ajuda|dificuld)/.test(texto);
  };

  return regras
    .filter(([campo]) => precisaIntervencao(sondagem[campo]))
    .map(([, habilidade]) => habilidade);
}

function detectarPerfilProfissional(item) {
  if (item?.tipoRegistro === "registro_professor") return "regente";

  const texto = normalizarTexto(
    item?.funcaoResponsavel || item?.perfil || item?.autorPerfil || item?.responsavelNome || ""
  );
  if (texto.includes("mediador")) return "mediador";
  if (texto.includes("assistente")) return "assistente";
  if (texto.includes("aee") || texto.includes("srm") || texto.includes("atendimento domiciliar")) return "aee";
  if (item?.tipoRegistro === "diario_bordo") return "mediador";
  return "outros";
}

function resumirAEE(atendimentos = []) {
  if (!atendimentos.length) {
    return "No período analisado, não foram localizados registros da professora do AEE.";
  }
  const eixos = topItens(atendimentos.map((item) => item.eixoTematico), 5);
  const habilidades = topItens(
    atendimentos.flatMap((item) => [
      ...(Array.isArray(item.habilidadesSelecionadas) ? item.habilidadesSelecionadas : []),
      item.habilidadesComplementares,
    ]),
    6
  );
  const dificuldades = topItens(atendimentos.map((item) => item.dificuldadesObservadas), 4);
  const avancos = topItens(atendimentos.map((item) => item.avancosPercebidos), 4);
  const observacoes = topItens(atendimentos.map((item) => item.observacoes), 3);

  return [
    `Nos registros da professora do AEE, constam ${atendimentos.length} atendimento(s) no período.`,
    eixos.length ? `Os eixos temáticos mais recorrentes foram ${textoLista(eixos)}.` : "",
    habilidades.length ? `As habilidades trabalhadas com maior frequência envolveram ${textoLista(habilidades)}.` : "",
    dificuldades.length ? `Entre as dificuldades observadas, destacam-se ${textoLista(dificuldades)}.` : "",
    avancos.length ? `Percebe-se avanço em ${textoLista(avancos)}.` : "",
    observacoes.length ? `As observações recorrentes indicam ${textoLista(observacoes)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function resumirMediadores(registros = []) {
  if (!registros.length) {
    return "No período analisado, não foram localizados registros de mediadores.";
  }
  const participacao = topItens(registros.map((item) => item.participacao), 4);
  const apoio = topItens(registros.map((item) => item.atencaoPermanencia || item.resultadoIntervencao), 4);
  const autonomia = topItens(registros.map((item) => item.autonomia), 4);
  const comportamento = topItens(registros.map((item) => item.comportamento || item.observacaoGeral), 3);
  const interacao = topItens(registros.map((item) => item.interacaoSocial), 4);

  return [
    `No conjunto de ${registros.length} registro(s) dos mediadores, observa-se acompanhamento contínuo da participação do aluno em sala.`,
    participacao.length ? `A participação foi descrita principalmente como ${textoLista(participacao)}.` : "",
    apoio.length ? `Quanto ao apoio necessário, os registros apontam ${textoLista(apoio)}.` : "",
    autonomia.length ? `No que se refere à autonomia, destacam-se os seguintes indicadores: ${textoLista(autonomia)}.` : "",
    comportamento.length ? `Em relação ao comportamento, os relatos evidenciam ${textoLista(comportamento)}.` : "",
    interacao.length ? `A interação social foi caracterizada por ${textoLista(interacao)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function resumirAssistente(registros = []) {
  if (!registros.length) {
    return "No período analisado, não foram localizados registros do assistente educacional.";
  }
  const rotina = topItens(registros.map((item) => item.tipoAtividade || item.observacaoGeral), 4);
  const apoio = topItens(registros.map((item) => item.estrategiasUtilizadas?.join(", ")), 4);
  const autonomia = topItens(registros.map((item) => item.autonomia), 4);
  const participacao = topItens(registros.map((item) => item.participacao), 4);
  const observacoes = topItens(registros.map((item) => item.observacaoGeral), 3);

  return [
    `Foram identificados ${registros.length} registro(s) do assistente educacional no período.`,
    rotina.length ? `No âmbito da rotina funcional, predominam observações relacionadas a ${textoLista(rotina)}.` : "",
    apoio.length ? `O apoio prestado foi descrito por estratégias como ${textoLista(apoio)}.` : "",
    autonomia.length ? `Quanto à autonomia, os registros indicam ${textoLista(autonomia)}.` : "",
    participacao.length ? `A participação do aluno foi descrita como ${textoLista(participacao)}.` : "",
    observacoes.length ? `As observações gerais sinalizam ${textoLista(observacoes)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function resumirRegentes(registros = []) {
  if (!registros.length) {
    return "No período analisado, não foram localizados registros dos professores regentes.";
  }
  const desempenho = topItens(registros.map((item) => item.desenvolvimentoDisciplina), 4);
  const participacao = topItens(registros.map((item) => item.participacaoDisciplina), 4);
  const compreensao = topItens(registros.map((item) => item.compreensaoConteudo), 4);
  const dificuldades = topItens(registros.map((item) => item.dificuldadesObservadas), 4);
  const avancos = topItens(registros.map((item) => item.estrategiasQueFuncionaram), 4);
  const adaptacoes = topItens(registros.flatMap((item) => item.marcadoresIntervencao || []), 5);

  return [
    `Nos ${registros.length} registro(s) dos professores regentes, há evidências sobre desempenho pedagógico e participação em sala.`,
    desempenho.length ? `Em termos de desempenho nas atividades, destacam-se ${textoLista(desempenho)}.` : "",
    participacao.length ? `Quanto à participação em sala, os registros apontam ${textoLista(participacao)}.` : "",
    compreensao.length ? `A compreensão dos conteúdos foi descrita como ${textoLista(compreensao)}.` : "",
    dificuldades.length ? `As dificuldades recorrentes concentram-se em ${textoLista(dificuldades)}.` : "",
    avancos.length ? `Os avanços percebidos e estratégias efetivas envolveram ${textoLista(avancos)}.` : "",
    adaptacoes.length ? `As adaptações pedagógicas mais citadas foram ${textoLista(adaptacoes)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function analiseIntegrada({ dificuldades, avancos, resumoSondagem, semDados }) {
  if (semDados) {
    return "No período selecionado, os dados disponíveis são insuficientes para uma análise multidisciplinar robusta. Recomenda-se ampliar os registros das diferentes frentes de acompanhamento para consolidar diagnósticos pedagógicos mais precisos.";
  }

  const dificuldadesComuns = topItens(dificuldades, 5);
  const avancosComuns = topItens(avancos, 5);
  const prioridades = resumoSondagem.intervencoesPrioritarias || [];

  return [
    dificuldadesComuns.length
      ? `De modo geral, os registros evidenciam recorrência de dificuldades em ${textoLista(dificuldadesComuns)}, aspecto observado em mais de um contexto de atendimento.`
      : "De modo geral, não foram identificadas dificuldades recorrentes entre os diferentes profissionais no período.",
    avancosComuns.length
      ? `Também se verifica convergência entre os profissionais quanto a avanços em ${textoLista(avancosComuns)}, sinalizando resposta positiva às intervenções propostas.`
      : "Ainda não há recorrência suficiente de avanços descritos por múltiplos profissionais para consolidar uma tendência evolutiva ampla.",
    prioridades.length
      ? `No que se refere às necessidades prioritárias, recomenda-se manter foco em ${textoLista(prioridades)}, articulando objetivos comuns entre AEE, sala regular e equipe de apoio.`
      : "As necessidades pedagógicas devem seguir sendo revisadas periodicamente para alinhar as estratégias interdisciplinares ao perfil atual do aluno.",
  ]
    .filter(Boolean)
    .join(" ");
}

function gerarEncaminhamentos({ resumoSondagem, totalRegistros }) {
  const prioridades = resumoSondagem.intervencoesPrioritarias || [];
  if (!totalRegistros) {
    return "Recomenda-se a continuidade do acompanhamento com registros sistemáticos pelos diferentes profissionais, a fim de consolidar um plano pedagógico integrado.";
  }

  return [
    "Recomenda-se a continuidade do acompanhamento pedagógico com monitoramento sistemático das metas definidas.",
    prioridades.length
      ? `Sugere-se reforço intencional das habilidades relacionadas a ${textoLista(prioridades)}.`
      : "Sugere-se manter o reforço das habilidades em desenvolvimento já observadas no período.",
    "As estratégias que apresentaram melhor resposta devem ser mantidas, com revisão periódica de efetividade.",
    "É importante fortalecer a articulação entre AEE, sala regular, mediador, assistente educacional e coordenação pedagógica para garantir coerência nas intervenções.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function gerarRelatorioMultidisciplinarAutomatico({
  escola = {},
  aluno = {},
  periodo = {},
  sondagens = [],
  atendimentosAEE = [],
  acompanhamentos = [],
  monitoramentos = [],
}) {
  const bimestreNumero = extrairBimestreNumero(periodo.bimestre);
  const filtroBase = {
    bimestreNumero,
    dataInicio: periodo.dataInicio || "",
    dataFim: periodo.dataFim || "",
  };

  const sondagensFiltradas = filtrarPorPeriodo(sondagens, {
    ...filtroBase,
    camposData: ["dataSondagem", "updatedAt", "createdAt", "atualizadoEm", "criadoEm"],
  });
  const atendimentosFiltrados = filtrarPorPeriodo(atendimentosAEE, {
    ...filtroBase,
    camposData: ["dataAtendimento", "updatedAt", "createdAt"],
  });
  const acompanhamentosFiltrados = filtrarPorPeriodo(acompanhamentos, {
    ...filtroBase,
    camposData: ["dataRegistro", "updatedAt", "createdAt"],
  });
  const monitoramentosFiltrados = filtrarPorPeriodo(monitoramentos, {
    ...filtroBase,
    camposData: ["dataRegistro", "updatedAt", "createdAt"],
  });

  const sondagemMaisRecente = [...sondagensFiltradas].sort((a, b) => {
    const dataA = obterData(a, ["dataSondagem", "updatedAt", "createdAt"])?.getTime() || 0;
    const dataB = obterData(b, ["dataSondagem", "updatedAt", "createdAt"])?.getTime() || 0;
    return dataB - dataA;
  })[0];

  const intervencoesPrioritarias = extrairIntervencoesSondagem(sondagemMaisRecente);
  const potencialidades = [
    ["leitura", "Leitura"],
    ["escrita", "Escrita"],
    ["comunicacao", "Comunicação"],
    ["matematica", "Matemática"],
    ["atencaoConcentracao", "Atenção e concentração"],
    ["interacaoSocial", "Interação social"],
    ["autonomia", "Autonomia"],
    ["comportamento", "Comportamento"],
  ]
    .filter(([campo]) => normalizarTexto(sondagemMaisRecente?.[campo]).includes("autonomia"))
    .map(([, rotulo]) => rotulo);

  const diarios = acompanhamentosFiltrados.filter((item) => item.tipoRegistro === "diario_bordo");
  const professoresRegentes = acompanhamentosFiltrados.filter(
    (item) => item.tipoRegistro === "registro_professor"
  );

  const registrosMediador = diarios.filter((item) => detectarPerfilProfissional(item) === "mediador");
  const registrosAssistente = diarios.filter((item) => detectarPerfilProfissional(item) === "assistente");
  const registrosAEEViaDiario = diarios.filter((item) => detectarPerfilProfissional(item) === "aee");

  const resumoSondagem = {
    texto: sondagemMaisRecente
      ? [
          intervencoesPrioritarias.length
            ? `A sondagem diagnóstica mais recente indica maior necessidade de intervenção em ${textoLista(intervencoesPrioritarias)}.`
            : "A sondagem diagnóstica disponível não evidencia áreas críticas acentuadas no período analisado.",
          sondagemMaisRecente.observacoes
            ? `Nos registros de observação, destaca-se: ${String(sondagemMaisRecente.observacoes).trim()}.`
            : "",
          potencialidades.length
            ? `Em contrapartida, observam-se potencialidades em ${textoLista(potencialidades)}.`
            : "",
        ]
          .filter(Boolean)
          .join(" ")
      : "Não há sondagem diagnóstica registrada no período selecionado.",
    intervencoesPrioritarias,
  };

  const resumoAEE = resumirAEE([...atendimentosFiltrados, ...registrosAEEViaDiario]);
  const resumoMediadores = resumirMediadores(registrosMediador);
  const resumoAssistente = resumirAssistente(registrosAssistente);
  const resumoRegentes = resumirRegentes(professoresRegentes);

  const dificuldadesGlobais = [
    ...atendimentosFiltrados.map((item) => item.dificuldadesObservadas),
    ...registrosMediador.map((item) => item.dificuldadesObservadas),
    ...registrosAssistente.map((item) => item.dificuldadesObservadas),
    ...professoresRegentes.map((item) => item.dificuldadesObservadas),
    ...monitoramentosFiltrados.map((item) => item.dificuldades),
  ].filter(Boolean);

  const avancosGlobais = [
    ...atendimentosFiltrados.map((item) => item.avancosPercebidos),
    ...registrosMediador.map((item) => item.avancosPercebidos),
    ...registrosAssistente.map((item) => item.avancosPercebidos),
    ...professoresRegentes.map((item) => item.desenvolvimentoDisciplina),
    ...monitoramentosFiltrados.map((item) => item.avancos),
  ].filter(Boolean);

  const profissionaisEnvolvidos = Array.from(
    new Set(
      [
        ...atendimentosFiltrados.map((item) => item.responsavelNome),
        ...acompanhamentosFiltrados.map((item) => item.responsavelNome || item.professorNome),
        ...monitoramentosFiltrados.map((item) => item.responsavelRegistro),
      ]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );

  const totalRegistrosConsiderados =
    sondagensFiltradas.length +
    atendimentosFiltrados.length +
    acompanhamentosFiltrados.length +
    monitoramentosFiltrados.length;

  const analiseMultidisciplinar = analiseIntegrada({
    dificuldades: dificuldadesGlobais,
    avancos: avancosGlobais,
    resumoSondagem,
    semDados: totalRegistrosConsiderados === 0,
  });

  const encaminhamentos = gerarEncaminhamentos({
    resumoSondagem,
    totalRegistros: totalRegistrosConsiderados,
  });

  const periodoLabel =
    periodo.dataInicio || periodo.dataFim
      ? `${periodo.dataInicio || "-"} a ${periodo.dataFim || "-"}`
      : `${periodo.bimestre || "Período não informado"}`;

  const secao1 = [
    `Nome da escola: ${escola.nomeEscola || "-"}.`,
    `Município: ${escola.municipio || "-"}.`,
    `Localização: ${escola.localizacao || "-"}.`,
    `Nome do aluno: ${aluno.nome || "-"}.`,
    `Data de nascimento: ${aluno.dataNascimento || "-"}.`,
    `Série/ano ou turma: ${aluno.turma || escola.serieAno || "-"}.`,
    `Turno: ${aluno.turno || escola.turno || "-"}.`,
    `Diagnóstico/laudo: ${escola.laudo || "Não informado"}.`,
    `Responsáveis: ${textoLista([escola.pai, escola.mae].filter(Boolean)) || "Não informado"}.`,
    `Profissionais envolvidos no acompanhamento: ${textoLista(profissionaisEnvolvidos) || "Não identificado no período"}.`,
    `Período analisado: ${periodoLabel}.`,
  ].join(" ");

  const texto = [
    `1. DADOS DE IDENTIFICAÇÃO\n${secao1}`,
    `2. SÍNTESE DIAGNÓSTICA INICIAL\n${resumoSondagem.texto}`,
    `3. REGISTROS DA PROFESSORA DO AEE\n${resumoAEE}`,
    `4. REGISTROS DOS MEDIADORES\n${resumoMediadores}`,
    `5. REGISTROS DO ASSISTENTE EDUCACIONAL\n${resumoAssistente}`,
    `6. REGISTROS DOS PROFESSORES REGENTES\n${resumoRegentes}`,
    `7. ANÁLISE MULTIDISCIPLINAR INTEGRADA\n${analiseMultidisciplinar}`,
    `8. ENCAMINHAMENTOS PEDAGÓGICOS\n${encaminhamentos}`,
  ].join("\n\n");

  return {
    texto,
    detalhes: {
      totalRegistrosConsiderados,
      profissionaisEnvolvidos,
      fontes: {
        sondagens: sondagensFiltradas.length,
        atendimentosAEE: atendimentosFiltrados.length,
        acompanhamentos: acompanhamentosFiltrados.length,
        monitoramentos: monitoramentosFiltrados.length,
      },
      periodoLabel,
    },
  };
}

