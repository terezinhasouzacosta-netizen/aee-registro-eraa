import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { PERFIL_LABEL } from "../constants/profiles";
import { buscarPerfilUsuario } from "../services/usersService";
import { auth } from "../services/firebase";
import { signOutUser } from "../services/authService";

export const AuthContext = createContext(null);
const AUTH_TIMEOUT_MS = 8000;

function normalizarPerfil(perfil) {
  if (!perfil) return null;
  return String(perfil)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s/-]/g, "")
    .replace(/[\s/-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export function AuthProvider({ children }) {
  const authRequestIdRef = useRef(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [perfilCarregado, setPerfilCarregado] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    setLoading(true);
    setAuthLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const requestId = ++authRequestIdRef.current;
      const isStale = () => requestId !== authRequestIdRef.current;
      let timeoutId = null;

      setCurrentUser(firebaseUser);
      setAuthError("");
      setLoading(true);
      setAuthLoading(true);

      if (!firebaseUser) {
        console.log("[AuthContext] Sessão ausente. Estado limpo.");
        setPerfil(null);
        setPerfilCarregado(false);
        setLoading(false);
        setAuthLoading(false);
        return;
      }

      console.log("[AuthContext] Usuário autenticado, carregando perfil...", {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
      });
      setPerfilCarregado(false);

      timeoutId = setTimeout(() => {
        if (isStale()) {
          return;
        }
        console.error("[AuthContext] Timeout ao carregar perfil. Liberando interface.", {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          timeoutMs: AUTH_TIMEOUT_MS,
        });
        setAuthError("Tempo limite para carregar o perfil. Tente novamente.");
        setPerfilCarregado(true);
        setLoading(false);
        setAuthLoading(false);
      }, AUTH_TIMEOUT_MS);

      try {
        const perfilEncontrado = await buscarPerfilUsuario(firebaseUser.uid, firebaseUser.email);

        if (isStale()) {
          console.warn("[AuthContext] Resposta de perfil ignorada por stale state.", {
            requestId,
            uid: firebaseUser.uid,
            email: firebaseUser.email || null,
          });
          return;
        }

        const perfilNormalizado = normalizarPerfil(perfilEncontrado);

        console.log("[AuthContext] Perfil carregado", {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          perfilBrutoFirestore: perfilEncontrado,
          perfilNormalizado,
        });

        setPerfil(perfilNormalizado);
      } catch (error) {
        if (isStale()) {
          console.warn("[AuthContext] Erro ignorado por stale state.", {
            requestId,
            uid: firebaseUser.uid,
            email: firebaseUser.email || null,
          });
          return;
        }

        console.error("[AuthContext] Erro ao carregar perfil no Firestore", {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          code: error?.code || null,
          message: error?.message || null,
        });
        setPerfil(null);
        setAuthError("Não foi possível carregar o perfil do usuário.");
      } finally {
        if (timeoutId) clearTimeout(timeoutId);

        if (isStale()) {
          return;
        }

        setPerfilCarregado(true);
        setLoading(false);
        setAuthLoading(false);
        console.log("[AuthContext] Loading finalizado.");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    authRequestIdRef.current += 1;
    console.log("[AuthContext] Logout iniciado.");
    setLoading(true);
    setAuthLoading(true);
    setAuthError("");

    try {
      await signOutUser();
    } catch (error) {
      console.error("[AuthContext] Erro no logout", {
        code: error?.code || null,
        message: error?.message || null,
      });
      setAuthError("Erro ao encerrar sessão. Tente novamente.");
    } finally {
      setCurrentUser(null);
      setPerfil(null);
      setPerfilCarregado(false);
      setLoading(false);
      setAuthLoading(false);
      console.log("[AuthContext] Logout finalizado. Estado limpo.");
    }
  };

  const value = useMemo(
    () => ({
      currentUser,
      perfil,
      perfilLabel: perfil ? PERFIL_LABEL[perfil] || perfil : null,
      perfilCarregado,
      isAuthenticated: Boolean(currentUser),
      loading,
      authLoading,
      authError,
      signOut: handleSignOut,
    }),
    [authError, authLoading, currentUser, loading, perfil, perfilCarregado]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
