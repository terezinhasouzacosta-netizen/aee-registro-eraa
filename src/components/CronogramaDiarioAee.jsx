import { useState } from "react";
import { CalendarDays, Users, Clock3 } from "lucide-react";
import { DIAS_AEE, agendaDoAluno, alunosPrevistosAee, diaDaDataAee, prepararParticipantesAee } from "../utils/agendaAee";
import { dataLocalAee } from "../utils/salaRecursosAee";

export default function CronogramaDiarioAee({ turma, alunos, bloqueado }) {
  const [dia, setDia] = useState(() => diaDaDataAee(dataLocalAee()) || "segunda");
  const [data, setData] = useState(dataLocalAee);
  const [ids, setIds] = useState([]);
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState("");
  const previstos = alunosPrevistosAee(alunos, turma, dia);
  const validos = ids.filter((id) => previstos.some((a) => a.id === id));
  const pendentes = alunos.filter((a) => a.turmaAee === turma && !agendaDoAluno(a).diasAee.length).length;
  // A prévia deixa de ser exibida quando o Cadastro ou a seleção mudam.
  const assinatura = JSON.stringify({ alunos, dia, data, ids: validos });
  const resumo = previa?.assinatura === assinatura ? previa.dados : null;
  function preparar() {
    try { setPrevia({ assinatura, dados: prepararParticipantesAee(alunos, turma, dia, data, validos) }); setErro(""); }
    catch (error) { setPrevia(null); setErro(error.message); }
  }
  return <section className="srm-agenda-diaria" aria-label={"Agenda diária da " + turma}>
    <h4><CalendarDays aria-hidden="true" /> Cronograma individual por dia</h4>
    <p className="srm-caption">Cada estudante aparece somente nos dias cadastrados para ele. Selecionar participantes não registra presença.</p>
    <div className="srm-dias" aria-label={"Dias da " + turma}>{DIAS_AEE.map(([id, label]) => <button key={id} type="button" aria-pressed={dia === id} className={dia === id ? "btn-primary" : "btn-secondary"} onClick={() => { setDia(id); setIds([]); setPrevia(null); setErro(""); }}>{label}</button>)}</div>
    <label>Data do atendimento previsto — {turma}<input type="date" value={data} onChange={(e) => { setData(e.target.value); setIds([]); setPrevia(null); setErro(""); }} /></label>
    {diaDaDataAee(data) !== dia && <p className="srm-caption">Para preparar a lista, escolha uma data correspondente ao dia aberto.</p>}
    <dl className="srm-turma-numeros"><div><dt><Users aria-hidden="true" />Previstos no dia</dt><dd>{bloqueado ? "—" : previstos.length}</dd></div><div><dt>Selecionados</dt><dd>{validos.length}</dd></div></dl>
    {pendentes > 0 && <p className="srm-caption">{pendentes} estudante(s) sem dias de AEE definidos. Atualize o Cadastro para incluí-los na agenda diária.</p>}
    {!previstos.length && !bloqueado && <p>Nenhum estudante cadastrado para este dia.</p>}
    <ul className="srm-estudantes-lista">{previstos.map((a) => { const agenda = agendaDoAluno(a); return <li className="srm-estudante-linha" key={a.id}><label className="srm-participante"><input type="checkbox" disabled={bloqueado} checked={validos.includes(a.id)} onChange={(e) => { setIds(e.target.checked ? [...validos, a.id] : validos.filter((id) => id !== a.id)); setPrevia(null); setErro(""); }} /><span className="srm-estudante-dados"><strong>{a.nome}</strong><span>{a.professorAee || "Professor(a) não informado(a)"}</span><span><Clock3 aria-hidden="true" /> {agenda.turnoAee || "Turno AEE não informado"} · {agenda.horaInicioAee || "—"} às {agenda.horaFimAee || "—"}</span></span></label></li>; })}</ul>
    <button type="button" className="btn-secondary" disabled={bloqueado || !validos.length || diaDaDataAee(data) !== dia} onClick={preparar}>Preparar participantes — {turma}</button>
    {erro && <p role="alert">{erro}</p>}
    {resumo && <section className="srm-sequence-preview" aria-label={"Participantes preparados da " + turma}><h4>Participantes preparados</h4><p>{resumo.dataAtendimento} · {DIAS_AEE.find(([id]) => id === resumo.diaSemanaAee)?.[1]} · {resumo.participantes.length} estudante(s)</p><ul>{resumo.participantes.map((a) => <li key={a.alunoId}>{a.alunoNome} · {a.turnoAee} · {a.horaInicioAee} às {a.horaFimAee}</li>)}</ul><p className="srm-caption">Prévia local para a futura chamada e histórico. Nenhuma presença, falta, reposição ou atendimento foi gravado. Os indicadores existentes continuam usando apenas registros salvos.</p></section>}
  </section>;
}
