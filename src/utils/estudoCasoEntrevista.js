const observacoes = { id: "observacoes:observacao-pedagogica", label: "Observação pedagógica escolar → Observações complementares", incluirTitulo: true };
const pergunta = (id, label) => ({ id, label });

export const DESTINOS_ENTREVISTA_ESTUDO = {
  "Identificação do estudante": { id: "identificacao", label: "Identificação do estudante — Cadastro oficial (somente conferência)", protegido: true },
  "Histórico escolar": observacoes,
  "Histórico familiar": observacoes,
  "Desenvolvimento": observacoes,
  "Comunicação": pergunta("escuta-estudante-expressa-necessidades", "Escuta do estudante → Expressa necessidades, desejos e interesses?"),
  "Interação social": pergunta("professor-regente-interacao-colegas", "Professor regente → Como interage com os colegas?"),
  "Autonomia": observacoes,
  "Saúde": pergunta("familia-saude-consideracoes", "Família/responsáveis → Informações sobre saúde"),
  "Rotina": pergunta("familia-rotina-casa", "Família/responsáveis → Rotina em casa"),
  "Interesses": pergunta("informacoes-aee-interesses-ponto-partida", "Informações do AEE → Interesses como ponto de partida"),
  "Potencialidades": pergunta("informacoes-aee-potencialidades-aee", "Informações do AEE → Potencialidades"),
  "Dificuldades": pergunta("professor-regente-dificuldades", "Professor regente → Atividades com dificuldade"),
  "Recursos utilizados": pergunta("barreiras-apoios-recursos-acessibilidade", "Barreiras, apoios e acessibilidade → Recursos de acessibilidade"),
  "Estratégias já adotadas": pergunta("professor-regente-estrategias-funcionaram", "Professor regente → Estratégias já utilizadas em sala comum"),
  "Participação da família": pergunta("familia-participacao-familia", "Família/responsáveis → Participação"),
  "Necessidades observadas": pergunta("informacoes-aee-necessidades-especificas", "Informações do AEE → Necessidades específicas"),
  "Observações relevantes": observacoes,
};

export function obterValoresEntrevista(perguntas, observacoesObjetivas, identificacao) {
  return Object.fromEntries(Object.values(DESTINOS_ENTREVISTA_ESTUDO).map(({ id }) => [id,
    id === "identificacao" ? identificacao
      : id.startsWith("observacoes:") ? observacoesObjetivas[id.slice(12)] || ""
        : perguntas[id]?.resposta || "",
  ]));
}

export function aplicarEntrevista(perguntas, observacoesObjetivas, alteracoes) {
  const novasPerguntas = { ...perguntas };
  const novasObservacoes = { ...observacoesObjetivas };
  const permitidos = new Set(Object.values(DESTINOS_ENTREVISTA_ESTUDO).filter((destino) => !destino.protegido).map((destino) => destino.id));
  for (const [id, resposta] of Object.entries(alteracoes)) {
    if (!permitidos.has(id)) throw new Error("Destino de importação inválido.");
    if (id.startsWith("observacoes:")) novasObservacoes[id.slice(12)] = resposta;
    else novasPerguntas[id] = { ...perguntas[id], resposta, status: "revisar" };
  }
  return { perguntas: novasPerguntas, observacoes: novasObservacoes };
}
