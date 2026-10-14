import { Puzzle } from "lucide-react";
import { useState } from "react";
import { CAMPOS_SEQUENCIA, STATUS_SEQUENCIA, TURMAS_AEE, sequenciaInicial } from "../utils/salaRecursosAee";
import { analisarRespostaEntrevista, prepararPreviaEntrevista, confirmarPreviaEntrevista, resultadoImportacao } from "../services/entrevistaImportService";
import { salvarSequenciaAee } from "../services/salaRecursosAeeService";

export function analisarTextoSequencia(texto) {
  const aliases = { "objetivos": "Objetivo Geral", "objetivo geral": "Objetivo Geral", "objetivos gerais": "Objetivo Geral", "objetivo": "Objetivo Geral", "objetivos especificos": "Objetivos específicos", "numero de encontros": "Número de encontros" };
  const normal = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const linhas = String(texto).split(/\r?\n/).map((linha) => {
    const limpa = linha.trim().replace(/^#{1,6}\s*/, "").replace(/\*\*|__/g, "").replace(/^\d+[.)]\s*/, "");
    if (/^encontro\s+\d+\b/i.test(limpa)) return `Encontros\n${limpa}`;
    const pos = limpa.indexOf(":"); const key = normal(pos < 0 ? limpa : limpa.slice(0, pos));
    return aliases[key] ? `${aliases[key]}${pos < 0 ? "" : limpa.slice(pos)}` : linha;
  });
  const analise = analisarRespostaEntrevista(linhas.join("\n"), Object.values(CAMPOS_SEQUENCIA));
  return { ...analise, secoes: analise.secoes.map((secao) => ({ ...secao, texto: secao.texto.replace(/^Copiar(?:\s+|$)/i, "") })) };
}

export default function SequenciaDidaticaAee({ sequencias, perfil, podeEditar, onSaved, bloqueado }) {
  const [form, setForm] = useState(sequenciaInicial);
  const [id, setId] = useState("");
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const editar = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  function organizar() {
    setErro(""); setPrevia(null);
    const analise = analisarTextoSequencia(texto);
    if (analise.semTitulo || analise.desconhecidos.length) { setErro("Há texto sem título reconhecido. Use os títulos exibidos no formulário; nenhum trecho será descartado. Trechos: " + [analise.semTitulo, ...analise.desconhecidos.map((s) => s.titulo)].filter(Boolean).join("; ")); return; }
    const destinos = Object.fromEntries(Object.entries(CAMPOS_SEQUENCIA).map(([key, label]) => [label, { id: key, label }]));
    const items = prepararPreviaEntrevista(analise, destinos, form);
    if (!items.length) { setErro("Nenhum conteúdo reconhecido para organizar."); return; }
    setPrevia(items);
  }
  async function salvar(event) {
    event.preventDefault(); if (!podeEditar || bloqueado || salvando) return;
    setSalvando(true); setErro(""); setMensagem("");
    try { const savedId = await salvarSequenciaAee(id, form, perfil); setId(savedId); setMensagem("Sequência salva."); await onSaved(); }
    catch (e) { setErro(e.message); } finally { setSalvando(false); }
  }
  return <section className="panel srm-sequencias"><h2>Sequências Didáticas</h2>
    <div className="srm-cards">{sequencias.map((s) => <article key={s.id}><h3>{s.titulo}</h3><p>{s.turma} · {s.status} · {s.numeroEncontros} encontros</p><button type="button" className="btn-secondary" onClick={() => { setId(s.id); setForm({ ...sequenciaInicial(), ...s, numeroEncontros: String(s.numeroEncontros) }); setPrevia(null); setTexto(""); setMensagem(""); setErro(""); }}>Abrir sequência</button></article>)}</div>
    {!sequencias.length && <p>Nenhuma sequência cadastrada.</p>}
    <button type="button" className="btn-secondary" disabled={!podeEditar} onClick={() => { setId(""); setForm(sequenciaInicial()); setPrevia(null); setTexto(""); setMensagem(""); }}>Nova sequência</button>
    <h3>{id ? "Editar sequência" : "Nova sequência"}</h3>
    {erro && <p role="alert">{erro}</p>}{mensagem && <p role="status">{mensagem}</p>}
    <form onSubmit={salvar}><fieldset disabled={!podeEditar || salvando || bloqueado}><div className="srm-grid">
      {Object.entries(CAMPOS_SEQUENCIA).map(([key, label]) => <label key={key}>{label}
        {key === "turma" || key === "status" ? <select value={form[key]} onChange={(e) => editar(key, e.target.value)} required><option value="">Selecione</option>{(key === "turma" ? TURMAS_AEE : STATUS_SEQUENCIA).map((v) => <option key={v}>{v}</option>)}</select>
          : key === "numeroEncontros" ? <input type="number" min="1" max="365" required value={form[key]} onChange={(e) => editar(key, e.target.value)} />
          : ["titulo", "eixo"].includes(key) ? <input required value={form[key]} onChange={(e) => editar(key, e.target.value)} />
          : <textarea rows={3} required={key === "objetivoGeral"} value={form[key]} onChange={(e) => editar(key, e.target.value)} />}
      </label>)}
    </div><button className="btn-primary" type="submit">{salvando ? "Salvando..." : id ? "Atualizar sequência" : "Salvar sequência"}</button></fieldset></form>
    <section className="srm-assistente"><h3><Puzzle aria-hidden="true" /> Assistente de Organização da Sequência Didática</h3>
      <p>Cole o texto com títulos como Título, Objetivos, Encontros, Estratégias, Recursos, Avaliação e Observações. O processamento é local, sem API ou IA online. Confira a prévia antes de aplicar; salvar é uma ação separada.</p>
      <label>Texto da sequência<textarea rows={8} value={texto} onChange={(e) => { setTexto(e.target.value); setPrevia(null); }} /></label>
      <button type="button" className="btn-secondary" disabled={!podeEditar || !texto.trim() || salvando} onClick={organizar}>Organizar sequência e visualizar prévia</button>
      {previa && <section aria-label="Prévia da sequência"><h4>Prévia da sequência</h4>{previa.map((item, i) => <article key={item.id}><h4>{item.label}</h4>{item.atual && <p>Este campo já possui informação.</p>}<label>Ação para {item.label}<select value={item.escolha} onChange={(e) => setPrevia((old) => old.map((v, n) => n === i ? { ...v, escolha: e.target.value } : v))}><option value="manter">Manter existente</option><option value="substituir">Substituir</option>{!["turma", "status", "numeroEncontros"].includes(item.id) && <option value="mesclar">Mesclar</option>}</select></label><strong>Texto atual</strong><pre>{item.atual || "(vazio)"}</pre><strong>Texto novo</strong><pre>{item.novo}</pre><strong>Resultado final</strong><pre>{resultadoImportacao(item)}</pre></article>)}<button type="button" className="btn-primary" disabled={!podeEditar || salvando} onClick={() => { try { const changes = confirmarPreviaEntrevista(previa, form); setForm((old) => ({ ...old, ...changes })); setPrevia(null); setMensagem("Texto aplicado ao formulário local. Revise antes de salvar."); setErro(""); } catch { setErro("O formulário mudou. Gere uma nova prévia para preservar suas edições."); } }}>Confirmar organização da sequência</button><button type="button" className="btn-secondary" onClick={() => setPrevia(null)}>Cancelar prévia</button></section>}
    </section>
  </section>;
}
