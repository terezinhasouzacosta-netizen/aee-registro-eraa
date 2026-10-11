import { useId, useState } from "react";
import { criarPromptEntrevista, TITULOS_ENTREVISTA } from "../utils/entrevistaPrompt";
import { analisarRespostaEntrevista, prepararPreviaEntrevista, confirmarPreviaEntrevista, resultadoImportacao } from "../services/entrevistaImportService";
import "./EstudoCasoEntrevista.css";
import { organizarTranscricaoLocal, analisarTrechosLocais, perguntaSemInformacao } from "../services/entrevistaOrganizacaoLocal";

export default function EstudoCasoEntrevista({ destinos, valores, perguntas = [], onConfirm, disabled = false, titulos = TITULOS_ENTREVISTA }) {
  const id = useId();
  const [transcricao, setTranscricao] = useState("");
  const [resposta, setResposta] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [promptManual, setPromptManual] = useState("");
  const [previa, setPrevia] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [trechos, setTrechos] = useState(null);
  const [preenchidos, setPreenchidos] = useState([]);
  const pendentes = perguntas.filter((pergunta) => perguntaSemInformacao(pergunta.resposta));

  function organizarLocalmente() {
    setTrechos(organizarTranscricaoLocal(transcricao, titulos));
    setPrevia(null);
    setErro("");
    setMensagem("");
  }

  function prepararLocalmente() {
    setErro("");
    setMensagem("");
    if (trechos.some((trecho) => !trecho.titulo)) {
      setErro("Escolha o destino de todos os trechos antes de gerar a prévia. Nenhum trecho será descartado.");
      return;
    }
    setPrevia(prepararPreviaEntrevista(analisarTrechosLocais(trechos), destinos, valores));
  }

  async function copiar() {
    setErro("");
    const prompt = criarPromptEntrevista(transcricao, titulos);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiado(true);
      setPromptManual("");
    } catch {
      setPromptManual(prompt);
      setErro("Não foi possível copiar automaticamente. Selecione e copie o prompt abaixo.");
    }
  }

  function preparar() {
    setErro("");
    setMensagem("");
    setPrevia(null);
    const analise = analisarRespostaEntrevista(resposta, titulos);
    if (analise.desconhecidos.length || analise.semTitulo) {
      setErro(`Há texto sem título reconhecido. Ajuste a resposta usando os títulos do prompt antes de importar: ${[analise.semTitulo, ...analise.desconhecidos.map((item) => item.titulo)].filter(Boolean).join("; ")}`);
      return;
    }
    const itens = prepararPreviaEntrevista(analise, destinos, valores);
    if (!itens.length) { setErro("Nenhuma seção com conteúdo foi reconhecida. Utilize os títulos do prompt."); return; }
    setPrevia(itens);
  }

  function confirmar() {
    try {
      const alteracoes = confirmarPreviaEntrevista(previa, valores);
      onConfirm(alteracoes);
      setPreenchidos((anteriores) => [...new Set([...anteriores, ...Object.keys(alteracoes)])]);
      setPrevia(null);
      setErro("");
      setMensagem(Object.keys(alteracoes).length ? "Importação aplicada somente ao formulário local. Revise os campos e use Salvar rascunho quando desejar gravar." : "Nenhum campo foi alterado.");
    } catch (error) { setErro(error.message); }
  }

  return (
    <section className="panel entrevista-assistente" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`}>🧩 Assistente de Organização da Entrevista</h2>
      <p>Cole a transcrição completa da entrevista. O assistente organiza os trechos por títulos e palavras-chave, localmente e sem IA online. Confira as sugestões e escolha o destino dos trechos ambíguos antes de aplicar.</p>
      <p className="muted">Os relatos são preservados sem reescrita ou inferência. Nenhum texto é enviado automaticamente e nenhuma importação é salva automaticamente.</p>
      <label htmlFor={`${id}-transcricao`}>Transcrição da entrevista</label>
      <textarea id={`${id}-transcricao`} rows={9} placeholder="Cole aqui a transcrição completa da entrevista." value={transcricao} onChange={(event) => { setTranscricao(event.target.value); setCopiado(false); setPromptManual(""); setTrechos(null); setPrevia(null); setErro(""); }} />
      <button type="button" className="btn-primary" disabled={disabled || !transcricao.trim()} onClick={organizarLocalmente}>Organizar entrevista localmente</button>
      {trechos && <section aria-label="Sugestões da organização local">
        <h3>Destinos sugeridos — revise antes de importar</h3>
        <p>{trechos.filter((trecho) => trecho.titulo).length} trechos classificados; {trechos.filter((trecho) => !trecho.titulo).length} aguardando classificação. Nada foi aplicado ao estudo.</p>
        {trechos.map((trecho, indice) => <article className="entrevista-trecho" key={indice}>
          <pre>{trecho.texto}</pre><p>{trecho.motivo}</p>
          <label htmlFor={`${id}-destino-${indice}`}>Destino do trecho {indice + 1}</label>
          <select id={`${id}-destino-${indice}`} value={trecho.titulo} onChange={(event) => { setTrechos((atual) => atual.map((item, posicao) => posicao === indice ? { ...item, titulo: event.target.value } : item)); setPrevia(null); setErro(""); }}>
            <option value="">Selecione o destino</option>
            {titulos.map((titulo) => <option key={titulo} value={titulo}>{titulo} — {destinos[titulo]?.label}</option>)}
          </select>
        </article>)}
        <button type="button" className="btn-primary" disabled={disabled || !trechos.length} onClick={prepararLocalmente}>Gerar prévia da organização local</button>
      </section>}
      <details className="entrevista-fluxo-manual"><summary>Fluxo opcional: copiar prompt e importar texto já organizado</summary>
      <p>O fluxo anterior continua disponível. Copiar o prompt não envia dados; qualquer uso externo é manual e não é necessário para a organização local.</p>
      <button type="button" className="btn-secondary" disabled={disabled || !transcricao.trim()} onClick={copiar}>📋 Copiar Prompt para o ChatGPT</button>
      {promptManual && <><label htmlFor={`${id}-prompt`}>Prompt para cópia manual</label><textarea id={`${id}-prompt`} rows={10} readOnly value={promptManual} /></>}
      {(copiado || promptManual) && <ol><li>Abra o ChatGPT.</li><li>Cole o prompt.</li><li>Aguarde a organização.</li><li>Copie a resposta.</li><li>Volte ao AEE Registro.</li></ol>}
      <label htmlFor={`${id}-resposta`}>Resposta organizada</label>
      <textarea id={`${id}-resposta`} rows={9} placeholder="Cole aqui a resposta produzida pelo ChatGPT." value={resposta} onChange={(event) => { setResposta(event.target.value); setPrevia(null); setMensagem(""); }} />
      <button type="button" className="btn-primary" disabled={disabled || !resposta.trim()} onClick={preparar}>Importar para o Estudo de Caso</button>
      </details>
      {erro && <p role="alert" className="entrevista-erro">{erro}</p>}
      {mensagem && <p role="status">{mensagem}</p>}
      <section aria-label="Resultado da organização">
        <h3>Perguntas preenchidas pelo assistente nesta sessão ({preenchidos.length})</h3>
        {preenchidos.length ? <ul>{preenchidos.map((chave) => <li key={chave}>{perguntas.find((pergunta) => pergunta.id === chave)?.label || Object.values(destinos).find((destino) => destino.id === chave)?.label} — {perguntaSemInformacao(valores[chave]) ? "continua pendente de informação" : "preenchida; revise e edite manualmente se necessário"}</li>)}</ul> : <p>Nenhuma alteração confirmada nesta sessão.</p>}
        <details><summary>Perguntas ainda sem informação ({pendentes.length})</summary><ul>{pendentes.map((pergunta) => <li key={pergunta.id}>{pergunta.label}</li>)}</ul></details>
        <p>Após confirmar, todas as respostas pedagógicas continuam editáveis nos blocos do Estudo de Caso. A identificação oficial permanece somente leitura.</p>
      </section>
      {previa && <section aria-label="Prévia da importação" className="entrevista-previa">
        <h3>Prévia da importação</h3>
        <p>Confira o destino de cada seção. Os temas sem pergunta equivalente serão incluídos nas observações complementares com seus títulos. A identificação oficial permanece protegida. Os campos importados deverão ser revisados.</p>
        {previa.map((item, indice) => <article key={item.id}>
          <h4>{item.titulos.join(" / ")}</h4><p><strong>Destino:</strong> {item.label}</p>
          {item.protegido ? <p>Somente conferência: os dados do Cadastro não serão substituídos.</p> : <>
            {item.atual.trim() && <p>Este campo já possui informação.</p>}
            <label htmlFor={`${id}-escolha-${indice}`}>Ação para {item.titulos.join(" / ")}</label>
            <select id={`${id}-escolha-${indice}`} value={item.escolha} onChange={(event) => setPrevia((atual) => atual.map((valor, posicao) => posicao === indice ? { ...valor, escolha: event.target.value } : valor))}>
              <option value="manter">Manter existente</option><option value="substituir">Substituir</option><option value="mesclar">Mesclar</option>
            </select>
          </>}
          <div className="entrevista-textos"><div><strong>Texto atual</strong><pre>{item.atual || "(vazio)"}</pre></div><span aria-hidden="true">↓</span><div><strong>Texto novo</strong><pre>{item.novo}</pre></div><span aria-hidden="true">↓</span><div><strong>Resultado final</strong><pre>{resultadoImportacao(item) || "(vazio)"}</pre></div></div>
        </article>)}
        <div className="entrevista-acoes"><button type="button" className="btn-primary" disabled={disabled} onClick={confirmar}>Confirmar importação</button><button type="button" className="btn-secondary" onClick={() => { setPrevia(null); setErro(""); }}>Cancelar importação</button></div>
      </section>}
    </section>
  );
}
