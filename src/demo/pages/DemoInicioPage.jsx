import { ArrowRight, BookOpenCheck, Route, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { MODULOS_DEMONSTRACAO } from "../demoNavigation.js";

function DemoInicioPage({ apresentacao, casoPedagogico }) {
  const modulos = MODULOS_DEMONSTRACAO.filter((modulo) => modulo.dataKey);
  const totalEstudantes = casoPedagogico.indicadoresCoordenacao.totalEstudantes;
  const totalSondagens = casoPedagogico.indicadoresCoordenacao.documentos.some(
    (documento) => documento.nome === "Sondagem" && documento.status === "Concluída",
  )
    ? totalEstudantes
    : 0;
  const totalMonitoramentos = Number(Boolean(casoPedagogico.monitoramento));
  const percurso = [
    { label: "Aluno", path: "/demonstracao/aluno" },
    { label: "Sondagem", path: "/demonstracao/sondagem" },
    { label: "Estudo de Caso", path: "/demonstracao/estudo-de-caso" },
    { label: "Habilidades", path: "/demonstracao/habilidades" },
    { label: "PAEE / PEI", path: "/demonstracao/paee" },
    { label: "Atendimento AEE", path: "/demonstracao/atendimento-aee" },
    { label: "Acompanhamento", path: "/demonstracao/acompanhamento" },
    { label: "Monitoramento", path: "/demonstracao/monitoramento" },
    { label: "Relatórios", path: "/demonstracao/relatorios" },
    { label: "Painel da Coordenação", path: "/demonstracao/painel-coordenacao" },
  ];

  return (
    <>
      <section className="demo-intro" aria-labelledby="demo-page-title">
        <div className="demo-intro-icon" aria-hidden="true">
          <Route />
        </div>
        <div>
          <p className="demo-eyebrow">Produto Educacional</p>
          <h1 id="demo-page-title">Ambiente Demonstrativo</h1>
          <p>{apresentacao.descricao}</p>
          <Link className="demo-primary-cta" to="/demonstracao/aluno">
            Iniciar demonstração
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="demo-summary-grid">
        <article className="panel demo-summary-card">
          <span className="demo-summary-icon" aria-hidden="true">
            <BookOpenCheck />
          </span>
          <div>
            <p className="demo-card-label">Caso pedagógico inicial</p>
            <h2>{casoPedagogico.aluno.nomeExibicao}</h2>
            <p>{casoPedagogico.aluno.contexto}</p>
            <div className="demo-student-summary" aria-label="Identificação resumida do estudante fictício">
              <span>{casoPedagogico.aluno.idade}</span>
              <span>{casoPedagogico.aluno.serieAno}</span>
              <span>Turno {casoPedagogico.aluno.turno.toLowerCase()}</span>
            </div>
          </div>
        </article>

        <article className="panel demo-summary-card">
          <span className="demo-summary-icon" aria-hidden="true">
            <ShieldCheck />
          </span>
          <div>
            <p className="demo-card-label">Isolamento de dados</p>
            <h2>Somente leitura</h2>
            <p>{apresentacao.isolamento}</p>
          </div>
        </article>
      </div>

      <section className="demo-home-stats" aria-label="Indicadores básicos do caso demonstrativo">
        <article className="panel"><strong>{totalEstudantes}</strong><span>Total de alunos</span></article>
        <article className="panel"><strong>{totalSondagens}</strong><span>Total de sondagens</span></article>
        <article className="panel"><strong>{totalMonitoramentos}</strong><span>Total de monitoramentos</span></article>
      </section>

      <section className="panel demo-process" aria-labelledby="demo-process-title">
        <div className="demo-section-heading">
          <div>
            <p className="demo-eyebrow">Navegação guiada</p>
            <h2 id="demo-process-title">Percurso pedagógico do caso fictício</h2>
          </div>
          <span>10 etapas conectadas</span>
        </div>
        <ol className="demo-process-flow">
          {percurso.map((etapa, indice) => (
            <li key={etapa.label}>
              <Link to={etapa.path}>
                <span>{indice + 1}</span>
                <strong>{etapa.label}</strong>
              </Link>
              {indice < percurso.length - 1 ? <ArrowRight aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="panel demo-journey" aria-labelledby="demo-journey-title">
        <div className="demo-section-heading">
          <div>
            <p className="demo-eyebrow">Módulos pedagógicos</p>
            <h2 id="demo-journey-title">Ações Rápidas</h2>
          </div>
          <span>{modulos.length} áreas estruturadas</span>
        </div>

        <div className="demo-journey-grid">
          {modulos.map(({ label, path, icon: Icon, secao }) => (
            <Link to={path} className="demo-journey-card" key={path}>
              <span className="demo-journey-icon" aria-hidden="true">
                <Icon />
              </span>
              <span>
                <small>{secao}</small>
                <strong>{label}</strong>
                <em>Visualizar estrutura</em>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export default DemoInicioPage;
