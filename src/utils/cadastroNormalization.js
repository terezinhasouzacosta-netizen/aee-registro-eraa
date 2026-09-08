const ROTULO_NAO_INFORMADO = "Não informado";
const ROTULO_REVISAO_MANUAL = "Revisão manual necessária";

function limparTexto(valor) {
  return String(valor ?? "").trim();
}

function prepararComparacao(valor) {
  return limparTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function extrairAnoEscolar(valor) {
  const texto = prepararComparacao(valor);
  const correspondencia = texto.match(/(?:^|\s)([6-9])\s*[º°]?\s*(?:ANO)?(?:\s|$)/);
  return correspondencia?.[1] || "";
}

function extrairLetraTurma(valor) {
  const texto = prepararComparacao(valor);
  const correspondencia = texto.match(/(?:^|\s)([A-D])$/);
  return correspondencia?.[1] || "";
}

function ehEja(valor) {
  return /(?:^|\s)EJA(?:\s|$)/.test(prepararComparacao(valor));
}

function prepararValorParaAssinatura(valor) {
  if (valor === undefined) return { __tipo: "undefined" };
  if (valor === null || typeof valor !== "object") return valor;

  if (valor instanceof Date) {
    return { __tipo: "data", valor: valor.toISOString() };
  }

  if (typeof valor.toMillis === "function") {
    return { __tipo: "timestamp", valor: valor.toMillis() };
  }

  if (typeof valor.path === "string") {
    return { __tipo: "referencia", valor: valor.path };
  }

  if (Array.isArray(valor)) {
    return valor.map(prepararValorParaAssinatura);
  }

  return Object.keys(valor)
    .sort()
    .reduce((resultado, chave) => {
      resultado[chave] = prepararValorParaAssinatura(valor[chave]);
      return resultado;
    }, {});
}

export function criarAssinaturaCadastro(aluno = {}) {
  const dadosCadastro = { ...aluno };
  delete dadosCadastro.id;
  return JSON.stringify(prepararValorParaAssinatura(dadosCadastro));
}

export function sugerirTurmaPadronizada(turmaAtual, serieAnoAtual = "") {
  const turma = prepararComparacao(turmaAtual);
  const serieAno = prepararComparacao(serieAnoAtual);

  if (!turma) return null;

  if (ehEja(turma)) {
    if (turma.includes("NOTURNO") || turma.includes("IV ETAPA")) {
      return "EJA Noturno";
    }
    return null;
  }

  const anoDaTurma = extrairAnoEscolar(turma);
  const letraDaTurma = extrairLetraTurma(turma);

  if (anoDaTurma && letraDaTurma) {
    return `${anoDaTurma}º Ano ${letraDaTurma}`;
  }

  const turmaSomenteLetra = turma.match(/^([A-D])$/)?.[1] || "";
  const anoDaSerie = extrairAnoEscolar(serieAno);
  const letraDaSerie = extrairLetraTurma(serieAno);

  if (turmaSomenteLetra && anoDaSerie && !letraDaSerie) {
    return `${anoDaSerie}º Ano ${turmaSomenteLetra}`;
  }

  return null;
}

export function sugerirSerieAno(turmaPadronizadaOuAtual) {
  const turma = limparTexto(turmaPadronizadaOuAtual);

  if (ehEja(turma)) return "EJA";

  const ano = extrairAnoEscolar(turma);
  return ano ? `${ano}º Ano` : null;
}

export function analisarAtualizacaoCadastros(alunos = []) {
  const alteracoes = [];
  const registrosManuais = new Set();
  let turmasNormalizadas = 0;
  let seriesSugeridas = 0;
  let turnosSugeridos = 0;

  alunos.forEach((aluno) => {
    const alunoId = aluno.id || aluno.nome || `registro-${registrosManuais.size + 1}`;
    const alunoNome = limparTexto(aluno.nome) || "Aluno sem nome informado";
    const turmaAtual = limparTexto(aluno.turma);
    const serieAnoAtual = limparTexto(aluno.serieAno);
    const turnoAtual = limparTexto(aluno.turno);
    const turmaSugerida = sugerirTurmaPadronizada(turmaAtual, serieAnoAtual);
    const assinaturaPrevia = criarAssinaturaCadastro(aluno);

    if (turmaSugerida && turmaSugerida !== turmaAtual) {
      turmasNormalizadas += 1;
      alteracoes.push({
        alteracaoId: `${alunoId}-turma`,
        alunoId,
        alunoNome,
        assinaturaPrevia,
        campo: "turma",
        campoRotulo: "Turma",
        valorAtual: turmaAtual || ROTULO_NAO_INFORMADO,
        valorSugerido: turmaSugerida,
        motivo:
          "Padronização segura de espaços, ordinal, capitalização e uso da palavra “Ano”.",
        status: "Aprovado",
        turmaReferencia: turmaSugerida,
        serieReferencia: sugerirSerieAno(turmaSugerida) || serieAnoAtual || ROTULO_NAO_INFORMADO,
      });
    }

    const referenciaParaSerie = turmaSugerida || turmaAtual;
    const serieSugerida = sugerirSerieAno(referenciaParaSerie);

    if (!serieAnoAtual && serieSugerida) {
      seriesSugeridas += 1;
      alteracoes.push({
        alteracaoId: `${alunoId}-serieAno`,
        alunoId,
        alunoNome,
        assinaturaPrevia,
        campo: "serieAno",
        campoRotulo: "Série/Ano",
        valorAtual: ROTULO_NAO_INFORMADO,
        valorSugerido: serieSugerida,
        motivo: "Série/Ano ausente e identificada com segurança a partir da turma.",
        status: "Aprovado",
        turmaReferencia: turmaSugerida || turmaAtual || ROTULO_NAO_INFORMADO,
        serieReferencia: serieSugerida,
      });
    }

    const ehTurmaEjaNoturno = turmaSugerida === "EJA Noturno";
    if (!turnoAtual && ehTurmaEjaNoturno) {
      turnosSugeridos += 1;
      alteracoes.push({
        alteracaoId: `${alunoId}-turno`,
        alunoId,
        alunoNome,
        assinaturaPrevia,
        campo: "turno",
        campoRotulo: "Turno",
        valorAtual: ROTULO_NAO_INFORMADO,
        valorSugerido: "Noturno",
        motivo: "Turno ausente em turma identificada explicitamente como EJA Noturno.",
        status: "Aprovado",
        turmaReferencia: "EJA Noturno",
        serieReferencia: serieAnoAtual || "EJA",
      });
    }

    const turmaPrecisaRevisao = !turmaSugerida;
    const seriePrecisaRevisao = !serieAnoAtual && !serieSugerida;

    if (turmaPrecisaRevisao) {
      alteracoes.push({
        alteracaoId: `${alunoId}-turma-revisao`,
        alunoId,
        alunoNome,
        assinaturaPrevia,
        campo: "turma",
        campoRotulo: "Turma",
        valorAtual: turmaAtual || ROTULO_NAO_INFORMADO,
        valorSugerido: ROTULO_REVISAO_MANUAL,
        motivo: turmaAtual
          ? "A turma informada não corresponde com segurança a um padrão reconhecido."
          : "A turma não está informada e não pode ser inferida automaticamente.",
        status: "Revisão Manual",
        turmaReferencia: turmaAtual || ROTULO_NAO_INFORMADO,
        serieReferencia: serieAnoAtual || ROTULO_NAO_INFORMADO,
      });
    }

    if (seriePrecisaRevisao) {
      alteracoes.push({
        alteracaoId: `${alunoId}-serieAno-revisao`,
        alunoId,
        alunoNome,
        assinaturaPrevia,
        campo: "serieAno",
        campoRotulo: "Série/Ano",
        valorAtual: ROTULO_NAO_INFORMADO,
        valorSugerido: ROTULO_REVISAO_MANUAL,
        motivo: "Série/Ano ausente e sem turma que permita inferência segura.",
        status: "Revisão Manual",
        turmaReferencia: turmaAtual || ROTULO_NAO_INFORMADO,
        serieReferencia: ROTULO_NAO_INFORMADO,
      });
    }

    if (turmaPrecisaRevisao || seriePrecisaRevisao) {
      registrosManuais.add(alunoId);
    }
  });

  return {
    totalAlunos: alunos.length,
    alunosAfetados: new Set(
      alteracoes.filter((item) => item.status === "Aprovado").map((item) => item.alunoId)
    ).size,
    turmasNormalizadas,
    seriesSugeridas,
    turnosSugeridos,
    registrosEdicaoManual: registrosManuais.size,
    registrosManuais: [...registrosManuais],
    alteracoes,
  };
}
