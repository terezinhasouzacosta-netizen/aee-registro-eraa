import { collection, doc, getDocFromServer, getDocsFromServer, query, where } from "firebase/firestore";
import { db } from "./firebase";

// Only reads. Failure of any source aborts generation rather than hiding missing access.
export async function carregarFontesEstudoCaso(alunoId) {
  if (db.app.options.projectId !== "aee-registro-eraa") throw new Error("Firebase oficial indisponível.");
  if (!alunoId) throw new Error("Selecione um aluno do Cadastro.");
  const nomes = ["sondagens", "atendimentosAEE", "paees", "peis"];
  const [cadastro, ...fontes] = await Promise.all([
    getDocFromServer(doc(db, "alunos", alunoId)),
    ...nomes.map((nome) => getDocsFromServer(query(collection(db, nome), where("alunoId", "==", alunoId)))),
  ]);
  if (!cadastro.exists()) throw new Error("Aluno não encontrado no Cadastro oficial.");
  return {
    alunoId,
    aluno: { ...cadastro.data(), id: cadastro.id },
    ...Object.fromEntries(nomes.map((nome, index) => [nome, fontes[index].docs.map((item) => ({ ...item.data(), id: item.id }))])),
  };
}
