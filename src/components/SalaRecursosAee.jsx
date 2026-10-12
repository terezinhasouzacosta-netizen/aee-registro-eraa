import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { listarSequenciasAee, listarCronogramasAee, listarRegistrosSalaAee, salvarCronogramaAee } from "../services/salaRecursosAeeService";
import { agruparTurmasAee, dataLocalAee, indicadoresSalaAee, historicoSequenciaAee, frequenciaPorAlunoAee } from "../utils/salaRecursosAee";
import SequenciaDidaticaAee from "./SequenciaDidaticaAee";
import RegistroColetivoAee from "./RegistroColetivoAee";
import "./SalaRecursosAee.css";

const ABAS = [["cronograma", "Cronograma de Atendimento"], ["individual", "Registro individual e histórico"], ["sequencias", "Sequências Didáticas"], ["historico", "Histórico das Sequências"], ["indicadores", "Indicadores"]];
function HorarioTurma({ turma, horario, perfil, podeEditar, onSaved }) {
  const [form, setForm] = useState(() => ({ dias: horario?.dias || "", inicio: horario?.inicio || "", fim: horario?.fim || "" }));
  const [erro, setErro] = useState(""); const [salvando, setSalvando] = useState(false);
  return <details><summary>Configurar horário — {turma}</summary><form onSubmit={async (e) => { e.preventDefault(); if (!podeEditar || salvando) return; setSalvando(true); setErro(""); try { await salvarCronogramaAee(turma, form, perfil); await onSaved(); } catch (error) { setErro(error.message); } finally { setSalvando(false); } }}>
    <fieldset disabled={!podeEditar || salvando}><label>Dias — {turma}<input required placeholder="Ex.: segunda e quarta" value={form.dias} onChange={(e) => setForm({ ...form, dias: e.target.value })} /></label><div className="srm-grid"><label>Início — {turma}<input type="time" required value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></label><label>Fim — {turma}<input type="time" required value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} /></label></div><button type="submit" className="btn-secondary">Salvar horário</button></fieldset>{erro && <p role="alert">{erro}</p>}
  </form></details>;
}
export default function SalaRecursosAee({ alunos, loadingAlunos, perfil, podeEditar, currentUser, onSequenciasChange, onRegistroSalvo, revisao, children }) {
  const [aba, setAba] = useState("cronograma"); const [sequencias, setSequencias] = useState([]); const [horarios, setHorarios] = useState([]); const [registros, setRegistros] = useState([]);
  const [erro, setErro] = useState(""); const [loading, setLoading] = useState(true); const [versao, setVersao] = useState(0); const [turmaAberta, setTurmaAberta] = useState(null);
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
  const turmas = agruparTurmasAee(alunos);
  const filtrados = registros.filter((r) => !mes || String(r.dataAtendimento || "").startsWith(mes));
  const metricas = indicadoresSalaAee(filtrados, sequencias);
  const frequencias = frequenciaPorAlunoAee(alunos, filtrados);
  const bloqueado = loading || loadingAlunos || Boolean(erro) || !oficial;
  return <div className="srm-aee"><nav className="srm-tabs" aria-label="Abas do Atendimento AEE">{ABAS.map(([key, label]) => <button type="button" key={key} aria-current={aba === key ? "page" : undefined} className={aba === key ? "btn-primary" : "btn-secondary"} onClick={() => setAba(key)}>{label}</button>)}</nav>
    {!oficial && <p role="alert">Módulo bloqueado: utilize exclusivamente o Firebase aee-registro-eraa.</p>}
    <div hidden={aba !== "individual"}>{children}</div>
    <div hidden={aba === "individual"}>
      {loading || loadingAlunos ? <p role="status">Carregando organização da sala...</p> : null}
      {erro && <p role="alert">{erro} Os indicadores não serão apresentados como zero. <button type="button" onClick={atualizar}>Tentar novamente</button></p>}
      {aba === "cronograma" && <section aria-label="Cronograma de Atendimento"><h2>Cronograma de Atendimento</h2><p>Professora e turno são exibidos conforme o Cadastro. O horário é configurado por turma. Alunos sem Turma AEE definida: {alunos.filter((a) => !["Turma A", "Turma B"].includes(a.turmaAee)).length}.</p>
        <div className="srm-cards">{turmas.map((t) => { const h = horarios.find((item) => item.turma === t.turma); return <article className="panel" key={t.turma}><h3>{t.turma}</h3><p><strong>Professor(a) do AEE:</strong> {t.professoras.join("; ") || "Não informado no Cadastro"}</p><p><strong>Turno (Cadastro):</strong> {t.turnos.join("; ") || "Não informado"}</p><p><strong>Horário:</strong> {h ? `${h.dias} · ${h.inicio} às ${h.fim}` : "Não configurado"}</p><p><strong>Total de estudantes:</strong> {t.estudantes.length}</p><ul>{t.estudantes.map((a) => <li key={a.id}>{a.nome} — {a.professorAee || "Professor(a) não informado(a)"}</li>)}</ul>{!t.estudantes.length && <p>Defina a Turma AEE no Cadastro para incluir estudantes.</p>}<button type="button" className="btn-primary" disabled={bloqueado || !podeEditar || !t.estudantes.length} onClick={() => setTurmaAberta({ turma: t.turma, alunos: t.estudantes })}>Registrar Atendimento — {t.turma}</button><HorarioTurma key={`${t.turma}-${h?.inicio}-${h?.fim}-${h?.dias}`} turma={t.turma} horario={h} perfil={perfil} podeEditar={podeEditar && !bloqueado} onSaved={atualizar} /></article>; })}</div>
      </section>}
      <div hidden={aba !== "cronograma"}>{turmaAberta && <RegistroColetivoAee key={turmaAberta.turma} turma={turmaAberta.turma} alunos={turmaAberta.alunos} sequencias={sequencias} perfil={perfil} podeEditar={podeEditar && !bloqueado} onCancel={() => setTurmaAberta(null)} onSaved={() => { atualizar(); onRegistroSalvo(); }} />}</div>
      <div hidden={aba !== "sequencias"}><SequenciaDidaticaAee sequencias={sequencias} perfil={perfil} podeEditar={podeEditar} bloqueado={bloqueado} onSaved={atualizar} /></div>
      {aba === "historico" && !bloqueado && <section className="panel"><h2>Histórico das Sequências</h2><p>Usos contados por atendimento, sem multiplicar pelo número de alunos. Encontros repetidos não aumentam o progresso. O status é definido pela professora.</p>{!sequencias.length && <p>Nenhuma sequência cadastrada.</p>}{sequencias.map((s) => { const h = historicoSequenciaAee(s, registros); return <article key={s.id}><h3>{s.titulo}</h3><p>{s.turma} · {s.status} · {h.total} utilizações · {h.encontros}/{s.numeroEncontros} encontros ({h.progresso}%)</p><progress aria-label={`Progresso de ${s.titulo}`} value={h.progresso} max="100" /><ul>{h.sessoes.map((r) => <li key={r.coletivoId || r.id}>{r.dataAtendimento} — {r.turmaAee || "Turma não registrada"} — Encontro {r.encontroNumero || "não informado"}{r.reposicao ? " · Reposição" : ""}</li>)}</ul></article>; })}</section>}
      {aba === "indicadores" && !bloqueado && <section className="panel"><h2>Indicadores da Sala de Recursos</h2><label>Mês dos indicadores<input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label><p>Frequência = presenças ÷ (presenças + ausências + faltas justificadas). Reposições contam sessões; presenças e faltas contam participações individuais. Sala regular não entra nestes indicadores. Turmas e status de sequências mostram a situação atual.</p><dl className="srm-metricas">{Object.entries({ "Estudantes — Turma A": turmas[0].estudantes.length, "Estudantes — Turma B": turmas[1].estudantes.length, Presentes: metricas.presentes, Faltas: metricas.faltas, "Faltas justificadas (incluídas nas faltas)": metricas.justificadas, Reposições: metricas.reposicoes, Frequência: metricas.frequencia === null ? "Sem registros" : `${metricas.frequencia}%`, "Atendimentos realizados": metricas.atendimentos, "Sequências em andamento": metricas.andamento, "Sequências concluídas": metricas.concluidas }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
      {aba === "indicadores" && !bloqueado && <section className="panel" aria-label="Frequência por estudante"><h2>Frequência e histórico por estudante</h2><p>Período: {mes || "Todos os registros"}. Registros sem chamada não entram no percentual de frequência.</p>
        {!frequencias.length && <p>Nenhum estudante disponível no Cadastro.</p>}
        {frequencias.map((f) => <details key={f.aluno.id}><summary>{f.aluno.nome} — {f.aluno.turmaAee || "Sem Turma AEE"} — Frequência: {f.frequencia === null ? "Sem chamada registrada" : `${f.frequencia}%`}</summary><p>Presentes: {f.presentes} · Faltas: {f.faltas} (justificadas: {f.justificadas}) · Reposições: {f.reposicoes} · Atendimentos: {f.atendimentos} · Sem chamada: {f.semChamada}</p><ul>{f.historico.map((r) => <li key={r.id}>{r.dataAtendimento} — {r.statusPresenca || "Sem chamada"} — {r.coletivoId ? `Coletivo (${r.turmaAee})` : "Individual"}{r.reposicao ? " · Reposição" : ""}{r.sequenciaId ? ` · ${r.sequenciaTitulo || "Sequência"} / encontro ${r.encontroNumero || "não informado"}` : ""}{r.observacoes ? ` · ${r.observacoes}` : ""}</li>)}</ul>{!f.historico.length && <p>Nenhum atendimento no período.</p>}</details>)}
      </section>}
    </div>
  </div>;
}
