export const DIAS_AEE = [
  ["segunda", "Segunda"], ["terca", "Terça"], ["quarta", "Quarta"],
  ["quinta", "Quinta"], ["sexta", "Sexta"],
];
export const TURNOS_AEE = ["Manhã", "Tarde", "Noite"];

export function agendaDoAluno(aluno = {}) {
  return {
    turnoAee: aluno.turnoAee || "",
    diasAee: DIAS_AEE.map(([id]) => id).filter((id) => Array.isArray(aluno.diasAee) && aluno.diasAee.includes(id)),
    horaInicioAee: aluno.horaInicioAee || "",
    horaFimAee: aluno.horaFimAee || "",
  };
}

export function validarAgendaAee(aluno) {
  const agenda = agendaDoAluno(aluno);
  const { turnoAee, diasAee, horaInicioAee, horaFimAee } = agenda;
  if (!turnoAee && !diasAee.length && !horaInicioAee && !horaFimAee) return { ...agenda, atendimentosSemanaisAee: 0 };
  if (!TURNOS_AEE.includes(turnoAee) || !diasAee.length) throw new Error("Informe o turno do AEE e ao menos um dia da semana, ou deixe toda a agenda vazia.");
  if (![horaInicioAee, horaFimAee].every((h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h)) || horaInicioAee >= horaFimAee) throw new Error("Informe um horário final posterior ao inicial para o AEE.");
  return { ...agenda, atendimentosSemanaisAee: diasAee.length };
}

export function alunosPrevistosAee(alunos, turma, dia) {
  return [...new Map(alunos.filter((a) => a.id && a.turmaAee === turma && agendaDoAluno(a).diasAee.includes(dia)).map((a) => [a.id, a])).values()];
}

export function diaDaDataAee(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return "";
  const d = new Date(data + "T12:00:00");
  if (Number.isNaN(d.getTime()) || d.getFullYear() !== Number(data.slice(0, 4)) || d.getMonth() + 1 !== Number(data.slice(5, 7)) || d.getDate() !== Number(data.slice(8, 10))) return "";
  return ["", "segunda", "terca", "quarta", "quinta", "sexta", ""][d.getDay()];
}

// Contrato em memória para futura chamada/histórico. Não registra presença nem persiste.
export function prepararParticipantesAee(alunos, turma, dia, data, ids) {
  if (!dia || diaDaDataAee(data) !== dia) throw new Error("Escolha uma data correspondente ao dia da semana aberto.");
  const previstos = alunosPrevistosAee(alunos, turma, dia);
  const selecionados = [...new Set(ids)];
  if (!selecionados.length) throw new Error("Selecione ao menos um estudante.");
  if (selecionados.some((id) => !previstos.some((a) => a.id === id))) throw new Error("A agenda mudou. Revise os participantes do dia.");
  return {
    turmaAee: turma, diaSemanaAee: dia, dataAtendimento: data, alunoIds: selecionados,
    participantes: selecionados.map((id) => {
      const aluno = previstos.find((a) => a.id === id);
      const agenda = validarAgendaAee(aluno);
      return { alunoId: id, alunoNome: aluno.nome || "", professorAee: aluno.professorAee || "", turnoAee: agenda.turnoAee, horaInicioAee: agenda.horaInicioAee, horaFimAee: agenda.horaFimAee };
    }),
  };
}
