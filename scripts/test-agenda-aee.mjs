import test from "node:test";
import assert from "node:assert/strict";
import { agendaDoAluno, validarAgendaAee, alunosPrevistosAee, prepararParticipantesAee, diaDaDataAee } from "../src/utils/agendaAee.js";
const base = { turmaAee: "Turma A", turno: "Manhã", turnoAee: "Tarde", horaInicioAee: "13:00", horaFimAee: "14:00" };
const alunos = [
  { ...base, id: "ana", nome: "Ana", diasAee: ["segunda", "quarta"] },
  { ...base, id: "joao", nome: "João", diasAee: ["terca"], horaInicioAee: "15:00", horaFimAee: "16:00" },
  { ...base, id: "pedro", nome: "Pedro", diasAee: ["segunda", "quinta", "sexta"], horaInicioAee: "14:00", horaFimAee: "15:00" },
];
test("dias são individuais: turma não implica atendimento diário", () => {
  assert.deepEqual(alunosPrevistosAee(alunos, "Turma A", "segunda").map((a) => a.id), ["ana", "pedro"]);
  assert.deepEqual(alunosPrevistosAee(alunos, "Turma A", "terca").map((a) => a.id), ["joao"]);
  assert.deepEqual(alunosPrevistosAee(alunos, "Turma B", "segunda"), []);
});
test("cadastros antigos não herdam turno ou horário da turma", () => {
  const antigo = { id: "antigo", turmaAee: "Turma A", turno: "Manhã" };
  assert.deepEqual(agendaDoAluno(antigo), { turnoAee: "", diasAee: [], horaInicioAee: "", horaFimAee: "" });
  assert.equal(validarAgendaAee(antigo).atendimentosSemanaisAee, 0);
  assert.equal(alunosPrevistosAee([antigo], "Turma A", "segunda").length, 0);
});
test("horários individuais e alunoId são preservados sem presença", () => {
  const antes = JSON.stringify(alunos);
  const p = prepararParticipantesAee(alunos, "Turma A", "segunda", "2026-10-12", ["ana", "pedro", "ana"]);
  assert.deepEqual(p.alunoIds, ["ana", "pedro"]);
  assert.deepEqual(p.participantes.map((a) => a.horaInicioAee), ["13:00", "14:00"]);
  assert.equal(p.participantes[0].turnoAee, "Tarde");
  assert.ok(p.participantes.every((a) => !("statusPresenca" in a)));
  assert.equal(JSON.stringify(alunos), antes);
});
test("impede incluir estudante de outro dia e seleção vazia ou obsoleta", () => {
  assert.throws(() => prepararParticipantesAee(alunos, "Turma A", "segunda", "2026-10-12", ["joao"]));
  assert.throws(() => prepararParticipantesAee(alunos, "Turma A", "segunda", "2026-10-12", []));
  assert.throws(() => prepararParticipantesAee(alunos, "Turma A", "segunda", "2026-10-13", ["ana"]));
});
test("valida horários, agenda parcial e quantidade por dias distintos", () => {
  assert.throws(() => validarAgendaAee({ ...alunos[0], horaFimAee: "12:00" }));
  assert.throws(() => validarAgendaAee({ ...alunos[0], turnoAee: "" }));
  assert.equal(validarAgendaAee({ ...alunos[0], diasAee: ["segunda", "segunda", "quarta"] }).atendimentosSemanaisAee, 2);
});
test("datas reais e dias úteis sem conversão UTC", () => {
  assert.equal(diaDaDataAee("2026-10-12"), "segunda");
  assert.equal(diaDaDataAee("2026-02-30"), "");
  assert.equal(diaDaDataAee("2026-10-11"), "");
});
