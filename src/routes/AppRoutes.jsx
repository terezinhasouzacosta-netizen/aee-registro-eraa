import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import AcompanhamentoPage from "../pages/AcompanhamentoPage";
import AtendimentoAEEPage from "../pages/AtendimentoAEEPage";
import AlunosPage from "../pages/AlunosPage";
import DashboardPage from "../pages/DashboardPage";
import LoginPage from "../pages/LoginPage";
import MetasPage from "../pages/MetasPage";
import MonitoramentosPage from "../pages/MonitoramentosPage";
import PainelCoordenacaoPage from "../pages/PainelCoordenacaoPage";
import RelatoriosPage from "../pages/RelatoriosPage";
import SondagensPage from "../pages/SondagensPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";
import { useAuth } from "../hooks/useAuth";
import ProtectedRoute from "./ProtectedRoute";

function RouteAuditLogger() {
  const { perfil, currentUser } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log("[AppRoutes] MODO LIBERADO - rota atual", {
      rotaAtual: location.pathname,
      email: currentUser?.email || null,
      perfilAtual: perfil || null,
    });
  }, [location.pathname, currentUser?.email, perfil]);

  return null;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <RouteAuditLogger />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sem-permissao" element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/alunos" element={<AlunosPage />} />
            <Route path="/metas" element={<MetasPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/sondagens" element={<SondagensPage />} />
            <Route path="/monitoramentos" element={<MonitoramentosPage />} />
            <Route path="/acompanhamento" element={<AcompanhamentoPage />} />
            <Route path="/atendimento-aee" element={<AtendimentoAEEPage />} />
            <Route path="/painel-coordenacao" element={<PainelCoordenacaoPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
