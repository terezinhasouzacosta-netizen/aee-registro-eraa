import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { gerarVersaoInicial } from "../src/utils/estudoCasoVersaoInicial.js";

const base = { alunoId: "a", aluno: { id: "a", nome: "Aluno exemplo", diagnostico: "Condição informada" } };
test("uses linked records only and latest plans, with explicit provenance", () => {
  const result = gerarVersaoInicial({ ...base,
    paees: [
      { id: "antigo", alunoId: "a", atualizadoEm: "2025-01-01", basePedagogica: { barreiras: "Barreira antiga" } },
      { id: "novo", alunoId: "a", atualizadoEm: "2026-01-01", basePedagogica: { barreiras: "Barreira atual" }, recursosTecnologiaAssistiva: "Material concreto" },
      { id: "outro", alunoId: "b", atualizadoEm: "2027-01-01", basePedagogica: { barreiras: "DADO DE OUTRO ALUNO" } },
    ],
    peis: [{ id: "pei", alunoId: "a", objetivosMetas: [{ objetivoMeta: "Objetivo registrado", resultadoEsperado: "Meta registrada" }] }],
    sondagens: [{ id: "sondagem", alunoId: "a", encaminhamentos: "Potencialidades e interesses do estudante:\nInteresse por desenho", leitura: "Realiza com apoio" }],
  });
  assert.match(result, /Barreira atual/); assert.match(result, /Material concreto/);
  assert.doesNotMatch(result, /Barreira antiga|DADO DE OUTRO ALUNO/);
  assert.match(result, /registro novo/); assert.match(result, /Meta registrada/);
  assert.match(result, /Interesse por desenho/); assert.match(result, /Realiza com apoio/);
});

test("absent sources are explicit and no diagnosis or evolution is inferred", () => {
  const result = gerarVersaoInicial({ alunoId: "a", aluno: { id: "a" } });
  assert.match(result, /Diagnóstico\/condição informada: Não registrado/);
  assert.match(result, /nenhum registro vinculado encontrado/);
  assert.match(result, /Entrevista\/informações familiares pendentes/);
  assert.match(result, /Não há relatos de evolução vinculados/);
});

test("counts AEE attendance separately from regular classroom records", () => {
  const result = gerarVersaoInicial({ ...base, atendimentosAEE: [
    { id: "1", alunoId: "a", modoAtendimento: "AEE", statusPresenca: "Presente", avancosPercebidos: "Avanço relatado" },
    { id: "2", alunoId: "a", modoAtendimento: "AEE", statusPresenca: "Ausente" },
    { id: "3", alunoId: "a", modoAtendimento: "REGULAR", statusPresenca: "Presente" },
    { id: "4", alunoId: "b", modoAtendimento: "AEE", statusPresenca: "Presente" },
  ] });
  assert.match(result, /2 atendimento\(s\) AEE: 1 presença\(s\), 1 ausência/);
  assert.match(result, /Avanço relatado/);
  assert.match(result, /Estratégias utilizadas: não há campo específico/);
});

test("family responses are attributed without adding information", () => {
  const result = gerarVersaoInicial({ ...base, familia: [{ pergunta: "Rotina?", resposta: "Relato familiar" }] });
  assert.match(result, /Rotina\?\nRelato familiar/);
  assert.match(result, /Fonte: respostas do bloco Família/);
  assert.throws(() => gerarVersaoInicial({ alunoId: "b", aluno: base.aluno }));
});

function mockService(projectId = "aee-registro-eraa", failure = false) {
  const reads = [];
  const context = { module: { exports: {} }, require(id) {
    if (id === "./firebase") return { db: { app: { options: { projectId } } } };
    if (id !== "firebase/firestore") throw new Error("Unexpected dependency");
    return {
      collection: (_, name) => name, doc: (_, name, id) => ({ name, id }),
      where: (field, op, value) => ({ field, op, value }), query: (name, filter) => ({ name, filter }),
      getDocFromServer: async (ref) => { reads.push(ref); return { exists: () => true, id: "a", data: () => ({ nome: "Aluno", id: "incorrect-embedded-id" }) }; },
      getDocsFromServer: async (ref) => { reads.push(ref); if (failure) throw new Error("permission-denied"); return { docs: [] }; },
    };
  } };
  const source = readFileSync(new URL("../src/services/estudoCasoVersaoInicialService.js", import.meta.url), "utf8");
  vm.runInNewContext(transformSync(source, { format: "cjs" }).code, context);
  return { read: context.module.exports.carregarFontesEstudoCaso, reads };
}

test("official source service reads only by alunoId and never loads write APIs", async () => {
  const service = mockService(); const result = await service.read("a");
  assert.equal(result.aluno.id, "a"); assert.equal(service.reads.length, 5);
  for (const ref of service.reads.slice(1)) assert.deepEqual(JSON.parse(JSON.stringify(ref.filter)), { field: "alunoId", op: "==", value: "a" });
});

test("wrong Firebase, missing selection or a source failure abort generation", async () => {
  const wrong = mockService("other-project"); await assert.rejects(wrong.read("a")); assert.equal(wrong.reads.length, 0);
  const missing = mockService(); await assert.rejects(missing.read("")); assert.equal(missing.reads.length, 0);
  await assert.rejects(mockService(undefined, true).read("a"));
});
