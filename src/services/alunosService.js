import {
  addDoc,
  collection,
  deleteDoc,
  documentId,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  analisarAtualizacaoCadastros,
  criarAssinaturaCadastro,
  sugerirSerieAno,
  sugerirTurmaPadronizada,
} from "../utils/cadastroNormalization";

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

const CAMPOS_ATUALIZACAO_INTELIGENTE = new Set(["turma", "serieAno", "turno"]);

function limparTexto(valor) {
  return String(valor ?? "").trim();
}

function agruparAlteracoesPorAluno(alteracoes = []) {
  const grupos = new Map();

  alteracoes.forEach((alteracao) => {
    if (
      !alteracao?.alunoId ||
      alteracao.status !== "Aprovado" ||
      !CAMPOS_ATUALIZACAO_INTELIGENTE.has(alteracao.campo)
    ) {
      return;
    }

    if (!grupos.has(alteracao.alunoId)) {
      grupos.set(alteracao.alunoId, []);
    }

    grupos.get(alteracao.alunoId).push(alteracao);
  });

  return grupos;
}

async function listarTodosAlunosParaAuditoria() {
  const snapshot = await getDocs(alunosCollection);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function criarResultado(alunoId, alunoNome, status, motivo, camposAlterados = []) {
  return { alunoId, alunoNome, status, motivo, camposAlterados };
}

async function processarAtualizacaoDoAluno({ alunoId, alteracoesDoAluno }) {
  const alunoNome = alteracoesDoAluno[0]?.alunoNome || "Aluno não identificado";
  const assinaturaPrevia = alteracoesDoAluno[0]?.assinaturaPrevia;

  try {
    return await runTransaction(db, async (transaction) => {
      const alunoRef = doc(db, "alunos", alunoId);
      const snapshot = await transaction.get(alunoRef);

      if (!snapshot.exists()) {
        return criarResultado(alunoId, alunoNome, "erro", "Registro não encontrado.");
      }

      const alunoAtual = snapshot.data();
      if (!assinaturaPrevia || criarAssinaturaCadastro(alunoAtual) !== assinaturaPrevia) {
        return criarResultado(
          alunoId,
          alunoNome,
          "revisao",
          "Necessita nova revisão: o cadastro foi alterado após a geração da prévia."
        );
      }

      const atualizacao = {};
      const alteracoesPorCampo = new Map(
        alteracoesDoAluno.map((alteracao) => [alteracao.campo, alteracao])
      );

      const sugestaoTurma = alteracoesPorCampo.get("turma");
      if (sugestaoTurma) {
        const turmaAtual = limparTexto(alunoAtual.turma);
        const serieAtual = limparTexto(alunoAtual.serieAno);
        const turmaSegura = sugerirTurmaPadronizada(turmaAtual, serieAtual);

        if (
          turmaAtual === limparTexto(sugestaoTurma.valorAtual) &&
          turmaSegura === limparTexto(sugestaoTurma.valorSugerido)
        ) {
          atualizacao.turma = turmaSegura;
        }
      }

      const turmaProjetada = atualizacao.turma || limparTexto(alunoAtual.turma);
      const sugestaoSerie = alteracoesPorCampo.get("serieAno");
      if (sugestaoSerie && !limparTexto(alunoAtual.serieAno)) {
        const serieSegura = sugerirSerieAno(turmaProjetada);

        if (serieSegura === limparTexto(sugestaoSerie.valorSugerido)) {
          atualizacao.serieAno = serieSegura;
        }
      }

      const sugestaoTurno = alteracoesPorCampo.get("turno");
      const turmaNormalizadaParaValidacao =
        sugerirTurmaPadronizada(turmaProjetada, limparTexto(alunoAtual.serieAno)) ||
        turmaProjetada;
      if (
        sugestaoTurno &&
        !limparTexto(alunoAtual.turno) &&
        turmaNormalizadaParaValidacao === "EJA Noturno" &&
        limparTexto(sugestaoTurno.valorSugerido) === "Noturno"
      ) {
        atualizacao.turno = "Noturno";
      }

      const camposAlterados = Object.keys(atualizacao);
      if (camposAlterados.length === 0) {
        return criarResultado(
          alunoId,
          alunoNome,
          "ignorado",
          "O cadastro já está correto ou a sugestão deixou de ser aplicável."
        );
      }

      transaction.update(alunoRef, atualizacao);
      return criarResultado(
        alunoId,
        alunoNome,
        "atualizado",
        "Atualização concluída.",
        camposAlterados
      );
    });
  } catch (error) {
    console.error("[alunosService] Falha na atualização inteligente", alunoId, error);
    return criarResultado(
      alunoId,
      alunoNome,
      "erro",
      error?.message || "Erro não identificado durante a atualização."
    );
  }
}

export async function aplicarAtualizacoesInteligentesCadastros(alteracoes = []) {
  const grupos = agruparAlteracoesPorAluno(alteracoes);
  const entradas = [...grupos.entries()].map(([alunoId, alteracoesDoAluno]) => ({
    alunoId,
    alteracoesDoAluno,
  }));

  if (entradas.length === 0) {
    return {
      totalAlunosAnalisados: 0,
      registrosAtualizados: 0,
      registrosIgnorados: 0,
      registrosRevisao: 0,
      quantidadeErros: 0,
      resultados: [],
      auditoriaFinal: null,
    };
  }

  const leituraAntesDaExecucao = await listarTodosAlunosParaAuditoria();
  const alunosPorId = new Map(leituraAntesDaExecucao.map((aluno) => [aluno.id, aluno]));
  const resultados = [];

  for (const entrada of entradas) {
    const alunoLido = alunosPorId.get(entrada.alunoId);
    const alunoNome = entrada.alteracoesDoAluno[0]?.alunoNome || "Aluno não identificado";
    const assinaturaPrevia = entrada.alteracoesDoAluno[0]?.assinaturaPrevia;

    if (!alunoLido) {
      resultados.push(criarResultado(entrada.alunoId, alunoNome, "erro", "Registro não encontrado."));
      continue;
    }

    if (!assinaturaPrevia || criarAssinaturaCadastro(alunoLido) !== assinaturaPrevia) {
      resultados.push(
        criarResultado(
          entrada.alunoId,
          alunoNome,
          "revisao",
          "Necessita nova revisão: o cadastro foi alterado após a geração da prévia."
        )
      );
      continue;
    }

    resultados.push(await processarAtualizacaoDoAluno(entrada));
  }

  let auditoriaFinal = null;
  let erroAuditoriaFinal = "";

  try {
    const alunosDepoisDaExecucao = await listarTodosAlunosParaAuditoria();
    const analiseFinal = analisarAtualizacaoCadastros(alunosDepoisDaExecucao);
    const turmasPadronizadas = alunosDepoisDaExecucao.filter((aluno) => {
      const turma = limparTexto(aluno.turma);
      return Boolean(turma) && sugerirTurmaPadronizada(turma, aluno.serieAno) === turma;
    }).length;

    auditoriaFinal = {
      totalAlunos: alunosDepoisDaExecucao.length,
      serieAnoPreenchido: alunosDepoisDaExecucao.filter((aluno) => limparTexto(aluno.serieAno)).length,
      turmasPadronizadas,
      semTurno: alunosDepoisDaExecucao.filter((aluno) => !limparTexto(aluno.turno)).length,
      revisaoManual: analiseFinal.registrosEdicaoManual,
    };
  } catch (error) {
    console.error("[alunosService] Falha na auditoria posterior à atualização", error);
    erroAuditoriaFinal = "Não foi possível executar a auditoria automática posterior.";
  }

  return {
    totalAlunosAnalisados: leituraAntesDaExecucao.length,
    registrosAtualizados: resultados.filter((item) => item.status === "atualizado").length,
    registrosIgnorados: resultados.filter((item) => item.status === "ignorado").length,
    registrosRevisao: resultados.filter((item) => item.status === "revisao").length,
    quantidadeErros: resultados.filter((item) => item.status === "erro").length,
    resultados,
    auditoriaFinal,
    erroAuditoriaFinal,
  };
}
