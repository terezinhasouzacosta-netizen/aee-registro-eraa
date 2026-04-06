function AlunosList({ alunos, onEditar, onExcluir, loading, podeEditar }) {
  return (
    <section className="panel">
      <h2>Lista de alunos</h2>

      {loading ? <p>Carregando alunos...</p> : null}

      {!loading && alunos.length === 0 ? (
        <p>Nenhum aluno cadastrado até o momento.</p>
      ) : null}

      {!loading && alunos.length > 0 ? (
        <div className="table-wrapper">
          <table className="alunos-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Nascimento</th>
                <th>Turma</th>
                <th>Diagnóstico</th>
                <th>Acompanhamento</th>
                <th>Responsáveis</th>
                {podeEditar ? <th>Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <tr key={aluno.id}>
                  <td>{aluno.nome}</td>
                  <td>{aluno.dataNascimento}</td>
                  <td>{aluno.turma}</td>
                  <td>{aluno.diagnostico}</td>
                  <td>{aluno.tipoAcompanhamento}</td>
                  <td>{(aluno.responsaveis || []).join(", ")}</td>
                  {podeEditar ? (
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => onEditar(aluno)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => onExcluir(aluno)}
                      >
                        Excluir
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export default AlunosList;
