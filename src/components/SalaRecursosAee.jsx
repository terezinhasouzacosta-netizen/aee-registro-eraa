import { prepararParticipantesAee } from "../utils/agendaAee";
import CronogramaDiarioAee from "./CronogramaDiarioAee";
import { CalendarDays, ClipboardPen, BookOpen, History, BarChart3, UserRound, Users, CircleCheck, CircleX, Clock3, GraduationCap, SunMedium, Sunset } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { listarSequenciasAee, listarCronogramasAee, listarRegistrosSalaAee, salvarCronogramaAee } from "../services/salaRecursosAeeService";
import { agruparTurmasAee, dataLocalAee, indicadoresSalaAee, historicoSequenciaAee, frequenciaPorAlunoAee } from "../utils/salaRecursosAee";
import SequenciaDidaticaAee from "./SequenciaDidaticaAee";
import RegistroColetivoAee from "./RegistroColetivoAee";
import "./SalaRecursosAee.css";

const ABAS = [["cronograma", "Cronograma", CalendarDays], ["coletivo", "Registro Coletivo", ClipboardPen], ["sequencias", "Sequências Didáticas", BookOpen], ["historico", "Histórico das Sequências", History], ["indicadores", "Indicadores", BarChart3], ["individual", "Registro individual e histórico", UserRound]];
function HorarioTurma({ turma, horario, perfil, podeEditar, onSaved }) {
  const [form, setForm] = useState(() => ({ dias: horario?.dias || "", inicio: horario?.inicio || "", fim: horario?.fim || "" }));
  const [erro, setErro] = useState(""); const [salvando, setSalvando] = useState(false);
  return <details><summary>Configurar horário — {turma}</summary><form onSubmit={async (e) => { e.preventDefault(); if (!podeEditar || salvando) return; setSalvando(true); setErro(""); try { await salvarCronogramaAee(turma, form, perfil); await onSaved(); } catch (error) { setErro(error.message); } finally { setSalvando(false); } }}>
    <fieldset disabled={!podeEditar || salvando}><label>Dias — {turma}<input required placeholder="Ex.: segunda e quarta" value={form.dias} onChange={(e) => setForm({ ...form, dias: e.target.value })} /></label><div className="srm-grid"><label>Início — {turma}<input type="time" required value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></label><label>Fim — {turma}<input type="time" required value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} /></label></div><button type="submit" className="btn-secondary">Salvar horário</button></fieldset>{erro && <p role="alert">{erro}</p>}
  </form></details>;
}
function preparacaoValida(preparada, alunos, turma) {
  const agenda = preparada?.agenda;
  if (!agenda || preparada.turma !== turma || agenda.turmaAee !== turma) return false;
  try {
    const atual = prepararParticipantesAee(alunos, turma, agenda.diaSemanaAee, agenda.dataAtendimento, agenda.alunoIds);
    return JSON.stringify(atual) === JSON.stringify(agenda);
  } catch { return false; }
}
export default function SalaRecursosAee({ alunos, loadingAlunos, perfil, podeEditar, currentUser, onSequenciasChange, onRegistroSalvo, revisao, children }) {
  const [aba, setAba] = useState("cronograma"); const [sequencias, setSequencias] = useState([]); const [horarios, setHorarios] = useState([]); const [registros, setRegistros] = useState([]);
  const [erro, setErro] = useState(""); const [loading, setLoading] = useState(true); const [versao, setVersao] = useState(0); const [turmaAberta, setTurmaAberta] = useState(null);
  const [preparacoes, setPreparacoes] = useState({});
  const [erroParticipantes, setErroParticipantes] = useState("");
  const [consultaTurma, setConsultaTurma] = useState("");
  const [mes, setMes] = useState(() => dataLocalAee().slice(0, 7));
  const oficial = db.app.options.projectId === "aee-registro-eraa";
  const atualizar = () => setVersao((v) => v + 1);
  useEffect(() => {
    let ativo = true; if (loadingAlunos || !currentUser || !oficial) return;
    setLoading(true); setErro("");
    Promise.all([listarSequenciasAee(), listarCronogramasAee(), listarRegistrosSalaAee(alunos.map((a) => a.id))]).then(([s, h, r]) => {
      if (!ativo) return; setSequencias(s); onSequenciasChange(s); setHorarios(h); setRegistros(r);
    }).catch((e) => { if (ativo) setErro(`Não foi possível carregar a organização da sala: ${e.message}`); }).finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [alunos, loadingAlunos, currentUser, oficial, versao, revisao, onSequenciasChange]);
  function prepararTurma(turma, agenda, iniciar = false) {
    const preparada = agenda ? { turma, alunos: alunos.filter((a) => a.turmaAee === turma && agenda.alunoIds.includes(a.id)), agenda, chave: crypto.randomUUID() } : { pendente: true };
    setPreparacoes((atuais) => ({ ...atuais, [turma]: preparada }));
    setTurmaAberta((atual) => iniciar ? (preparacaoValida(preparada, alunos, turma) ? preparada : null) : atual?.turma === turma ? null : atual);
    if (iniciar) { setConsultaTurma(""); setAba("coletivo"); }
    setErroParticipantes("");
  }
  function abrirTurma(turma) {
    setConsultaTurma("");
    const preparada = preparacoes[turma];
    if (!preparacaoValida(preparada, alunos, turma)) { setTurmaAberta(null); setErroParticipantes("Prepare novamente os participantes desta turma antes de iniciar o atendimento."); return; }
    setTurmaAberta(preparada);
    setErroParticipantes("");
    setAba("coletivo");
  }
  const sessaoValida = preparacaoValida(turmaAberta, alunos, turmaAberta?.turma);
  const turmas = agruparTurmasAee(alunos);
  const filtrados = registros.filter((r) => !mes || String(r.dataAtendimento || "").startsWith(mes));
  const metricas = indicadoresSalaAee(filtrados, sequencias);
  const frequencias = frequenciaPorAlunoAee(alunos, filtrados);
  const bloqueado = loading || loadingAlunos || Boolean(erro) || !oficial;
  const motivoBloqueioRegistro = !oficial ? "Salvamento bloqueado: ambiente institucional incorreto."
    : erro ? "Salvamento temporariamente bloqueado: não foi possível carregar os dados da sala. Use Tentar novamente no aviso acima e aguarde a atualização."
    : loading || loadingAlunos ? "Salvamento temporariamente bloqueado: carregando os dados da sala. Aguarde a conclusão."
    : !podeEditar ? "Seu perfil não permite salvar este atendimento." : "";
  // Consulta usa somente registros já carregados para os alunos autorizados.
  const coletivosConsulta = new Map();
  registros.filter((r) => r.coletivoId && r.alunoId && r.turmaAee === consultaTurma && alunos.some((a) => a.id === r.alunoId)).forEach((r) => {
    if (!coletivosConsulta.has(r.coletivoId)) coletivosConsulta.set(r.coletivoId, []);
    coletivosConsulta.get(r.coletivoId).push(r);
  });
  const hoje = dataLocalAee();
  const registrosHoje = registros.filter((r) => r.dataAtendimento === hoje);
  const resumoHoje = indicadoresSalaAee(registrosHoje, sequencias);
  const professores = [...new Set(turmas.flatMap((t) => t.professoras))];
  const turnos = [...new Set(turmas.flatMap((t) => t.estudantes.map((a) => a.turnoAee).filter(Boolean)))];
  return <div className="srm-aee dashboard-aee-page">
    <header className="srm-hero dashboard-hero"><div><span className="dashboard-hero-badge">ATENDIMENTO AEE</span><h2 className="dashboard-hero-greeting">Central da Sala de Recursos</h2><p className="dashboard-hero-tagline">Planejamento, encontros e acompanhamento em um só lugar.</p></div><span className="srm-hero-tag">Organização pedagógica</span></header>
    <dl className="srm-resumo dashboard-stats-grid" aria-label="Resumo da Sala AEE">
      {[[CalendarDays, "Data atual", new Date(hoje + "T12:00:00").toLocaleDateString("pt-BR"), "azul"], [Users, "Estudantes nas turmas AEE", loadingAlunos ? "Carregando…" : turmas.reduce((n, t) => n + t.estudantes.length, 0), "violeta"], [CircleCheck, "Presentes hoje", bloqueado ? "Indisponível" : resumoHoje.presentes, "verde"], [CircleX, "Faltas hoje", bloqueado ? "Indisponível" : resumoHoje.faltas, "vermelho"], [GraduationCap, professores.length > 1 ? "Professoras do AEE" : "Professor(a)", loadingAlunos ? "Carregando…" : professores.length ? professores.map((nome) => <span key={nome}>{nome}</span>) : "Não informado", "laranja"], [Clock3, "Turno do AEE", loadingAlunos ? "Carregando…" : turnos.length ? turnos.map((turno) => <span key={turno}>{turno}</span>) : "Não informado", "azul"]].map(([Icone, titulo, valor, cor]) => <div key={titulo} className={"panel stat-card dashboard-card dashboard-stat-card srm-resumo-card srm-cor-" + cor}><dt><span className="dashboard-card-icon" aria-hidden="true"><Icone /></span><span>{titulo}</span></dt><dd className={Icone === GraduationCap || Icone === Clock3 ? "srm-resumo-texto" : undefined}>{valor}</dd></div>)}
    </dl><p className="srm-caption">Presenças e faltas de hoje contam participações registradas; faltas justificadas estão incluídas nas faltas.</p>
    <nav className="srm-tabs" aria-label="Abas do Atendimento AEE">{ABAS.map(([key, label, Icone]) => <button type="button" key={key} aria-current={aba === key ? "page" : undefined} className={"dashboard-quick-action " + (aba === key ? "is-active" : "")} onClick={() => setAba(key)}><span className="dashboard-quick-action-icon" aria-hidden="true"><Icone /></span><span>{label}</span></button>)}</nav>
    {erroParticipantes && <p role="alert">{erroParticipantes}</p>}
    {!oficial && <p role="alert">Módulo bloqueado: utilize exclusivamente o Firebase aee-registro-eraa.</p>}
    <div hidden={aba !== "individual"}>{children}</div>
    <div hidden={aba === "individual"}>
      {loading || loadingAlunos ? <p role="status">Carregando organização da sala...</p> : null}
      {erro && <p role="alert">{erro} Os indicadores não serão apresentados como zero. <button type="button" onClick={atualizar}>Tentar novamente</button></p>}
      {<section hidden={aba !== "cronograma"} aria-label="Cronograma de Atendimento"><h2>Cronograma de Atendimento</h2><p>A agenda diária utiliza os dias e horários individuais do Cadastro. O horário geral legado não define a agenda dos estudantes. Alunos sem Turma AEE definida: {alunos.filter((a) => !["Turma A", "Turma B"].includes(a.turmaAee)).length}.</p>
        <div className="srm-cards">{turmas.map((t) => { const h = horarios.find((item) => item.turma === t.turma); const dia = indicadoresSalaAee(registrosHoje.filter((r) => r.turmaAee === t.turma || (!r.turmaAee && t.estudantes.some((a) => a.id === r.alunoId))), sequencias); return <article className={"panel dashboard-card dashboard-section-card srm-turma " + (t.turma === "Turma A" ? "srm-turma-a" : "srm-turma-b")} key={t.turma}><div className="srm-turma-heading"><span className="srm-turma-icon dashboard-icon-badge" aria-hidden="true">{t.turma === "Turma A" ? <SunMedium /> : <Sunset />}</span><div><span className="srm-eyebrow">SALA DE RECURSOS</span><h3>{t.turma}</h3></div></div><dl className="srm-turma-numeros"><div><dt><Users aria-hidden="true" />Estudantes</dt><dd>{t.estudantes.length}</dd></div><div><dt><CircleCheck aria-hidden="true" />Presentes hoje</dt><dd>{bloqueado ? "—" : dia.presentes}</dd></div><div><dt><CircleX aria-hidden="true" />Faltas hoje</dt><dd>{bloqueado ? "—" : dia.faltas}</dd></div></dl><p><strong>Professor(a) do AEE:</strong> {t.professoras.join("; ") || "Não informado no Cadastro"}</p><p><strong>Turno do AEE:</strong> {[...new Set(t.estudantes.map((a) => a.turnoAee).filter(Boolean))].join("; ") || "Não informado"}</p><p><strong>Horário geral da turma (legado):</strong> {h ? `${h.dias} · ${h.inicio} às ${h.fim}` : "Não configurado"}</p><p><strong>Total de estudantes:</strong> {t.estudantes.length}</p><details><summary>Todos os estudantes da turma</summary><ul className="srm-estudantes-lista" aria-label={"Estudantes da " + t.turma}>{t.estudantes.map((a) => <li className="srm-estudante-linha" key={a.id}><span className="srm-estudante-icone" aria-hidden="true"><UserRound /></span><div className="srm-estudante-dados"><strong>{a.nome}</strong><span>{a.professorAee || "Professor(a) não informado(a)"}</span></div></li>)}</ul></details><CronogramaDiarioAee turma={t.turma} alunos={t.estudantes} bloqueado={bloqueado || !podeEditar} onPreparar={(agenda) => prepararTurma(t.turma, agenda)} onIniciar={(agenda) => prepararTurma(t.turma, agenda, true)} />{!t.estudantes.length && <p>Defina a Turma AEE no Cadastro para incluir estudantes.</p>}<button type="button" className="btn-primary" disabled={bloqueado} onClick={() => { setConsultaTurma(t.turma); setErroParticipantes(""); setAba("coletivo"); }}>Registro coletivo existente — {t.turma}</button><button type="button" className="btn-secondary" disabled={bloqueado || !podeEditar} onClick={() => abrirTurma(t.turma)}>Abrir atendimento preparado — {t.turma}</button><HorarioTurma key={`${t.turma}-${h?.inicio}-${h?.fim}-${h?.dias}`} turma={t.turma} horario={h} perfil={perfil} podeEditar={podeEditar && !bloqueado} onSaved={atualizar} /></article>; })}</div>
      </section>}
      <div hidden={aba !== "coletivo"}>
        {consultaTurma && <section className="panel dashboard-card dashboard-section-card" aria-label="Consulta de registros coletivos">
          <h2>Registros coletivos existentes — {consultaTurma}</h2>
          <p>Consulta somente leitura dos registros disponíveis para seu acesso. A preparação no Cronograma é exigida apenas para um novo atendimento.</p>
          {bloqueado ? <p role="status">Consulta indisponível enquanto os registros não forem carregados com segurança.</p> : <>
            {!coletivosConsulta.size && <p>Nenhum registro coletivo disponível para esta turma.</p>}
            {[...coletivosConsulta.entries()].sort((a, b) => String(b[1][0].dataAtendimento).localeCompare(String(a[1][0].dataAtendimento))).map(([id, itens]) => <details key={id}>
              <summary>{itens[0].dataAtendimento} — {consultaTurma} — {itens.length} registro(s) individual(is)</summary>
              <p>Referência do coletivo: {id}</p>
              {itens.map((r) => <article className="srm-student" key={r.id}>
                <h3>{r.alunoNome || "Nome não informado"}</h3>
                <p><strong>Presença:</strong> {r.statusPresenca || "Não informada"}</p>
                <p><strong>Observações:</strong> {r.observacoes || "Não informadas"}</p>
                <p><strong>Sequência:</strong> {r.sequenciaTitulo || "Sem sequência vinculada"}</p>
                {[["objetivo", "Objetivo"], ["eixoTematico", "Eixo"], ["estrategias", "Estratégias"], ["recursos", "Recursos"], ["atividades", "Atividades"], ["avaliacaoGeral", "Avaliação geral"], ["encaminhamentos", "Encaminhamentos"]].map(([campo, titulo]) => <p key={campo}><strong>{titulo}:</strong> {r[campo] || "Não informado"}</p>)}
              </article>)}
            </details>)}
          </>}
          <button type="button" className="btn-secondary" onClick={() => { setConsultaTurma(""); setAba("cronograma"); }}>Voltar ao Cronograma</button>
        </section>}
        {!consultaTurma && !sessaoValida && <section className="panel srm-empty"><span className="dashboard-icon-badge" aria-hidden="true"><ClipboardPen /></span><h2>Qual turma você vai atender?</h2><p>Prepare uma seleção válida no Cronograma para abrir o planejamento e a chamada.</p><button type="button" className="btn-primary" onClick={() => setAba("cronograma")}>Escolher turma no Cronograma</button></section>}{!consultaTurma && sessaoValida && <RegistroColetivoAee key={turmaAberta.chave || turmaAberta.turma} agenda={turmaAberta.agenda} turma={turmaAberta.turma} alunos={turmaAberta.alunos} sequencias={sequencias} registros={registros} horario={horarios.find((h) => h.turma === turmaAberta.turma)} perfil={perfil} podeEditar={podeEditar && !bloqueado} motivoBloqueio={motivoBloqueioRegistro} onCancel={() => { setPreparacoes((atuais) => { const restantes = { ...atuais }; delete restantes[turmaAberta.turma]; return restantes; }); setTurmaAberta(null); setAba("cronograma"); }} onSaved={() => { atualizar(); onRegistroSalvo(); }} />}</div>
      <div hidden={aba !== "sequencias"}><SequenciaDidaticaAee sequencias={sequencias} perfil={perfil} podeEditar={podeEditar} bloqueado={bloqueado} onSaved={atualizar} /></div>
      {aba === "historico" && !bloqueado && <section className="panel dashboard-card dashboard-section-card"><h2>Histórico das Sequências</h2><p>Usos contados por atendimento, sem multiplicar pelo número de alunos. Encontros repetidos não aumentam o progresso. O status é definido pela professora.</p>{!sequencias.length && <p>Nenhuma sequência cadastrada.</p>}{sequencias.map((s) => { const h = historicoSequenciaAee(s, registros); return <article key={s.id}><h3>{s.titulo}</h3><p>{s.turma} · {s.status} · {h.total} utilizações · {h.encontros}/{s.numeroEncontros} encontros ({h.progresso}%)</p><progress aria-label={`Progresso de ${s.titulo}`} value={h.progresso} max="100" /><ul>{h.sessoes.map((r) => <li key={r.coletivoId || r.id}>{r.dataAtendimento} — {r.turmaAee || "Turma não registrada"} — Encontro {r.encontroNumero || "não informado"}{r.reposicao ? " · Reposição" : ""}</li>)}</ul></article>; })}</section>}
      {aba === "indicadores" && !bloqueado && <section className="panel dashboard-card dashboard-section-card"><h2>Indicadores da Sala de Recursos</h2><label>Mês dos indicadores<input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label><p>Frequência = presenças ÷ (presenças + ausências + faltas justificadas). Reposições contam sessões; presenças e faltas contam participações individuais. Sala regular não entra nestes indicadores. Turmas e status de sequências mostram a situação atual.</p><dl className="srm-metricas">{Object.entries({ "Estudantes — Turma A": turmas[0].estudantes.length, "Estudantes — Turma B": turmas[1].estudantes.length, Presentes: metricas.presentes, Faltas: metricas.faltas, "Faltas justificadas (incluídas nas faltas)": metricas.justificadas, Reposições: metricas.reposicoes, Frequência: metricas.frequencia === null ? "Sem registros" : `${metricas.frequencia}%`, "Atendimentos realizados": metricas.atendimentos, "Sequências em andamento": metricas.andamento, "Sequências concluídas": metricas.concluidas }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
      {aba === "indicadores" && !bloqueado && <section className="panel dashboard-card dashboard-section-card" aria-label="Frequência por estudante"><h2>Frequência e histórico por estudante</h2><p>Período: {mes || "Todos os registros"}. Registros sem chamada não entram no percentual de frequência.</p>
        {!frequencias.length && <p>Nenhum estudante disponível no Cadastro.</p>}
        {frequencias.map((f) => <details key={f.aluno.id}><summary>{f.aluno.nome} — {f.aluno.turmaAee || "Sem Turma AEE"} — Frequência: {f.frequencia === null ? "Sem chamada registrada" : `${f.frequencia}%`}</summary><p>Presentes: {f.presentes} · Faltas: {f.faltas} (justificadas: {f.justificadas}) · Reposições: {f.reposicoes} · Atendimentos: {f.atendimentos} · Sem chamada: {f.semChamada}</p><ul>{f.historico.map((r) => <li key={r.id}>{r.dataAtendimento} — {r.statusPresenca || "Sem chamada"} — {r.coletivoId ? `Coletivo (${r.turmaAee})` : "Individual"}{r.reposicao ? " · Reposição" : ""}{r.sequenciaId ? ` · ${r.sequenciaTitulo || "Sequência"} / encontro ${r.encontroNumero || "não informado"}` : ""}{r.observacoes ? ` · ${r.observacoes}` : ""}</li>)}</ul>{!f.historico.length && <p>Nenhum atendimento no período.</p>}</details>)}
      </section>}
    </div>
  </div>;
}
