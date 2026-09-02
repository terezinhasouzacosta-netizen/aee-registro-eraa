import { Eye, LockKeyhole } from "lucide-react";
import aeeRegistroLogo from "../assets/aee-registro-logo.png";
import DemoNavigation from "./components/DemoNavigation.jsx";

const AVISO_DEMONSTRACAO =
  "Todos os dados apresentados são fictícios e destinados exclusivamente à demonstração acadêmica da Plataforma AEE Registro.";

function DemonstracaoLayout({ children }) {
  return (
    <div className="demo-shell">
      <a className="demo-skip-link" href="#demo-main-content">
        Ir para o conteúdo principal
      </a>
      <aside className="demo-sidebar">
        <div className="demo-brand">
          <div className="demo-logo-frame">
            <img
              src={aeeRegistroLogo}
              alt="AEE Registro"
              className="demo-logo-img"
            />
          </div>
        </div>

        <div className="demo-desktop-navigation">
          <DemoNavigation ariaLabel="Navegação da demonstração" />
        </div>

        <details className="demo-mobile-menu">
          <summary>Menu dos módulos</summary>
          <DemoNavigation ariaLabel="Navegação móvel da demonstração" />
        </details>

        <div className="demo-readonly-note">
          <LockKeyhole aria-hidden="true" />
          <div>
            <strong>Somente leitura</strong>
            <span>Nenhuma informação é criada ou gravada.</span>
          </div>
        </div>
      </aside>

      <div className="demo-content">
        <header className="demo-banner" role="status">
          <Eye aria-hidden="true" />
          <div>
            <strong>AMBIENTE DEMONSTRATIVO</strong>
            <span>{AVISO_DEMONSTRACAO}</span>
          </div>
        </header>
        <main id="demo-main-content" className="demo-page-content" tabIndex="-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DemonstracaoLayout;
