import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

const relatoriosCollection = collection(db, "relatorios");

function mapSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

function ordenarPorCriadoEmDesc(lista) {
  return [...lista].sort((a, b) => {
    const aDate = a.criadoEm?.toDate ? a.criadoEm.toDate().getTime() : 0;
    const bDate = b.criadoEm?.toDate ? b.criadoEm.toDate().getTime() : 0;
    return bDate - aDate;
  });
}

export async function listarRelatorios({ alunoId, bimestre, alunoIdsPermitidos } = {}) {
  if (Array.isArray(alunoIdsPermitidos) && alunoId && !alunoIdsPermitidos.includes(alunoId)) {
    return [];
  }

  const constraints = [];
  if (alunoId) constraints.push(where("alunoId", "==", alunoId));
  if (bimestre) constraints.push(where("bimestre", "==", bimestre));

  const relatoriosQuery = query(relatoriosCollection, ...constraints);
  const snapshot = await getDocs(relatoriosQuery);
  let relatorios = mapSnapshot(snapshot);

  if (Array.isArray(alunoIdsPermitidos)) {
    relatorios = relatorios.filter((item) => alunoIdsPermitidos.includes(item.alunoId));
  }

  return ordenarPorCriadoEmDesc(relatorios);
}

export async function criarRelatorio(payload, criadoPor) {
  const data = {
    ...payload,
    criadoPor,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  const result = await addDoc(relatoriosCollection, data);
  return result.id;
}

export async function atualizarRelatorio(relatorioId, payload) {
  const relatorioRef = doc(db, "relatorios", relatorioId);
  await updateDoc(relatorioRef, {
    ...payload,
    atualizadoEm: serverTimestamp(),
  });
}

export async function excluirRelatorio(relatorioId) {
  const relatorioRef = doc(db, "relatorios", relatorioId);
  await deleteDoc(relatorioRef);
}
