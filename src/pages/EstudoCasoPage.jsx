import { useAuth } from "../hooks/useAuth";
import { podeVisualizarSondagens } from "../utils/permissions";

const SECOES_ESTUDO_CASO = [
  {
    titulo: "Identificação do estudante",
    descricao: "Bloco visual preparatório para futura identificação pedagógica do estudante.",
    campos: [
      { label: "Aluno", placeholder: "Seleção do aluno será integrada em etapa futura." },
      { label: "Data de nascimento", placeholder: "Preenchimento automático futuro." },
      { label: "Série/Ano", placeholder: "Virá do cadastro do aluno." },
      { label: "Turma", placeholder: "Virá do cadastro do aluno." },
      { label: "Turno", placeholder: "Virá do cadastro do aluno." },
      { label: "Professor(a) do AEE", placeholder: "Informação será integrada futuramente." },
    ],
  },
  {
    titulo: "Contexto escolar",
    descricao: "Espaço reservado para descrever a inserção do estudante no ambiente escolar.",
    campos: [
      {
        label: "Descrição do contexto escolar",
        placeholder: "Campo visual para caracterização da rotina e do contexto escolar.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
  {
    titulo: "Histórico e informações relevantes",
    descricao: "Registro inicial de aspectos relevantes da trajetória escolar e educacional.",
    campos: [
      {
        label: "Histórico e informações relevantes",
        placeholder: "Campo preparatório para histórico escolar, atendimentos e observações relevantes.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
  {
    titulo: "Potencialidades e interesses",
    descricao: "Organização visual das potencialidades, preferências e interesses do estudante.",
    campos: [
      {
        label: "Potencialidades, interesses e motivadores",
        placeholder: "Aqui ficarão os pontos fortes e interesses do estudante.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
  {
    titulo: "Barreiras identificadas",
    descricao: "Estrutura inicial para levantamento pedagógico de barreiras à participação e aprendizagem.",
    campos: [
      {
        label: "Barreiras pedagógicas, comunicacionais e de participação",
        placeholder: "Campo visual para mapeamento de barreiras identificadas.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
  {
    titulo: "Necessidades de apoio",
    descricao: "Previsão visual dos apoios necessários ao estudante no contexto educacional.",
    campos: [
      {
        label: "Apoios necessários",
        placeholder: "Registro futuro de apoios pedagógicos, humanos e organizacionais.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
  {
    titulo: "Recursos e acessibilidade",
    descricao: "Área reservada para recursos, adaptações e acessibilidade necessários ao estudante.",
    campos: [
      {
        label: "Recursos, acessibilidade e adequações",
        placeholder: "Campo visual para materiais, recursos acessíveis e ajustes necessários.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
  {
    titulo: "Observações da família",
    descricao: "Espaço visual para futura escuta das informações e percepções da família.",
    campos: [
      {
        label: "Observações da família",
        placeholder: "Registro preparatório das informações compartilhadas pela família.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
  {
    titulo: "Observações da sala regular",
    descricao: "Campo visual para futura contribuição da professora regente e da rotina escolar comum.",
    campos: [
      {
        label: "Observações da sala regular",
        placeholder: "Aqui ficarão observações da professora regente e da vivência em sala comum.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
  {
    titulo: "Síntese pedagógica do AEE",
    descricao: "Consolidação inicial da análise pedagógica do AEE sobre o estudante.",
    campos: [
      {
        label: "Síntese pedagógica do AEE",
        placeholder: "Campo visual para análise pedagógica inicial do atendimento educacional especializado.",
        tipo: "textarea",
        span: 2,
        rows: 5,
      },
    ],
  },
  {
    titulo: "Encaminhamentos iniciais",
    descricao: "Organização visual dos primeiros encaminhamentos e ações pedagógicas previstas.",
    campos: [
      {
        label: "Encaminhamentos iniciais",
        placeholder: "Espaço preparatório para ações iniciais e articulações futuras.",
        tipo: "textarea",
        span: 2,
        rows: 4,
      },
    ],
  },
];

function renderCampo(campo, indice) {
  const key = `${campo.label}-${indice}`;
  const classeSpan = campo.span === 2 ? "estudo-caso-field-span-2" : "";

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

function EstudoCasoPage() {
  const { perfil } = useAuth();
  const podeLer = podeVisualizarSondagens(perfil);

  if (!podeLer) {
    return (
      <main className="alunos-page">
        <section className="panel">
          <h1>Estudo de Caso</h1>
          <p>Seu perfil não possui permissão para visualizar esta tela.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="alunos-page module-page estudo-caso-page">
      <header className="page-header">
        <h1>Estudo de Caso</h1>
        <p>Estrutura visual inicial do diagnóstico pedagógico, sem integração, sem salvamento e sem impacto no banco.</p>
        <p className="muted">
          Esta etapa cria apenas a base visual do Estudo de Caso para validação da organização da
          tela e dos blocos diagnósticos futuros da plataforma.
        </p>
      </header>

      <div className="module-layout estudo-caso-layout">
        <section className="panel module-form-panel">
          <h2>Estrutura inicial do Estudo de Caso</h2>
          <div className="estudo-caso-note">
            Tela visual segura: nesta versão não há leitura de cadastro, sondagem, habilidades,
            PAEE, banco de dados ou qualquer rotina de salvamento.
          </div>

          <div className="aluno-form estudo-caso-form">
            {SECOES_ESTUDO_CASO.map((secao, indice) => (
              <section key={secao.titulo} className="form-section estudo-caso-card">
                <div className="estudo-caso-card-header">
                  <span className="estudo-caso-card-index">{indice + 1}</span>
                  <div>
                    <h3>{secao.titulo}</h3>
                    <p className="muted">{secao.descricao}</p>
                  </div>
                </div>

                <div className="estudo-caso-fields-grid">
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
            <ul className="estudo-caso-list">
              <li>Organização visual dos 11 blocos iniciais do Estudo de Caso.</li>
              <li>Layout integrado ao padrão atual da plataforma.</li>
              <li>Campos apenas ilustrativos para validação da estrutura diagnóstica.</li>
            </ul>
          </section>

          <section className="form-section">
            <h3>O que ainda não faz</h3>
            <ul className="estudo-caso-list">
              <li>Não busca dados do cadastro do aluno.</li>
              <li>Não lê a sondagem diagnóstica.</li>
              <li>Não integra com habilidades ou PAEE.</li>
              <li>Não salva, edita, imprime ou exporta.</li>
            </ul>
          </section>

          <section className="form-section">
            <h3>Posição do módulo</h3>
            <p className="muted">
              O Estudo de Caso foi preparado como estrutura inicial da área de
              <strong> Diagnóstico</strong>, acima de <strong>Sondagem</strong>, para futura
              evolução pedagógica da plataforma.
            </p>
          </section>

          <section className="form-section">
            <h3>Ações futuras</h3>
            <div className="form-actions estudo-caso-disabled-actions">
              <button type="button" disabled>
                Salvar estudo de caso
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

export default EstudoCasoPage;
