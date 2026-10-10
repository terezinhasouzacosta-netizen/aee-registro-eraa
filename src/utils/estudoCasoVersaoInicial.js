const texto = (valor) => typeof valor === "string" ? valor.trim() : "";
const informado = (valor) => texto(valor) || "Não registrado na fonte consultada.";
const camposSondagem = ["leitura", "escrita", "matematica", "comunicacao", "interacaoSocial", "autonomia", "comportamento", "coordenacaoMotora", "atencaoConcentracao"];

function dataRegistro(item) {
  const valor = item.atualizadoEm || item.updatedAt || item.criadoEm || item.createdAt || item.dataSondagem || item.dataAtendimento;
  if (typeof valor?.seconds === "number") return valor.seconds * 1000;
  const data = Date.parse(valor);
  return Number.isFinite(data) ? data : 0;
}

function ordenar(lista, alunoId) {
  return (lista || []).filter((item) => item.alunoId === alunoId)
    .sort((a, b) => dataRegistro(b) - dataRegistro(a) || String(a.id).localeCompare(String(b.id)));
}

function referencia(modulo, item) {
  return item ? `${modulo}: registro ${item.id} (${dataRegistro(item) ? new Date(dataRegistro(item)).toISOString().slice(0, 10) : "sem data"}).` : `${modulo}: nenhum registro vinculado encontrado.`;
}

export function gerarVersaoInicial({ alunoId, aluno, sondagens, atendimentosAEE, paees, peis, familia = [] }) {
  if (!alunoId || aluno?.id !== alunoId) throw new Error("Selecione um aluno válido do Cadastro.");
  const sondagem = ordenar(sondagens, alunoId)[0];
  const paee = ordenar(paees, alunoId)[0];
  const pei = ordenar(peis, alunoId)[0];
  const atendimentos = ordenar(atendimentosAEE, alunoId);
  const sessoesAee = atendimentos.filter((item) => item.modoAtendimento === "AEE" || (!item.modoAtendimento && item.tipoAtendimento === "Atendimento na Sala AEE"));
  const presencas = sessoesAee.filter((item) => item.statusPresenca === "Presente").length;
  const ausencias = sessoesAee.filter((item) => item.statusPresenca === "Ausente").length;
  const justificadas = sessoesAee.filter((item) => item.statusPresenca === "Falta justificada").length;
  const avaliacoes = camposSondagem.filter((campo) => texto(sondagem?.[campo])).map((campo) => `${campo}: ${sondagem[campo]}`);
  const objetivos = (Array.isArray(pei?.objetivosMetas) ? pei.objetivosMetas : []).filter((item) => texto(item.objetivoMeta) || texto(item.resultadoEsperado)).map((item) => `Objetivo/meta: ${informado(item.objetivoMeta)}\nResultado esperado: ${informado(item.resultadoEsperado)}\nPrazo: ${informado(item.prazo)}`);
  const relatos = atendimentos.filter((item) => texto(item.avancosPercebidos) || texto(item.dificuldadesObservadas)).map((item) => `${referencia("Atendimento", item)}\nAvanços relatados: ${informado(item.avancosPercebidos)}\nDificuldades observadas: ${informado(item.dificuldadesObservadas)}`);
  const informacoesFamilia = familia.filter((item) => texto(item.resposta)).map((item) => `${item.pergunta}\n${texto(item.resposta)}`);
  return [
    "ESTUDO DE CASO — VERSÃO INICIAL PARA REVISÃO",
    "Compilação dos registros existentes, sem inferências ou avaliação automática. Sondagem, PAEE e PEI: registro mais recentemente atualizado. Atendimento e evolução: todos os registros vinculados disponíveis. Conferir períodos e validar com a equipe antes de concluir.",
    `1. IDENTIFICAÇÃO — CADASTRO\nNome: ${informado(aluno.nome)}\nTurma: ${informado(aluno.turma)}\nSérie/Ano: ${informado(aluno.serieAno)}\nDiagnóstico/condição informada: ${informado(aluno.diagnostico)}`,
    `2. POTENCIALIDADES E DIFICULDADES — SONDAGEM\n${referencia("Sondagem", sondagem)}\nSíntese registrada (potencialidades, habilidades e recomendações):\n${informado(sondagem?.encaminhamentos)}\nAvaliações registradas:\n${avaliacoes.join("\n") || "Não registradas."}\nObservações: ${informado(sondagem?.observacoes)}`,
    `3. FREQUÊNCIA E ESTRATÉGIAS — ATENDIMENTO AEE\n${sessoesAee.length} atendimento(s) AEE: ${presencas} presença(s), ${ausencias} ausência(s), ${justificadas} falta(s) justificada(s), ${sessoesAee.length - presencas - ausencias - justificadas} sem classificação de presença.\nEstratégias utilizadas: não há campo específico no Atendimento AEE atual. Conferir os registros e complementar na revisão.\n${sessoesAee.map((item) => `${referencia("Atendimento AEE", item)}\nObservações registradas: ${informado(item.observacoes)}`).join("\n\n") || "Sem atendimentos AEE vinculados."}`,
    `4. BARREIRAS E RECURSOS — PAEE\n${referencia("PAEE", paee)}\nBarreiras: ${informado(paee?.basePedagogica?.barreiras)}\nRecursos e tecnologia assistiva: ${informado(paee?.recursosTecnologiaAssistiva)}\nRecursos nos objetivos:\n${(Array.isArray(paee?.objetivos) ? paee.objetivos : []).map((item) => texto(item.recursos)).filter(Boolean).join("\n") || "Não registrados."}`,
    `5. OBJETIVOS E METAS — PEI\n${referencia("PEI", pei)}\n${objetivos.join("\n\n") || "Não registrados."}`,
    `6. EVOLUÇÃO — MONITORAMENTO\nO Monitoramento utiliza os registros de Atendimento. Relatos existentes, sem conclusão automática sobre evolução:\n${relatos.join("\n\n") || "Não há relatos de evolução vinculados."}`,
    `7. INFORMAÇÕES DA FAMÍLIA\nFonte: respostas do bloco Família/responsáveis deste Estudo de Caso; não há módulo de Entrevista disponível.\n${informacoesFamilia.join("\n\n") || "Entrevista/informações familiares pendentes."}`,
    "8. REVISÃO PEDAGÓGICA\nConferir as fontes, complementar os dados ausentes e revisar a versão inicial antes de utilizar como documento final.",
  ].join("\n\n");
}
