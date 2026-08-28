import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { signIn } from "../services/authService";

function traduzirErroAuth(error) {
  const code = error?.code || "";

  const errorsMap = {
    "auth/invalid-credential": "Credenciais inválidas. Verifique e-mail e senha.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-disabled": "Usuário desativado.",
    "auth/too-many-requests":
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/network-request-failed":
      "Falha de rede ao autenticar. Verifique internet e configuração.",
    "auth/api-key-not-valid": "Chave da API Firebase inválida.",
  };

  return errorsMap[code] || `Falha ao entrar (${code || "erro-desconhecido"}).`;
}

function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, perfilCarregado, authLoading, authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    console.log("[LoginPage] Usuário autenticado detectado.", {
      uid: currentUser.uid,
      email: currentUser.email || null,
      perfilCarregado,
      authLoading,
    });

    if (authLoading || !perfilCarregado) {
      console.log("[LoginPage] Aguardando perfil para liberar navegação.");
      return;
    }

    console.log("[LoginPage] Perfil carregado. Navegação liberada para '/'.");
    navigate("/", { replace: true });
  }, [authLoading, currentUser, navigate, perfilCarregado]);

  useEffect(() => {
    if (!authError) {
      return;
    }

    console.error("[LoginPage] Erro vindo do AuthContext:", authError);
    setError(authError);
  }, [authError]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      console.log("[LoginPage] Login iniciado.", {
        email: String(email || "").toLowerCase().trim(),
      });
      setLoading(true);
      await signIn(email, password);
      console.log("[LoginPage] Usuário autenticado no Firebase. Aguardando perfil...");
    } catch (err) {
      console.error("[LoginPage] Erro real do Firebase:", {
        code: err?.code || null,
        message: err?.message || null,
      });
      setError(traduzirErroAuth(err));
    } finally {
      setLoading(false);
      console.log("[LoginPage] Loading local finalizado.");
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>AEE Registro</h1>
        <p>Acesso ao sistema de acompanhamento educacional especializado.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            placeholder="seuemail@escola.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error ? <span className="error-text">{error}</span> : null}

          <button type="submit" disabled={loading || authLoading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
