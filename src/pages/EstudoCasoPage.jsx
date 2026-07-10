import { useEffect, useMemo, useState } from "react";
import {
  atualizarEstudoCaso,
  buscarEstudoCasoPorId,
  criarEstudoCaso,
} from "../services/estudosCasoService";
import { useAuth } from "../hooks/useAuth";
import { podeVisualizarSondagens } from "../utils/permissions";

const ESTUDO_CASO_RASCUNHO_ID_KEY = "estudoCasoRascunhoId";

const STATUS_ESTUDO_OPTIONS = [
  { value: "em-andamento", label: "Em andamento" },
  { value: "pendente-informacoes", label: "Pendente de informações" },
  { value: "pronto-para-sintese", label: "Pronto para síntese" },
  { value: "concluido", label: "Concluído" },
];

const STATUS_PERGUNTA_OPTIONS = [
  { value: "respondida", label: "Respondida" },
  { value: "pendente", label: "Pendente" },
  { value: "ignorada", label: "Ignorada" },
  { value: "revisar", label: "Revisar" },
];

const FONTE_INFORMACAO_OPTIONS = [
  "Estudante",
  "Família",
  "Professor regente",
  "AEE",
  "Coordenação",
  "Mediador/assistente",
  "Observação",
  "Documento",
  "Sondagem",
];

const FORMAS_PREENCHIMENTO = [
  {
    id: "manual",
    titulo: "Responder manualmente",
    descricao: "Preenchimento guiado pergunta por pergunta, já disponível nesta etapa visual.",
    status: "Ativa nesta etapa",
    ativa: true,
  },
  {
    id: "colar-texto",
    titulo: "Colar texto de entrevista/reunião",
    descricao: "Recurso futuro para transformar entrevistas em respostas estruturadas.",
    status: "Recurso futuro",
    ativa: false,
  },
  {
    id: "usar-dados-plataforma",
    titulo: "Usar dados da plataforma",
    descricao: "Integração futura com cadastro, sondagem, habilidades e demais módulos.",
    status: "Recurso futuro",
    ativa: false,
  },
  {
    id: "anexar-documentos",
    titulo: "Anexar documentos",
    descricao: "Importação futura de arquivos de apoio e registros pedagógicos.",
    status: "Recurso futuro",
    ativa: false,
  },
];

const IDENTIFICACAO_FIELDS = [
  { id: "aluno", label: "Aluno", placeholder: "Digite o nome do estudante." },
  { id: "dataNascimento", label: "Data de nascimento", placeholder: "Ex.: 10/03/2016" },
  { id: "serieAno", label: "Série/Ano", placeholder: "Ex.: 3º ano" },
  { id: "turma", label: "Turma", placeholder: "Ex.: Turma A" },
  { id: "turno", label: "Turno", placeholder: "Ex.: Matutino" },
  {
    id: "professorAee",
    label: "Professor(a) do AEE",
    placeholder: "Nome da professora ou do professor do AEE.",
  },
];

const META_ESTUDO_INICIAL = {
  tituloEstudo: "",
  dataInicio: "",
  periodo: "",
  responsavel: "",
  status: "em-andamento",
};

const IDENTIFICACAO_INICIAL = {
  aluno: "",
  dataNascimento: "",
  serieAno: "",
  turma: "",
  turno: "",
  professorAee: "",
};

const PREVIEW_EMPTY_BLOCK_TEXT = "Não há informações registradas neste bloco até o momento.";

const PERGUNTAS_ENCAMINHAMENTO_IDS = new Set([
  "encaminhamentos-finais",
  "pronto-para-paee",
]);

const BLOCOS_ESTUDO_CASO = [
  {
    id: "identificacao-estudante",
    titulo: "Identificação do estudante",
    descricao: "Campos visuais de referência para situar o caso pedagógico do estudante.",
    tipo: "identificacao",
  },
  {
    id: "escuta-estudante",
    titulo: "Escuta do estudante",
    descricao: "Perguntas orientadoras para registrar a voz do estudante e sua percepção sobre a escola.",
    tipo: "textual",
    perguntas: [
      { id: "gosta-escola", enunciado: "O estudante gosta da escola?" },
      {
        id: "tem-amigos",
        enunciado: "Tem amigos ou colegas com quem gosta de ficar?",
      },
      {
        id: "atividades-preferidas",
        enunciado: "Quais atividades mais gosta de fazer?",
      },
      {
        id: "tarefas-dificeis",
        enunciado: "Quais tarefas são mais difíceis para ele?",
      },
      {
        id: "expressa-necessidades",
        enunciado: "Expressa necessidades, desejos e interesses? De que maneira?",
      },
      {
        id: "satisfeito-apoios",
        enunciado: "Está satisfeito com os apoios que recebe?",
      },
      {
        id: "gostaria-outros-apoios",
        enunciado: "Gostaria de receber outros apoios? Quais?",
      },
    ],
  },
  {
    id: "familia",
    titulo: "Família/responsáveis",
    descricao: "Perguntas orientadoras para compreender a visão da família sobre o estudante e sua escolarização.",
    tipo: "textual",
    perguntas: [
      {
        id: "opiniao-familia",
        enunciado: "Qual é a opinião da família sobre a vida escolar do estudante?",
      },
      {
        id: "participacao-familia",
        enunciado: "A família participa de reuniões ou atividades da escola?",
      },
      {
        id: "habilidades-familia",
        enunciado: "A família identifica habilidades do estudante? Quais?",
      },
      {
        id: "necessidades-familia",
        enunciado: "A família identifica necessidades ou dificuldades? Quais?",
      },
      {
        id: "expectativas-familia",
        enunciado: "Quais expectativas a família tem sobre o desenvolvimento e escolarização?",
      },
      {
        id: "rotina-casa",
        enunciado: "Como é a rotina do estudante em casa?",
      },
      {
        id: "saude-consideracoes",
        enunciado:
          "Há informações sobre saúde, medicação, sono, alimentação ou sensibilidade que a escola precisa considerar?",
      },
    ],
  },
  {
    id: "professor-regente",
    titulo: "Professor regente",
    descricao: "Perguntas investigativas para sistematizar o olhar pedagógico da sala regular.",
    tipo: "textual",
    perguntas: [
      {
        id: "participa-turma",
        enunciado: "O estudante participa das atividades propostas para a turma?",
      },
      {
        id: "grau-participacao",
        enunciado: "Participa integralmente, parcialmente ou não participa?",
      },
      {
        id: "facilidades",
        enunciado: "Quais atividades realiza com facilidade?",
      },
      {
        id: "dificuldades",
        enunciado: "Quais atividades realiza com dificuldade?",
      },
      {
        id: "interacao-colegas",
        enunciado: "Como interage com os colegas?",
      },
      {
        id: "reage-comandos",
        enunciado: "Como reage a comandos, combinados e mudanças de rotina?",
      },
      {
        id: "estrategias-funcionaram",
        enunciado: "Quais estratégias já funcionaram em sala comum?",
      },
      {
        id: "apoios-sugeridos",
        enunciado: "Quais apoios o professor sugere?",
      },
    ],
  },
  {
    id: "observacao-pedagogica",
    titulo: "Observação pedagógica escolar",
    descricao: "Registro objetivo da observação pedagógica com opções visuais e espaço para observações complementares.",
    tipo: "objetiva",
    observacoesLabel: "Observações complementares da observação pedagógica",
    perguntas: [
      {
        id: "participa-atividades",
        enunciado: "Participa das atividades propostas?",
        opcoes: ["Sempre", "Às vezes", "Raramente", "Não participa"],
      },
      {
        id: "inicia-sozinho",
        enunciado: "Consegue iniciar as atividades sozinho?",
        opcoes: ["Sim", "Às vezes", "Não"],
      },
      {
        id: "conclui-atividades",
        enunciado: "Consegue concluir as atividades?",
        opcoes: ["Sim", "Às vezes", "Não"],
      },
      {
        id: "mantem-atencao",
        enunciado: "Mantém atenção nas atividades?",
        opcoes: ["Sim", "Às vezes", "Não"],
      },
      {
        id: "compreende-orientacoes",
        enunciado: "Compreende as orientações dadas pelo professor?",
        opcoes: ["Sim", "Às vezes", "Não"],
      },
      {
        id: "interage-colegas",
        enunciado: "Interage com colegas?",
        opcoes: ["Sim", "Às vezes", "Não"],
      },
      {
        id: "organiza-materiais",
        enunciado: "Organiza seus materiais escolares?",
        opcoes: ["Sim", "Às vezes", "Não"],
      },
      {
        id: "apoio-constante",
        enunciado: "Necessita de apoio constante?",
        opcoes: ["Não observado", "Às vezes", "Frequentemente"],
      },
    ],
  },
  {
    id: "barreiras-apoios",
    titulo: "Barreiras, apoios e acessibilidade",
    descricao: "Perguntas para investigar barreiras, recursos existentes e apoios necessários.",
    tipo: "textual",
    perguntas: [
      {
        id: "barreiras-ambiente",
        enunciado: "Quais barreiras o ambiente escolar impõe ao estudante?",
      },
      {
        id: "barreiras-comunicacao",
        enunciado: "Existem barreiras de comunicação? Quais?",
      },
      {
        id: "barreiras-fisicas",
        enunciado: "Existem barreiras físicas ou de acessibilidade? Quais?",
      },
      {
        id: "barreiras-materiais",
        enunciado: "Existem barreiras nos materiais, currículo ou avaliações? Quais?",
      },
      {
        id: "barreiras-atitudinais",
        enunciado: "Existem barreiras atitudinais ou sociais? Quais?",
      },
      {
        id: "recursos-acessibilidade",
        enunciado: "A escola dispõe de recursos de acessibilidade para o estudante?",
      },
      {
        id: "recursos-necessarios",
        enunciado: "Quais recursos humanos ou materiais ainda são necessários?",
      },
      {
        id: "apoios-revisar",
        enunciado: "Que apoios precisam ser mantidos, ampliados ou revistos?",
      },
    ],
  },
  {
    id: "informacoes-aee",
    titulo: "Informações do AEE",
    descricao: "Perguntas investigativas para consolidar o olhar pedagógico do AEE.",
    tipo: "textual",
    perguntas: [
      {
        id: "potencialidades-aee",
        enunciado: "Quais potencialidades foram observadas no AEE?",
      },
      {
        id: "interesses-ponto-partida",
        enunciado: "Quais interesses podem ser usados como ponto de partida?",
      },
      {
        id: "necessidades-especificas",
        enunciado: "Quais necessidades específicas foram identificadas?",
      },
      {
        id: "habilidades-consolidadas",
        enunciado: "Quais habilidades já estão consolidadas?",
      },
      {
        id: "habilidades-desenvolvimento",
        enunciado: "Quais habilidades estão em desenvolvimento?",
      },
      {
        id: "habilidades-priorizadas",
        enunciado: "Quais habilidades precisam ser priorizadas?",
      },
      {
        id: "resultado-sondagem",
        enunciado: "O que a Sondagem Diagnóstica mostrou?",
      },
      {
        id: "estrategias-aee",
        enunciado: "Quais estratégias devem ser trabalhadas no AEE?",
      },
      {
        id: "orientacoes-regente",
        enunciado: "Quais orientações devem ser dadas ao professor regente?",
      },
    ],
  },
  {
    id: "sintese-final",
    titulo: "Síntese pedagógica final",
    descricao: "Perguntas para consolidar a leitura final do caso e orientar os próximos passos pedagógicos.",
    tipo: "textual",
    perguntas: [
      {
        id: "potencialidades-principais",
        enunciado: "Quais são as principais potencialidades do estudante?",
      },
      {
        id: "barreiras-principais",
        enunciado: "Quais são as principais barreiras identificadas?",
      },
      {
        id: "necessidades-prioritarias",
        enunciado: "Quais são as necessidades prioritárias de apoio?",
      },
      {
        id: "habilidades-planejamento",
        enunciado: "Quais habilidades devem orientar o planejamento?",
      },
      {
        id: "recursos-estrategias",
        enunciado: "Quais recursos e estratégias são recomendados?",
      },
      {
        id: "informacoes-pendentes",
        enunciado: "Há informações pendentes para aprofundamento?",
      },
      {
        id: "encaminhamentos-finais",
        enunciado: "Quais encaminhamentos devem ser feitos?",
      },
      {
        id: "pronto-para-paee",
        enunciado: "O Estudo de Caso está pronto para orientar o PAEE?",
      },
    ],
  },
];

function criarEstadoInicialPerguntas() {
  const estadoInicial = {};

  BLOCOS_ESTUDO_CASO.forEach((bloco) => {
    if (bloco.tipo === "identificacao") {
      return;
    }

    bloco.perguntas.forEach((pergunta) => {
      estadoInicial[`${bloco.id}-${pergunta.id}`] = {
        resposta: "",
        fonte: "",
        status: "pendente",
      };
    });
  });

  return estadoInicial;
}

function criarEstadoObservacoesObjetivas() {
  const estadoInicial = {};

  BLOCOS_ESTUDO_CASO.forEach((bloco) => {
    if (bloco.tipo === "objetiva") {
      estadoInicial[bloco.id] = "";
    }
  });

  return estadoInicial;
}

function contarPorStatus(registros) {
  return registros.reduce(
    (acc, registro) => {
      const status = registro?.status || "pendente";
      acc[status] += 1;
      acc.total += 1;
      return acc;
    },
    {
      respondida: 0,
      pendente: 0,
      ignorada: 0,
      revisar: 0,
      total: 0,
    },
  );
}

function obterRegistrosBloco(bloco, perguntasEstado, identificacaoEstudante) {
  if (bloco.tipo === "identificacao") {
    return IDENTIFICACAO_FIELDS.map((campo) => ({
      status: identificacaoEstudante[campo.id]?.trim() ? "respondida" : "pendente",
    }));
  }

  return bloco.perguntas.map((pergunta) => perguntasEstado[`${bloco.id}-${pergunta.id}`]);
}

function obterResumoBloco(bloco, perguntasEstado, identificacaoEstudante) {
  return contarPorStatus(obterRegistrosBloco(bloco, perguntasEstado, identificacaoEstudante));
}

function obterResumoGeral(perguntasEstado, identificacaoEstudante) {
  const registros = BLOCOS_ESTUDO_CASO.flatMap((bloco) =>
    obterRegistrosBloco(bloco, perguntasEstado, identificacaoEstudante),
  );

  return contarPorStatus(registros);
}

function limparTexto(valor) {
  return String(valor || "").trim();
}

function formatarDataParaTexto(valor) {
  const texto = limparTexto(valor);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return texto;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function preencherValorOuPadrao(valor, padrao = "Não informado") {
  return limparTexto(valor) || padrao;
}

function finalizarFrase(valor) {
  const texto = limparTexto(valor);

  if (!texto) return "";

  return /[.!?…]$/.test(texto) ? texto : `${texto}.`;
}

function normalizarIdentificacaoEstudante(identificacaoEstudante = {}) {
  return IDENTIFICACAO_FIELDS.reduce((acc, campo) => {
    acc[campo.id] = limparTexto(identificacaoEstudante[campo.id]);
    return acc;
  }, {});
}

function montarPerguntasEstadoPersistido(perguntasEstado = {}) {
  const perguntasPersistidas = {};

  BLOCOS_ESTUDO_CASO.forEach((bloco, indiceBloco) => {
    if (bloco.tipo === "identificacao") {
      return;
    }

    bloco.perguntas.forEach((pergunta, indicePergunta) => {
      const chave = `${bloco.id}-${pergunta.id}`;
      const registro = perguntasEstado[chave] || {};

      perguntasPersistidas[chave] = {
        blocoId: bloco.id,
        blocoTitulo: bloco.titulo,
        blocoNumero: indiceBloco + 1,
        perguntaId: pergunta.id,
        numeroPergunta: `${indiceBloco + 1}.${indicePergunta + 1}`,
        enunciado: pergunta.enunciado,
        resposta: limparTexto(registro.resposta),
        fonte: limparTexto(registro.fonte),
        status: registro.status || "pendente",
      };
    });
  });

  return perguntasPersistidas;
}

function montarObservacoesObjetivasPersistidas(observacoesObjetivas = {}) {
  return Object.fromEntries(
    Object.entries(observacoesObjetivas).map(([blocoId, valor]) => [
      blocoId,
      limparTexto(valor),
    ]),
  );
}

function criarEstadoInicialBlocosAbertos() {
  return Object.fromEntries(BLOCOS_ESTUDO_CASO.map((bloco) => [bloco.id, true]));
}

function salvarRascunhoIdLocal(estudoCasoId) {
  if (!estudoCasoId || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ESTUDO_CASO_RASCUNHO_ID_KEY, estudoCasoId);
  } catch (error) {
    console.warn("[EstudoCasoPage] Não foi possível salvar o rascunho no localStorage.", error);
  }
}

function obterRascunhoIdLocal() {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem(ESTUDO_CASO_RASCUNHO_ID_KEY) || "";
  } catch (error) {
    console.warn("[EstudoCasoPage] Não foi possível ler o rascunho do localStorage.", error);
    return "";
  }
}

function removerRascunhoIdLocal() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(ESTUDO_CASO_RASCUNHO_ID_KEY);
  } catch (error) {
    console.warn("[EstudoCasoPage] Não foi possível remover o rascunho do localStorage.", error);
  }
}

const PREVIEW_NARRATIVA_BLOCOS = {
  "escuta-estudante": {
    introducao: "Na escuta do estudante",
    descritores: [
      {
        perguntaId: "gosta-escola",
        contexto: "ao vínculo do estudante com a escola",
        respondida: "quanto ao vínculo do estudante com a escola, observou-se",
      },
      {
        perguntaId: "tem-amigos",
        contexto: "às relações de amizade e convivência do estudante",
        respondida: "em relação aos colegas e amizades, foi relatado",
      },
      {
        perguntaId: "atividades-preferidas",
        contexto: "às atividades de maior interesse do estudante",
        respondida: "sobre as atividades de maior interesse, foram citadas",
      },
      {
        perguntaId: "tarefas-dificeis",
        contexto: "às tarefas consideradas mais difíceis pelo estudante",
        respondida: "quanto às tarefas consideradas mais difíceis, foi registrado",
      },
      {
        perguntaId: "expressa-necessidades",
        contexto: "à forma de expressão de necessidades, desejos e interesses",
        respondida: "sobre a expressão de necessidades, desejos e interesses, foi registrado",
      },
      {
        perguntaId: "satisfeito-apoios",
        contexto: "à percepção do estudante sobre os apoios que recebe",
        respondida: "quanto aos apoios já recebidos, foi registrado",
      },
      {
        perguntaId: "gostaria-outros-apoios",
        contexto: "aos apoios que o estudante gostaria de receber",
        respondida: "em relação a outros apoios desejados, foi registrado",
      },
    ],
  },
  familia: {
    introducao: "Nas informações da família/responsáveis",
    descritores: [
      {
        perguntaId: "opiniao-familia",
        contexto: "à visão da família sobre a vida escolar do estudante",
        respondida: "quanto à visão da família sobre a vida escolar do estudante, foi informado",
      },
      {
        perguntaId: "participacao-familia",
        contexto: "à participação da família em reuniões e atividades escolares",
        respondida: "sobre a participação da família em reuniões e atividades escolares, foi registrado",
      },
      {
        perguntaId: "habilidades-familia",
        contexto: "às habilidades percebidas pela família",
        respondida: "em relação às habilidades percebidas pela família, foi relatado",
      },
      {
        perguntaId: "necessidades-familia",
        contexto: "às necessidades ou dificuldades percebidas pela família",
        respondida: "quanto às necessidades ou dificuldades percebidas pela família, foi informado",
      },
      {
        perguntaId: "expectativas-familia",
        contexto: "às expectativas da família sobre o desenvolvimento e a escolarização",
        respondida: "sobre as expectativas da família quanto ao desenvolvimento e à escolarização, foi registrado",
      },
      {
        perguntaId: "rotina-casa",
        contexto: "à rotina do estudante em casa",
        respondida: "em relação à rotina do estudante em casa, foi relatado",
      },
      {
        perguntaId: "saude-consideracoes",
        contexto: "às informações de saúde e cuidados que a escola precisa considerar",
        respondida: "quanto às informações de saúde e cuidados a serem considerados pela escola, foi registrado",
      },
    ],
  },
  "professor-regente": {
    introducao: "Nas informações do professor regente",
    descritores: [
      {
        perguntaId: "participa-turma",
        contexto: "à participação do estudante nas atividades propostas para a turma",
        respondida: "quanto à participação do estudante nas atividades propostas para a turma, foi observado",
      },
      {
        perguntaId: "grau-participacao",
        contexto: "ao grau de participação do estudante nas atividades da turma",
        respondida: "sobre o grau de participação do estudante nas atividades da turma, foi registrado",
      },
      {
        perguntaId: "facilidades",
        contexto: "às atividades realizadas com facilidade",
        respondida: "em relação às atividades realizadas com facilidade, foi relatado",
      },
      {
        perguntaId: "dificuldades",
        contexto: "às atividades realizadas com dificuldade",
        respondida: "quanto às atividades realizadas com dificuldade, foi informado",
      },
      {
        perguntaId: "interacao-colegas",
        contexto: "à interação do estudante com os colegas",
        respondida: "sobre a interação do estudante com os colegas, foi registrado",
      },
      {
        perguntaId: "reage-comandos",
        contexto: "à reação do estudante a comandos, combinados e mudanças de rotina",
        respondida: "quanto à reação do estudante a comandos, combinados e mudanças de rotina, foi observado",
      },
      {
        perguntaId: "estrategias-funcionaram",
        contexto: "às estratégias que já funcionaram na sala comum",
        respondida: "em relação às estratégias que já funcionaram na sala comum, foi relatado",
      },
      {
        perguntaId: "apoios-sugeridos",
        contexto: "aos apoios sugeridos pelo professor regente",
        respondida: "sobre os apoios sugeridos pelo professor regente, foi registrado",
      },
    ],
  },
  "barreiras-apoios": {
    introducao: "Na análise de barreiras, apoios e acessibilidade",
    descritores: [
      {
        perguntaId: "barreiras-ambiente",
        contexto: "às barreiras presentes no ambiente escolar",
        respondida: "quanto às barreiras presentes no ambiente escolar, foi registrado",
      },
      {
        perguntaId: "barreiras-comunicacao",
        contexto: "às barreiras de comunicação",
        respondida: "em relação às barreiras de comunicação, foi relatado",
      },
      {
        perguntaId: "barreiras-fisicas",
        contexto: "às barreiras físicas ou de acessibilidade",
        respondida: "sobre as barreiras físicas ou de acessibilidade, foi informado",
      },
      {
        perguntaId: "barreiras-materiais",
        contexto: "às barreiras relacionadas a materiais, currículo ou avaliações",
        respondida: "quanto às barreiras relacionadas a materiais, currículo ou avaliações, foi registrado",
      },
      {
        perguntaId: "barreiras-atitudinais",
        contexto: "às barreiras atitudinais ou sociais",
        respondida: "em relação às barreiras atitudinais ou sociais, foi relatado",
      },
      {
        perguntaId: "recursos-acessibilidade",
        contexto: "aos recursos de acessibilidade disponíveis na escola",
        respondida: "sobre os recursos de acessibilidade disponíveis na escola, foi registrado",
      },
      {
        perguntaId: "recursos-necessarios",
        contexto: "aos recursos humanos ou materiais ainda necessários",
        respondida: "quanto aos recursos humanos ou materiais ainda necessários, foi informado",
      },
      {
        perguntaId: "apoios-revisar",
        contexto: "aos apoios que precisam ser mantidos, ampliados ou revistos",
        respondida: "em relação aos apoios que precisam ser mantidos, ampliados ou revistos, foi registrado",
      },
    ],
  },
  "informacoes-aee": {
    introducao: "Nas informações do AEE",
    descritores: [
      {
        perguntaId: "potencialidades-aee",
        contexto: "às potencialidades observadas no AEE",
        respondida: "quanto às potencialidades observadas no AEE, foi registrado",
      },
      {
        perguntaId: "interesses-ponto-partida",
        contexto: "aos interesses que podem servir de ponto de partida",
        respondida: "em relação aos interesses que podem servir de ponto de partida, foi relatado",
      },
      {
        perguntaId: "necessidades-especificas",
        contexto: "às necessidades específicas identificadas",
        respondida: "sobre as necessidades específicas identificadas, foi informado",
      },
      {
        perguntaId: "habilidades-consolidadas",
        contexto: "às habilidades já consolidadas",
        respondida: "quanto às habilidades já consolidadas, foi registrado",
      },
      {
        perguntaId: "habilidades-desenvolvimento",
        contexto: "às habilidades em desenvolvimento",
        respondida: "em relação às habilidades em desenvolvimento, foi relatado",
      },
      {
        perguntaId: "habilidades-priorizadas",
        contexto: "às habilidades que precisam ser priorizadas",
        respondida: "sobre as habilidades que precisam ser priorizadas, foi registrado",
      },
      {
        perguntaId: "resultado-sondagem",
        contexto: "aos resultados apontados pela Sondagem Diagnóstica",
        respondida: "quanto aos resultados apontados pela Sondagem Diagnóstica, foi informado",
      },
      {
        perguntaId: "estrategias-aee",
        contexto: "às estratégias que devem ser trabalhadas no AEE",
        respondida: "em relação às estratégias que devem ser trabalhadas no AEE, foi registrado",
      },
      {
        perguntaId: "orientacoes-regente",
        contexto: "às orientações que devem ser compartilhadas com o professor regente",
        respondida: "sobre as orientações que devem ser compartilhadas com o professor regente, foi informado",
      },
    ],
  },
  "sintese-final": {
    introducao: "Na síntese pedagógica final",
    descritores: [
      {
        perguntaId: "potencialidades-principais",
        contexto: "às principais potencialidades do estudante",
        respondida: "quanto às principais potencialidades do estudante, foi registrado",
      },
      {
        perguntaId: "barreiras-principais",
        contexto: "às principais barreiras identificadas",
        respondida: "em relação às principais barreiras identificadas, foi relatado",
      },
      {
        perguntaId: "necessidades-prioritarias",
        contexto: "às necessidades prioritárias de apoio",
        respondida: "sobre as necessidades prioritárias de apoio, foi informado",
      },
      {
        perguntaId: "habilidades-planejamento",
        contexto: "às habilidades que devem orientar o planejamento",
        respondida: "quanto às habilidades que devem orientar o planejamento, foi registrado",
      },
      {
        perguntaId: "recursos-estrategias",
        contexto: "aos recursos e estratégias recomendados",
        respondida: "em relação aos recursos e estratégias recomendados, foi relatado",
      },
      {
        perguntaId: "informacoes-pendentes",
        contexto: "às informações que ainda precisam de aprofundamento",
        respondida: "sobre as informações que ainda precisam de aprofundamento, foi informado",
      },
    ],
  },
  encaminhamentos: {
    introducao: "Nos encaminhamentos",
    descritores: [
      {
        perguntaId: "encaminhamentos-finais",
        contexto: "aos encaminhamentos a serem realizados",
        respondida: "quanto aos encaminhamentos a serem realizados, foi registrado",
      },
      {
        perguntaId: "pronto-para-paee",
        contexto: "à prontidão do estudo para orientar o PAEE",
        respondida: "em relação à prontidão do estudo para orientar o PAEE, foi informado",
      },
    ],
  },
};

function removerPontuacaoFinal(texto) {
  return limparTexto(texto).replace(/[.?!…:]+$/u, "");
}

function capitalizarInicio(texto) {
  const textoLimpo = limparTexto(texto);
  if (!textoLimpo) return "";
  return `${textoLimpo.charAt(0).toUpperCase()}${textoLimpo.slice(1)}`;
}

function decapitalizarInicio(texto) {
  const textoLimpo = limparTexto(texto);
  if (!textoLimpo) return "";
  return `${textoLimpo.charAt(0).toLowerCase()}${textoLimpo.slice(1)}`;
}

function formatarListaNatural(itens) {
  const valores = itens.map(limparTexto).filter(Boolean);

  if (!valores.length) return "";
  if (valores.length === 1) return valores[0];
  if (valores.length === 2) return `${valores[0]} e ${valores[1]}`;

  return `${valores.slice(0, -1).join(", ")} e ${valores.at(-1)}`;
}

function obterFontesDosRegistros(registros) {
  return [...new Set(registros.map((registro) => limparTexto(registro?.fonte)).filter(Boolean))];
}

function criarFragmentoNarrativo(registro, descritor) {
  const resposta = limparTexto(registro?.resposta);

  if (!resposta) {
    return "";
  }

  const respostaFinal = finalizarFrase(resposta);
  const status = registro?.status || "pendente";
  const contexto = descritor.contexto;

  if (status === "revisar") {
    return `no que se refere ${contexto}, há informação registrada para revisão: ${respostaFinal}`;
  }

  if (status === "pendente") {
    return `no que se refere ${contexto}, há registro parcial: ${respostaFinal}`;
  }

  if (status === "ignorada") {
    return `no que se refere ${contexto}, há observação marcada como ignorada no preenchimento: ${respostaFinal}`;
  }

  return `${descritor.respondida}: ${respostaFinal}`;
}

function montarLinhasNarrativasBloco(registros, configuracaoBloco) {
  const registrosPorPergunta = Object.fromEntries(
    registros.map((registro) => [registro.perguntaId, registro]),
  );
  const fragmentos = configuracaoBloco.descritores
    .map((descritor) => criarFragmentoNarrativo(registrosPorPergunta[descritor.perguntaId], descritor))
    .filter(Boolean);

  if (!fragmentos.length) {
    return [];
  }

  const [primeiroFragmento, ...demaisFragmentos] = fragmentos;
  const paragrafo = [
    `${configuracaoBloco.introducao}, ${decapitalizarInicio(primeiroFragmento)}`,
    ...demaisFragmentos.map(capitalizarInicio),
  ].join(" ");
  const fontes = obterFontesDosRegistros(registros);
  const linhas = [paragrafo];

  if (fontes.length) {
    linhas.push(`Fontes consideradas neste bloco: ${formatarListaNatural(fontes)}.`);
  }

  return linhas;
}

function formatarLinhaObservacaoPedagogica(registro) {
  const resposta = limparTexto(registro?.resposta);

  if (!resposta) {
    return "";
  }

  const rotulo = removerPontuacaoFinal(registro?.enunciado || "Registro objetivo");

  if (registro?.status === "revisar") {
    return `- ${rotulo}: informação registrada para revisão — ${finalizarFrase(resposta)}`;
  }

  if (registro?.status === "pendente") {
    return `- ${rotulo}: registro parcial — ${finalizarFrase(resposta)}`;
  }

  if (registro?.status === "ignorada") {
    return `- ${rotulo}: informação ignorada no preenchimento, mas com observação registrada — ${finalizarFrase(
      resposta,
    )}`;
  }

  return `- ${rotulo}: ${finalizarFrase(resposta)}`;
}

function gerarLinhasApresentacaoGeral(metaEstudo, identificacaoEstudante) {
  const linhas = [];
  const aluno = limparTexto(identificacaoEstudante.aluno);
  const dataNascimento = formatarDataParaTexto(identificacaoEstudante.dataNascimento);
  const serieAno = limparTexto(identificacaoEstudante.serieAno);
  const turma = limparTexto(identificacaoEstudante.turma);
  const turno = limparTexto(identificacaoEstudante.turno);
  const professorAee = limparTexto(identificacaoEstudante.professorAee);
  const tituloEstudo = limparTexto(metaEstudo.tituloEstudo);
  const dataInicio = formatarDataParaTexto(metaEstudo.dataInicio);
  const periodo = limparTexto(metaEstudo.periodo);
  const responsavel = limparTexto(metaEstudo.responsavel);

  if (aluno) {
    linhas.push(`O presente Estudo de Caso refere-se ao estudante ${aluno}.`);
  }

  const contextoEscolar = [];
  if (dataNascimento) contextoEscolar.push(`data de nascimento em ${dataNascimento}`);
  if (serieAno) contextoEscolar.push(`matrícula em ${serieAno}`);
  if (turma) contextoEscolar.push(`turma ${turma}`);
  if (turno) contextoEscolar.push(`turno ${turno}`);

  if (contextoEscolar.length) {
    linhas.push(
      `Até o momento, constam os seguintes dados gerais do estudante: ${contextoEscolar.join(
        ", ",
      )}.`,
    );
  }

  if (professorAee) {
    linhas.push(`O acompanhamento no AEE está registrado com ${professorAee}.`);
  }

  if (tituloEstudo) {
    linhas.push(`O estudo foi identificado com o título "${tituloEstudo}".`);
  }

  if (dataInicio || periodo) {
    const dadosRegistro = [];
    if (dataInicio) dadosRegistro.push(`início em ${dataInicio}`);
    if (periodo) dadosRegistro.push(`referência ao período ${periodo}`);
    linhas.push(`O registro do estudo apresenta ${dadosRegistro.join(" e ")}.`);
  }

  if (responsavel) {
    linhas.push(`O preenchimento está sob responsabilidade de ${responsavel}.`);
  }

  return linhas;
}

function gerarLinhasApresentacaoGeralNarrativa(metaEstudo, identificacaoEstudante) {
  const linhas = gerarLinhasApresentacaoGeral(metaEstudo, identificacaoEstudante);
  return linhas.length ? [linhas.join(" ")] : [];
}

function obterRegistrosPreviaBloco(perguntasPersistidas, blocoId, opcoes = {}) {
  const excluirPerguntaIds = new Set(opcoes.excluirPerguntaIds || []);
  const incluirPerguntaIds = opcoes.incluirPerguntaIds
    ? new Set(opcoes.incluirPerguntaIds)
    : null;

  return Object.values(perguntasPersistidas).filter((registro) => {
    if (registro.blocoId !== blocoId) return false;
    if (excluirPerguntaIds.has(registro.perguntaId)) return false;
    if (incluirPerguntaIds && !incluirPerguntaIds.has(registro.perguntaId)) return false;
    return Boolean(limparTexto(registro.resposta));
  });
}

function montarSecaoPrevia(titulo, linhas, textoVazio = PREVIEW_EMPTY_BLOCK_TEXT) {
  return [titulo, ...(linhas.length ? linhas : [textoVazio])].join("\n");
}

function gerarTextoPreviaEstudoCaso({
  metaEstudo,
  identificacaoEstudante,
  perguntasEstado,
  observacoesObjetivas,
}) {
  const perguntasPersistidas = montarPerguntasEstadoPersistido(perguntasEstado);
  const registrosIncluidos = Object.values(perguntasPersistidas).filter(
    (registro) => Boolean(limparTexto(registro.resposta)),
  );
  const fontesConsideradas = FONTE_INFORMACAO_OPTIONS.filter((fonte) =>
    registrosIncluidos.some((registro) => registro.fonte === fonte),
  );

  const linhasIdentificacao = [
    `Aluno: ${preencherValorOuPadrao(identificacaoEstudante.aluno)}`,
    `Data de nascimento: ${preencherValorOuPadrao(
      formatarDataParaTexto(identificacaoEstudante.dataNascimento),
    )}`,
    `Série/Ano: ${preencherValorOuPadrao(identificacaoEstudante.serieAno)}`,
    `Turma: ${preencherValorOuPadrao(identificacaoEstudante.turma)}`,
    `Turno: ${preencherValorOuPadrao(identificacaoEstudante.turno)}`,
    `Professor(a) do AEE: ${preencherValorOuPadrao(identificacaoEstudante.professorAee)}`,
    `Título do estudo: ${preencherValorOuPadrao(metaEstudo.tituloEstudo)}`,
    `Data de início: ${preencherValorOuPadrao(formatarDataParaTexto(metaEstudo.dataInicio))}`,
    `Período: ${preencherValorOuPadrao(metaEstudo.periodo)}`,
    `Responsável pelo preenchimento: ${preencherValorOuPadrao(metaEstudo.responsavel)}`,
  ];
  const linhasFontes = fontesConsideradas.length
    ? [
        `As informações registradas até o momento consideram as seguintes fontes: ${formatarListaNatural(
          fontesConsideradas,
        )}.`,
      ]
    : ["Não há fontes registradas nas respostas preenchidas até o momento."];
  const linhasApresentacaoGeral = gerarLinhasApresentacaoGeralNarrativa(
    metaEstudo,
    identificacaoEstudante,
  );

  const registrosEscuta = obterRegistrosPreviaBloco(perguntasPersistidas, "escuta-estudante");
  const linhasEscuta = montarLinhasNarrativasBloco(
    registrosEscuta,
    PREVIEW_NARRATIVA_BLOCOS["escuta-estudante"],
  );

  const registrosFamilia = obterRegistrosPreviaBloco(perguntasPersistidas, "familia");
  const linhasFamilia = montarLinhasNarrativasBloco(
    registrosFamilia,
    PREVIEW_NARRATIVA_BLOCOS.familia,
  );

  const registrosProfessorRegente = obterRegistrosPreviaBloco(
    perguntasPersistidas,
    "professor-regente",
  );
  const linhasProfessorRegente = montarLinhasNarrativasBloco(
    registrosProfessorRegente,
    PREVIEW_NARRATIVA_BLOCOS["professor-regente"],
  );

  const registrosObservacaoPedagogicaBrutos = obterRegistrosPreviaBloco(
    perguntasPersistidas,
    "observacao-pedagogica",
  );
  const registrosObservacaoPedagogica = registrosObservacaoPedagogicaBrutos
    .map(formatarLinhaObservacaoPedagogica)
    .filter(Boolean);
  const linhasObservacaoPedagogica = [];
  const observacaoComplementar = limparTexto(observacoesObjetivas["observacao-pedagogica"]);
  const fontesObservacaoPedagogica = obterFontesDosRegistros(registrosObservacaoPedagogicaBrutos);

  if (registrosObservacaoPedagogica.length || observacaoComplementar) {
    linhasObservacaoPedagogica.push("Na observação pedagógica escolar, foi registrado que:");
  }

  if (registrosObservacaoPedagogica.length) {
    linhasObservacaoPedagogica.push(...registrosObservacaoPedagogica);
  }

  if (observacaoComplementar) {
    linhasObservacaoPedagogica.push(
      `Nas observações complementares, foi registrado que ${finalizarFrase(observacaoComplementar)}`,
    );
  }

  if (fontesObservacaoPedagogica.length) {
    linhasObservacaoPedagogica.push(
      `Fontes consideradas neste bloco: ${formatarListaNatural(fontesObservacaoPedagogica)}.`,
    );
  }

  const registrosBarreiras = obterRegistrosPreviaBloco(perguntasPersistidas, "barreiras-apoios");
  const linhasBarreiras = montarLinhasNarrativasBloco(
    registrosBarreiras,
    PREVIEW_NARRATIVA_BLOCOS["barreiras-apoios"],
  );

  const registrosAee = obterRegistrosPreviaBloco(perguntasPersistidas, "informacoes-aee");
  const linhasAee = montarLinhasNarrativasBloco(
    registrosAee,
    PREVIEW_NARRATIVA_BLOCOS["informacoes-aee"],
  );

  const registrosSinteseFinal = obterRegistrosPreviaBloco(perguntasPersistidas, "sintese-final", {
    excluirPerguntaIds: Array.from(PERGUNTAS_ENCAMINHAMENTO_IDS),
  });
  const linhasSinteseFinal = montarLinhasNarrativasBloco(
    registrosSinteseFinal,
    PREVIEW_NARRATIVA_BLOCOS["sintese-final"],
  );

  const registrosEncaminhamentos = obterRegistrosPreviaBloco(perguntasPersistidas, "sintese-final", {
    incluirPerguntaIds: Array.from(PERGUNTAS_ENCAMINHAMENTO_IDS),
  });
  const linhasEncaminhamentos = montarLinhasNarrativasBloco(
    registrosEncaminhamentos,
    PREVIEW_NARRATIVA_BLOCOS.encaminhamentos,
  );

  return [
    "ESTUDO DE CASO",
    "",
    "1. Identificação do estudante",
    ...linhasIdentificacao,
    "",
    montarSecaoPrevia("2. Fontes de informação consideradas", linhasFontes),
    "",
    montarSecaoPrevia("3. Apresentação geral do estudante", linhasApresentacaoGeral),
    "",
    montarSecaoPrevia("4. Escuta do estudante", linhasEscuta),
    "",
    montarSecaoPrevia("5. Informações da família/responsáveis", linhasFamilia),
    "",
    montarSecaoPrevia("6. Informações do professor regente", linhasProfessorRegente),
    "",
    montarSecaoPrevia("7. Observação pedagógica escolar", linhasObservacaoPedagogica),
    "",
    montarSecaoPrevia("8. Barreiras, apoios e acessibilidade", linhasBarreiras),
    "",
    montarSecaoPrevia("9. Informações do AEE", linhasAee),
    "",
    montarSecaoPrevia("10. Síntese pedagógica final", linhasSinteseFinal),
    "",
    montarSecaoPrevia("11. Encaminhamentos", linhasEncaminhamentos),
  ].join("\n");
}

function EstudoCasoPage() {
  const { perfil } = useAuth();
  const podeLer = podeVisualizarSondagens(perfil);
  const [metaEstudo, setMetaEstudo] = useState(META_ESTUDO_INICIAL);
  const [identificacaoEstudante, setIdentificacaoEstudante] = useState(IDENTIFICACAO_INICIAL);
  const [formaPreenchimento] = useState("manual");
  const [perguntasEstado, setPerguntasEstado] = useState(() => criarEstadoInicialPerguntas());
  const [estudoCasoSalvoId, setEstudoCasoSalvoId] = useState("");
  const [observacoesObjetivas, setObservacoesObjetivas] = useState(() =>
    criarEstadoObservacoesObjetivas(),
  );
  const [blocosAbertos, setBlocosAbertos] = useState(criarEstadoInicialBlocosAbertos);
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [previaTexto, setPreviaTexto] = useState("");
  const [previaVisivel, setPreviaVisivel] = useState(false);

  const resumoGeral = useMemo(() => {
    return obterResumoGeral(perguntasEstado, identificacaoEstudante);
  }, [identificacaoEstudante, perguntasEstado]);

  useEffect(() => {
    let ativo = true;

    async function carregarRascunhoAnterior() {
      const rascunhoId = obterRascunhoIdLocal();
      if (!rascunhoId) return;

      try {
        const estudoSalvo = await buscarEstudoCasoPorId(rascunhoId);

        if (!ativo) return;

        if (!estudoSalvo) {
          removerRascunhoIdLocal();
          setEstudoCasoSalvoId("");
          setPreviaTexto("");
          setPreviaVisivel(false);
          setAviso("Rascunho anterior nÃ£o foi encontrado. Inicie um novo estudo.");
          return;
        }

        setMetaEstudo({
          tituloEstudo: estudoSalvo.tituloEstudo || "",
          dataInicio: estudoSalvo.dataInicio || "",
          periodo: estudoSalvo.periodo || "",
          responsavel: estudoSalvo.responsavel || "",
          status: estudoSalvo.statusGeral || META_ESTUDO_INICIAL.status,
        });
        setIdentificacaoEstudante({
          ...IDENTIFICACAO_INICIAL,
          ...(estudoSalvo.identificacaoEstudante || {}),
        });
        setPerguntasEstado({
          ...criarEstadoInicialPerguntas(),
          ...(estudoSalvo.perguntasEstado || {}),
        });
        setObservacoesObjetivas({
          ...criarEstadoObservacoesObjetivas(),
          ...(estudoSalvo.observacoesObjetivas || {}),
        });
        setBlocosAbertos(criarEstadoInicialBlocosAbertos());
        setEstudoCasoSalvoId(estudoSalvo.id || rascunhoId);
        setPreviaTexto(limparTexto(estudoSalvo.sintesePrevia));
        setPreviaVisivel(false);
        setAviso("Rascunho anterior carregado.");
      } catch (error) {
        if (!ativo) return;
        console.error("[EstudoCasoPage] Erro ao carregar rascunho anterior", error);
      }
    }

    carregarRascunhoAnterior();

    return () => {
      ativo = false;
    };
  }, []);

  if (!podeLer) {
    return (
      <main className="alunos-page">
        <section className="panel">
          <h1>Estudo de Caso</h1>
          <p>Seu perfil não possui permissão para visualizar esta tela.</p>
        </section>
      </main>
    );
  }

  const atualizarMetaEstudo = (campo, valor) => {
    setMetaEstudo((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const atualizarIdentificacao = (campo, valor) => {
    setIdentificacaoEstudante((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const atualizarPergunta = (blocoId, perguntaId, campo, valor) => {
    const chave = `${blocoId}-${perguntaId}`;

    setPerguntasEstado((prev) => ({
      ...prev,
      [chave]: {
        ...prev[chave],
        [campo]: valor,
      },
    }));
  };

  const atualizarObservacoesObjetivas = (blocoId, valor) => {
    setObservacoesObjetivas((prev) => ({
      ...prev,
      [blocoId]: valor,
    }));
  };

  const alternarBloco = (blocoId) => {
    setBlocosAbertos((prev) => ({
      ...prev,
      [blocoId]: !prev[blocoId],
    }));
  };

  const handleSalvarRascunho = async () => {
    const resumoAtualizado = obterResumoGeral(perguntasEstado, identificacaoEstudante);
    const sintesePreviaAtual = limparTexto(previaTexto)
      ? gerarTextoPreviaEstudoCaso({
          metaEstudo,
          identificacaoEstudante,
          perguntasEstado,
          observacoesObjetivas,
        })
      : "";
    const payload = {
      alunoId: null,
      alunoNome: limparTexto(identificacaoEstudante.aluno),
      tituloEstudo: limparTexto(metaEstudo.tituloEstudo),
      dataInicio: metaEstudo.dataInicio || "",
      periodo: limparTexto(metaEstudo.periodo),
      responsavel: limparTexto(metaEstudo.responsavel),
      statusGeral: metaEstudo.status,
      identificacaoEstudante: normalizarIdentificacaoEstudante(identificacaoEstudante),
      perguntasEstado: montarPerguntasEstadoPersistido(perguntasEstado),
      observacoesObjetivas: montarObservacoesObjetivasPersistidas(observacoesObjetivas),
      resumo: resumoAtualizado,
      sintesePrevia: sintesePreviaAtual,
    };

    setSalvandoRascunho(true);
    setErro("");
    setFeedback("");
    setAviso("");

    try {
      if (estudoCasoSalvoId) {
        await atualizarEstudoCaso(estudoCasoSalvoId, payload);
        salvarRascunhoIdLocal(estudoCasoSalvoId);
      } else {
        const novoEstudoCasoId = await criarEstudoCaso(payload);
        setEstudoCasoSalvoId(novoEstudoCasoId);
        salvarRascunhoIdLocal(novoEstudoCasoId);
      }

      if (sintesePreviaAtual) {
        setPreviaTexto(sintesePreviaAtual);
      }
      setFeedback("Rascunho do Estudo de Caso salvo com sucesso.");
    } catch (error) {
      console.error("[EstudoCasoPage] Erro ao salvar rascunho", error);
      setErro("Não foi possível salvar o rascunho. Tente novamente.");
    } finally {
      setSalvandoRascunho(false);
    }
  };

  const handleNovoEstudo = () => {
    setMetaEstudo({ ...META_ESTUDO_INICIAL });
    setIdentificacaoEstudante({ ...IDENTIFICACAO_INICIAL });
    setPerguntasEstado(criarEstadoInicialPerguntas());
    setObservacoesObjetivas(criarEstadoObservacoesObjetivas());
    setBlocosAbertos(criarEstadoInicialBlocosAbertos());
    setEstudoCasoSalvoId("");
    setPreviaTexto("");
    setPreviaVisivel(false);
    removerRascunhoIdLocal();
    setErro("");
    setAviso("");
    setFeedback("Novo rascunho iniciado nesta tela. O rascunho anterior nÃ£o foi excluÃ­do.");
  };

  const handleGerarSintesePrevia = () => {
    const textoGerado = gerarTextoPreviaEstudoCaso({
      metaEstudo,
      identificacaoEstudante,
      perguntasEstado,
      observacoesObjetivas,
    });

    setPreviaTexto(textoGerado);
    setPreviaVisivel(true);
    setErro("");
    setFeedback("");
    setAviso("");
  };

  const handleCopiarPrevia = async () => {
    if (!previaTexto || typeof window === "undefined" || !window.navigator?.clipboard) {
      setErro("Não foi possível copiar o texto da prévia neste navegador.");
      return;
    }

    try {
      await window.navigator.clipboard.writeText(previaTexto);
      setErro("");
      setFeedback("Texto da prévia copiado com sucesso.");
    } catch (error) {
      console.error("[EstudoCasoPage] Erro ao copiar prévia", error);
      setFeedback("");
      setErro("Não foi possível copiar o texto da prévia. Tente novamente.");
    }
  };

  const handleOcultarPrevia = () => {
    setPreviaVisivel(false);
  };

  const cardsResumo = [
    { chave: "respondida", rotulo: "Respondidas", valor: resumoGeral.respondida },
    { chave: "pendente", rotulo: "Pendentes", valor: resumoGeral.pendente },
    { chave: "ignorada", rotulo: "Ignoradas", valor: resumoGeral.ignorada },
    { chave: "revisar", rotulo: "Em revisão", valor: resumoGeral.revisar },
    { chave: "total", rotulo: "Total", valor: resumoGeral.total },
  ];

  return (
    <main className="alunos-page module-page estudo-caso-page">
      <header className="page-header">
        <h1>Estudo de Caso</h1>
        <p>
          Estrutura funcional visual organizada em uma única página, preparada para futuro
          preenchimento guiado e geração do relatório do Estudo de Caso.
        </p>
        <p className="muted">
          Nesta etapa o rascunho já pode ser salvo no banco, sem integração com outros módulos
          da plataforma. A prévia textual continua local na tela e, quando já gerada, acompanha
          o próximo salvamento do rascunho.
        </p>
      </header>

      {feedback ? <p className="toast-success">{feedback}</p> : null}
      {aviso ? <p className="muted">{aviso}</p> : null}
      {erro ? <p className="toast-error">{erro}</p> : null}

      <section className="panel estudo-caso-header-panel">
        <div className="estudo-caso-note">
          Aviso de segurança: esta versão salva apenas o rascunho do Estudo de Caso no Firestore
          e gera uma prévia textual local, sem IA, sem exportação e sem integração com módulos
          externos.
        </div>
      </section>

      <section className="panel">
        <div className="estudo-caso-section-header">
          <div>
            <h2>Dados iniciais do estudo</h2>
            <p className="muted">
              Informações gerais do estudo e do rascunho pedagógico desta etapa funcional.
            </p>
          </div>
        </div>

        <div className="estudo-caso-iniciais-grid">
          <div className="estudo-caso-field estudo-caso-field-span-2">
            <label htmlFor="estudoCasoTitulo">Título do estudo</label>
            <input
              id="estudoCasoTitulo"
              value={metaEstudo.tituloEstudo}
              placeholder="Ex.: Estudo de Caso Pedagógico do 2º bimestre."
              onChange={(event) => atualizarMetaEstudo("tituloEstudo", event.target.value)}
            />
          </div>

          <div className="estudo-caso-field">
            <label htmlFor="estudoCasoDataInicio">Data de início</label>
            <input
              id="estudoCasoDataInicio"
              type="date"
              value={metaEstudo.dataInicio}
              onChange={(event) => atualizarMetaEstudo("dataInicio", event.target.value)}
            />
          </div>

          <div className="estudo-caso-field">
            <label htmlFor="estudoCasoPeriodo">Ano letivo / período</label>
            <input
              id="estudoCasoPeriodo"
              value={metaEstudo.periodo}
              placeholder="Ex.: 2026 - 2º bimestre"
              onChange={(event) => atualizarMetaEstudo("periodo", event.target.value)}
            />
          </div>

          <div className="estudo-caso-field">
            <label htmlFor="estudoCasoResponsavel">Responsável pelo preenchimento</label>
            <input
              id="estudoCasoResponsavel"
              value={metaEstudo.responsavel}
              placeholder="Nome da professora ou profissional responsável."
              onChange={(event) => atualizarMetaEstudo("responsavel", event.target.value)}
            />
          </div>

          <div className="estudo-caso-field">
            <label htmlFor="estudoCasoStatus">Status</label>
            <select
              id="estudoCasoStatus"
              value={metaEstudo.status}
              onChange={(event) => atualizarMetaEstudo("status", event.target.value)}
            >
              {STATUS_ESTUDO_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="estudo-caso-top-grid">
        <section className="panel">
          <div className="estudo-caso-section-header">
            <div>
              <h2>Painel de acompanhamento</h2>
              <p className="muted">
                Contadores locais desta tela, atualizados conforme o preenchimento visual e o
                status das perguntas.
              </p>
            </div>
          </div>

          <div className="estudo-caso-counter-grid">
            {cardsResumo.map((card) => (
              <article key={card.chave} className={`estudo-caso-counter-card is-${card.chave}`}>
                <span className="estudo-caso-counter-label">{card.rotulo}</span>
                <strong className="estudo-caso-counter-value">{card.valor}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="estudo-caso-section-header">
            <div>
              <h2>Forma de preenchimento</h2>
              <p className="muted">
                Apenas o modo manual está ativo nesta etapa. Os demais permanecem como recursos
                futuros.
              </p>
            </div>
          </div>

          <div className="estudo-caso-mode-grid">
            {FORMAS_PREENCHIMENTO.map((forma) => (
              <article
                key={forma.id}
                className={`estudo-caso-mode-card ${forma.ativa ? "is-active" : "is-future"}`}
                aria-current={forma.id === formaPreenchimento ? "true" : "false"}
              >
                <div className="estudo-caso-mode-header">
                  <h3>{forma.titulo}</h3>
                  <span className={`estudo-caso-pill ${forma.ativa ? "is-active" : "is-future"}`}>
                    {forma.status}
                  </span>
                </div>
                <p className="muted">{forma.descricao}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="estudo-caso-section-header">
          <div>
            <h2>Blocos do Estudo de Caso</h2>
            <p className="muted">
              Todos os blocos permanecem na mesma página, agora com perguntas investigativas,
              respostas locais, fonte da informação e status visual.
            </p>
          </div>
        </div>

        <div className="estudo-caso-blocks">
          {BLOCOS_ESTUDO_CASO.map((bloco, indiceBloco) => {
            const resumoBloco = obterResumoBloco(bloco, perguntasEstado, identificacaoEstudante);
            const aberto = blocosAbertos[bloco.id];

            return (
              <section key={bloco.id} className="form-section estudo-caso-card">
                <button
                  type="button"
                  className="estudo-caso-card-toggle"
                  onClick={() => alternarBloco(bloco.id)}
                  aria-expanded={aberto}
                >
                  <div className="estudo-caso-card-header">
                    <span className="estudo-caso-card-index">{indiceBloco + 1}</span>
                    <div>
                      <h3>{bloco.titulo}</h3>
                      <p className="muted">{bloco.descricao}</p>
                    </div>
                  </div>

                  <div className="estudo-caso-card-side">
                    <div className="estudo-caso-card-meta">
                      <span className="estudo-caso-status-chip is-respondida">
                        {resumoBloco.respondida} respondidas
                      </span>
                      <span className="estudo-caso-status-chip is-pendente">
                        {resumoBloco.pendente} pendentes
                      </span>
                    </div>
                    <span className={`estudo-caso-chevron ${aberto ? "is-open" : ""}`}>⌄</span>
                  </div>
                </button>

                {aberto && bloco.tipo === "identificacao" && (
                  <div className="estudo-caso-question-list">
                    <article className="estudo-caso-question-card">
                      <p className="muted estudo-caso-block-note">
                        Campos visuais de identificação do estudante, ainda sem integração com o
                        cadastro da plataforma.
                      </p>

                      <div className="estudo-caso-identificacao-grid">
                        {IDENTIFICACAO_FIELDS.map((campo) => (
                          <div key={campo.id} className="estudo-caso-question-field">
                            <label htmlFor={`identificacao-${campo.id}`}>{campo.label}</label>
                            <input
                              id={`identificacao-${campo.id}`}
                              value={identificacaoEstudante[campo.id]}
                              placeholder={campo.placeholder}
                              onChange={(event) =>
                                atualizarIdentificacao(campo.id, event.target.value)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>
                )}

                {aberto && bloco.tipo !== "identificacao" && (
                  <div className="estudo-caso-question-list">
                    {bloco.perguntas.map((pergunta, indicePergunta) => {
                      const chave = `${bloco.id}-${pergunta.id}`;
                      const registro = perguntasEstado[chave];
                      const numeracaoPergunta = `${indiceBloco + 1}.${indicePergunta + 1}`;

                      return (
                        <article key={chave} className="estudo-caso-question-card">
                          <div className="estudo-caso-question-top">
                            <p className="estudo-caso-question-text">
                              {numeracaoPergunta} {pergunta.enunciado}
                            </p>
                            <span className={`estudo-caso-status-chip is-${registro.status}`}>
                              {
                                STATUS_PERGUNTA_OPTIONS.find((status) => status.value === registro.status)
                                  ?.label
                              }
                            </span>
                          </div>

                          <div className="estudo-caso-question-grid">
                            <div className="estudo-caso-question-field is-resposta">
                              <label htmlFor={`${chave}-resposta`}>
                                {bloco.tipo === "objetiva" ? "Resposta objetiva" : "Resposta"}
                              </label>

                              {bloco.tipo === "objetiva" ? (
                                <div className="estudo-caso-choice-group">
                                  {pergunta.opcoes.map((opcao) => (
                                    <button
                                      key={opcao}
                                      type="button"
                                      className={`estudo-caso-choice-button ${
                                        registro.resposta === opcao ? "is-selected" : ""
                                      }`}
                                      onClick={() =>
                                        atualizarPergunta(bloco.id, pergunta.id, "resposta", opcao)
                                      }
                                    >
                                      {opcao}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <textarea
                                  id={`${chave}-resposta`}
                                  rows={4}
                                  placeholder="Registre aqui as informações observadas ou relatadas sobre esta pergunta."
                                  value={registro.resposta}
                                  onChange={(event) =>
                                    atualizarPergunta(
                                      bloco.id,
                                      pergunta.id,
                                      "resposta",
                                      event.target.value,
                                    )
                                  }
                                />
                              )}
                            </div>

                            <div className="estudo-caso-question-field">
                              <label htmlFor={`${chave}-fonte`}>Fonte da informação</label>
                              <select
                                id={`${chave}-fonte`}
                                value={registro.fonte}
                                onChange={(event) =>
                                  atualizarPergunta(
                                    bloco.id,
                                    pergunta.id,
                                    "fonte",
                                    event.target.value,
                                  )
                                }
                              >
                                <option value="">Selecione a fonte</option>
                                {FONTE_INFORMACAO_OPTIONS.map((fonte) => (
                                  <option key={fonte} value={fonte}>
                                    {fonte}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="estudo-caso-question-field">
                              <label htmlFor={`${chave}-status`}>Status</label>
                              <select
                                id={`${chave}-status`}
                                value={registro.status}
                                onChange={(event) =>
                                  atualizarPergunta(
                                    bloco.id,
                                    pergunta.id,
                                    "status",
                                    event.target.value,
                                  )
                                }
                              >
                                {STATUS_PERGUNTA_OPTIONS.map((status) => (
                                  <option key={status.value} value={status.value}>
                                    {status.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </article>
                      );
                    })}

                    {bloco.tipo === "objetiva" && (
                      <article className="estudo-caso-question-card">
                        <div className="estudo-caso-question-top">
                          <p className="estudo-caso-question-text">{bloco.observacoesLabel}</p>
                        </div>

                        <div className="estudo-caso-question-field is-resposta">
                          <label htmlFor={`${bloco.id}-observacoes`}>Observações</label>
                          <textarea
                            id={`${bloco.id}-observacoes`}
                            rows={4}
                            placeholder="Registre observações adicionais sobre a observação pedagógica."
                            value={observacoesObjetivas[bloco.id] || ""}
                            onChange={(event) =>
                              atualizarObservacoesObjetivas(bloco.id, event.target.value)
                            }
                          />
                        </div>
                      </article>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="estudo-caso-section-header">
          <div>
            <h2>Próximas ações</h2>
            <p className="muted">
              O rascunho já pode ser salvo e a prévia textual pode ser gerada localmente. A
              conclusão do estudo continua reservada para as próximas etapas do módulo.
            </p>
          </div>
        </div>

        <div className="form-actions estudo-caso-actions">
          <button type="button" onClick={handleSalvarRascunho} disabled={salvandoRascunho}>
            {salvandoRascunho ? "Salvando rascunho..." : "Salvar rascunho"}
          </button>
          <button type="button" className="btn-secondary" onClick={handleNovoEstudo}>
            Novo estudo
          </button>
          <button type="button" className="btn-secondary" onClick={handleGerarSintesePrevia}>
            Gerar síntese do Estudo de Caso
          </button>
          <button type="button" className="btn-secondary" disabled title="Recurso futuro">
            Concluir Estudo de Caso
          </button>
        </div>

        <p className="estudo-caso-future-note">
          Recurso futuro: concluir o Estudo de Caso permanece desativado nesta etapa.
        </p>
      </section>

      {previaVisivel ? (
        <section className="panel estudo-caso-preview-panel">
          <div className="estudo-caso-section-header">
            <div>
              <h2>Prévia do texto do Estudo de Caso</h2>
              <p className="muted">
                Texto gerado a partir das respostas preenchidas. Revise antes de usar em
                documentos oficiais.
              </p>
            </div>

            <div className="estudo-caso-preview-actions">
              <button type="button" className="btn-secondary" onClick={handleCopiarPrevia}>
                Copiar texto
              </button>
              <button type="button" className="btn-secondary" onClick={handleOcultarPrevia}>
                Ocultar prévia
              </button>
            </div>
          </div>

          <textarea
            className="estudo-caso-preview-textarea"
            rows={24}
            value={previaTexto}
            onChange={(event) => setPreviaTexto(event.target.value)}
          />
        </section>
      ) : null}
    </main>
  );
}

export default EstudoCasoPage;
