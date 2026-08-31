import { lazy, Suspense } from "react";

const DemonstracaoApp = lazy(() => import("./demo/DemonstracaoApp.jsx"));
const InstitutionalApp = lazy(() => import("./InstitutionalApp.jsx"));

function estaNoAmbienteDemonstrativo(pathname) {
  return pathname === "/demonstracao" || pathname.startsWith("/demonstracao/");
}

function App() {
  const demonstracaoAtiva = estaNoAmbienteDemonstrativo(window.location.pathname);

  return (
    <Suspense fallback={<p className="status-message">Carregando ambiente...</p>}>
      {demonstracaoAtiva ? <DemonstracaoApp /> : <InstitutionalApp />}
    </Suspense>
  );
}

export default App;
