import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { listarAlunos } from "../services/alunosService";
import {
  atualizarPei,
  buscarPeiPorId,
  criarPei,
  excluirPei,
  listarPeis,
} from "../services/peisService";

const PEI_RASCUNHO_ID_KEY = "peiRascunhoId";

const PRAZOS_PRIORIZACAO = [
  "Curto prazo — 1 mês",
  "Médio prazo — 2 meses",
  "Longo prazo — 6 meses",
];

const PRIORIDADES = ["Alta", "Média", "Baixa"];

const PEIFormContext = createContext(null);

const CAMINHOS_CAMPOS = {
  "pei-nome-estudante": ["identificacaoEstudante", "nome"],
  "pei-data-nascimento": ["identificacaoEstudante", "dataNascimento"],
  "pei-idade": ["identificacaoEstudante", "idade"],
  "pei-ano-letivo": ["identificacaoEstudante", "anoLetivo"],
  "pei-serie": ["identificacaoEstudante", "serieAno"],
  "pei-turma": ["identificacaoEstudante", "turma"],
  "pei-turno": ["identificacaoEstudante", "turno"],
  "pei-escola": ["identificacaoEstudante", "escola"],
  "pei-municipio": ["identificacaoEstudante", "municipio"],
  "pei-data-planejamento": ["identificacaoEstudante", "dataPlanejamento"],
  "pei-periodo-vigencia": ["identificacaoEstudante", "periodoVigencia"],
  "pei-professor-sala-comum": ["identificacaoEstudante", "professorSalaComum"],
  "pei-professor-aee": ["identificacaoEstudante", "professorAee"],
  "pei-profissional-apoio": ["identificacaoEstudante", "profissionalApoio"],
  "pei-condicao-estudante": ["identificacaoEstudante", "condicaoDiagnostico"],
  "pei-participantes": ["participantesArticulacao", "participantesEnvolvidos"],
  "pei-estrategias-colaborativas": ["participantesArticulacao", "estrategiasColaborativasAee"],
  "pei-participacao-familia": ["participantesArticulacao", "participacaoFamilia"],
  "pei-participacao-estudante": ["participantesArticulacao", "participacaoEstudante"],
  "pei-articulacao-profissionais": ["participantesArticulacao", "articulacaoOutrosProfissionais"],
  "pei-potencialidades": ["basePedagogica", "potencialidades"],
  "pei-barreiras": ["basePedagogica", "barreirasAcessoCurriculo"],
  "pei-necessidades-apoio": ["basePedagogica", "necessidadesApoioSalaComum"],
  "pei-resumo-estudo-paee": ["basePedagogica", "resumoEstudoCasoPaee"],
  "pei-componente-curricular": ["planejamentoCurricular", "componenteCurricular"],
  "pei-periodo-trabalho": ["planejamentoCurricular", "periodoTrabalho"],
  "pei-objeto-conhecimento": ["planejamentoCurricular", "objetoConhecimento"],
  "pei-conceito-central": ["planejamentoCurricular", "conceitoCentral"],
  "pei-metodologias": ["metodologiasAtividades", "metodologias"],
  "pei-propostas-atividades": ["metodologiasAtividades", "propostasAtividades"],
  "pei-adaptacoes-atividades": ["metodologiasAtividades", "adaptacoesAtividades"],
  "pei-organizacao-participacao": ["metodologiasAtividades", "organizacaoParticipacaoSalaComum"],
  "pei-recursos-utilizados": ["recursosAcessibilidadeApoios", "recursosUtilizados"],
  "pei-acessibilidade-curricular": ["recursosAcessibilidadeApoios", "acessibilidadeCurricular"],
  "pei-apoios-necessarios": ["recursosAcessibilidadeApoios", "apoiosNecessarios"],
  "pei-tecnologia-assistiva": ["recursosAcessibilidadeApoios", "tecnologiaAssistivaComunicacao"],
  "pei-estrategias-avaliacao": ["avaliacaoAprendizagem", "estrategiasAvaliacao"],
  "pei-formas-demonstrar": ["avaliacaoAprendizagem", "formasDemonstrarAprendizagem"],
  "pei-criterios-observacao": ["avaliacaoAprendizagem", "criteriosObservacao"],
  "pei-instrumentos-registros": ["avaliacaoAprendizagem", "instrumentosRegistros"],
  "pei-registros-processo": ["acompanhamentoRevisao", "registrosProcesso"],
  "pei-desafios": ["acompanhamentoRevisao", "desafiosEncontrados"],
  "pei-avancos": ["acompanhamentoRevisao", "avancosObservados"],
  "pei-expectativas": ["acompanhamentoRevisao", "expectativasProximoPeriodo"],
  "pei-data-revisao": ["acompanhamentoRevisao", "dataPrevistaRevisao"],
  "pei-encaminhamentos-sala": ["encaminhamentosFinais", "salaComum"],
  "pei-encaminhamentos-aee": ["encaminhamentosFinais", "aee"],
  "pei-encaminhamentos-familia": ["encaminhamentosFinais", "familia"],
  "pei-encaminhamentos-gestao": ["encaminhamentosFinais", "coordenacaoGestao"],
  "pei-observacoes-finais": ["encaminhamentosFinais", "observacoesFinais"],
};

function criarHabilidadesPriorizadas() {
  return Array.from({ length: 3 }, () => ({
    habilidade: "",
    objetoConhecimento: "",
    prazoExecucao: "",
  }));
}

function criarObjetivosMetas() {
  return Array.from({ length: 3 }, () => ({
    objetivoMeta: "",
    resultadoEsperado: "",
    prioridade: "",
    prazo: "",
  }));
}

function criarFormularioInicial() {
  return {
    schemaVersao: 1,
    alunoId: "",
    alunoNome: "",
    anoLetivo: "",
    periodoVigencia: "",
    statusGeral: "rascunho",
    dataConclusao: null,
    identificacaoEstudante: {
      alunoCadastrado: "",
      nome: "",
      dataNascimento: "",
      idade: "",
      anoLetivo: "",
      serieAno: "",
      turma: "",
      turno: "",
      escola: "",
      municipio: "",
      dataPlanejamento: "",
      periodoVigencia: "",
      professorSalaComum: "",
      professorAee: "",
      profissionalApoio: "",
      condicaoDiagnostico: "",
    },
    participantesArticulacao: {
      participantesEnvolvidos: "",
      estrategiasColaborativasAee: "",
      participacaoFamilia: "",
      participacaoEstudante: "",
      articulacaoOutrosProfissionais: "",
    },
    basePedagogica: {
      potencialidades: "",
      barreirasAcessoCurriculo: "",
      necessidadesApoioSalaComum: "",
      resumoEstudoCasoPaee: "",
    },
    planejamentoCurricular: {
      componenteCurricular: "",
      objetoConhecimento: "",
      conceitoCentral: "",
      periodoTrabalho: "",
    },
    habilidadesObjetosPriorizados: criarHabilidadesPriorizadas(),
    objetivosMetas: criarObjetivosMetas(),
    metodologiasAtividades: {
      metodologias: "",
      propostasAtividades: "",
      adaptacoesAtividades: "",
      organizacaoParticipacaoSalaComum: "",
    },
    recursosAcessibilidadeApoios: {
      recursosUtilizados: "",
      acessibilidadeCurricular: "",
      apoiosNecessarios: "",
      tecnologiaAssistivaComunicacao: "",
    },
    avaliacaoAprendizagem: {
      estrategiasAvaliacao: "",
      formasDemonstrarAprendizagem: "",
      criteriosObservacao: "",
      instrumentosRegistros: "",
    },
    acompanhamentoRevisao: {
      registrosProcesso: "",
      desafiosEncontrados: "",
      avancosObservados: "",
      expectativasProximoPeriodo: "",
      dataPrevistaRevisao: "",
    },
    encaminhamentosFinais: {
      salaComum: "",
      aee: "",
      familia: "",
      coordenacaoGestao: "",
      observacoesFinais: "",
    },
  };
}

function resolverCaminhoCampo(id) {
  if (CAMINHOS_CAMPOS[id]) return CAMINHOS_CAMPOS[id];

  const habilidadePriorizada = id.match(
    /^pei-(habilidade-priorizada|objeto-priorizado|prazo-prioridade)-(\d+)$/,
  );
  if (habilidadePriorizada) {
    const campos = {
      "habilidade-priorizada": "habilidade",
      "objeto-priorizado": "objetoConhecimento",
      "prazo-prioridade": "prazoExecucao",
    };
    return [
      "habilidadesObjetosPriorizados",
      Number(habilidadePriorizada[2]) - 1,
      campos[habilidadePriorizada[1]],
    ];
  }

  const objetivo = id.match(
    /^pei-(objetivo|resultado|prioridade-objetivo|prazo-objetivo)-(\d+)$/,
  );
  if (objetivo) {
    const campos = {
      objetivo: "objetivoMeta",
      resultado: "resultadoEsperado",
      "prioridade-objetivo": "prioridade",
      "prazo-objetivo": "prazo",
    };
    return ["objetivosMetas", Number(objetivo[2]) - 1, campos[objetivo[1]]];
  }

  return null;
}

function obterValorNoCaminho(objeto, caminho) {
  return caminho?.reduce((valorAtual, chave) => valorAtual?.[chave], objeto) ?? "";
}

function atualizarValorNoCaminho(objeto, caminho, valor) {
  const [chaveAtual, ...restante] = caminho;
  const copia = Array.isArray(objeto) ? [...objeto] : { ...objeto };

  if (restante.length === 0) {
    copia[chaveAtual] = valor;
    return copia;
  }

  const proximoValor = objeto?.[chaveAtual] ?? (typeof restante[0] === "number" ? [] : {});
  copia[chaveAtual] = atualizarValorNoCaminho(proximoValor, restante, valor);
  return copia;
}

function normalizarLista(listaSalva, listaInicial) {
  const itensSalvos = Array.isArray(listaSalva) ? listaSalva : [];
  return listaInicial.map((itemInicial, indice) => ({
    ...itemInicial,
    ...(itensSalvos[indice] || {}),
  }));
}

function calcularIdade(dataNascimento) {
  const valor = String(dataNascimento || "").trim();
  const correspondencia = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!correspondencia) return "";

  const [, anoTexto, mesTexto, diaTexto] = correspondencia;
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);
  const nascimento = new Date(ano, mes - 1, dia);

  if (
    nascimento.getFullYear() !== ano ||
    nascimento.getMonth() !== mes - 1 ||
    nascimento.getDate() !== dia
  ) {
    return "";
  }

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const aniversarioAindaNaoOcorreu =
    hoje.getMonth() < mes - 1 || (hoje.getMonth() === mes - 1 && hoje.getDate() < dia);

  if (aniversarioAindaNaoOcorreu) idade -= 1;
  return idade >= 0 ? String(idade) : "";
}

function normalizarPeiParaFormulario(pei) {
  const inicial = criarFormularioInicial();
  const identificacaoSalva = pei?.identificacaoEstudante || {};
  const nomeSalvo =
    identificacaoSalva.nome || pei?.alunoNome || identificacaoSalva.alunoCadastrado || "";

  return {
    ...inicial,
    ...pei,
    alunoId: pei?.alunoId || "",
    alunoNome: pei?.alunoNome || nomeSalvo,
    identificacaoEstudante: {
      ...inicial.identificacaoEstudante,
      ...identificacaoSalva,
      alunoCadastrado: identificacaoSalva.alunoCadastrado || nomeSalvo,
      nome: nomeSalvo,
    },
    participantesArticulacao: {
      ...inicial.participantesArticulacao,
      ...(pei?.participantesArticulacao || {}),
    },
    basePedagogica: {
      ...inicial.basePedagogica,
      ...(pei?.basePedagogica || {}),
    },
    planejamentoCurricular: {
      ...inicial.planejamentoCurricular,
      ...(pei?.planejamentoCurricular || {}),
    },
    habilidadesObjetosPriorizados: normalizarLista(
      pei?.habilidadesObjetosPriorizados,
      inicial.habilidadesObjetosPriorizados,
    ),
    objetivosMetas: normalizarLista(pei?.objetivosMetas, inicial.objetivosMetas),
    metodologiasAtividades: {
      ...inicial.metodologiasAtividades,
      ...(pei?.metodologiasAtividades || {}),
    },
    recursosAcessibilidadeApoios: {
      ...inicial.recursosAcessibilidadeApoios,
      ...(pei?.recursosAcessibilidadeApoios || {}),
    },
    avaliacaoAprendizagem: {
      ...inicial.avaliacaoAprendizagem,
      ...(pei?.avaliacaoAprendizagem || {}),
    },
    acompanhamentoRevisao: {
      ...inicial.acompanhamentoRevisao,
      ...(pei?.acompanhamentoRevisao || {}),
    },
    encaminhamentosFinais: {
      ...inicial.encaminhamentosFinais,
      ...(pei?.encaminhamentosFinais || {}),
    },
  };
}

function normalizarStringsProfundamente(valor) {
  if (typeof valor === "string") return valor.trim();
  if (Array.isArray(valor)) return valor.map(normalizarStringsProfundamente);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, item]) => [
        chave,
        normalizarStringsProfundamente(item),
      ]),
    );
  }
  return valor;
}

function montarPayload(form, currentUser, incluirCriador = false) {
  const dados = normalizarStringsProfundamente(form);
  const usuario = {
    uid: currentUser?.uid || "",
    nome: currentUser?.displayName || currentUser?.email || "",
    email: currentUser?.email || "",
  };

  return {
    schemaVersao: 1,
    alunoId: dados.alunoId || "",
    alunoNome:
      dados.identificacaoEstudante.nome ||
      dados.identificacaoEstudante.alunoCadastrado ||
      dados.alunoNome ||
      "",
    anoLetivo: dados.identificacaoEstudante.anoLetivo || dados.anoLetivo || "",
    periodoVigencia:
      dados.identificacaoEstudante.periodoVigencia || dados.periodoVigencia || "",
    statusGeral: dados.statusGeral || "rascunho",
    dataConclusao: dados.dataConclusao || null,
    identificacaoEstudante: dados.identificacaoEstudante,
    participantesArticulacao: dados.participantesArticulacao,
    basePedagogica: dados.basePedagogica,
    planejamentoCurricular: dados.planejamentoCurricular,
    habilidadesObjetosPriorizados: dados.habilidadesObjetosPriorizados,
    objetivosMetas: dados.objetivosMetas,
    metodologiasAtividades: dados.metodologiasAtividades,
    recursosAcessibilidadeApoios: dados.recursosAcessibilidadeApoios,
    avaliacaoAprendizagem: dados.avaliacaoAprendizagem,
    acompanhamentoRevisao: dados.acompanhamentoRevisao,
    encaminhamentosFinais: dados.encaminhamentosFinais,
    responsavelPreenchimento: usuario.nome,
    atualizadoPor: usuario,
    ...(incluirCriador ? { criadoPor: usuario } : {}),
  };
}

function salvarPeiIdLocal(peiId) {
  try {
    window.localStorage.setItem(PEI_RASCUNHO_ID_KEY, peiId);
  } catch (error) {
    console.warn("[PEIPage] Não foi possível salvar o id local do PEI.", error);
  }
}

function lerPeiIdLocal() {
  try {
    return window.localStorage.getItem(PEI_RASCUNHO_ID_KEY) || "";
  } catch (error) {
    console.warn("[PEIPage] Não foi possível ler o id local do PEI.", error);
    return "";
  }
}

function removerPeiIdLocal() {
  try {
    window.localStorage.removeItem(PEI_RASCUNHO_ID_KEY);
  } catch (error) {
    console.warn("[PEIPage] Não foi possível remover o id local do PEI.", error);
  }
}

function formatarDataLista(valor) {
  if (!valor) return "-";
  const data = valor?.toDate ? valor.toDate() : new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function formatarStatus(statusGeral) {
  const labels = {
    rascunho: "Rascunho",
    concluido: "Concluído",
  };
  return labels[statusGeral] || "Rascunho";
}

function obterDataAtualIsoLocal() {
  const agora = new Date();
  const dataLocal = new Date(agora.getTime() - agora.getTimezoneOffset() * 60 * 1000);
  return dataLocal.toISOString().slice(0, 10);
}

function obterValorImpressao(valor) {
  return String(valor || "").trim() || "Não informado";
}

function formatarDataImpressao(valor) {
  if (!valor) return "Não informado";

  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  const dataFormatada = formatarDataLista(valor);
  return dataFormatada === "-" ? "Não informado" : dataFormatada;
}

function possuiTextoPreenchido(valor) {
  if (typeof valor === "string") return Boolean(valor.trim());
  if (Array.isArray(valor)) return valor.some(possuiTextoPreenchido);
  if (valor && typeof valor === "object") {
    return Object.values(valor).some(possuiTextoPreenchido);
  }
  return false;
}

function habilidadePriorizadaPossuiConteudo(item) {
  return possuiTextoPreenchido(item);
}

function objetivoMetaPossuiConteudo(item) {
  return possuiTextoPreenchido(item);
}

function possuiConteudoMinimoParaImpressao(form) {
  const identificacao = form.identificacaoEstudante;
  const possuiEstudante = Boolean(
    String(identificacao.nome || identificacao.alunoCadastrado || form.alunoNome || "").trim(),
  );
  const possuiDadosComplementares = possuiTextoPreenchido([
    identificacao.dataNascimento,
    identificacao.anoLetivo,
    identificacao.serieAno,
    identificacao.turma,
    identificacao.periodoVigencia,
    form.participantesArticulacao,
    form.basePedagogica,
    form.planejamentoCurricular,
    form.habilidadesObjetosPriorizados,
    form.objetivosMetas,
    form.metodologiasAtividades,
    form.recursosAcessibilidadeApoios,
    form.avaliacaoAprendizagem,
    form.acompanhamentoRevisao,
    form.encaminhamentosFinais,
  ]);

  return possuiEstudante && possuiDadosComplementares;
}

function CampoImpressao({ rotulo, valor, span = false }) {
  return (
    <div className={span ? "pei-print-span-2" : ""}>
      <dt>{rotulo}</dt>
      <dd>{obterValorImpressao(valor)}</dd>
    </div>
  );
}

function LinhaIdentificacaoImpressao({ rotulo, valor }) {
  return (
    <tr>
      <th scope="row">{rotulo}</th>
      <td>{obterValorImpressao(valor)}</td>
    </tr>
  );
}

function Campo({ id, label, placeholder, type = "text", className = "" }) {
  const contexto = useContext(PEIFormContext);
  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={contexto.obterValor(id)}
        onChange={(event) => contexto.atualizarCampo(id, event.target.value)}
      />
    </div>
  );
}

function CampoTexto({ id, label, placeholder, rows = 4, className = "pei-field-span-2" }) {
  const contexto = useContext(PEIFormContext);
  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        placeholder={placeholder}
        value={contexto.obterValor(id)}
        onChange={(event) => contexto.atualizarCampo(id, event.target.value)}
      />
    </div>
  );
}

function CampoSelect({ id, label, placeholder, options, className = "" }) {
  const contexto = useContext(PEIFormContext);
  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={id}
        value={contexto.obterValor(id)}
        onChange={(event) => contexto.atualizarCampo(id, event.target.value)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function BlocoPEI({ numero, titulo, descricao, children }) {
  return (
    <section className="panel pei-card">
      <div className="pei-card-header">
        <span className="pei-card-index">{numero}</span>
        <div>
          <h2>{titulo}</h2>
          {descricao ? <p className="muted">{descricao}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function PEIPage() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(criarFormularioInicial);
  const [alunos, setAlunos] = useState([]);
  const [peisSalvos, setPeisSalvos] = useState([]);
  const [peiId, setPeiId] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [abrindoPeiId, setAbrindoPeiId] = useState("");
  const [excluindoPeiId, setExcluindoPeiId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");

  const carregarPeisSalvos = async () => {
    setCarregandoLista(true);

    try {
      const lista = await listarPeis();
      setPeisSalvos(lista);
    } catch (error) {
      console.error("[PEIPage] Erro ao listar PEIs salvos", error);
      setErro("Não foi possível carregar os PEIs salvos.");
    } finally {
      setCarregandoLista(false);
    }
  };

  useEffect(() => {
    let ativo = true;

    async function carregarRascunhoAnterior() {
      setCarregando(true);
      setErro("");

      try {
        const alunosData = await listarAlunos();
        if (ativo) setAlunos(alunosData);
      } catch (error) {
        console.error("[PEIPage] Erro ao carregar alunos cadastrados", error);
        if (ativo) setErro("Não foi possível carregar os alunos cadastrados.");
      }

      if (!ativo) return;
      await carregarPeisSalvos();
      const rascunhoId = lerPeiIdLocal();

      if (!rascunhoId) {
        if (ativo) setCarregando(false);
        return;
      }

      try {
        const peiSalvo = await buscarPeiPorId(rascunhoId);
        if (!ativo) return;

        if (!peiSalvo) {
          removerPeiIdLocal();
          setPeiId("");
          setForm(criarFormularioInicial());
          setAviso("Não foi possível carregar o rascunho anterior do PEI.");
          return;
        }

        setForm(normalizarPeiParaFormulario(peiSalvo));
        setPeiId(peiSalvo.id || rascunhoId);
        setAviso("Rascunho anterior do PEI carregado.");
      } catch (error) {
        console.error("[PEIPage] Erro ao carregar rascunho anterior", error);
        if (ativo) {
          removerPeiIdLocal();
          setPeiId("");
          setForm(criarFormularioInicial());
          setAviso("Não foi possível carregar o rascunho anterior do PEI.");
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarRascunhoAnterior();

    return () => {
      ativo = false;
    };
  }, [currentUser?.uid]);

  const obterValor = (id) => obterValorNoCaminho(form, resolverCaminhoCampo(id));

  const atualizarCampo = (id, valor) => {
    const caminho = resolverCaminhoCampo(id);
    if (!caminho) return;
    setForm((estadoAtual) => {
      const formularioAtualizado = atualizarValorNoCaminho(estadoAtual, caminho, valor);
      return id === "pei-nome-estudante"
        ? { ...formularioAtualizado, alunoNome: valor }
        : formularioAtualizado;
    });
  };

  const handleAlunoSelecionado = (event) => {
    const alunoId = event.target.value;
    const aluno = alunos.find((item) => item.id === alunoId) || null;

    setForm((estadoAtual) => {
      if (!aluno) {
        return {
          ...estadoAtual,
          alunoId: "",
          alunoNome: estadoAtual.identificacaoEstudante.nome || estadoAtual.alunoNome,
          identificacaoEstudante: {
            ...estadoAtual.identificacaoEstudante,
            alunoCadastrado: "",
          },
        };
      }

      const idadeCadastrada = String(aluno.idade ?? "").trim();

      return {
        ...estadoAtual,
        alunoId: aluno.id,
        alunoNome: aluno.nome || "",
        identificacaoEstudante: {
          ...estadoAtual.identificacaoEstudante,
          alunoCadastrado: aluno.nome || "",
          nome: aluno.nome || "",
          dataNascimento: aluno.dataNascimento || "",
          idade: idadeCadastrada || calcularIdade(aluno.dataNascimento),
          serieAno: aluno.serieAno || "",
          turma: aluno.turma || "",
          turno: aluno.turno || "",
          escola: aluno.nomeEscola || aluno.escola || "",
          municipio: aluno.municipio || "",
          professorAee: aluno.professorAee || "",
          condicaoDiagnostico: aluno.diagnostico || "",
        },
      };
    });
  };

  const handleSalvarRascunho = async (event) => {
    event.preventDefault();
    if (salvando || concluindo || excluindoPeiId) return;

    if (!currentUser) {
      setErro("Não foi possível identificar o usuário para salvar o rascunho do PEI.");
      return;
    }

    setSalvando(true);
    setFeedback("");
    setAviso("");
    setErro("");

    try {
      const payload = montarPayload(form, currentUser, !peiId);

      if (peiId) {
        await atualizarPei(peiId, payload);
      } else {
        const novoPeiId = await criarPei(payload);
        setPeiId(novoPeiId);
        salvarPeiIdLocal(novoPeiId);
      }

      setFeedback("Rascunho do PEI salvo com sucesso.");
      await carregarPeisSalvos();
    } catch (error) {
      console.error("[PEIPage] Erro ao salvar rascunho", error);
      setErro("Não foi possível salvar o rascunho do PEI. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const handleNovoPei = () => {
    if (excluindoPeiId) return;

    setForm(criarFormularioInicial());
    setPeiId("");
    removerPeiIdLocal();
    setErro("");
    setAviso("");
    setFeedback("Novo PEI iniciado.");
  };

  const handleConcluirPei = async () => {
    if (salvando || concluindo || excluindoPeiId || form.statusGeral === "concluido") return;

    if (!currentUser) {
      setErro("Não foi possível identificar o usuário para concluir o PEI.");
      return;
    }

    const confirmou = window.confirm(
      "Deseja concluir este PEI? Confira se as informações foram revisadas pela equipe pedagógica.",
    );
    if (!confirmou) return;

    setConcluindo(true);
    setFeedback("");
    setAviso("");
    setErro("");

    try {
      const formConcluido = {
        ...form,
        statusGeral: "concluido",
        dataConclusao: obterDataAtualIsoLocal(),
      };
      const payload = montarPayload(formConcluido, currentUser, !peiId);
      let idAtual = peiId;

      if (idAtual) {
        await atualizarPei(idAtual, payload);
      } else {
        idAtual = await criarPei(payload);
        setPeiId(idAtual);
        salvarPeiIdLocal(idAtual);
      }

      setForm(formConcluido);
      setFeedback("PEI concluído com sucesso.");
      await carregarPeisSalvos();
    } catch (error) {
      console.error("[PEIPage] Erro ao concluir PEI", error);
      setErro("Não foi possível concluir o PEI. Tente novamente.");
    } finally {
      setConcluindo(false);
    }
  };

  const handleImprimirPei = () => {
    if (excluindoPeiId) return;

    setFeedback("");
    setAviso("");
    setErro("");

    if (!possuiConteudoMinimoParaImpressao(form)) {
      setErro("Antes de imprimir, preencha ou abra um PEI salvo.");
      return;
    }

    window.print();
  };

  const handleAbrirPei = async (id) => {
    if (!id || abrindoPeiId || excluindoPeiId || salvando || concluindo) return;

    setAbrindoPeiId(id);
    setFeedback("");
    setAviso("");
    setErro("");

    try {
      const peiSalvo = await buscarPeiPorId(id);

      if (!peiSalvo) {
        setAviso("O PEI selecionado não foi encontrado.");
        await carregarPeisSalvos();
        return;
      }

      setForm(normalizarPeiParaFormulario(peiSalvo));
      setPeiId(peiSalvo.id || id);
      salvarPeiIdLocal(peiSalvo.id || id);
      setFeedback("PEI carregado com sucesso.");
      document.getElementById("pei-formulario")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      console.error("[PEIPage] Erro ao abrir PEI salvo", error);
      setErro("Não foi possível abrir o PEI selecionado.");
    } finally {
      setAbrindoPeiId("");
    }
  };

  const handleExcluirPei = async (pei) => {
    if (!pei?.id || excluindoPeiId || abrindoPeiId || salvando || concluindo) return;

    const nomeEstudante = String(
      pei.alunoNome ||
        pei.identificacaoEstudante?.nome ||
        pei.identificacaoEstudante?.alunoCadastrado ||
        "",
    ).trim();
    const pergunta = nomeEstudante
      ? `Deseja realmente excluir o PEI de ${nomeEstudante}?`
      : "Deseja realmente excluir este PEI?";
    const confirmou = window.confirm(
      `${pergunta}\nEsta ação não poderá ser desfeita.\nConfira se este documento não será mais necessário antes de confirmar.`,
    );

    if (!confirmou) return;

    setExcluindoPeiId(pei.id);
    setFeedback("");
    setAviso("");
    setErro("");

    try {
      await excluirPei(pei.id);

      if (pei.id === peiId) {
        setForm(criarFormularioInicial());
        setPeiId("");
        removerPeiIdLocal();
      }

      setFeedback("PEI excluído com sucesso.");
      await carregarPeisSalvos();
    } catch (error) {
      console.error("[PEIPage] Erro ao excluir PEI", error);
      setErro("Não foi possível excluir o PEI. Tente novamente.");
    } finally {
      setExcluindoPeiId("");
    }
  };

  const habilidadesParaImpressao = form.habilidadesObjetosPriorizados.filter(
    habilidadePriorizadaPossuiConteudo,
  );
  const objetivosParaImpressao = form.objetivosMetas.filter(objetivoMetaPossuiConteudo);

  return (
    <main className="alunos-page module-page pei-page">
      <header className="page-header">
        <div>
          <h1>PEI — Plano de Ensino Individualizado</h1>
          <p>
            O PEI organiza o acesso do estudante ao currículo da sala comum, registrando
            habilidades priorizadas, objetos de conhecimento, objetivos, metodologias,
            recursos, avaliação, acompanhamento e encaminhamentos.
          </p>
        </div>
      </header>

      <div className="pei-note">
        Nesta etapa, o PEI pode ser preenchido e salvo como rascunho. Conclusão e impressão
        serão implementadas em fases posteriores.
      </div>

      {feedback ? <p className="toast-success">{feedback}</p> : null}
      {erro ? <p className="toast-error">{erro}</p> : null}
      {aviso ? <div className="pei-note">{aviso}</div> : null}

      <section className="panel pei-salvos-panel" aria-labelledby="peis-salvos-titulo">
        <div className="pei-list-heading">
          <div>
            <h2 id="peis-salvos-titulo">PEIs salvos</h2>
            <p className="muted">
              Abra um plano para continuar o preenchimento ou revisar um PEI já iniciado.
            </p>
          </div>
          <span className="pei-count-chip">{peisSalvos.length} registro(s)</span>
        </div>

        {carregandoLista ? (
          <p className="muted">Carregando PEIs salvos...</p>
        ) : peisSalvos.length ? (
          <div className="pei-table-wrapper">
            <table className="pei-salvos-table">
              <thead>
                <tr>
                  <th>Nome do estudante</th>
                  <th>Ano letivo</th>
                  <th>Período de vigência</th>
                  <th>Status geral</th>
                  <th>Componente curricular principal</th>
                  <th>Atualizado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {peisSalvos.map((pei) => (
                  <tr key={pei.id}>
                    <td>
                      {pei.alunoNome ||
                        pei.identificacaoEstudante?.nome ||
                        pei.identificacaoEstudante?.alunoCadastrado ||
                        "-"}
                    </td>
                    <td>{pei.anoLetivo || pei.identificacaoEstudante?.anoLetivo || "-"}</td>
                    <td>
                      {pei.periodoVigencia ||
                        pei.identificacaoEstudante?.periodoVigencia ||
                        "-"}
                    </td>
                    <td>{formatarStatus(pei.statusGeral)}</td>
                    <td>{pei.planejamentoCurricular?.componenteCurricular || "-"}</td>
                    <td>{formatarDataLista(pei.atualizadoEm || pei.criadoEm)}</td>
                    <td>
                      <div className="pei-list-actions">
                        <button
                          type="button"
                          className="btn-secondary pei-open-button"
                          onClick={() => handleAbrirPei(pei.id)}
                          disabled={
                            Boolean(abrindoPeiId || excluindoPeiId) || salvando || concluindo
                          }
                        >
                          {abrindoPeiId === pei.id ? "Abrindo..." : "Abrir"}
                        </button>
                        <button
                          type="button"
                          className="pei-delete-button"
                          onClick={() => handleExcluirPei(pei)}
                          disabled={
                            Boolean(abrindoPeiId || excluindoPeiId) || salvando || concluindo
                          }
                        >
                          {excluindoPeiId === pei.id ? "Excluindo..." : "Excluir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="pei-empty-state">Nenhum PEI salvo até o momento.</p>
        )}
      </section>

      {carregando ? (
        <section className="panel">
          <p>Carregando PEI...</p>
        </section>
      ) : (
        <PEIFormContext.Provider value={{ obterValor, atualizarCampo }}>
          <form id="pei-formulario" className="pei-form" onSubmit={handleSalvarRascunho}>
        <BlocoPEI
          numero="1"
          titulo="Identificação do estudante"
          descricao="Dados iniciais para contextualizar o planejamento curricular individualizado."
        >
          <div className="pei-fields-grid">
            <div className="pei-field-span-2">
              <label htmlFor="pei-aluno-cadastrado">Aluno cadastrado</label>
              <select
                id="pei-aluno-cadastrado"
                value={form.alunoId || ""}
                onChange={handleAlunoSelecionado}
              >
                <option value="">Selecione um estudante cadastrado</option>
                {form.alunoId && !alunos.some((aluno) => aluno.id === form.alunoId) ? (
                  <option value={form.alunoId}>
                    {form.alunoNome ||
                      form.identificacaoEstudante.nome ||
                      "Aluno anteriormente vinculado"}
                  </option>
                ) : null}
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome || "Aluno sem nome informado"}
                  </option>
                ))}
              </select>
            </div>
            <Campo
              id="pei-nome-estudante"
              label="Nome do estudante"
              placeholder="Informe o nome completo do estudante."
              className="pei-field-span-2"
            />
            <Campo id="pei-data-nascimento" label="Data de nascimento" type="date" />
            <Campo id="pei-idade" label="Idade" type="number" placeholder="Informe a idade." />
            <Campo
              id="pei-ano-letivo"
              label="Ano letivo"
              placeholder="Ex.: 2026"
            />
            <Campo id="pei-serie" label="Ano/Série" placeholder="Ex.: 4º ano" />
            <Campo id="pei-turma" label="Turma" placeholder="Ex.: 4º A" />
            <Campo id="pei-turno" label="Turno" placeholder="Ex.: Matutino" />
            <Campo
              id="pei-escola"
              label="Escola"
              placeholder="Informe o nome da escola."
              className="pei-field-span-2"
            />
            <Campo id="pei-municipio" label="Município" placeholder="Informe o município." />
            <Campo id="pei-data-planejamento" label="Data do planejamento" type="date" />
            <Campo
              id="pei-periodo-vigencia"
              label="Período de vigência"
              placeholder="Ex.: 1º semestre"
            />
            <Campo
              id="pei-professor-sala-comum"
              label="Professor(a) da sala comum"
              placeholder="Informe o nome do(a) professor(a)."
            />
            <Campo
              id="pei-professor-aee"
              label="Professor(a) do AEE"
              placeholder="Informe o nome do(a) professor(a) do AEE."
            />
            <Campo
              id="pei-profissional-apoio"
              label="Profissional de apoio/mediador"
              placeholder="Informe o nome, quando houver."
              className="pei-field-span-2"
            />
            <CampoTexto
              id="pei-condicao-estudante"
              label="Condição do estudante / diagnóstico informado"
              rows={5}
              placeholder="Registre a condição informada no cadastro, laudo ou pela família, quando houver. O PEI deve considerar principalmente as barreiras, potencialidades e necessidades pedagógicas observadas no contexto escolar."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="2" titulo="Participantes e articulação">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-participantes"
              label="Participantes envolvidos"
              placeholder="Registre quem participou da elaboração do PEI: professor da sala comum, professor do AEE, coordenação, profissional de apoio, família, estudante ou outros profissionais."
            />
            <CampoTexto
              id="pei-estrategias-colaborativas"
              label="Estratégias colaborativas com o AEE"
              placeholder="Descreva como o professor da sala comum e o professor do AEE irão articular estratégias, recursos e acompanhamento para favorecer a participação do estudante."
            />
            <CampoTexto
              id="pei-participacao-familia"
              label="Participação da família"
              placeholder="Registre se a família participou, quais informações trouxe e como poderá colaborar no acompanhamento."
            />
            <CampoTexto
              id="pei-participacao-estudante"
              label="Participação do estudante"
              placeholder="Registre como a escuta ou participação do estudante foi considerada, respeitando suas formas de comunicação e expressão."
            />
            <CampoTexto
              id="pei-articulacao-profissionais"
              label="Articulação com outros profissionais ou rede de apoio, quando necessário"
              placeholder="Registre se houve ou se será necessário diálogo com outros profissionais ou rede de apoio."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="3" titulo="Base pedagógica do PEI">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-potencialidades"
              label="Potencialidades do estudante"
              placeholder="Descreva interesses, habilidades, formas de comunicação, preferências, vínculos e situações em que o estudante participa melhor."
            />
            <CampoTexto
              id="pei-barreiras"
              label="Barreiras de acesso ao currículo"
              placeholder="Registre o que dificulta a participação do estudante nas atividades da sala comum, considerando currículo, comunicação, leitura, escrita, atenção, ambiente, materiais, metodologia e avaliação."
            />
            <CampoTexto
              id="pei-necessidades-apoio"
              label="Necessidades de apoio na sala comum"
              placeholder="Indique quais apoios o estudante necessita para participar das atividades da turma, como mediação, recursos visuais, materiais concretos, tempo ampliado, comunicação alternativa ou adaptação das tarefas."
            />
            <CampoTexto
              id="pei-resumo-estudo-paee"
              label="Resumo do Estudo de Caso/PAEE que orienta este PEI"
              placeholder="Registre, de forma resumida, as principais informações do Estudo de Caso e do PAEE que orientam este PEI. Não copie o documento inteiro."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="4" titulo="Planejamento curricular">
          <div className="pei-fields-grid">
            <Campo
              id="pei-componente-curricular"
              label="Componente curricular/disciplina"
              placeholder="Informe a disciplina ou área do conhecimento que será trabalhada neste PEI."
            />
            <Campo
              id="pei-periodo-trabalho"
              label="Período de trabalho"
              placeholder="Informe o período de execução, por exemplo: 1º bimestre, 2º semestre ou outro período definido pela escola."
            />
            <CampoTexto
              id="pei-objeto-conhecimento"
              label="Conteúdo/objeto de conhecimento"
              placeholder="Registre o conteúdo da turma que será tornado acessível ao estudante."
            />
            <CampoTexto
              id="pei-conceito-central"
              label="Conceito central do conteúdo"
              placeholder="Explique qual é a ideia principal que o estudante precisa compreender sobre esse conteúdo."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI
          numero="5"
          titulo="Habilidades e objetos de conhecimento priorizados"
          descricao="Três registros editáveis para organizar as prioridades curriculares do período."
        >
          <div className="pei-repeat-grid">
            {[1, 2, 3].map((numeroItem) => (
              <article key={numeroItem} className="pei-repeat-card">
                <h3>Prioridade {numeroItem}</h3>
                <div className="pei-fields-grid">
                  <CampoTexto
                    id={`pei-habilidade-priorizada-${numeroItem}`}
                    label="Habilidade priorizada"
                    rows={3}
                    placeholder="Registre a habilidade priorizada para o estudante neste período."
                  />
                  <CampoTexto
                    id={`pei-objeto-priorizado-${numeroItem}`}
                    label="Objeto de conhecimento priorizado"
                    rows={3}
                    placeholder="Registre o objeto de conhecimento ou conteúdo relacionado à habilidade."
                  />
                  <CampoSelect
                    id={`pei-prazo-prioridade-${numeroItem}`}
                    label="Prazo de execução"
                    placeholder="Indique se será trabalhado em curto, médio ou longo prazo."
                    options={PRAZOS_PRIORIZACAO}
                    className="pei-field-span-2"
                  />
                </div>
              </article>
            ))}
          </div>
        </BlocoPEI>

        <BlocoPEI
          numero="6"
          titulo="Objetivos e metas de aprendizagem"
          descricao="Metas observáveis, possíveis e relacionadas ao currículo da turma."
        >
          <div className="pei-repeat-grid">
            {[1, 2, 3].map((numeroObjetivo) => (
              <article key={numeroObjetivo} className="pei-repeat-card">
                <h3>Objetivo {numeroObjetivo}</h3>
                <div className="pei-fields-grid">
                  <CampoTexto
                    id={`pei-objetivo-${numeroObjetivo}`}
                    label="Objetivo/meta"
                    rows={3}
                    placeholder="Escreva o que se espera que o estudante desenvolva no período, de forma possível, observável e relacionada ao currículo."
                  />
                  <CampoTexto
                    id={`pei-resultado-${numeroObjetivo}`}
                    label="Resultado esperado"
                    rows={3}
                    placeholder="Descreva como será possível perceber que houve avanço na aprendizagem ou participação do estudante."
                  />
                  <CampoSelect
                    id={`pei-prioridade-objetivo-${numeroObjetivo}`}
                    label="Prioridade"
                    placeholder="Selecione a prioridade."
                    options={PRIORIDADES}
                  />
                  <Campo
                    id={`pei-prazo-objetivo-${numeroObjetivo}`}
                    label="Prazo"
                    placeholder="Informe o prazo previsto para acompanhamento da meta."
                  />
                </div>
              </article>
            ))}
          </div>
        </BlocoPEI>

        <BlocoPEI numero="7" titulo="Metodologias e propostas de atividades">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-metodologias"
              label="Metodologias"
              placeholder="Descreva como o conteúdo será ensinado, quais mediações serão utilizadas e como a atividade será organizada."
            />
            <CampoTexto
              id="pei-propostas-atividades"
              label="Propostas de atividades"
              placeholder="Registre atividades que serão propostas ao estudante, considerando o currículo da turma e suas necessidades de apoio."
            />
            <CampoTexto
              id="pei-adaptacoes-atividades"
              label="Adaptações nas atividades"
              placeholder="Registre adaptações como redução de cópia, uso de imagens, atividade em etapas, textos curtos, material concreto ou outras adequações."
            />
            <CampoTexto
              id="pei-organizacao-participacao"
              label="Organização da participação na sala comum"
              placeholder="Descreva como o estudante participará das atividades da turma, individualmente, em dupla, em grupo ou com mediação."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="8" titulo="Recursos, acessibilidade e apoios">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-recursos-utilizados"
              label="Recursos utilizados"
              placeholder="Liste materiais, recursos visuais, jogos, textos adaptados, material concreto, recursos digitais ou outros instrumentos que serão utilizados."
            />
            <CampoTexto
              id="pei-acessibilidade-curricular"
              label="Estratégias de acessibilidade curricular"
              placeholder="Registre como o conteúdo será tornado acessível ao estudante, mantendo relação com o currículo da turma."
            />
            <CampoTexto
              id="pei-apoios-necessarios"
              label="Apoios necessários"
              placeholder="Indique os apoios necessários para compreensão dos comandos, realização das atividades, comunicação, atenção, organização e participação."
            />
            <CampoTexto
              id="pei-tecnologia-assistiva"
              label="Tecnologia assistiva ou comunicação alternativa, quando houver"
              placeholder="Registre recursos de tecnologia assistiva, comunicação aumentativa e alternativa ou outros recursos específicos, quando houver."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="9" titulo="Formas de avaliação da aprendizagem">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-estrategias-avaliacao"
              label="Estratégias de avaliação"
              placeholder="Descreva como a aprendizagem será acompanhada de forma processual, considerando participação, envolvimento, respostas e avanços."
            />
            <CampoTexto
              id="pei-formas-demonstrar"
              label="Formas de demonstrar aprendizagem"
              placeholder="Registre como o estudante poderá demonstrar o que aprendeu: oralmente, apontando, escolhendo imagens, usando comunicação alternativa, realizando atividade prática, produzindo com apoio ou participando da atividade."
            />
            <CampoTexto
              id="pei-criterios-observacao"
              label="Critérios de observação"
              placeholder="Indique quais avanços serão observados para avaliar se o objetivo foi alcançado."
            />
            <CampoTexto
              id="pei-instrumentos-registros"
              label="Instrumentos/registros utilizados"
              placeholder="Registre quais instrumentos serão usados: observação, atividades adaptadas, portfólio, registros do professor, registros do AEE ou outros."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="10" titulo="Acompanhamento: desafios e expectativas">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-registros-processo"
              label="Registros do processo"
              placeholder="Registre observações sobre a execução do PEI e como o estudante respondeu às estratégias planejadas."
            />
            <CampoTexto
              id="pei-desafios"
              label="Desafios encontrados"
              placeholder="Registre dificuldades encontradas durante a execução do PEI, como barreiras persistentes, necessidade de novos recursos ou ajustes nas estratégias."
            />
            <CampoTexto
              id="pei-avancos"
              label="Avanços observados"
              placeholder="Registre avanços observados na participação, aprendizagem, comunicação, autonomia ou acesso ao currículo."
            />
            <CampoTexto
              id="pei-expectativas"
              label="Expectativas para o próximo bimestre/período"
              placeholder="Registre o que se espera para o próximo bimestre ou período, considerando continuidade, replanejamento ou novas metas."
            />
            <Campo
              id="pei-data-revisao"
              label="Data prevista para revisão"
              type="date"
              className="pei-field-span-2"
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="11" titulo="Encaminhamentos finais">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-encaminhamentos-sala"
              label="Encaminhamentos para sala comum"
              placeholder="Registre orientações para continuidade das estratégias na sala comum."
            />
            <CampoTexto
              id="pei-encaminhamentos-aee"
              label="Encaminhamentos para o AEE"
              placeholder="Registre orientações para articulação com o Atendimento Educacional Especializado."
            />
            <CampoTexto
              id="pei-encaminhamentos-familia"
              label="Encaminhamentos para família"
              placeholder="Registre orientações para diálogo e acompanhamento com a família."
            />
            <CampoTexto
              id="pei-encaminhamentos-gestao"
              label="Encaminhamentos para coordenação/gestão"
              placeholder="Registre apoios institucionais necessários, como organização de recursos, horários, articulação entre profissionais ou acompanhamento pedagógico."
            />
            <CampoTexto
              id="pei-observacoes-finais"
              label="Observações finais"
              placeholder="Registre informações complementares relevantes para continuidade do PEI."
            />
          </div>
        </BlocoPEI>

        <section className="panel pei-actions-panel">
          <div>
            <h2>Próximas ações</h2>
            <p className="muted">
              O rascunho atual será atualizado nos próximos salvamentos enquanto este PEI
              permanecer aberto.
            </p>
          </div>
          {form.statusGeral === "concluido" ? (
            <div className="pei-concluido-note">
              Este PEI está marcado como Concluído. As informações permanecem editáveis para
              ajustes pedagógicos, se necessário.
            </div>
          ) : null}
          <div className="form-actions pei-future-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleNovoPei}
              disabled={salvando || concluindo || Boolean(excluindoPeiId)}
            >
              Novo PEI
            </button>
            <button
              type="submit"
              disabled={salvando || concluindo || Boolean(excluindoPeiId)}
            >
              {salvando ? "Salvando..." : "Salvar rascunho do PEI"}
            </button>
            <button
              type="button"
              className={`pei-concluir-button${
                form.statusGeral === "concluido" ? " pei-concluir-button-concluido" : ""
              }`}
              onClick={handleConcluirPei}
              disabled={
                salvando ||
                concluindo ||
                Boolean(excluindoPeiId) ||
                form.statusGeral === "concluido"
              }
            >
              {concluindo
                ? "Concluindo..."
                : form.statusGeral === "concluido"
                  ? "PEI já concluído"
                  : "Concluir PEI"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleImprimirPei}
              disabled={salvando || concluindo || Boolean(excluindoPeiId)}
            >
              Imprimir PEI
            </button>
          </div>
          <p className="pei-future-note">
            {peiId
              ? "Este rascunho já possui um documento salvo e será atualizado pelo mesmo botão."
              : "O primeiro salvamento criará um novo documento na coleção peis."}
            {" "}A impressão utiliza a janela do navegador e permite salvar como PDF.
          </p>
        </section>
          </form>
        </PEIFormContext.Provider>
      )}

      <section className="pei-print-area" aria-label="PEI para impressão">
        <header className="pei-print-header">
          <p className="pei-print-brand">AEE Registro</p>
          <h1>Plano de Ensino Individualizado — PEI</h1>
          <div className="pei-print-summary">
            <p>
              <strong>Estudante:</strong>{" "}
              {obterValorImpressao(
                form.identificacaoEstudante.nome ||
                  form.identificacaoEstudante.alunoCadastrado ||
                  form.alunoNome,
              )}
            </p>
            <p>
              <strong>Ano letivo:</strong>{" "}
              {obterValorImpressao(
                form.identificacaoEstudante.anoLetivo || form.anoLetivo,
              )}
            </p>
            <p>
              <strong>Período de vigência:</strong>{" "}
              {obterValorImpressao(
                form.identificacaoEstudante.periodoVigencia || form.periodoVigencia,
              )}
            </p>
            <p>
              <strong>Data de impressão:</strong>{" "}
              {formatarDataImpressao(obterDataAtualIsoLocal())}
            </p>
          </div>
        </header>

        <section className="pei-print-section">
          <h2>1. Identificação do estudante</h2>
          <table className="pei-print-identification-table">
            <colgroup>
              <col className="pei-print-identification-field-column" />
              <col className="pei-print-identification-value-column" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Campo</th>
                <th scope="col">Informação</th>
              </tr>
            </thead>
            <tbody>
              <LinhaIdentificacaoImpressao
                rotulo="Nome completo"
                valor={
                  form.identificacaoEstudante.nome ||
                  form.identificacaoEstudante.alunoCadastrado ||
                  form.alunoNome
                }
              />
              <LinhaIdentificacaoImpressao
                rotulo="Data de nascimento"
                valor={formatarDataImpressao(form.identificacaoEstudante.dataNascimento)}
              />
              <LinhaIdentificacaoImpressao rotulo="Idade" valor={form.identificacaoEstudante.idade} />
              <LinhaIdentificacaoImpressao
                rotulo="Ano/Série"
                valor={form.identificacaoEstudante.serieAno}
              />
              <LinhaIdentificacaoImpressao rotulo="Turma" valor={form.identificacaoEstudante.turma} />
              <LinhaIdentificacaoImpressao rotulo="Turno" valor={form.identificacaoEstudante.turno} />
              <LinhaIdentificacaoImpressao rotulo="Escola" valor={form.identificacaoEstudante.escola} />
              <LinhaIdentificacaoImpressao
                rotulo="Município"
                valor={form.identificacaoEstudante.municipio}
              />
              <LinhaIdentificacaoImpressao
                rotulo="Data do planejamento"
                valor={formatarDataImpressao(form.identificacaoEstudante.dataPlanejamento)}
              />
              <LinhaIdentificacaoImpressao
                rotulo="Período de vigência"
                valor={form.identificacaoEstudante.periodoVigencia}
              />
              <LinhaIdentificacaoImpressao
                rotulo="Professor(a) da sala comum"
                valor={form.identificacaoEstudante.professorSalaComum}
              />
              <LinhaIdentificacaoImpressao
                rotulo="Professor(a) do AEE"
                valor={form.identificacaoEstudante.professorAee}
              />
              <LinhaIdentificacaoImpressao
                rotulo="Profissional de apoio/mediador"
                valor={form.identificacaoEstudante.profissionalApoio}
              />
            </tbody>
          </table>
          <article className="pei-print-identification-diagnosis">
            <h3>Condição do estudante / diagnóstico informado</h3>
            <p>{obterValorImpressao(form.identificacaoEstudante.condicaoDiagnostico)}</p>
          </article>
        </section>

        <section className="pei-print-section">
          <h2>2. Participantes e articulação</h2>
          <dl className="pei-print-grid">
            <CampoImpressao
              rotulo="Participantes envolvidos"
              valor={form.participantesArticulacao.participantesEnvolvidos}
              span
            />
            <CampoImpressao
              rotulo="Estratégias colaborativas com o AEE"
              valor={form.participantesArticulacao.estrategiasColaborativasAee}
              span
            />
            <CampoImpressao
              rotulo="Participação da família"
              valor={form.participantesArticulacao.participacaoFamilia}
              span
            />
            <CampoImpressao
              rotulo="Participação do estudante"
              valor={form.participantesArticulacao.participacaoEstudante}
              span
            />
            <CampoImpressao
              rotulo="Articulação com outros profissionais ou rede de apoio"
              valor={form.participantesArticulacao.articulacaoOutrosProfissionais}
              span
            />
          </dl>
        </section>

        <section className="pei-print-section">
          <h2>3. Base pedagógica do PEI</h2>
          <dl className="pei-print-grid">
            <CampoImpressao
              rotulo="Potencialidades do estudante"
              valor={form.basePedagogica.potencialidades}
              span
            />
            <CampoImpressao
              rotulo="Barreiras de acesso ao currículo"
              valor={form.basePedagogica.barreirasAcessoCurriculo}
              span
            />
            <CampoImpressao
              rotulo="Necessidades de apoio na sala comum"
              valor={form.basePedagogica.necessidadesApoioSalaComum}
              span
            />
            <CampoImpressao
              rotulo="Resumo do Estudo de Caso/PAEE que orienta este PEI"
              valor={form.basePedagogica.resumoEstudoCasoPaee}
              span
            />
          </dl>
        </section>

        <section className="pei-print-section">
          <h2>4. Planejamento curricular</h2>
          <dl className="pei-print-grid">
            <CampoImpressao
              rotulo="Componente curricular/disciplina"
              valor={form.planejamentoCurricular.componenteCurricular}
            />
            <CampoImpressao
              rotulo="Período de trabalho"
              valor={form.planejamentoCurricular.periodoTrabalho}
            />
            <CampoImpressao
              rotulo="Conteúdo/objeto de conhecimento"
              valor={form.planejamentoCurricular.objetoConhecimento}
              span
            />
            <CampoImpressao
              rotulo="Conceito central do conteúdo"
              valor={form.planejamentoCurricular.conceitoCentral}
              span
            />
          </dl>
        </section>

        <section className="pei-print-section">
          <h2>5. Habilidades e objetos de conhecimento priorizados</h2>
          {habilidadesParaImpressao.length ? (
            habilidadesParaImpressao.map((item, indice) => (
              <article key={`habilidade-impressao-${indice}`} className="pei-print-item">
                <h3>Prioridade {indice + 1}</h3>
                <dl className="pei-print-grid">
                  <CampoImpressao rotulo="Habilidade priorizada" valor={item.habilidade} span />
                  <CampoImpressao
                    rotulo="Objeto de conhecimento priorizado"
                    valor={item.objetoConhecimento}
                    span
                  />
                  <CampoImpressao rotulo="Prazo de execução" valor={item.prazoExecucao} span />
                </dl>
              </article>
            ))
          ) : (
            <p>Nenhuma habilidade priorizada registrada.</p>
          )}
        </section>

        <section className="pei-print-section">
          <h2>6. Objetivos e metas de aprendizagem</h2>
          {objetivosParaImpressao.length ? (
            objetivosParaImpressao.map((item, indice) => (
              <article key={`objetivo-impressao-${indice}`} className="pei-print-item">
                <h3>Objetivo {indice + 1}</h3>
                <dl className="pei-print-grid">
                  <CampoImpressao rotulo="Objetivo/meta" valor={item.objetivoMeta} span />
                  <CampoImpressao
                    rotulo="Resultado esperado"
                    valor={item.resultadoEsperado}
                    span
                  />
                  <CampoImpressao rotulo="Prioridade" valor={item.prioridade} />
                  <CampoImpressao rotulo="Prazo" valor={item.prazo} />
                </dl>
              </article>
            ))
          ) : (
            <p>Nenhum objetivo ou meta registrado.</p>
          )}
        </section>

        <section className="pei-print-section">
          <h2>7. Metodologias e propostas de atividades</h2>
          <dl className="pei-print-grid">
            <CampoImpressao
              rotulo="Metodologias"
              valor={form.metodologiasAtividades.metodologias}
              span
            />
            <CampoImpressao
              rotulo="Propostas de atividades"
              valor={form.metodologiasAtividades.propostasAtividades}
              span
            />
            <CampoImpressao
              rotulo="Adaptações nas atividades"
              valor={form.metodologiasAtividades.adaptacoesAtividades}
              span
            />
            <CampoImpressao
              rotulo="Organização da participação na sala comum"
              valor={form.metodologiasAtividades.organizacaoParticipacaoSalaComum}
              span
            />
          </dl>
        </section>

        <section className="pei-print-section">
          <h2>8. Recursos, acessibilidade e apoios</h2>
          <dl className="pei-print-grid">
            <CampoImpressao
              rotulo="Recursos utilizados"
              valor={form.recursosAcessibilidadeApoios.recursosUtilizados}
              span
            />
            <CampoImpressao
              rotulo="Estratégias de acessibilidade curricular"
              valor={form.recursosAcessibilidadeApoios.acessibilidadeCurricular}
              span
            />
            <CampoImpressao
              rotulo="Apoios necessários"
              valor={form.recursosAcessibilidadeApoios.apoiosNecessarios}
              span
            />
            <CampoImpressao
              rotulo="Tecnologia assistiva ou comunicação alternativa"
              valor={form.recursosAcessibilidadeApoios.tecnologiaAssistivaComunicacao}
              span
            />
          </dl>
        </section>

        <section className="pei-print-section">
          <h2>9. Formas de avaliação da aprendizagem</h2>
          <dl className="pei-print-grid">
            <CampoImpressao
              rotulo="Estratégias de avaliação"
              valor={form.avaliacaoAprendizagem.estrategiasAvaliacao}
              span
            />
            <CampoImpressao
              rotulo="Formas de demonstrar aprendizagem"
              valor={form.avaliacaoAprendizagem.formasDemonstrarAprendizagem}
              span
            />
            <CampoImpressao
              rotulo="Critérios de observação"
              valor={form.avaliacaoAprendizagem.criteriosObservacao}
              span
            />
            <CampoImpressao
              rotulo="Instrumentos/registros utilizados"
              valor={form.avaliacaoAprendizagem.instrumentosRegistros}
              span
            />
          </dl>
        </section>

        <section className="pei-print-section">
          <h2>10. Acompanhamento: desafios e expectativas</h2>
          <dl className="pei-print-grid">
            <CampoImpressao
              rotulo="Registros do processo"
              valor={form.acompanhamentoRevisao.registrosProcesso}
              span
            />
            <CampoImpressao
              rotulo="Desafios encontrados"
              valor={form.acompanhamentoRevisao.desafiosEncontrados}
              span
            />
            <CampoImpressao
              rotulo="Avanços observados"
              valor={form.acompanhamentoRevisao.avancosObservados}
              span
            />
            <CampoImpressao
              rotulo="Expectativas para o próximo bimestre/período"
              valor={form.acompanhamentoRevisao.expectativasProximoPeriodo}
              span
            />
            <CampoImpressao
              rotulo="Data prevista para revisão"
              valor={formatarDataImpressao(form.acompanhamentoRevisao.dataPrevistaRevisao)}
              span
            />
          </dl>
        </section>

        <section className="pei-print-section">
          <h2>11. Encaminhamentos finais</h2>
          <dl className="pei-print-grid">
            <CampoImpressao
              rotulo="Encaminhamentos para sala comum"
              valor={form.encaminhamentosFinais.salaComum}
              span
            />
            <CampoImpressao
              rotulo="Encaminhamentos para o AEE"
              valor={form.encaminhamentosFinais.aee}
              span
            />
            <CampoImpressao
              rotulo="Encaminhamentos para família"
              valor={form.encaminhamentosFinais.familia}
              span
            />
            <CampoImpressao
              rotulo="Encaminhamentos para coordenação/gestão"
              valor={form.encaminhamentosFinais.coordenacaoGestao}
              span
            />
            <CampoImpressao
              rotulo="Observações finais"
              valor={form.encaminhamentosFinais.observacoesFinais}
              span
            />
          </dl>
        </section>

        <footer className="pei-print-footer">
          Documento preparado na Plataforma AEE Registro em{" "}
          {formatarDataImpressao(obterDataAtualIsoLocal())}.
        </footer>
      </section>
    </main>
  );
}

export default PEIPage;
