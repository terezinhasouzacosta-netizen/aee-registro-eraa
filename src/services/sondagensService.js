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

const sondagensCollection = collection(db, "sondagens");

function mapSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...normalizarSondagem(item.data()),
  }));
}

function toMillis(data) {
  if (!data) return 0;
  if (data?.toDate) return data.toDate().getTime();
  const parsed = new Date(data);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normalizarSondagem(data = {}) {
  return {
    ...data,
    alunoId: data.alunoId || data.alunoID || "",
    alunoNome: data.alunoNome || data.nomeAluno || "",
    criadoEm: data.criadoEm || data.createdAt || null,
    atualizadoEm: data.atualizadoEm || data.updatedAt || null,
  };
}

function ordenarPorDataDesc(lista) {
  return [...lista].sort((a, b) => {
    const dataA = toMillis(a.atualizadoEm || a.criadoEm || a.updatedAt || a.createdAt);
    const dataB = toMillis(b.atualizadoEm || b.criadoEm || b.updatedAt || b.createdAt);
    return dataB - dataA;
  });
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

export async function listarSondagens({ alunoId, alunoIdsPermitidos } = {}) {
  if (alunoId) {
    if (
      Array.isArray(alunoIdsPermitidos) &&
      !alunoIdsPermitidos.includes(alunoId)
    ) {
      return [];
    }

    const sondagensQuery = query(sondagensCollection, where("alunoId", "==", alunoId));
    const snapshot = await getDocs(sondagensQuery);
    return ordenarPorDataDesc(mapSnapshot(snapshot));
  }

  if (Array.isArray(alunoIdsPermitidos)) {
    if (alunoIdsPermitidos.length === 0) return [];

    const requests = chunkArray(alunoIdsPermitidos, 10).map(async (chunk) => {
      const sondagensQuery = query(
        sondagensCollection,
        where("alunoId", "in", chunk)
      );
      const snapshot = await getDocs(sondagensQuery);
      return mapSnapshot(snapshot);
    });

    const response = await Promise.all(requests);
    return ordenarPorDataDesc(response.flat());
  }

  const sondagensQuery = query(sondagensCollection);
  const snapshot = await getDocs(sondagensQuery);
  return ordenarPorDataDesc(mapSnapshot(snapshot));
}

export async function criarSondagem(payload, criadoPor) {
  const data = {
    ...payload,
    criadoPor: criadoPor || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  const result = await addDoc(sondagensCollection, data);
  return result.id;
}

export async function atualizarSondagem(sondagemId, payload) {
  const sondagemRef = doc(db, "sondagens", sondagemId);
  await updateDoc(sondagemRef, {
    ...payload,
    atualizadoEm: serverTimestamp(),
  });
}

export async function excluirSondagem(sondagemId) {
  const sondagemRef = doc(db, "sondagens", sondagemId);
  await deleteDoc(sondagemRef);
}
