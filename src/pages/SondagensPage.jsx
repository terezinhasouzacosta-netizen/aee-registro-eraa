import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { listarAlunos, listarAlunosPorIds } from "../services/alunosService";
import {
  atualizarSondagem,
  criarSondagem,
  excluirSondagem,
  listarSondagens,
} from "../services/sondagensService";
import { buscarIdsAlunosVinculados } from "../services/vinculacoesService";
import {
  podeEditarSondagens,
  podeVisualizarSondagens,
  visualizaSomenteVinculados,
} from "../utils/permissions";

const AVALIACAO_OPCOES = [
  "Não observado",
  "Não realiza",
  "Realiza com muito apoio",
  "Realiza com apoio",
  "Realiza parcialmente",
  "Realiza com autonomia",
];

const CAMPOS_PADRONIZADOS = [
  ["leitura", "Leitura"],
  ["escrita", "Escrita"],
  ["matematica", "Matemática"],
  ["comunicacao", "Comunicação"],
  ["interacaoSocial", "Interação social"],
  ["autonomia", "Autonomia"],
  ["comportamento", "Comportamento"],
  ["coordenacaoMotora", "Coordenação motora"],
  ["atencaoConcentracao", "Atenção e concentração"],
];

const CAMPOS_SINTESE = [
  {
    key: "sintesePotencialidadesInteresses",
    titulo: "Potencialidades e interesses do estudante",
    aliases: ["Potencialidades e interesses do estudante"],
  },
  {
    key: "sinteseHabilidadesConsolidadas",
    titulo: "Habilidades consolidadas",
    aliases: ["Habilidades consolidadas"],
  },
  {
    key: "sinteseHabilidadesDesenvolvimento",
    titulo: "Habilidades em desenvolvimento",
    aliases: ["Habilidades em desenvolvimento"],
  },
  {
    key: "sinteseHabilidadesPrioritarias",
    titulo: "Habilidades prioritárias para intervenções",
    aliases: [
      "Habilidades prioritárias para intervenções",
      "Habilidades prioritárias para intervenção",
    ],
  },
  {
    key: "sinteseRecomendacoesEncaminhamentos",
    titulo: "Recomendações pedagógicas e encaminhamentos",
    aliases: ["Recomendações pedagógicas e encaminhamentos"],
  },
];

const BLOCOS_AVALIACAO = [
  {
    numero: 1,
    id: "comunicacao-linguagem",
    titulo: "Comunicação e Linguagem",
    campoSintese: "comunicacao",
    perguntas: [
      "Comunica desejos, necessidades e desconfortos espontaneamente.",
      "Utiliza linguagem verbal de forma funcional.",
      "Utiliza gestos, imagens, Libras ou comunicação alternativa quando necessário.",
      "Compreende instruções simples e com mais de uma etapa.",
      "Solicita ajuda quando necessita.",
      "Responde perguntas simples de forma adequada.",
      "Mantém diálogo respeitando os turnos da conversa.",
      "Relata acontecimentos ou experiências de forma compreensível.",
      "Utiliza vocabulário funcional adequado ao contexto.",
      "Mantém contato visual durante a comunicação, quando pertinente ao perfil do estudante.",
      "Apresenta repetição frequente de palavras ou frases sem função comunicativa.",
    ],
  },
  {
    numero: 2,
    id: "interacao-social",
    titulo: "Interação Social",
    campoSintese: "interacaoSocial",
    perguntas: [
      "Interage com adultos de referência.",
      "Interage com os colegas.",
      "Participa de atividades em dupla ou grupo.",
      "Aguarda sua vez e respeita turnos.",
      "Compreende e respeita regras e combinados.",
      "Compartilha materiais e cuida dos próprios pertences.",
      "Reconhece e expressa sentimentos e emoções.",
      "Comunica desconforto ou necessidade de ajuda/pausa.",
      "Demonstra iniciativa para interagir com outras pessoas.",
      "Apresenta comportamentos que possam causar danos a si ou aos outros.",
    ],
  },
  {
    numero: 3,
    id: "convivencia-autorregulacao",
    titulo: "Convivência e Autorregulação",
    campoSintese: "comportamento",
    perguntas: [
      "Aceita mudanças na rotina.",
      "Lida com frustrações.",
      "Controla impulsos.",
      "Permanece na atividade proposta.",
      "Necessita mediação constante para regular o comportamento.",
      "Demonstra estratégias para se acalmar.",
      "Aceita orientações do adulto.",
      "Permanece sentado quando a atividade exige.",
      "Organiza seus materiais durante as atividades.",
    ],
  },
  {
    numero: 4,
    id: "locomocao-orientacao-seguranca",
    titulo: "Locomoção, Orientação e Segurança",
    campoSintese: "",
    perguntas: [
      "Desloca-se com segurança pelos espaços da escola.",
      "Reconhece os principais ambientes escolares.",
      "Segue orientações de deslocamento.",
      "Identifica situações de risco.",
      "Utiliza escadas, rampas ou corredores com segurança.",
      "Necessita acompanhamento para locomoção.",
      "Orienta-se na rotina escolar.",
      "Localiza sozinho os principais espaços da escola.",
      "Utiliza materiais e mobiliários escolares com segurança.",
    ],
  },
  {
    numero: 5,
    id: "alimentacao-higiene-autonomia",
    titulo: "Alimentação, Higiene e Autonomia Pessoal",
    campoSintese: "autonomia",
    perguntas: [
      "Alimenta-se com autonomia.",
      "Utiliza talheres ou utensílios adequadamente.",
      "Lava as mãos.",
      "Utiliza o banheiro com autonomia.",
      "Realiza cuidados de higiene pessoal conforme sua faixa etária.",
      "Organiza seus pertences pessoais.",
      "Realiza atividades de autocuidado conforme sua faixa etária.",
    ],
  },
  {
    numero: 6,
    id: "autonomia-escolar",
    titulo: "Autonomia Escolar",
    campoSintese: "",
    perguntas: [
      "Organiza seus materiais escolares.",
      "Copia do quadro ou de material de apoio com autonomia.",
      "Inicia as atividades propostas sem necessidade de incentivo constante.",
      "Realiza as atividades escolares com autonomia.",
      "Realiza as avaliações com autonomia.",
      "Conclui as atividades propostas.",
      "Solicita ajuda quando necessário.",
      "Guarda os materiais após o uso.",
      "Cumpre a rotina escolar com autonomia.",
      "Utiliza agenda, caderno e demais materiais de forma organizada.",
      "Entrega atividades no tempo previsto.",
      "Demonstra independência crescente na realização das atividades escolares.",
    ],
  },
  {
    numero: 7,
    id: "coordenacao-motora",
    titulo: "Coordenação Motora",
    campoSintese: "coordenacaoMotora",
    perguntas: [
      "Segura e utiliza o lápis ou instrumento de escrita com coordenação adequada.",
      "Realiza pintura, traçado ou contorno.",
      "Recorta com tesoura.",
      "Cola, encaixa ou manipula materiais pequenos.",
      "Apresenta coordenação motora ampla em deslocamentos e brincadeiras.",
      "Mantém equilíbrio corporal.",
      "Participa de atividades motoras propostas.",
      "Apresenta legibilidade na escrita.",
    ],
  },
  {
    numero: 8,
    id: "leitura",
    titulo: "Leitura",
    campoSintese: "leitura",
    perguntas: [
      "Reconhece o próprio nome.",
      "Diferencia letras, números e outros símbolos.",
      "Reconhece letras do alfabeto.",
      "Identifica sons iniciais e finais das palavras.",
      "Relaciona letra e som.",
      "Reconhece palavras familiares.",
      "Lê sílabas.",
      "Lê palavras.",
      "Lê palavras novas.",
      "Lê frases simples.",
      "Compreende histórias ou textos lidos pelo professor.",
      "Compreende pequenos textos.",
      "Ordena sequência de imagens ou histórias.",
      "Localiza informações em textos, imagens ou recursos visuais.",
    ],
  },
  {
    numero: 9,
    id: "escrita",
    titulo: "Escrita",
    campoSintese: "escrita",
    perguntas: [
      "Escreve o próprio nome.",
      "Escreve letras do alfabeto.",
      "Escreve sílabas.",
      "Copia letras, palavras ou frases.",
      "Escreve palavras ditadas.",
      "Escreve palavras espontaneamente.",
      "Produz frases simples.",
      "Produz pequenos textos.",
      "Organiza ideias por escrito.",
      "Utiliza espaçamento entre palavras.",
      "Utiliza pontuação básica.",
      "Registra respostas por escrita, desenho ou outro recurso.",
    ],
  },
  {
    numero: 10,
    id: "atencao",
    titulo: "Atenção e Funções Executivas",
    campoSintese: "atencaoConcentracao",
    perguntas: [
      "Mantém atenção em atividades curtas.",
      "Mantém atenção em atividades mais longas.",
      "Mantém foco atencional durante as atividades propostas.",
      "Inicia atividades após orientação.",
      "Mantém-se engajado na atividade até sua conclusão.",
      "Distrai-se facilmente com estímulos externos.",
      "Necessita redirecionamento frequente.",
      "Compreende e mantém a sequência da atividade.",
      "Organiza materiais e espaço de trabalho.",
      "Retoma a atividade após interrupções.",
      "Confere o próprio trabalho antes de finalizar.",
      "Tolera correções e tenta novamente.",
      "Demonstra curiosidade sobre assuntos do dia a dia.",
    ],
  },
  {
    numero: 11,
    id: "memoria",
    titulo: "Memória",
    campoSintese: "",
    perguntas: [
      "Recorda combinados da rotina.",
      "Lembra instruções dadas anteriormente.",
      "Recorda conteúdos trabalhados anteriormente.",
      "Reconhece pessoas, espaços e objetos familiares.",
      "Memoriza sequências simples.",
      "Recorda fatos ou acontecimentos recentes.",
      "Relaciona experiências anteriores com novas aprendizagens.",
      "Memoriza nomes de pessoas e objetos.",
      "Memoriza letras, números ou símbolos.",
      "Memoriza sequência de ações.",
      "Retoma aprendizagens após um intervalo de tempo.",
      "Evoca informações quando solicitado.",
    ],
  },
  {
    numero: 12,
    id: "raciocinio-matematico",
    titulo: "Raciocínio Lógico-Matemático",
    campoSintese: "matematica",
    perguntas: [
      "Reconhece números.",
      "Conta oralmente.",
      "Relaciona número e quantidade.",
      "Identifica antecessor e sucessor.",
      "Compara quantidades.",
      "Classifica objetos por cor, forma, tamanho ou função.",
      "Organiza sequências e padrões.",
      "Resolve situações-problema simples.",
      "Realiza adição com apoio concreto.",
      "Realiza subtração com apoio concreto.",
      "Realiza cálculos mentais simples.",
      "Realiza multiplicações simples.",
      "Realiza divisões simples.",
      "Compreende os conceitos de mais e menos.",
      "Compreende inteiro, metade e dobro.",
      "Compreende medidas de tempo.",
      "Identifica os dias da semana.",
      "Identifica os meses do ano.",
      "Reconhece horas exatas em relógio digital ou analógico.",
      "Reconhece moedas, cédulas e valores monetários.",
    ],
  },
];

const formInicial = {
  alunoId: "",
  nome: "",
  dataNascimento: "",
  dataSondagem: "",
  periodo: "",
  responsavelAplicacao: "",
  leitura: "",
  escrita: "",
  matematica: "",
  comunicacao: "",
  interacaoSocial: "",
  autonomia: "",
  comportamento: "",
  coordenacaoMotora: "",
  atencaoConcentracao: "",
  observacoes: "",
  encaminhamentos: "",
  sintesePotencialidadesInteresses: "",
  sinteseHabilidadesConsolidadas: "",
  sinteseHabilidadesDesenvolvimento: "",
  sinteseHabilidadesPrioritarias: "",
  sinteseRecomendacoesEncaminhamentos: "",
};

function criarRespostasDetalhadasIniciais() {
  const respostas = {};

  BLOCOS_AVALIACAO.forEach((bloco) => {
    bloco.perguntas.forEach((_, index) => {
      respostas[`${bloco.id}-pergunta-${index}`] = "";
    });
  });

  return respostas;
}

function extrairSinteseDiagnostica(texto = "") {
  const resultado = Object.fromEntries(CAMPOS_SINTESE.map((campo) => [campo.key, ""]));
  const textoLimpo = String(texto || "").trim();

  if (!textoLimpo) return resultado;

  const linhas = textoLimpo.split(/\r?\n/);
  let chaveAtual = null;
  let encontrouCabecalho = false;

  linhas.forEach((linha) => {
    const linhaLimpa = linha.trim();
    const cabecalho = CAMPOS_SINTESE.find((campo) =>
      (campo.aliases || [campo.titulo]).some((alias) => linhaLimpa.startsWith(`${alias}:`))
    );

    if (cabecalho) {
      encontrouCabecalho = true;
      chaveAtual = cabecalho.key;
      const aliasUsado = (cabecalho.aliases || [cabecalho.titulo]).find((alias) =>
        linhaLimpa.startsWith(`${alias}:`)
      );
      const conteudoNaMesmaLinha = linhaLimpa.slice((aliasUsado || cabecalho.titulo).length + 1).trim();
      if (conteudoNaMesmaLinha) {
        resultado[chaveAtual] = conteudoNaMesmaLinha;
      }
      return;
    }

    if (chaveAtual) {
      resultado[chaveAtual] = resultado[chaveAtual]
        ? `${resultado[chaveAtual]}\n${linha}`
        : linha;
    }
  });

  if (!encontrouCabecalho) {
    resultado.sinteseRecomendacoesEncaminhamentos = textoLimpo;
  }

  return resultado;
}

function montarSinteseDiagnostica(form) {
  return CAMPOS_SINTESE.map((campo) => {
    const valor = String(form[campo.key] || "").trim();
    return valor ? `${campo.titulo}:\n${valor}` : "";
  })
    .filter(Boolean)
    .join("\n\n");
}

function formatarDataFlex(data) {
  if (!data) return "-";
  if (data?.toDate) return data.toDate().toLocaleDateString("pt-BR");
  const parsed = new Date(data);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString("pt-BR");
}

function obterMensagemErro(error, mensagemPadrao) {
  const code = String(error?.code || "");
  if (code.includes("permission-denied")) {
    return "Acesso negado para esta consulta no Firestore.";
  }
  if (code.includes("failed-precondition")) {
    return "A consulta exige índice no Firestore. Verifique o console do Firebase.";
  }
  return mensagemPadrao;
}

function SondagensPage() {
  const { currentUser, perfil } = useAuth();
  const [alunos, setAlunos] = useState([]);
  const [alunoIdSelecionado, setAlunoIdSelecionado] = useState("");
  const [sondagens, setSondagens] = useState([]);
  const [form, setForm] = useState(formInicial);
  const [respostasDetalhadas, setRespostasDetalhadas] = useState(criarRespostasDetalhadasIniciais);
  const [sondagemEmEdicao, setSondagemEmEdicao] = useState(null);
  const [idsPermitidos, setIdsPermitidos] = useState(undefined);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingLista, setLoadingLista] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sondagemImpressaoId, setSondagemImpressaoId] = useState("");

  const podeLer = podeVisualizarSondagens(perfil);
  const podeEditar = podeEditarSondagens(perfil);
  const somenteVinculados = visualizaSomenteVinculados(perfil);

  const alunoSelecionado = useMemo(
    () => alunos.find((item) => item.id === alunoIdSelecionado) || null,
    [alunos, alunoIdSelecionado]
  );

  const carregarBase = async () => {
    if (!currentUser || !podeLer) return;

    setLoadingBase(true);
    setErro("");

    try {
      let ids = undefined;
      let alunosData = [];

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
      setErro(obterMensagemErro(error, "Não foi possível carregar os dados dos alunos."));
    } finally {
      setLoadingBase(false);
    }
  };

  const carregarSondagens = async () => {
    if (!currentUser || !podeLer || !alunoIdSelecionado) {
      setSondagens([]);
      return;
    }

    setLoadingLista(true);

    try {
      const data = await listarSondagens({
        alunoId: alunoIdSelecionado,
        alunoIdsPermitidos: idsPermitidos,
      });
      setSondagens(data);
      setErro("");
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível carregar as sondagens."));
    } finally {
      setLoadingLista(false);
    }
  };

  useEffect(() => {
    carregarBase();
  }, [currentUser, perfil]);

  useEffect(() => {
    carregarSondagens();
  }, [currentUser, podeLer, alunoIdSelecionado, idsPermitidos]);

  useEffect(() => {
    const alunoAtual =
      alunos.find((item) => item.id === alunoIdSelecionado) || null;

    setForm((prev) => ({
      ...prev,
      alunoId: alunoIdSelecionado || "",
      nome: alunoAtual?.nome || "",
      dataNascimento: alunoAtual?.dataNascimento || "",
      responsavelAplicacao:
        prev.responsavelAplicacao || currentUser?.displayName || currentUser?.email || "",
    }));
  }, [alunoIdSelecionado, currentUser, alunos]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "alunoId") {
      const alunoAtual = alunos.find((item) => item.id === value) || null;
      setAlunoIdSelecionado(value);
      setForm((prev) => ({
        ...prev,
        alunoId: value,
        nome: alunoAtual?.nome || "",
        dataNascimento: alunoAtual?.dataNascimento || "",
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const limparFormulario = () => {
    setSondagemEmEdicao(null);
    setForm({
      ...formInicial,
      alunoId: alunoIdSelecionado,
      responsavelAplicacao: currentUser?.displayName || currentUser?.email || "",
    });
    setRespostasDetalhadas(criarRespostasDetalhadasIniciais());
  };

  const handleSalvar = async (event) => {
    event.preventDefault();
    if (!podeEditar || !currentUser || !alunoSelecionado) return;

    setSalvando(true);
    setErro("");
    setFeedback("");

    const payload = {
      alunoId: alunoSelecionado.id,
      alunoNome: form.nome || alunoSelecionado.nome || "",
      alunoDataNascimento: form.dataNascimento || alunoSelecionado.dataNascimento || "",
      dataSondagem: form.dataSondagem,
      periodo: form.periodo.trim(),
      responsavelAplicacao: form.responsavelAplicacao.trim(),
      leitura: form.leitura,
      escrita: form.escrita,
      matematica: form.matematica,
      comunicacao: form.comunicacao,
      interacaoSocial: form.interacaoSocial,
      autonomia: form.autonomia,
      comportamento: form.comportamento,
      coordenacaoMotora: form.coordenacaoMotora,
      atencaoConcentracao: form.atencaoConcentracao,
      observacoes: form.observacoes.trim(),
      encaminhamentos: montarSinteseDiagnostica(form),
    };

    try {
      if (sondagemEmEdicao) {
        await atualizarSondagem(sondagemEmEdicao.id, payload);
        setFeedback("Sondagem atualizada com sucesso.");
      } else {
        await criarSondagem(payload, currentUser.uid);
        setFeedback("Sondagem cadastrada com sucesso.");
      }

      limparFormulario();
      await carregarSondagens();
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível salvar a sondagem."));
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (sondagem) => {
    if (!podeEditar) return;
    const alunoDaSondagem = alunos.find((item) => item.id === sondagem.alunoId) || null;
    const sintese = extrairSinteseDiagnostica(sondagem.encaminhamentos || "");

    setSondagemEmEdicao(sondagem);
    setAlunoIdSelecionado(sondagem.alunoId || alunoIdSelecionado);
    setForm({
      alunoId: sondagem.alunoId || alunoIdSelecionado,
      nome: sondagem.alunoNome || alunoDaSondagem?.nome || "",
      dataNascimento: sondagem.alunoDataNascimento || alunoDaSondagem?.dataNascimento || "",
      dataSondagem: sondagem.dataSondagem || "",
      periodo: sondagem.periodo || "",
      responsavelAplicacao: sondagem.responsavelAplicacao || "",
      leitura: sondagem.leitura || "",
      escrita: sondagem.escrita || "",
      matematica: sondagem.matematica || "",
      comunicacao: sondagem.comunicacao || "",
      interacaoSocial: sondagem.interacaoSocial || "",
      autonomia: sondagem.autonomia || "",
      comportamento: sondagem.comportamento || "",
      coordenacaoMotora: sondagem.coordenacaoMotora || "",
      atencaoConcentracao: sondagem.atencaoConcentracao || "",
      observacoes: sondagem.observacoes || "",
      encaminhamentos: sondagem.encaminhamentos || "",
      ...sintese,
    });
    setRespostasDetalhadas(criarRespostasDetalhadasIniciais());
  };

  const handleExcluir = async (sondagem) => {
    if (!podeEditar) return;
    const confirma = window.confirm("Deseja excluir esta sondagem?");
    if (!confirma) return;

    try {
      await excluirSondagem(sondagem.id);
      if (sondagemEmEdicao?.id === sondagem.id) limparFormulario();
      setFeedback("Sondagem excluída com sucesso.");
      await carregarSondagens();
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível excluir a sondagem."));
    }
  };

  const handleImprimir = (sondagem) => {
    setSondagemImpressaoId(sondagem.id);
    setTimeout(() => {
      window.print();
      setTimeout(() => setSondagemImpressaoId(""), 200);
    }, 100);
  };

  const handlePerguntaDetalhadaChange = (event) => {
    const { name, value } = event.target;
    setRespostasDetalhadas((prev) => ({ ...prev, [name]: value }));
  };

  const renderSelectAvaliacao = (name, label, opcoes = {}) => {
    const {
      disabled = false,
      reservado = false,
      helperText = "",
      onChange,
      value,
      containerClassName = "",
    } = opcoes;
    const valorAtual = value ?? form[name] ?? "";
    const valorNaoPadrao =
      valorAtual && !AVALIACAO_OPCOES.includes(valorAtual) ? valorAtual : "";

    return (
      <div key={name} className={containerClassName}>
        <label htmlFor={name}>{label}</label>
        <select
          id={name}
          name={name}
          value={disabled ? "" : valorAtual}
          onChange={disabled ? undefined : onChange || handleChange}
          disabled={disabled}
        >
          <option value="">{reservado ? "Estrutura reservada" : "Selecione"}</option>
          {!disabled && valorNaoPadrao ? (
            <option value={valorNaoPadrao}>{valorNaoPadrao} (valor anterior)</option>
          ) : null}
          {!disabled
            ? AVALIACAO_OPCOES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))
            : null}
        </select>
        {helperText ? <p className="muted">{helperText}</p> : null}
        {reservado ? (
          <p className="muted">
            Bloco visual preparado para expansão futura, sem impacto nos dados salvos nesta etapa.
          </p>
        ) : null}
      </div>
    );
  };

  if (!podeLer) {
    return (
      <main className="alunos-page">
        <section className="panel">
          <h1>Sondagem diagnóstica</h1>
          <p>Seu perfil não possui permissão para acessar este módulo.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="alunos-page module-page sondagens-page">
      <header className="page-header">
        <h1>Sondagem diagnóstica do aluno</h1>
        <p>Registre diagnósticos iniciais e acompanhe necessidades pedagógicas.</p>
        <p className="muted">
          Orientação: O(a) professor(a) do AEE é responsável pela realização da sondagem
          diagnóstica dos alunos, identificando suas necessidades e subsidiando o planejamento das
          intervenções pedagógicas.
        </p>
      </header>

      {feedback ? <p className="toast-success">{feedback}</p> : null}
      {erro ? <p className="toast-error">{erro}</p> : null}

      <div className="module-layout sondagens-layout">
        {podeEditar ? (
          <section className="panel no-print module-form-panel">
            <h2>{sondagemEmEdicao ? "Editar sondagem" : "Nova sondagem"}</h2>
            <form className="aluno-form" onSubmit={handleSalvar}>
              <div className="sondagem-compat-note">
                Nesta etapa, as perguntas detalhadas organizam a ficha diagnóstica na interface. O
                salvamento principal da plataforma permanece compatível com o modelo atual.
              </div>
              <div className="sondagem-form-grid">
                <section className="form-section sondagem-card sondagem-card-wide">
                  <div className="sondagem-card-header">
                    <h3>Dados Gerais</h3>
                    <p className="muted">
                      Informações básicas da aplicação da sondagem e identificação do aluno.
                    </p>
                  </div>

                  <div className="sondagem-fields-grid">
                    <div>
                      <label htmlFor="alunoId">Aluno</label>
                      <select
                        id="alunoId"
                        name="alunoId"
                        value={form.alunoId}
                        onChange={handleChange}
                      >
                        {alunos.map((aluno) => (
                          <option key={aluno.id} value={aluno.id}>
                            {aluno.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="dataNascimento">Data de nascimento</label>
                      <input
                        id="dataNascimento"
                        name="dataNascimento"
                        type="date"
                        value={form.dataNascimento}
                        readOnly
                      />
                    </div>

                    <div>
                      <label htmlFor="dataSondagem">Data da sondagem</label>
                      <input
                        id="dataSondagem"
                        name="dataSondagem"
                        type="date"
                        value={form.dataSondagem}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="periodo">Bimestre/período</label>
                      <input
                        id="periodo"
                        name="periodo"
                        value={form.periodo}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label htmlFor="responsavelAplicacao">Responsável pela aplicação</label>
                      <input
                        id="responsavelAplicacao"
                        name="responsavelAplicacao"
                        value={form.responsavelAplicacao}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </section>

                {BLOCOS_AVALIACAO.map((bloco) => (
                  <section key={bloco.id} className="form-section sondagem-card">
                    <div className="sondagem-card-header sondagem-card-header-horizontal">
                      <span className="sondagem-card-index">{bloco.numero}</span>
                      <div className="sondagem-card-header-content">
                        <h3>{bloco.titulo}</h3>
                        <p className="muted">
                          Perguntas objetivas com a escala padrão da plataforma.
                        </p>
                      </div>
                    </div>

                    <div className="sondagem-perguntas-list">
                      {bloco.perguntas.map((pergunta, index) =>
                        renderSelectAvaliacao(`${bloco.id}-pergunta-${index}`, pergunta, {
                          value: respostasDetalhadas[`${bloco.id}-pergunta-${index}`] || "",
                          onChange: handlePerguntaDetalhadaChange,
                          containerClassName: "sondagem-pergunta-item",
                        })
                      )}
                    </div>

                    <div className="sondagem-axis-summary">
                      {bloco.campoSintese
                        ? renderSelectAvaliacao(
                            bloco.campoSintese,
                            "Registro síntese do eixo (salvo no modelo atual)",
                            {
                              helperText:
                                "Este campo preserva a estrutura de salvamento já utilizada pela plataforma.",
                            }
                          )
                        : (
                          <p className="muted">
                            Este eixo foi estruturado apenas na interface nesta etapa e ainda não
                            altera os campos persistidos no banco de dados.
                          </p>
                        )}
                    </div>
                  </section>
                ))}

                <section className="form-section sondagem-card sondagem-card-wide">
                  <div className="sondagem-card-header">
                    <h3>Observações Gerais</h3>
                  </div>
                  <label htmlFor="observacoes">Observações gerais</label>
                  <textarea
                    id="observacoes"
                    name="observacoes"
                    rows={4}
                    value={form.observacoes}
                    onChange={handleChange}
                  />
                </section>

                <section className="form-section sondagem-card sondagem-card-wide">
                  <div className="sondagem-card-header">
                    <h3>Síntese Diagnóstica</h3>
                    <p className="muted">
                      Os campos abaixo continuam sendo consolidados no registro já existente de
                      encaminhamentos, sem alterar o banco de dados nesta etapa.
                    </p>
                  </div>
                  <div className="sondagem-text-grid">
                    {CAMPOS_SINTESE.map((campo) => (
                      <div
                        key={campo.key}
                        className={
                          campo.key === "sinteseRecomendacoesEncaminhamentos"
                            ? "sondagem-text-item sondagem-text-item-wide"
                            : "sondagem-text-item"
                        }
                      >
                        <label htmlFor={campo.key}>{campo.titulo}</label>
                        <textarea
                          id={campo.key}
                          name={campo.key}
                          rows={4}
                          value={form[campo.key]}
                          onChange={handleChange}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="form-actions sticky-actions">
                <button type="submit" disabled={salvando}>
                  {salvando
                    ? "Salvando..."
                    : sondagemEmEdicao
                      ? "Atualizar sondagem"
                      : "Salvar sondagem"}
                </button>
                {sondagemEmEdicao ? (
                  <button type="button" className="btn-secondary" onClick={limparFormulario}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        ) : (
          <section className="panel no-print module-form-panel">
            <h2>Acesso de leitura</h2>
            <p>Seu perfil pode visualizar sondagens, sem permissão para editar.</p>
          </section>
        )}

        <section className="panel module-list-panel">
          <h2>Lista de sondagens por aluno</h2>
          {loadingBase || loadingLista ? <p>Carregando...</p> : null}
          {!loadingBase && !loadingLista && sondagens.length === 0 ? (
            <p>Nenhuma sondagem cadastrada.</p>
          ) : null}

          {sondagens
            .filter((item) => (sondagemImpressaoId ? item.id === sondagemImpressaoId : true))
            .map((sondagem) => (
              <article key={sondagem.id} className="meta-card">
                <p>
                  <strong>Aluno:</strong> {sondagem.alunoNome || "-"}
                </p>
                <p>
                  <strong>Data:</strong> {sondagem.dataSondagem || "-"}
                </p>
                <p>
                  <strong>Bimestre/período:</strong> {sondagem.periodo || "-"}
                </p>
                <p>
                  <strong>Responsável:</strong> {sondagem.responsavelAplicacao || "-"}
                </p>
                {CAMPOS_PADRONIZADOS.map(([name, label]) => (
                  <p key={`${sondagem.id}-${name}`}>
                    <strong>{label}:</strong> {sondagem[name] || "-"}
                  </p>
                ))}
                <p className="report-text">
                  <strong>Observações:</strong> {sondagem.observacoes || "-"}
                </p>
                <p className="report-text">
                  <strong>Encaminhamentos:</strong> {sondagem.encaminhamentos || "-"}
                </p>
                <p className="muted">
                  Atualizado em: {formatarDataFlex(sondagem.atualizadoEm || sondagem.criadoEm)}
                </p>

                <div className="form-actions no-print">
                  <button type="button" className="btn-secondary" onClick={() => handleImprimir(sondagem)}>
                    Imprimir
                  </button>
                  {podeEditar ? (
                    <>
                      <button type="button" className="btn-secondary" onClick={() => handleEditar(sondagem)}>
                        Editar
                      </button>
                      <button type="button" className="btn-danger" onClick={() => handleExcluir(sondagem)}>
                        Excluir
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
        </section>
      </div>
    </main>
  );
}

export default SondagensPage;


