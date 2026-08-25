const PRAZOS_PRIORIZACAO = [
  "Curto prazo — 1 mês",
  "Médio prazo — 2 meses",
  "Longo prazo — 6 meses",
];

const PRIORIDADES = ["Alta", "Média", "Baixa"];

function Campo({ id, label, placeholder, type = "text", className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} type={type} placeholder={placeholder} />
    </div>
  );
}

function CampoTexto({ id, label, placeholder, rows = 4, className = "pei-field-span-2" }) {
  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} name={id} rows={rows} placeholder={placeholder} />
    </div>
  );
}

function CampoSelect({ id, label, placeholder, options, className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} defaultValue="">
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function BlocoPEI({ numero, titulo, descricao, children }) {
  return (
    <section className="panel pei-card">
      <div className="pei-card-header">
        <span className="pei-card-index">{numero}</span>
        <div>
          <h2>{titulo}</h2>
          {descricao ? <p className="muted">{descricao}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function PEIPage() {
  return (
    <main className="alunos-page module-page pei-page">
      <header className="page-header">
        <div>
          <h1>PEI — Plano de Ensino Individualizado</h1>
          <p>
            O PEI organiza o acesso do estudante ao currículo da sala comum, registrando
            habilidades priorizadas, objetos de conhecimento, objetivos, metodologias,
            recursos, avaliação, acompanhamento e encaminhamentos.
          </p>
        </div>
      </header>

      <div className="pei-note">
        Nesta etapa, o PEI ainda é uma estrutura visual de preenchimento. O salvamento será
        implementado em fase posterior.
      </div>

      <div className="pei-form">
        <BlocoPEI
          numero="1"
          titulo="Identificação do estudante"
          descricao="Dados iniciais para contextualizar o planejamento curricular individualizado."
        >
          <div className="pei-fields-grid">
            <Campo
              id="pei-aluno-cadastrado"
              label="Aluno cadastrado"
              placeholder="Digite ou selecione o estudante em uma fase posterior."
              className="pei-field-span-2"
            />
            <Campo
              id="pei-nome-estudante"
              label="Nome do estudante"
              placeholder="Informe o nome completo do estudante."
              className="pei-field-span-2"
            />
            <Campo id="pei-data-nascimento" label="Data de nascimento" type="date" />
            <Campo id="pei-idade" label="Idade" type="number" placeholder="Informe a idade." />
            <Campo
              id="pei-ano-letivo"
              label="Ano letivo"
              placeholder="Ex.: 2026"
            />
            <Campo id="pei-serie" label="Ano/Série" placeholder="Ex.: 4º ano" />
            <Campo id="pei-turma" label="Turma" placeholder="Ex.: 4º A" />
            <Campo id="pei-turno" label="Turno" placeholder="Ex.: Matutino" />
            <Campo
              id="pei-escola"
              label="Escola"
              placeholder="Informe o nome da escola."
              className="pei-field-span-2"
            />
            <Campo id="pei-municipio" label="Município" placeholder="Informe o município." />
            <Campo id="pei-data-planejamento" label="Data do planejamento" type="date" />
            <Campo
              id="pei-periodo-vigencia"
              label="Período de vigência"
              placeholder="Ex.: 1º semestre"
            />
            <Campo
              id="pei-professor-sala-comum"
              label="Professor(a) da sala comum"
              placeholder="Informe o nome do(a) professor(a)."
            />
            <Campo
              id="pei-professor-aee"
              label="Professor(a) do AEE"
              placeholder="Informe o nome do(a) professor(a) do AEE."
            />
            <Campo
              id="pei-profissional-apoio"
              label="Profissional de apoio/mediador"
              placeholder="Informe o nome, quando houver."
              className="pei-field-span-2"
            />
            <CampoTexto
              id="pei-condicao-estudante"
              label="Condição do estudante / diagnóstico informado"
              rows={5}
              placeholder="Registre a condição informada no cadastro, laudo ou pela família, quando houver. O PEI deve considerar principalmente as barreiras, potencialidades e necessidades pedagógicas observadas no contexto escolar."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="2" titulo="Participantes e articulação">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-participantes"
              label="Participantes envolvidos"
              placeholder="Registre quem participou da elaboração do PEI: professor da sala comum, professor do AEE, coordenação, profissional de apoio, família, estudante ou outros profissionais."
            />
            <CampoTexto
              id="pei-estrategias-colaborativas"
              label="Estratégias colaborativas com o AEE"
              placeholder="Descreva como o professor da sala comum e o professor do AEE irão articular estratégias, recursos e acompanhamento para favorecer a participação do estudante."
            />
            <CampoTexto
              id="pei-participacao-familia"
              label="Participação da família"
              placeholder="Registre se a família participou, quais informações trouxe e como poderá colaborar no acompanhamento."
            />
            <CampoTexto
              id="pei-participacao-estudante"
              label="Participação do estudante"
              placeholder="Registre como a escuta ou participação do estudante foi considerada, respeitando suas formas de comunicação e expressão."
            />
            <CampoTexto
              id="pei-articulacao-profissionais"
              label="Articulação com outros profissionais ou rede de apoio, quando necessário"
              placeholder="Registre se houve ou se será necessário diálogo com outros profissionais ou rede de apoio."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="3" titulo="Base pedagógica do PEI">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-potencialidades"
              label="Potencialidades do estudante"
              placeholder="Descreva interesses, habilidades, formas de comunicação, preferências, vínculos e situações em que o estudante participa melhor."
            />
            <CampoTexto
              id="pei-barreiras"
              label="Barreiras de acesso ao currículo"
              placeholder="Registre o que dificulta a participação do estudante nas atividades da sala comum, considerando currículo, comunicação, leitura, escrita, atenção, ambiente, materiais, metodologia e avaliação."
            />
            <CampoTexto
              id="pei-necessidades-apoio"
              label="Necessidades de apoio na sala comum"
              placeholder="Indique quais apoios o estudante necessita para participar das atividades da turma, como mediação, recursos visuais, materiais concretos, tempo ampliado, comunicação alternativa ou adaptação das tarefas."
            />
            <CampoTexto
              id="pei-resumo-estudo-paee"
              label="Resumo do Estudo de Caso/PAEE que orienta este PEI"
              placeholder="Registre, de forma resumida, as principais informações do Estudo de Caso e do PAEE que orientam este PEI. Não copie o documento inteiro."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="4" titulo="Planejamento curricular">
          <div className="pei-fields-grid">
            <Campo
              id="pei-componente-curricular"
              label="Componente curricular/disciplina"
              placeholder="Informe a disciplina ou área do conhecimento que será trabalhada neste PEI."
            />
            <Campo
              id="pei-periodo-trabalho"
              label="Período de trabalho"
              placeholder="Informe o período de execução, por exemplo: 1º bimestre, 2º semestre ou outro período definido pela escola."
            />
            <CampoTexto
              id="pei-objeto-conhecimento"
              label="Conteúdo/objeto de conhecimento"
              placeholder="Registre o conteúdo da turma que será tornado acessível ao estudante."
            />
            <CampoTexto
              id="pei-conceito-central"
              label="Conceito central do conteúdo"
              placeholder="Explique qual é a ideia principal que o estudante precisa compreender sobre esse conteúdo."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI
          numero="5"
          titulo="Habilidades e objetos de conhecimento priorizados"
          descricao="Três registros editáveis para organizar as prioridades curriculares do período."
        >
          <div className="pei-repeat-grid">
            {[1, 2, 3].map((numeroItem) => (
              <article key={numeroItem} className="pei-repeat-card">
                <h3>Prioridade {numeroItem}</h3>
                <div className="pei-fields-grid">
                  <CampoTexto
                    id={`pei-habilidade-priorizada-${numeroItem}`}
                    label="Habilidade priorizada"
                    rows={3}
                    placeholder="Registre a habilidade priorizada para o estudante neste período."
                  />
                  <CampoTexto
                    id={`pei-objeto-priorizado-${numeroItem}`}
                    label="Objeto de conhecimento priorizado"
                    rows={3}
                    placeholder="Registre o objeto de conhecimento ou conteúdo relacionado à habilidade."
                  />
                  <CampoSelect
                    id={`pei-prazo-prioridade-${numeroItem}`}
                    label="Prazo de execução"
                    placeholder="Indique se será trabalhado em curto, médio ou longo prazo."
                    options={PRAZOS_PRIORIZACAO}
                    className="pei-field-span-2"
                  />
                </div>
              </article>
            ))}
          </div>
        </BlocoPEI>

        <BlocoPEI
          numero="6"
          titulo="Objetivos e metas de aprendizagem"
          descricao="Metas observáveis, possíveis e relacionadas ao currículo da turma."
        >
          <div className="pei-repeat-grid">
            {[1, 2, 3].map((numeroObjetivo) => (
              <article key={numeroObjetivo} className="pei-repeat-card">
                <h3>Objetivo {numeroObjetivo}</h3>
                <div className="pei-fields-grid">
                  <CampoTexto
                    id={`pei-objetivo-${numeroObjetivo}`}
                    label="Objetivo/meta"
                    rows={3}
                    placeholder="Escreva o que se espera que o estudante desenvolva no período, de forma possível, observável e relacionada ao currículo."
                  />
                  <CampoTexto
                    id={`pei-resultado-${numeroObjetivo}`}
                    label="Resultado esperado"
                    rows={3}
                    placeholder="Descreva como será possível perceber que houve avanço na aprendizagem ou participação do estudante."
                  />
                  <CampoSelect
                    id={`pei-prioridade-objetivo-${numeroObjetivo}`}
                    label="Prioridade"
                    placeholder="Selecione a prioridade."
                    options={PRIORIDADES}
                  />
                  <Campo
                    id={`pei-prazo-objetivo-${numeroObjetivo}`}
                    label="Prazo"
                    placeholder="Informe o prazo previsto para acompanhamento da meta."
                  />
                </div>
              </article>
            ))}
          </div>
        </BlocoPEI>

        <BlocoPEI numero="7" titulo="Metodologias e propostas de atividades">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-metodologias"
              label="Metodologias"
              placeholder="Descreva como o conteúdo será ensinado, quais mediações serão utilizadas e como a atividade será organizada."
            />
            <CampoTexto
              id="pei-propostas-atividades"
              label="Propostas de atividades"
              placeholder="Registre atividades que serão propostas ao estudante, considerando o currículo da turma e suas necessidades de apoio."
            />
            <CampoTexto
              id="pei-adaptacoes-atividades"
              label="Adaptações nas atividades"
              placeholder="Registre adaptações como redução de cópia, uso de imagens, atividade em etapas, textos curtos, material concreto ou outras adequações."
            />
            <CampoTexto
              id="pei-organizacao-participacao"
              label="Organização da participação na sala comum"
              placeholder="Descreva como o estudante participará das atividades da turma, individualmente, em dupla, em grupo ou com mediação."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="8" titulo="Recursos, acessibilidade e apoios">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-recursos-utilizados"
              label="Recursos utilizados"
              placeholder="Liste materiais, recursos visuais, jogos, textos adaptados, material concreto, recursos digitais ou outros instrumentos que serão utilizados."
            />
            <CampoTexto
              id="pei-acessibilidade-curricular"
              label="Estratégias de acessibilidade curricular"
              placeholder="Registre como o conteúdo será tornado acessível ao estudante, mantendo relação com o currículo da turma."
            />
            <CampoTexto
              id="pei-apoios-necessarios"
              label="Apoios necessários"
              placeholder="Indique os apoios necessários para compreensão dos comandos, realização das atividades, comunicação, atenção, organização e participação."
            />
            <CampoTexto
              id="pei-tecnologia-assistiva"
              label="Tecnologia assistiva ou comunicação alternativa, quando houver"
              placeholder="Registre recursos de tecnologia assistiva, comunicação aumentativa e alternativa ou outros recursos específicos, quando houver."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="9" titulo="Formas de avaliação da aprendizagem">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-estrategias-avaliacao"
              label="Estratégias de avaliação"
              placeholder="Descreva como a aprendizagem será acompanhada de forma processual, considerando participação, envolvimento, respostas e avanços."
            />
            <CampoTexto
              id="pei-formas-demonstrar"
              label="Formas de demonstrar aprendizagem"
              placeholder="Registre como o estudante poderá demonstrar o que aprendeu: oralmente, apontando, escolhendo imagens, usando comunicação alternativa, realizando atividade prática, produzindo com apoio ou participando da atividade."
            />
            <CampoTexto
              id="pei-criterios-observacao"
              label="Critérios de observação"
              placeholder="Indique quais avanços serão observados para avaliar se o objetivo foi alcançado."
            />
            <CampoTexto
              id="pei-instrumentos-registros"
              label="Instrumentos/registros utilizados"
              placeholder="Registre quais instrumentos serão usados: observação, atividades adaptadas, portfólio, registros do professor, registros do AEE ou outros."
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="10" titulo="Acompanhamento: desafios e expectativas">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-registros-processo"
              label="Registros do processo"
              placeholder="Registre observações sobre a execução do PEI e como o estudante respondeu às estratégias planejadas."
            />
            <CampoTexto
              id="pei-desafios"
              label="Desafios encontrados"
              placeholder="Registre dificuldades encontradas durante a execução do PEI, como barreiras persistentes, necessidade de novos recursos ou ajustes nas estratégias."
            />
            <CampoTexto
              id="pei-avancos"
              label="Avanços observados"
              placeholder="Registre avanços observados na participação, aprendizagem, comunicação, autonomia ou acesso ao currículo."
            />
            <CampoTexto
              id="pei-expectativas"
              label="Expectativas para o próximo bimestre/período"
              placeholder="Registre o que se espera para o próximo bimestre ou período, considerando continuidade, replanejamento ou novas metas."
            />
            <Campo
              id="pei-data-revisao"
              label="Data prevista para revisão"
              type="date"
              className="pei-field-span-2"
            />
          </div>
        </BlocoPEI>

        <BlocoPEI numero="11" titulo="Encaminhamentos finais">
          <div className="pei-fields-grid">
            <CampoTexto
              id="pei-encaminhamentos-sala"
              label="Encaminhamentos para sala comum"
              placeholder="Registre orientações para continuidade das estratégias na sala comum."
            />
            <CampoTexto
              id="pei-encaminhamentos-aee"
              label="Encaminhamentos para o AEE"
              placeholder="Registre orientações para articulação com o Atendimento Educacional Especializado."
            />
            <CampoTexto
              id="pei-encaminhamentos-familia"
              label="Encaminhamentos para família"
              placeholder="Registre orientações para diálogo e acompanhamento com a família."
            />
            <CampoTexto
              id="pei-encaminhamentos-gestao"
              label="Encaminhamentos para coordenação/gestão"
              placeholder="Registre apoios institucionais necessários, como organização de recursos, horários, articulação entre profissionais ou acompanhamento pedagógico."
            />
            <CampoTexto
              id="pei-observacoes-finais"
              label="Observações finais"
              placeholder="Registre informações complementares relevantes para continuidade do PEI."
            />
          </div>
        </BlocoPEI>

        <section className="panel pei-actions-panel">
          <div>
            <h2>Próximas ações</h2>
            <p className="muted">
              Os botões abaixo são apenas visuais nesta fase e não salvam nem enviam dados.
            </p>
          </div>
          <div className="form-actions pei-future-actions">
            <button type="button" disabled title="Salvamento será implementado em fase posterior.">
              Salvar rascunho do PEI
            </button>
            <button type="button" className="btn-secondary" disabled>
              Novo PEI
            </button>
            <button type="button" disabled title="Conclusão será implementada em fase posterior.">
              Concluir PEI
            </button>
            <button type="button" className="btn-secondary" disabled title="Impressão será implementada em fase posterior.">
              Imprimir PEI
            </button>
          </div>
          <p className="pei-future-note">
            Salvamento, conclusão e impressão serão implementados em fases posteriores.
          </p>
        </section>
      </div>
    </main>
  );
}

export default PEIPage;
