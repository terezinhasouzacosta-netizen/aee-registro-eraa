function formatarSerieTurma(aluno) {
  const serieAno = aluno.serieAno || "";
  const turma = aluno.turma || "";

  if (serieAno && turma) return `${serieAno} • Turma ${turma}`;
  if (serieAno) return serieAno;
  if (turma) return turma;
  return "-";
}

function formatarProfessorAee(aluno) {
  return aluno.professorAee || "-";
}

function formatarAcompanhamento(aluno) {
  const tipo = aluno.tipoAcompanhamento || "Sem mediação";
  const nomeProfissional =
    aluno.profissionalAcompanhamentoNome ||
    (Array.isArray(aluno.responsaveis) ? aluno.responsaveis.join(", ") : "");

  return {
    tipo,
    profissional: nomeProfissional || "-",
  };
}

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
                <th>Série/Ano e turma</th>
                <th>Turno</th>
                <th>Diagnóstico</th>
                <th>Professor(a) AEE</th>
                <th>Acompanhamento escolar</th>
                {podeEditar ? <th>Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => {
                const acompanhamento = formatarAcompanhamento(aluno);

                return (
                  <tr key={aluno.id}>
                    <td>
                      <div className="aluno-cell-stack">
                        <strong>{aluno.nome}</strong>
                        <span>{aluno.dataNascimento || "Nascimento não informado"}</span>
                      </div>
                    </td>
                    <td>{formatarSerieTurma(aluno)}</td>
                    <td>{aluno.turno || "-"}</td>
                    <td>{aluno.diagnostico || "-"}</td>
                    <td>{formatarProfessorAee(aluno)}</td>
                    <td>
                      <div className="aluno-cell-stack">
                        <strong>{acompanhamento.tipo}</strong>
                        <span>{acompanhamento.profissional}</span>
                      </div>
                    </td>
                    {podeEditar ? (
                      <td>
                        <div className="form-actions">
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
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export default AlunosList;
