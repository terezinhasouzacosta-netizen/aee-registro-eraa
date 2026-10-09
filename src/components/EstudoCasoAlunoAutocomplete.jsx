import { useId, useState } from "react";

function normalizarBusca(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export default function EstudoCasoAlunoAutocomplete({ alunos, alunoId, carregando, bloqueado, onSelecionar }) {
  const listaId = useId();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);
  const selecionado = alunos.find((aluno) => aluno.id === alunoId);
  const resultados = alunos.filter((aluno) => normalizarBusca(aluno.nome).includes(normalizarBusca(busca)));
  const exibirLista = aberto && !carregando && !alunoId;

  function selecionar(aluno) {
    onSelecionar(aluno.id);
    setAberto(false);
    setBusca("");
    setIndiceAtivo(-1);
  }

  return (
    <div className="estudo-caso-question-field">
      <label htmlFor="estudo-caso-aluno-cadastro">Aluno cadastrado</label>
      <input
        id="estudo-caso-aluno-cadastro"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={exibirLista}
        aria-controls={exibirLista ? listaId : undefined}
        aria-activedescendant={exibirLista && resultados[indiceAtivo] ? `${listaId}-${indiceAtivo}` : undefined}
        value={alunoId ? selecionado?.nome || "Aluno vinculado — cadastro indisponível" : busca}
        readOnly={Boolean(alunoId)}
        disabled={carregando}
        placeholder={carregando ? "Carregando alunos..." : "Digite o nome do estudante"}
        onFocus={() => setAberto(true)}
        onBlur={() => { setAberto(false); setIndiceAtivo(-1); }}
        onChange={(event) => { setBusca(event.target.value); setIndiceAtivo(-1); setAberto(true); }}
        onKeyDown={(event) => {
          if (alunoId) return;
          if (event.key === "Escape") {
            setAberto(false);
            setIndiceAtivo(-1);
          } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setAberto(true);
            setIndiceAtivo((atual) => {
              if (!resultados.length) return -1;
              if (atual < 0) return event.key === "ArrowDown" ? 0 : resultados.length - 1;
              return (atual + (event.key === "ArrowDown" ? 1 : -1) + resultados.length) % resultados.length;
            });
          } else if (event.key === "Enter" && exibirLista && resultados[indiceAtivo]) {
            event.preventDefault();
            selecionar(resultados[indiceAtivo]);
          }
        }}
      />
      {alunoId && !bloqueado && (
        <button type="button" className="btn-secondary" disabled={carregando} onClick={() => {
          onSelecionar("");
          setBusca("");
          setIndiceAtivo(-1);
          document.getElementById("estudo-caso-aluno-cadastro")?.focus();
        }}>Trocar aluno</button>
      )}
      {exibirLista && (
        <ul id={listaId} role="listbox" aria-label="Alunos cadastrados" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {resultados.map((aluno, indice) => (
            <li
              key={aluno.id}
              id={`${listaId}-${indice}`}
              role="option"
              aria-selected={indice === indiceAtivo}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selecionar(aluno)}
              style={{ cursor: "pointer", padding: "0.75rem", borderBottom: "1px solid #dbe3eb", background: indice === indiceAtivo ? "#e8f0fa" : undefined }}
            >
              <strong>{aluno.nome}</strong>
              <span style={{ display: "block", fontSize: "0.85em" }}>
                {[aluno.serieAno, aluno.turma, aluno.turno, aluno.dataNascimento].filter(Boolean).join(" · ")}
                {resultados.filter((outro) => normalizarBusca(outro.nome) === normalizarBusca(aluno.nome)).length > 1 ? ` · Código: ${aluno.id}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {exibirLista && resultados.length === 0 && <p role="status">Nenhum aluno encontrado.</p>}
    </div>
  );
}
