import { useAuth } from "../hooks/useAuth";
import { podeVisualizarMetas } from "../utils/permissions";

const SECOES_PAEE = [
  {
    titulo: "Identificação do estudante",
    descricao: "Estrutura inicial para futura integração com o cadastro mestre do aluno.",
    campos: [
      { label: "Aluno", placeholder: "Seleção do aluno será integrada em etapa futura." },
      { label: "Data de nascimento", placeholder: "Preenchimento automático futuro." },
      { label: "Série/Ano", placeholder: "Virá do cadastro do aluno." },
      { label: "Turma", placeholder: "Virá do cadastro do aluno." },
      { label: "Turno", placeholder: "Virá do cadastro do aluno." },
      { label: "Professor(a) do AEE", placeholder: "Virá do cadastro ou contexto do atendimento." },
    ],
  },
  {
    titulo: "Síntese Diagnóstica",
    descricao: "Área reservada para consolidação pedagógica das informações do estudante.",
    campos: [
      {
        label: "Potencialidades, interesses e necessidades educacionais",
        placeholder: "Campo visual inicial, sem leitura automática da sondagem nesta etapa.",
        tipo: "textarea",
        span: 2,
        rows: 5,
      },
    ],
  },
  {
    titulo: "Objetivos do Atendimento AEE",
    descricao: "Planejamento dos objetivos prioritários a serem trabalhados no período.",
    campos: [
      {
        label: "Objetivos pedagógicos prioritários",
        placeholder: "Aqui ficarão os objetivos do PAEE, definidos pela professora do AEE.",
        tipo: "textarea",
        span: 2,
        rows: 5,
      },
    ],
  },
  {
    titulo: "Estratégias Pedagógicas",
    descricao: "Metodologias, mediações e adaptações pedagógicas previstas para o atendimento.",
    campos: [
      {
        label: "Estratégias e intervenções",
        placeholder: "Descrever estratégias de mediação, organização e apoio pedagógico.",
        tipo: "textarea",
        span: 2,
        rows: 5,
      },
    ],
  },
  {
    titulo: "Recursos e Tecnologia Assistiva",
    descricao: "Espaço visual para previsão de materiais, recursos acessíveis e apoios específicos.",
    campos: [
      {
        label: "Recursos pedagógicos, acessibilidade e tecnologia assistiva",
        placeholder: "Listagem futura de recursos, materiais adaptados e apoios tecnológicos.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
  {
    titulo: "Organização do Atendimento",
    descricao: "Definição visual inicial sobre frequência, organização e articulação do atendimento.",
    campos: [
      { label: "Período de vigência", placeholder: "Ex.: 1º bimestre / semestre letivo." },
      { label: "Frequência do atendimento", placeholder: "Ex.: 2 vezes por semana." },
      { label: "Duração média", placeholder: "Ex.: 50 minutos." },
      { label: "Modalidade do atendimento", placeholder: "Ex.: Individual / pequeno grupo." },
      {
        label: "Articulação com sala comum e família",
        placeholder: "Observações sobre alinhamento pedagógico e rede de apoio.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
  {
    titulo: "Critérios de Acompanhamento",
    descricao: "Indicadores visuais para futura análise de avanços e necessidades de revisão.",
    campos: [
      {
        label: "Critérios e indicadores de acompanhamento",
        placeholder: "Espaço para descrever como os avanços do PAEE serão observados.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
  {
    titulo: "Encaminhamentos",
    descricao: "Registro visual de orientações, encaminhamentos pedagógicos e articulações necessárias.",
    campos: [
      {
        label: "Encaminhamentos e observações complementares",
        placeholder: "Campo reservado para futuras ações pedagógicas e encaminhamentos.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
];

function renderCampo(campo, indice) {
  const key = `${campo.label}-${indice}`;
  const classeSpan = campo.span === 2 ? "paee-field-span-2" : "";

  if (campo.tipo === "textarea") {
    return (
      <div key={key} className={classeSpan}>
        <label>{campo.label}</label>
        <textarea rows={campo.rows || 4} value="" placeholder={campo.placeholder} readOnly />
      </div>
    );
  }

  return (
    <div key={key} className={classeSpan}>
      <label>{campo.label}</label>
      <input value="" placeholder={campo.placeholder} readOnly />
    </div>
  );
}

function PAEEPage() {
  const { perfil } = useAuth();
  const podeLer = podeVisualizarMetas(perfil);

  if (!podeLer) {
    return (
      <main className="alunos-page">
        <section className="panel">
          <h1>PAEE</h1>
          <p>Seu perfil não possui permissão para visualizar esta tela.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="alunos-page module-page paee-page">
      <header className="page-header">
        <h1>PAEE — Plano de Atendimento Educacional Especializado</h1>
        <p>Estrutura visual inicial do planejamento, sem integração, sem salvamento e sem impacto no banco.</p>
        <p className="muted">
          Esta etapa cria apenas a base visual do PAEE para validação da organização da tela e dos
          blocos pedagógicos futuros da plataforma.
        </p>
      </header>

      <div className="module-layout paee-layout">
        <section className="panel module-form-panel">
          <h2>Estrutura inicial do PAEE</h2>
          <div className="paee-note">
            Tela visual segura: nesta versão não há leitura de cadastro, sondagem, habilidades,
            banco de dados ou qualquer rotina de salvamento.
          </div>

          <div className="aluno-form paee-form">
            {SECOES_PAEE.map((secao, indice) => (
              <section key={secao.titulo} className="form-section paee-card">
                <div className="paee-card-header">
                  <span className="paee-card-index">{indice + 1}</span>
                  <div>
                    <h3>{secao.titulo}</h3>
                    <p className="muted">{secao.descricao}</p>
                  </div>
                </div>

                <div className="paee-fields-grid">
                  {secao.campos.map((campo, campoIndex) => renderCampo(campo, campoIndex))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <aside className="panel module-list-panel">
          <h2>Prévia funcional</h2>

          <section className="form-section">
            <h3>O que esta versão já entrega</h3>
            <ul className="paee-list">
              <li>Organização visual dos 8 blocos principais do PAEE.</li>
              <li>Layout no padrão atual da plataforma.</li>
              <li>Campos apenas ilustrativos para validação pedagógica da estrutura.</li>
            </ul>
          </section>

          <section className="form-section">
            <h3>O que ainda não faz</h3>
            <ul className="paee-list">
              <li>Não busca dados do cadastro do aluno.</li>
              <li>Não lê a sondagem diagnóstica.</li>
              <li>Não gera habilidades nem objetivos automáticos.</li>
              <li>Não salva, edita, imprime ou exporta.</li>
            </ul>
          </section>

          <section className="form-section">
            <h3>Posição planejada do módulo</h3>
            <p className="muted">
              O PAEE foi preparado como tela inicial do eixo de planejamento e poderá futuramente
              ser integrado abaixo de <strong>Habilidades</strong>, quando a lógica pedagógica e o
              fluxo de dados forem definidos.
            </p>
          </section>

          <section className="form-section">
            <h3>Ações futuras</h3>
            <div className="form-actions paee-disabled-actions">
              <button type="button" disabled>
                Salvar PAEE
              </button>
              <button type="button" className="btn-secondary" disabled>
                Emitir documento
              </button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

export default PAEEPage;
