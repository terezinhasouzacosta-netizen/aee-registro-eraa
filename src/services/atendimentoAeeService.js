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

export const STATUS_PRESENCA_OPCOES = ["Presente", "Ausente", "Falta justificada"];

export const TIPO_ATENDIMENTO_OPCOES = [
  "Atendimento na Sala AEE",
  "Acompanhamento na Sala Regular",
];

export const EIXOS_TEMATICOS_OPCOES = [
  "Leitura e escrita",
  "Comunicação oral",
  "Matemática funcional",
  "Atenção e concentração",
  "Interação social",
  "Autonomia nas atividades",
  "Comportamento e autorregulação",
  "Outro",
];

const atendimentosCollection = collection(db, "atendimentosAEE");

function dataAtualISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = `${hoje.getMonth() + 1}`.padStart(2, "0");
  const dia = `${hoje.getDate()}`.padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function mesAtualISO() {
  return dataAtualISO().slice(0, 7);
}

function obterMesPorData(dataIso) {
  const data = String(dataIso || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data.slice(0, 7);
  return mesAtualISO();
}

function obterSemanaISO(dataIso) {
  const data = new Date(`${dataIso}T12:00:00`);
  if (Number.isNaN(data.getTime())) return "";

  const dataUtc = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  const diaSemana = dataUtc.getUTCDay() || 7;
  dataUtc.setUTCDate(dataUtc.getUTCDate() + 4 - diaSemana);

  const anoInicio = new Date(Date.UTC(dataUtc.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((dataUtc - anoInicio) / 86400000 + 1) / 7);
  return `${dataUtc.getUTCFullYear()}-S${String(semana).padStart(2, "0")}`;
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

function normalizarModoAtendimento({ modoAtendimento, tipoAtendimento } = {}) {
  const modo = String(modoAtendimento || "")
    .trim()
    .toUpperCase();
  if (modo === "AEE" || modo === "REGULAR") return modo;

  const tipo = String(tipoAtendimento || "")
    .trim()
    .toLowerCase();
  if (tipo === "regular" || tipo.includes("sala regular")) return "REGULAR";
  if (tipo === "aee" || tipo.includes("sala aee")) return "AEE";
  return "AEE";
}

function tipoAtendimentoPorModo(modoAtendimento) {
  return modoAtendimento === "REGULAR"
    ? "Acompanhamento na Sala Regular"
    : "Atendimento na Sala AEE";
}

function ordenarPorDataDesc(lista) {
  return [...lista].sort((a, b) => {
    const dataA = String(a?.dataAtendimento || "");
    const dataB = String(b?.dataAtendimento || "");
    if (dataA !== dataB) return dataA < dataB ? 1 : -1;

    const createdA = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const createdB = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return createdB - createdA;
  });
}

function normalizarPayload(payload = {}) {
  const alunoId = String(payload.alunoId || "").trim();
  if (!alunoId) {
    throw new Error("Registro de atendimento inválido: alunoId é obrigatório.");
  }

  const dataAtendimento = String(payload.dataAtendimento || dataAtualISO()).trim();
  const semanaReferencia = String(payload.semanaReferencia || obterSemanaISO(dataAtendimento)).trim();
  const mesReferencia = String(payload.mesReferencia || obterMesPorData(dataAtendimento)).trim();
  const habilidadesSelecionadas = Array.isArray(payload.habilidadesSelecionadas)
    ? [...new Set(payload.habilidadesSelecionadas.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];
  const modoAtendimento = normalizarModoAtendimento(payload);
  const tipoPadrao = tipoAtendimentoPorModo(modoAtendimento);
  const tipoInformado = String(payload.tipoAtendimento || "").trim();
  const tipoAtendimento =
    tipoInformado === "AEE" || tipoInformado === "REGULAR" ? tipoPadrao : tipoInformado || tipoPadrao;

  return {
    alunoId,
    alunoNome: String(payload.alunoNome || "").trim(),
    dataAtendimento,
    semanaReferencia,
    mesReferencia,
    modoAtendimento,
    statusPresenca: String(payload.statusPresenca || "").trim(),
    tipoAtendimento,
    eixoTematico: String(payload.eixoTematico || "").trim(),
    habilidadesSelecionadas,
    habilidadesComplementares: String(payload.habilidadesComplementares || "").trim(),
    habilidadesTrabalhadas: String(payload.habilidadesTrabalhadas || "").trim(),
    dificuldadesObservadas: String(payload.dificuldadesObservadas || "").trim(),
    avancosPercebidos: String(payload.avancosPercebidos || "").trim(),
    observacoes: String(payload.observacoes || "").trim(),
    observacaoSala: String(payload.observacaoSala || "").trim(),
    interacao: String(payload.interacao || "").trim(),
    participacao: String(payload.participacao || "").trim(),
    comportamento: String(payload.comportamento || "").trim(),
    dificuldadesContextoAula: String(payload.dificuldadesContextoAula || "").trim(),
    apoioRecebido: String(payload.apoioRecebido || "").trim(),
    responsavelId: String(payload.responsavelId || "").trim(),
    responsavelNome: String(payload.responsavelNome || "").trim(),
  };
}

export function obterSemanaReferenciaPorData(dataAtendimento) {
  return obterSemanaISO(dataAtendimento);
}

export async function listarAtendimentosAEE({
  alunoId,
  mesReferencia,
  semanaReferencia,
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

  const constraints = [where("alunoId", "==", alunoIdFinal)];
  if (mesReferencia) constraints.push(where("mesReferencia", "==", mesReferencia));

  const atendimentosQuery = query(atendimentosCollection, ...constraints);
  const snapshot = await getDocs(atendimentosQuery);
  let registros = ordenarPorDataDesc(mapSnapshot(snapshot));

  if (semanaReferencia) {
    const semana = String(semanaReferencia).trim();
    registros = registros.filter((item) => String(item.semanaReferencia || "") === semana);
  }

  return registros;
}

export async function criarAtendimentoAEE(payload) {
  const data = {
    ...normalizarPayload(payload),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const result = await addDoc(atendimentosCollection, data);
  return result.id;
}

export async function atualizarAtendimentoAEE(atendimentoId, payload) {
  const atendimentoRef = doc(db, "atendimentosAEE", atendimentoId);
  await updateDoc(atendimentoRef, {
    ...normalizarPayload(payload),
    updatedAt: serverTimestamp(),
  });
}

export async function excluirAtendimentoAEE(atendimentoId) {
  const atendimentoRef = doc(db, "atendimentosAEE", atendimentoId);
  await deleteDoc(atendimentoRef);
}

function topItens(lista = [], limite = 3) {
  const mapa = new Map();
  lista
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .forEach((item) => {
      mapa.set(item, (mapa.get(item) || 0) + 1);
    });

  return [...mapa.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([nome]) => nome);
}

export async function gerarSinteseMensalAtendimento({
  alunoId,
  mesReferencia,
  alunoIdsPermitidos,
} = {}) {
  const registros = await listarAtendimentosAEE({
    alunoId,
    mesReferencia,
    alunoIdsPermitidos,
  });

  if (!registros.length) {
    return {
      totalRegistros: 0,
      texto:
        "Não há registros de Atendimento AEE para o mês selecionado. Recomenda-se registrar os atendimentos semanais para compor a síntese mensal.",
      dadosResumo: {
        presenca: {},
        tiposAtendimento: {},
        eixosPrincipais: [],
      },
    };
  }

  const contagemPresenca = registros.reduce((acc, item) => {
    const chave = item.statusPresenca || "Não informado";
    acc[chave] = (acc[chave] || 0) + 1;
    return acc;
  }, {});

  const contagemTipo = registros.reduce((acc, item) => {
    const modo = normalizarModoAtendimento(item);
    const chave = tipoAtendimentoPorModo(modo);
    acc[chave] = (acc[chave] || 0) + 1;
    return acc;
  }, {});

  const eixosPrincipais = topItens(registros.map((item) => item.eixoTematico), 4);
  const avancosFrequentes = topItens(registros.map((item) => item.avancosPercebidos), 3);
  const dificuldadesFrequentes = topItens(registros.map((item) => item.dificuldadesObservadas), 3);

  const texto = [
    `No mês ${mesReferencia}, foram registrados ${registros.length} atendimentos de AEE para o aluno.`,
    `Frequência: Presente (${contagemPresenca.Presente || 0}), Ausente (${contagemPresenca.Ausente || 0}) e Falta justificada (${contagemPresenca["Falta justificada"] || 0}).`,
    `Distribuição por tipo de atendimento: Sala AEE (${contagemTipo["Atendimento na Sala AEE"] || 0}) e Sala Regular (${contagemTipo["Acompanhamento na Sala Regular"] || 0}).`,
    eixosPrincipais.length
      ? `Eixos mais trabalhados no período: ${eixosPrincipais.join(", ")}.`
      : "Não foram identificados eixos temáticos frequentes no período.",
    avancosFrequentes.length
      ? `Avanços percebidos com maior recorrência: ${avancosFrequentes.join("; ")}.`
      : "Não há avanços recorrentes registrados no período.",
    dificuldadesFrequentes.length
      ? `Dificuldades observadas com maior recorrência: ${dificuldadesFrequentes.join("; ")}.`
      : "Não há dificuldades recorrentes registradas no período.",
  ].join(" ");

  return {
    totalRegistros: registros.length,
    texto,
    dadosResumo: {
      presenca: contagemPresenca,
      tiposAtendimento: contagemTipo,
      eixosPrincipais,
      avancosFrequentes,
      dificuldadesFrequentes,
    },
  };
}
