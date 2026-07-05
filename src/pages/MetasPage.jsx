import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { listarAlunos, listarAlunosPorIds } from "../services/alunosService";
import {
  atualizarMeta,
  criarMeta,
  excluirMeta,
  listarMetas,
  listarMetasPorAlunoId,
} from "../services/metasService";
import { listarSondagens } from "../services/sondagensService";
import {
  gerarSugestoesHabilidadesDaSondagem,
  normalizarTituloMetaParaComparacao,
  obterNumeroBimestre,
  selecionarSondagemMaisRecentePorBimestre,
} from "../utils/sondagemParaHabilidades";
import { buscarIdsAlunosVinculados } from "../services/vinculacoesService";
import {
  podeCriarEditarMetas,
  podeVisualizarMetas,
  visualizaSomenteVinculados,
} from "../utils/permissions";

const BIMESTRES = ["1º", "2º", "3º", "4º"];
const STATUS_META = ["Em andamento", "Concluída", "Pausada"];

const formInicial = {
  alunoId: "",
  titulo: "",
  descricao: "",
  bimestre: "1º",
  status: "Em andamento",
};

function formatarData(createdAt) {
  if (!createdAt?.toDate) return "-";
  return createdAt.toDate().toLocaleDateString("pt-BR");
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function chaveMeta(meta) {
  return [
    normalizarTexto(meta?.alunoId),
    normalizarTexto(meta?.bimestre),
    normalizarTituloMetaParaComparacao(meta?.titulo),
    normalizarTexto(meta?.descricao),
  ].join("|");
}

function extrairHabilidadesDigitadas(texto) {
  return String(texto || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function obterMensagemErro(error, fallback) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");

  if (code.includes("permission-denied")) {
    return "Acesso negado para carregar habilidades.";
  }
  if (code.includes("failed-precondition")) {
    return "A consulta de habilidades exige índice no Firestore.";
  }
  if (message) return `${fallback} (${message})`;
  return fallback;
}

function MetasPage() {
  const { currentUser, perfil } = useAuth();
  const [alunos, setAlunos] = useState([]);
  const [metas, setMetas] = useState([]);
  const [filtroAlunoId, setFiltroAlunoId] = useState("");
  const [filtroBimestre, setFiltroBimestre] = useState("");
  const [form, setForm] = useState(formInicial);
  const [metaEmEdicao, setMetaEmEdicao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerandoSugestoes, setGerandoSugestoes] = useState(false);
  const [salvandoSugestoes, setSalvandoSugestoes] = useState(false);
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sugestoesGeradas, setSugestoesGeradas] = useState([]);
  const [duplicadasGeradas, setDuplicadasGeradas] = useState([]);
  const [idsSugestoesSelecionadas, setIdsSugestoesSelecionadas] = useState([]);
  const [outrasHabilidadesPorEixo, setOutrasHabilidadesPorEixo] = useState({});
  const [resumoSondagemGerada, setResumoSondagemGerada] = useState(null);
  const [resultadoGeracao, setResultadoGeracao] = useState(null);
  const ultimaBuscaRef = useRef(0);

  const podeEditar = podeCriarEditarMetas(perfil);
  const podeLer = podeVisualizarMetas(perfil);
  const somenteVinculados = visualizaSomenteVinculados(perfil);

  const alunosPorId = useMemo(
    () =>
      alunos.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [alunos]
  );

  const metasAgrupadasPorBimestre = useMemo(() => {
    const grupos = { "1º": [], "2º": [], "3º": [], "4º": [] };
    metas.forEach((meta) => {
      const chave = BIMESTRES.includes(meta.bimestre) ? meta.bimestre : "1º";
      grupos[chave].push(meta);
    });
    return grupos;
  }, [metas]);

  const sugestoesAgrupadasPorEixo = useMemo(() => {
    return sugestoesGeradas.reduce((acc, item) => {
      const eixo = item.titulo || "Eixo não identificado";
      if (!acc[eixo]) acc[eixo] = [];
      acc[eixo].push(item);
      return acc;
    }, {});
  }, [sugestoesGeradas]);

  const carregarDados = async () => {
    if (!currentUser || !podeLer) {
      setMetas([]);
      return;
    }

    const idBuscaAtual = ++ultimaBuscaRef.current;
    const alunoFiltroAtual = filtroAlunoId || undefined;
    const bimestreFiltroAtual = filtroBimestre || undefined;

    setLoading(true);
    setErro("");
    setMetas([]);

    try {
      let idsPermitidos = [];

      if (somenteVinculados) {
        idsPermitidos = await buscarIdsAlunosVinculados(currentUser.uid);
      }

      const alunosData = somenteVinculados
        ? await listarAlunosPorIds(idsPermitidos)
        : await listarAlunos();

      if (idBuscaAtual !== ultimaBuscaRef.current) return;
      setAlunos(alunosData);

      const metasData = await listarMetas({
        alunoIds: somenteVinculados ? idsPermitidos : undefined,
        alunoId: alunoFiltroAtual,
        bimestre: bimestreFiltroAtual,
      });

      if (idBuscaAtual !== ultimaBuscaRef.current) return;

      const metasFiltradas = metasData.filter((meta) => {
        const correspondeAluno = !alunoFiltroAtual || meta.alunoId === alunoFiltroAtual;
        const correspondeBimestre = !bimestreFiltroAtual || meta.bimestre === bimestreFiltroAtual;
        return correspondeAluno && correspondeBimestre;
      });

      setMetas(metasFiltradas);
    } catch (err) {
      if (idBuscaAtual !== ultimaBuscaRef.current) return;
      console.error("[MetasPage] Erro ao carregar habilidades", {
        erro: err,
        filtroAlunoId: alunoFiltroAtual || null,
        filtroBimestre: bimestreFiltroAtual || null,
      });
      setErro(obterMensagemErro(err, "Não foi possível carregar as habilidades"));
    } finally {
      if (idBuscaAtual !== ultimaBuscaRef.current) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [currentUser, podeLer, somenteVinculados, filtroAlunoId, filtroBimestre]);

  const limparFormulario = () => {
    setForm(formInicial);
    setMetaEmEdicao(null);
    setSugestoesGeradas([]);
    setDuplicadasGeradas([]);
    setIdsSugestoesSelecionadas([]);
    setOutrasHabilidadesPorEixo({});
    setResumoSondagemGerada(null);
    setResultadoGeracao(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeFiltroAluno = (alunoId) => {
    setFiltroAlunoId(alunoId);
    setSugestoesGeradas([]);
    setDuplicadasGeradas([]);
    setIdsSugestoesSelecionadas([]);
    setOutrasHabilidadesPorEixo({});
    setResumoSondagemGerada(null);
    setResultadoGeracao(null);
    setForm((prev) => ({
      ...prev,
      alunoId,
    }));
  };

  const handleSalvarMeta = async (event) => {
    event.preventDefault();
    if (!podeEditar || !currentUser) return;

    setSalvando(true);
    setErro("");
    setFeedback("");

    const alunoSelecionado = alunos.find((item) => item.id === form.alunoId);
    if (!alunoSelecionado) {
      setErro("Selecione um aluno válido para salvar a habilidade.");
      setSalvando(false);
      return;
    }

    const payload = {
      alunoId: alunoSelecionado.id,
      alunoNome: alunoSelecionado.nome || "",
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      bimestre: form.bimestre,
      status: form.status,
      responsavelId: currentUser.uid,
      responsavelNome: currentUser.displayName || currentUser.email || "Usuário",
    };

    try {
      if (metaEmEdicao) {
        await atualizarMeta(metaEmEdicao.id, payload);
        setFeedback("Habilidade atualizada com sucesso.");
      } else {
        await criarMeta(payload);
        setFeedback("Habilidade criada com sucesso.");
      }

      limparFormulario();
      await carregarDados();
    } catch (err) {
      console.error("[MetasPage] Erro ao salvar habilidade", err);
      setErro("Não foi possível salvar a habilidade.");
    } finally {
      setSalvando(false);
    }
  };

  const handleGerarPorSondagem = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!podeEditar || !currentUser) return;

    const alunoAlvoGeracao = String(form.alunoId || filtroAlunoId || "").trim();
    const bimestreSelecionado = String(form.bimestre || "").trim();

    if (!alunoAlvoGeracao) {
      setErro("Selecione um aluno para gerar habilidades.");
      return;
    }

    setGerandoSugestoes(true);
    setErro("");
    setFeedback("");
    setResultadoGeracao({
      tipo: "executando",
      mensagem: "Função executada. Processando geração...",
      funcaoExecutada: true,
      sondagemEncontrada: false,
      totalSugestoes: 0,
      totalDuplicadas: 0,
    });

    try {
      const [sondagensAluno, metasAluno] = await Promise.all([
        listarSondagens({ alunoId: alunoAlvoGeracao, alunoIdsPermitidos: undefined }),
        listarMetasPorAlunoId({ alunoId: alunoAlvoGeracao, alunoIdsPermitidos: undefined }),
      ]);

      const sondagemBase = selecionarSondagemMaisRecentePorBimestre(
        sondagensAluno,
        bimestreSelecionado
      );

      if (!sondagemBase) {
        setSugestoesGeradas([]);
        setDuplicadasGeradas([]);
        setIdsSugestoesSelecionadas([]);
        setOutrasHabilidadesPorEixo({});
        setResumoSondagemGerada(null);

        const mensagem = `Nenhuma sondagem encontrada para o ${bimestreSelecionado} bimestre deste aluno.`;
        setResultadoGeracao({
          tipo: "sem-sondagem",
          mensagem,
          funcaoExecutada: true,
          sondagemEncontrada: false,
          totalSugestoes: 0,
          totalDuplicadas: 0,
        });
        setFeedback(mensagem);
        return;
      }

      const sugestoes = gerarSugestoesHabilidadesDaSondagem(sondagemBase).flatMap(
        (item, eixoIndex) => {
          const habilidadesDoEixo =
            Array.isArray(item.sugestoes) && item.sugestoes.length
              ? item.sugestoes
              : [item.descricao];

          return habilidadesDoEixo.map((habilidade, habilidadeIndex) => ({
            id: `${eixoIndex + 1}-${normalizarTexto(item.eixo)}-${habilidadeIndex + 1}`,
            alunoId: alunoAlvoGeracao,
            bimestre: bimestreSelecionado,
            titulo: item.eixo,
            descricao: habilidade,
            evidencias: item.evidencias,
          }));
        }
      );

      if (!sugestoes.length) {
        const mensagem = "Nenhuma sugestão encontrada para esta sondagem.";

        setSugestoesGeradas([]);
        setDuplicadasGeradas([]);
        setIdsSugestoesSelecionadas([]);
        setOutrasHabilidadesPorEixo({});
        setResumoSondagemGerada({
          periodo: sondagemBase?.periodo || "-",
          data: sondagemBase?.dataSondagem || "-",
        });
        setResultadoGeracao({
          tipo: "sem-sugestoes",
          mensagem,
          funcaoExecutada: true,
          sondagemEncontrada: true,
          totalSugestoes: 0,
          totalDuplicadas: 0,
        });
        setFeedback(mensagem);
        return;
      }

      const chavesExistentes = new Set(
        metasAluno
          .filter(
            (meta) =>
              obterNumeroBimestre(meta?.bimestre) === obterNumeroBimestre(bimestreSelecionado)
          )
          .map((meta) => chaveMeta(meta))
      );

      const novasSugestoes = [];
      const duplicadas = [];

      sugestoes.forEach((item) => {
        const chave = chaveMeta(item);
        if (chavesExistentes.has(chave)) {
          duplicadas.push(item);
          return;
        }
        novasSugestoes.push(item);
      });

      setSugestoesGeradas(novasSugestoes);
      setDuplicadasGeradas(duplicadas);
      setIdsSugestoesSelecionadas(novasSugestoes.map((item) => item.id));
      setOutrasHabilidadesPorEixo({});
      setResumoSondagemGerada({
        periodo: sondagemBase?.periodo || "-",
        data: sondagemBase?.dataSondagem || "-",
      });

      if (novasSugestoes.length > 0) {
        const primeira = novasSugestoes[0];
        setForm((prev) => ({
          ...prev,
          alunoId: alunoAlvoGeracao,
          bimestre: bimestreSelecionado,
          titulo: primeira.titulo,
          descricao: primeira.descricao,
        }));
      }

      const partesFeedback = [];
      if (novasSugestoes.length) {
        partesFeedback.push(`${novasSugestoes.length} sugestão(ões) gerada(s)`);
      }
      if (duplicadas.length) {
        partesFeedback.push(`${duplicadas.length} habilidade(s) já existe(m) neste bimestre`);
      }
      if (!novasSugestoes.length && duplicadas.length) {
        partesFeedback.push("Nenhuma sugestão nova para salvar");
      }

      const mensagemFinal = partesFeedback.length
        ? `${partesFeedback.join(". ")}.`
        : "Nenhuma sugestão encontrada para esta sondagem.";

      setResultadoGeracao({
        tipo: "com-resultado",
        mensagem: mensagemFinal,
        funcaoExecutada: true,
        sondagemEncontrada: true,
        totalSugestoes: novasSugestoes.length,
        totalDuplicadas: duplicadas.length,
      });
      setFeedback(
        novasSugestoes.length > 0 ? "Habilidades geradas com sucesso" : mensagemFinal
      );
    } catch (err) {
      console.error("[MetasPage] Erro ao gerar habilidades da sondagem", {
        erro: err,
        alunoId: form.alunoId,
        bimestre: form.bimestre,
      });
      const mensagemErro = err?.message
        ? `Não foi possível gerar habilidades a partir da sondagem. (${err.message})`
        : "Não foi possível gerar habilidades a partir da sondagem.";

      setErro(mensagemErro);
      setResultadoGeracao({
        tipo: "erro",
        mensagem: mensagemErro,
        funcaoExecutada: true,
        sondagemEncontrada: false,
        totalSugestoes: 0,
        totalDuplicadas: 0,
      });
    } finally {
      setGerandoSugestoes(false);
    }
  };

  const handleAlternarSugestao = (sugestaoId) => {
    setIdsSugestoesSelecionadas((prev) =>
      prev.includes(sugestaoId)
        ? prev.filter((item) => item !== sugestaoId)
        : [...prev, sugestaoId]
    );
  };

  const handleSalvarSugestoes = async () => {
    if (!podeEditar || !currentUser) return;

    const selecionadas = sugestoesGeradas.filter((item) =>
      idsSugestoesSelecionadas.includes(item.id)
    );

    const adicionaisManuais = Object.entries(outrasHabilidadesPorEixo).flatMap(
      ([eixo, texto]) =>
        extrairHabilidadesDigitadas(texto).map((descricao, index) => ({
          id: `manual-${normalizarTexto(eixo)}-${index + 1}-${normalizarTexto(descricao).slice(0, 40)}`,
          alunoId: form.alunoId,
          bimestre: form.bimestre,
          titulo: eixo,
          descricao,
          evidencias: [],
        }))
    );

    const candidatas = [...selecionadas, ...adicionaisManuais];

    if (!candidatas.length) {
      setErro("Selecione sugestões e/ou preencha outras habilidades para salvar.");
      return;
    }

    setSalvandoSugestoes(true);
    setErro("");
    setFeedback("");

    try {
      const metasAlunoAtual = await listarMetasPorAlunoId({
        alunoId: form.alunoId,
        alunoIdsPermitidos: undefined,
      });

      const chavesExistentes = new Set(
        metasAlunoAtual
          .filter(
            (meta) =>
              obterNumeroBimestre(meta?.bimestre) === obterNumeroBimestre(form.bimestre)
          )
          .map((meta) => chaveMeta(meta))
      );

      const paraSalvar = [];
      const jaExistentes = [];

      candidatas.forEach((item) => {
        const chave = chaveMeta(item);
        if (chavesExistentes.has(chave)) {
          jaExistentes.push(item);
          return;
        }
        paraSalvar.push(item);
        chavesExistentes.add(chave);
      });

      for (const item of paraSalvar) {
        await criarMeta({
          alunoId: item.alunoId,
          alunoNome: alunosPorId[item.alunoId]?.nome || "",
          titulo: item.titulo,
          descricao: item.descricao,
          bimestre: item.bimestre,
          status: "Em andamento",
          responsavelId: currentUser.uid,
          responsavelNome: currentUser.displayName || currentUser.email || "Usuário",
        });
      }

      await carregarDados();

      const idsSalvos = new Set(paraSalvar.map((item) => item.id));
      setSugestoesGeradas((prev) => prev.filter((item) => !idsSalvos.has(item.id)));
      setIdsSugestoesSelecionadas((prev) => prev.filter((id) => !idsSalvos.has(id)));
      setOutrasHabilidadesPorEixo({});

      if (!paraSalvar.length) {
        setFeedback(
          "Nenhuma nova habilidade foi salva: todas as selecionadas já existem no mesmo bimestre."
        );
      } else if (jaExistentes.length) {
        setFeedback(
          `${paraSalvar.length} habilidade(s) salva(s). ${jaExistentes.length} já existia(m) e foi(foram) ignorada(s).`
        );
      } else {
        setFeedback(`${paraSalvar.length} habilidade(s) salva(s) com sucesso.`);
      }
    } catch (err) {
      console.error("[MetasPage] Erro ao salvar sugestões", err);
      setErro("Não foi possível salvar as habilidades sugeridas.");
    } finally {
      setSalvandoSugestoes(false);
    }
  };

  const iniciarEdicao = (meta) => {
    if (!podeEditar) return;

    setMetaEmEdicao(meta);
    setForm({
      alunoId: meta.alunoId || "",
      titulo: meta.titulo || "",
      descricao: meta.descricao || "",
      bimestre: meta.bimestre || "1º",
      status: meta.status || "Em andamento",
    });
  };

  const atualizarStatus = async (meta, status) => {
    if (!podeEditar) return;
    setErro("");

    try {
      await atualizarMeta(meta.id, { status });
      await carregarDados();
    } catch (err) {
      console.error("[MetasPage] Erro ao atualizar status", err);
      setErro("Não foi possível atualizar o status da habilidade.");
    }
  };

  const handleExcluirMeta = async (meta) => {
    if (!podeEditar || !meta?.id) return;

    const confirmaExclusao = window.confirm("Deseja excluir esta habilidade?");
    if (!confirmaExclusao) return;

    setErro("");
    setFeedback("");

    try {
      await excluirMeta(meta.id);
      if (metaEmEdicao?.id === meta.id) {
        limparFormulario();
      }
      setFeedback("Habilidade excluída com sucesso.");
      await carregarDados();
    } catch (err) {
      console.error("[MetasPage] Erro ao excluir habilidade", err);
      setErro("Não foi possível excluir a habilidade.");
    }
  };

  if (!podeLer) {
    return (
      <main className="alunos-page">
        <section className="panel">
          <h1>Habilidades</h1>
          <p>Seu perfil não possui permissão para visualizar habilidades.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="alunos-page metas-page">
      <header className="page-header">
        <h1>Habilidades pedagógicas</h1>
        <p>Acompanhamento por aluno com organização por bimestre.</p>
        <p className="muted">
          Orientação: O(a) professor(a) do AEE é responsável por definir e acompanhar as
          habilidades pedagógicas dos alunos, organizadas por eixos temáticos e bimestres. Este
          módulo orienta o planejamento das intervenções pedagógicas e subsidia o acompanhamento,
          o monitoramento e a elaboração dos relatórios.
        </p>
      </header>

      {feedback ? <p className="toast-success">{feedback}</p> : null}
      {erro ? <p className="toast-error">{erro}</p> : null}

      <section className="panel filtros-panel">
        <h2>Filtros</h2>
        <div className="filters-grid">
          <div>
            <label htmlFor="filtroAluno">Aluno</label>
            <select
              id="filtroAluno"
              value={filtroAlunoId}
              onChange={(event) => handleChangeFiltroAluno(event.target.value)}
            >
              <option value="">Todos</option>
              {alunos.map((aluno) => (
                <option key={aluno.id} value={aluno.id}>
                  {aluno.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtroBimestre">Bimestre</label>
            <select
              id="filtroBimestre"
              value={filtroBimestre}
              onChange={(event) => setFiltroBimestre(event.target.value)}
            >
              <option value="">Todos</option>
              {BIMESTRES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="metas-layout">
        {podeEditar ? (
          <section className="panel metas-form-panel">
            <h2>{metaEmEdicao ? "Editar habilidade" : "Nova habilidade"}</h2>

            <section className="form-section">
              <h3>Geração automática pela sondagem</h3>
              <p className="muted">
                Ao clicar em <strong>Gerar habilidades a partir da sondagem</strong>, o sistema
                apenas monta sugestões. O salvamento acontece somente ao clicar em
                <strong> Salvar habilidades selecionadas</strong>.
              </p>
              <div className="form-actions">
                <button
                  type="button"
                  formNoValidate
                  className="btn-secondary"
                  onClick={handleGerarPorSondagem}
                  disabled={gerandoSugestoes || salvandoSugestoes}
                >
                  {gerandoSugestoes
                    ? "Gerando..."
                    : "Gerar habilidades a partir da sondagem"}
                </button>
              </div>

              {resultadoGeracao ? (
                <article className="meta-card">
                  <p>
                    <strong>Função executada:</strong>{" "}
                    {resultadoGeracao.funcaoExecutada ? "Sim" : "Não"}
                  </p>
                  <p>
                    <strong>Sondagem encontrada:</strong>{" "}
                    {resultadoGeracao.sondagemEncontrada ? "Sim" : "Não"}
                  </p>
                  <p>
                    <strong>Resultado:</strong> {resultadoGeracao.mensagem}
                  </p>
                  <p className="muted">
                    {resultadoGeracao.totalSugestoes > 0
                      ? `${resultadoGeracao.totalSugestoes} sugestões geradas`
                      : "Nenhuma sugestão gerada"}
                    {" | "}Habilidades já existentes neste bimestre: {resultadoGeracao.totalDuplicadas}
                  </p>
                </article>
              ) : null}
            </section>

            <form className="aluno-form" onSubmit={handleSalvarMeta}>
              <label htmlFor="alunoId">Aluno</label>
              <select id="alunoId" name="alunoId" value={form.alunoId} onChange={handleChange} required>
                <option value="">Selecione</option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome}
                  </option>
                ))}
              </select>

              <label htmlFor="titulo">Eixo temático</label>
              <textarea
                id="titulo"
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                rows={3}
                className="eixo-tematico-input"
                placeholder="Ex.: Comunicação oral, atenção e concentração, autonomia."
                required
              />
              <p className="muted">
                Registre apenas o eixo temático mais prioritário para o aluno. Você pode escrever
                manualmente, mesmo sem usar as sugestões automáticas.
              </p>
              <label htmlFor="descricao">Habilidades do eixo temático</label>
              <textarea
                id="descricao"
                name="descricao"
                value={form.descricao}
                onChange={handleChange}
                rows={4}
                placeholder="Digite uma habilidade por linha."
                required
              />
              <p className="muted">
                Descreva as habilidades prioritárias do aluno neste eixo. Use somente o que
                considerar mais relevante pedagogicamente.
              </p>

              <label htmlFor="bimestre">Bimestre</label>
              <select
                id="bimestre"
                name="bimestre"
                value={form.bimestre}
                onChange={handleChange}
                required
              >
                {BIMESTRES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={form.status} onChange={handleChange} required>
                {STATUS_META.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <div className="form-actions">
                <button type="submit" disabled={salvando || salvandoSugestoes}>
                  {salvando ? "Salvando..." : metaEmEdicao ? "Salvar edição" : "Criar habilidade"}
                </button>
                {metaEmEdicao ? (
                  <button type="button" className="btn-secondary" onClick={limparFormulario}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>

            {resumoSondagemGerada ? (
              <section className="form-section">
                <h3>Resumo da sondagem utilizada</h3>
                <p className="muted">
                  Período: {resumoSondagemGerada.periodo || "-"} | Data: {resumoSondagemGerada.data || "-"}
                </p>
              </section>
            ) : null}
          </section>
        ) : (
          <section className="panel metas-form-panel">
            <h2>Acesso de leitura</h2>
            <p>
              Seu perfil pode visualizar habilidades dos alunos vinculados por bimestre, sem
              permissão para criar ou editar.
            </p>
          </section>
        )}

        <section className="panel metas-list-panel">
          <h2>Habilidades por bimestre</h2>
          {loading ? <p>Carregando habilidades...</p> : null}

          {!loading &&
            BIMESTRES.map((bimestre) => (
              <div key={bimestre} className="bimestre-group">
                <h3>{bimestre} Bimestre</h3>
                {metasAgrupadasPorBimestre[bimestre].length === 0 ? (
                  <p className="muted">Nenhuma habilidade neste bimestre.</p>
                ) : (
                  metasAgrupadasPorBimestre[bimestre].map((meta) => (
                    <article key={meta.id} className="meta-card">
                      <header className="meta-card-header">
                        <strong>{meta.titulo}</strong>
                        <span className="badge">{meta.status}</span>
                      </header>
                      <p className="muted">
                        Aluno: {alunosPorId[meta.alunoId]?.nome || meta.alunoNome || "Não identificado"}
                      </p>
                      <p>{meta.descricao}</p>
                      <p className="muted">
                        Responsável: {meta.responsavelNome || "-"} | Bimestre: {meta.bimestre || "-"} |
                        Criada em: {formatarData(meta.createdAt)}
                      </p>

                      {podeEditar ? (
                        <div className="form-actions">
                          <button type="button" className="btn-secondary" onClick={() => iniciarEdicao(meta)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => atualizarStatus(meta, "Pausada")}
                          >
                            Pausar
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => atualizarStatus(meta, "Concluída")}
                          >
                            Concluir
                          </button>
                          <button
                            type="button"
                            className="btn-danger"
                            onClick={() => handleExcluirMeta(meta)}
                          >
                            Excluir
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
          ))}
        </section>
      </div>

      {sugestoesGeradas.length || duplicadasGeradas.length ? (
        <section className="panel metas-sugestoes-panel">
          {sugestoesGeradas.length ? (
            <section className="form-section metas-sugestoes-section">
              <div className="metas-sugestoes-header">
                <h3>Sugestões geradas</h3>
                <p className="muted">
                  Revise as sugestões com mais conforto visual, marque somente as prioridades e
                  complemente com outras habilidades quando necessário.
                </p>
              </div>

              <div className="metas-sugestoes-grid">
                {Object.entries(sugestoesAgrupadasPorEixo).map(([eixo, sugestoesDoEixo]) => (
                  <article
                    key={`eixo-${normalizarTexto(eixo)}`}
                    className="meta-card metas-sugestao-card"
                  >
                    <p>
                      <strong>Eixo temático:</strong> {eixo}
                    </p>

                    <p className="muted metas-sugestao-evidencias">
                      Evidências da sondagem:{" "}
                      {(sugestoesDoEixo[0]?.evidencias || [])
                        .map((evidencia) => `${evidencia.campo} (${evidencia.resultado || "-"})`)
                        .join("; ")}
                    </p>

                    <div className="metas-sugestao-lista">
                      {sugestoesDoEixo.map((item) => (
                        <label
                          key={item.id}
                          className="checkbox-item metas-sugestao-checkbox"
                        >
                          <input
                            type="checkbox"
                            checked={idsSugestoesSelecionadas.includes(item.id)}
                            onChange={() => handleAlternarSugestao(item.id)}
                          />
                          <span>{item.descricao}</span>
                        </label>
                      ))}
                    </div>

                    <label htmlFor={`outras-${normalizarTexto(eixo)}`}>
                      Outras habilidades para este eixo
                    </label>
                    <textarea
                      id={`outras-${normalizarTexto(eixo)}`}
                      rows={3}
                      placeholder="Digite outras habilidades (uma por linha)."
                      value={outrasHabilidadesPorEixo[eixo] || ""}
                      onChange={(event) =>
                        setOutrasHabilidadesPorEixo((prev) => ({
                          ...prev,
                          [eixo]: event.target.value,
                        }))
                      }
                    />
                  </article>
                ))}
              </div>

              <div className="form-actions metas-sugestoes-actions">
                <button type="button" onClick={handleSalvarSugestoes} disabled={salvandoSugestoes}>
                  {salvandoSugestoes
                    ? "Salvando sugestões..."
                    : "Salvar habilidades selecionadas"}
                </button>
              </div>
            </section>
          ) : null}

          {duplicadasGeradas.length ? (
            <section className="form-section metas-duplicadas-section">
              <h3>Habilidades já existentes no bimestre</h3>
              <div className="metas-duplicadas-lista">
                {duplicadasGeradas.map((item) => (
                  <p key={`duplicada-${item.id}`} className="muted">
                    {item.titulo}
                  </p>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

export default MetasPage;

