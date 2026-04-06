import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { listarAlunos, listarAlunosPorIds } from "../services/alunosService";
import { listarMetasPorAlunoId } from "../services/metasService";
import {
  atualizarMonitoramento,
  criarMonitoramento,
  excluirMonitoramento,
  listarMonitoramentos,
} from "../services/monitoramentosService";
import { buscarIdsAlunosVinculados } from "../services/vinculacoesService";
import {
  podeEditarMonitoramentos,
  podeVisualizarMonitoramentos,
  visualizaSomenteVinculados,
} from "../utils/permissions";

const formInicial = {
  dataRegistro: "",
  responsavelRegistro: "",
  eixoObservado: "",
  observacao: "",
  avancos: "",
  dificuldades: "",
  intervencoes: "",
  encaminhamentos: "",
};

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

function normalizarEixo(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function MonitoramentosPage() {
  const { currentUser, perfil } = useAuth();
  const [alunos, setAlunos] = useState([]);
  const [alunoIdSelecionado, setAlunoIdSelecionado] = useState("");
  const [monitoramentos, setMonitoramentos] = useState([]);
  const [eixosDisponiveis, setEixosDisponiveis] = useState([]);
  const [form, setForm] = useState(formInicial);
  const [monitoramentoEmEdicao, setMonitoramentoEmEdicao] = useState(null);
  const [idsPermitidos, setIdsPermitidos] = useState(undefined);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingLista, setLoadingLista] = useState(false);
  const [loadingEixos, setLoadingEixos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState("");
  const [monitoramentoImpressaoId, setMonitoramentoImpressaoId] = useState("");

  const podeLer = podeVisualizarMonitoramentos(perfil);
  const podeEditar = podeEditarMonitoramentos(perfil);
  const somenteVinculados = visualizaSomenteVinculados(perfil);

  const alunoSelecionado = useMemo(
    () => alunos.find((item) => item.id === alunoIdSelecionado) || null,
    [alunos, alunoIdSelecionado]
  );

  const monitoramentosOrdenados = useMemo(() => {
    return [...monitoramentos].sort((a, b) => {
      const dataA = a.criadoEm?.toDate ? a.criadoEm.toDate().getTime() : 0;
      const dataB = b.criadoEm?.toDate ? b.criadoEm.toDate().getTime() : 0;
      return dataA - dataB;
    });
  }, [monitoramentos]);

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
      setErro(obterMensagemErro(error, "Não foi possível carregar os alunos."));
    } finally {
      setLoadingBase(false);
    }
  };

  const carregarMonitoramentos = async () => {
    if (!currentUser || !podeLer || !alunoIdSelecionado) {
      setMonitoramentos([]);
      return;
    }

    setLoadingLista(true);

    try {
      const data = await listarMonitoramentos({
        alunoId: alunoIdSelecionado,
        alunoIdsPermitidos: idsPermitidos,
      });
      setMonitoramentos(data);
      setErro("");
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível carregar os monitoramentos."));
    } finally {
      setLoadingLista(false);
    }
  };

  const carregarEixos = async () => {
    if (!alunoIdSelecionado) {
      setEixosDisponiveis([]);
      return;
    }

    setLoadingEixos(true);

    try {
      const metas = await listarMetasPorAlunoId({
        alunoId: alunoIdSelecionado,
        alunoIdsPermitidos: idsPermitidos,
      });

      const mapa = new Map();
      metas.forEach((item) => {
        const titulo = String(item?.titulo || "").trim();
        if (!titulo) return;
        const chave = normalizarEixo(titulo);
        if (!mapa.has(chave)) mapa.set(chave, titulo);
      });

      setEixosDisponiveis(Array.from(mapa.values()).sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível carregar os eixos das habilidades."));
      setEixosDisponiveis([]);
    } finally {
      setLoadingEixos(false);
    }
  };

  useEffect(() => {
    carregarBase();
  }, [currentUser, perfil]);

  useEffect(() => {
    carregarMonitoramentos();
  }, [currentUser, podeLer, alunoIdSelecionado, idsPermitidos]);

  useEffect(() => {
    carregarEixos();
  }, [alunoIdSelecionado, idsPermitidos]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      responsavelRegistro:
        prev.responsavelRegistro || currentUser?.displayName || currentUser?.email || "",
    }));
  }, [currentUser]);

  useEffect(() => {
    if (monitoramentoEmEdicao) return;
    if (!eixosDisponiveis.length) return;

    setForm((prev) => {
      if (prev.eixoObservado) return prev;
      return { ...prev, eixoObservado: eixosDisponiveis[0] };
    });
  }, [eixosDisponiveis, monitoramentoEmEdicao]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const limparFormulario = () => {
    setMonitoramentoEmEdicao(null);
    setForm({
      ...formInicial,
      responsavelRegistro: currentUser?.displayName || currentUser?.email || "",
      eixoObservado: eixosDisponiveis[0] || "",
    });
  };

  const handleSalvar = async (event) => {
    event.preventDefault();
    if (!podeEditar || !currentUser || !alunoSelecionado) return;

    setSalvando(true);
    setErro("");
    setFeedback("");

    const payload = {
      alunoId: alunoSelecionado.id,
      alunoNome: alunoSelecionado.nome || "",
      dataRegistro: form.dataRegistro,
      responsavelRegistro: form.responsavelRegistro.trim(),
      eixoObservado: form.eixoObservado.trim(),
      observacao: form.observacao.trim(),
      avancos: form.avancos.trim(),
      dificuldades: form.dificuldades.trim(),
      intervencoes: form.intervencoes.trim(),
      encaminhamentos: form.encaminhamentos.trim(),
    };

    try {
      if (monitoramentoEmEdicao) {
        await atualizarMonitoramento(monitoramentoEmEdicao.id, payload);
        setFeedback("Monitoramento atualizado com sucesso.");
      } else {
        await criarMonitoramento(payload, currentUser.uid);
        setFeedback("Monitoramento salvo com sucesso.");
      }

      limparFormulario();
      await carregarMonitoramentos();
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível salvar o monitoramento."));
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (monitoramento) => {
    if (!podeEditar) return;

    setMonitoramentoEmEdicao(monitoramento);
    setForm({
      dataRegistro: monitoramento.dataRegistro || "",
      responsavelRegistro: monitoramento.responsavelRegistro || "",
      eixoObservado: monitoramento.eixoObservado || "",
      observacao: monitoramento.observacao || "",
      avancos: monitoramento.avancos || "",
      dificuldades: monitoramento.dificuldades || "",
      intervencoes: monitoramento.intervencoes || "",
      encaminhamentos: monitoramento.encaminhamentos || "",
    });
  };

  const handleExcluir = async (monitoramento) => {
    if (!podeEditar) return;
    const confirma = window.confirm("Deseja excluir este monitoramento?");
    if (!confirma) return;

    try {
      await excluirMonitoramento(monitoramento.id);
      if (monitoramentoEmEdicao?.id === monitoramento.id) limparFormulario();
      setFeedback("Monitoramento excluído com sucesso.");
      await carregarMonitoramentos();
    } catch (error) {
      setErro(obterMensagemErro(error, "Não foi possível excluir o monitoramento."));
    }
  };

  const handleImprimir = (monitoramento) => {
    setMonitoramentoImpressaoId(monitoramento.id);
    setTimeout(() => {
      window.print();
      setTimeout(() => setMonitoramentoImpressaoId(""), 200);
    }, 100);
  };

  if (!podeLer) {
    return (
      <main className="alunos-page">
        <section className="panel">
          <h1>Monitoramento dos alunos</h1>
          <p>Seu perfil não possui permissão para acessar este módulo.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="alunos-page module-page">
      <header className="page-header">
        <h1>Monitoramento dos alunos</h1>
        <p>Acompanhe registros contínuos e evolução pedagógica dos estudantes.</p>
        <p className="muted">
          Orientação: Este monitoramento deve ser preenchido pelo(a) professor(a) do AEE, com
          base nas informações coletadas no acompanhamento do aluno, permitindo analisar avanços,
          dificuldades e intervenções ao longo do tempo.
        </p>
      </header>

      {feedback ? <p className="toast-success">{feedback}</p> : null}
      {erro ? <p className="toast-error">{erro}</p> : null}

      <div className="module-layout">
        {podeEditar ? (
          <section className="panel no-print module-form-panel">
            <h2>{monitoramentoEmEdicao ? "Editar monitoramento" : "Novo monitoramento"}</h2>
            <form className="aluno-form" onSubmit={handleSalvar}>
              <section className="form-section">
                <h3>Dados gerais</h3>
                <label htmlFor="alunoMonitoramento">Aluno</label>
                <select
                  id="alunoMonitoramento"
                  value={alunoIdSelecionado}
                  onChange={(event) => setAlunoIdSelecionado(event.target.value)}
                >
                  {alunos.map((aluno) => (
                    <option key={aluno.id} value={aluno.id}>
                      {aluno.nome}
                    </option>
                  ))}
                </select>

                <label htmlFor="dataRegistro">Data do registro</label>
                <input
                  id="dataRegistro"
                  name="dataRegistro"
                  type="date"
                  value={form.dataRegistro}
                  onChange={handleChange}
                  required
                />

                <label htmlFor="responsavelRegistro">Responsável pelo registro</label>
                <input
                  id="responsavelRegistro"
                  name="responsavelRegistro"
                  value={form.responsavelRegistro}
                  onChange={handleChange}
                  required
                />
              </section>

              <section className="form-section">
                <h3>Eixo observado</h3>
                {loadingEixos ? <p className="muted">Carregando eixos...</p> : null}

                {eixosDisponiveis.length > 0 ? (
                  <>
                    <label htmlFor="eixoObservado">Eixo temático</label>
                    <select
                      id="eixoObservado"
                      name="eixoObservado"
                      value={form.eixoObservado}
                      onChange={handleChange}
                    >
                      <option value="">Selecione</option>
                      {form.eixoObservado &&
                      !eixosDisponiveis.includes(form.eixoObservado) ? (
                        <option value={form.eixoObservado}>
                          {form.eixoObservado} (valor anterior)
                        </option>
                      ) : null}
                      {eixosDisponiveis.map((eixo) => (
                        <option key={eixo} value={eixo}>
                          {eixo}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <p className="muted">
                      Nenhuma habilidade cadastrada para este aluno. Informe o eixo manualmente.
                    </p>
                    <label htmlFor="eixoObservado">Eixo observado</label>
                    <input
                      id="eixoObservado"
                      name="eixoObservado"
                      value={form.eixoObservado}
                      onChange={handleChange}
                    />
                  </>
                )}
              </section>

              <section className="form-section">
                <h3>Registro pedagógico</h3>
                <label htmlFor="observacao">Observação</label>
                <textarea
                  id="observacao"
                  name="observacao"
                  rows={4}
                  value={form.observacao}
                  onChange={handleChange}
                  required
                />

                <label htmlFor="avancos">Avanços</label>
                <textarea
                  id="avancos"
                  name="avancos"
                  rows={3}
                  value={form.avancos}
                  onChange={handleChange}
                />

                <label htmlFor="dificuldades">Dificuldades</label>
                <textarea
                  id="dificuldades"
                  name="dificuldades"
                  rows={3}
                  value={form.dificuldades}
                  onChange={handleChange}
                />

                <label htmlFor="intervencoes">Intervenções</label>
                <textarea
                  id="intervencoes"
                  name="intervencoes"
                  rows={3}
                  value={form.intervencoes}
                  onChange={handleChange}
                />

                <label htmlFor="encaminhamentosMonitoramento">Encaminhamentos</label>
                <textarea
                  id="encaminhamentosMonitoramento"
                  name="encaminhamentos"
                  rows={3}
                  value={form.encaminhamentos}
                  onChange={handleChange}
                />
              </section>

              <div className="form-actions sticky-actions">
                <button type="submit" disabled={salvando}>
                  {salvando
                    ? "Salvando..."
                    : monitoramentoEmEdicao
                      ? "Atualizar monitoramento"
                      : "Salvar monitoramento"}
                </button>
                {monitoramentoEmEdicao ? (
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
            <p>Seu perfil pode visualizar monitoramentos sem permissão de edição.</p>
          </section>
        )}

        <section className="panel module-list-panel">
          <h2>Histórico cronológico</h2>
          {loadingBase || loadingLista ? <p>Carregando...</p> : null}
          {!loadingBase && !loadingLista && monitoramentosOrdenados.length === 0 ? (
            <p>Nenhum monitoramento registrado.</p>
          ) : null}

          {monitoramentosOrdenados
            .filter((item) =>
              monitoramentoImpressaoId ? item.id === monitoramentoImpressaoId : true
            )
            .map((monitoramento) => (
              <article key={monitoramento.id} className="meta-card">
                <p>
                  <strong>Aluno:</strong> {monitoramento.alunoNome || "-"}
                </p>
                <p>
                  <strong>Data:</strong> {monitoramento.dataRegistro || "-"}
                </p>
                <p>
                  <strong>Eixo observado:</strong> {monitoramento.eixoObservado || "-"}
                </p>
                <p className="report-text">
                  <strong>Observação:</strong> {monitoramento.observacao || "-"}
                </p>
                <p className="report-text">
                  <strong>Avanços:</strong> {monitoramento.avancos || "-"}
                </p>
                <p className="report-text">
                  <strong>Dificuldades:</strong> {monitoramento.dificuldades || "-"}
                </p>
                <p className="report-text">
                  <strong>Intervenções:</strong> {monitoramento.intervencoes || "-"}
                </p>
                <p className="report-text">
                  <strong>Encaminhamentos:</strong> {monitoramento.encaminhamentos || "-"}
                </p>
                <p className="muted">
                  Atualizado em: {formatarDataFlex(monitoramento.atualizadoEm || monitoramento.criadoEm)}
                </p>

                <div className="form-actions no-print">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleImprimir(monitoramento)}
                  >
                    Imprimir
                  </button>
                  {podeEditar ? (
                    <>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleEditar(monitoramento)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => handleExcluir(monitoramento)}
                      >
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

export default MonitoramentosPage;


