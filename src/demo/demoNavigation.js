import {
  BookOpen,
  ClipboardList,
  ClipboardPen,
  FileBarChart,
  FileText,
  Home,
  LayoutDashboard,
  LineChart,
  MessagesSquare,
  NotebookPen,
  Target,
  UserRound,
} from "lucide-react";

export const SECOES_DEMONSTRACAO = [
  {
    titulo: "GERAL",
    itens: [
      {
        label: "Início",
        path: "/demonstracao",
        icon: Home,
        descricao: "Visão geral do percurso pedagógico demonstrativo.",
      },
      {
        label: "Aluno",
        tituloPagina: "Cadastro de Alunos",
        path: "/demonstracao/aluno",
        icon: UserRound,
        dataKey: "aluno",
        descricao: "Visualização dos dados escolares, pessoais e educacionais do estudante fictício.",
      },
    ],
  },
  {
    titulo: "DIAGNÓSTICO",
    itens: [
      {
        label: "Sondagem",
        tituloPagina: "Sondagem Diagnóstica",
        path: "/demonstracao/sondagem",
        icon: ClipboardList,
        dataKey: "sondagem",
        descricao: "Avaliação pedagógica organizada por eixos e consolidada em síntese diagnóstica.",
      },
      {
        label: "Estudo de Caso",
        path: "/demonstracao/estudo-de-caso",
        icon: FileText,
        dataKey: "estudoCaso",
        descricao: "Organização demonstrativa da investigação pedagógica.",
      },
    ],
  },
  {
    titulo: "PLANEJAMENTO",
    itens: [
      {
        label: "Habilidades",
        tituloPagina: "Habilidades pedagógicas",
        path: "/demonstracao/habilidades",
        icon: Target,
        dataKey: "habilidades",
        descricao: "Acompanhamento por aluno com organização por bimestre e eixo temático.",
      },
      {
        label: "PAEE",
        tituloPagina: "PAEE — Plano de Atendimento Educacional Especializado",
        path: "/demonstracao/paee",
        icon: BookOpen,
        dataKey: "paee",
        descricao: "Planejamento do atendimento especializado fundamentado no Estudo de Caso.",
      },
      {
        label: "PEI",
        tituloPagina: "PEI — Plano de Ensino Individualizado",
        path: "/demonstracao/pei",
        icon: NotebookPen,
        dataKey: "pei",
        descricao: "Planejamento curricular individualizado articulado às necessidades e aos apoios.",
      },
    ],
  },
  {
    titulo: "INTERVENÇÃO",
    itens: [
      {
        label: "Atendimento AEE",
        path: "/demonstracao/atendimento-aee",
        icon: ClipboardPen,
        dataKey: "atendimentosAee",
        descricao: "Organização visual dos atendimentos pedagógicos fictícios.",
      },
      {
        label: "Acompanhamento",
        path: "/demonstracao/acompanhamento",
        icon: MessagesSquare,
        dataKey: "acompanhamentos",
        descricao: "Estrutura de acompanhamento contínuo do percurso.",
      },
    ],
  },
  {
    titulo: "AVALIAÇÃO E ANÁLISE",
    itens: [
      {
        label: "Monitoramento",
        tituloPagina: "Painel de Evolução Pedagógica",
        path: "/demonstracao/monitoramento",
        icon: LineChart,
        dataKey: "monitoramento",
        descricao: "Visualização integrada da evolução do aluno a partir dos registros do Atendimento AEE.",
      },
      {
        label: "Relatórios",
        tituloPagina: "Relatório Pedagógico do Aluno",
        path: "/demonstracao/relatorios",
        icon: FileBarChart,
        dataKey: "relatorios",
        descricao: "Documento pedagógico organizado por identificação, contextualização, desenvolvimento e parecer final.",
      },
    ],
  },
  {
    titulo: "GESTÃO",
    itens: [
      {
        label: "Painel da Coordenação",
        path: "/demonstracao/painel-coordenacao",
        icon: LayoutDashboard,
        dataKey: "indicadoresCoordenacao",
        descricao: "Visão institucional para acompanhamento pedagógico dos estudantes da Educação Especial.",
      },
    ],
  },
];

export const MODULOS_DEMONSTRACAO = SECOES_DEMONSTRACAO.flatMap((secao) =>
  secao.itens.map((item) => ({ ...item, secao: secao.titulo }))
);
