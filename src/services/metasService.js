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

const metasCollection = collection(db, "metas");

function ordenarPorDataDesc(lista) {
  return [...lista].sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return bDate - aDate;
  });
}

function mapSnapshot(snapshot) {
  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .filter((meta) => String(meta?.alunoId || "").trim());
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function normalizarPayloadMeta(payload) {
  const alunoId = String(payload?.alunoId || "").trim();
  if (!alunoId) {
    throw new Error("Meta invalida: campo alunoId obrigatorio.");
  }

  return {
    ...payload,
    alunoId,
    alunoNome: String(payload?.alunoNome || "").trim(),
  };
}

export async function listarMetas({ alunoIds, alunoId, bimestre } = {}) {
  const possuiRestricaoPorVinculo = Array.isArray(alunoIds);

  if (alunoId) {
    if (possuiRestricaoPorVinculo && !alunoIds.includes(alunoId)) {
      return [];
    }

    const metasQuery = query(metasCollection, where("alunoId", "==", alunoId));
    const snapshot = await getDocs(metasQuery);
    const metas = mapSnapshot(snapshot);
    const filtradas = bimestre ? metas.filter((meta) => meta.bimestre === bimestre) : metas;
    return ordenarPorDataDesc(filtradas);
  }

  if (possuiRestricaoPorVinculo) {
    if (alunoIds.length === 0) return [];

    const chunks = chunkArray(alunoIds, 10);
    const requests = chunks.map(async (chunk) => {
      const metasQuery = query(metasCollection, where("alunoId", "in", chunk));
      const snapshot = await getDocs(metasQuery);
      return mapSnapshot(snapshot);
    });

    const response = await Promise.all(requests);
    const metas = response.flat();
    const filtradas = bimestre ? metas.filter((meta) => meta.bimestre === bimestre) : metas;
    return ordenarPorDataDesc(filtradas);
  }

  const constraints = bimestre ? [where("bimestre", "==", bimestre)] : [];
  const metasQuery = query(metasCollection, ...constraints);
  const snapshot = await getDocs(metasQuery);
  return ordenarPorDataDesc(mapSnapshot(snapshot));
}

export async function criarMeta(payload) {
  const data = {
    ...normalizarPayloadMeta(payload),
    createdAt: serverTimestamp(),
  };

  const result = await addDoc(metasCollection, data);
  return result.id;
}

export async function atualizarMeta(metaId, payload) {
  const metaRef = doc(db, "metas", metaId);
  const payloadFinal = payload?.alunoId
    ? normalizarPayloadMeta(payload)
    : payload;
  await updateDoc(metaRef, payloadFinal);
}

export async function excluirMeta(metaId) {
  const metaRef = doc(db, "metas", metaId);
  await deleteDoc(metaRef);
}

export async function listarMetasPorAlunoId({
  alunoId,
  alunoIdsPermitidos,
} = {}) {
  const alunoIdFinal = String(alunoId || "").trim();
  if (!alunoIdFinal) return [];

  if (
    Array.isArray(alunoIdsPermitidos) &&
    !alunoIdsPermitidos.includes(alunoIdFinal)
  ) {
    return [];
  }

  const metasQuery = query(metasCollection, where("alunoId", "==", alunoIdFinal));
  const snapshot = await getDocs(metasQuery);
  return ordenarPorDataDesc(mapSnapshot(snapshot));
}
