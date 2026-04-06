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

function SondagensPage() {
  const { currentUser, perfil } = useAuth();
  const [alunos, setAlunos] = useState([]);
  const [alunoIdSelecionado, setAlunoIdSelecionado] = useState("");
  const [sondagens, setSondagens] = useState([]);
  const [form, setForm] = useState(formInicial);
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
      encaminhamentos: form.encaminhamentos.trim(),
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
    });
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

  const renderSelectAvaliacao = (name, label) => {
    const valorAtual = form[name] || "";
    const valorNaoPadrao =
      valorAtual && !AVALIACAO_OPCOES.includes(valorAtual) ? valorAtual : "";

    return (
      <div key={name}>
        <label htmlFor={name}>{label}</label>
        <select id={name} name={name} value={valorAtual} onChange={handleChange}>
          <option value="">Selecione</option>
          {valorNaoPadrao ? (
            <option value={valorNaoPadrao}>{valorNaoPadrao} (valor anterior)</option>
          ) : null}
          {AVALIACAO_OPCOES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
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
              <section className="form-section">
                <h3>Dados gerais</h3>
                <label htmlFor="alunoId">Aluno</label>
                <select id="alunoId" name="alunoId" value={form.alunoId} onChange={handleChange}>
                  {alunos.map((aluno) => (
                    <option key={aluno.id} value={aluno.id}>
                      {aluno.nome}
                    </option>
                  ))}
                </select>

                <label htmlFor="dataNascimento">Data de nascimento</label>
                <input
                  id="dataNascimento"
                  name="dataNascimento"
                  type="date"
                  value={form.dataNascimento}
                  readOnly
                />

                <label htmlFor="dataSondagem">Data da sondagem</label>
                <input
                  id="dataSondagem"
                  name="dataSondagem"
                  type="date"
                  value={form.dataSondagem}
                  onChange={handleChange}
                  required
                />

                <label htmlFor="periodo">Bimestre/período</label>
                <input id="periodo" name="periodo" value={form.periodo} onChange={handleChange} />

                <label htmlFor="responsavelAplicacao">Responsável pela aplicação</label>
                <input
                  id="responsavelAplicacao"
                  name="responsavelAplicacao"
                  value={form.responsavelAplicacao}
                  onChange={handleChange}
                />
              </section>

              <section className="form-section">
                <h3>Linguagem e comunicação</h3>
                {renderSelectAvaliacao("leitura", "Leitura")}
                {renderSelectAvaliacao("escrita", "Escrita")}
                {renderSelectAvaliacao("comunicacao", "Comunicação")}
              </section>

              <section className="form-section">
                <h3>Desenvolvimento cognitivo e acadêmico</h3>
                {renderSelectAvaliacao("matematica", "Matemática")}
                {renderSelectAvaliacao("atencaoConcentracao", "Atenção e concentração")}
              </section>

              <section className="form-section">
                <h3>Desenvolvimento socioemocional</h3>
                {renderSelectAvaliacao("interacaoSocial", "Interação social")}
                {renderSelectAvaliacao("autonomia", "Autonomia")}
                {renderSelectAvaliacao("comportamento", "Comportamento")}
              </section>

              <section className="form-section">
                <h3>Desenvolvimento motor</h3>
                {renderSelectAvaliacao("coordenacaoMotora", "Coordenação motora")}
              </section>

              <section className="form-section">
                <h3>Registro complementar</h3>
                <label htmlFor="observacoes">Observações</label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  rows={4}
                  value={form.observacoes}
                  onChange={handleChange}
                />

                <label htmlFor="encaminhamentos">Encaminhamentos</label>
                <textarea
                  id="encaminhamentos"
                  name="encaminhamentos"
                  rows={4}
                  value={form.encaminhamentos}
                  onChange={handleChange}
                />
              </section>

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


