import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";

export async function signIn(email, password) {
  const safeEmail = String(email || "").trim();

  try {
    return await signInWithEmailAndPassword(auth, safeEmail, password);
  } catch (error) {
    console.error("[Auth] Falha no signInWithEmailAndPassword", {
      code: error?.code || null,
      message: error?.message || null,
      email: safeEmail,
      authDomain: auth?.config?.authDomain || null,
      projectId: auth?.app?.options?.projectId || null,
    });
    throw error;
  }
}

export async function signOutUser() {
  return signOut(auth);
}
