import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  HeartHandshake,
  LineChart,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoAeeRegistro from "../assets/aee-registro-logo.png";
import InclusiveEducationIllustration from "../components/login/InclusiveEducationIllustration";
import { useAuth } from "../hooks/useAuth";
import { signIn } from "../services/authService";
import "../styles/login.css";

const RECURSOS_INSTITUCIONAIS = [
  { label: "Planejamento", Icon: CalendarCheck2 },
  { label: "Acompanhamento", Icon: UsersRound },
  { label: "Desenvolvimento", Icon: LineChart },
  { label: "Inclusão", Icon: HeartHandshake },
  { label: "Dados protegidos", Icon: ShieldCheck },
];

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
    <main className="login-page login-page-modern">
      <span className="login-background-shape is-one" aria-hidden="true" />
      <span className="login-background-shape is-two" aria-hidden="true" />

      <section className="login-shell" aria-label="Acesso ao AEE Registro">
        <aside className="login-institutional-panel">
          <div className="login-panel-shape is-one" aria-hidden="true" />
          <div className="login-panel-shape is-two" aria-hidden="true" />

          <header className="login-brand">
            <div className="login-logo-frame">
              <img src={logoAeeRegistro} alt="AEE Registro" />
            </div>
            <div>
              <span className="login-eyebrow">Gestão pedagógica inclusiva</span>
              <h1>AEE Registro</h1>
            </div>
          </header>

          <div className="login-institutional-copy">
            <p className="login-system-title">
              Sistema de Gestão do Atendimento Educacional Especializado
            </p>
            <p>
              Planeje, registre e acompanhe o desenvolvimento dos estudantes em um ambiente
              seguro, organizado e integrado.
            </p>
          </div>

          <div className="login-education-visual">
            <InclusiveEducationIllustration />
          </div>

          <div className="login-feature-grid" aria-label="Recursos institucionais">
            {RECURSOS_INSTITUCIONAIS.map(({ label, Icon }) => (
              <div className="login-feature-card" key={label}>
                <span className="login-feature-icon" aria-hidden="true">
                  <Icon size={17} strokeWidth={1.9} />
                </span>
                <span>{label}</span>
                <Check className="login-feature-check" size={13} aria-hidden="true" />
              </div>
            ))}
          </div>

          <blockquote className="login-quote">
            “Transformando registros pedagógicos em decisões para a inclusão.”
          </blockquote>
        </aside>

        <div className="login-access-panel">
          <section className="login-card">
            <div className="login-card-heading">
              <span className="login-access-badge">
                <ShieldCheck size={15} aria-hidden="true" />
                Ambiente seguro
              </span>
              <h2>Bem-vinda ao AEE Registro</h2>
              <p className="login-card-copy">
                Entre com suas credenciais institucionais para acessar a plataforma.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email">E-mail</label>
                <div className="login-input-wrapper">
                  <Mail size={19} aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    placeholder="seuemail@escola.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password">Senha</label>
                <div className="login-input-wrapper">
                  <LockKeyhole size={19} aria-hidden="true" />
                  <input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {error ? (
                <span className="error-text login-error" role="alert" aria-live="polite">
                  {error}
                </span>
              ) : null}

              <button className="login-submit" type="submit" disabled={loading || authLoading}>
                <span>{loading ? "Entrando..." : "Entrar"}</span>
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            </form>

            <p className="login-restricted-note">
              <LockKeyhole size={14} aria-hidden="true" />
              Acesso restrito a profissionais autorizados.
            </p>
          </section>

          <footer className="login-footer">
            <div className="login-footer-meta">
              <strong>AEE Registro</strong>
              <span aria-hidden="true">•</span>
              <span>Versão 1.0.0</span>
            </div>
            <p>Sistema Institucional de Gestão do Atendimento Educacional Especializado</p>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
