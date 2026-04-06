import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import { PERFIS, PERFIS_SISTEMA } from "../constants/profiles";

function normalizarPerfil(perfil) {
  if (!perfil) return null;

  const texto = String(perfil)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s/-]/g, "")
    .replace(/[\s/-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  const mapa = {
    DIRECAO: PERFIS.DIRECAO,
    DIRETOR: PERFIS.DIRECAO,
    DIRETORA: PERFIS.DIRECAO,

    COORDENACAO: PERFIS.COORDENACAO,
    COORDENADOR: PERFIS.COORDENACAO,
    COORDENADORA: PERFIS.COORDENACAO,
    COORDENADOR_PEDAGOGICO: PERFIS.COORDENACAO,
    COORDENADORA_PEDAGOGICA: PERFIS.COORDENACAO,

    AEE: PERFIS.AEE,
    PROFESSORA_AEE: PERFIS.AEE,
    PROFESSOR_AEE: PERFIS.AEE,

    MEDIADOR: PERFIS.MEDIADOR,
    MEDIADOR_ASSISTENTE: PERFIS.MEDIADOR,
    MEDIADOR_E_ASSISTENTE: PERFIS.MEDIADOR,

    ASSISTENTE: PERFIS.ASSISTENTE,
    ASSISTENTE_EDUCACIONAL: PERFIS.ASSISTENTE,
    ASSISTENTE_PEDAGOGICO: PERFIS.ASSISTENTE,

    REGENTE: PERFIS.REGENTE,
    PROFESSOR_REGENTE: PERFIS.REGENTE,
    PROFESSORA_REGENTE: PERFIS.REGENTE,

    ATENDIMENTO_DOMICILIAR: PERFIS.ATENDIMENTO_DOMICILIAR,
    PROFESSOR_ATENDIMENTO_DOMICILIAR: PERFIS.ATENDIMENTO_DOMICILIAR,
    PROFESSORA_ATENDIMENTO_DOMICILIAR: PERFIS.ATENDIMENTO_DOMICILIAR,
  };

  if (mapa[texto]) return mapa[texto];
  if (texto.includes("ASSISTENTE")) return PERFIS.ASSISTENTE;
  if (texto.includes("MEDIADOR")) return PERFIS.MEDIADOR;
  if (texto.includes("REGENTE")) return PERFIS.REGENTE;
  if (texto.includes("AEE")) return PERFIS.AEE;
  if (texto.includes("COORDEN")) return PERFIS.COORDENACAO;
  if (texto.includes("DIRE")) return PERFIS.DIRECAO;
  if (texto.includes("ATENDIMENTO_DOMICILIAR")) return PERFIS.ATENDIMENTO_DOMICILIAR;
  if (PERFIS_SISTEMA.includes(texto)) return texto;

  return null;
}
export async function buscarPerfilUsuario(uid, email) {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      const perfilBruto = data.perfil || data.role || null;
      const perfilNormalizado = normalizarPerfil(perfilBruto);
      console.log("[usersService] Perfil carregado por UID", {
        uid,
        email: email || null,
        perfilBruto,
        perfilNormalizado,
      });
      return perfilNormalizado;
    }

    // busca por email (caso não encontre pelo uid)
    const q = query(
      collection(db, "users"),
      where("email", "==", email),
      limit(1)
    );

    const result = await getDocs(q);

    if (!result.empty) {
      const data = result.docs[0].data();
      const perfilBruto = data.perfil || data.role || null;
      const perfilNormalizado = normalizarPerfil(perfilBruto);
      console.log("[usersService] Perfil carregado por email", {
        uid,
        email: email || null,
        perfilBruto,
        perfilNormalizado,
      });
      return perfilNormalizado;
    }

    console.warn("[usersService] Perfil não encontrado para usuário autenticado", {
      uid,
      email: email || null,
    });
    return null;
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return null;
  }
}
export async function buscarDadosUsuarioPorUid(uid) {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...snap.data(),
    };
  } catch (error) {
    console.error("Erro ao buscar dados do usuário por UID:", error);
    return null;
  }
}
