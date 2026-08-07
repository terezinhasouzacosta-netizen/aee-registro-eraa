import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { listarAlunos } from "../services/alunosService";
import {
  atualizarPaee,
  buscarPaeePorId,
  criarPaee,
  listarPaees,
} from "../services/paeesService";
import { podeVisualizarMetas } from "../utils/permissions";

const PAEE_RASCUNHO_ID_KEY = "paeeRascunhoId";
const MENSAGEM_CAMPOS_MINIMOS =
  "Antes de concluir o PAEE, preencha os campos mínimos: identificação do estudante, ano letivo, período, síntese diagnóstica, pelo menos um objetivo, estratégias pedagógicas e critérios de acompanhamento.";

const STATUS_GERAL_OPTIONS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "em_elaboracao", label: "Em elaboração" },
  { value: "concluido", label: "Concluído" },
];

const STATUS_OBJETIVO_OPTIONS = [
  { value: "planejado", label: "Planejado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "pausado", label: "Pausado" },
];

function criarObjetivosIniciais(quantidade = 3) {
  return Array.from({ length: quantidade }, (_, indice) => ({
    id: `objetivo-${indice + 1}`,
    areaEixo: "",
    objetivoEspecifico: "",
    estrategias: "",
    recursos: "",
    prazo: "",
    criterioAcompanhamento: "",
    status: "planejado",
  }));
}

function criarFormularioInicial(currentUser) {
  return {
    alunoId: "",
    alunoNome: "",
    anoLetivo: String(new Date().getFullYear()),
    periodo: "",
    dataInicio: "",
    dataFim: "",
    statusGeral: "rascunho",
    responsavel: {
      uid: currentUser?.uid || "",
      nome: currentUser?.displayName || currentUser?.email || "",
      email: currentUser?.email || "",
    },
    identificacaoEstudante: {
      nome: "",
      dataNascimento: "",
      serieAno: "",
      turma: "",
      turno: "",
      professorAee: "",
      nomeEscola: "",
      municipio: "",
      localizacao: "",
    },
    basePedagogica: {
      potencialidades: "",
      barreiras: "",
      necessidadesEspecificas: "",
      resumoEstudoCaso: "",
    },
    sinteseDiagnostica: "",
    objetivos: criarObjetivosIniciais(),
    estrategiasPedagogicas: "",
    recursosTecnologiaAssistiva: "",
    organizacaoAtendimento: {
      frequencia: "",
      duracaoMedia: "",
      modalidade: "",
      articulacaoSalaComumFamilia: "",
    },
    criteriosAcompanhamento: "",
    encaminhamentos: "",
    schemaVersao: 1,
    dataConclusao: null,
  };
}

function limparTexto(valor) {
  return String(valor || "").trim();
}

function formatarDataLista(valor, incluirHora = false) {
  if (!valor) return "-";

  const data = valor?.toDate ? valor.toDate() : new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(incluirHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(data);
}

function obterLabelStatus(statusGeral) {
  return (
    STATUS_GERAL_OPTIONS.find((status) => status.value === statusGeral)?.label || "Rascunho"
  );
}

function obterDataAtualIsoLocal() {
  const agora = new Date();
  const dataLocal = new Date(agora.getTime() - agora.getTimezoneOffset() * 60 * 1000);
  return dataLocal.toISOString().slice(0, 10);
}

function possuiCamposMinimosParaConclusao(form) {
  const possuiObjetivo = form.objetivos.some((objetivo) =>
    limparTexto(objetivo.objetivoEspecifico),
  );

  return Boolean(
    limparTexto(form.alunoNome || form.identificacaoEstudante.nome) &&
      limparTexto(form.anoLetivo) &&
      limparTexto(form.periodo) &&
      limparTexto(form.sinteseDiagnostica) &&
      possuiObjetivo &&
      limparTexto(form.estrategiasPedagogicas) &&
      limparTexto(form.criteriosAcompanhamento),
  );
}

function objetivoPossuiConteudo(objetivo) {
  return [
    objetivo.areaEixo,
    objetivo.objetivoEspecifico,
    objetivo.estrategias,
    objetivo.recursos,
    objetivo.prazo,
    objetivo.criterioAcompanhamento,
  ].some((valor) => limparTexto(valor));
}

function possuiConteudoMinimoParaImpressao(form) {
  const possuiEstudante = limparTexto(
    form.alunoNome || form.identificacaoEstudante.nome,
  );
  const possuiConteudoPlano = [
    form.periodo,
    form.dataInicio,
    form.dataFim,
    form.basePedagogica.potencialidades,
    form.basePedagogica.barreiras,
    form.basePedagogica.necessidadesEspecificas,
    form.basePedagogica.resumoEstudoCaso,
    form.sinteseDiagnostica,
    form.estrategiasPedagogicas,
    form.recursosTecnologiaAssistiva,
    form.organizacaoAtendimento.frequencia,
    form.organizacaoAtendimento.duracaoMedia,
    form.organizacaoAtendimento.modalidade,
    form.organizacaoAtendimento.articulacaoSalaComumFamilia,
    form.criteriosAcompanhamento,
    form.encaminhamentos,
  ].some((valor) => limparTexto(valor));

  return Boolean(
    possuiEstudante &&
      (possuiConteudoPlano || form.objetivos.some(objetivoPossuiConteudo)),
  );
}

function obterValorImpressao(valor) {
  return limparTexto(valor) || "Não informado";
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

function normalizarObjetivos(objetivos) {
  const objetivosSalvos = Array.isArray(objetivos) ? objetivos : [];
  const quantidade = Math.max(3, objetivosSalvos.length);

  return criarObjetivosIniciais(quantidade).map((objetivoInicial, indice) => ({
    ...objetivoInicial,
    ...(objetivosSalvos[indice] || {}),
    id: objetivosSalvos[indice]?.id || objetivoInicial.id,
  }));
}

function normalizarPaeeParaFormulario(paee, currentUser) {
  const responsavelSalvo =
    paee?.responsavel && typeof paee.responsavel === "object"
      ? paee.responsavel
      : { nome: paee?.responsavel || "" };
  const sinteseSalva =
    paee?.sinteseDiagnostica && typeof paee.sinteseDiagnostica === "object"
      ? paee.sinteseDiagnostica.texto
      : paee?.sinteseDiagnostica;

  return {
    ...criarFormularioInicial(currentUser),
    ...paee,
    alunoId: paee?.alunoId || "",
    alunoNome: paee?.alunoNome || paee?.identificacaoEstudante?.nome || "",
    responsavel: {
      uid: responsavelSalvo.uid || currentUser?.uid || "",
      nome:
        responsavelSalvo.nome ||
        currentUser?.displayName ||
        currentUser?.email ||
        "",
      email: responsavelSalvo.email || currentUser?.email || "",
    },
    identificacaoEstudante: {
      ...criarFormularioInicial(currentUser).identificacaoEstudante,
      ...(paee?.identificacaoEstudante || {}),
    },
    basePedagogica: {
      ...criarFormularioInicial(currentUser).basePedagogica,
      ...(paee?.basePedagogica || {}),
    },
    sinteseDiagnostica: sinteseSalva || "",
    objetivos: normalizarObjetivos(paee?.objetivos),
    organizacaoAtendimento: {
      ...criarFormularioInicial(currentUser).organizacaoAtendimento,
      ...(paee?.organizacaoAtendimento || {}),
    },
    dataConclusao: paee?.dataConclusao || null,
  };
}

function salvarPaeeIdLocal(paeeId) {
  try {
    window.localStorage.setItem(PAEE_RASCUNHO_ID_KEY, paeeId);
  } catch (error) {
    console.warn("[PAEEPage] Não foi possível salvar o id local do PAEE.", error);
  }
}

function lerPaeeIdLocal() {
  try {
    return window.localStorage.getItem(PAEE_RASCUNHO_ID_KEY) || "";
  } catch (error) {
    console.warn("[PAEEPage] Não foi possível ler o id local do PAEE.", error);
    return "";
  }
}

function removerPaeeIdLocal() {
  try {
    window.localStorage.removeItem(PAEE_RASCUNHO_ID_KEY);
  } catch (error) {
    console.warn("[PAEEPage] Não foi possível remover o id local do PAEE.", error);
  }
}

function montarPayload(form, currentUser) {
  const identificacao = form.identificacaoEstudante;

  return {
    alunoId: limparTexto(form.alunoId),
    alunoNome: limparTexto(identificacao.nome || form.alunoNome),
    anoLetivo: limparTexto(form.anoLetivo),
    periodo: limparTexto(form.periodo),
    dataInicio: form.dataInicio || "",
    dataFim: form.dataFim || "",
    statusGeral: form.statusGeral || "rascunho",
    responsavel: {
      uid: form.responsavel.uid || currentUser?.uid || "",
      nome: limparTexto(form.responsavel.nome),
      email: limparTexto(form.responsavel.email || currentUser?.email),
    },
    identificacaoEstudante: {
      nome: limparTexto(identificacao.nome),
      dataNascimento: identificacao.dataNascimento || "",
      serieAno: limparTexto(identificacao.serieAno),
      turma: limparTexto(identificacao.turma),
      turno: limparTexto(identificacao.turno),
      professorAee: limparTexto(identificacao.professorAee),
      nomeEscola: limparTexto(identificacao.nomeEscola),
      municipio: limparTexto(identificacao.municipio),
      localizacao: limparTexto(identificacao.localizacao),
    },
    basePedagogica: {
      potencialidades: limparTexto(form.basePedagogica.potencialidades),
      barreiras: limparTexto(form.basePedagogica.barreiras),
      necessidadesEspecificas: limparTexto(form.basePedagogica.necessidadesEspecificas),
      resumoEstudoCaso: limparTexto(form.basePedagogica.resumoEstudoCaso),
    },
    sinteseDiagnostica: {
      texto: limparTexto(form.sinteseDiagnostica),
      origem: "manual",
    },
    objetivos: form.objetivos.map((objetivo, indice) => ({
      id: objetivo.id || `objetivo-${indice + 1}`,
      areaEixo: limparTexto(objetivo.areaEixo),
      objetivoEspecifico: limparTexto(objetivo.objetivoEspecifico),
      estrategias: limparTexto(objetivo.estrategias),
      recursos: limparTexto(objetivo.recursos),
      prazo: objetivo.prazo || "",
      criterioAcompanhamento: limparTexto(objetivo.criterioAcompanhamento),
      status: objetivo.status || "planejado",
    })),
    estrategiasPedagogicas: limparTexto(form.estrategiasPedagogicas),
    recursosTecnologiaAssistiva: limparTexto(form.recursosTecnologiaAssistiva),
    organizacaoAtendimento: {
      frequencia: limparTexto(form.organizacaoAtendimento.frequencia),
      duracaoMedia: limparTexto(form.organizacaoAtendimento.duracaoMedia),
      modalidade: limparTexto(form.organizacaoAtendimento.modalidade),
      articulacaoSalaComumFamilia: limparTexto(
        form.organizacaoAtendimento.articulacaoSalaComumFamilia,
      ),
    },
    criteriosAcompanhamento: limparTexto(form.criteriosAcompanhamento),
    encaminhamentos: limparTexto(form.encaminhamentos),
    schemaVersao: 1,
    dataConclusao: form.dataConclusao || null,
  };
}

function PAEEPage() {
  const { currentUser, perfil } = useAuth();
  const podeLer = podeVisualizarMetas(perfil);
  const [form, setForm] = useState(() => criarFormularioInicial(currentUser));
  const [alunos, setAlunos] = useState([]);
  const [paeesSalvos, setPaeesSalvos] = useState([]);
  const [paeeId, setPaeeId] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [abrindoPaeeId, setAbrindoPaeeId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");

  const carregarPaeesSalvos = async () => {
    setCarregandoLista(true);

    try {
      const lista = await listarPaees();
      setPaeesSalvos(lista);
    } catch (error) {
      console.error("[PAEEPage] Erro ao listar PAEEs salvos", error);
      setErro("Não foi possível carregar os PAEEs salvos.");
    } finally {
      setCarregandoLista(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !podeLer) return undefined;

    let ativo = true;

    async function carregarPagina() {
      setCarregando(true);
      setErro("");

      try {
        const alunosData = await listarAlunos();
        if (ativo) setAlunos(alunosData);
      } catch (error) {
        console.error("[PAEEPage] Erro ao carregar alunos", error);
        if (ativo) setErro("Não foi possível carregar os alunos cadastrados.");
      }

      if (ativo) await carregarPaeesSalvos();

      const rascunhoId = lerPaeeIdLocal();

      if (rascunhoId) {
        try {
          const paeeSalvo = await buscarPaeePorId(rascunhoId);

          if (!ativo) return;

          if (paeeSalvo) {
            setForm(normalizarPaeeParaFormulario(paeeSalvo, currentUser));
            setPaeeId(paeeSalvo.id || rascunhoId);
            setAviso("Rascunho anterior do PAEE carregado.");
          } else {
            removerPaeeIdLocal();
            setAviso("Não foi possível carregar o rascunho anterior do PAEE.");
          }
        } catch (error) {
          console.error("[PAEEPage] Erro ao carregar rascunho anterior", error);
          if (ativo) {
            removerPaeeIdLocal();
            setAviso("Não foi possível carregar o rascunho anterior do PAEE.");
          }
        }
      } else if (ativo) {
        setForm(criarFormularioInicial(currentUser));
      }

      if (ativo) setCarregando(false);
    }

    carregarPagina();

    return () => {
      ativo = false;
    };
  }, [currentUser?.uid, podeLer]);

  const handleCampoPrincipal = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleResponsavel = (event) => {
    setForm((prev) => ({
      ...prev,
      responsavel: { ...prev.responsavel, nome: event.target.value },
    }));
  };

  const handleAlunoSelecionado = (event) => {
    const alunoId = event.target.value;
    const aluno = alunos.find((item) => item.id === alunoId) || null;

    setForm((prev) => {
      if (!aluno) {
        return {
          ...prev,
          alunoId: "",
          alunoNome: prev.identificacaoEstudante.nome,
        };
      }

      return {
        ...prev,
        alunoId: aluno.id,
        alunoNome: aluno.nome || "",
        identificacaoEstudante: {
          ...prev.identificacaoEstudante,
          nome: aluno.nome || "",
          dataNascimento: aluno.dataNascimento || "",
          serieAno: aluno.serieAno || "",
          turma: aluno.turma || "",
          turno: aluno.turno || "",
          professorAee: aluno.professorAee || "",
          nomeEscola: aluno.nomeEscola || "",
          municipio: aluno.municipio || "",
          localizacao: aluno.localizacao || "",
        },
      };
    });
  };

  const handleIdentificacao = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      alunoNome: name === "nome" ? value : prev.alunoNome,
      identificacaoEstudante: {
        ...prev.identificacaoEstudante,
        [name]: value,
      },
    }));
  };

  const handleBasePedagogica = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      basePedagogica: {
        ...prev.basePedagogica,
        [name]: value,
      },
    }));
  };

  const handleOrganizacao = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      organizacaoAtendimento: {
        ...prev.organizacaoAtendimento,
        [name]: value,
      },
    }));
  };

  const handleObjetivo = (indice, campo, valor) => {
    setForm((prev) => ({
      ...prev,
      objetivos: prev.objetivos.map((objetivo, objetivoIndice) =>
        objetivoIndice === indice ? { ...objetivo, [campo]: valor } : objetivo,
      ),
    }));
  };

  const handleSalvarRascunho = async (event) => {
    event.preventDefault();
    if (!currentUser || salvando || concluindo) return;

    setSalvando(true);
    setFeedback("");
    setAviso("");
    setErro("");

    try {
      const payload = montarPayload(form, currentUser);

      if (paeeId) {
        await atualizarPaee(paeeId, payload);
      } else {
        const novoPaeeId = await criarPaee(payload);
        setPaeeId(novoPaeeId);
        salvarPaeeIdLocal(novoPaeeId);
      }

      setFeedback("Rascunho do PAEE salvo com sucesso.");
      await carregarPaeesSalvos();
    } catch (error) {
      console.error("[PAEEPage] Erro ao salvar rascunho", error);
      setErro("Não foi possível salvar o rascunho do PAEE. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const handleNovoPaee = () => {
    setForm(criarFormularioInicial(currentUser));
    setPaeeId("");
    removerPaeeIdLocal();
    setErro("");
    setAviso("");
    setFeedback("Novo PAEE iniciado.");
  };

  const handleConcluirPaee = async () => {
    if (!currentUser || salvando || concluindo) return;

    setFeedback("");
    setAviso("");
    setErro("");

    if (!possuiCamposMinimosParaConclusao(form)) {
      setErro(MENSAGEM_CAMPOS_MINIMOS);
      return;
    }

    const confirmou = window.confirm(
      "Deseja concluir este PAEE? Confira se o plano foi revisado e validado pela professora do AEE.",
    );

    if (!confirmou) return;

    setConcluindo(true);

    try {
      const dataConclusao = obterDataAtualIsoLocal();
      const formConcluido = {
        ...form,
        statusGeral: "concluido",
        dataConclusao,
      };
      const payload = montarPayload(formConcluido, currentUser);
      let idAtual = paeeId;

      if (idAtual) {
        await atualizarPaee(idAtual, payload);
      } else {
        idAtual = await criarPaee(payload);
        setPaeeId(idAtual);
        salvarPaeeIdLocal(idAtual);
      }

      setForm(formConcluido);
      setFeedback("PAEE concluído com sucesso.");
      await carregarPaeesSalvos();
    } catch (error) {
      console.error("[PAEEPage] Erro ao concluir PAEE", error);
      setErro("Não foi possível concluir o PAEE. Tente novamente.");
    } finally {
      setConcluindo(false);
    }
  };

  const handleImprimirPaee = () => {
    setFeedback("");
    setAviso("");
    setErro("");

    if (!possuiConteudoMinimoParaImpressao(form)) {
      setErro("Antes de imprimir, preencha ou abra um PAEE salvo.");
      return;
    }

    window.print();
  };

  const handleAbrirPaee = async (id) => {
    if (!id || abrindoPaeeId) return;

    setAbrindoPaeeId(id);
    setFeedback("");
    setAviso("");
    setErro("");

    try {
      const paeeSalvo = await buscarPaeePorId(id);

      if (!paeeSalvo) {
        setAviso("O PAEE selecionado não foi encontrado.");
        await carregarPaeesSalvos();
        return;
      }

      setForm(normalizarPaeeParaFormulario(paeeSalvo, currentUser));
      setPaeeId(paeeSalvo.id || id);
      salvarPaeeIdLocal(paeeSalvo.id || id);
      setFeedback("PAEE carregado com sucesso.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("[PAEEPage] Erro ao abrir PAEE salvo", error);
      setErro("Não foi possível abrir o PAEE selecionado.");
    } finally {
      setAbrindoPaeeId("");
    }
  };

  if (!podeLer) {
    return (
      <main className="alunos-page">
        <section className="panel">
          <h1>PAEE</h1>
          <p>Seu perfil não possui permissão para visualizar esta tela.</p>
        </section>
      </main>
    );
  }

  const objetivosParaImpressao = form.objetivos.filter(objetivoPossuiConteudo);

  return (
    <main className="alunos-page module-page paee-page">
      <header className="page-header">
        <div>
          <h1>PAEE — Plano de Atendimento Educacional Especializado</h1>
          <p>Primeira versão funcional para preenchimento manual e salvamento de rascunho.</p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleNovoPaee}
          disabled={salvando || concluindo}
        >
          Novo PAEE
        </button>
      </header>

      {feedback ? <p className="toast-success">{feedback}</p> : null}
      {erro ? <p className="toast-error">{erro}</p> : null}
      {aviso ? <div className="paee-note">{aviso}</div> : null}
      {!carregando && form.statusGeral === "concluido" ? (
        <div className="paee-concluido-note">
          Este PAEE está marcado como Concluído. O plano abaixo é a versão validada para
          acompanhamento pedagógico.
        </div>
      ) : null}

      {carregando ? (
        <section className="panel">
          <p>Carregando PAEE...</p>
        </section>
      ) : (
        <>
          <section className="panel paee-salvos-panel" aria-labelledby="paees-salvos-titulo">
            <div className="paee-section-heading">
              <div>
                <h2 id="paees-salvos-titulo">PAEEs salvos</h2>
                <p className="muted">Abra um plano para continuar o preenchimento e o salvamento.</p>
              </div>
              <span className="paee-status-chip">{paeesSalvos.length} registro(s)</span>
            </div>

            {carregandoLista ? (
              <p className="muted">Carregando PAEEs salvos...</p>
            ) : paeesSalvos.length ? (
              <div className="paee-table-wrapper">
                <table className="paee-salvos-table">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Ano letivo</th>
                      <th>Período</th>
                      <th>Status</th>
                      <th>Data de início</th>
                      <th>Data final prevista</th>
                      <th>Atualizado em</th>
                      <th>Abrir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paeesSalvos.map((paee) => (
                      <tr key={paee.id}>
                        <td>
                          {paee.alunoNome || paee.identificacaoEstudante?.nome || "Não informado"}
                        </td>
                        <td>{paee.anoLetivo || "-"}</td>
                        <td>{paee.periodo || "-"}</td>
                        <td>{obterLabelStatus(paee.statusGeral)}</td>
                        <td>{formatarDataLista(paee.dataInicio)}</td>
                        <td>{formatarDataLista(paee.dataFim)}</td>
                        <td>{formatarDataLista(paee.atualizadoEm || paee.criadoEm, true)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary paee-open-button"
                            onClick={() => handleAbrirPaee(paee.id)}
                            disabled={abrindoPaeeId === paee.id}
                          >
                            {abrindoPaeeId === paee.id ? "Abrindo..." : "Abrir"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="paee-empty-state">Nenhum PAEE salvo até o momento.</p>
            )}
          </section>

          <form className="paee-form" onSubmit={handleSalvarRascunho}>
          <section className="panel paee-header-panel">
            <div className="paee-section-heading">
              <div>
                <h2>Dados gerais do plano</h2>
                <p className="muted">
                  O rascunho atual será atualizado nas próximas vezes em que for salvo.
                </p>
              </div>
              <span className="paee-status-chip">
                {STATUS_GERAL_OPTIONS.find((item) => item.value === form.statusGeral)?.label ||
                  "Rascunho"}
              </span>
            </div>

            <div className="paee-fields-grid">
              <div>
                <label htmlFor="anoLetivo">Ano letivo</label>
                <input
                  id="anoLetivo"
                  name="anoLetivo"
                  value={form.anoLetivo}
                  onChange={handleCampoPrincipal}
                />
              </div>
              <div>
                <label htmlFor="periodo">Período</label>
                <input
                  id="periodo"
                  name="periodo"
                  value={form.periodo}
                  placeholder="Ex.: 1º semestre"
                  onChange={handleCampoPrincipal}
                />
              </div>
              <div>
                <label htmlFor="dataInicio">Data de início</label>
                <input
                  id="dataInicio"
                  name="dataInicio"
                  type="date"
                  value={form.dataInicio}
                  onChange={handleCampoPrincipal}
                />
              </div>
              <div>
                <label htmlFor="dataFim">Data final prevista</label>
                <input
                  id="dataFim"
                  name="dataFim"
                  type="date"
                  value={form.dataFim}
                  onChange={handleCampoPrincipal}
                />
              </div>
              <div>
                <label htmlFor="statusGeral">Status geral</label>
                <select
                  id="statusGeral"
                  name="statusGeral"
                  value={form.statusGeral}
                  onChange={handleCampoPrincipal}
                  disabled={form.statusGeral === "concluido"}
                >
                  {STATUS_GERAL_OPTIONS.map((status) => (
                    <option
                      key={status.value}
                      value={status.value}
                      disabled={status.value === "concluido" && form.statusGeral !== "concluido"}
                    >
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="responsavelPaee">Responsável pelo preenchimento</label>
                <input
                  id="responsavelPaee"
                  value={form.responsavel.nome}
                  onChange={handleResponsavel}
                />
              </div>
            </div>
          </section>

          <section className="panel paee-card">
            <div className="paee-card-header">
              <span className="paee-card-index">1</span>
              <div>
                <h2>Identificação do estudante</h2>
                <p className="muted">
                  Selecione um aluno cadastrado ou utilize o preenchimento manual provisório.
                </p>
              </div>
            </div>

            <div className="paee-fields-grid">
              <div className="paee-field-span-2">
                <label htmlFor="alunoIdPaee">Aluno cadastrado</label>
                <select id="alunoIdPaee" value={form.alunoId} onChange={handleAlunoSelecionado}>
                  <option value="">Preenchimento manual provisório</option>
                  {form.alunoId && !alunos.some((aluno) => aluno.id === form.alunoId) ? (
                    <option value={form.alunoId}>
                      {form.alunoNome || "Aluno anteriormente vinculado"}
                    </option>
                  ) : null}
                  {alunos.map((aluno) => (
                    <option key={aluno.id} value={aluno.id}>
                      {aluno.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="paee-field-span-2">
                <label htmlFor="nome">Nome do estudante</label>
                <input
                  id="nome"
                  name="nome"
                  value={form.identificacaoEstudante.nome}
                  onChange={handleIdentificacao}
                />
              </div>
              <div>
                <label htmlFor="dataNascimento">Data de nascimento</label>
                <input
                  id="dataNascimento"
                  name="dataNascimento"
                  type="date"
                  value={form.identificacaoEstudante.dataNascimento}
                  onChange={handleIdentificacao}
                />
              </div>
              <div>
                <label htmlFor="serieAno">Série/Ano</label>
                <input
                  id="serieAno"
                  name="serieAno"
                  value={form.identificacaoEstudante.serieAno}
                  onChange={handleIdentificacao}
                />
              </div>
              <div>
                <label htmlFor="turma">Turma</label>
                <input
                  id="turma"
                  name="turma"
                  value={form.identificacaoEstudante.turma}
                  onChange={handleIdentificacao}
                />
              </div>
              <div>
                <label htmlFor="turno">Turno</label>
                <input
                  id="turno"
                  name="turno"
                  value={form.identificacaoEstudante.turno}
                  onChange={handleIdentificacao}
                />
              </div>
              <div className="paee-field-span-2">
                <label htmlFor="professorAee">Professor(a) do AEE</label>
                <input
                  id="professorAee"
                  name="professorAee"
                  value={form.identificacaoEstudante.professorAee}
                  onChange={handleIdentificacao}
                />
              </div>
              <div className="paee-field-span-2">
                <label htmlFor="nomeEscola">Nome da escola</label>
                <input
                  id="nomeEscola"
                  name="nomeEscola"
                  value={form.identificacaoEstudante.nomeEscola}
                  onChange={handleIdentificacao}
                />
              </div>
              <div>
                <label htmlFor="municipio">Município</label>
                <input
                  id="municipio"
                  name="municipio"
                  value={form.identificacaoEstudante.municipio}
                  onChange={handleIdentificacao}
                />
              </div>
              <div>
                <label htmlFor="localizacao">Localização</label>
                <input
                  id="localizacao"
                  name="localizacao"
                  value={form.identificacaoEstudante.localizacao}
                  onChange={handleIdentificacao}
                />
              </div>
            </div>
          </section>

          <section className="panel paee-card">
            <div className="paee-card-header">
              <span className="paee-card-index">2</span>
              <div>
                <h2>Base pedagógica do PAEE</h2>
                <p className="muted">
                  Registre de forma resumida as informações essenciais que orientam este PAEE, sem
                  repetir todo o Estudo de Caso.
                </p>
              </div>
            </div>
            <div className="paee-fields-grid">
              <div className="paee-field-span-2">
                <label htmlFor="potencialidades">Potencialidades do estudante</label>
                <textarea
                  id="potencialidades"
                  name="potencialidades"
                  rows="4"
                  value={form.basePedagogica.potencialidades}
                  onChange={handleBasePedagogica}
                />
              </div>
              <div className="paee-field-span-2">
                <label htmlFor="barreiras">Barreiras identificadas</label>
                <textarea
                  id="barreiras"
                  name="barreiras"
                  rows="4"
                  value={form.basePedagogica.barreiras}
                  onChange={handleBasePedagogica}
                />
              </div>
              <div className="paee-field-span-2">
                <label htmlFor="necessidadesEspecificas">Necessidades educacionais específicas</label>
                <textarea
                  id="necessidadesEspecificas"
                  name="necessidadesEspecificas"
                  rows="4"
                  value={form.basePedagogica.necessidadesEspecificas}
                  onChange={handleBasePedagogica}
                />
              </div>
              <div className="paee-field-span-2">
                <label htmlFor="resumoEstudoCaso">
                  Resumo do Estudo de Caso que orienta este PAEE
                </label>
                <textarea
                  id="resumoEstudoCaso"
                  name="resumoEstudoCaso"
                  rows="5"
                  value={form.basePedagogica.resumoEstudoCaso}
                  onChange={handleBasePedagogica}
                />
              </div>
            </div>
          </section>

          <section className="panel paee-card">
            <div className="paee-card-header">
              <span className="paee-card-index">3</span>
              <div>
                <h2>Síntese Diagnóstica</h2>
                <p className="muted">Registro manual da síntese pedagógica que orientará o plano.</p>
              </div>
            </div>
            <label htmlFor="sinteseDiagnostica">Síntese diagnóstica</label>
            <textarea
              id="sinteseDiagnostica"
              rows="7"
              value={form.sinteseDiagnostica}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sinteseDiagnostica: event.target.value }))
              }
            />
          </section>

          <section className="panel paee-card">
            <div className="paee-card-header">
              <span className="paee-card-index">4</span>
              <div>
                <h2>Objetivos do Atendimento AEE</h2>
                <p className="muted">Três objetivos editáveis para o período atual.</p>
              </div>
            </div>

            <div className="paee-objectives-grid">
              {form.objetivos.map((objetivo, indice) => (
                <article key={objetivo.id || indice} className="paee-objective-card">
                  <h3>Objetivo {indice + 1}</h3>
                  <div className="paee-fields-grid">
                    <div>
                      <label htmlFor={`objetivo-eixo-${indice}`}>Área/Eixo</label>
                      <input
                        id={`objetivo-eixo-${indice}`}
                        value={objetivo.areaEixo}
                        onChange={(event) =>
                          handleObjetivo(indice, "areaEixo", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor={`objetivo-status-${indice}`}>Status</label>
                      <select
                        id={`objetivo-status-${indice}`}
                        value={objetivo.status}
                        onChange={(event) => handleObjetivo(indice, "status", event.target.value)}
                      >
                        {STATUS_OBJETIVO_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="paee-field-span-2">
                      <label htmlFor={`objetivo-especifico-${indice}`}>Objetivo específico</label>
                      <textarea
                        id={`objetivo-especifico-${indice}`}
                        rows="3"
                        value={objetivo.objetivoEspecifico}
                        onChange={(event) =>
                          handleObjetivo(indice, "objetivoEspecifico", event.target.value)
                        }
                      />
                    </div>
                    <div className="paee-field-span-2">
                      <label htmlFor={`objetivo-estrategias-${indice}`}>Estratégias</label>
                      <textarea
                        id={`objetivo-estrategias-${indice}`}
                        rows="3"
                        value={objetivo.estrategias}
                        onChange={(event) =>
                          handleObjetivo(indice, "estrategias", event.target.value)
                        }
                      />
                    </div>
                    <div className="paee-field-span-2">
                      <label htmlFor={`objetivo-recursos-${indice}`}>Recursos</label>
                      <textarea
                        id={`objetivo-recursos-${indice}`}
                        rows="3"
                        value={objetivo.recursos}
                        onChange={(event) => handleObjetivo(indice, "recursos", event.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor={`objetivo-prazo-${indice}`}>Prazo</label>
                      <input
                        id={`objetivo-prazo-${indice}`}
                        type="date"
                        value={objetivo.prazo}
                        onChange={(event) => handleObjetivo(indice, "prazo", event.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor={`objetivo-criterio-${indice}`}>
                        Critério de acompanhamento
                      </label>
                      <textarea
                        id={`objetivo-criterio-${indice}`}
                        rows="3"
                        value={objetivo.criterioAcompanhamento}
                        onChange={(event) =>
                          handleObjetivo(indice, "criterioAcompanhamento", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel paee-card">
            <div className="paee-card-header">
              <span className="paee-card-index">5</span>
              <div>
                <h2>Estratégias Pedagógicas</h2>
                <p className="muted">Metodologias, mediações e adaptações previstas.</p>
              </div>
            </div>
            <label htmlFor="estrategiasPedagogicas">Estratégias pedagógicas gerais</label>
            <textarea
              id="estrategiasPedagogicas"
              rows="6"
              value={form.estrategiasPedagogicas}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, estrategiasPedagogicas: event.target.value }))
              }
            />
          </section>

          <section className="panel paee-card">
            <div className="paee-card-header">
              <span className="paee-card-index">6</span>
              <div>
                <h2>Recursos e Tecnologia Assistiva</h2>
                <p className="muted">Materiais, recursos acessíveis e apoios específicos.</p>
              </div>
            </div>
            <label htmlFor="recursosTecnologiaAssistiva">
              Recursos pedagógicos, acessibilidade e tecnologia assistiva
            </label>
            <textarea
              id="recursosTecnologiaAssistiva"
              rows="6"
              value={form.recursosTecnologiaAssistiva}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  recursosTecnologiaAssistiva: event.target.value,
                }))
              }
            />
          </section>

          <section className="panel paee-card">
            <div className="paee-card-header">
              <span className="paee-card-index">7</span>
              <div>
                <h2>Organização do Atendimento</h2>
                <p className="muted">Frequência, duração, modalidade e articulação pedagógica.</p>
              </div>
            </div>
            <div className="paee-fields-grid">
              <div>
                <label htmlFor="frequencia">Frequência do atendimento</label>
                <input
                  id="frequencia"
                  name="frequencia"
                  value={form.organizacaoAtendimento.frequencia}
                  placeholder="Ex.: 2 vezes por semana"
                  onChange={handleOrganizacao}
                />
              </div>
              <div>
                <label htmlFor="duracaoMedia">Duração média</label>
                <input
                  id="duracaoMedia"
                  name="duracaoMedia"
                  value={form.organizacaoAtendimento.duracaoMedia}
                  placeholder="Ex.: 50 minutos"
                  onChange={handleOrganizacao}
                />
              </div>
              <div className="paee-field-span-2">
                <label htmlFor="modalidade">Modalidade do atendimento</label>
                <input
                  id="modalidade"
                  name="modalidade"
                  value={form.organizacaoAtendimento.modalidade}
                  placeholder="Ex.: Individual ou pequeno grupo"
                  onChange={handleOrganizacao}
                />
              </div>
              <div className="paee-field-span-2">
                <label htmlFor="articulacaoSalaComumFamilia">
                  Articulação com sala comum e família
                </label>
                <textarea
                  id="articulacaoSalaComumFamilia"
                  name="articulacaoSalaComumFamilia"
                  rows="5"
                  value={form.organizacaoAtendimento.articulacaoSalaComumFamilia}
                  onChange={handleOrganizacao}
                />
              </div>
            </div>
          </section>

          <section className="panel paee-card">
            <div className="paee-card-header">
              <span className="paee-card-index">8</span>
              <div>
                <h2>Critérios de Acompanhamento</h2>
                <p className="muted">Indicadores para observar avanços e necessidades de revisão.</p>
              </div>
            </div>
            <label htmlFor="criteriosAcompanhamento">Critérios e indicadores</label>
            <textarea
              id="criteriosAcompanhamento"
              rows="6"
              value={form.criteriosAcompanhamento}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, criteriosAcompanhamento: event.target.value }))
              }
            />
          </section>

          <section className="panel paee-card">
            <div className="paee-card-header">
              <span className="paee-card-index">9</span>
              <div>
                <h2>Encaminhamentos</h2>
                <p className="muted">Orientações, articulações e ações complementares.</p>
              </div>
            </div>
            <label htmlFor="encaminhamentos">Encaminhamentos e observações complementares</label>
            <textarea
              id="encaminhamentos"
              rows="6"
              value={form.encaminhamentos}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, encaminhamentos: event.target.value }))
              }
            />
          </section>

          <section className="panel paee-save-panel">
            <div>
              <h2>Salvar rascunho</h2>
              <p className="muted">
                {paeeId
                  ? "Este botão atualizará o mesmo documento salvo anteriormente."
                  : "O primeiro salvamento criará um documento na coleção paees."}
              </p>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleNovoPaee}
                disabled={salvando || concluindo}
              >
                Novo PAEE
              </button>
              <button type="submit" disabled={salvando || concluindo}>
                {salvando ? "Salvando..." : "Salvar rascunho do PAEE"}
              </button>
              <button
                type="button"
                className="paee-concluir-button"
                onClick={handleConcluirPaee}
                disabled={salvando || concluindo || form.statusGeral === "concluido"}
              >
                {concluindo ? "Concluindo..." : "Concluir PAEE"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleImprimirPaee}
                disabled={salvando || concluindo}
              >
                Imprimir PAEE
              </button>
            </div>
          </section>
          </form>
        </>
      )}

      <section className="paee-print-area" aria-label="PAEE para impressão">
        <header className="paee-print-header">
          <p className="paee-print-brand">AEE Registro</p>
          <h1>Plano de Atendimento Educacional Especializado — PAEE</h1>
          <div className="paee-print-summary">
            <p>
              <strong>Estudante:</strong>{" "}
              {obterValorImpressao(form.alunoNome || form.identificacaoEstudante.nome)}
            </p>
            <p>
              <strong>Ano letivo:</strong> {obterValorImpressao(form.anoLetivo)}
            </p>
            <p>
              <strong>Período:</strong> {obterValorImpressao(form.periodo)}
            </p>
            <p>
              <strong>Data de impressão:</strong> {formatarDataImpressao(obterDataAtualIsoLocal())}
            </p>
          </div>
        </header>

        <section className="paee-print-section">
          <h2>Dados gerais do plano</h2>
          <dl className="paee-print-grid">
            <div>
              <dt>Ano letivo</dt>
              <dd>{obterValorImpressao(form.anoLetivo)}</dd>
            </div>
            <div>
              <dt>Período</dt>
              <dd>{obterValorImpressao(form.periodo)}</dd>
            </div>
            <div>
              <dt>Data de início</dt>
              <dd>{formatarDataImpressao(form.dataInicio)}</dd>
            </div>
            <div>
              <dt>Data final prevista</dt>
              <dd>{formatarDataImpressao(form.dataFim)}</dd>
            </div>
            <div>
              <dt>Status geral</dt>
              <dd>{obterLabelStatus(form.statusGeral)}</dd>
            </div>
            <div>
              <dt>Responsável pelo preenchimento</dt>
              <dd>{obterValorImpressao(form.responsavel.nome)}</dd>
            </div>
            {form.dataConclusao ? (
              <div>
                <dt>Data de conclusão</dt>
                <dd>{formatarDataImpressao(form.dataConclusao)}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="paee-print-section">
          <h2>1. Identificação do estudante</h2>
          <dl className="paee-print-grid">
            <div className="paee-print-span-2">
              <dt>Nome do estudante</dt>
              <dd>{obterValorImpressao(form.identificacaoEstudante.nome || form.alunoNome)}</dd>
            </div>
            <div>
              <dt>Data de nascimento</dt>
              <dd>{formatarDataImpressao(form.identificacaoEstudante.dataNascimento)}</dd>
            </div>
            <div>
              <dt>Série/Ano</dt>
              <dd>{obterValorImpressao(form.identificacaoEstudante.serieAno)}</dd>
            </div>
            <div>
              <dt>Turma</dt>
              <dd>{obterValorImpressao(form.identificacaoEstudante.turma)}</dd>
            </div>
            <div>
              <dt>Turno</dt>
              <dd>{obterValorImpressao(form.identificacaoEstudante.turno)}</dd>
            </div>
            <div className="paee-print-span-2">
              <dt>Professor(a) do AEE</dt>
              <dd>{obterValorImpressao(form.identificacaoEstudante.professorAee)}</dd>
            </div>
            <div className="paee-print-span-2">
              <dt>Nome da escola</dt>
              <dd>{obterValorImpressao(form.identificacaoEstudante.nomeEscola)}</dd>
            </div>
            <div>
              <dt>Município</dt>
              <dd>{obterValorImpressao(form.identificacaoEstudante.municipio)}</dd>
            </div>
            <div>
              <dt>Localização</dt>
              <dd>{obterValorImpressao(form.identificacaoEstudante.localizacao)}</dd>
            </div>
          </dl>
        </section>

        <section className="paee-print-section">
          <h2>2. Base pedagógica do PAEE</h2>
          <div className="paee-print-content-block">
            <h3>Potencialidades do estudante</h3>
            <p>{obterValorImpressao(form.basePedagogica.potencialidades)}</p>
          </div>
          <div className="paee-print-content-block">
            <h3>Barreiras identificadas</h3>
            <p>{obterValorImpressao(form.basePedagogica.barreiras)}</p>
          </div>
          <div className="paee-print-content-block">
            <h3>Necessidades educacionais específicas</h3>
            <p>{obterValorImpressao(form.basePedagogica.necessidadesEspecificas)}</p>
          </div>
          <div className="paee-print-content-block">
            <h3>Resumo do Estudo de Caso que orienta este PAEE</h3>
            <p>{obterValorImpressao(form.basePedagogica.resumoEstudoCaso)}</p>
          </div>
        </section>

        <section className="paee-print-section">
          <h2>3. Síntese Diagnóstica</h2>
          <p>{obterValorImpressao(form.sinteseDiagnostica)}</p>
        </section>

        <section className="paee-print-section">
          <h2>4. Objetivos do Atendimento AEE</h2>
          {objetivosParaImpressao.length ? (
            objetivosParaImpressao.map((objetivo, indice) => (
              <article key={objetivo.id || indice} className="paee-print-objective">
                <h3>Objetivo {indice + 1}</h3>
                <dl className="paee-print-grid">
                  <div>
                    <dt>Área/Eixo</dt>
                    <dd>{obterValorImpressao(objetivo.areaEixo)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      {STATUS_OBJETIVO_OPTIONS.find((item) => item.value === objetivo.status)
                        ?.label || "Planejado"}
                    </dd>
                  </div>
                  <div className="paee-print-span-2">
                    <dt>Objetivo específico</dt>
                    <dd>{obterValorImpressao(objetivo.objetivoEspecifico)}</dd>
                  </div>
                  <div className="paee-print-span-2">
                    <dt>Estratégias</dt>
                    <dd>{obterValorImpressao(objetivo.estrategias)}</dd>
                  </div>
                  <div className="paee-print-span-2">
                    <dt>Recursos</dt>
                    <dd>{obterValorImpressao(objetivo.recursos)}</dd>
                  </div>
                  <div>
                    <dt>Prazo</dt>
                    <dd>{formatarDataImpressao(objetivo.prazo)}</dd>
                  </div>
                  <div>
                    <dt>Critério de acompanhamento</dt>
                    <dd>{obterValorImpressao(objetivo.criterioAcompanhamento)}</dd>
                  </div>
                </dl>
              </article>
            ))
          ) : (
            <p>Nenhum objetivo registrado.</p>
          )}
        </section>

        <section className="paee-print-section">
          <h2>5. Estratégias Pedagógicas</h2>
          <p>{obterValorImpressao(form.estrategiasPedagogicas)}</p>
        </section>

        <section className="paee-print-section">
          <h2>6. Recursos e Tecnologia Assistiva</h2>
          <p>{obterValorImpressao(form.recursosTecnologiaAssistiva)}</p>
        </section>

        <section className="paee-print-section">
          <h2>7. Organização do Atendimento</h2>
          <dl className="paee-print-grid">
            <div>
              <dt>Frequência do atendimento</dt>
              <dd>{obterValorImpressao(form.organizacaoAtendimento.frequencia)}</dd>
            </div>
            <div>
              <dt>Duração média</dt>
              <dd>{obterValorImpressao(form.organizacaoAtendimento.duracaoMedia)}</dd>
            </div>
            <div className="paee-print-span-2">
              <dt>Modalidade do atendimento</dt>
              <dd>{obterValorImpressao(form.organizacaoAtendimento.modalidade)}</dd>
            </div>
            <div className="paee-print-span-2">
              <dt>Articulação com sala comum e família</dt>
              <dd>
                {obterValorImpressao(
                  form.organizacaoAtendimento.articulacaoSalaComumFamilia,
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="paee-print-section">
          <h2>8. Critérios de Acompanhamento</h2>
          <p>{obterValorImpressao(form.criteriosAcompanhamento)}</p>
        </section>

        <section className="paee-print-section">
          <h2>9. Encaminhamentos</h2>
          <p>{obterValorImpressao(form.encaminhamentos)}</p>
        </section>

        <footer className="paee-print-footer">
          Documento preparado na Plataforma AEE Registro em{" "}
          {formatarDataImpressao(obterDataAtualIsoLocal())}.
        </footer>
      </section>
    </main>
  );
}

export default PAEEPage;
