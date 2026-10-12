import { useState } from "react";
import { dataLocalAee, PRESENCAS_AEE, historicoSequenciaAee } from "../utils/salaRecursosAee";
import { salvarColetivoAee, atualizarIndividualColetivoAee } from "../services/salaRecursosAeeService";
import { EIXOS_TEMATICOS_OPCOES } from "../services/atendimentoAeeService";

export function EditarChamadaColetivaAee({ registro, perfil, podeEditar, onSaved, onCancel }) {
  const [presenca, setPresenca] = useState(registro.statusPresenca || "");
  const [observacoes, setObservacoes] = useState(registro.observacoes || "");
  const [erro, setErro] = useState(""); const [salvando, setSalvando] = useState(false);
  return <section className="panel" aria-label="Editar chamada individual do coletivo"><h2>Chamada individual — {registro.alunoNome}</h2><p>{registro.dataAtendimento} · {registro.turmaAee} · {registro.sequenciaTitulo || "Sem sequência"}</p><p>O planejamento coletivo e seus vínculos são preservados. Aqui você pode corrigir somente presença e observações individuais.</p><form onSubmit={async (e) => { e.preventDefault(); if (!podeEditar || salvando) return; setSalvando(true); setErro(""); try { await atualizarIndividualColetivoAee(registro, presenca, observacoes, perfil); onSaved(); } catch (error) { setErro(error.message); } finally { setSalvando(false); } }}><fieldset disabled={!podeEditar || salvando}><label>Presença individual<select required value={presenca} onChange={(e) => setPresenca(e.target.value)}><option value="">Selecione</option>{PRESENCAS_AEE.map((s) => <option key={s}>{s}</option>)}</select></label><label>Observações individuais<textarea rows={4} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></label><button type="submit" className="btn-primary">Salvar chamada individual</button></fieldset></form>{erro && <p role="alert">{erro}</p>}<button type="button" className="btn-secondary" disabled={salvando} onClick={onCancel}>Cancelar edição da chamada</button></section>;
}

export default function RegistroColetivoAee({ turma, alunos, sequencias, perfil, onSaved, onCancel, podeEditar, horario, registros = [] }) {
  const [coletivoId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState(() => ({ turmaAee: turma, dataAtendimento: dataLocalAee(), sequenciaId: "", encontroNumero: "1", reposicao: false, objetivo: "", eixoTematico: "", estrategias: "", recursos: "", atividades: "", avaliacaoGeral: "", encaminhamentos: "", individuais: Object.fromEntries(alunos.map((a) => [a.id, { statusPresenca: "", observacoes: "" }])) }));
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");
  const seq = sequencias.find((s) => s.id === form.sequenciaId);
  const editar = (k, value) => setForm((old) => ({ ...old, [k]: value }));
  const individual = (id, k, value) => setForm((old) => ({ ...old, individuais: { ...old.individuais, [id]: { ...old.individuais[id], [k]: value } } }));
  async function salvar(event) {
    event.preventDefault(); if (salvando || salvo || !podeEditar) return;
    setSalvando(true); setErro("");
    try { await salvarColetivoAee(coletivoId, form, alunos, seq, perfil); setSalvo(true); await onSaved(); }
    catch (e) { setErro(e.message); } finally { setSalvando(false); }
  }
  const professoras = [...new Set(alunos.map((a) => a.professorAee).filter(Boolean))].join("; ") || "Não informado";
  const turnos = [...new Set(alunos.map((a) => a.turno).filter(Boolean))].join("; ") || "Não informado";
  const presentes = Object.values(form.individuais).filter((i) => i.statusPresenca === "Presente").length;
  const faltas = Object.values(form.individuais).filter((i) => ["Ausente", "Falta justificada"].includes(i.statusPresenca)).length;
  const progresso = seq ? historicoSequenciaAee(seq, registros) : null;
  const campo = (key, titulo) => <label key={key}>{titulo}<textarea required={key === "objetivo"} rows={3} value={form[key]} onChange={(e) => editar(key, e.target.value)} /></label>;
  return <section className="srm-coletivo"><div className="srm-section-heading"><span className="srm-eyebrow">ENCONTRO DA TURMA</span><h2>Registrar Atendimento — {turma}</h2><p>Organize o planejamento do grupo e, em seguida, registre a chamada de cada estudante.</p></div>
    {erro && <p role="alert">{erro}</p>}{salvo && <p role="status">Atendimento coletivo salvo.</p>}
    <div className="srm-workspace"><form onSubmit={salvar}><fieldset disabled={salvando || salvo || !podeEditar}>
      <section className="srm-form-card"><h3><span aria-hidden="true">01</span> Planejamento</h3><div className="srm-grid">
        <label>Data do atendimento coletivo<input type="date" required value={form.dataAtendimento} onChange={(e) => editar("dataAtendimento", e.target.value)} /></label>
        <label>Sequência utilizada<select value={form.sequenciaId} onChange={(e) => editar("sequenciaId", e.target.value)}><option value="">Sem sequência vinculada</option>{sequencias.filter((s) => s.turma === turma).map((s) => <option key={s.id} value={s.id}>{s.titulo} — {s.status}</option>)}</select></label>
        {seq && <label>Encontro da sequência<input type="number" required min="1" max={seq.numeroEncontros} value={form.encontroNumero} onChange={(e) => editar("encontroNumero", e.target.value)} /></label>}
        <label className="srm-checkbox"><input type="checkbox" checked={form.reposicao} onChange={(e) => editar("reposicao", e.target.checked)} />Atendimento de reposição</label>
      </div>
      {seq && <section className="srm-sequence-preview" aria-label="Sequência selecionada"><span className="srm-eyebrow">SEQUÊNCIA ATUAL</span><h4>{seq.titulo}</h4><p><strong>Eixo:</strong> {seq.eixo}</p><p><strong>Objetivo:</strong> {seq.objetivoGeral}</p><div className="srm-sequence-progress"><strong>Encontro selecionado: {form.encontroNumero} de {seq.numeroEncontros}</strong><span>{progresso.encontros} de {seq.numeroEncontros} encontros registrados</span><progress aria-label="Progresso registrado da sequência" value={progresso.progresso} max="100" /></div>
        <details><summary>Consultar planejamento da sequência</summary><pre>{seq.encontros}</pre><p><strong>Estratégias:</strong> {seq.estrategias}</p><p><strong>Recursos:</strong> {seq.recursos}</p><button type="button" className="btn-secondary" onClick={() => setForm((old) => ({ ...old, objetivo: old.objetivo || seq.objetivoGeral || "", eixoTematico: old.eixoTematico || seq.eixo || "", estrategias: old.estrategias || seq.estrategias || "", recursos: old.recursos || seq.recursos || "" }))}>Usar planejamento nos campos vazios</button></details>
      </section>}</section>
      <section className="srm-form-card"><h3><span aria-hidden="true">02</span> Objetivos</h3><div className="srm-grid"><label>Eixo do atendimento<input list="srm-eixos" required value={form.eixoTematico} onChange={(e) => editar("eixoTematico", e.target.value)} /><datalist id="srm-eixos">{EIXOS_TEMATICOS_OPCOES.map((e) => <option key={e}>{e}</option>)}</datalist></label>{campo("objetivo", "Objetivo")}</div></section>
      <section className="srm-form-card"><h3><span aria-hidden="true">03</span> Desenvolvimento</h3><div className="srm-grid">{campo("estrategias", "Estratégias")}{campo("recursos", "Recursos")}{campo("atividades", "Atividades")}</div></section>
      <section className="srm-form-card"><h3><span aria-hidden="true">04</span> Avaliação</h3><div className="srm-grid">{campo("avaliacaoGeral", "Avaliação geral")}{campo("encaminhamentos", "Encaminhamentos")}</div></section>
      <section className="srm-form-card"><h3><span aria-hidden="true">05</span> Chamada individual</h3><p>Presença e observações são registradas individualmente.</p><div className="srm-legenda"><span className="srm-badge srm-presente">Presente</span><span className="srm-badge srm-falta">Falta</span><span className="srm-badge srm-justificada">Falta justificada</span><span className="srm-badge srm-reposicao">Reposição</span></div>
      {alunos.map((a) => { const presenca = form.individuais[a.id]?.statusPresenca || ""; const cor = presenca === "Presente" ? "presente" : presenca === "Ausente" ? "falta" : presenca === "Falta justificada" ? "justificada" : "pendente"; return <article className={"srm-student srm-status-" + cor} key={a.id}><div className="srm-student-heading"><h4>{a.nome}</h4><div className="srm-legenda"><span className={"srm-badge srm-" + cor}>{presenca === "Ausente" ? "Falta" : presenca || "Chamada pendente"}</span>{form.reposicao && <span className="srm-badge srm-reposicao">Reposição</span>}</div></div><dl className="srm-student-info"><div><dt>Diagnóstico</dt><dd>{a.diagnostico || "Não informado"}</dd></div><div><dt>Série/Ano</dt><dd>{a.serieAno || "Não informado"}</dd></div><div><dt>Professor(a)</dt><dd>{a.professorAee || "Não informado"}</dd></div></dl><div className="srm-grid"><label>Presença — {a.nome}<select required value={presenca} onChange={(e) => individual(a.id, "statusPresenca", e.target.value)}><option value="">Selecione</option>{PRESENCAS_AEE.map((p) => <option key={p}>{p}</option>)}</select></label><label>Observações — {a.nome}<textarea rows={2} value={form.individuais[a.id]?.observacoes || ""} onChange={(e) => individual(a.id, "observacoes", e.target.value)} /></label></div></article>; })}</section>
      <div className="srm-savebar"><p>Confira o planejamento e a chamada antes de salvar.</p><button className="btn-primary" type="submit">{salvando ? "Salvando..." : "Salvar atendimento coletivo"}</button></div>
    </fieldset><button type="button" className="btn-secondary" disabled={salvando} onClick={onCancel}>{salvo ? "Voltar ao cronograma" : "Fechar sem salvar"}</button></form>
    <aside className={"srm-context " + (turma === "Turma A" ? "srm-turma-a" : "srm-turma-b")} aria-label="Resumo do atendimento"><span className="srm-eyebrow">NESTE ATENDIMENTO</span><h3>{turma === "Turma A" ? "☀️" : "🌇"} {turma}</h3><dl><div><dt>Professor(a)</dt><dd>{professoras}</dd></div><div><dt>Turno</dt><dd>{turnos}</dd></div><div><dt>Horário</dt><dd>{horario ? horario.dias + " · " + horario.inicio + " às " + horario.fim : "Não configurado"}</dd></div><div><dt>Sequência atual</dt><dd>{seq?.titulo || "Sem sequência vinculada"}</dd></div><div><dt>Estudantes</dt><dd>{alunos.length}</dd></div><div><dt>Presentes na chamada</dt><dd>{presentes}</dd></div><div><dt>Faltas na chamada</dt><dd>{faltas}</dd></div></dl><p className="srm-caption">Resumo do formulário atual. Os dados só serão registrados ao salvar.</p></aside></div>
  </section>;
}
