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

const monitoramentosCollection = collection(db, "monitoramentos");

function mapSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...normalizarMonitoramento(item.data()),
  }));
}

function toMillis(data) {
  if (!data) return 0;
  if (data?.toDate) return data.toDate().getTime();
  const parsed = new Date(data);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normalizarMonitoramento(data = {}) {
  return {
    ...data,
    alunoId: data.alunoId || data.alunoID || "",
    alunoNome: data.alunoNome || data.nomeAluno || "",
    eixoObservado: data.eixoObservado || data.eixoTematico || data.eixo || "",
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

export async function listarMonitoramentos({ alunoId, alunoIdsPermitidos } = {}) {
  if (alunoId) {
    if (
      Array.isArray(alunoIdsPermitidos) &&
      !alunoIdsPermitidos.includes(alunoId)
    ) {
      return [];
    }

    const monitoramentosQuery = query(
      monitoramentosCollection,
      where("alunoId", "==", alunoId)
    );
    const snapshot = await getDocs(monitoramentosQuery);
    return ordenarPorDataDesc(mapSnapshot(snapshot));
  }

  if (Array.isArray(alunoIdsPermitidos)) {
    if (alunoIdsPermitidos.length === 0) return [];

    const requests = chunkArray(alunoIdsPermitidos, 10).map(async (chunk) => {
      const monitoramentosQuery = query(
        monitoramentosCollection,
        where("alunoId", "in", chunk)
      );
      const snapshot = await getDocs(monitoramentosQuery);
      return mapSnapshot(snapshot);
    });

    const response = await Promise.all(requests);
    return ordenarPorDataDesc(response.flat());
  }

  const monitoramentosQuery = query(monitoramentosCollection);
  const snapshot = await getDocs(monitoramentosQuery);
  return ordenarPorDataDesc(mapSnapshot(snapshot));
}

export async function criarMonitoramento(payload, criadoPor) {
  const data = {
    ...payload,
    criadoPor: criadoPor || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  const result = await addDoc(monitoramentosCollection, data);
  return result.id;
}

export async function atualizarMonitoramento(monitoramentoId, payload) {
  const monitoramentoRef = doc(db, "monitoramentos", monitoramentoId);
  await updateDoc(monitoramentoRef, {
    ...payload,
    atualizadoEm: serverTimestamp(),
  });
}

export async function excluirMonitoramento(monitoramentoId) {
  const monitoramentoRef = doc(db, "monitoramentos", monitoramentoId);
  await deleteDoc(monitoramentoRef);
}
