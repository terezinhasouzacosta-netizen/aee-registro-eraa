const CAMPOS_PARA_EIXO = [
  { campo: "leitura", eixo: "Leitura e escrita", rotulo: "Leitura" },
  { campo: "escrita", eixo: "Leitura e escrita", rotulo: "Escrita" },
  {
    campo: "comunicacao",
    eixo: "Comunica\u00E7\u00E3o oral",
    rotulo: "Comunica\u00E7\u00E3o",
  },
  { campo: "matematica", eixo: "Matem\u00E1tica funcional", rotulo: "Matem\u00E1tica" },
  {
    campo: "atencaoConcentracao",
    eixo: "Aten\u00E7\u00E3o e concentra\u00E7\u00E3o",
    rotulo: "Aten\u00E7\u00E3o e concentra\u00E7\u00E3o",
  },
  {
    campo: "interacaoSocial",
    eixo: "Intera\u00E7\u00E3o social",
    rotulo: "Intera\u00E7\u00E3o social",
  },
  { campo: "autonomia", eixo: "Autonomia nas atividades", rotulo: "Autonomia" },
  {
    campo: "comportamento",
    eixo: "Comportamento e autorregula\u00E7\u00E3o",
    rotulo: "Comportamento",
  },
  {
    campo: "coordenacaoMotora",
    eixo: "Coordena\u00E7\u00E3o motora",
    rotulo: "Coordena\u00E7\u00E3o motora",
  },
];

const RESULTADOS_INTERVENCAO = new Set([
  "nao realiza",
  "realiza com muito apoio",
  "realiza com apoio",
  "realiza parcialmente",
  "alta dependencia",
  "compreendeu com muita ajuda",
  "manteve-se com apoio constante",
  "respondeu parcialmente",
]);

const DESCRICAO_BASE_POR_EIXO = {
  "Leitura e escrita":
    "Desenvolver estrat\u00E9gias de leitura mediada e produ\u00E7\u00E3o escrita com apoio visual, segmenta\u00E7\u00E3o de tarefas e amplia\u00E7\u00E3o gradual da autonomia na compreens\u00E3o e registro de ideias.",
  "Comunica\u00E7\u00E3o oral":
    "Ampliar a comunica\u00E7\u00E3o oral por meio de media\u00E7\u00E3o intencional, modelagem de fala funcional, uso de pistas verbais e incentivo \u00E0 participa\u00E7\u00E3o em intera\u00E7\u00F5es com colegas e adultos.",
  "Matem\u00E1tica funcional":
    "Consolidar no\u00E7\u00F5es matem\u00E1ticas funcionais com atividades contextualizadas, uso de material concreto, resolu\u00E7\u00E3o guiada de situa\u00E7\u00F5es-problema e refor\u00E7o da linguagem matem\u00E1tica cotidiana.",
  "Aten\u00E7\u00E3o e concentra\u00E7\u00E3o":
    "Fortalecer aten\u00E7\u00E3o e perman\u00EAncia em atividade com rotina estruturada, metas curtas, apoio visual e estrat\u00E9gias de autorregula\u00E7\u00E3o para manuten\u00E7\u00E3o do foco nas propostas pedag\u00F3gicas.",
  "Intera\u00E7\u00E3o social":
    "Promover intera\u00E7\u00E3o social com media\u00E7\u00E3o progressiva, combinados de conviv\u00EAncia, atividades colaborativas e est\u00EDmulo \u00E0 comunica\u00E7\u00E3o respeitosa em diferentes situa\u00E7\u00F5es escolares.",
  "Autonomia nas atividades":
    "Estimular autonomia nas atividades com decomposi\u00E7\u00E3o de tarefas, pistas graduais, refor\u00E7o positivo e retirada progressiva de ajuda para favorecer iniciativa e autorregula\u00E7\u00E3o.",
  "Comportamento e autorregula\u00E7\u00E3o":
    "Desenvolver autorregula\u00E7\u00E3o comportamental com combinados claros, antecipa\u00E7\u00E3o de rotina, estrat\u00E9gias de autocontrole e acompanhamento cont\u00EDnuo das respostas emocionais em sala.",
  "Coordena\u00E7\u00E3o motora":
    "Estimular coordena\u00E7\u00E3o motora fina e ampla com atividades graduadas, materiais manipul\u00E1veis e propostas psicomotoras que favore\u00E7am organiza\u00E7\u00E3o corporal e funcionalidade nas tarefas escolares.",
};

const SUGESTOES_POR_EIXO = {
  "Leitura e escrita": [
    "Realizar leitura mediada de palavras e frases com apoio visual e repetição guiada.",
    "Produzir pequenos registros escritos com banco de palavras e estruturação por etapas.",
    "Trabalhar compreensão de enunciados curtos com perguntas objetivas e pistas graduais.",
  ],
  "Comunica\u00E7\u00E3o oral": [
    "Estimular oralidade funcional em rodas de conversa com mediação e turnos de fala.",
    "Ampliar repertório verbal com nomeação de objetos, ações e situações cotidianas.",
    "Promover participação oral em atividades coletivas com apoio de perguntas direcionadas.",
  ],
  "Matem\u00E1tica funcional": [
    "Resolver situações-problema simples com material concreto e apoio visual.",
    "Trabalhar noções de quantidade, comparação e sequência com atividades contextualizadas.",
    "Reforçar operações básicas com estratégias passo a passo e mediação individual.",
  ],
  "Aten\u00E7\u00E3o e concentra\u00E7\u00E3o": [
    "Organizar rotina de tarefas curtas com pausas planejadas e objetivos claros.",
    "Utilizar recursos visuais de foco (checklist e sequência) para manter permanência na atividade.",
    "Aplicar estratégias de autorregulação para retomar a atenção durante propostas pedagógicas.",
  ],
  "Intera\u00E7\u00E3o social": [
    "Promover interação em duplas com combinados de convivência e papéis definidos.",
    "Estimular participação em atividades colaborativas com mediação de conflitos.",
    "Ampliar comunicação respeitosa em contextos de sala por meio de modelagem social.",
  ],
  "Autonomia nas atividades": [
    "Desenvolver execução de tarefas com retirada progressiva de ajuda.",
    "Estimular iniciativa em atividades escolares com pistas graduais e reforço positivo.",
    "Trabalhar organização de materiais e etapas da tarefa com apoio visual.",
  ],
  "Comportamento e autorregula\u00E7\u00E3o": [
    "Aplicar combinados claros de convivência com monitoramento contínuo.",
    "Utilizar estratégias de regulação emocional em situações de frustração.",
    "Antecipar rotina e transições para reduzir comportamentos de evasão da tarefa.",
  ],
  "Coordena\u00E7\u00E3o motora": [
    "Desenvolver coordenação motora fina com recorte, traçado e atividades de preensão.",
    "Estimular coordenação motora ampla com circuitos e movimentos orientados.",
    "Trabalhar organização motora para apoio às tarefas de escrita e manipulação de materiais.",
  ],
};

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

  // Cobertura para variações legadas de preenchimento sem quebrar o fluxo atual.
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

export function obterNumeroBimestre(valor) {
  return extrairNumeroBimestre(valor);
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

  // Fallback para não bloquear geração quando há sondagem, mas o bimestre não está normalizado.
  return porBimestre || ordenadas[0] || null;
}

export function gerarSugestoesHabilidadesDaSondagem(sondagem) {
  if (!sondagem) return [];

  const mapaEixos = new Map();

  CAMPOS_PARA_EIXO.forEach(({ campo, eixo, rotulo }) => {
    if (!resultadoIndicaIntervencao(sondagem[campo])) return;

    const existente = mapaEixos.get(eixo) || [];
    existente.push({ campo: rotulo, resultado: sondagem[campo] });
    mapaEixos.set(eixo, existente);
  });

  return Array.from(mapaEixos.entries()).map(([eixo, evidencias]) => ({
    eixo,
    descricao:
      DESCRICAO_BASE_POR_EIXO[eixo] ||
      "Planejar interven\u00E7\u00F5es pedag\u00F3gicas estruturadas e graduais para ampliar participa\u00E7\u00E3o, aprendizagem e autonomia do estudante no eixo identificado.",
    sugestoes:
      SUGESTOES_POR_EIXO[eixo] && SUGESTOES_POR_EIXO[eixo].length
        ? SUGESTOES_POR_EIXO[eixo]
        : [
            DESCRICAO_BASE_POR_EIXO[eixo] ||
              "Planejar interven\u00E7\u00F5es pedag\u00F3gicas estruturadas e graduais para ampliar participa\u00E7\u00E3o, aprendizagem e autonomia do estudante no eixo identificado.",
          ],
    evidencias,
  }));
}

export function diagnosticarGeracaoHabilidadesDaSondagem(sondagem) {
  const diagnostico = {
    encontrouCamposMapeados: 0,
    camposComIntervencao: [],
    camposSemIntervencao: [],
  };

  CAMPOS_PARA_EIXO.forEach(({ campo, rotulo }) => {
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
