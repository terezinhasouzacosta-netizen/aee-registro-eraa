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

const paeesCollection = collection(db, "paees");

function toMillis(data) {
  if (!data) return 0;
  if (data?.toDate) return data.toDate().getTime();
  const parsed = new Date(data);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normalizarPaee(data = {}) {
  return {
    ...data,
    alunoId: data.alunoId || "",
    alunoNome: data.alunoNome || data.identificacaoEstudante?.nome || "",
    schemaVersao: data.schemaVersao || 1,
    criadoEm: data.criadoEm || data.createdAt || null,
    atualizadoEm: data.atualizadoEm || data.updatedAt || null,
    dataConclusao: data.dataConclusao || null,
  };
}

function mapDoc(snapshot) {
  return {
    id: snapshot.id,
    ...normalizarPaee(snapshot.data()),
  };
}

function ordenarPorDataDesc(lista) {
  return [...lista].sort((a, b) => {
    const dataA = toMillis(a.atualizadoEm || a.criadoEm);
    const dataB = toMillis(b.atualizadoEm || b.criadoEm);
    return dataB - dataA;
  });
}

export async function listarPaees() {
  const snapshot = await getDocs(paeesCollection);
  return ordenarPorDataDesc(snapshot.docs.map(mapDoc));
}

export async function buscarPaeePorId(paeeId) {
  if (!paeeId) return null;

  const paeeRef = doc(db, "paees", paeeId);
  const snapshot = await getDoc(paeeRef);

  return snapshot.exists() ? mapDoc(snapshot) : null;
}

export async function listarPaeesPorAlunoId(alunoId) {
  const alunoIdFinal = String(alunoId || "").trim();
  if (!alunoIdFinal) return [];

  const paeesQuery = query(paeesCollection, where("alunoId", "==", alunoIdFinal));
  const snapshot = await getDocs(paeesQuery);
  return ordenarPorDataDesc(snapshot.docs.map(mapDoc));
}

export async function criarPaee(payload) {
  const data = {
    ...payload,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  const result = await addDoc(paeesCollection, data);
  return result.id;
}

export async function atualizarPaee(paeeId, payload) {
  if (!paeeId) throw new Error("PAEE inválido para atualização.");

  const paeeRef = doc(db, "paees", paeeId);
  await updateDoc(paeeRef, {
    ...payload,
    atualizadoEm: serverTimestamp(),
  });
}

export async function excluirPaee(paeeId) {
  if (!paeeId) return;
  const paeeRef = doc(db, "paees", paeeId);
  await deleteDoc(paeeRef);
}
