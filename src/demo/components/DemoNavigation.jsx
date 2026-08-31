import { NavLink } from "react-router-dom";
import { SECOES_DEMONSTRACAO } from "../demoNavigation.js";

function DemoNavigation({ ariaLabel }) {
  return (
    <nav className="demo-navigation" aria-label={ariaLabel}>
      {SECOES_DEMONSTRACAO.map((secao) => (
        <section className="demo-navigation-section" key={secao.titulo}>
          <p>{secao.titulo}</p>
          {secao.itens.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/demonstracao"}
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </section>
      ))}
    </nav>
  );
}

export default DemoNavigation;
