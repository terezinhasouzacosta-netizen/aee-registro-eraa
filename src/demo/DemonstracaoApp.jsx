import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DemonstracaoLayout from "./DemonstracaoLayout.jsx";
import DemoInicioPage from "./pages/DemoInicioPage.jsx";
import DemoModuloPage from "./pages/DemoModuloPage.jsx";
import dadosDemonstrativos from "./data/caso-pedagogico-demo.json";
import { MODULOS_DEMONSTRACAO } from "./demoNavigation.js";
import "./demonstracao.css";

function DemonstracaoApp() {
  return (
    <BrowserRouter>
      <DemonstracaoLayout>
        <Routes>
          <Route
            path="/demonstracao"
            element={
              <DemoInicioPage
                apresentacao={dadosDemonstrativos.apresentacao}
                casoPedagogico={dadosDemonstrativos.casoPedagogico}
              />
            }
          />

          {MODULOS_DEMONSTRACAO.filter((modulo) => modulo.dataKey).map((modulo) => (
            <Route
              key={modulo.path}
              path={modulo.path}
              element={
                <DemoModuloPage
                  modulo={modulo}
                  dados={dadosDemonstrativos.casoPedagogico[modulo.dataKey]}
                  casoPedagogico={dadosDemonstrativos.casoPedagogico}
                />
              }
            />
          ))}

          <Route path="/demonstracao/*" element={<Navigate to="/demonstracao" replace />} />
        </Routes>
      </DemonstracaoLayout>
    </BrowserRouter>
  );
}

export default DemonstracaoApp;
