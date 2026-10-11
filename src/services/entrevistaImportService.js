// Pure, reusable text processing. No Firebase, network, persistence or AI dependencies.
export function normalizarTitulo(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function analisarRespostaEntrevista(resposta, titulos) {
  const conhecidos = new Map(titulos.map((titulo) => [normalizarTitulo(titulo), titulo]));
  const secoes = [];
  const desconhecidos = [];
  const semTitulo = [];
  let atual = null;
  for (const linha of String(resposta || "").split(/\r?\n/)) {
    const limpa = linha.trim().replace(/^#{1,6}\s*/, "").replace(/^[-•]\s+/, "")
      .replace(/^\d+[.)\-:]\s*/, "").replace(/\*\*|__/g, "");
    const separador = limpa.indexOf(":");
    const candidato = separador < 0 ? limpa : limpa.slice(0, separador);
    const titulo = conhecidos.get(normalizarTitulo(candidato));
    if (titulo) {
      atual = { titulo, linhas: separador < 0 ? [] : [limpa.slice(separador + 1).trim()] };
      secoes.push(atual);
    } else if (/^\s*#{1,6}\s+/.test(linha) || /^\s*\*\*[^*]+\*\*\s*:?[\s]*$/.test(linha)) {
      atual = { titulo: limpa, linhas: [] };
      desconhecidos.push(atual);
    } else if (atual) {
      atual.linhas.push(linha);
    } else if (linha.trim() && !/^\s*```\w*\s*$/.test(linha)) {
      semTitulo.push(linha);
    }
  }
  const limpar = (item) => ({ titulo: item.titulo, texto: item.linhas.filter((linha) => !/^\s*```\w*\s*$/.test(linha)).join("\n").trim() });
  return { secoes: secoes.map(limpar), desconhecidos: desconhecidos.map(limpar), semTitulo: semTitulo.join("\n").trim() };
}

export function prepararPreviaEntrevista(analise, destinos, valores) {
  const grupos = new Map();
  for (const secao of analise.secoes) {
    const destino = destinos[secao.titulo];
    if (!destino || !secao.texto) continue;
    if (!grupos.has(destino.id)) grupos.set(destino.id, { ...destino, titulos: [], partes: [], atual: valores[destino.id] || "" });
    const grupo = grupos.get(destino.id);
    if (!grupo.titulos.includes(secao.titulo)) grupo.titulos.push(secao.titulo);
    grupo.partes.push(destino.incluirTitulo ? `${secao.titulo}:\n${secao.texto}` : secao.texto);
  }
  return [...grupos.values()].map(({ partes, ...grupo }) => ({
    ...grupo, novo: partes.join("\n\n"), escolha: grupo.protegido || grupo.atual.trim() ? "manter" : "substituir",
  }));
}

export function resultadoImportacao(item) {
  if (item.protegido || item.escolha === "manter") return item.atual;
  if (item.escolha === "substituir") return item.novo;
  if (item.escolha === "mesclar") {
    return item.atual.trim() === item.novo.trim() ? item.atual : [item.atual, item.novo].filter((texto) => texto.trim()).join("\n\n");
  }
  throw new Error("Escolha inválida para a importação.");
}

export function confirmarPreviaEntrevista(previa, valoresAtuais) {
  const alteracoes = {};
  for (const item of previa) {
    if ((valoresAtuais[item.id] || "") !== item.atual) throw new Error("O Estudo de Caso foi alterado após a prévia. Gere uma nova prévia antes de confirmar.");
    const resultado = resultadoImportacao(item);
    if (!item.protegido && resultado !== item.atual) alteracoes[item.id] = resultado;
  }
  return alteracoes;
}
