import { useEffect, useMemo, useState } from "react";

const TIPOS_ACOMPANHAMENTO = [
  "Sem mediação",
  "Com mediador",
  "Com assistente educacional",
  "Atendimento domiciliar",
];

const ROTULOS_PROFISSIONAL_ACOMPANHAMENTO = {
  "Com mediador": "Nome do mediador",
  "Com assistente educacional": "Nome do assistente educacional",
  "Atendimento domiciliar": "Professor(a) do atendimento domiciliar",
};

const initialForm = {
  nomeEscola: "",
  municipio: "",
  localizacao: "",
  nome: "",
  dataNascimento: "",
  serieAno: "",
  turma: "",
  turno: "",
  diagnostico: "",
  laudo: "",
  comprometimento: "",
  professorAee: "",
  tipoAcompanhamento: "Sem mediação",
  profissionalAcompanhamentoNome: "",
};

function normalizarTipoAcompanhamento(valor) {
  if (valor === "Sem mediador") return "Sem mediação";
  if (valor === "Com mediador") return "Com mediador";
  if (TIPOS_ACOMPANHAMENTO.includes(valor)) return valor;
  return "Sem mediação";
}

function mapAlunoToForm(aluno) {
  if (!aluno) return initialForm;

  return {
    nomeEscola: aluno.nomeEscola || "",
    municipio: aluno.municipio || "",
    localizacao: aluno.localizacao || "",
    nome: aluno.nome || "",
    dataNascimento: aluno.dataNascimento || "",
    serieAno: aluno.serieAno || aluno.turma || "",
    turma: aluno.turma || "",
    turno: aluno.turno || "",
    diagnostico: aluno.diagnostico || "",
    laudo: aluno.laudo || "",
    comprometimento: aluno.comprometimento || "",
    professorAee: aluno.professorAee || "",
    tipoAcompanhamento: normalizarTipoAcompanhamento(aluno.tipoAcompanhamento),
    profissionalAcompanhamentoNome:
      aluno.profissionalAcompanhamentoNome ||
      (Array.isArray(aluno.responsaveis) ? aluno.responsaveis.join(", ") : ""),
  };
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

  const precisaNomeProfissional = form.tipoAcompanhamento !== "Sem mediação";

  const rotuloProfissionalAcompanhamento = useMemo(() => {
    return (
      ROTULOS_PROFISSIONAL_ACOMPANHAMENTO[form.tipoAcompanhamento] ||
      "Nome do profissional de acompanhamento"
    );
  }, [form.tipoAcompanhamento]);

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit({
      nomeEscola: form.nomeEscola.trim(),
      municipio: form.municipio.trim(),
      localizacao: form.localizacao,
      nome: form.nome.trim(),
      dataNascimento: form.dataNascimento,
      serieAno: form.serieAno.trim(),
      turma: form.turma.trim(),
      turno: form.turno.trim(),
      diagnostico: form.diagnostico.trim(),
      laudo: form.laudo,
      comprometimento: form.comprometimento.trim(),
      professorAee: form.professorAee.trim(),
      tipoAcompanhamento: form.tipoAcompanhamento,
      profissionalAcompanhamentoNome: precisaNomeProfissional
        ? form.profissionalAcompanhamentoNome.trim()
        : "",
    });
  };

  return (
    <section className="panel">
      <h2>{alunoEmEdicao ? "Editar aluno" : "Cadastrar aluno"}</h2>
      <p className="muted">
        Este cadastro passa a funcionar como base mestre do estudante, reduzindo redigitação nos
        próximos módulos da plataforma.
      </p>

      <form className="aluno-form aluno-form-master" onSubmit={handleSubmit}>
        <section className="aluno-form-section">
          <div className="aluno-form-section-header">
            <h3>1. Identificação da Escola</h3>
          </div>
          <div className="aluno-form-grid">
            <div>
              <label htmlFor="nomeEscola">Nome da escola</label>
              <input
                id="nomeEscola"
                name="nomeEscola"
                value={form.nomeEscola}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="municipio">Município</label>
              <input
                id="municipio"
                name="municipio"
                value={form.municipio}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="localizacao">Localização</label>
              <select
                id="localizacao"
                name="localizacao"
                value={form.localizacao}
                onChange={handleChange}
              >
                <option value="">Selecione</option>
                <option value="Urbana">Urbana</option>
                <option value="Rural">Rural</option>
              </select>
            </div>
          </div>
        </section>

        <section className="aluno-form-section">
          <div className="aluno-form-section-header">
            <h3>2. Identificação do Estudante</h3>
          </div>
          <div className="aluno-form-grid">
            <div className="aluno-form-grid-span-2">
              <label htmlFor="nome">Nome completo</label>
              <input id="nome" name="nome" value={form.nome} onChange={handleChange} required />
            </div>

            <div>
              <label htmlFor="dataNascimento">Data de nascimento</label>
              <input
                id="dataNascimento"
                name="dataNascimento"
                type="date"
                value={form.dataNascimento}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="serieAno">Série/Ano</label>
              <input id="serieAno" name="serieAno" value={form.serieAno} onChange={handleChange} />
            </div>

            <div>
              <label htmlFor="turma">Turma</label>
              <input id="turma" name="turma" value={form.turma} onChange={handleChange} required />
            </div>

            <div>
              <label htmlFor="turno">Turno</label>
              <input id="turno" name="turno" value={form.turno} onChange={handleChange} />
            </div>
          </div>
        </section>

        <section className="aluno-form-section">
          <div className="aluno-form-section-header">
            <h3>3. Informações Educacionais</h3>
          </div>
          <div className="aluno-form-grid">
            <div className="aluno-form-grid-span-2">
              <label htmlFor="diagnostico">Diagnóstico</label>
              <input
                id="diagnostico"
                name="diagnostico"
                value={form.diagnostico}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="laudo">Laudo</label>
              <select id="laudo" name="laudo" value={form.laudo} onChange={handleChange}>
                <option value="">Selecione</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            <div>
              <label htmlFor="comprometimento">Comprometimento</label>
              <input
                id="comprometimento"
                name="comprometimento"
                value={form.comprometimento}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <section className="aluno-form-section">
          <div className="aluno-form-section-header">
            <h3>4. Atendimento AEE</h3>
          </div>
          <div className="aluno-form-grid">
            <div className="aluno-form-grid-span-2">
              <label htmlFor="professorAee">Professor(a) do AEE que acompanha o aluno</label>
              <input
                id="professorAee"
                name="professorAee"
                value={form.professorAee}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <section className="aluno-form-section">
          <div className="aluno-form-section-header">
            <h3>5. Acompanhamento Escolar</h3>
          </div>
          <div className="aluno-form-grid">
            <div>
              <label htmlFor="tipoAcompanhamento">Tipo de acompanhamento</label>
              <select
                id="tipoAcompanhamento"
                name="tipoAcompanhamento"
                value={form.tipoAcompanhamento}
                onChange={handleChange}
              >
                {TIPOS_ACOMPANHAMENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="aluno-form-grid-span-2">
              <label htmlFor="profissionalAcompanhamentoNome">
                {rotuloProfissionalAcompanhamento}
              </label>
              <input
                id="profissionalAcompanhamentoNome"
                name="profissionalAcompanhamentoNome"
                value={form.profissionalAcompanhamentoNome}
                onChange={handleChange}
                disabled={!precisaNomeProfissional}
                placeholder={
                  precisaNomeProfissional
                    ? "Informe o nome do profissional"
                    : "Não é necessário informar profissional para Sem mediação"
                }
              />
              {!precisaNomeProfissional ? (
                <p className="muted">
                  Com a opção <strong>Sem mediação</strong>, o nome do profissional não é exigido
                  nesta etapa.
                </p>
              ) : null}
            </div>
          </div>
        </section>

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
