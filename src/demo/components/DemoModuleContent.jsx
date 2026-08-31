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

function DemoLockedField({ label, type = "text", options = [], wide = false, value = "", required = false }) {
  const className = wide ? "demo-locked-field is-wide" : "demo-locked-field";
  const selectOptions = value && !options.includes(value) ? [value, ...options] : options;
  const accessibleLabel = required ? `${label} (obrigatório)` : label;
  return <label className={className}><span>{label}{required ? " *" : ""}</span>
    {type === "textarea" ? <textarea rows="3" readOnly disabled placeholder="Campo para preenchimento" aria-label={accessibleLabel} aria-required={required || undefined} defaultValue={value} /> : type === "select" ? <select disabled defaultValue={value} aria-label={accessibleLabel} aria-required={required || undefined}><option value="">Selecione</option>{selectOptions.map((option) => <option key={option}>{option}</option>)}</select> : <input type={type} readOnly disabled placeholder="Campo para preenchimento" aria-label={accessibleLabel} aria-required={required || undefined} defaultValue={value} />}
  </label>;
}

function DemoLockedFields({ fields }) {
  return <div className="demo-locked-grid">{fields.map((field) => <DemoLockedField key={typeof field === "string" ? field : field.label} {...(typeof field === "string" ? { label: field } : field)} />)}</div>;
}

function DemoFormAccordion({ title, index, children, open = false, meta = "Campos bloqueados" }) {
  return <details className="demo-form-accordion" open={open}><summary><span><small>{index ? `Seção ${index}` : "Estrutura"}</small><strong>{title}</strong></span><em>{meta}</em></summary><div className="demo-form-accordion-body">{children}</div></details>;
}

function DemoLockedChecks({ title, options, selected = [] }) {
  return <fieldset className="demo-locked-checks" disabled><legend>{title}</legend><div>{options.map((option) => <label key={option}><input type="checkbox" disabled defaultChecked={selected.includes(option)} aria-label={option} /> <span>{option}</span></label>)}</div></fieldset>;
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
    <SondagemFormView dados={dados} casoPedagogico={casoPedagogico} filled />
    <section className="demo-institution-group" aria-labelledby="demo-sondagem-eixos"><h3 id="demo-sondagem-eixos">Síntese complementar dos 12 eixos</h3><div className="demo-assessment-grid">{dados.eixos.map((eixo) => <article key={eixo.nome}><div><strong>{eixo.nome}</strong><span>{eixo.nivel}</span></div><p>{eixo.observacao}</p></article>)}</div></section>
    <DemoContentSection titulo="Síntese Diagnóstica — leitura complementar"><div className="demo-synthesis-grid">
      <article><h4>Potencialidades e interesses do estudante</h4><DemoList itens={dados.potencialidades} /></article>
      <article><h4>Habilidades consolidadas</h4><DemoList itens={dados.habilidadesConsolidadas} /></article>
      <article><h4>Habilidades em desenvolvimento</h4><DemoList itens={dados.habilidadesEmDesenvolvimento} /></article>
      <article><h4>Habilidades prioritárias para intervenções</h4><DemoList itens={dados.prioridadesIntervencao} /></article>
      <article><h4>Recomendações e encaminhamentos</h4><p>{dados.recomendacoes}</p></article>
    </div></DemoContentSection>
  </div>;
}

function DadosAdministrativosEstudo({ dados, filled = false }) {
  const valor = (conteudo) => filled ? conteudo || "Não informado no caso demonstrativo" : "";
  return <DemoFormAccordion title="Dados administrativos do estudo" open><DemoLockedFields fields={[
    { label: "Título do estudo", value: valor(dados?.titulo) }, { label: "Data de início", type: "date", value: valor(dados?.dataInicio) }, { label: "Ano letivo / período", value: valor(dados?.anoLetivoPeriodo) }, { label: "Responsável pelo preenchimento", value: valor(dados?.responsavelPreenchimento) }, { label: "Status", type: "select", options: ["Em andamento", "Pendente de informações", "Pronto para síntese", "Concluído"], value: valor(dados?.status) },
  ]} /></DemoFormAccordion>;
}

function EstudoCasoFilledContent({ dados }) {
  const fontes = ["Estudante", "Família", "Professor regente", "AEE", "Coordenação", "Mediador/assistente", "Observação", "Documento", "Sondagem"];
  return <>
    <DadosAdministrativosEstudo dados={dados} filled />
    <section className="demo-institution-group" aria-labelledby="demo-estudo-progresso"><h3 id="demo-estudo-progresso">Progresso do Estudo de Caso</h3><div className="demo-study-overview" aria-label="Resumo do Estudo de Caso">
      <article><strong>{dados.blocos.length}</strong><span>Blocos estruturados</span></article><article><strong>{dados.totalPerguntas}</strong><span>Perguntas pedagógicas</span></article><article><strong>{dados.respondidas}/{dados.totalPerguntas}</strong><span>Progresso</span></article><article><strong>100%</strong><span>Concluído</span></article>
    </div></section>
    <section className="demo-institution-group" aria-labelledby="demo-estudo-blocos"><h3 id="demo-estudo-blocos">Blocos do Estudo de Caso</h3><p className="demo-study-guidance">Abra um bloco por vez para consultar as respostas e a respectiva fonte da informação.</p><div className="demo-study-blocks">{dados.blocos.map((bloco, indice) => <details key={bloco.id} open={indice === 0}><summary>
      <span className="demo-study-title"><small>Bloco {indice + 1}</small><strong>{bloco.titulo}</strong></span><span className="demo-study-meta"><small>Fonte: {bloco.fonteInformacao}</small><strong>{bloco.tipo === "identificacao" ? "Campos de referência" : `${bloco.perguntas.length} de ${bloco.perguntas.length} respondidas`}</strong></span>
    </summary>{bloco.tipo === "identificacao" ? <div className="demo-study-identification"><DemoLockedFields fields={bloco.campos.map((campo) => ({ label: campo.label, value: campo.value }))} /></div> : <div className="demo-question-list">{bloco.perguntas.map((pergunta) => <article key={pergunta.id}><h4>{pergunta.pergunta}</h4><DemoLockedFields fields={[
      { label: "Resposta", type: "textarea", wide: true, value: pergunta.resposta }, { label: "Fonte da informação", type: "select", options: fontes, value: bloco.fonteInformacao }, { label: "Status", type: "select", options: ["Respondida", "Pendente", "Ignorada", "Revisar"], value: "Respondida" },
    ]} /></article>)}{bloco.observacoes ? <article><h4>Observações</h4><p>{bloco.observacoes}</p></article> : null}</div>}</details>)}</div></section>
  </>;
}

function HabilidadesFilledContent({ dados, casoPedagogico }) {
  return <><DemoContinuityTrail etapaAtiva={1} /><HabilidadesFormView dados={dados} casoPedagogico={casoPedagogico} filled /><DemoContentSection titulo="Habilidades por bimestre"><div className="demo-bimester-heading"><strong>1º Bimestre</strong><span>{dados.length} habilidades registradas</span></div><div className="demo-record-grid">{dados.map((habilidade) => <article key={`resumo-${habilidade.id}`}><div className="demo-record-heading"><h3>{habilidade.titulo}</h3><span>{habilidade.status}</span></div><p>{habilidade.objetivo}</p></article>)}</div></DemoContentSection></>;
}

function PaeeFilledContent({ dados, casoPedagogico }) {
  return <><DemoContinuityTrail etapaAtiva={3} /><DocumentFormView sections={SECOES_PAEE} values={obterValoresPaee(dados, casoPedagogico)} filled /></>;
}

function PeiFilledContent({ dados, casoPedagogico }) {
  return <><DemoContinuityTrail etapaAtiva={3} /><DocumentFormView sections={SECOES_PEI} values={dados.formulario} filled /></>;
}

function AtendimentosFilledContent({ dados, casoPedagogico }) {
  const habilidades = casoPedagogico.habilidades.map((item) => item.objetivo);
  return <div className="demo-form-accordions">{dados.map((item, index) => <details className="demo-filled-document" key={item.id} open={index === 0}><summary>{item.encontro} — {item.dataAtendimento}</summary><div><AtendimentoFormView item={item} aluno={casoPedagogico.aluno} habilidades={habilidades} filled /></div></details>)}</div>;
}

function AcompanhamentosFilledContent({ dados, casoPedagogico }) {
  return <AcompanhamentoFormView dados={dados} casoPedagogico={casoPedagogico} filled />;
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

function SondagemFormView({ dados, casoPedagogico, filled = false }) {
  const ausente = "Não informado no caso demonstrativo";
  const aluno = casoPedagogico?.aluno;
  const valor = (conteudo, fallback = ausente) => filled ? conteudo || fallback : "";
  const lista = (itens) => valor(itens?.length ? itens.map((item) => `• ${item}`).join("\n") : "");
  return <div className="demo-form-accordions">
    <DemoFormAccordion title="Dados Gerais" open><DemoLockedFields fields={[
      { label: "Aluno", type: "select", options: ["Selecione"], value: valor(aluno?.nomeExibicao) }, { label: "Data de nascimento", type: filled && !aluno?.dataNascimento ? "text" : "date", value: valor(aluno?.dataNascimento) }, { label: "Data da sondagem", type: filled && !dados?.dataSondagem ? "text" : "date", value: valor(dados?.dataSondagem) }, { label: "Bimestre/período", type: "select", options: ["1º bimestre", "2º bimestre", "3º bimestre", "4º bimestre"], value: valor(dados?.periodo) }, { label: "Responsável pela aplicação", value: valor(dados?.responsavelAplicacao) },
    ]} /></DemoFormAccordion>
    {EIXOS_SONDAGEM.map((eixo, index) => {
      const resultadoEixo = dados?.eixos?.find((item) => item.nome === eixo.nome);
      return <DemoFormAccordion key={eixo.nome} index={index + 1} title={eixo.nome} meta={`${eixo.perguntas.length} perguntas`}><div className="demo-survey-question-list">{eixo.perguntas.map((pergunta, questionIndex) => <div key={pergunta}><p><strong>{index + 1}.{questionIndex + 1}</strong> {pergunta}</p><DemoLockedField label="Nível observado" type="select" options={ESCALA_SONDAGEM} value={filled ? resultadoEixo?.nivel || "Não observado" : ""} /></div>)}</div></DemoFormAccordion>;
    })}
    <DemoFormAccordion title="Observações Gerais"><DemoLockedFields fields={[{ label: "Observações Gerais", type: "textarea", wide: true, value: valor(dados?.observacoesGerais) }]} /></DemoFormAccordion>
    <DemoFormAccordion title="Síntese Diagnóstica"><DemoLockedFields fields={[
      { label: "Potencialidades e interesses do estudante", type: "textarea", wide: true, value: lista(dados?.potencialidades) }, { label: "Habilidades consolidadas", type: "textarea", wide: true, value: lista(dados?.habilidadesConsolidadas) }, { label: "Habilidades em desenvolvimento", type: "textarea", wide: true, value: lista(dados?.habilidadesEmDesenvolvimento) }, { label: "Habilidades prioritárias para intervenções", type: "textarea", wide: true, value: lista(dados?.prioridadesIntervencao) }, { label: "Recomendações pedagógicas e encaminhamentos", type: "textarea", wide: true, value: valor(dados?.recomendacoes) },
    ]} /></DemoFormAccordion>
  </div>;
}

function SondagemContent(props) {
  return <DemoComparison structure={<SondagemFormView />} example={<SondagemFilledContent {...props} />} />;
}

function EstudoCasoStructure({ dados }) {
  const fontes = ["Estudante", "Família", "Professor regente", "AEE", "Coordenação", "Mediador/assistente", "Observação", "Documento", "Sondagem"];
  return <div className="demo-form-accordions">
    <DadosAdministrativosEstudo />
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

function HabilidadesFormView({ dados = [], casoPedagogico, filled = false }) {
  const registros = filled ? dados : [null];
  return <div className="demo-form-accordions">{registros.map((habilidade, index) => <DemoFormAccordion key={habilidade?.id || "habilidade-vazia"} title={filled ? `Registro de habilidade ${index + 1}` : "Registro de habilidades"} open={index === 0}><div className="demo-form-helper"><strong>Geração automática pela sondagem</strong><p>Na plataforma, as habilidades podem ser organizadas a partir dos resultados já registrados na Sondagem.</p><span aria-disabled="true">Gerar sugestões da Sondagem</span></div><DemoLockedFields fields={[
    { label: "Aluno", type: "select", options: ["Selecione"], value: filled ? casoPedagogico.aluno.nomeExibicao : "", required: true },
    { label: "Eixo temático", type: "textarea", wide: true, value: filled ? habilidade.titulo : "", required: true },
    { label: "Habilidades do eixo temático", type: "textarea", wide: true, value: filled ? habilidade.objetivo : "", required: true },
    { label: "Bimestre", type: "select", options: ["1º", "2º", "3º", "4º"], value: filled ? habilidade.bimestre : "", required: true },
    { label: "Status", type: "select", options: ["Em andamento", "Concluída", "Pausada"], value: filled ? habilidade.status : "", required: true },
  ]} />{filled ? <p className="demo-form-orientation"><strong>Origem:</strong> {habilidade.origem}</p> : null}</DemoFormAccordion>)}</div>;
}

function HabilidadesStructure() {
  return <HabilidadesFormView />;
}

function HabilidadesContent(props) {
  return <DemoComparison structure={<HabilidadesStructure />} example={<HabilidadesFilledContent {...props} />} />;
}

function obterValorCampo(field, values, filled) {
  if (!filled) return { ...field, value: "" };
  const value = values?.[field.key] || "Não informado no caso demonstrativo";
  const type = value === "Não informado no caso demonstrativo" && ["date", "month", "week", "number"].includes(field.type) ? "text" : field.type;
  return { ...field, type, value };
}

function DocumentFormView({ sections, values = {}, filled = false }) {
  return <div className="demo-form-accordions">{sections.map((section, index) => {
    const sectionValues = values?.[section.key];
    const records = section.repeat ? Array.from({ length: section.repeat }, (_, itemIndex) => sectionValues?.[itemIndex] || {}) : [sectionValues || {}];
    return <DemoFormAccordion key={section.titulo} index={index + 1} title={section.titulo} open={index === 0} meta={filled ? "Exemplo preenchido" : "Campos bloqueados"}>{section.repeat ? <div className="demo-objective-list">{records.map((record, recordIndex) => <article key={`${section.key}-${recordIndex}`}><h4>{section.repeatLabel} {recordIndex + 1}</h4><DemoLockedFields fields={section.campos.map((field) => obterValorCampo(field, record, filled))} /></article>)}</div> : <DemoLockedFields fields={section.campos.map((field) => obterValorCampo(field, records[0], filled))} />}</DemoFormAccordion>;
  })}</div>;
}

function obterValoresPaee(dados, casoPedagogico) {
  const aluno = casoPedagogico.aluno;
  const lista = (itens) => itens.join("\n");
  return {
    dadosGerais: { anoLetivo: dados.anoLetivo, periodo: dados.periodo, dataInicio: dados.dataInicio, dataFim: dados.dataFim, statusGeral: dados.status, responsavel: dados.responsavel },
    identificacao: { alunoCadastrado: aluno.nomeExibicao, nome: aluno.nomeExibicao, dataNascimento: aluno.dataNascimento, serieAno: aluno.serieAno, turma: aluno.turma, turno: aluno.turno, professorAee: aluno.professorAee, diagnostico: aluno.diagnosticoPrincipal, nomeEscola: aluno.escola, municipio: aluno.municipio, localizacao: aluno.localizacao },
    basePedagogica: { potencialidades: lista(casoPedagogico.sondagem.potencialidades), barreiras: obterResposta(casoPedagogico, "barreiras-apoios", "barreiras-ambiente"), necessidadesEspecificas: obterResposta(casoPedagogico, "informacoes-aee", "necessidades-especificas"), resumoEstudoCaso: obterResposta(casoPedagogico, "sintese-final", "necessidades-prioritarias") },
    sinteseDiagnostica: { sinteseDiagnostica: dados.objetivoGeral },
    objetivos: dados.objetivos,
    estrategiasPedagogicas: { estrategiasPedagogicas: lista(dados.objetivos.map((item) => item.estrategias)) },
    recursosTecnologiaAssistiva: { recursosTecnologiaAssistiva: lista(dados.objetivos.map((item) => item.recursos)) },
    organizacaoAtendimento: dados.organizacaoAtendimento,
    criteriosAcompanhamento: { criteriosAcompanhamento: lista(dados.objetivos.map((item) => item.criterio)) },
    encaminhamentos: { encaminhamentos: obterResposta(casoPedagogico, "sintese-final", "encaminhamentos-finais") },
  };
}

function PaeeContent(props) {
  return <DemoComparison structure={<DocumentFormView sections={SECOES_PAEE} />} example={<PaeeFilledContent {...props} />} />;
}

function PeiContent(props) {
  return <DemoComparison structure={<DocumentFormView sections={SECOES_PEI} />} example={<PeiFilledContent {...props} />} />;
}

function AtendimentoFormView({ item = {}, aluno, habilidades = [], filled = false }) {
  const valor = (key) => filled ? item[key] || "Não informado no caso demonstrativo" : "";
  return <div className="demo-form-accordions">
    <DemoFormAccordion title="Dados do Atendimento" open><DemoLockedFields fields={[
      { label: "Aluno", type: "select", options: ["Selecione"], value: filled ? aluno.nomeExibicao : "", required: true }, { label: "Data do atendimento", type: "date", value: valor("dataAtendimentoIso"), required: true }, { label: "Semana de referência", value: valor("semanaReferencia"), required: true }, { label: "Chamada semanal", type: "select", options: ["Presente", "Ausente", "Atendimento remarcado"], value: valor("statusPresenca"), required: true },
    ]} /></DemoFormAccordion>
    <DemoFormAccordion title="Planejamento do Atendimento"><DemoLockedFields fields={[
      { label: "Eixo temático", type: "select", options: EIXOS_SONDAGEM.map((eixo) => eixo.nome), value: valor("eixoTematico"), required: true }, { label: "Complementações do atendimento", type: "textarea", wide: true, value: valor("habilidadesComplementares") },
    ]} /><DemoLockedChecks title="Habilidades do aluno por eixo temático" options={habilidades} selected={filled ? item.habilidadesSelecionadas : []} /></DemoFormAccordion>
    <DemoFormAccordion title="Registro Pedagógico"><DemoLockedFields fields={[
      { label: "Dificuldades observadas", type: "textarea", wide: true, value: valor("dificuldadesObservadas") }, { label: "Avanços percebidos", type: "textarea", wide: true, value: valor("avancosPercebidos") }, { label: "Observações pedagógicas", type: "textarea", wide: true, value: valor("observacoes") }, { label: "Encaminhamentos e próximos passos", type: "textarea", wide: true, value: valor("encaminhamentos") },
    ]} /></DemoFormAccordion>
  </div>;
}

function AtendimentoStructure({ casoPedagogico }) {
  return <AtendimentoFormView aluno={casoPedagogico.aluno} habilidades={casoPedagogico.habilidades.map((item) => item.objetivo)} />;
}

function AtendimentosContent(props) {
  return <DemoComparison structure={<AtendimentoStructure casoPedagogico={props.casoPedagogico} />} example={<AtendimentosFilledContent {...props} />} />;
}

const OPCOES_ACOMPANHAMENTO = {
  tipoAtividade: ["atividade escrita", "atividade oral", "leitura", "interpretação", "cálculo", "avaliação", "atividade em grupo", "aula prática", "outro"],
  ambiente: ["sala comum", "sala de recursos", "pátio", "laboratório", "outro"],
  participacao: ["não participou", "participou com muita mediação", "participou com apoio", "participou parcialmente com autonomia", "participou com autonomia"],
  compreensao: ["não compreendeu", "compreendeu com muita ajuda", "compreendeu com apoio", "compreendeu parcialmente sozinho", "compreendeu com autonomia"],
  atencao: ["não conseguiu se manter", "manteve-se por pouco tempo", "manteve-se com apoio constante", "manteve-se na maior parte do tempo", "manteve-se com autonomia"],
  interacao: ["recusou interação", "interagiu apenas com adulto", "interagiu com colegas com mediação", "interagiu parcialmente com autonomia", "interagiu bem com colegas e professor"],
  autonomia: ["dependência total", "alta dependência", "dependência moderada", "pequena necessidade de apoio", "autonomia satisfatória"],
  intervencoes: ["atividade adaptada", "explicação individual", "apoio visual", "apoio oral", "leitura mediada", "instrução em etapas", "redução de itens", "tempo ampliado", "repetição orientada", "modelagem", "trabalho em dupla", "colega de apoio", "flexibilização na correção", "retomada de combinados", "mediação de comportamento", "uso de material concreto", "outro"],
  resultado: ["não respondeu à estratégia", "respondeu minimamente", "respondeu parcialmente", "respondeu bem", "precisa continuidade", "precisa adaptação maior"],
  disciplinas: ["Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia", "Inglês", "Espanhol", "Arte", "Educação Física", "Ensino Religioso"],
  participacaoDisciplina: ["muito baixa", "baixa", "parcial", "boa com apoio", "boa com autonomia"],
  compreensaoConteudo: ["não compreende", "compreende minimamente", "compreende com mediação frequente", "compreende com algum apoio", "compreende satisfatoriamente"],
  realizacaoAtividades: ["não realiza", "realiza raramente", "realiza com muita ajuda", "realiza com apoio", "realiza com relativa autonomia"],
  marcadores: ["atividade adaptada", "prova adaptada", "leitura mediada", "redução de itens", "apoio visual", "apoio oral", "trabalho em dupla", "mais tempo para concluir", "acompanhamento individual", "flexibilização na correção"],
};

function AcompanhamentoFormView({ dados = [], casoPedagogico, filled = false }) {
  const diario = dados.find((item) => item.tipo === "diario_bordo") || {};
  const professor = dados.find((item) => item.tipo === "registro_professor") || {};
  const ausente = "Não informado no caso demonstrativo";
  const valor = (registro, key) => filled ? registro[key] || ausente : "";
  const aluno = casoPedagogico?.aluno;
  return <div className="demo-form-accordions">
    <DemoFormAccordion title="Diário de bordo" open><p className="demo-form-orientation"><strong>Quem preenche:</strong> Mediador e assistente educacional.</p><DemoLockedFields fields={[
      { label: "Aluno", type: "select", options: ["Selecione"], value: filled ? aluno.nomeExibicao : "", required: true }, { label: "Turma", value: filled ? aluno.turma : "" }, { label: "Turno", value: filled ? aluno.turno : "" }, { label: "Responsável pelo registro", value: valor(diario, "responsavelNome"), required: true }, { label: "Função do responsável", value: valor(diario, "funcaoResponsavel"), required: true }, { label: "Data do registro", type: "date", value: valor(diario, "dataRegistro"), required: true }, { label: "Semana de referência", type: "week", value: valor(diario, "semanaReferencia"), required: true }, { label: "Disciplina observada", type: "textarea", value: valor(diario, "disciplina"), required: true }, { label: "Professor da aula", type: "textarea", value: valor(diario, "professorAula"), required: true }, { label: "Tipo de atividade", type: "select", options: OPCOES_ACOMPANHAMENTO.tipoAtividade, value: valor(diario, "tipoAtividade"), required: true }, { label: "Ambiente", type: "select", options: OPCOES_ACOMPANHAMENTO.ambiente, value: valor(diario, "ambiente"), required: true }, { label: "Participação do aluno", type: "select", options: OPCOES_ACOMPANHAMENTO.participacao, value: valor(diario, "participacao"), required: true }, { label: "Compreensão da proposta", type: "select", options: OPCOES_ACOMPANHAMENTO.compreensao, value: valor(diario, "compreensao"), required: true }, { label: "Atenção e permanência", type: "select", options: OPCOES_ACOMPANHAMENTO.atencao, value: valor(diario, "atencaoPermanencia"), required: true }, { label: "Interação social", type: "select", options: OPCOES_ACOMPANHAMENTO.interacao, value: valor(diario, "interacaoSocial"), required: true }, { label: "Autonomia", type: "select", options: OPCOES_ACOMPANHAMENTO.autonomia, value: valor(diario, "autonomia"), required: true }, { label: "Resultado da intervenção", type: "select", options: OPCOES_ACOMPANHAMENTO.resultado, value: valor(diario, "resultadoIntervencao"), required: true }, { label: "Avanços percebidos", type: "textarea", wide: true, value: valor(diario, "avancosPercebidos") }, { label: "Dificuldades observadas", type: "textarea", wide: true, value: valor(diario, "dificuldadesObservadas") }, { label: "Observação geral", type: "textarea", wide: true, value: valor(diario, "observacaoGeral") }, { label: "Encaminhamentos", type: "textarea", wide: true, value: valor(diario, "encaminhamentos") },
    ]} /><DemoLockedChecks title="Intervenções do professor observadas na aula" options={OPCOES_ACOMPANHAMENTO.intervencoes} selected={filled ? diario.intervencoesProfessorObservadas : []} /></DemoFormAccordion>
    <DemoFormAccordion title="Registro do professor"><p className="demo-form-orientation"><strong>Quem preenche:</strong> Professor regente da disciplina.</p><DemoLockedFields fields={[
      { label: "Aluno", type: "select", options: ["Selecione"], value: filled ? aluno.nomeExibicao : "", required: true }, { label: "Turma", value: filled ? aluno.turma : "" }, { label: "Turno", value: filled ? aluno.turno : "" }, { label: "Disciplina", type: "select", options: OPCOES_ACOMPANHAMENTO.disciplinas, value: valor(professor, "disciplina"), required: true }, { label: "Professor responsável", value: valor(professor, "professorNome"), required: true }, { label: "Data do registro", type: "date", value: valor(professor, "dataRegistro"), required: true }, { label: "Bimestre", type: "select", options: ["1º bimestre", "2º bimestre", "3º bimestre", "4º bimestre"], value: valor(professor, "bimestre"), required: true }, { label: "Participação do aluno na disciplina", type: "select", options: OPCOES_ACOMPANHAMENTO.participacaoDisciplina, value: valor(professor, "participacaoDisciplina"), required: true }, { label: "Compreensão dos conteúdos", type: "select", options: OPCOES_ACOMPANHAMENTO.compreensaoConteudo, value: valor(professor, "compreensaoConteudo"), required: true }, { label: "Realização das atividades", type: "select", options: OPCOES_ACOMPANHAMENTO.realizacaoAtividades, value: valor(professor, "realizacaoAtividades"), required: true }, { label: "Desenvolvimento do aluno na disciplina", type: "textarea", wide: true, value: valor(professor, "desenvolvimentoDisciplina"), required: true }, { label: "Intervenções realizadas", type: "textarea", wide: true, value: valor(professor, "intervencoesRealizadas"), required: true }, { label: "Estratégias que funcionaram", type: "textarea", wide: true, value: valor(professor, "estrategiasQueFuncionaram"), required: true }, { label: "Dificuldades observadas", type: "textarea", wide: true, value: valor(professor, "dificuldadesObservadas"), required: true }, { label: "Encaminhamentos pedagógicos", type: "textarea", wide: true, value: valor(professor, "encaminhamentosPedagogicos"), required: true }, { label: "Avaliação das intervenções realizadas", type: "textarea", wide: true, value: valor(professor, "avaliacaoIntervencoesRealizadas") },
    ]} /><DemoLockedChecks title="Marcadores de intervenção" options={OPCOES_ACOMPANHAMENTO.marcadores} selected={filled ? professor.marcadoresIntervencao : []} /></DemoFormAccordion>
    <DemoFormAccordion title="Histórico"><DemoLockedFields fields={[
      { label: "Aluno", type: "select", options: ["Todos"], value: filled ? aluno.nomeExibicao : "" }, { label: "Tipo de registro", type: "select", options: ["Todos", "Diário de bordo", "Registro do professor", "Atendimento AEE"], value: filled ? "Todos" : "" }, { label: "Mês", type: "month", value: filled ? "2026-03" : "" }, { label: "Profissional", type: "select", options: ["Todos"], value: filled ? "Todos" : "" }, { label: "Data inicial", type: "date", value: filled ? "2026-03-01" : "" }, { label: "Data final", type: "date", value: filled ? "2026-03-31" : "" },
    ]} /></DemoFormAccordion>
    <DemoFormAccordion title="Síntese"><DemoLockedFields fields={[
      { label: "Aluno", type: "select", options: ["Selecione"], value: filled ? aluno.nomeExibicao : "" }, { label: "Mês", type: "month", value: filled ? "2026-03" : "" }, { label: "Data inicial", type: "date", value: filled ? "2026-03-01" : "" }, { label: "Data final", type: "date", value: filled ? "2026-03-31" : "" }, { label: "Síntese pedagógica automática", type: "textarea", wide: true, value: filled ? casoPedagogico.monitoramento.sintese : "" },
    ]} /></DemoFormAccordion>
  </div>;
}

function AcompanhamentoStructure() {
  return <AcompanhamentoFormView />;
}

function AcompanhamentosContent(props) {
  return <DemoComparison structure={<AcompanhamentoStructure />} example={<AcompanhamentosFilledContent {...props} />} />;
}

function MonitoramentoContent({ dados, casoPedagogico }) {
  const atendimentos = [...casoPedagogico.atendimentosAee].reverse();
  const ultimo = atendimentos[0];
  const habilidades = [...new Set(atendimentos.flatMap((item) => item.habilidadesSelecionadas || []))];
  const eixoContagem = atendimentos.reduce((acc, item) => ({ ...acc, [item.eixoTematico]: (acc[item.eixoTematico] || 0) + 1 }), {});
  const eixoMaisTrabalhado = Object.entries(eixoContagem).sort((a, b) => b[1] - a[1])[0]?.[0] || "Não informado";
  const diasDesdeUltimo = ultimo?.dataAtendimentoIso ? Math.max(0, Math.floor((Date.now() - new Date(`${ultimo.dataAtendimentoIso}T12:00:00`).getTime()) / 86400000)) : null;
  const resumoTextual = (titulo, itens) => <article><span>{titulo}</span><ul>{itens.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></article>;
  return <><DemoContentSection titulo="Consulta por aluno"><DemoDataGrid itens={[{ label: "Aluno", value: casoPedagogico.aluno.nomeExibicao }]} /></DemoContentSection>
    <section className="demo-indicator-grid" aria-label="Resumo do monitoramento"><article><strong>{casoPedagogico.aluno.nomeExibicao}</strong><span>Nome do aluno</span></article><article><strong>{ultimo?.dataAtendimento || "Sem registros"}</strong><span>Último atendimento</span></article><article><strong>{atendimentos.length}</strong><span>Total de atendimentos</span></article><article><strong>{diasDesdeUltimo === null ? "Sem registros" : `${diasDesdeUltimo} dias`}</strong><span>Dias desde o último atendimento</span></article><article><strong>{eixoMaisTrabalhado}</strong><span>Eixo temático mais trabalhado</span></article>{resumoTextual("Habilidades desenvolvidas", habilidades)}{resumoTextual("Avanços observados", atendimentos.map((item) => item.avancosPercebidos))}{resumoTextual("Dificuldades observadas", atendimentos.map((item) => item.dificuldadesObservadas))}{resumoTextual("Observações pedagógicas recentes", atendimentos.map((item) => item.observacoes))}</section>
    <section className="demo-institution-group" aria-labelledby="demo-monitoramento-linha-tempo"><h3 id="demo-monitoramento-linha-tempo">Linha do tempo dos últimos atendimentos</h3><p className="demo-study-guidance">Os cinco registros mais recentes são apresentados do mais novo para o mais antigo.</p><div className="demo-timeline">{atendimentos.map((item) => <article key={item.id}><p className="demo-card-label">{item.dataAtendimento} • Semana: {item.semanaReferencia}</p><p><strong>Eixo temático:</strong> {item.eixoTematico}</p><p><strong>Habilidades trabalhadas:</strong> {(item.habilidadesSelecionadas || []).join("; ")}</p><p><strong>Avanços:</strong> {item.avancosPercebidos}</p><p><strong>Dificuldades:</strong> {item.dificuldadesObservadas}</p><p><strong>Observações:</strong> {item.observacoes}</p><p><strong>Encaminhamentos e próximos passos:</strong> {item.encaminhamentos}</p></article>)}</div></section>
    <DemoContentSection titulo="Síntese do monitoramento"><p>{dados.sintese}</p></DemoContentSection>
  </>;
}

function RelatoriosContent({ dados, casoPedagogico }) {
  const ausente = "Não informado no caso demonstrativo";
  const aluno = casoPedagogico.aluno;
  return <>{dados.map((relatorio) => <article className="demo-report-document" key={relatorio.id}><header><p className="demo-card-label">{relatorio.periodo}</p><h3>{relatorio.titulo}</h3></header>
    <DemoContentSection numero="1" titulo="DADOS DE IDENTIFICAÇÃO"><DemoDataGrid itens={[{ label: "Nome da escola", value: aluno.escola }, { label: "Município", value: aluno.municipio }, { label: "Localização", value: aluno.localizacao }, { label: "Aluno", value: aluno.nomeExibicao }, { label: "Data de nascimento", value: aluno.dataNascimento }, { label: "Série/Ano", value: aluno.serieAno }, { label: "Turno", value: aluno.turno }, { label: "Laudo", value: aluno.laudo }, { label: "Comprometimento/condição informada", value: aluno.diagnosticoPrincipal }, { label: "Pai", value: ausente }, { label: "Mãe", value: ausente }, { label: "Profissional da Educação Especial", value: aluno.professorAee }, { label: "Função do profissional", value: relatorio.funcaoProfissional }, { label: "Bimestre", value: relatorio.bimestre }, { label: "Período analisado", value: relatorio.periodoAnalisado }]} /></DemoContentSection>
    <DemoContentSection numero="2" titulo="INTRODUÇÃO — CONTEXTUALIZAÇÃO DO ALUNO"><p>{relatorio.introducao}</p></DemoContentSection>
    <DemoContentSection numero="3" titulo="DESENVOLVIMENTO — HABILIDADES E PROGRESSOS"><div className="demo-synthesis-grid"><article><h4>3.1 Interação social, comportamento e comunicação</h4><p>{relatorio.interacaoComunicacao}</p></article><article><h4>3.2 Habilidades motoras</h4><p>{relatorio.habilidadesMotoras}</p></article><article><h4>3.3 Habilidades cognitivas</h4><p>{relatorio.habilidadesCognitivas}</p></article><article><h4>3.4 Autonomia e independência</h4><p>{relatorio.autonomiaIndependencia}</p></article><article><h4>3.5 Outras informações relevantes observadas</h4><p>{relatorio.outrasInformacoes}</p></article></div></DemoContentSection>
    <DemoContentSection numero="4" titulo="CONCLUSÃO — PARECER FINAL"><p><strong>Situação dos objetivos:</strong> {relatorio.situacaoObjetivos}</p><p>{relatorio.conclusaoParecer}</p></DemoContentSection>
    <DemoContentSection numero="5" titulo="LOCAL, DATA E ASSINATURAS"><DemoDataGrid itens={[{ label: "Local", value: relatorio.localAssinatura }, { label: "Data", value: relatorio.dataAssinatura }, { label: "Assinatura do profissional", value: relatorio.assinaturaProfissional }, { label: "Cargo/função", value: relatorio.cargoFuncao }, { label: "Assinatura da gestão escolar", value: ausente }]} /></DemoContentSection>
    <DemoContentSection numero="6" titulo="ANEXOS/EVIDÊNCIAS"><p>Recurso futuro para incluir evidências do acompanhamento, como atividades, fotos autorizadas, registros, cronogramas ou documentos complementares.</p></DemoContentSection>
  </article>)}<DemoContentSection titulo="Histórico do aluno"><p>{dados.length} relatório pedagógico demonstrativo disponível para visualização.</p></DemoContentSection></>;
}

function CoordenacaoContent({ dados, casoPedagogico }) {
  const totalComSondagem = dados.documentos.some(
    (documento) => documento.nome === "Sondagem" && documento.status === "Concluída",
  )
    ? dados.totalEstudantes
    : 0;
  const totalRegistros = dados.atendimentosRegistrados + casoPedagogico.acompanhamentos.length;
  return <><DemoContentSection titulo="Filtros"><DemoDataGrid itens={[{ label: "Turma", value: casoPedagogico.aluno.turma }, { label: "Turno", value: casoPedagogico.aluno.turno }, { label: "Aluno", value: casoPedagogico.aluno.nomeExibicao }, { label: "Profissional", value: casoPedagogico.aluno.professorAee }, { label: "Período (mês)", value: "Março de 2026" }, { label: "Data inicial", value: "01/03/2026" }, { label: "Data final", value: "31/03/2026" }]} /></DemoContentSection>
    <div className="demo-indicator-grid"><article><strong>{dados.totalEstudantes}</strong><span>Total de alunos cadastrados</span></article><article><strong>{totalComSondagem}</strong><span>Total de alunos com sondagem</span></article><article><strong>0</strong><span>Total de alunos sem sondagem</span></article><article><strong>1</strong><span>Alunos com acompanhamento recente</span></article><article><strong>0</strong><span>Sem acompanhamento recente</span></article><article><strong>{totalRegistros}</strong><span>Total de registros no mês</span></article></div>
    <DemoContentSection titulo="Alertas pedagógicos"><div className="demo-document-list">{["Alunos sem sondagem diagnóstica", "Alunos sem habilidades cadastradas", "Alunos sem atendimento AEE", "Alunos sem acompanhamento", "Sem acompanhamento nos últimos 15 dias", "Alunos sem registro do professor no 1º bimestre", "Alunos sem síntese no período"].map((alerta) => <div key={alerta}><strong>{alerta}</strong><span>0 — Nenhum alerta nesta categoria</span></div>)}</div></DemoContentSection>
    <DemoContentSection titulo="Alunos que precisam de atenção"><div className="demo-indicator-grid"><article><strong>0</strong><span>Nível alto de atenção</span></article><article><strong>0</strong><span>Nível médio de atenção</span></article><article><strong>1</strong><span>Nível baixo de atenção</span></article></div><div className="demo-attention-student"><div><strong>{casoPedagogico.aluno.nomeExibicao}</strong><span>{casoPedagogico.aluno.turma} • Sondagem concluída • 4 atendimentos AEE</span></div><span>Nível baixo</span></div></DemoContentSection>
    <DemoContentSection titulo="Resumo por profissional"><div className="demo-synthesis-grid"><article><h4>Registros por perfil</h4><p><strong>Professor(a) do AEE:</strong> {dados.atendimentosRegistrados}</p><p><strong>Professor regente:</strong> 1</p><p><strong>Mediador/assistente:</strong> 1</p></article><article><h4>Profissionais com mais registros</h4><p><strong>{casoPedagogico.aluno.professorAee}:</strong> {dados.atendimentosRegistrados}</p><p><strong>Profissionais fictícios da sala comum:</strong> 2</p></article></div></DemoContentSection>
    <DemoContentSection titulo="Situação da documentação"><div className="demo-document-list">{dados.documentos.map((documento) => <div key={documento.nome}><strong>{documento.nome}</strong><span>{documento.status}</span></div>)}</div></DemoContentSection><DemoContentSection titulo="Síntese da coordenação"><p>{dados.sintese}</p></DemoContentSection>
  </>;
}

const CONTEUDOS_POR_MODULO = { aluno: AlunoContent, sondagem: SondagemContent, estudoCaso: EstudoCasoContent, habilidades: HabilidadesContent, paee: PaeeContent, pei: PeiContent, atendimentosAee: AtendimentosContent, acompanhamentos: AcompanhamentosContent, monitoramento: MonitoramentoContent, relatorios: RelatoriosContent, indicadoresCoordenacao: CoordenacaoContent };

function DemoModuleContent({ modulo, dados, casoPedagogico }) {
  const Content = CONTEUDOS_POR_MODULO[modulo.dataKey];
  return Content ? <Content dados={dados} casoPedagogico={casoPedagogico} /> : null;
}

export default DemoModuleContent;
