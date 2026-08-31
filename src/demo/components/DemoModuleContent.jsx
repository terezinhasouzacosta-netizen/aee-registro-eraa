import {
  EIXOS_SONDAGEM,
  ESCALA_SONDAGEM,
  SECOES_PAEE,
  SECOES_PEI,
} from "../data/demoFormStructures";

function DemoComparison({ structure, example }) {
  return <div className="demo-comparison-stack">
    <section className="demo-comparison-part demo-structure-view">
      <header className="demo-comparison-heading"><span>1</span><div><p className="demo-eyebrow">Visão do profissional</p><h2>Como é preenchido na plataforma</h2><p>Estrutura demonstrativa bloqueada, apresentada apenas para compreensão do fluxo de preenchimento.</p></div></header>
      {structure}
    </section>
    <section className="demo-comparison-part demo-example-view">
      <header className="demo-comparison-heading"><span>2</span><div><p className="demo-eyebrow">Dados exclusivamente fictícios</p><h2>Exemplo preenchido – Caso pedagógico demonstrativo</h2><p>Dados fictícios utilizados exclusivamente para demonstração acadêmica.</p></div></header>
      {example}
    </section>
  </div>;
}

function DemoLockedField({ label, type = "text", options = [], wide = false, value = "" }) {
  const className = wide ? "demo-locked-field is-wide" : "demo-locked-field";
  const selectOptions = value && !options.includes(value) ? [value, ...options] : options;
  return <label className={className}><span>{label}</span>
    {type === "textarea" ? <textarea rows="3" readOnly disabled placeholder="Campo para preenchimento" aria-label={label} defaultValue={value} /> : type === "select" ? <select disabled defaultValue={value} aria-label={label}><option value="">Selecione</option>{selectOptions.map((option) => <option key={option}>{option}</option>)}</select> : <input type={type} readOnly disabled placeholder="Campo para preenchimento" aria-label={label} defaultValue={value} />}
  </label>;
}

function DemoLockedFields({ fields }) {
  return <div className="demo-locked-grid">{fields.map((field) => <DemoLockedField key={typeof field === "string" ? field : field.label} {...(typeof field === "string" ? { label: field } : field)} />)}</div>;
}

function DemoFormAccordion({ title, index, children, open = false, meta = "Campos bloqueados" }) {
  return <details className="demo-form-accordion" open={open}><summary><span><small>{index ? `Seção ${index}` : "Estrutura"}</small><strong>{title}</strong></span><em>{meta}</em></summary><div className="demo-form-accordion-body">{children}</div></details>;
}

function DemoLockedChecks({ title, options }) {
  return <fieldset className="demo-locked-checks" disabled><legend>{title}</legend><div>{options.map((option) => <label key={option}><input type="checkbox" disabled aria-label={option} /> <span>{option}</span></label>)}</div></fieldset>;
}

function DemoDataGrid({ itens }) {
  return (
    <dl className="demo-data-grid">
      {itens.map(({ label, value }) => (
        <div key={label}><dt>{label}</dt><dd>{value || "Não se aplica ao caso fictício"}</dd></div>
      ))}
    </dl>
  );
}

function DemoList({ itens }) {
  return <ul className="demo-content-list">{itens.map((item) => <li key={typeof item === "string" ? item : item.id}>{typeof item === "string" ? item : item.titulo}</li>)}</ul>;
}

function DemoContentSection({ titulo, children, numero }) {
  return (
    <section className="demo-content-section demo-institution-section">
      <header>{numero ? <span>{numero}</span> : null}<h3>{titulo}</h3></header>
      {children}
    </section>
  );
}

function DemoContinuityTrail({ etapaAtiva }) {
  const etapas = ["Necessidade identificada", "Habilidade prioritária", "Objetivo / meta", "Estratégia / recurso"];
  return <div className="demo-continuity" aria-label="Continuidade do planejamento pedagógico">{etapas.map((etapa, indice) => <div className={indice <= etapaAtiva ? "is-reached" : ""} key={etapa}><span>{indice + 1}</span><strong>{etapa}</strong></div>)}</div>;
}

function obterResposta(caso, blocoId, perguntaId) {
  const bloco = caso.estudoCaso.blocos.find((item) => item.id === blocoId);
  return bloco?.perguntas?.find((item) => item.id === perguntaId)?.resposta || "";
}

function AlunoFilledContent({ dados }) {
  return <div className="demo-institution-stack">
    <AlunoStructure dados={dados} filled />
    <DemoContentSection titulo="Contextualização demonstrativa"><p>{dados.contexto}</p></DemoContentSection>
  </div>;
}

function SondagemFilledContent({ dados, casoPedagogico }) {
  return <div className="demo-institution-stack">
    <DemoContentSection titulo="Dados Gerais"><DemoDataGrid itens={[
      { label: "Aluno", value: casoPedagogico.aluno.nomeExibicao }, { label: "Bimestre/período", value: dados.periodo }, { label: "Status", value: dados.status },
    ]} /></DemoContentSection>
    <section className="demo-institution-group" aria-labelledby="demo-sondagem-eixos"><h3 id="demo-sondagem-eixos">Eixos da Sondagem</h3><div className="demo-assessment-grid">{dados.eixos.map((eixo) => <article key={eixo.nome}><div><strong>{eixo.nome}</strong><span>{eixo.nivel}</span></div><p>{eixo.observacao}</p></article>)}</div></section>
    <DemoContentSection titulo="Síntese Diagnóstica"><div className="demo-synthesis-grid">
      <article><h4>Potencialidades e interesses do estudante</h4><DemoList itens={dados.potencialidades} /></article>
      <article><h4>Habilidades consolidadas</h4><DemoList itens={dados.habilidadesConsolidadas} /></article>
      <article><h4>Habilidades em desenvolvimento</h4><DemoList itens={dados.habilidadesEmDesenvolvimento} /></article>
      <article><h4>Habilidades prioritárias para intervenções</h4><DemoList itens={dados.prioridadesIntervencao} /></article>
      <article><h4>Recomendações e encaminhamentos</h4><p>{dados.recomendacoes}</p></article>
    </div></DemoContentSection>
  </div>;
}

function EstudoCasoFilledContent({ dados }) {
  return <>
    <section className="demo-institution-group" aria-labelledby="demo-estudo-progresso"><h3 id="demo-estudo-progresso">Progresso do Estudo de Caso</h3><div className="demo-study-overview" aria-label="Resumo do Estudo de Caso">
      <article><strong>{dados.blocos.length}</strong><span>Blocos estruturados</span></article><article><strong>{dados.totalPerguntas}</strong><span>Perguntas pedagógicas</span></article><article><strong>{dados.respondidas}/{dados.totalPerguntas}</strong><span>Progresso</span></article><article><strong>100%</strong><span>Concluído</span></article>
    </div></section>
    <section className="demo-institution-group" aria-labelledby="demo-estudo-blocos"><h3 id="demo-estudo-blocos">Blocos do Estudo de Caso</h3><p className="demo-study-guidance">Abra um bloco por vez para consultar as respostas e a respectiva fonte da informação.</p><div className="demo-study-blocks">{dados.blocos.map((bloco, indice) => <details key={bloco.id} open={indice === 0}><summary>
      <span className="demo-study-title"><small>Bloco {indice + 1}</small><strong>{bloco.titulo}</strong></span><span className="demo-study-meta"><small>Fonte: {bloco.fonteInformacao}</small><strong>{bloco.tipo === "identificacao" ? "Campos de referência" : `${bloco.perguntas.length} de ${bloco.perguntas.length} respondidas`}</strong></span>
    </summary>{bloco.tipo === "identificacao" ? <div className="demo-study-identification"><DemoDataGrid itens={bloco.campos} /></div> : <div className="demo-question-list">{bloco.perguntas.map((pergunta) => <article key={pergunta.id}><h4>{pergunta.pergunta}</h4><p>{pergunta.resposta}</p><small>Fonte da informação: {bloco.fonteInformacao}</small></article>)}{bloco.observacoes ? <article><h4>Observações</h4><p>{bloco.observacoes}</p></article> : null}</div>}</details>)}</div></section>
  </>;
}

function HabilidadesFilledContent({ dados, casoPedagogico }) {
  return <><DemoContinuityTrail etapaAtiva={1} /><DemoContentSection titulo="Habilidades por bimestre"><div className="demo-bimester-heading"><strong>{casoPedagogico.sondagem.periodo}</strong><span>{dados.length} habilidades priorizadas</span></div><div className="demo-record-grid">{dados.map((habilidade) => <article key={habilidade.id}><div className="demo-record-heading"><h3>{habilidade.titulo}</h3><span>Prioridade {habilidade.prioridade}</span></div><p><strong>Habilidades do eixo temático:</strong> {habilidade.objetivo}</p><small>Origem: {habilidade.origem}</small></article>)}</div></DemoContentSection></>;
}

function PaeeFilledContent({ dados, casoPedagogico }) {
  const aluno = casoPedagogico.aluno;
  return <><DemoContinuityTrail etapaAtiva={3} />
    <DemoContentSection titulo="Dados gerais do plano"><DemoDataGrid itens={[{ label: "Status geral", value: dados.status }]} /></DemoContentSection>
    <DemoContentSection numero="1" titulo="Identificação do estudante"><DemoDataGrid itens={[
      { label: "Nome do estudante", value: aluno.nomeExibicao }, { label: "Série/Ano", value: aluno.serieAno }, { label: "Turma", value: aluno.turma }, { label: "Turno", value: aluno.turno }, { label: "Professor(a) do AEE", value: aluno.professorAee }, { label: "Diagnóstico/condição informada", value: aluno.diagnosticoPrincipal }, { label: "Nome da escola", value: aluno.escola },
    ]} /></DemoContentSection>
    <DemoContentSection numero="2" titulo="Base pedagógica do PAEE"><div className="demo-synthesis-grid">
      <article><h4>Potencialidades do estudante</h4><DemoList itens={casoPedagogico.sondagem.potencialidades} /></article><article><h4>Barreiras identificadas</h4><p>{obterResposta(casoPedagogico, "barreiras-apoios", "barreiras-ambiente")}</p></article><article><h4>Necessidades educacionais específicas</h4><p>{obterResposta(casoPedagogico, "informacoes-aee", "necessidades-especificas")}</p></article><article><h4>Resumo do Estudo de Caso que orienta este PAEE</h4><p>{obterResposta(casoPedagogico, "sintese-final", "necessidades-prioritarias")}</p></article>
    </div></DemoContentSection>
    <DemoContentSection numero="3" titulo="Síntese Diagnóstica"><p>{dados.objetivoGeral}</p></DemoContentSection>
    <DemoContentSection numero="4" titulo="Objetivos do Atendimento AEE"><div className="demo-objective-list">{dados.objetivos.map((objetivo, indice) => <article key={objetivo.id}><h4>Objetivo {indice + 1}</h4><DemoDataGrid itens={[
      { label: "Área/Eixo", value: objetivo.area }, { label: "Objetivo específico", value: objetivo.objetivo }, { label: "Estratégias", value: objetivo.estrategias }, { label: "Recursos", value: objetivo.recursos }, { label: "Critério de acompanhamento", value: objetivo.criterio },
    ]} /></article>)}</div></DemoContentSection>
    <DemoContentSection numero="5" titulo="Estratégias Pedagógicas"><DemoList itens={dados.objetivos.map((item) => item.estrategias)} /></DemoContentSection>
    <DemoContentSection numero="6" titulo="Recursos e Tecnologia Assistiva"><DemoList itens={dados.objetivos.map((item) => item.recursos)} /></DemoContentSection>
    <DemoContentSection numero="7" titulo="Organização do Atendimento"><p>{dados.articulacao}</p></DemoContentSection>
    <DemoContentSection numero="8" titulo="Critérios de Acompanhamento"><DemoList itens={dados.objetivos.map((item) => item.criterio)} /></DemoContentSection>
    <DemoContentSection numero="9" titulo="Encaminhamentos"><p>{obterResposta(casoPedagogico, "sintese-final", "encaminhamentos-finais")}</p></DemoContentSection>
  </>;
}

function PeiFilledContent({ dados, casoPedagogico }) {
  const aluno = casoPedagogico.aluno;
  return <><DemoContinuityTrail etapaAtiva={3} />
    <DemoContentSection numero="1" titulo="Identificação do estudante"><DemoDataGrid itens={[
      { label: "Nome completo", value: aluno.nomeExibicao }, { label: "Idade", value: aluno.idade }, { label: "Ano/Série", value: aluno.serieAno }, { label: "Turma", value: aluno.turma }, { label: "Turno", value: aluno.turno }, { label: "Escola", value: aluno.escola }, { label: "Professor(a) do AEE", value: aluno.professorAee }, { label: "Condição do estudante / diagnóstico informado", value: aluno.diagnosticoPrincipal },
    ]} /></DemoContentSection>
    <DemoContentSection numero="2" titulo="Participantes e articulação"><div className="demo-chip-list">{dados.apoios.map((apoio) => <span key={apoio}>{apoio}</span>)}</div></DemoContentSection>
    <DemoContentSection numero="3" titulo="Base pedagógica do PEI"><div className="demo-synthesis-grid">
      <article><h4>Potencialidades do estudante</h4><DemoList itens={casoPedagogico.sondagem.potencialidades} /></article><article><h4>Barreiras de acesso ao currículo</h4><p>{obterResposta(casoPedagogico, "barreiras-apoios", "barreiras-materiais")}</p></article><article><h4>Necessidades de apoio na sala comum</h4><p>{obterResposta(casoPedagogico, "sintese-final", "necessidades-prioritarias")}</p></article><article><h4>Resumo do Estudo de Caso/PAEE que orienta este PEI</h4><p>{dados.objetivoGeral}</p></article>
    </div></DemoContentSection>
    <DemoContentSection numero="5" titulo="Habilidades e objetos de conhecimento priorizados"><div className="demo-record-grid">{casoPedagogico.habilidades.map((item, indice) => <article key={item.id}><p className="demo-card-label">Prioridade {indice + 1}</p><h3>{item.titulo}</h3><p>{item.objetivo}</p></article>)}</div></DemoContentSection>
    <DemoContentSection numero="6" titulo="Objetivos e metas de aprendizagem"><DemoList itens={dados.metas} /></DemoContentSection>
    <DemoContentSection numero="7" titulo="Metodologias e propostas de atividades"><DemoList itens={dados.estrategiasSalaComum} /></DemoContentSection>
    <DemoContentSection numero="8" titulo="Recursos, acessibilidade e apoios"><div className="demo-chip-list">{dados.apoios.map((apoio) => <span key={apoio}>{apoio}</span>)}</div></DemoContentSection>
    <DemoContentSection numero="9" titulo="Formas de avaliação da aprendizagem"><p>{dados.avaliacao}</p></DemoContentSection>
    <DemoContentSection numero="10" titulo="Acompanhamento: desafios e expectativas"><div className="demo-record-grid">{casoPedagogico.acompanhamentos.map((item) => <article key={item.id}><h3>{item.origem}</h3><p><strong>Avanço:</strong> {item.avanco}</p><p><strong>Dificuldade:</strong> {item.dificuldade}</p></article>)}</div></DemoContentSection>
    <DemoContentSection numero="11" titulo="Encaminhamentos finais"><DemoList itens={casoPedagogico.acompanhamentos.map((item) => item.ajuste)} /></DemoContentSection>
  </>;
}

function AtendimentosFilledContent({ dados, casoPedagogico }) {
  return <><DemoContentSection titulo="Dados do Atendimento"><DemoDataGrid itens={[{ label: "Aluno", value: casoPedagogico.aluno.nomeExibicao }, { label: "Total de atendimentos", value: String(dados.length) }]} /></DemoContentSection><section className="demo-institution-group" aria-labelledby="demo-atendimento-historico"><h3 id="demo-atendimento-historico">Histórico de atendimentos</h3><div className="demo-timeline">{dados.map((item) => <article key={item.id}><p className="demo-card-label">{item.encontro}</p><DemoDataGrid itens={[{ label: "Data do atendimento", value: item.dataAtendimento }, { label: "Semana de referência", value: item.semanaReferencia }, { label: "Chamada semanal", value: item.statusPresenca }, { label: "Eixo temático", value: item.eixoTematico }]} /><h3>Planejamento do Atendimento</h3><p><strong>Objetivo relacionado:</strong> {item.objetivoRelacionado}</p><p><strong>Intervenção realizada:</strong> {item.atividade}</p><p><strong>Recursos utilizados:</strong> {item.recursos}</p><p><strong>Resposta observada:</strong> {item.resultado}</p><p><strong>Encaminhamentos e próximos passos:</strong> {item.proximaAcao}</p></article>)}</div></section></>;
}

function AcompanhamentosFilledContent({ dados, casoPedagogico }) {
  return <><DemoContentSection titulo="Histórico"><DemoDataGrid itens={[{ label: "Aluno", value: casoPedagogico.aluno.nomeExibicao }, { label: "Turma", value: casoPedagogico.aluno.turma }, { label: "Turno", value: casoPedagogico.aluno.turno }]} /></DemoContentSection><div className="demo-timeline demo-followup-timeline">{dados.map((item) => <article key={item.id}><p className="demo-card-label">{item.origem}</p><p><strong>Avanços percebidos:</strong> {item.avanco}</p><p><strong>Dificuldades observadas:</strong> {item.dificuldade}</p><p><strong>Encaminhamentos:</strong> {item.ajuste}</p></article>)}</div><DemoContentSection titulo="Síntese pedagógica de acompanhamento"><p>{casoPedagogico.monitoramento.sintese}</p></DemoContentSection></>;
}

function AlunoStructure({ dados, filled = false }) {
  const ausente = "Não informado no caso demonstrativo";
  const valor = (campo) => filled ? dados?.[campo] || ausente : "";
  const dataNascimento = valor("dataNascimento");
  return <div className="demo-form-accordions">
    <DemoFormAccordion index="1" title="Identificação da Escola" open><DemoLockedFields fields={[
      { label: "Nome da escola", value: valor("escola") }, { label: "Município", value: valor("municipio") }, { label: "Localização", type: "select", options: ["Urbana", "Rural"], value: valor("localizacao") },
    ]} /></DemoFormAccordion>
    <DemoFormAccordion index="2" title="Identificação do Estudante"><DemoLockedFields fields={[
      { label: "Nome completo", value: valor("nomeExibicao") }, { label: "Data de nascimento", type: filled && !dados?.dataNascimento ? "text" : "date", value: dataNascimento }, { label: "Série/Ano", value: valor("serieAno") }, { label: "Turma", value: valor("turma") }, { label: "Turno", type: "select", options: ["Manhã", "Tarde", "Integral", "Noite"], value: valor("turno") },
    ]} /></DemoFormAccordion>
    <DemoFormAccordion index="3" title="Informações Educacionais"><DemoLockedFields fields={[
      { label: "Diagnóstico Principal", value: valor("diagnosticoPrincipal") }, { label: "Comorbidades / Diagnósticos Associados", type: "textarea", wide: true, value: valor("comorbidades") }, { label: "Laudo", type: "select", options: ["Sim", "Não"], value: valor("laudo") },
    ]} /></DemoFormAccordion>
    <DemoFormAccordion index="4" title="Atendimento AEE"><DemoLockedFields fields={[{ label: "Professor(a) do AEE que acompanha o aluno", value: valor("professorAee") }]} /></DemoFormAccordion>
    <DemoFormAccordion index="5" title="Acompanhamento Escolar"><DemoLockedFields fields={[
      { label: "Tipo de acompanhamento", type: "select", options: ["Professor regente", "Mediador", "Assistente educacional", "Outro"], value: valor("tipoAcompanhamento") }, { label: "Nome do profissional", value: valor("nomeProfissional") },
    ]} /></DemoFormAccordion>
  </div>;
}

function AlunoContent(props) {
  return <DemoComparison structure={<AlunoStructure />} example={<AlunoFilledContent {...props} />} />;
}

function SondagemStructure() {
  return <div className="demo-form-accordions">
    <DemoFormAccordion title="Dados Gerais" open><DemoLockedFields fields={[
      { label: "Aluno", type: "select", options: ["Selecione"] }, { label: "Data de nascimento", type: "date" }, { label: "Data da sondagem", type: "date" }, { label: "Bimestre/período", type: "select", options: ["1º bimestre", "2º bimestre", "3º bimestre", "4º bimestre"] }, "Responsável pela aplicação",
    ]} /></DemoFormAccordion>
    {EIXOS_SONDAGEM.map((eixo, index) => <DemoFormAccordion key={eixo.nome} index={index + 1} title={eixo.nome} meta={`${eixo.perguntas.length} perguntas`}><div className="demo-survey-question-list">{eixo.perguntas.map((pergunta, questionIndex) => <div key={pergunta}><p><strong>{index + 1}.{questionIndex + 1}</strong> {pergunta}</p><DemoLockedField label="Nível observado" type="select" options={ESCALA_SONDAGEM} /></div>)}</div></DemoFormAccordion>)}
    <DemoFormAccordion title="Observações Gerais"><DemoLockedFields fields={[{ label: "Observações Gerais", type: "textarea", wide: true }]} /></DemoFormAccordion>
    <DemoFormAccordion title="Síntese Diagnóstica"><DemoLockedFields fields={[
      { label: "Potencialidades e interesses do estudante", type: "textarea", wide: true }, { label: "Habilidades consolidadas", type: "textarea", wide: true }, { label: "Habilidades em desenvolvimento", type: "textarea", wide: true }, { label: "Habilidades prioritárias para intervenções", type: "textarea", wide: true }, { label: "Recomendações pedagógicas e encaminhamentos", type: "textarea", wide: true },
    ]} /></DemoFormAccordion>
  </div>;
}

function SondagemContent(props) {
  return <DemoComparison structure={<SondagemStructure />} example={<SondagemFilledContent {...props} />} />;
}

function EstudoCasoStructure({ dados }) {
  const fontes = ["Estudante", "Família", "Professor regente", "AEE", "Coordenação", "Mediador/assistente", "Observação", "Documento", "Sondagem"];
  return <div className="demo-form-accordions">
    <DemoFormAccordion title="Dados administrativos do estudo" open><DemoLockedFields fields={[
      "Título do estudo", { label: "Data de início", type: "date" }, "Ano letivo / período", "Responsável pelo preenchimento", { label: "Status", type: "select", options: ["Em andamento", "Concluído"] },
    ]} /></DemoFormAccordion>
    {dados.blocos.map((bloco, index) => <DemoFormAccordion key={bloco.id} index={index + 1} title={bloco.titulo} meta={bloco.tipo === "identificacao" ? "Campos de identificação" : `${bloco.perguntas.length} perguntas`}>
      {bloco.tipo === "identificacao" ? <DemoLockedFields fields={bloco.campos.map((campo) => campo.label)} /> : <div className="demo-study-form-questions">{bloco.perguntas.map((pergunta) => <article key={pergunta.id}><h4>{pergunta.pergunta}</h4><DemoLockedFields fields={[
        { label: "Resposta", type: "textarea", wide: true }, { label: "Fonte da informação", type: "select", options: fontes }, { label: "Status", type: "select", options: ["Respondida", "Pendente", "Ignorada", "Revisar"] },
      ]} /></article>)}</div>}
    </DemoFormAccordion>)}
  </div>;
}

function EstudoCasoContent(props) {
  return <DemoComparison structure={<EstudoCasoStructure dados={props.dados} />} example={<EstudoCasoFilledContent {...props} />} />;
}

function HabilidadesStructure() {
  return <div className="demo-form-accordions"><DemoFormAccordion title="Registro de habilidades" open><div className="demo-form-helper"><strong>Sugestão a partir da Sondagem</strong><p>Na plataforma, as habilidades podem ser organizadas a partir dos resultados já registrados na Sondagem.</p><span aria-disabled="true">Gerar sugestões da Sondagem</span></div><DemoLockedFields fields={[
    { label: "Aluno", type: "select", options: ["Selecione"] }, { label: "Eixo temático", type: "textarea", wide: true }, { label: "Habilidades", type: "textarea", wide: true }, { label: "Bimestre", type: "select", options: ["1º bimestre", "2º bimestre", "3º bimestre", "4º bimestre"] }, { label: "Status", type: "select", options: ["Pendente", "Em desenvolvimento", "Consolidada"] },
  ]} /></DemoFormAccordion></div>;
}

function HabilidadesContent(props) {
  return <DemoComparison structure={<HabilidadesStructure />} example={<HabilidadesFilledContent {...props} />} />;
}

function DocumentStructure({ sections }) {
  return <div className="demo-form-accordions">{sections.map((section, index) => <DemoFormAccordion key={section.titulo} index={index + 1} title={section.titulo} open={index === 0}><DemoLockedFields fields={section.campos.map((campo) => ({ label: campo, type: /síntese|potencial|barreira|necessidade|resumo|objetivo|estratégia|recurso|critério|encaminhamento|metodologia|adaptaç|participação|articulação|avaliação|registro|desafio|avanço|expectativa|observaç/i.test(campo) ? "textarea" : "text", wide: /síntese|potencial|barreira|necessidade|resumo|objetivo|estratégia|recurso|critério|encaminhamento|metodologia|adaptaç|participação|articulação|avaliação|registro|desafio|avanço|expectativa|observaç/i.test(campo) }))} /></DemoFormAccordion>)}</div>;
}

function PaeeContent(props) {
  return <DemoComparison structure={<DocumentStructure sections={SECOES_PAEE} />} example={<details className="demo-filled-document" open><summary>Visualizar PAEE preenchido</summary><div><PaeeFilledContent {...props} /></div></details>} />;
}

function PeiContent(props) {
  return <DemoComparison structure={<DocumentStructure sections={SECOES_PEI} />} example={<details className="demo-filled-document" open><summary>Visualizar PEI preenchido</summary><div><PeiFilledContent {...props} /></div></details>} />;
}

function AtendimentoStructure() {
  return <div className="demo-form-accordions">
    <DemoFormAccordion title="Dados do Atendimento" open><DemoLockedFields fields={[
      { label: "Aluno", type: "select", options: ["Selecione"] }, { label: "Data do atendimento", type: "date" }, "Semana de referência", { label: "Chamada semanal", type: "select", options: ["Presente", "Ausente", "Atendimento remarcado"] },
    ]} /></DemoFormAccordion>
    <DemoFormAccordion title="Planejamento do Atendimento"><DemoLockedFields fields={[
      { label: "Eixo temático", type: "select", options: EIXOS_SONDAGEM.map((eixo) => eixo.nome) }, { label: "Complementações do atendimento", type: "textarea", wide: true },
    ]} /><DemoLockedChecks title="Habilidades do aluno por eixo temático" options={["Habilidade carregada da Sondagem", "Outra habilidade do eixo selecionado"]} /></DemoFormAccordion>
    <DemoFormAccordion title="Registro Pedagógico"><DemoLockedFields fields={[
      { label: "Dificuldades observadas", type: "textarea", wide: true }, { label: "Avanços percebidos", type: "textarea", wide: true }, { label: "Observações pedagógicas", type: "textarea", wide: true }, { label: "Encaminhamentos e próximos passos", type: "textarea", wide: true },
    ]} /></DemoFormAccordion>
  </div>;
}

function AtendimentosContent(props) {
  return <DemoComparison structure={<AtendimentoStructure />} example={<AtendimentosFilledContent {...props} />} />;
}

function AcompanhamentoStructure() {
  return <div className="demo-form-accordions">
    <DemoFormAccordion title="Diário de bordo" open><p className="demo-form-orientation"><strong>Quem preenche:</strong> Mediador e assistente educacional.</p><DemoLockedFields fields={[
      { label: "Aluno", type: "select", options: ["Selecione"] }, "Turma", "Turno", "Responsável pelo registro", "Função do responsável", { label: "Data do registro", type: "date" }, { label: "Semana de referência", type: "week" }, { label: "Disciplina observada", type: "textarea" }, { label: "Professor da aula", type: "textarea" }, { label: "Tipo de atividade", type: "select", options: ["atividade escrita", "atividade oral", "leitura", "interpretação", "cálculo", "avaliação", "atividade em grupo", "aula prática", "outro"] }, { label: "Ambiente", type: "select", options: ["sala comum", "sala de recursos", "pátio", "laboratório", "outro"] }, { label: "Participação do aluno", type: "select", options: ["não participou", "participou com muita mediação", "participou com apoio", "participou parcialmente com autonomia", "participou com autonomia"] }, { label: "Compreensão da proposta", type: "select", options: ["não compreendeu", "compreendeu com muita ajuda", "compreendeu com apoio", "compreendeu parcialmente sozinho", "compreendeu com autonomia"] }, { label: "Atenção e permanência", type: "select", options: ["não conseguiu se manter", "manteve-se por pouco tempo", "manteve-se com apoio constante", "manteve-se na maior parte do tempo", "manteve-se com autonomia"] }, { label: "Interação social", type: "select", options: ["recusou interação", "interagiu apenas com adulto", "interagiu com colegas com mediação", "interagiu parcialmente com autonomia", "interagiu bem com colegas e professor"] }, { label: "Autonomia", type: "select", options: ["dependência total", "alta dependência", "dependência moderada", "pequena necessidade de apoio", "autonomia satisfatória"] }, { label: "Resultado da intervenção", type: "select", options: ["não respondeu à estratégia", "respondeu minimamente", "respondeu parcialmente", "respondeu bem", "precisa continuidade", "precisa adaptação maior"] }, { label: "Avanços percebidos", type: "textarea", wide: true }, { label: "Dificuldades observadas", type: "textarea", wide: true }, { label: "Observação geral", type: "textarea", wide: true }, { label: "Encaminhamentos", type: "textarea", wide: true },
    ]} /><DemoLockedChecks title="Intervenções do professor observadas na aula" options={["atividade adaptada", "apoio visual", "instrução em etapas", "tempo ampliado", "trabalho em dupla", "uso de material concreto"]} /></DemoFormAccordion>
    <DemoFormAccordion title="Registro do professor"><p className="demo-form-orientation"><strong>Quem preenche:</strong> Professor regente da disciplina.</p><DemoLockedFields fields={[
      { label: "Aluno", type: "select", options: ["Selecione"] }, "Turma", "Turno", { label: "Disciplina", type: "select", options: ["Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia", "Arte", "Educação Física"] }, "Professor responsável", { label: "Data do registro", type: "date" }, { label: "Bimestre", type: "select", options: ["1º bimestre", "2º bimestre", "3º bimestre", "4º bimestre"] }, { label: "Participação do aluno na disciplina", type: "select", options: ["muito baixa", "baixa", "parcial", "boa com apoio", "boa com autonomia"] }, { label: "Compreensão dos conteúdos", type: "select", options: ["não compreende", "compreende minimamente", "compreende com mediação frequente", "compreende com algum apoio", "compreende satisfatoriamente"] }, { label: "Realização das atividades", type: "select", options: ["não realiza", "realiza raramente", "realiza com muita ajuda", "realiza com apoio", "realiza com relativa autonomia"] }, { label: "Desenvolvimento do aluno na disciplina", type: "textarea", wide: true }, { label: "Intervenções realizadas", type: "textarea", wide: true }, { label: "Estratégias que funcionaram", type: "textarea", wide: true }, { label: "Dificuldades observadas", type: "textarea", wide: true }, { label: "Encaminhamentos pedagógicos", type: "textarea", wide: true }, { label: "Avaliação das intervenções realizadas", type: "textarea", wide: true },
    ]} /><DemoLockedChecks title="Marcadores de intervenção" options={["atividade adaptada", "prova adaptada", "leitura mediada", "redução de itens", "apoio visual", "apoio oral", "trabalho em dupla", "mais tempo para concluir"]} /></DemoFormAccordion>
    <DemoFormAccordion title="Histórico e Síntese"><DemoLockedFields fields={[
      { label: "Tipo de registro", type: "select", options: ["Diário de bordo", "Registro do professor", "Atendimento AEE"] }, { label: "Período", type: "text" }, { label: "Síntese do acompanhamento", type: "textarea", wide: true },
    ]} /></DemoFormAccordion>
  </div>;
}

function AcompanhamentosContent(props) {
  return <DemoComparison structure={<AcompanhamentoStructure />} example={<AcompanhamentosFilledContent {...props} />} />;
}

function MonitoramentoContent({ dados, casoPedagogico }) {
  const atendimentos = casoPedagogico.atendimentosAee;
  return <><section className="demo-indicator-grid" aria-label="Resumo do monitoramento"><article><strong>{casoPedagogico.aluno.nomeExibicao}</strong><span>Nome do aluno</span></article><article><strong>{atendimentos.length}</strong><span>Total de atendimentos</span></article><article><strong>{dados.periodo}</strong><span>Período analisado</span></article><article><strong>{dados.status}</strong><span>Situação da evolução</span></article></section>
    <DemoContentSection titulo="Indicadores de evolução"><div className="demo-monitor-grid">{dados.indicadores.map((indicador) => <article key={indicador.habilidade}><div className="demo-record-heading"><h3>{indicador.habilidade}</h3><span>{indicador.inicial} → {indicador.atual}/{indicador.escala}</span></div><p>{indicador.analise}</p></article>)}</div></DemoContentSection>
    <DemoContentSection titulo="Síntese do monitoramento"><p>{dados.sintese}</p></DemoContentSection>
    <section className="demo-institution-group" aria-labelledby="demo-monitoramento-linha-tempo"><h3 id="demo-monitoramento-linha-tempo">Linha do tempo dos últimos atendimentos</h3><div className="demo-timeline">{atendimentos.map((item) => <article key={item.id}><p className="demo-card-label">{item.encontro}</p><h3>{item.objetivoRelacionado}</h3><p><strong>Avanços:</strong> {item.resultado}</p><p><strong>Encaminhamentos e próximos passos:</strong> {item.proximaAcao}</p></article>)}</div></section>
  </>;
}

function RelatoriosContent({ dados, casoPedagogico }) {
  return <>{dados.map((relatorio) => <article className="demo-report-document" key={relatorio.id}><header><p className="demo-card-label">{relatorio.periodo}</p><h3>{relatorio.titulo}</h3></header>
    <DemoContentSection numero="1" titulo="Dados de identificação"><DemoDataGrid itens={[{ label: "Nome da escola", value: casoPedagogico.aluno.escola }, { label: "Aluno", value: casoPedagogico.aluno.nomeExibicao }, { label: "Série/Ano", value: casoPedagogico.aluno.serieAno }, { label: "Turma", value: casoPedagogico.aluno.turma }, { label: "Turno", value: casoPedagogico.aluno.turno }, { label: "Profissional da Educação Especial", value: casoPedagogico.aluno.professorAee }]} /></DemoContentSection>
    <DemoContentSection numero="2" titulo="Introdução — contextualização do aluno"><p>{casoPedagogico.aluno.contexto}</p></DemoContentSection><DemoContentSection numero="3" titulo="Desenvolvimento — habilidades e progressos"><p>{relatorio.sintese}</p></DemoContentSection><DemoContentSection numero="4" titulo="Conclusão — parecer final"><p>{casoPedagogico.monitoramento.sintese}</p><h4>Encaminhamentos</h4><DemoList itens={relatorio.encaminhamentos} /></DemoContentSection>
  </article>)}<DemoContentSection titulo="Histórico do aluno"><p>{dados.length} relatório pedagógico demonstrativo disponível para visualização.</p></DemoContentSection></>;
}

function CoordenacaoContent({ dados, casoPedagogico }) {
  const totalComSondagem = dados.documentos.some(
    (documento) => documento.nome === "Sondagem" && documento.status === "Concluída",
  )
    ? dados.totalEstudantes
    : 0;
  return <><DemoContentSection titulo="Filtros aplicados"><DemoDataGrid itens={[{ label: "Aluno", value: casoPedagogico.aluno.nomeExibicao }, { label: "Turma", value: casoPedagogico.aluno.turma }, { label: "Turno", value: casoPedagogico.aluno.turno }]} /></DemoContentSection>
    <div className="demo-indicator-grid"><article><strong>{dados.totalEstudantes}</strong><span>Total de alunos cadastrados</span></article><article><strong>{totalComSondagem}</strong><span>Total de alunos com sondagem</span></article><article><strong>{dados.atendimentosRegistrados}</strong><span>Atendimentos AEE registrados</span></article><article><strong>{dados.habilidadesComEvolucao}</strong><span>Habilidades com evolução</span></article></div>
    <DemoContentSection titulo="Alertas pedagógicos"><DemoList itens={dados.alertas} /></DemoContentSection><DemoContentSection titulo="Situação da documentação"><div className="demo-document-list">{dados.documentos.map((documento) => <div key={documento.nome}><strong>{documento.nome}</strong><span>{documento.status}</span></div>)}</div></DemoContentSection>
    <DemoContentSection titulo="Alunos que precisam de atenção"><div className="demo-attention-student"><div><strong>{casoPedagogico.aluno.nomeExibicao}</strong><span>{casoPedagogico.aluno.turma} • {casoPedagogico.aluno.turno}</span></div><span>Em acompanhamento</span></div></DemoContentSection><DemoContentSection titulo="Síntese da coordenação"><p>{dados.sintese}</p></DemoContentSection>
  </>;
}

const CONTEUDOS_POR_MODULO = { aluno: AlunoContent, sondagem: SondagemContent, estudoCaso: EstudoCasoContent, habilidades: HabilidadesContent, paee: PaeeContent, pei: PeiContent, atendimentosAee: AtendimentosContent, acompanhamentos: AcompanhamentosContent, monitoramento: MonitoramentoContent, relatorios: RelatoriosContent, indicadoresCoordenacao: CoordenacaoContent };

function DemoModuleContent({ modulo, dados, casoPedagogico }) {
  const Content = CONTEUDOS_POR_MODULO[modulo.dataKey];
  return Content ? <Content dados={dados} casoPedagogico={casoPedagogico} /> : null;
}

export default DemoModuleContent;
