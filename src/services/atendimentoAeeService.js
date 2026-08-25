import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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

function normalizarHabilidadesSelecionadas(valor) {
  if (!Array.isArray(valor)) return [];
  return [...new Set(valor.map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizarAtendimento(data = {}) {
  const dataAtendimento = String(data.dataAtendimento || data.dataRegistro || "").trim();
  const criadoEm = data.criadoEm || data.createdAt || null;
  const atualizadoEm = data.atualizadoEm || data.updatedAt || criadoEm || null;

  return {
    ...data,
    alunoId: String(data.alunoId || data.alunoID || "").trim(),
    alunoNome: String(data.alunoNome || data.nomeAluno || "").trim(),
    dataAtendimento,
    semanaReferencia: String(
      data.semanaReferencia || (dataAtendimento ? obterSemanaISO(dataAtendimento) : "")
    ).trim(),
    mesReferencia: String(
      data.mesReferencia || (dataAtendimento ? obterMesPorData(dataAtendimento) : "")
    ).trim(),
    eixoTematico: String(data.eixoTematico || data.eixoObservado || data.eixo || "").trim(),
    habilidadesSelecionadas: normalizarHabilidadesSelecionadas(data.habilidadesSelecionadas),
    habilidadesComplementares: String(
      data.habilidadesComplementares || data.outrasHabilidades || ""
    ).trim(),
    dificuldadesObservadas: String(
      data.dificuldadesObservadas || data.dificuldades || ""
    ).trim(),
    avancosPercebidos: String(data.avancosPercebidos || data.avancos || "").trim(),
    observacoes: String(data.observacoes || data.observacao || "").trim(),
    encaminhamentos: String(data.encaminhamentos || data.encaminhamento || "").trim(),
    responsavelNome: String(data.responsavelNome || data.responsavelRegistro || "").trim(),
    responsavelEmail: String(data.responsavelEmail || data.emailResponsavel || "").trim(),
    criadoEm,
    atualizadoEm,
    createdAt: data.createdAt || criadoEm,
    updatedAt: data.updatedAt || atualizadoEm,
  };
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...normalizarAtendimento(item.data()),
  }));
}

function filtrarRegistrosNormalizados(registros, { mesReferencia, semanaReferencia } = {}) {
  let registrosFiltrados = ordenarPorDataDesc(registros);
  const mes = String(mesReferencia || "").trim();
  const semana = String(semanaReferencia || "").trim();

  if (mes) {
    registrosFiltrados = registrosFiltrados.filter(
      (item) => String(item.mesReferencia || "") === mes
    );
  }

  if (semana) {
    registrosFiltrados = registrosFiltrados.filter(
      (item) => String(item.semanaReferencia || "") === semana
    );
  }

  return registrosFiltrados;
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
  const alunoId = String(payload.alunoId || payload.alunoID || "").trim();
  if (!alunoId) {
    throw new Error("Registro de atendimento inválido: alunoId é obrigatório.");
  }

  const dataAtendimento = String(
    payload.dataAtendimento || payload.dataRegistro || dataAtualISO()
  ).trim();
  const semanaReferencia = String(payload.semanaReferencia || obterSemanaISO(dataAtendimento)).trim();
  const mesReferencia = String(payload.mesReferencia || obterMesPorData(dataAtendimento)).trim();
  const habilidadesSelecionadas = normalizarHabilidadesSelecionadas(payload.habilidadesSelecionadas);
  const modoAtendimento = normalizarModoAtendimento(payload);
  const tipoPadrao = tipoAtendimentoPorModo(modoAtendimento);
  const tipoInformado = String(payload.tipoAtendimento || "").trim();
  const tipoAtendimento =
    tipoInformado === "AEE" || tipoInformado === "REGULAR" ? tipoPadrao : tipoInformado || tipoPadrao;

  return {
    alunoId,
    alunoNome: String(payload.alunoNome || payload.nomeAluno || "").trim(),
    dataAtendimento,
    semanaReferencia,
    mesReferencia,
    modoAtendimento,
    statusPresenca: String(payload.statusPresenca || "").trim(),
    tipoAtendimento,
    eixoTematico: String(payload.eixoTematico || payload.eixoObservado || payload.eixo || "").trim(),
    habilidadesSelecionadas,
    habilidadesComplementares: String(
      payload.habilidadesComplementares || payload.outrasHabilidades || ""
    ).trim(),
    habilidadesTrabalhadas: String(payload.habilidadesTrabalhadas || "").trim(),
    dificuldadesObservadas: String(
      payload.dificuldadesObservadas || payload.dificuldades || ""
    ).trim(),
    avancosPercebidos: String(payload.avancosPercebidos || payload.avancos || "").trim(),
    observacoes: String(payload.observacoes || payload.observacao || "").trim(),
    encaminhamentos: String(payload.encaminhamentos || payload.encaminhamento || "").trim(),
    observacaoSala: String(payload.observacaoSala || "").trim(),
    interacao: String(payload.interacao || "").trim(),
    participacao: String(payload.participacao || "").trim(),
    comportamento: String(payload.comportamento || "").trim(),
    dificuldadesContextoAula: String(payload.dificuldadesContextoAula || "").trim(),
    apoioRecebido: String(payload.apoioRecebido || "").trim(),
    responsavelId: String(payload.responsavelId || "").trim(),
    responsavelNome: String(payload.responsavelNome || payload.responsavelRegistro || "").trim(),
    responsavelEmail: String(payload.responsavelEmail || payload.emailResponsavel || "").trim(),
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

  const atendimentosQuery = query(atendimentosCollection, where("alunoId", "==", alunoIdFinal));
  const snapshot = await getDocs(atendimentosQuery);
  return filtrarRegistrosNormalizados(mapSnapshot(snapshot), {
    mesReferencia,
    semanaReferencia,
  });
}

export async function listarAtendimentosAEEPorNome({
  alunoNome,
  alunoId,
  mesReferencia,
  semanaReferencia,
  alunoIdsPermitidos,
} = {}) {
  const alunoNomeFinal = String(alunoNome || "").trim();
  const alunoIdFinal = String(alunoId || "").trim();
  if (!alunoNomeFinal) return [];

  if (
    alunoIdFinal &&
    Array.isArray(alunoIdsPermitidos) &&
    !alunoIdsPermitidos.includes(alunoIdFinal)
  ) {
    return [];
  }

  const consultas = [
    query(atendimentosCollection, where("alunoNome", "==", alunoNomeFinal)),
    query(atendimentosCollection, where("nomeAluno", "==", alunoNomeFinal)),
  ];
  const snapshots = await Promise.all(consultas.map((consulta) => getDocs(consulta)));
  const registrosPorId = new Map();

  snapshots.forEach((snapshot) => {
    mapSnapshot(snapshot).forEach((registro) => registrosPorId.set(registro.id, registro));
  });

  return filtrarRegistrosNormalizados([...registrosPorId.values()], {
    mesReferencia,
    semanaReferencia,
  });
}

export async function criarAtendimentoAEE(payload) {
  const criadoEm = serverTimestamp();
  const atualizadoEm = serverTimestamp();
  const data = {
    ...normalizarPayload(payload),
    criadoEm,
    atualizadoEm,
    createdAt: criadoEm,
    updatedAt: atualizadoEm,
  };
  const result = await addDoc(atendimentosCollection, data);
  return result.id;
}

export async function atualizarAtendimentoAEE(atendimentoId, payload) {
  const atendimentoRef = doc(db, "atendimentosAEE", atendimentoId);
  const snapshot = await getDoc(atendimentoRef);
  const dataExistente = snapshot.exists() ? snapshot.data() : {};
  const criadoEm = dataExistente.criadoEm || dataExistente.createdAt || serverTimestamp();
  const atualizadoEm = serverTimestamp();

  await updateDoc(atendimentoRef, {
    ...normalizarPayload(payload),
    criadoEm,
    atualizadoEm,
    createdAt: dataExistente.createdAt || criadoEm,
    updatedAt: atualizadoEm,
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
