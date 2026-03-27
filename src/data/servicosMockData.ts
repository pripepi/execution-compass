// Mock data for Parametrização > Serviços

export interface Atividade {
  id: string;
  nome: string;
}

export interface EtapaCadastro {
  id: string;
  nome: string;
  atividades: Atividade[];
}

export interface ServicoParametro {
  id: string;
  codigo: string;
  nome: string;
  crUo: string;
  etapas: number;
  versao: string;
  status: "Ativo" | "Rascunho" | "Inativo";
}

// Etapas e Atividades cadastradas previamente
export const etapasCadastro: EtapaCadastro[] = [
  {
    id: "ec1",
    nome: "Planejamento Inicial",
    atividades: [
      { id: "a1", nome: "Levantamento de requisitos" },
      { id: "a2", nome: "Definição de escopo" },
      { id: "a3", nome: "Elaboração de cronograma" },
    ],
  },
  {
    id: "ec2",
    nome: "Mobilização de Equipe",
    atividades: [
      { id: "a4", nome: "Seleção de profissionais" },
      { id: "a5", nome: "Treinamento inicial" },
      { id: "a6", nome: "Alocação de recursos" },
    ],
  },
  {
    id: "ec3",
    nome: "Execução Operacional",
    atividades: [
      { id: "a7", nome: "Inspeção de segurança" },
      { id: "a8", nome: "Avaliação ergonômica" },
      { id: "a9", nome: "Monitoramento ambiental" },
      { id: "a10", nome: "Coleta de dados" },
    ],
  },
  {
    id: "ec4",
    nome: "Execução Técnica",
    atividades: [
      { id: "a11", nome: "Análise de riscos" },
      { id: "a12", nome: "Elaboração de laudos" },
      { id: "a13", nome: "Medições técnicas" },
    ],
  },
  {
    id: "ec5",
    nome: "Encerramento e Relatório",
    atividades: [
      { id: "a14", nome: "Consolidação de dados" },
      { id: "a15", nome: "Elaboração de relatório final" },
      { id: "a16", nome: "Apresentação de resultados" },
    ],
  },
  {
    id: "ec6",
    nome: "Acompanhamento Contínuo",
    atividades: [
      { id: "a17", nome: "Monitoramento periódico" },
      { id: "a18", nome: "Atualização de indicadores" },
      { id: "a19", nome: "Reuniões de acompanhamento" },
    ],
  },
];

// Serviços para listagem
export const servicosList: string[] = [
  "Engenharia de Segurança do Trabalho",
  "Higiene Ocupacional",
  "Consultoria SST",
  "Medicina do Trabalho",
];

export const servicosParametrosMock: ServicoParametro[] = [
  {
    id: "sp1",
    codigo: "SST-001",
    nome: "Engenharia de Segurança do Trabalho",
    crUo: "CR 100 · UO Porto Alegre",
    etapas: 3,
    versao: "v3",
    status: "Ativo",
  },
  {
    id: "sp2",
    codigo: "HO-002",
    nome: "Higiene Ocupacional",
    crUo: "CR 200 · UO Caxias do Sul",
    etapas: 2,
    versao: "v2",
    status: "Ativo",
  },
  {
    id: "sp3",
    codigo: "CSST-003",
    nome: "Consultoria SST",
    crUo: "CR 100 · UO Porto Alegre",
    etapas: 2,
    versao: "v1",
    status: "Ativo",
  },
  {
    id: "sp4",
    codigo: "MT-004",
    nome: "Medicina do Trabalho",
    crUo: "CR 300 · UO Canoas",
    etapas: 1,
    versao: "v1",
    status: "Rascunho",
  },
];
