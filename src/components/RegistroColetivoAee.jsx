import { useState } from "react";
import { dataLocalAee, PRESENCAS_AEE } from "../utils/salaRecursosAee";
import { salvarColetivoAee, atualizarIndividualColetivoAee } from "../services/salaRecursosAeeService";
import { EIXOS_TEMATICOS_OPCOES } from "../services/atendimentoAeeService";

export function EditarChamadaColetivaAee({ registro, perfil, podeEditar, onSaved, onCancel }) {
  const [presenca, setPresenca] = useState(registro.statusPresenca || "");
  const [observacoes, setObservacoes] = useState(registro.observacoes || "");
  const [erro, setErro] = useState(""); const [salvando, setSalvando] = useState(false);
  return <section className="panel" aria-label="Editar chamada individual do coletivo"><h2>Chamada individual — {registro.alunoNome}</h2><p>{registro.dataAtendimento} · {registro.turmaAee} · {registro.sequenciaTitulo || "Sem sequência"}</p><p>O planejamento coletivo e seus vínculos são preservados. Aqui você pode corrigir somente presença e observações individuais.</p><form onSubmit={async (e) => { e.preventDefault(); if (!podeEditar || salvando) return; setSalvando(true); setErro(""); try { await atualizarIndividualColetivoAee(registro, presenca, observacoes, perfil); onSaved(); } catch (error) { setErro(error.message); } finally { setSalvando(false); } }}><fieldset disabled={!podeEditar || salvando}><label>Presença individual<select required value={presenca} onChange={(e) => setPresenca(e.target.value)}><option value="">Selecione</option>{PRESENCAS_AEE.map((s) => <option key={s}>{s}</option>)}</select></label><label>Observações individuais<textarea rows={4} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></label><button type="submit" className="btn-primary">Salvar chamada individual</button></fieldset></form>{erro && <p role="alert">{erro}</p>}<button type="button" className="btn-secondary" disabled={salvando} onClick={onCancel}>Cancelar edição da chamada</button></section>;
}

export default function RegistroColetivoAee({ turma, alunos, sequencias, perfil, onSaved, onCancel, podeEditar }) {
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
  return <section className="panel"><h2>Registrar Atendimento — {turma}</h2><p>Preencha o planejamento uma única vez. Presença e observações são individuais. Os registros serão salvos juntos no histórico de cada aluno, por alunoId.</p>
    {erro && <p role="alert">{erro}</p>}{salvo && <p role="status">Atendimento coletivo salvo.</p>}
    <form onSubmit={salvar}><fieldset disabled={salvando || salvo || !podeEditar}>
      <div className="srm-grid"><label>Data do atendimento coletivo<input type="date" required value={form.dataAtendimento} onChange={(e) => editar("dataAtendimento", e.target.value)} /></label>
        <label>Sequência utilizada<select value={form.sequenciaId} onChange={(e) => editar("sequenciaId", e.target.value)}><option value="">Sem sequência vinculada</option>{sequencias.filter((s) => s.turma === turma).map((s) => <option key={s.id} value={s.id}>{s.titulo} — {s.status}</option>)}</select></label>
        {seq && <label>Encontro da sequência<input type="number" required min="1" max={seq.numeroEncontros} value={form.encontroNumero} onChange={(e) => editar("encontroNumero", e.target.value)} /></label>}
        <label className="srm-checkbox"><input type="checkbox" checked={form.reposicao} onChange={(e) => editar("reposicao", e.target.checked)} />Atendimento de reposição</label>
      </div>
      {seq && <details><summary>Consultar planejamento da sequência</summary><p><strong>Objetivo:</strong> {seq.objetivoGeral}</p><p><strong>Eixo:</strong> {seq.eixo}</p><pre>{seq.encontros}</pre><p><strong>Estratégias:</strong> {seq.estrategias}</p><p><strong>Recursos:</strong> {seq.recursos}</p><button type="button" className="btn-secondary" onClick={() => setForm((old) => ({ ...old, objetivo: old.objetivo || seq.objetivoGeral || "", eixoTematico: old.eixoTematico || seq.eixo || "", estrategias: old.estrategias || seq.estrategias || "", recursos: old.recursos || seq.recursos || "" }))}>Usar planejamento nos campos vazios</button></details>}
      <div className="srm-grid"><label>Eixo do atendimento<input list="srm-eixos" required value={form.eixoTematico} onChange={(e) => editar("eixoTematico", e.target.value)} /><datalist id="srm-eixos">{EIXOS_TEMATICOS_OPCOES.map((e) => <option key={e}>{e}</option>)}</datalist></label>
        {Object.entries({ objetivo: "Objetivo", estrategias: "Estratégias", recursos: "Recursos", atividades: "Atividades", avaliacaoGeral: "Avaliação geral", encaminhamentos: "Encaminhamentos" }).map(([key, label]) => <label key={key}>{label}<textarea required={key === "objetivo"} rows={3} value={form[key]} onChange={(e) => editar(key, e.target.value)} /></label>)}
      </div>
      <h3>Presença e observações individuais</h3>{alunos.map((a) => <article key={a.id}><h4>{a.nome}</h4><div className="srm-grid"><label>Presença — {a.nome}<select required value={form.individuais[a.id]?.statusPresenca || ""} onChange={(e) => individual(a.id, "statusPresenca", e.target.value)}><option value="">Selecione</option>{PRESENCAS_AEE.map((p) => <option key={p}>{p}</option>)}</select></label><label>Observações — {a.nome}<textarea rows={2} value={form.individuais[a.id]?.observacoes || ""} onChange={(e) => individual(a.id, "observacoes", e.target.value)} /></label></div></article>)}
      <button className="btn-primary" type="submit">{salvando ? "Salvando..." : "Salvar atendimento coletivo"}</button>
    </fieldset></form><button type="button" className="btn-secondary" disabled={salvando} onClick={onCancel}>{salvo ? "Voltar ao cronograma" : "Fechar sem salvar"}</button>
  </section>;
}
