import { useEffect, useState } from "react";

const initialForm = {
  nome: "",
  dataNascimento: "",
  turma: "",
  diagnostico: "",
  tipoAcompanhamento: "Sem mediador",
  responsaveisTexto: "",
};

function mapAlunoToForm(aluno) {
  if (!aluno) return initialForm;

  return {
    nome: aluno.nome || "",
    dataNascimento: aluno.dataNascimento || "",
    turma: aluno.turma || "",
    diagnostico: aluno.diagnostico || "",
    tipoAcompanhamento: aluno.tipoAcompanhamento || "Sem mediador",
    responsaveisTexto: Array.isArray(aluno.responsaveis)
      ? aluno.responsaveis.join(", ")
      : "",
  };
}

function parseResponsaveis(texto) {
  return texto
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function AlunoForm({ alunoEmEdicao, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    setForm(mapAlunoToForm(alunoEmEdicao));
  }, [alunoEmEdicao]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit({
      nome: form.nome.trim(),
      dataNascimento: form.dataNascimento,
      turma: form.turma.trim(),
      diagnostico: form.diagnostico.trim(),
      tipoAcompanhamento: form.tipoAcompanhamento,
      responsaveis: parseResponsaveis(form.responsaveisTexto),
    });
  };

  return (
    <section className="panel">
      <h2>{alunoEmEdicao ? "Editar aluno" : "Cadastrar aluno"}</h2>

      <form className="aluno-form" onSubmit={handleSubmit}>
        <label htmlFor="nome">Nome</label>
        <input
          id="nome"
          name="nome"
          value={form.nome}
          onChange={handleChange}
          required
        />

        <label htmlFor="dataNascimento">Data de nascimento</label>
        <input
          id="dataNascimento"
          name="dataNascimento"
          type="date"
          value={form.dataNascimento}
          onChange={handleChange}
          required
        />

        <label htmlFor="turma">Turma</label>
        <input
          id="turma"
          name="turma"
          value={form.turma}
          onChange={handleChange}
          required
        />

        <label htmlFor="diagnostico">Diagnóstico</label>
        <input
          id="diagnostico"
          name="diagnostico"
          value={form.diagnostico}
          onChange={handleChange}
          required
        />

        <label htmlFor="tipoAcompanhamento">Tipo de acompanhamento</label>
        <select
          id="tipoAcompanhamento"
          name="tipoAcompanhamento"
          value={form.tipoAcompanhamento}
          onChange={handleChange}
          required
        >
          <option value="Sem mediador">Sem mediador</option>
          <option value="Com mediador">Com mediador</option>
        </select>

        <label htmlFor="responsaveisTexto">Responsáveis (separar por vírgula)</label>
        <textarea
          id="responsaveisTexto"
          name="responsaveisTexto"
          value={form.responsaveisTexto}
          onChange={handleChange}
          rows={3}
          placeholder="Ex.: Ana Silva, João Silva"
          required
        />

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Salvando..." : alunoEmEdicao ? "Salvar edição" : "Cadastrar"}
          </button>
          {alunoEmEdicao ? (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

export default AlunoForm;
