import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import * as modelo from "../src/utils/salaRecursosAee.js";
import * as entrevista from "../src/services/entrevistaImportService.js";

const alunos = [
  { id: "a", nome: "Aluno fictício A", turmaAee: "Turma A", professorAee: "Professora exemplo", turno: "Manhã" },
  { id: "b", nome: "Aluno fictício B", turmaAee: "Turma A", professorAee: "Professora exemplo", turno: "Manhã" },
  { id: "c", nome: "Aluno fictício C", turmaAee: "Turma B", professorAee: "Outra professora", turno: "Tarde" },
];
const sequencia = { ...modelo.sequenciaInicial(), id: "s1", titulo: "Sequência fictícia", turma: "Turma A", eixo: "Comunicação oral", objetivoGeral: "Comunicar escolhas", numeroEncontros: 3, status: "Em andamento" };
const form = () => ({ turmaAee: "Turma A", dataAtendimento: "2026-10-11", sequenciaId: "s1", encontroNumero: "1", objetivo: "Comunicar escolhas", eixoTematico: "Comunicação oral", estrategias: "Modelagem", recursos: "Cartões", atividades: "Escolha de cartões", avaliacaoGeral: "Relato do grupo", encaminhamentos: "Continuar", reposicao: false, individuais: { a: { statusPresenca: "Presente", observacoes: "Relato A" }, b: { statusPresenca: "Ausente", observacoes: "Relato B" } } });
const usuario = { uid: "professora", displayName: "Professora fictícia", email: "exemplo@example.test" };

// This sandbox has no Firebase SDK, credentials, filesystem writes or network APIs.
function carregarModulo(file, dependencies) {
  const ctx = { module: { exports: {} }, require(id) { if (id === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }; if (!(id in dependencies)) throw new Error(`Dependência não simulada: ${id}`); return dependencies[id]; } };
  vm.runInNewContext(transformSync(readFileSync(new URL(file, import.meta.url), "utf8"), { loader: file.endsWith("jsx") ? "jsx" : "js", jsx: "automatic", format: "cjs" }).code, ctx);
  return ctx.module.exports;
}
function ambienteSimulado({ projectId = "aee-registro-eraa", permitido = true, failure = false, currentUser = usuario } = {}) {
  const dados = new Map(alunos.map((a) => [`alunos/${a.id}`, { ...a }])); dados.set("sequenciasDidaticasAEE/s1", { ...sequencia });
  const reads = []; let commits = 0; let counter = 0;
  const snapshot = (ref) => ({ id: ref.id, exists: () => dados.has(ref.path), data: () => dados.get(ref.path) });
  const firestore = {
    collection: (_, name) => ({ path: name }),
    doc: (parent, name, id) => id ? { id, path: `${name}/${id}` } : { id: `new-${++counter}`, path: `${parent.path}/new-${counter}` },
    serverTimestamp: () => "timestamp-simulado",
    where: (field, op, value) => ({ field, op, value }), query: (ref, filter) => ({ ...ref, filter }),
    getDocs: async (ref) => { reads.push(ref); return { docs: [...dados].filter(([path, data]) => path.startsWith(`${ref.path}/`) && (!ref.filter || ref.filter.value.includes(data[ref.filter.field]))).map(([path]) => snapshot({ path, id: path.split("/").at(-1) })) }; },
    setDoc: async (ref, data) => { if (failure) throw new Error("Falha simulada"); dados.set(ref.path, data); commits++; },
    runTransaction: async (_, fn) => {
      const changes = [];
      const result = await fn({ get: async (ref) => { reads.push(ref); return snapshot(ref); }, set: (ref, data) => changes.push([ref.path, data]), update: (ref, data) => changes.push([ref.path, { ...dados.get(ref.path), ...data }]) });
      if (failure) throw new Error("Falha simulada");
      if (changes.length) { changes.forEach(([path, data]) => dados.set(path, data)); commits++; }
      return result;
    },
  };
  const deps = { "firebase/firestore": firestore, "./firebase": { db: { app: { options: { projectId } } }, auth: { currentUser } }, "../utils/permissions": { podeEditarHistoricoAcompanhamento: () => permitido }, "../utils/salaRecursosAee": modelo, "./atendimentoAeeService": { obterSemanaReferenciaPorData: () => "2026-S41" } };
  deps["./atendimentoAeeService"] = carregarModulo("../src/services/atendimentoAeeService.js", deps);
  return { service: carregarModulo("../src/services/salaRecursosAeeService.js", deps), dados, reads, commits: () => commits, firestore, deps };
}

test("turmas reutilizam Cadastro e agrupam por ID, sem inventar professora ou horário", () => {
  const grupos = modelo.agruparTurmasAee([...alunos, alunos[0], { id: "sem", nome: "Sem turma", turma: "Turma A" }]);
  assert.equal(grupos[0].estudantes.length, 2); assert.equal(grupos[1].estudantes.length, 1);
  assert.deepEqual(grupos[0].professoras, ["Professora exemplo"]); assert.deepEqual(grupos[1].turnos, ["Tarde"]);
});
test("registro coletivo cria um payload compatível por aluno e conserva o planejamento", () => {
  const r = modelo.montarRegistrosColetivos(form(), alunos.slice(0, 2), sequencia, usuario);
  assert.deepEqual(r.map((i) => i.alunoId), ["a", "b"]);
  for (const i of r) { assert.equal(i.sequenciaId, "s1"); assert.equal(i.encontroNumero, 1); assert.equal(i.objetivo, form().objetivo); assert.equal(i.habilidadesTrabalhadas, "Escolha de cartões"); assert.equal(i.modoAtendimento, "AEE"); }
  assert.equal(r[0].observacoes, "Relato A"); assert.equal(r[1].statusPresenca, "Ausente");
});
test("validação impede presença presumida, turma errada, datas e encontros inválidos", () => {
  const f = form(); f.individuais.b.statusPresenca = "";
  assert.throws(() => modelo.montarRegistrosColetivos(f, alunos.slice(0, 2), sequencia, usuario), /presença/);
  for (const change of [{ turmaAee: "Outra" }, { dataAtendimento: "2026-02-30" }, { encontroNumero: "4" }, { encontroNumero: "1.5" }]) assert.throws(() => modelo.montarRegistrosColetivos({ ...form(), ...change }, alunos.slice(0, 2), sequencia, usuario));
  assert.throws(() => modelo.montarRegistrosColetivos(form(), alunos, sequencia, usuario), /Cadastro mudou/);
});
test("sessão coletiva e registros individuais são atômicos e reenvio não duplica", async () => {
  const env = ambienteSimulado(); await env.service.salvarColetivoAee("sessao-1", form(), alunos.slice(0, 2), sequencia, "aee");
  assert.equal(env.commits(), 1);
  assert.ok(env.dados.has("atendimentosColetivosAEE/sessao-1"));
  for (const id of ["a", "b"]) assert.equal(env.dados.get(`atendimentosAEE/sessao-1_${id}`).coletivoId, "sessao-1");
  await env.service.salvarColetivoAee("sessao-1", form(), alunos.slice(0, 2), sequencia, "aee"); assert.equal(env.commits(), 1);
  const falha = ambienteSimulado({ failure: true }); await assert.rejects(falha.service.salvarColetivoAee("sessao-2", form(), alunos.slice(0, 2), sequencia, "aee"));
  assert.equal([...falha.dados.keys()].filter((k) => k.startsWith("atendimentos")).length, 0);
});
test("salvamento relê Cadastro e sequência, bloqueando dados obsoletos", async () => {
  const env = ambienteSimulado(); env.dados.set("alunos/b", { ...alunos[1], turmaAee: "Turma B" });
  await assert.rejects(env.service.salvarColetivoAee("sessao", form(), alunos.slice(0, 2), sequencia, "aee"), /Cadastro mudou/); assert.equal(env.commits(), 0);
  const outro = ambienteSimulado(); outro.dados.delete("sequenciasDidaticasAEE/s1");
  await assert.rejects(outro.service.salvarColetivoAee("sessao", form(), alunos.slice(0, 2), sequencia, "aee"), /Sequência não encontrada/);
});
test("correção individual preserva todos os campos coletivos e detecta edição concorrente", async () => {
  const env = ambienteSimulado(); await env.service.salvarColetivoAee("sessao", form(), alunos.slice(0, 2), sequencia, "aee");
  const path = "atendimentosAEE/sessao_b", antes = { ...env.dados.get(path), id: "sessao_b" };
  await env.service.atualizarIndividualColetivoAee(antes, "Falta justificada", "Aviso individual", "aee");
  const depois = env.dados.get(path);
  for (const k of ["alunoId", "coletivoId", "sequenciaId", "objetivo", "estrategias", "recursos", "avaliacaoGeral", "turmaAee"]) assert.equal(depois[k], antes[k]);
  assert.equal(depois.statusPresenca, "Falta justificada");
  await assert.rejects(env.service.atualizarIndividualColetivoAee(antes, "Presente", "", "aee"), /Outro usuário/);
});
test("somente Firebase oficial e usuário autorizado podem operar; leitura filtra alunoId", async () => {
  for (const options of [{ projectId: "projeto-incorreto" }, { permitido: false }, { currentUser: null }]) {
    const env = ambienteSimulado(options); await assert.rejects(env.service.salvarColetivoAee("s", form(), alunos.slice(0, 2), sequencia, "aee")); assert.equal(env.commits(), 0);
  }
  const errado = ambienteSimulado({ projectId: "projeto-incorreto" }); await assert.rejects(errado.service.listarSequenciasAee()); assert.equal(errado.reads.length, 0);
  const env = ambienteSimulado(); await env.service.listarRegistrosSalaAee([]); assert.equal(env.reads.length, 0);
  await env.service.listarRegistrosSalaAee(["a", "b"]); assert.equal(env.reads[0].filter.field, "alunoId"); assert.equal(env.reads[0].filter.op, "in");
});
test("frequência por aluno não mistura IDs, separa faltas justificadas e ignora sala regular", () => {
  const registros = [
    { id: "1", alunoId: "a", coletivoId: "s", statusPresenca: "Presente", modoAtendimento: "AEE", dataAtendimento: "2026-10-01" },
    { id: "2", alunoId: "b", coletivoId: "s", statusPresenca: "Ausente", modoAtendimento: "AEE", dataAtendimento: "2026-10-01" },
    { id: "3", alunoId: "a", statusPresenca: "Falta justificada", modoAtendimento: "AEE", dataAtendimento: "2026-10-02" },
    { id: "4", alunoId: "a", statusPresenca: "Presente", reposicao: true, modoAtendimento: "AEE", dataAtendimento: "2026-10-03" },
    { id: "5", alunoId: "a", statusPresenca: "Presente", modoAtendimento: "REGULAR", dataAtendimento: "2026-10-04" },
    { id: "6", alunoId: "a", statusPresenca: "", modoAtendimento: "AEE", dataAtendimento: "2026-10-04" },
  ];
  const [a, b, c] = modelo.frequenciaPorAlunoAee(alunos, [...registros, registros[0]]);
  assert.equal(a.presentes, 2); assert.equal(a.faltas, 1); assert.equal(a.justificadas, 1); assert.equal(a.reposicoes, 1); assert.equal(a.frequencia, 67); assert.equal(a.semChamada, 1);
  assert.equal(b.frequencia, 0); assert.equal(c.frequencia, null);
  assert.equal(modelo.indicadoresSalaAee(registros, [sequencia]).atendimentos, 4);
});
test("histórico de sequência conta sessões uma vez e encontros repetidos não avançam", () => {
  const r = [{ id: "1", coletivoId: "s1", sequenciaId: "s1", encontroNumero: 1, dataAtendimento: "2026-10-01" }, { id: "2", coletivoId: "s1", sequenciaId: "s1", encontroNumero: 1, dataAtendimento: "2026-10-01" }, { id: "3", sequenciaId: "s1", encontroNumero: 1, dataAtendimento: "2026-10-02" }, { id: "4", sequenciaId: "s1", encontroNumero: 2, dataAtendimento: "2026-10-03" }];
  const h = modelo.historicoSequenciaAee(sequencia, r); assert.equal(h.total, 3); assert.equal(h.encontros, 2); assert.equal(h.progresso, 67);
});
test("indicadores reutilizam normalização de registros antigos e excluem modos legados da sala regular", async () => {
  const env = ambienteSimulado();
  env.dados.set("atendimentosAEE/legado", { alunoId: "a", nomeAluno: "Nome legado", dataRegistro: "2026-10-01", statusPresenca: "Presente" });
  const result = await env.service.listarRegistrosSalaAee(["a"]);
  assert.equal(result[0].dataAtendimento, "2026-10-01"); assert.equal(result[0].alunoNome, "Nome legado");
  const mixed = [...result, { id: "regular1", alunoId: "a", modoAtendimento: "regular", statusPresenca: "Presente" }, { id: "regular2", alunoId: "a", modoAtendimento: "ACOMPANHAMENTO", statusPresenca: "Presente" }];
  assert.equal(modelo.indicadoresSalaAee(mixed, []).presentes, 1);
});
test("sequência exige valores válidos e assistente local preserva encontros e conflitos", () => {
  assert.equal(modelo.validarSequenciaAee(sequencia).numeroEncontros, 3);
  assert.throws(() => modelo.validarSequenciaAee({ ...sequencia, numeroEncontros: "0" }));
  const component = carregarModulo("../src/components/SequenciaDidaticaAee.jsx", { react: {}, "../utils/salaRecursosAee": modelo, "../services/entrevistaImportService": entrevista, "../services/salaRecursosAeeService": {} });
  const result = component.analisarTextoSequencia("# Título\nProposta fictícia\nObjetivos: Comunicar\n## Encontro 1\nUsar cartões\n## Encontro 2\nRevisar\nEstratégias: Modelagem\nRecursos: Cartões\nAvaliação: Observação\nObservações: Sem outras informações");
  assert.equal(result.desconhecidos.length, 0); assert.equal(result.semTitulo, "");
  assert.equal(result.secoes.filter((s) => s.titulo === "Encontros").length, 2);
  const destinos = Object.fromEntries(Object.entries(modelo.CAMPOS_SEQUENCIA).map(([id, label]) => [label, { id, label }]));
  const previa = entrevista.prepararPreviaEntrevista(result, destinos, { titulo: "Preservar" });
  assert.equal(previa.find((i) => i.id === "titulo").escolha, "manter");
  const alteracoes = entrevista.confirmarPreviaEntrevista(previa, { titulo: "Preservar" }); assert.equal(alteracoes.titulo, undefined); assert.match(alteracoes.encontros, /Encontro 2/);
});
test("serviço individual conserva contrato legado e adiciona vínculo somente quando informado", async () => {
  const env = ambienteSimulado(); const salvos = [];
  const service = carregarModulo("../src/services/atendimentoAeeService.js", { "./firebase": env.deps["./firebase"], "firebase/firestore": { ...env.firestore, addDoc: async (_, data) => { salvos.push(data); return { id: "x" }; } } });
  await service.criarAtendimentoAEE({ alunoId: "a", statusPresenca: "Presente", dataAtendimento: "2026-10-11" });
  assert.equal(salvos[0].alunoId, "a"); assert.equal(salvos[0].sequenciaId, undefined);
  await service.criarAtendimentoAEE({ alunoId: "a", sequenciaId: "s1", sequenciaTitulo: "Proposta", encontroNumero: "2", turmaAee: "Turma A", reposicao: true });
  assert.equal(salvos[1].sequenciaId, "s1"); assert.equal(salvos[1].encontroNumero, 2); assert.equal(salvos[1].reposicao, true);
});
test("Cadastro envia turmaAee e reutiliza professorAee, sem campo de professora duplicado", () => {
  const fixture = { nomeEscola: "Escola fictícia", municipio: "", localizacao: "", nome: "Aluno fictício", dataNascimento: "", serieAno: "1º ano", turma: "1 A", turno: "Manhã", turmaAee: "Turma B", diagnostico: "", comorbidadesDiagnosticosAssociados: "", laudo: "", comprometimento: "", professorAee: "Professora existente", tipoAcompanhamento: "Sem mediação", profissionalAcompanhamentoNome: "" };
  const component = carregarModulo("../src/components/AlunoForm.jsx", { react: { useState: () => [fixture, () => {}], useEffect: () => {}, useMemo: (fn) => fn() }, "lucide-react": {} });
  let payload;
  const tree = component.default({ onSubmit: (data) => { payload = data; } });
  function find(node) { if (!node || typeof node !== "object") return null; if (node.type === "form") return node; return [node.props?.children].flat(Infinity).map(find).find(Boolean); }
  find(tree).props.onSubmit({ preventDefault() {} });
  assert.equal(payload.turmaAee, "Turma B"); assert.equal(payload.professorAee, "Professora existente"); assert.equal(payload.turma, "1 A");
  assert.deepEqual(Object.keys(payload).filter((k) => /professor/i.test(k)), ["professorAee"]);
});
test("horários e sequências validam campos sem modificar o Cadastro", async () => {
  const env = ambienteSimulado();
  const before = JSON.stringify(env.dados.get("alunos/a"));
  await assert.rejects(env.service.salvarCronogramaAee("Turma A", { dias: "Segunda", inicio: "10:00", fim: "09:00" }, "aee"));
  await env.service.salvarCronogramaAee("Turma A", { dias: "Segunda", inicio: "08:00", fim: "09:00" }, "aee");
  assert.equal(env.dados.get("cronogramasAEE/Turma A").inicio, "08:00");
  await env.service.salvarSequenciaAee("s1", { ...sequencia, status: "Concluída" }, "aee");
  assert.equal(env.dados.get("sequenciasDidaticasAEE/s1").status, "Concluída");
  assert.equal(JSON.stringify(env.dados.get("alunos/a")), before);
});
