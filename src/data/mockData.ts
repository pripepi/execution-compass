export interface Recurso {
  id: string;
  nome: string;
  funcao: string;
  situacao: "Ativo" | "Inativo" | "Afastado";
  horasApontadas: number;
  horasPrevistas: number;
  pendencias: number;
}

export interface Tarefa {
  id: string;
  nome: string;
  codigo: string;
  recursoResponsavel: string;
  status: "Em andamento" | "Concluída" | "Pendente" | "Atrasada";
  horasPrevistas: number;
  horasApontadas: number;
  competencia: string;
  periodo: string;
  ultimoApontamento: string | null;
  atraso: boolean;
  semApontamento: boolean;
  recursos: Recurso[];
}

export interface Etapa {
  id: string;
  nome: string;
  status: "Em andamento" | "Concluída" | "Pendente" | "Não iniciada";
  periodo: string;
  quantidadeTarefas: number;
  quantidadeRecursos: number;
  progresso: number;
  pendencias: number;
  semApontamento: number;
  tarefas: Tarefa[];
}

export interface Contrato {
  id: string;
  empresa: string;
  cot: string;
  codigoMV: string;
  uo: string;
  competencia: string;
  etapaAtual: string;
  tarefasAndamento: number;
  tarefasSemApontamento: number;
  recursosEnvolvidos: number;
  status: "Em execução" | "Concluído" | "Suspenso" | "Em implantação";
  etapas: Etapa[];
}

const recursosMock: Recurso[] = [
  { id: "r1", nome: "Carlos Ferreira", funcao: "Técnico de Segurança", situacao: "Ativo", horasApontadas: 32, horasPrevistas: 40, pendencias: 0 },
  { id: "r2", nome: "Ana Oliveira", funcao: "Ergonomista", situacao: "Ativo", horasApontadas: 28, horasPrevistas: 40, pendencias: 2 },
  { id: "r3", nome: "Marcos Lima", funcao: "Enfermeiro do Trabalho", situacao: "Ativo", horasApontadas: 0, horasPrevistas: 20, pendencias: 1 },
  { id: "r4", nome: "Juliana Santos", funcao: "Técnica de Enfermagem", situacao: "Afastado", horasApontadas: 16, horasPrevistas: 40, pendencias: 0 },
  { id: "r5", nome: "Roberto Almeida", funcao: "Médico do Trabalho", situacao: "Ativo", horasApontadas: 40, horasPrevistas: 40, pendencias: 0 },
];

function makeTarefas(etapaId: string): Tarefa[] {
  const base: Tarefa[] = [
    {
      id: `${etapaId}-t1`, nome: "Inspeção de segurança", codigo: "TSG-001", recursoResponsavel: "Carlos Ferreira",
      status: "Em andamento", horasPrevistas: 20, horasApontadas: 14, competencia: "Mar/2026",
      periodo: "01/03 – 15/03", ultimoApontamento: "14/03/2026", atraso: false, semApontamento: false,
      recursos: [recursosMock[0]],
    },
    {
      id: `${etapaId}-t2`, nome: "Avaliação ergonômica", codigo: "ERG-003", recursoResponsavel: "Ana Oliveira",
      status: "Pendente", horasPrevistas: 16, horasApontadas: 0, competencia: "Mar/2026",
      periodo: "10/03 – 20/03", ultimoApontamento: null, atraso: true, semApontamento: true,
      recursos: [recursosMock[1]],
    },
    {
      id: `${etapaId}-t3`, nome: "Exames periódicos", codigo: "SAU-012", recursoResponsavel: "Marcos Lima",
      status: "Atrasada", horasPrevistas: 12, horasApontadas: 0, competencia: "Mar/2026",
      periodo: "05/03 – 12/03", ultimoApontamento: null, atraso: true, semApontamento: true,
      recursos: [recursosMock[2]],
    },
    {
      id: `${etapaId}-t4`, nome: "Treinamento NR-35", codigo: "TRN-007", recursoResponsavel: "Roberto Almeida",
      status: "Concluída", horasPrevistas: 8, horasApontadas: 8, competencia: "Mar/2026",
      periodo: "01/03 – 03/03", ultimoApontamento: "03/03/2026", atraso: false, semApontamento: false,
      recursos: [recursosMock[4]],
    },
  ];
  return base;
}

export const contratosMock: Contrato[] = [
  {
    id: "c1", empresa: "Empresa Alpha", cot: "#1024", codigoMV: "MV-2026-001", uo: "UO Porto Alegre",
    competencia: "Mar/2026", etapaAtual: "Execução Operacional", tarefasAndamento: 3,
    tarefasSemApontamento: 2, recursosEnvolvidos: 5, status: "Em execução",
    etapas: [
      {
        id: "e1", nome: "Planejamento Inicial", status: "Concluída", periodo: "01/01 – 31/01/2026",
        quantidadeTarefas: 4, quantidadeRecursos: 3, progresso: 100, pendencias: 0, semApontamento: 0,
        tarefas: makeTarefas("e1"),
      },
      {
        id: "e2", nome: "Execução Operacional", status: "Em andamento", periodo: "01/02 – 30/06/2026",
        quantidadeTarefas: 4, quantidadeRecursos: 5, progresso: 45, pendencias: 3, semApontamento: 2,
        tarefas: makeTarefas("e2"),
      },
      {
        id: "e3", nome: "Encerramento e Relatório", status: "Não iniciada", periodo: "01/07 – 31/07/2026",
        quantidadeTarefas: 2, quantidadeRecursos: 2, progresso: 0, pendencias: 0, semApontamento: 0,
        tarefas: makeTarefas("e3"),
      },
    ],
  },
  {
    id: "c2", empresa: "Empresa Beta", cot: "#1031", codigoMV: "MV-2026-005", uo: "UO Caxias do Sul",
    competencia: "Mar/2026", etapaAtual: "Mobilização de Equipe", tarefasAndamento: 2,
    tarefasSemApontamento: 1, recursosEnvolvidos: 3, status: "Em execução",
    etapas: [
      {
        id: "e4", nome: "Mobilização de Equipe", status: "Em andamento", periodo: "01/02 – 28/02/2026",
        quantidadeTarefas: 3, quantidadeRecursos: 3, progresso: 60, pendencias: 1, semApontamento: 1,
        tarefas: makeTarefas("e4"),
      },
    ],
  },
  {
    id: "c3", empresa: "Empresa Gamma", cot: "#1018", codigoMV: "MV-2026-003", uo: "UO Porto Alegre",
    competencia: "Mar/2026", etapaAtual: "Execução Técnica", tarefasAndamento: 1,
    tarefasSemApontamento: 0, recursosEnvolvidos: 2, status: "Em execução",
    etapas: [
      {
        id: "e5", nome: "Execução Técnica", status: "Em andamento", periodo: "01/03 – 30/09/2026",
        quantidadeTarefas: 4, quantidadeRecursos: 2, progresso: 25, pendencias: 0, semApontamento: 0,
        tarefas: makeTarefas("e5"),
      },
    ],
  },
  {
    id: "c4", empresa: "Empresa Delta", cot: "#1042", codigoMV: "MV-2026-008", uo: "UO Canoas",
    competencia: "Mar/2026", etapaAtual: "Implantação", tarefasAndamento: 1,
    tarefasSemApontamento: 3, recursosEnvolvidos: 4, status: "Em implantação",
    etapas: [
      {
        id: "e6", nome: "Implantação", status: "Em andamento", periodo: "01/04 – 31/12/2026",
        quantidadeTarefas: 4, quantidadeRecursos: 4, progresso: 10, pendencias: 2, semApontamento: 3,
        tarefas: makeTarefas("e6"),
      },
    ],
  },
  {
    id: "c5", empresa: "Empresa Epsilon", cot: "#1055", codigoMV: "MV-2026-012", uo: "UO Novo Hamburgo",
    competencia: "Mar/2026", etapaAtual: "Acompanhamento Contínuo", tarefasAndamento: 4,
    tarefasSemApontamento: 1, recursosEnvolvidos: 3, status: "Em execução",
    etapas: [
      {
        id: "e7", nome: "Acompanhamento Contínuo", status: "Em andamento", periodo: "01/01 – 30/06/2026",
        quantidadeTarefas: 4, quantidadeRecursos: 3, progresso: 70, pendencias: 1, semApontamento: 1,
        tarefas: makeTarefas("e7"),
      },
    ],
  },
];
