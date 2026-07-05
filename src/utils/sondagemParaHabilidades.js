const EIXOS_PERSISTIDOS = [
  {
    campo: "comunicacao",
    eixo: "Comunicação e Linguagem",
    rotulo: "Comunicação e Linguagem",
    grupoDuplicidade: "comunicacao-e-linguagem",
    aliasesDuplicidade: ["Comunicação oral"],
    descricaoBase:
      "Ampliar a comunicação funcional do estudante com mediação intencional, apoio visual e oportunidades estruturadas de expressão, compreensão e participação nas interações escolares.",
    sugestoes: [
      "Compreender instruções simples e progressivamente mais complexas com apoio verbal, visual e mediação do professor.",
      "Expressar desejos, necessidades e ideias em situações escolares por meio da linguagem oral, gestual ou comunicação alternativa, quando necessário.",
      "Participar de diálogos e responder perguntas com ampliação gradual da autonomia comunicativa em diferentes contextos pedagógicos.",
    ],
  },
  {
    campo: "interacaoSocial",
    eixo: "Interação Social",
    rotulo: "Interação Social",
    grupoDuplicidade: "interacao-social",
    aliasesDuplicidade: ["Interação social"],
    descricaoBase:
      "Promover interação social com mediação progressiva, combinados de convivência e situações colaborativas que favoreçam participação, solicitação de ajuda e comunicação respeitosa.",
    sugestoes: [
      "Interagir com colegas e adultos em atividades mediadas, respeitando turnos, combinados e situações de cooperação.",
      "Participar de propostas em dupla ou grupo com apoio para compartilhamento de materiais, solicitação de ajuda e manutenção da convivência.",
      "Desenvolver repertório de interação social funcional em diferentes momentos da rotina escolar com mediação gradual.",
    ],
  },
  {
    campo: "comportamento",
    eixo: "Convivência e Autorregulação",
    rotulo: "Convivência e Autorregulação",
    grupoDuplicidade: "convivencia-autorregulacao",
    aliasesDuplicidade: ["Comportamento e autorregulação"],
    descricaoBase:
      "Desenvolver autorregulação e convivência escolar com rotina estruturada, antecipação de situações, combinados claros e estratégias graduais para lidar com frustrações e permanecer nas atividades.",
    sugestoes: [
      "Lidar com mudanças de rotina, frustrações e orientações do adulto por meio de estratégias de autorregulação e mediação pedagógica.",
      "Permanecer nas atividades propostas com apoio gradual para controle de impulsos, organização do comportamento e aceitação de combinados.",
      "Utilizar estratégias de regulação emocional para retomar a participação em situações desafiadoras da rotina escolar.",
    ],
  },
  {
    campo: "autonomia",
    eixo: "Alimentação, Higiene e Autonomia Pessoal",
    rotulo: "Alimentação, Higiene e Autonomia Pessoal",
    grupoDuplicidade: "alimentacao-higiene-autonomia-pessoal",
    aliasesDuplicidade: ["Autonomia nas atividades", "Autonomia"],
    descricaoBase:
      "Estimular autonomia pessoal nas rotinas de alimentação, higiene e autocuidado com apoio graduado, pistas visuais e retirada progressiva de ajuda conforme o perfil do estudante.",
    sugestoes: [
      "Realizar rotinas de alimentação, higiene e autocuidado com ampliação gradual da autonomia e redução progressiva de ajuda.",
      "Organizar pertences pessoais e utilizar materiais de cuidado diário com apoio visual, mediação e reforço positivo.",
      "Solicitar ajuda de forma funcional e participar das rotinas de autonomia pessoal conforme sua faixa etária e necessidades educacionais.",
    ],
  },
  {
    campo: "coordenacaoMotora",
    eixo: "Coordenação Motora",
    rotulo: "Coordenação Motora",
    grupoDuplicidade: "coordenacao-motora",
    aliasesDuplicidade: ["Coordenação motora"],
    descricaoBase:
      "Estimular coordenação motora fina e ampla em atividades escolares e funcionais, com propostas graduadas que favoreçam organização corporal, equilíbrio e manipulação de materiais.",
    sugestoes: [
      "Desenvolver preensão, traçado, recorte e manipulação de materiais pequenos com apoio gradual e estratégias psicomotoras.",
      "Participar de atividades de coordenação motora ampla com foco em equilíbrio, deslocamento orientado e organização corporal.",
      "Aprimorar a coordenação motora para favorecer participação em tarefas de escrita, pintura, colagem e demais atividades escolares.",
    ],
  },
  {
    campo: "leitura",
    eixo: "Leitura",
    rotulo: "Leitura",
    grupoDuplicidade: "leitura-escrita",
    aliasesDuplicidade: ["Leitura e escrita"],
    descricaoBase:
      "Ampliar competências de leitura com mediação pedagógica, apoio visual, atividades graduadas de reconhecimento e compreensão e oportunidades de uso funcional da leitura.",
    sugestoes: [
      "Reconhecer letras, palavras e referências visuais do cotidiano escolar com apoio visual e mediação gradual.",
      "Realizar leitura mediada de sílabas, palavras, frases e pequenos textos com estratégias de compreensão e repetição guiada.",
      "Localizar informações em textos, imagens e enunciados curtos com apoio de perguntas objetivas e pistas graduais.",
    ],
  },
  {
    campo: "escrita",
    eixo: "Escrita",
    rotulo: "Escrita",
    grupoDuplicidade: "leitura-escrita",
    aliasesDuplicidade: ["Leitura e escrita"],
    descricaoBase:
      "Desenvolver produção escrita com apoio visual, modelagem, segmentação de etapas e ampliação gradual da autonomia no registro de palavras, frases e ideias.",
    sugestoes: [
      "Escrever o próprio nome, letras, palavras e frases com apoio visual, modelagem e organização por etapas.",
      "Produzir registros escritos com banco de palavras, pistas graduais e mediação pedagógica conforme a necessidade do estudante.",
      "Organizar ideias por escrito, utilizando recursos de apoio para espaçamento, legibilidade e ampliação progressiva da autonomia.",
    ],
  },
  {
    campo: "atencaoConcentracao",
    eixo: "Atenção e Funções Executivas",
    rotulo: "Atenção e Funções Executivas",
    grupoDuplicidade: "atencao-funcoes-executivas",
    aliasesDuplicidade: ["Atenção e concentração"],
    descricaoBase:
      "Fortalecer atenção, permanência, organização e autorregulação nas tarefas escolares com rotina estruturada, metas curtas, apoio visual e estratégias de retomada do foco.",
    sugestoes: [
      "Manter atenção em atividades curtas e progressivamente mais longas com apoio visual, previsibilidade e mediação do professor.",
      "Iniciar, organizar e concluir tarefas com estratégias de sequenciamento, redirecionamento gradual e acompanhamento da rotina.",
      "Desenvolver foco atencional, retomada após interrupções e conferência da atividade com apoio estruturado e retirada progressiva de ajuda.",
    ],
  },
  {
    campo: "matematica",
    eixo: "Raciocínio Lógico-Matemático",
    rotulo: "Raciocínio Lógico-Matemático",
    grupoDuplicidade: "raciocinio-logico-matematico",
    aliasesDuplicidade: ["Matemática funcional"],
    descricaoBase:
      "Consolidar noções lógico-matemáticas com atividades contextualizadas, uso de material concreto e mediação pedagógica para ampliar compreensão, aplicação funcional e resolução de problemas.",
    sugestoes: [
      "Reconhecer números, quantidades, sequências e relações lógico-matemáticas com apoio concreto e visual.",
      "Resolver situações-problema simples utilizando estratégias guiadas, material manipulável e linguagem matemática funcional.",
      "Desenvolver noções de cálculo, tempo, medidas e uso funcional de valores em atividades contextualizadas do cotidiano escolar.",
    ],
  },
];

const RESULTADOS_INTERVENCAO = new Set([
  "nao realiza",
  "realiza com muito apoio",
  "realiza com apoio",
  "realiza parcialmente",
]);

const RESULTADOS_INTERVENCAO_LEGADOS = new Set([
  "alta dependencia",
  "compreendeu com muita ajuda",
  "manteve-se com apoio constante",
  "respondeu parcialmente",
]);

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function resultadoIndicaIntervencao(valor) {
  const texto = normalizarTexto(valor);
  if (!texto) return false;

  if (RESULTADOS_INTERVENCAO.has(texto)) return true;
  if (RESULTADOS_INTERVENCAO_LEGADOS.has(texto)) return true;

  return (
    texto.includes("nao realiza") ||
    texto.includes("realiza com muito apoio") ||
    texto.includes("realiza com apoio") ||
    texto.includes("realiza parcialmente")
  );
}

function obterTimestamp(sondagem) {
  const candidatos = [
    sondagem?.atualizadoEm,
    sondagem?.criadoEm,
    sondagem?.updatedAt,
    sondagem?.createdAt,
    sondagem?.dataSondagem,
  ];

  for (const item of candidatos) {
    if (!item) continue;
    if (item?.toDate) return item.toDate().getTime();
    const parsed = new Date(item);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  }

  return 0;
}

function obterBimestrePorData(dataSondagem) {
  const data = new Date(dataSondagem);
  if (Number.isNaN(data.getTime())) return null;
  const mes = data.getMonth() + 1;
  if (mes <= 3) return "1";
  if (mes <= 6) return "2";
  if (mes <= 9) return "3";
  return "4";
}

function extrairNumeroBimestre(valor) {
  const texto = normalizarTexto(valor);
  if (!texto) return null;
  const match = texto.match(/([1-4])\s*(?:o|\u00BA|\u00B0)?/);
  return match ? match[1] : null;
}

const MAPA_EQUIVALENCIA_EIXOS = EIXOS_PERSISTIDOS.reduce((acc, item) => {
  [item.eixo, ...(item.aliasesDuplicidade || [])].forEach((titulo) => {
    acc[normalizarTexto(titulo)] = item.grupoDuplicidade;
  });
  return acc;
}, {});

export function obterNumeroBimestre(valor) {
  return extrairNumeroBimestre(valor);
}

export function normalizarTituloMetaParaComparacao(titulo) {
  const texto = normalizarTexto(titulo);
  return MAPA_EQUIVALENCIA_EIXOS[texto] || texto;
}

export function selecionarSondagemMaisRecentePorBimestre(sondagens = [], bimestre) {
  const numeroBimestre = extrairNumeroBimestre(bimestre);
  const ordenadas = [...sondagens].sort((a, b) => obterTimestamp(b) - obterTimestamp(a));

  if (!numeroBimestre) return ordenadas[0] || null;

  const porBimestre = ordenadas.find((item) => {
    const bimestreDaSondagem =
      extrairNumeroBimestre(item?.periodo) || obterBimestrePorData(item?.dataSondagem);
    return bimestreDaSondagem === numeroBimestre;
  });

  return porBimestre || ordenadas[0] || null;
}

export function gerarSugestoesHabilidadesDaSondagem(sondagem) {
  if (!sondagem) return [];

  return EIXOS_PERSISTIDOS.filter(({ campo }) => resultadoIndicaIntervencao(sondagem[campo])).map(
    ({ campo, eixo, rotulo, descricaoBase, sugestoes }) => ({
      eixo,
      descricao:
        descricaoBase ||
        "Planejar intervenções pedagógicas estruturadas e graduais para ampliar participação, aprendizagem e autonomia do estudante no eixo identificado.",
      sugestoes:
        Array.isArray(sugestoes) && sugestoes.length
          ? sugestoes
          : [
              descricaoBase ||
                "Planejar intervenções pedagógicas estruturadas e graduais para ampliar participação, aprendizagem e autonomia do estudante no eixo identificado.",
            ],
      evidencias: [{ campo: rotulo, resultado: sondagem[campo] }],
    })
  );
}

export function diagnosticarGeracaoHabilidadesDaSondagem(sondagem) {
  const diagnostico = {
    encontrouCamposMapeados: 0,
    camposComIntervencao: [],
    camposSemIntervencao: [],
  };

  EIXOS_PERSISTIDOS.forEach(({ campo, rotulo }) => {
    const valorOriginal = String(sondagem?.[campo] || "").trim();
    if (!valorOriginal) return;

    diagnostico.encontrouCamposMapeados += 1;
    if (resultadoIndicaIntervencao(valorOriginal)) {
      diagnostico.camposComIntervencao.push({
        campo,
        rotulo,
        valor: valorOriginal,
      });
      return;
    }

    diagnostico.camposSemIntervencao.push({
      campo,
      rotulo,
      valor: valorOriginal,
    });
  });

  return diagnostico;
}
