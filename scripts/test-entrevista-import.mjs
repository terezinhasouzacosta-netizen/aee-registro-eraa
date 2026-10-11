import test from "node:test";
import assert from "node:assert/strict";
import { TITULOS_ENTREVISTA, criarPromptEntrevista } from "../src/utils/entrevistaPrompt.js";
import { analisarRespostaEntrevista, prepararPreviaEntrevista, confirmarPreviaEntrevista, resultadoImportacao } from "../src/services/entrevistaImportService.js";
import { DESTINOS_ENTREVISTA_ESTUDO as destinos, aplicarEntrevista, obterValoresEntrevista } from "../src/utils/estudoCasoEntrevista.js";
import { organizarTranscricaoLocal, analisarTrechosLocais, perguntaSemInformacao } from "../src/services/entrevistaOrganizacaoLocal.js";
const analisar = (texto) => analisarRespostaEntrevista(texto, TITULOS_ENTREVISTA);
test("organização local classifica relatos sem reescrever ou inventar respostas", () => {
  const texto = "Família: a rotina é organizada.\nProfessora: utiliza gestos para se comunicar.\nResponsável: tem amigos.";
  const trechos = organizarTranscricaoLocal(texto, TITULOS_ENTREVISTA);
  assert.deepEqual(trechos.map((t) => t.titulo), ["Rotina", "Comunicação", "Interação social"]);
  assert.equal(trechos.map((t) => t.texto).join("\n"), texto);
  assert.equal(analisarTrechosLocais(trechos).secoes.length, 3);
});
test("ambiguidade e ausência de tema exigem decisão manual e preservam texto", () => {
  const texto = "Tem dificuldade para falar.\nRelato sem tema reconhecido.";
  const trechos = organizarTranscricaoLocal(texto, TITULOS_ENTREVISTA);
  assert.ok(trechos.every((t) => !t.titulo));
  assert.equal(trechos.map((t) => t.texto).join("\n"), texto);
  assert.equal(analisarTrechosLocais(trechos).secoes.length, 0);
});
test("títulos explícitos têm prioridade e seções desconhecidas não herdam destino", () => {
  const trechos = organizarTranscricaoLocal("### Saúde\nRelato sem palavras-chave.\n## Outra seção\nOutro relato.\n**Rotina:** Horários organizados.", TITULOS_ENTREVISTA);
  assert.equal(trechos[0].titulo, "Saúde");
  assert.equal(trechos[1].titulo, "");
  assert.equal(trechos[2].titulo, "");
  assert.equal(trechos[3].titulo, "Rotina");
  assert.equal(trechos[3].texto, "Horários organizados.");
});
test("transcrição longa não é truncada e perguntas sem informação continuam pendentes", () => {
  const texto = "Família: rotina organizada. ".repeat(15000);
  assert.equal(organizarTranscricaoLocal(texto, TITULOS_ENTREVISTA)[0].texto, texto);
  assert.equal(perguntaSemInformacao("Não informado."), true);
  assert.equal(perguntaSemInformacao("  "), true);
  assert.equal(perguntaSemInformacao("Não usa medicação."), false);
});
test("organização local segue mesma prévia protegida e permite edição posterior", () => {
  const trechos = organizarTranscricaoLocal("Rotina: Texto novo.\nIdentificação do estudante: Nome diferente.", TITULOS_ENTREVISTA);
  const valores = { "familia-rotina-casa": "Original", identificacao: "Oficial" };
  const previa = prepararPreviaEntrevista(analisarTrechosLocais(trechos), destinos, valores);
  assert.deepEqual(confirmarPreviaEntrevista(previa, valores), {});
  previa[0].escolha = "substituir";
  const resultado = aplicarEntrevista({}, {}, confirmarPreviaEntrevista(previa, valores));
  assert.equal(resultado.perguntas["familia-rotina-casa"].resposta, "Texto novo.");
  resultado.perguntas["familia-rotina-casa"].resposta = "Editado manualmente";
  assert.equal(resultado.perguntas["familia-rotina-casa"].resposta, "Editado manualmente");
  assert.equal(resultado.perguntas.identificacao, undefined);
});
test("prompt mantém transcrição extensa integral e todos os títulos", () => {
  const texto = "Relato sintético.\n".repeat(15000);
  const prompt = criarPromptEntrevista(texto);
  assert.ok(prompt.endsWith(texto));
  TITULOS_ENTREVISTA.forEach((titulo) => assert.ok(prompt.includes(titulo)));
  assert.ok(prompt.includes("Não informado."));
  assert.throws(() => criarPromptEntrevista("  "));
});
test("reconhece títulos numerados, markdown, acentos e conteúdo na mesma linha", () => {
  const a = analisar("### 1. **Saúde:** Relato A\ncontinuação\n2) ROTINA\nRelato B\n**Comunicação**\nRelato C");
  assert.deepEqual(a.secoes.map((s) => s.texto), ["Relato A\ncontinuação", "Relato B", "Relato C"]);
  assert.equal(a.desconhecidos.length, 0);
});
test("não descarta silenciosamente títulos desconhecidos nem introdução", () => {
  const a = analisar("Introdução\n## Título estranho\nRelato\nSaúde\nNão informado.");
  assert.equal(a.semTitulo, "Introdução");
  assert.equal(a.desconhecidos[0].texto, "Relato");
  assert.equal(a.secoes[0].texto, "Não informado.");
});
test("prévia agrupa destinos e mantém existente por padrão sem mutação", () => {
  const valores = { "observacoes:observacao-pedagogica": "Original" };
  const p = prepararPreviaEntrevista(analisar("Histórico escolar\nA\nHistórico familiar\nB"), destinos, valores);
  assert.equal(p.length, 1);
  assert.equal(p[0].escolha, "manter");
  assert.ok(p[0].novo.includes("Histórico familiar:\nB"));
  assert.deepEqual(confirmarPreviaEntrevista(p, valores), {});
  assert.equal(valores[p[0].id], "Original");
});
test("substituir e mesclar requerem escolha e preservam identificação protegida", () => {
  const item = { atual: "A", novo: "B", escolha: "mesclar" };
  assert.equal(resultadoImportacao(item), "A\n\nB");
  assert.equal(resultadoImportacao({ ...item, escolha: "substituir" }), "B");
  assert.equal(resultadoImportacao({ ...item, protegido: true }), "A");
  assert.equal(resultadoImportacao({ ...item, novo: "A" }), "A");
});
test("rejeita confirmação obsoleta sem aplicar alterações parciais", () => {
  const p = prepararPreviaEntrevista(analisar("Rotina\nNova"), destinos, {});
  assert.throws(() => confirmarPreviaEntrevista(p, { "familia-rotina-casa": "Editado depois" }), /nova prévia/);
});
test("aplicação altera somente destinos permitidos, mantém fonte e marca revisar", () => {
  const perguntas = { "familia-rotina-casa": { resposta: "A", fonte: "Família", status: "respondida" }, outro: { resposta: "Preservado" } };
  const observacoes = { "observacao-pedagogica": "Antes" };
  const valores = obterValoresEntrevista(perguntas, observacoes, "Identificação oficial");
  const p = prepararPreviaEntrevista(analisar("Rotina\nB\nIdentificação do estudante\nNome diferente\nSaúde\nNão informado."), destinos, valores);
  p.find((i) => i.id === "familia-rotina-casa").escolha = "mesclar";
  const resultado = aplicarEntrevista(perguntas, observacoes, confirmarPreviaEntrevista(p, valores));
  assert.deepEqual(resultado.perguntas["familia-rotina-casa"], { resposta: "A\n\nB", fonte: "Família", status: "revisar" });
  assert.equal(resultado.perguntas.outro, perguntas.outro);
  assert.deepEqual(resultado.observacoes, observacoes);
  assert.equal(perguntas["familia-rotina-casa"].resposta, "A");
  assert.throws(() => aplicarEntrevista(perguntas, observacoes, { identificacao: "Proibido" }));
});
