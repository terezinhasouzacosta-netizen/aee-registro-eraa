import { collection, doc, getDocs, query, where, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { podeEditarHistoricoAcompanhamento } from "../utils/permissions";
import { referenciaPlanejamentoAee, planejamentoColetivoAee, execucaoAusenteAee, montarRegistrosColetivos, validarSequenciaAee, TURMAS_AEE, PRESENCAS_AEE } from "../utils/salaRecursosAee";
import { obterSemanaReferenciaPorData, normalizarAtendimento } from "./atendimentoAeeService";

function oficial() { if (db.app.options.projectId !== "aee-registro-eraa") throw new Error("Operação bloqueada: Firebase institucional incorreto."); }
function escrita(perfil) { oficial(); if (!auth.currentUser || !podeEditarHistoricoAcompanhamento(perfil)) throw new Error("Usuário sem permissão para registrar."); }
const mapear = (snapshot) => snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
export async function listarSequenciasAee() { oficial(); return mapear(await getDocs(collection(db, "sequenciasDidaticasAEE"))); }
export async function listarCronogramasAee() { oficial(); return mapear(await getDocs(collection(db, "cronogramasAEE"))); }
export async function listarRegistrosSalaAee(alunoIds) {
  oficial(); const ids = [...new Set(alunoIds.filter(Boolean))]; const result = [];
  for (let i = 0; i < ids.length; i += 10) result.push(...mapear(await getDocs(query(collection(db, "atendimentosAEE"), where("alunoId", "in", ids.slice(i, i + 10))))));
  return result.map(normalizarAtendimento);
}
export async function salvarSequenciaAee(id, form, perfil) {
  escrita(perfil); const data = validarSequenciaAee(form);
  const ref = id ? doc(db, "sequenciasDidaticasAEE", id) : doc(collection(db, "sequenciasDidaticasAEE"));
  await setDoc(ref, { ...data, atualizadoEm: serverTimestamp(), responsavelId: auth.currentUser.uid }, { merge: true }); return ref.id;
}
export async function salvarCronogramaAee(turma, form, perfil) {
  escrita(perfil); if (!TURMAS_AEE.includes(turma)) throw new Error("Turma inválida.");
  const inicio = String(form.inicio || ""), fim = String(form.fim || "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(fim) || inicio >= fim || !String(form.dias || "").trim()) throw new Error("Informe dias e horário final posterior ao inicial.");
  await setDoc(doc(db, "cronogramasAEE", turma), { turma, dias: String(form.dias).trim(), inicio, fim, atualizadoEm: serverTimestamp() });
}
export async function salvarColetivoAee(coletivoId, form, alunos, sequencia, perfil) {
  escrita(perfil); if (!/^[a-zA-Z0-9-]+$/.test(coletivoId)) throw new Error("Identificador inválido.");
  const usuario = auth.currentUser;
  montarRegistrosColetivos(form, alunos, sequencia, usuario);
  const ref = doc(db, "atendimentosColetivosAEE", coletivoId);
  return runTransaction(db, async (transaction) => {
    const existente = await transaction.get(ref);
    if (existente.exists()) return coletivoId; // Retrying the same submission never duplicates records.
    const atuais = await Promise.all(alunos.map((a) => transaction.get(doc(db, "alunos", a.id))));
    if (atuais.some((a) => !a.exists())) throw new Error("Um estudante foi removido. Recarregue a turma.");
    let seq = form.sequenciaId ? sequencia : null;
    if (form.sequenciaId) { const s = await transaction.get(doc(db, "sequenciasDidaticasAEE", form.sequenciaId)); if (!s.exists()) throw new Error("Sequência não encontrada."); seq = { ...s.data(), id: s.id }; }
    if (form.sequenciaId && JSON.stringify(referenciaPlanejamentoAee(seq)) !== JSON.stringify(referenciaPlanejamentoAee(sequencia))) throw new Error("A sequência foi alterada durante o preenchimento. Confira sua versão atual antes de salvar. Nenhum texto do formulário foi apagado.");
    const registros = montarRegistrosColetivos(form, atuais.map((a) => ({ ...a.data(), id: a.id })), seq, usuario);
    transaction.set(ref, { referenciaPlanejamento: referenciaPlanejamentoAee(seq), versaoRegistroColetivo: 2, planejamentoColetivo: planejamentoColetivoAee(form), sequenciaId: seq?.id || "", sequenciaTitulo: seq?.titulo || "", encontroNumero: registros[0].encontroNumero, turmaAee: form.turmaAee, alunoIds: registros.map((r) => r.alunoId), dataAtendimento: form.dataAtendimento, responsavelId: usuario.uid, criadoEm: serverTimestamp() });
    registros.forEach((registro) => transaction.set(doc(db, "atendimentosAEE", `${coletivoId}_${registro.alunoId}`), { ...registro, coletivoId, semanaReferencia: obterSemanaReferenciaPorData(registro.dataAtendimento), criadoEm: serverTimestamp(), createdAt: serverTimestamp(), atualizadoEm: serverTimestamp(), updatedAt: serverTimestamp() }));
    return coletivoId;
  });
}

export async function atualizarIndividualColetivoAee(registro, presenca, observacoes, perfil) {
  escrita(perfil);
  if (!registro?.id || !registro.alunoId || !registro.coletivoId || !PRESENCAS_AEE.includes(presenca)) throw new Error("Registro individual inválido.");
  const ref = doc(db, "atendimentosAEE", registro.id);
  await runTransaction(db, async (transaction) => {
    const atual = await transaction.get(ref);
    if (!atual.exists() || atual.data().alunoId !== registro.alunoId || atual.data().coletivoId !== registro.coletivoId) throw new Error("O registro mudou. Atualize o histórico antes de editar.");
    if ((atual.data().statusPresenca || "") !== (registro.statusPresenca || "") || (atual.data().observacoes || "") !== (registro.observacoes || "")) throw new Error("Outro usuário alterou a chamada. Atualize o histórico antes de editar.");
    transaction.update(ref, { ...(atual.data().versaoRegistroColetivo === 2 && presenca !== "Presente" ? execucaoAusenteAee() : {}), statusPresenca: presenca, observacoes: String(observacoes || "").trim(), atualizadoEm: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}
