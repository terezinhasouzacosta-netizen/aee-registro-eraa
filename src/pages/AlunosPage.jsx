import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AlunoForm from "../components/AlunoForm";
import AlunosList from "../components/AlunosList";
import { useAuth } from "../hooks/useAuth";
import {
  atualizarAluno,
  criarAluno,
  excluirAluno,
  listarAlunos,
  listarAlunosPorIds,
} from "../services/alunosService";
import { buscarIdsAlunosVinculados } from "../services/vinculacoesService";
import {
  podeCadastrarEditarAlunos,
  visualizaSomenteVinculados,
} from "../utils/permissions";

function AlunosPage() {
  const [alunos, setAlunos] = useState([]);
  const [alunoEmEdicao, setAlunoEmEdicao] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingForm, setLoadingForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [erro, setErro] = useState("");
  const { currentUser, perfil } = useAuth();
  const location = useLocation();
  const podeEditar = podeCadastrarEditarAlunos(perfil);
  const somenteVinculados = visualizaSomenteVinculados(perfil);

  console.log("[AlunosPage] checagem de acesso", {
    rotaAtual: location.pathname,
    perfilAtual: perfil,
    condicaoPodeEditar: "podeCadastrarEditarAlunos(perfil)",
    resultadoPodeEditar: podeEditar,
    condicaoSomenteVinculados: "visualizaSomenteVinculados(perfil)",
    resultadoSomenteVinculados: somenteVinculados,
  });

  const carregarAlunos = async () => {
    if (!currentUser) return;

    setLoadingList(true);
    setErro("");

    try {
      let data = [];

      if (somenteVinculados) {
        const alunoIds = await buscarIdsAlunosVinculados(currentUser.uid);
        data = await listarAlunosPorIds(alunoIds);
      } else {
        data = await listarAlunos();
      }

      setAlunos(data);
    } catch (err) {
      setErro("Não foi possível carregar os alunos.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    carregarAlunos();
  }, [currentUser, perfil]);

  const handleSubmit = async (payload) => {
    if (!podeEditar) return;

    setLoadingForm(true);
    setErro("");
    setFeedback("");

    try {
      if (alunoEmEdicao) {
        await atualizarAluno(alunoEmEdicao.id, payload);
        setFeedback("Aluno atualizado com sucesso.");
      } else {
        await criarAluno(payload);
        setFeedback("Aluno cadastrado com sucesso.");
      }

      setAlunoEmEdicao(null);
      await carregarAlunos();
    } catch (err) {
      setErro("Não foi possível salvar os dados do aluno.");
    } finally {
      setLoadingForm(false);
    }
  };

  const handleExcluir = async (aluno) => {
    if (!podeEditar || !aluno?.id) return;

    const confirmaExclusao = window.confirm(
      `Deseja realmente excluir o aluno ${aluno.nome}?`
    );
    if (!confirmaExclusao) return;

    setLoadingForm(true);
    setErro("");
    setFeedback("");

    try {
      await excluirAluno(aluno.id);
      if (alunoEmEdicao?.id === aluno.id) {
        setAlunoEmEdicao(null);
      }
      setFeedback("Aluno excluído com sucesso.");
      await carregarAlunos();
    } catch (err) {
      setErro("Não foi possível excluir o aluno.");
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <main className="alunos-page">
      <header className="page-header">
        <h1>AEE Registro - Cadastro de Alunos</h1>
        <p>Gerencie os alunos atendidos pelo AEE em um único lugar.</p>
        <p className="muted">
          Orientação: O(a) professor(a) do AEE é responsável pelo cadastro de todos os alunos
          atendidos na Sala de Recursos Multifuncional.
        </p>
      </header>

      {feedback ? <p className="toast-success">{feedback}</p> : null}
      {erro ? <p className="toast-error">{erro}</p> : null}

      <div className="alunos-grid">
        {podeEditar ? (
          <AlunoForm
            alunoEmEdicao={alunoEmEdicao}
            onSubmit={handleSubmit}
            onCancel={() => setAlunoEmEdicao(null)}
            loading={loadingForm}
          />
        ) : (
          <section className="panel">
            <h2>Cadastro de alunos</h2>
            <p>
              Seu perfil possui acesso somente de leitura. Edição de cadastro disponível apenas
              para Professor(a) do AEE.
            </p>
          </section>
        )}

        <AlunosList
          alunos={alunos}
          onEditar={podeEditar ? setAlunoEmEdicao : null}
          onExcluir={podeEditar ? handleExcluir : null}
          loading={loadingList}
          podeEditar={podeEditar}
        />
      </div>
    </main>
  );
}

export default AlunosPage;



