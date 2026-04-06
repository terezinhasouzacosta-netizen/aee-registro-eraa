import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { listarAlunos, listarAlunosPorIds } from "./alunosService";
import { db } from "./firebase";

const acompanhamentosCollection = collection(db, "acompanhamentos");

export async function listarAlunosAcompanhamento({ idsPermitidos } = {}) {
  if (Array.isArray(idsPermitidos)) {
    return listarAlunosPorIds(idsPermitidos);
  }
  return listarAlunos();
}

export async function salvarDiarioBordo(payload) {
  const data = {
    ...payload,
    tipoRegistro: "diario_bordo",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const result = await addDoc(acompanhamentosCollection, data);
  return result.id;
}

export async function salvarRegistroProfessor(payload) {
  const data = {
    ...payload,
    tipoRegistro: "registro_professor",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const result = await addDoc(acompanhamentosCollection, data);
  return result.id;
}

export async function listarAcompanhamentos({ alunoId, tipoRegistro } = {}) {
  const constraints = [];
  if (alunoId) constraints.push(where("alunoId", "==", alunoId));
  if (tipoRegistro) constraints.push(where("tipoRegistro", "==", tipoRegistro));
  constraints.push(orderBy("createdAt", "desc"));

  const acompanhamentosQuery = query(acompanhamentosCollection, ...constraints);
  const snapshot = await getDocs(acompanhamentosQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function atualizarAcompanhamento(acompanhamentoId, payload) {
  const acompanhamentoRef = doc(db, "acompanhamentos", acompanhamentoId);
  await updateDoc(acompanhamentoRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function excluirAcompanhamento(acompanhamentoId) {
  const acompanhamentoRef = doc(db, "acompanhamentos", acompanhamentoId);
  await deleteDoc(acompanhamentoRef);
}

export async function salvarSinteseAcompanhamento(payload) {
  const data = {
    ...payload,
    tipoRegistro: "sintese",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const result = await addDoc(acompanhamentosCollection, data);
  return result.id;
}
