export const TURMAS_AEE = ["Turma A", "Turma B"];
export const STATUS_SEQUENCIA = ["Planejada", "Em andamento", "Concluída", "Pausada"];
export const PRESENCAS_AEE = ["Presente", "Ausente", "Falta justificada"];
export const CAMPOS_SEQUENCIA = {
  titulo: "Título", eixo: "Eixo", objetivoGeral: "Objetivo Geral", objetivosEspecificos: "Objetivos específicos",
  turma: "Turma", numeroEncontros: "Número de encontros", status: "Status", encontros: "Encontros",
  estrategias: "Estratégias", recursos: "Recursos", avaliacao: "Avaliação", observacoes: "Observações",
};
export const sequenciaInicial = () => Object.fromEntries(Object.keys(CAMPOS_SEQUENCIA).map((key) => [key, key === "status" ? "Planejada" : key === "numeroEncontros" ? "1" : ""]));
export function dataLocalAee() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function agruparTurmasAee(alunos) {
  return TURMAS_AEE.map((turma) => {
    const estudantes = [...new Map(alunos.filter((a) => a.turmaAee === turma).map((a) => [a.id, a])).values()];
    return { turma, estudantes, professoras: [...new Set(estudantes.map((a) => a.professorAee).filter(Boolean))], turnos: [...new Set(estudantes.map((a) => a.turno).filter(Boolean))] };
  });
}
export function validarSequenciaAee(form) {
  const result = Object.fromEntries(Object.keys(CAMPOS_SEQUENCIA).map((k) => [k, String(form[k] ?? "").trim()]));
  if (!result.titulo || !result.eixo || !result.objetivoGeral) throw new Error("Informe título, eixo e objetivo geral.");
  if (!TURMAS_AEE.includes(result.turma)) throw new Error("Selecione a turma AEE da sequência.");
  if (!STATUS_SEQUENCIA.includes(result.status)) throw new Error("Selecione um status válido.");
  const n = Number(result.numeroEncontros);
  if (!Number.isInteger(n) || n < 1 || n > 365) throw new Error("O número de encontros deve estar entre 1 e 365.");
  return { ...result, numeroEncontros: n };
}
export function planejamentoColetivoAee(form) {
  return Object.fromEntries(["objetivo", "eixoTematico", "estrategias", "recursos", "atividades", "avaliacaoGeral", "encaminhamentos"].map((campo) => [campo, String(form[campo] || "").trim()]));
}
export function execucaoAusenteAee() {
  return { ...planejamentoColetivoAee({}), habilidadesSelecionadas: [], habilidadesComplementares: "", habilidadesTrabalhadas: "", dificuldadesObservadas: "", avancosPercebidos: "" };
}
export function montarRegistrosColetivos(form, alunos, sequencia, responsavel) {
  if (!TURMAS_AEE.includes(form.turmaAee)) throw new Error("Turma inválida.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dataAtendimento) || Number.isNaN(Date.parse(form.dataAtendimento)) || new Date(form.dataAtendimento).toISOString().slice(0, 10) !== form.dataAtendimento) throw new Error("Data inválida.");
  if (!String(form.objetivo || "").trim() || !String(form.eixoTematico || "").trim()) throw new Error("Informe objetivo e eixo.");
  if (!alunos.length || alunos.length > 450 || new Set(alunos.map((a) => a.id)).size !== alunos.length) throw new Error("Lista de estudantes inválida.");
  if (alunos.some((a) => !a.id || a.turmaAee !== form.turmaAee)) throw new Error("O Cadastro mudou. Reabra a turma antes de registrar.");
  if (form.sequenciaId && (!sequencia || sequencia.id !== form.sequenciaId || sequencia.turma !== form.turmaAee)) throw new Error("Sequência incompatível com a turma.");
  const encontro = form.sequenciaId ? Number(form.encontroNumero) : 0;
  if (form.sequenciaId && (!Number.isInteger(encontro) || encontro < 1 || encontro > Number(sequencia.numeroEncontros))) throw new Error("Selecione um encontro válido da sequência.");
  return alunos.map((aluno) => {
    const individual = form.individuais?.[aluno.id];
    if (!individual || !PRESENCAS_AEE.includes(individual.statusPresenca)) throw new Error(`Informe a presença de ${aluno.nome}.`);
    return {
      alunoId: aluno.id, alunoNome: aluno.nome || "", turmaAee: form.turmaAee,
      professorAee: aluno.professorAee || "", turno: aluno.turno || "",
      dataAtendimento: form.dataAtendimento,
      diaSemanaAee: ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][new Date(`${form.dataAtendimento}T12:00:00Z`).getUTCDay()],
      mesReferencia: form.dataAtendimento.slice(0, 7),
      modoAtendimento: "AEE", tipoAtendimento: "Atendimento na Sala AEE", reposicao: Boolean(form.reposicao),
      statusPresenca: individual.statusPresenca, observacoes: String(individual.observacoes || "").trim(),
      objetivo: String(form.objetivo).trim(), eixoTematico: String(form.eixoTematico).trim(),
      estrategias: String(form.estrategias || "").trim(), recursos: String(form.recursos || "").trim(),
      atividades: String(form.atividades || "").trim(), avaliacaoGeral: String(form.avaliacaoGeral || "").trim(),
      encaminhamentos: String(form.encaminhamentos || "").trim(),
      habilidadesSelecionadas: [], habilidadesComplementares: String(form.atividades || "").trim(),
      habilidadesTrabalhadas: String(form.atividades || form.objetivo).trim(),
      dificuldadesObservadas: "", avancosPercebidos: "",
      versaoRegistroColetivo: 2,
      ...(individual.statusPresenca === "Presente" ? {} : execucaoAusenteAee()),
      sequenciaId: sequencia?.id || "", sequenciaTitulo: sequencia?.titulo || "", encontroNumero: encontro,
      responsavelId: responsavel.uid, responsavelNome: responsavel.displayName || responsavel.email || "", responsavelEmail: responsavel.email || "",
    };
  });
}
export function registrosAeeUnicos(registros) {
  return [...new Map(registros.filter((r) => {
    const modo = String(r.modoAtendimento || "").trim().toUpperCase();
    if (modo === "AEE") return true;
    if (modo === "REGULAR" || modo === "ACOMPANHAMENTO" || modo.includes("SALA REGULAR")) return false;
    return !String(r.tipoAtendimento || "").toLowerCase().includes("regular");
  }).map((r) => [r.id, r])).values()];
}
export function indicadoresSalaAee(registros, sequencias) {
  const r = registrosAeeUnicos(registros);
  const presentes = r.filter((i) => i.statusPresenca === "Presente").length;
  const faltas = r.filter((i) => i.statusPresenca === "Ausente" || i.statusPresenca === "Falta justificada").length;
  return { presentes, faltas, justificadas: r.filter((i) => i.statusPresenca === "Falta justificada").length,
    reposicoes: new Set(r.filter((i) => i.reposicao).map((i) => i.coletivoId || i.id)).size,
    frequencia: presentes + faltas ? Math.round(presentes / (presentes + faltas) * 100) : null,
    atendimentos: new Set(r.map((i) => i.coletivoId || i.id)).size,
    andamento: sequencias.filter((i) => i.status === "Em andamento").length, concluidas: sequencias.filter((i) => i.status === "Concluída").length };
}
export function frequenciaPorAlunoAee(alunos, registros) {
  const unicos = registrosAeeUnicos(registros);
  return alunos.map((aluno) => {
    const historico = unicos.filter((r) => r.alunoId === aluno.id).sort((a, b) => String(b.dataAtendimento || "").localeCompare(String(a.dataAtendimento || "")));
    const indicadores = indicadoresSalaAee(historico, []);
    return { aluno, historico, ...indicadores, semChamada: historico.filter((r) => !PRESENCAS_AEE.includes(r.statusPresenca)).length };
  });
}
export function historicoSequenciaAee(sequencia, registros) {
  const usos = registrosAeeUnicos(registros).filter((r) => r.sequenciaId === sequencia.id);
  const sessoes = [...new Map(usos.map((r) => [r.coletivoId || r.id, r])).values()].sort((a, b) => b.dataAtendimento.localeCompare(a.dataAtendimento));
  const encontros = new Set(usos.map((r) => Number(r.encontroNumero)).filter((n) => Number.isInteger(n) && n > 0 && n <= Number(sequencia.numeroEncontros)));
  return { sessoes, total: sessoes.length, encontros: encontros.size, progresso: Math.min(100, Math.round(encontros.size / Number(sequencia.numeroEncontros || 1) * 100)) };
}
