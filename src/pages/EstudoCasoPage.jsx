import { useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { podeVisualizarSondagens } from "../utils/permissions";

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

function EstudoCasoPage() {
  const { perfil } = useAuth();
  const podeLer = podeVisualizarSondagens(perfil);
  const [metaEstudo, setMetaEstudo] = useState(META_ESTUDO_INICIAL);
  const [identificacaoEstudante, setIdentificacaoEstudante] = useState(IDENTIFICACAO_INICIAL);
  const [formaPreenchimento] = useState("manual");
  const [perguntasEstado, setPerguntasEstado] = useState(() => criarEstadoInicialPerguntas());
  const [observacoesObjetivas, setObservacoesObjetivas] = useState(() =>
    criarEstadoObservacoesObjetivas(),
  );
  const [blocosAbertos, setBlocosAbertos] = useState(() =>
    Object.fromEntries(BLOCOS_ESTUDO_CASO.map((bloco) => [bloco.id, true])),
  );

  const resumoGeral = useMemo(() => {
    const registros = BLOCOS_ESTUDO_CASO.flatMap((bloco) =>
      obterRegistrosBloco(bloco, perguntasEstado, identificacaoEstudante),
    );

    return contarPorStatus(registros);
  }, [identificacaoEstudante, perguntasEstado]);

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
          Nesta etapa ainda não há salvamento no banco, nem integração com outros módulos da
          plataforma.
        </p>
      </header>

      <section className="panel estudo-caso-header-panel">
        <div className="estudo-caso-note">
          Aviso de segurança: esta versão usa apenas estado local para organizar a experiência
          visual. Nenhuma resposta é persistida e nenhum módulo externo é alterado.
        </div>
      </section>

      <section className="panel">
        <div className="estudo-caso-section-header">
          <div>
            <h2>Dados iniciais do estudo</h2>
            <p className="muted">
              Informações gerais do estudo, mantidas apenas localmente nesta etapa visual.
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
                    {bloco.perguntas.map((pergunta) => {
                      const chave = `${bloco.id}-${pergunta.id}`;
                      const registro = perguntasEstado[chave];

                      return (
                        <article key={chave} className="estudo-caso-question-card">
                          <div className="estudo-caso-question-top">
                            <p className="estudo-caso-question-text">{pergunta.enunciado}</p>
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
                                  placeholder="Digite a resposta desta pergunta."
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
              Os botões abaixo permanecem apenas como sinalização visual da próxima etapa do
              módulo.
            </p>
          </div>
        </div>

        <div className="form-actions estudo-caso-disabled-actions">
          <button type="button" disabled title="Recurso futuro">
            Salvar rascunho
          </button>
          <button type="button" className="btn-secondary" disabled title="Recurso futuro">
            Gerar síntese do Estudo de Caso
          </button>
          <button type="button" className="btn-secondary" disabled title="Recurso futuro">
            Concluir Estudo de Caso
          </button>
        </div>

        <p className="estudo-caso-future-note">
          Recurso futuro: nesta etapa a tela serve apenas para validação visual e preenchimento
          local guiado, sem salvar no banco.
        </p>
      </section>
    </main>
  );
}

export default EstudoCasoPage;
