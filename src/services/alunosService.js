import {
  addDoc,
  collection,
  deleteDoc,
  documentId,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

const alunosCollection = collection(db, "alunos");

export async function listarAlunos() {
  const alunosQuery = query(alunosCollection, orderBy("nome", "asc"));
  const snapshot = await getDocs(alunosQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

export async function listarAlunosPorIds(ids = []) {
  if (!ids.length) return [];

  const parts = chunkArray(ids, 10);
  const requests = parts.map(async (part) => {
    const alunosQuery = query(alunosCollection, where(documentId(), "in", part));
    const snapshot = await getDocs(alunosQuery);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
  });

  const response = await Promise.all(requests);
  return response.flat().sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function criarAluno(payload) {
  const data = {
    ...payload,
    createdAt: serverTimestamp(),
    observacoesCount: 0,
  };

  const result = await addDoc(alunosCollection, data);
  return result.id;
}

export async function atualizarAluno(alunoId, payload) {
  const alunoRef = doc(db, "alunos", alunoId);
  await updateDoc(alunoRef, payload);
}

export async function excluirAluno(alunoId) {
  const alunoRef = doc(db, "alunos", alunoId);
  await deleteDoc(alunoRef);
}
