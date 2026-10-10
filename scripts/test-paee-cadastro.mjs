import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { transformSync } from "esbuild";

// No Firebase modules or network APIs are loaded: all service calls stay in memory.
const pageSource = readFileSync(new URL("../src/pages/PAEEPage.jsx", import.meta.url), "utf8");
const autocompleteSource = readFileSync(new URL("../src/components/EstudoCasoAlunoAutocomplete.jsx", import.meta.url), "utf8");
const student = {
  id: "aluno-fixture", nome: "João Teste", dataNascimento: "2015-02-03",
  serieAno: "5º ano", turma: "A", turno: "Matutino", nomeEscola: "Escola fixture",
  professorAee: "Professora fixture",
};
const fields = Object.keys(student).filter((key) => key !== "id");
const plain = (value) => JSON.parse(JSON.stringify(value));

function harness({ saved = null, projectId = "aee-registro-eraa", restricted = false } = {}) {
  let states = [], cursor = 0, effects = [], deps = [], pendingEffects = [];
  const data = { students: [student], saved, fail: false, writes: [], reads: [], restrictedIds: [] };
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useId: () => "test-list",
    useEffect(fn, values) {
      const index = cursor++;
      if (!deps[index] || values.some((v, i) => v !== deps[index][i])) {
        pendingEffects.push(fn);
        deps[index] = values;
      }
    },
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  async function readStudents() {
    data.reads.push("alunos");
    if (data.fail) throw new Error("Simulated read failure");
    return data.students;
  }
  const services = {
    listarAlunos: readStudents,
    listarAlunosPorIds: async (ids) => { data.restrictedIds = ids; return readStudents(); },
    buscarIdsAlunosVinculados: async () => [student.id],
    listarPaees: async () => data.saved ? [data.saved] : [],
    buscarPaeePorId: async () => { data.reads.push("paees"); return data.saved; },
    criarPaee: async (payload) => { data.writes.push(plain(payload)); return "paee-fixture"; },
    atualizarPaee: async (id, payload) => { data.writes.push(plain(payload)); },
  };
  const context = {
    module: { exports: {} }, console: { error() {}, warn() {} },
    window: { localStorage: { getItem: () => saved?.id || "", setItem() {}, removeItem() {} }, scrollTo() {}, confirm: () => true, print() {} },
    require(id) {
      if (id === "react") return hooks;
      if (id === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
      if (id.endsWith("EstudoCasoAlunoAutocomplete")) return { default: "Autocomplete", __esModule: true };
      if (id.endsWith("/firebase")) return { db: { app: { options: { projectId } } } };
      if (id.endsWith("useAuth")) return { useAuth: () => ({ currentUser: { uid: "user-fixture" }, perfil: "fixture" }) };
      if (id.endsWith("permissions")) return { podeVisualizarMetas: () => true, visualizaSomenteVinculados: () => restricted };
      if (/services\/(alunosService|vinculacoesService|paeesService)$/.test(id)) return services;
      throw new Error(`Unexpected dependency: ${id}`);
    },
  };
  function load(source) {
    context.module = { exports: {} };
    vm.runInNewContext(transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" }).code, context);
    return context.module.exports;
  }
  const page = load(pageSource + "\nexport { PAEEPage };");
  const autocomplete = load(autocompleteSource).default;
  const render = () => { cursor = 0; return page.PAEEPage(); };
  const all = (tree) => !tree || typeof tree !== "object" ? [] : Array.isArray(tree)
    ? tree.flatMap(all) : [tree, ...all(tree.props?.children)];
  const find = (predicate) => all(render()).find(predicate);
  const byId = (id) => find((node) => node.props.id === id);
  const button = (text) => find((node) => node.type === "button" && all(node.props.children).length === 0 && node.props.children === text);
  async function mount() {
    render();
    effects = pendingEffects.splice(0);
    effects.forEach((effect) => effect());
    for (let i = 0; i < 12; i++) await Promise.resolve();
    return render();
  }
  return { data, mount, render, all, find, byId, button, wrapper: page.default,
    select: (id) => find((n) => n.type === "Autocomplete").props.onSelecionar(id),
    save: () => find((n) => n.type === "form").props.onSubmit({ preventDefault() {} }),
    open: () => find((n) => n.type === "button" && n.props.children === "Abrir").props.onClick(),
    renderAutocomplete(props) { states = []; cursor = 0; return autocomplete(props); },
    rerenderAutocomplete(props) { cursor = 0; return autocomplete(props); },
  };
}

test("selection fills seven read-only fields and serializes alunoId using existing PAEE schema", async () => {
  const h = harness(); await h.mount(); h.select(student.id);
  for (const field of fields) {
    assert.equal(h.byId(field).props.value, student[field]);
    assert.equal(h.byId(field).props.readOnly, true);
  }
  assert.equal(h.data.writes.length, 0, "Selecting must not save");
  await h.save();
  const payload = h.data.writes[0];
  assert.equal(payload.alunoId, student.id);
  for (const field of fields) assert.equal(payload.identificacaoEstudante[field], student[field]);
  assert.equal(h.find((n) => n.type === "Autocomplete").props.bloqueado, true);
});

test("automatic draft restoration and reopening refresh cadastro while preserving pedagogy", async () => {
  const saved = { id: "paee-fixture", alunoId: student.id, identificacaoEstudante: { nome: "Antigo", diagnostico: "Preservar diagnóstico", municipio: "Município" }, basePedagogica: { potencialidades: "Preservar potencialidades" }, objetivos: [{ objetivoEspecifico: "Preservar objetivo" }], sinteseDiagnostica: { texto: "Preservar síntese" } };
  const h = harness({ saved }); await h.mount();
  assert.equal(h.byId("nome").props.value, student.nome);
  h.data.students = [{ ...student, nome: "Nome atualizado", turma: "B", professorAee: "", nomeEscola: "Nova escola" }];
  await h.open();
  assert.equal(h.byId("nome").props.value, "Nome atualizado");
  assert.equal(h.byId("turma").props.value, "B");
  assert.equal(h.byId("professorAee").props.value, "");
  assert.equal(h.byId("nomeEscola").props.value, "Nova escola");
  assert.equal(h.byId("diagnosticoPaee").props.value, "Preservar diagnóstico");
  assert.equal(h.byId("potencialidades").props.value, "Preservar potencialidades");
  await h.save();
  assert.equal(h.data.writes[0].objetivos[0].objetivoEspecifico, "Preservar objetivo");
  assert.equal(h.data.writes[0].sinteseDiagnostica.texto, "Preservar síntese");
});

test("missing student clears stale identification and blocks saving", async () => {
  const h = harness({ saved: { id: "p", alunoId: "missing", identificacaoEstudante: { nome: "Obsoleto" } } });
  await h.mount();
  for (const field of fields) assert.equal(h.byId(field).props.value, "");
  await h.save(); assert.equal(h.data.writes.length, 0);
});

test("failed cadastro refresh does not replace the currently open plan", async () => {
  const h = harness({ saved: { id: "p", alunoId: student.id } }); await h.mount();
  h.data.fail = true; h.data.saved = { id: "other", alunoId: "other" };
  await h.open();
  assert.equal(h.byId("nome").props.value, student.nome);
  assert.equal(h.data.writes.length, 0);
});

test("legacy unlinked plan can be linked without replacing its pedagogy", async () => {
  const h = harness({ saved: { id: "legacy", identificacaoEstudante: { nome: "Legado", diagnostico: "Manter" } } });
  await h.mount(); h.select(student.id);
  assert.equal(h.byId("diagnosticoPaee").props.value, "Manter");
  assert.equal(h.byId("nome").props.value, student.nome);
});

test("restricted profiles use the same linked-student scope as Estudo de Caso", async () => {
  const h = harness({ restricted: true }); await h.mount();
  assert.deepEqual(plain(h.data.restrictedIds), [student.id]);
});

test("official Firebase guard blocks module rendering with another project", () => {
  const h = harness({ projectId: "invalid-project" });
  const tree = h.wrapper();
  assert.ok(h.all(tree).some((node) => node.props.role === "alert"));
  assert.equal(h.data.reads.length, 0);
});

test("reused autocomplete filters without accents and selects by keyboard without writing", () => {
  const h = harness(); let selected = "";
  const props = { alunos: [student], alunoId: "", carregando: false, bloqueado: false, onSelecionar: (id) => { selected = id; } };
  let tree = h.renderAutocomplete(props);
  const input = () => h.all(tree).find((n) => n.props.role === "combobox");
  input().props.onChange({ target: { value: "JOAO" } }); tree = h.rerenderAutocomplete(props);
  assert.equal(h.all(tree).filter((n) => n.props.role === "option").length, 1);
  input().props.onKeyDown({ key: "ArrowDown", preventDefault() {} }); tree = h.rerenderAutocomplete(props);
  input().props.onKeyDown({ key: "Enter", preventDefault() {} });
  assert.equal(selected, student.id); assert.equal(h.data.writes.length, 0);
});

test("Enter in the search field cannot submit the PAEE form", async () => {
  const h = harness(); await h.mount();
  let prevented = false;
  h.find((n) => n.type === "div" && n.props.onKeyDown).props.onKeyDown({ key: "Enter", target: { getAttribute: () => "combobox" }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(h.data.writes.length, 0);
});
