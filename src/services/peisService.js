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

const peisCollection = collection(db, "peis");

function toMillis(data) {
  if (!data) return 0;
  if (data?.toDate) return data.toDate().getTime();
  const parsed = new Date(data);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normalizarPei(data = {}) {
  return {
    ...data,
    alunoId: data.alunoId || "",
    alunoNome: data.alunoNome || data.identificacaoEstudante?.nome || "",
    schemaVersao: data.schemaVersao || 1,
    statusGeral: data.statusGeral || "rascunho",
    criadoEm: data.criadoEm || data.createdAt || null,
    atualizadoEm: data.atualizadoEm || data.updatedAt || null,
  };
}

function mapDoc(snapshot) {
  return {
    id: snapshot.id,
    ...normalizarPei(snapshot.data()),
  };
}

function ordenarPorDataDesc(lista) {
  return [...lista].sort((primeiroPei, segundoPei) => {
    const primeiraData = toMillis(primeiroPei.atualizadoEm || primeiroPei.criadoEm);
    const segundaData = toMillis(segundoPei.atualizadoEm || segundoPei.criadoEm);
    return segundaData - primeiraData;
  });
}

export async function listarPeis() {
  const snapshot = await getDocs(peisCollection);
  return ordenarPorDataDesc(snapshot.docs.map(mapDoc));
}

export async function buscarPeiPorId(peiId) {
  if (!peiId) return null;

  const peiRef = doc(db, "peis", peiId);
  const snapshot = await getDoc(peiRef);
  return snapshot.exists() ? mapDoc(snapshot) : null;
}

export async function listarPeisPorAlunoId(alunoId) {
  const alunoIdFinal = String(alunoId || "").trim();
  if (!alunoIdFinal) return [];

  const peisQuery = query(peisCollection, where("alunoId", "==", alunoIdFinal));
  const snapshot = await getDocs(peisQuery);
  return ordenarPorDataDesc(snapshot.docs.map(mapDoc));
}

export async function criarPei(payload) {
  const data = {
    ...payload,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  const result = await addDoc(peisCollection, data);
  return result.id;
}

export async function atualizarPei(peiId, payload) {
  if (!peiId) throw new Error("PEI inválido para atualização.");

  const peiRef = doc(db, "peis", peiId);
  await updateDoc(peiRef, {
    ...payload,
    atualizadoEm: serverTimestamp(),
  });
}

export async function excluirPei(peiId) {
  if (!peiId) return;
  const peiRef = doc(db, "peis", peiId);
  await deleteDoc(peiRef);
}
