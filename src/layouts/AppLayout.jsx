import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  podeAcessarAcompanhamento,
  podeVisualizarAtendimentoAEE,
  podeVisualizarAlunos,
  podeVisualizarMetas,
  podeVisualizarMonitoramentos,
  podeVisualizarPainelCoordenacao,
  podeVisualizarRelatorios,
  podeVisualizarSondagens,
} from "../utils/permissions";

function parseZIndex(value) {
  if (!value || value === "auto") return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function parseRGBA(value) {
  if (!value || value === "transparent") return null;

  const rgbaMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(",").map((part) => Number(part.trim()));
    if (parts.length >= 3) {
      const [r, g, b] = parts;
      const alpha = parts.length >= 4 && Number.isFinite(parts[3]) ? parts[3] : 1;
      return { r, g, b, alpha };
    }
  }

  const hexMatch = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      const alpha = hex.length === 4 ? Number.parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, alpha };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      const alpha = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, alpha };
    }
  }

  return null;
}

function isDarkBackdrop(colorValue) {
  const rgba = parseRGBA(colorValue);
  if (!rgba) return false;
  const { r, g, b, alpha } = rgba;
  const media = (r + g + b) / 3;
  return alpha >= 0.08 && media <= 120;
}

function hasSuspiciousClass(element) {
  const className = String(element.className || "").toLowerCase();
  return className.includes("overlay") || className.includes("backdrop") || className.includes("modal");
}

function hasSuspiciousInlineStyle(element) {
  const style = String(element.getAttribute("style") || "").toLowerCase();
  const hasDarkBackground =
    style.includes("background") &&
    (style.includes("rgba(0") || style.includes("rgb(0") || style.includes("#000"));

  return (
    style.includes("position: fixed") ||
    style.includes("inset: 0") ||
    (style.includes("z-index") && hasDarkBackground)
  );
}

function coversViewport(element) {
  const rect = element.getBoundingClientRect();
  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;

  if (!vw || !vh) return false;

  const widthOk = rect.width >= vw * 0.75;
  const heightOk = rect.height >= vh * 0.75;
  const alignedTopLeft = rect.left <= vw * 0.2 && rect.top <= vh * 0.2;

  return widthOk && heightOk && alignedTopLeft;
}

function limparClassesBloqueioGlobal() {
  const root = document.getElementById("root");
  const html = document.documentElement;
  const body = document.body;

  [html, body, root].forEach((node) => {
    if (!node) return;

    const classesAntes = Array.from(node.classList || []);
    const classesRemovidas = classesAntes.filter((cls) => {
      const nome = String(cls || "").toLowerCase();
      return (
        nome.includes("overlay") ||
        nome.includes("backdrop") ||
        nome.includes("modal") ||
        nome.includes("loading") ||
        nome.includes("blocked") ||
        nome.includes("dim")
      );
    });

    classesRemovidas.forEach((cls) => node.classList.remove(cls));

    if (classesRemovidas.length > 0) {
      console.warn("[OverlayGuard] Classes globais removidas.", {
        alvo: node.tagName,
        classesRemovidas,
      });
    }
  });

  if (body) {
    body.style.pointerEvents = "auto";
    body.style.overflow = "auto";
    body.style.filter = "none";
    body.style.opacity = "1";
    body.style.backdropFilter = "none";
    body.style.background = "";
    body.style.backgroundColor = "#f1f5f9";
    body.removeAttribute("aria-hidden");
  }

  if (html) {
    html.style.pointerEvents = "auto";
    html.style.overflow = "auto";
    html.style.filter = "none";
    html.style.opacity = "1";
    html.style.backdropFilter = "none";
    html.style.background = "";
    html.style.backgroundColor = "#f1f5f9";
    html.removeAttribute("aria-hidden");
  }

  if (root) {
    root.style.pointerEvents = "auto";
    root.style.overflow = "visible";
    root.style.filter = "none";
    root.style.opacity = "1";
    root.style.backdropFilter = "none";
    root.style.background = "";
    root.style.backgroundColor = "#f1f5f9";
    root.removeAttribute("aria-hidden");
  }

  console.log("[OverlayGuard] Reset visual global aplicado em html/body/#root.", {
    html: html
      ? {
          className: html.className || null,
          opacity: html.style.opacity || null,
          filter: html.style.filter || null,
          pointerEvents: html.style.pointerEvents || null,
        }
      : null,
    body: body
      ? {
          className: body.className || null,
          opacity: body.style.opacity || null,
          filter: body.style.filter || null,
          pointerEvents: body.style.pointerEvents || null,
        }
      : null,
    root: root
      ? {
          className: root.className || null,
          opacity: root.style.opacity || null,
          filter: root.style.filter || null,
          pointerEvents: root.style.pointerEvents || null,
        }
      : null,
  });
}

function removerOverlaysFantasmas() {
  limparClassesBloqueioGlobal();

  const candidatos = Array.from(document.querySelectorAll("*"));
  const suspeitosDetectados = [];
  const suspeitosRemovidos = [];

  candidatos.forEach((element) => {
    if (!element || element === document.body || element === document.documentElement) return;

    const computed = window.getComputedStyle(element);
    if (!computed) return;

    const posicaoFixa = computed.position === "fixed";
    const zIndex = parseZIndex(computed.zIndex);
    const fundoEscuro = isDarkBackdrop(computed.backgroundColor);
    const cobreTela = posicaoFixa ? coversViewport(element) : false;
    const pointerAtivo = computed.pointerEvents !== "none";

    const classeSuspeita = hasSuspiciousClass(element);
    const inlineSuspeito = hasSuspiciousInlineStyle(element);

    const deveRegistrar =
      classeSuspeita || (posicaoFixa && zIndex >= 20 && (fundoEscuro || cobreTela || inlineSuspeito));

    if (!deveRegistrar) return;

    const info = {
      tag: element.tagName,
      id: element.id || null,
      className: String(element.className || "").trim() || null,
      position: computed.position,
      zIndex,
      backgroundColor: computed.backgroundColor,
      pointerEvents: computed.pointerEvents,
      opacity: computed.opacity,
      width: Math.round(element.getBoundingClientRect().width),
      height: Math.round(element.getBoundingClientRect().height),
      coversViewport: cobreTela,
    };

    suspeitosDetectados.push(info);

    const removerPorClasse = classeSuspeita;
    const removerPorCoberturaEscura = posicaoFixa && pointerAtivo && zIndex >= 20 && cobreTela && fundoEscuro;
    const removerPorInline = inlineSuspeito && (classeSuspeita || posicaoFixa);

    if (removerPorClasse || removerPorCoberturaEscura || removerPorInline) {
      suspeitosRemovidos.push(info);
      element.remove();
    }
  });

  if (suspeitosDetectados.length > 0) {
    console.warn("[OverlayGuard] Elementos suspeitos cobrindo tela detectados.", suspeitosDetectados);
  } else {
    console.log("[OverlayGuard] Nenhum elemento suspeito de overlay foi detectado.");
  }

  if (suspeitosRemovidos.length > 0) {
    console.warn("[OverlayGuard] Elementos removidos para liberar interação.", suspeitosRemovidos);
  }
}

function AppLayout() {
  const {
    currentUser,
    perfil,
    perfilLabel,
    signOut,
    loading,
    authLoading,
    perfilCarregado,
  } = useAuth();
  const location = useLocation();

  const mostrarAlunos = podeVisualizarAlunos(perfil);
  const mostrarSondagem = podeVisualizarSondagens(perfil);
  const mostrarHabilidades = podeVisualizarMetas(perfil);
  const mostrarAcompanhamento = podeAcessarAcompanhamento(perfil);
  const mostrarAtendimentoAEE = podeVisualizarAtendimentoAEE(perfil);
  const mostrarMonitoramento = podeVisualizarMonitoramentos(perfil);
  const mostrarRelatorios = podeVisualizarRelatorios(perfil);
  const mostrarPainelCoordenacao = podeVisualizarPainelCoordenacao(perfil);

  console.log("[AppLayout] ENTRADA confirmada no layout principal", {
    rotaAtual: location.pathname,
    emailUsuario: currentUser?.email || null,
    perfilAtual: perfil,
    mostrarAlunos,
    mostrarSondagem,
    mostrarHabilidades,
    mostrarAcompanhamento,
    mostrarAtendimentoAEE,
    mostrarMonitoramento,
    mostrarRelatorios,
    mostrarPainelCoordenacao,
  });

  const bloqueioAutenticacao = loading || authLoading || (Boolean(currentUser) && !perfilCarregado);

  useEffect(() => {
    const estadoBloqueio = {
      loading,
      authLoading,
      perfilCarregado,
      possuiUsuario: Boolean(currentUser),
      bloqueioAutenticacao,
    };

    if (bloqueioAutenticacao) {
      console.log("[OverlayGuard] Overlay ativo durante carregamento/autenticação.", estadoBloqueio);
      return;
    }

    console.log("[OverlayGuard] Overlay removido. Interface liberada.", estadoBloqueio);

    removerOverlaysFantasmas();

    const shell = document.querySelector(".app-shell");
    const content = document.querySelector(".app-content");
    const page = document.querySelector(".page-content");

    [shell, content, page].forEach((element, index) => {
      if (!element) return;
      const computed = window.getComputedStyle(element);
      console.log("[OverlayGuard] Estado visual do container principal.", {
        alvo: index === 0 ? "app-shell" : index === 1 ? "app-content" : "page-content",
        opacity: computed.opacity,
        filter: computed.filter,
        backdropFilter: computed.backdropFilter,
        backgroundColor: computed.backgroundColor,
        pointerEvents: computed.pointerEvents,
      });
    });

    const raf1 = requestAnimationFrame(() => removerOverlaysFantasmas());
    const raf2 = requestAnimationFrame(() => removerOverlaysFantasmas());
    const timeout = window.setTimeout(() => removerOverlaysFantasmas(), 300);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timeout);
    };
  }, [authLoading, bloqueioAutenticacao, currentUser, loading, perfilCarregado]);

  return (
    <div
      className="app-shell"
      style={{
        opacity: 1,
        filter: "none",
        backgroundColor: "#f8fafc",
      }}
    >
      <aside className="app-sidebar">
        <h2 className="sidebar-title">AEE Registro</h2>
        <nav className="sidebar-nav">
          <div className="sidebar-escola">
            <img
              src="/logo-eraa.jpg"
              alt="Logo da Escola Raimundo Augusto de Araújo"
              className="sidebar-escola-logo"
            />
            <div className="sidebar-escola-textos">
              <p className="sidebar-escola-nome">Escola Raimundo Augusto de Araújo</p>
              <p className="sidebar-escola-slogan">Educação Inclusiva e Ensino de Qualidade</p>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">
              <span className="sidebar-section-icon" aria-hidden="true">🏠</span>
              <span>GERAL</span>
            </p>
            <NavLink to="/">Início</NavLink>
            {mostrarAlunos ? <NavLink to="/alunos">Alunos</NavLink> : null}
          </div>

          {mostrarSondagem ? (
            <div className="sidebar-section">
              <p className="sidebar-section-title">
                <span className="sidebar-section-icon" aria-hidden="true">🔍</span>
                <span>DIAGNÓSTICO</span>
              </p>
              <NavLink to="/sondagens">Sondagem</NavLink>
            </div>
          ) : null}

          {mostrarHabilidades ? (
            <div className="sidebar-section">
              <p className="sidebar-section-title">
                <span className="sidebar-section-icon" aria-hidden="true">🧠</span>
                <span>PLANEJAMENTO</span>
              </p>
              <NavLink to="/metas">Habilidades</NavLink>
            </div>
          ) : null}

          {mostrarAtendimentoAEE || mostrarAcompanhamento ? (
            <div className="sidebar-section">
              <p className="sidebar-section-title">
                <span className="sidebar-section-icon" aria-hidden="true">🎯</span>
                <span>INTERVENÇÃO</span>
              </p>
              {mostrarAtendimentoAEE ? (
                <NavLink to="/atendimento-aee" className="sidebar-link-highlight">
                  Atendimento AEE
                </NavLink>
              ) : null}
              {mostrarAcompanhamento ? <NavLink to="/acompanhamento">Acompanhamento</NavLink> : null}
            </div>
          ) : null}

          {mostrarMonitoramento || mostrarRelatorios ? (
            <div className="sidebar-section">
              <p className="sidebar-section-title">
                <span className="sidebar-section-icon" aria-hidden="true">📊</span>
                <span>AVALIAÇÃO E ANÁLISE</span>
              </p>
              {mostrarMonitoramento ? <NavLink to="/monitoramentos">Monitoramento</NavLink> : null}
              {mostrarRelatorios ? <NavLink to="/relatorios">Relatórios</NavLink> : null}
            </div>
          ) : null}

          {mostrarPainelCoordenacao ? (
            <div className="sidebar-section">
              <p className="sidebar-section-title">
                <span className="sidebar-section-icon" aria-hidden="true">⚙️</span>
                <span>GESTÃO</span>
              </p>
              <NavLink to="/painel-coordenacao">Painel da Coordenação</NavLink>
            </div>
          ) : null}
        </nav>
      </aside>

      <div
        className="app-content"
        style={{
          opacity: 1,
          filter: "none",
          backgroundColor: "#f8fafc",
        }}
      >
        <header className="topbar">
          <div>
            <strong>{currentUser?.displayName || "Usuário"}</strong>
            <p>{perfilLabel || "Perfil não configurado"}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={signOut}>
            Sair
          </button>
        </header>

        <section
          className="page-content"
          style={{
            opacity: 1,
            filter: "none",
            backgroundColor: "#f8fafc",
          }}
        >
          <Outlet />
        </section>
      </div>
    </div>
  );
}

export default AppLayout;
