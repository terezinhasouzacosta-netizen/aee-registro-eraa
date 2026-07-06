import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

const estudosCasoCollection = collection(db, "estudosCaso");

function toMillis(data) {
  if (!data) return 0;
  if (data?.toDate) return data.toDate().getTime();
  const parsed = new Date(data);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normalizarEstudoCaso(data = {}) {
  return {
    ...data,
    alunoId: data.alunoId ?? null,
    alunoNome: data.alunoNome || "",
    criadoEm: data.criadoEm || data.createdAt || null,
    atualizadoEm: data.atualizadoEm || data.updatedAt || null,
  };
}

function mapDoc(snapshot) {
  return {
    id: snapshot.id,
    ...normalizarEstudoCaso(snapshot.data()),
  };
}

function ordenarPorDataDesc(lista) {
  return [...lista].sort((a, b) => {
    const dataA = toMillis(a.atualizadoEm || a.criadoEm);
    const dataB = toMillis(b.atualizadoEm || b.criadoEm);
    return dataB - dataA;
  });
}

export async function listarEstudosCaso({ alunoId } = {}) {
  const alunoIdFinal = String(alunoId || "").trim();

  if (alunoIdFinal) {
    const estudosCasoQuery = query(
      estudosCasoCollection,
      where("alunoId", "==", alunoIdFinal)
    );
    const snapshot = await getDocs(estudosCasoQuery);
    return ordenarPorDataDesc(snapshot.docs.map(mapDoc));
  }

  const snapshot = await getDocs(estudosCasoCollection);
  return ordenarPorDataDesc(snapshot.docs.map(mapDoc));
}

export async function buscarEstudoCasoPorId(estudoCasoId) {
  if (!estudoCasoId) return null;

  const estudoCasoRef = doc(db, "estudosCaso", estudoCasoId);
  const snapshot = await getDoc(estudoCasoRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapDoc(snapshot);
}

export async function criarEstudoCaso(payload) {
  const data = {
    ...payload,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  const result = await addDoc(estudosCasoCollection, data);
  return result.id;
}

export async function atualizarEstudoCaso(estudoCasoId, payload) {
  const estudoCasoRef = doc(db, "estudosCaso", estudoCasoId);
  await updateDoc(estudoCasoRef, {
    ...payload,
    atualizadoEm: serverTimestamp(),
  });
}

export async function excluirEstudoCaso(estudoCasoId) {
  const estudoCasoRef = doc(db, "estudosCaso", estudoCasoId);
  await deleteDoc(estudoCasoRef);
}
