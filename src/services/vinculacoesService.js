import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export async function buscarIdsAlunosVinculados(profissionalId) {
  if (!profissionalId) return [];

  const vinculacoesRef = collection(db, "vinculacoes");
  const vinculacoesQuery = query(
    vinculacoesRef,
    where("profissionalId", "==", profissionalId)
  );
  const snapshot = await getDocs(vinculacoesQuery);

  return snapshot.docs
    .map((item) => item.data().alunoId)
    .filter((alunoId) => Boolean(alunoId));
}
