import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  ClipboardList,
  Eye,
  EyeOff,
  FilePenLine,
  FileText,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoAeeRegistro from "../assets/aee-registro-logo-transparent.png";
import inclusiveEducationPhoto from "../assets/login-inclusive-education.webp";
import { useAuth } from "../hooks/useAuth";
import { signIn } from "../services/authService";
import "../styles/login.css";

const RECURSOS_INSTITUCIONAIS = [
  {
    label: "Sondagem",
    Icon: ClipboardList,
    description: "Identifique potencialidades, dificuldades e necessidades de apoio.",
  },
  {
    label: "Estudo de Caso",
    Icon: BookOpenText,
    description: "Organize informações e acompanhe a evolução pedagógica do estudante.",
  },
  {
    label: "PEI",
    Icon: FilePenLine,
    description: "Planeje objetivos, estratégias e intervenções individualizadas.",
  },
  {
    label: "PAEE",
    Icon: Target,
    description: "Organize o Plano de Atendimento Educacional Especializado.",
  },
  {
    label: "Monitoramento",
    Icon: BarChart3,
    description: "Acompanhe indicadores, avanços e evidências de aprendizagem.",
  },
  {
    label: "Relatórios Inteligentes",
    Icon: FileText,
    description: "Visualize registros, indicadores e relatórios pedagógicos.",
  },
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
  const [showPassword, setShowPassword] = useState(false);
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
            <span className="login-eyebrow">
              Gestão Pedagógica <strong>Inclusiva</strong>
            </span>
            <div className="login-brand-composition">
              <div className="login-logo-frame">
                <img src={logoAeeRegistro} alt="AEE Registro" />
              </div>
              <div className="login-institutional-copy">
                <p className="login-system-title">
                  Sistema de Gestão Pedagógica da Educação Inclusiva
                </p>
                <p className="login-institutional-description">
                  Planeje, registre e acompanhe o desenvolvimento dos estudantes em um ambiente
                  seguro, organizado e integrado.
                </p>
              </div>
            </div>
          </header>

          <figure className="login-education-photo" aria-label="Atendimento educacional inclusivo">
            <img
              src={inclusiveEducationPhoto}
              alt="Professora acompanhando um estudante em uma atividade pedagógica"
            />
          </figure>

          <div className="login-feature-grid" aria-label="Recursos institucionais">
            {RECURSOS_INSTITUCIONAIS.map(({ label, Icon, description }) => (
              <div className="login-feature-card" key={label}>
                <span className="login-feature-icon" aria-hidden="true">
                  <Icon size={25} strokeWidth={2} />
                </span>
                <strong>{label}</strong>
                <span className="login-feature-description">{description}</span>
                <span className="login-feature-accent" aria-hidden="true" />
              </div>
            ))}
          </div>

          <footer className="login-institutional-footer">
            <blockquote>
              <span aria-hidden="true">“</span>
              Transformando registros pedagógicos
              <br />
              em <strong>decisões para a inclusão.</strong>
              <span aria-hidden="true">”</span>
            </blockquote>
            <p>
              Plataforma desenvolvida para apoiar a gestão pedagógica da Educação Especial na
              perspectiva da Educação Inclusiva.
            </p>
          </footer>
        </aside>

        <div className="login-access-panel">
          <section className="login-card">
            <div className="login-card-heading">
              <span className="login-access-badge">
                <ShieldCheck size={15} aria-hidden="true" />
                Ambiente Institucional Seguro
              </span>
              <h1>Acesso à Plataforma</h1>
              <p className="login-card-copy">
                Utilize seu e-mail institucional e sua senha para acessar o sistema.
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
                    placeholder="Digite seu e-mail institucional"
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
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    className="login-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
                <label className="login-show-password">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(event) => setShowPassword(event.target.checked)}
                  />
                  <span>Mostrar senha</span>
                </label>
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

              <a
                className="login-forgot-password"
                href="#recuperacao-de-senha"
                aria-disabled="true"
                onClick={(event) => event.preventDefault()}
                title="Recuperação de senha disponível em breve"
              >
                Esqueceu sua senha?
              </a>
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
              <span>Versão 1.0</span>
            </div>
            <p>Sistema de Gestão Pedagógica da Educação Inclusiva</p>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
