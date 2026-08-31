import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { MODULOS_DEMONSTRACAO } from "../demoNavigation.js";

function DemoStepNavigation({ currentPath }) {
  const currentIndex = MODULOS_DEMONSTRACAO.findIndex((modulo) => modulo.path === currentPath);
  const anterior = currentIndex > 0 ? MODULOS_DEMONSTRACAO[currentIndex - 1] : null;
  const proximo =
    currentIndex >= 0 && currentIndex < MODULOS_DEMONSTRACAO.length - 1
      ? MODULOS_DEMONSTRACAO[currentIndex + 1]
      : null;

  return (
    <nav className="demo-step-navigation" aria-label="Navegação sequencial da demonstração">
      {anterior ? (
        <Link to={anterior.path} className="demo-step-link demo-step-link-previous">
          <ArrowLeft aria-hidden="true" />
          <span>
            <small>Anterior</small>
            <strong>{anterior.label}</strong>
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      {proximo ? (
        <Link to={proximo.path} className="demo-step-link demo-step-link-next">
          <span>
            <small>Próxima etapa</small>
            <strong>{proximo.label}</strong>
          </span>
          <ArrowRight aria-hidden="true" />
        </Link>
      ) : (
        <Link to="/demonstracao" className="demo-step-link demo-step-link-next">
          <span>
            <small>Percurso concluído</small>
            <strong>Voltar ao início</strong>
          </span>
          <ArrowRight aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}

export default DemoStepNavigation;
