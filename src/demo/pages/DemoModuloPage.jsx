import { Eye, LockKeyhole } from "lucide-react";
import DemoModuleContent from "../components/DemoModuleContent.jsx";
import DemoStepNavigation from "../components/DemoStepNavigation.jsx";

function DemoModuloPage({ modulo, dados, casoPedagogico }) {
  const Icon = modulo.icon;
  const status =
    modulo.dataKey === "estudoCaso"
      ? `${dados.respondidas} de ${dados.totalPerguntas} perguntas respondidas`
      : Array.isArray(dados)
        ? `${dados.length} registros demonstrativos`
        : dados?.status || "Estruturado";

  return (
    <>
      <section className="demo-intro" aria-labelledby="demo-module-title">
        <div className="demo-intro-icon" aria-hidden="true">
          <Icon />
        </div>
        <div>
          <p className="demo-eyebrow">{modulo.secao}</p>
          <h1 id="demo-module-title">{modulo.tituloPagina || modulo.label}</h1>
          <p>{modulo.descricao}</p>
        </div>
      </section>

      <div className="demo-module-status" role="note">
        <Eye aria-hidden="true" />
        <div>
          <strong>Visualização demonstrativa</strong>
          <span>Esta página não possui ações de cadastro, edição, exclusão ou salvamento.</span>
        </div>
      </div>

      <section className="panel demo-module-panel" aria-labelledby="demo-structure-title">
        <div className="demo-section-heading">
          <div>
            <p className="demo-eyebrow">Caso local fictício</p>
            <h2 id="demo-structure-title">Caso pedagógico fictício</h2>
          </div>
          <span>{status}</span>
        </div>

        <div className="demo-module-content">
          <DemoModuleContent modulo={modulo} dados={dados} casoPedagogico={casoPedagogico} />
        </div>

        <p className="demo-local-data-note">
          <LockKeyhole aria-hidden="true" />
          Dados fictícios utilizados exclusivamente para demonstração acadêmica.
        </p>
      </section>
      <DemoStepNavigation currentPath={modulo.path} />
    </>
  );
}

export default DemoModuloPage;
