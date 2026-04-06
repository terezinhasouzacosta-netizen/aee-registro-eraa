const CAMPOS_SONDAGEM_DIFICULDADE = [
  "leitura",
  "escrita",
  "comunicacao",
  "matematica",
  "atencaoConcentracao",
  "interacaoSocial",
  "autonomia",
  "comportamento",
];

const RESULTADOS_INTERVENCAO = new Set([
  "realiza com muito apoio",
  "realiza com apoio",
  "realiza parcialmente",
  "alta dependencia",
  "compreendeu com muita ajuda",
  "manteve-se com apoio constante",
  "respondeu parcialmente",
]);

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function contarDificuldadesSondagem(sondagem) {
  if (!sondagem) return 0;
  return CAMPOS_SONDAGEM_DIFICULDADE.reduce((acc, campo) => {
    const valor = normalizarTexto(sondagem?.[campo]);
    return RESULTADOS_INTERVENCAO.has(valor) ? acc + 1 : acc;
  }, 0);
}

export function classificarNivelAtencaoPedagogica({
  possuiSondagem,
  totalHabilidades,
  habilidadesEmAndamento,
  habilidadesPausadas,
  possuiAtendimentoAEERecente,
  possuiAcompanhamentoRecente,
  totalDificuldadesSondagem,
  totalRegistrosDificuldades,
  totalRegistrosAvancos,
}) {
  let scoreAtencao = 0;
  const motivosRisco = [];

  if (!possuiSondagem) {
    scoreAtencao += 3;
    motivosRisco.push("sem sondagem");
  }

  if (totalHabilidades <= 0) {
    scoreAtencao += 2;
    motivosRisco.push("sem habilidades");
  }

  if (!possuiAtendimentoAEERecente) {
    scoreAtencao += 2;
    motivosRisco.push("sem atendimento AEE recente");
  }

  if (!possuiAcompanhamentoRecente) {
    scoreAtencao += 2;
    motivosRisco.push("sem acompanhamento recente");
  }

  if (totalDificuldadesSondagem >= 4) {
    scoreAtencao += 3;
    motivosRisco.push("muitas dificuldades na sondagem");
  }

  if (habilidadesPausadas > 0) {
    scoreAtencao += 2;
    motivosRisco.push("habilidades pausadas");
  }

  const muitosRegistrosDificuldades =
    totalRegistrosDificuldades >= 3 && totalRegistrosDificuldades > totalRegistrosAvancos;
  if (muitosRegistrosDificuldades) {
    scoreAtencao += 2;
    motivosRisco.push("muitos registros de dificuldades");
  }

  if (possuiAtendimentoAEERecente) scoreAtencao -= 1;
  if (possuiAcompanhamentoRecente) scoreAtencao -= 1;
  if (totalRegistrosAvancos > 0) scoreAtencao -= 2;
  if (habilidadesEmAndamento > 0) scoreAtencao -= 1;

  let nivelAtencao = "Baixo";
  if (scoreAtencao >= 6) nivelAtencao = "Alto";
  else if (scoreAtencao >= 3) nivelAtencao = "Medio";

  return {
    scoreAtencao,
    nivelAtencao,
    nivelAtencaoLabel: nivelAtencao === "Medio" ? "Médio" : nivelAtencao,
    motivosRisco,
  };
}

