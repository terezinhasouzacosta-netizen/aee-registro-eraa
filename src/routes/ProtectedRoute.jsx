import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const PROTECTED_ROUTE_TIMEOUT_MS = 10000;

function ProtectedRoute() {
  const {
    isAuthenticated,
    loading,
    authLoading,
    perfilCarregado,
    authError,
    currentUser,
  } = useAuth();
  const location = useLocation();
  const [timeoutAtingido, setTimeoutAtingido] = useState(false);

  const aguardandoSessao = loading || authLoading || (isAuthenticated && !perfilCarregado);

  useEffect(() => {
    if (!aguardandoSessao) {
      if (timeoutAtingido) {
        console.log("[ProtectedRoute] Overlay removido. Sessão liberada.");
      }
      setTimeoutAtingido(false);
      return;
    }

    console.log("[ProtectedRoute] Overlay ativo. Aguardando sessão.", {
      rotaAtual: location.pathname,
      uid: currentUser?.uid || null,
      isAuthenticated,
      loading,
      authLoading,
      perfilCarregado,
    });

    const timer = setTimeout(() => {
      console.error("[ProtectedRoute] Timeout de proteção atingido. Liberando interface com erro.", {
        timeoutMs: PROTECTED_ROUTE_TIMEOUT_MS,
        rotaAtual: location.pathname,
        uid: currentUser?.uid || null,
        isAuthenticated,
        loading,
        authLoading,
        perfilCarregado,
      });
      setTimeoutAtingido(true);
    }, PROTECTED_ROUTE_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [
    aguardandoSessao,
    authLoading,
    currentUser,
    isAuthenticated,
    loading,
    location.pathname,
    perfilCarregado,
    timeoutAtingido,
  ]);

  console.log("[ProtectedRoute] Verificando acesso", {
    rotaAtual: location.pathname,
    uid: currentUser?.uid || null,
    email: currentUser?.email || null,
    isAuthenticated,
    loading,
    authLoading,
    perfilCarregado,
    authError: authError || null,
    aguardandoSessao,
    timeoutAtingido,
  });

  if (aguardandoSessao && !timeoutAtingido) {
    return <p className="status-message">Carregando sessão...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {authError ? <p className="error-text">{authError}</p> : null}
      {timeoutAtingido ? (
        <p className="error-text">
          O carregamento da sessão demorou além do esperado. A interface foi liberada. Atualize a página se necessário.
        </p>
      ) : null}
      <Outlet />
    </>
  );
}

export default ProtectedRoute;
