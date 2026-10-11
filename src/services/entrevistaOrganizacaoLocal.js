import { normalizarTitulo } from "./entrevistaImportService.js";

// Conservative local rules: retain verbatim paragraphs and never infer answers.
const REGRAS = [
  ["Histórico escolar", /\b(matricul|transferencia|escola anterior|historico escolar|reprov)/],
  ["Histórico familiar", /\b(mora com|vive com|composicao familiar|historico familiar)/],
  ["Desenvolvimento", /\b(desenvolvimento|comecou a andar|aprendeu a andar|primeiras palavras)/],
  ["Comunicação", /\b(comunic|expressa|gestos|fala|falar)/],
  ["Interação social", /\b(colegas|amigos|interacao social|interage|socializ)/],
  ["Autonomia", /\b(autonomia|sozinho|sozinha|independen)/],
  ["Saúde", /\b(saude|medicacao|medicamento|sono|dorme|alimentacao|sensibilidade|diagnostico)/],
  ["Rotina", /\b(rotina|dia a dia|horarios)/],
  ["Interesses", /\b(gosta de|prefere|interesses|preferidas|preferidos)/],
  ["Potencialidades", /\b(potencialidades|facilidade|pontos fortes|habilidade consolidada)/],
  ["Dificuldades", /\b(dificuldade|dificuldades|dificil)/],
  ["Recursos utilizados", /\b(recurso|recursos|material adaptado|materiais adaptados|tecnologia assistiva)/],
  ["Estratégias já adotadas", /\b(estrategia|estrategias|ja utilizado|ja utilizada|funcionou|funcionaram)/],
  ["Participação da família", /\b(participacao da familia|familia participa|responsavel participa|reunioes)/],
  ["Necessidades observadas", /\b(necessita|necessidade|necessidades|precisa de apoio)/],
];

export function organizarTranscricaoLocal(texto, titulos) {
  const conhecidos = new Map(titulos.map((titulo) => [normalizarTitulo(titulo), titulo]));
  const trechos = [];
  let tituloAtual = "";
  for (const linha of String(texto || "").split(/\r?\n/)) {
    if (!linha.trim()) continue;
    const limpa = linha.trim().replace(/^#{1,6}\s*/, "").replace(/^\d+[.)]\s*/, "").replace(/\*\*|__/g, "");
    const separador = limpa.indexOf(":");
    const titulo = conhecidos.get(normalizarTitulo(separador < 0 ? limpa : limpa.slice(0, separador)));
    if (titulo) {
      tituloAtual = titulo;
      const conteudo = separador < 0 ? "" : linha.slice(linha.indexOf(":") + 1).replace(/^\*\*\s*/, "").trim();
      if (conteudo) trechos.push({ texto: conteudo, titulo, motivo: "Título reconhecido" });
      continue;
    }
    // Unknown explicit headings end the previous section to avoid misattribution.
    if (/^\s*#{1,6}\s|^\s*\*\*[^*]+\*\*\s*$/.test(linha)) tituloAtual = "";
    const correspondencias = tituloAtual ? [tituloAtual] : REGRAS.filter(([nome, regra]) => conhecidos.has(normalizarTitulo(nome)) && regra.test(normalizarTitulo(linha))).map(([nome]) => nome);
    trechos.push({ texto: linha, titulo: correspondencias.length === 1 ? correspondencias[0] : "", motivo: tituloAtual ? "Título reconhecido" : correspondencias.length === 1 ? "Palavras-chave — revisar o destino" : correspondencias.length > 1 ? "Mais de um tema — escolha o destino" : "Tema não identificado — escolha o destino" });
  }
  return trechos;
}

export function analisarTrechosLocais(trechos) {
  return { secoes: trechos.filter((trecho) => trecho.titulo).map(({ titulo, texto }) => ({ titulo, texto })), desconhecidos: [], semTitulo: "" };
}

export function perguntaSemInformacao(resposta) {
  const valor = normalizarTitulo(resposta);
  return !valor || /^(nao informad[oa]|nao ha informacoes|sem informacao)$/.test(valor);
}
