// ============================================================
// Dados mockados centralizados — Gestão de Recursos Operacionais
// Cadeia: Serviço → Entrega → Atividade → Cargo permitido → Contrato → Pessoa → Alocação → Execução
// Hierarquia estrita 1:N: Serviço → Entregas → Atividades (sem reutilização)
// ============================================================

// --- Unidades Operacionais ---
export const UOS = [
  { id: "uo-1", name: "UO Porto Alegre" },
  { id: "uo-2", name: "UO Caxias do Sul" },
  { id: "uo-3", name: "UO Canoas" },
  { id: "uo-4", name: "UO Novo Hamburgo" },
  { id: "uo-5", name: "UO Gravataí" },
];

export const CRS = [
  { id: "cr-1", code: "CR 100", uo: "uo-1" },
  { id: "cr-2", code: "CR 200", uo: "uo-2" },
  { id: "cr-3", code: "CR 300", uo: "uo-3" },
];

// --- Centros de Custo (vinculados a CR + UO) ---
export const CENTROS_CUSTO = [
  { id: "cc-1", code: "CC01", cr: "CR 100", uo: "UO Porto Alegre" },
  { id: "cc-2", code: "CC02", cr: "CR 100", uo: "UO Caxias do Sul" },
  { id: "cc-3", code: "CC03", cr: "CR 200", uo: "UO Caxias do Sul" },
  { id: "cc-4", code: "CC04", cr: "CR 200", uo: "UO Canoas" },
  { id: "cc-5", code: "CC05", cr: "CR 300", uo: "UO Canoas" },
  { id: "cc-6", code: "CC06", cr: "CR 300", uo: "UO Porto Alegre" },
  { id: "cc-7", code: "CC07", cr: "CR 100", uo: "UO Novo Hamburgo" },
  { id: "cc-8", code: "CC08", cr: "CR 200", uo: "UO Gravataí" },
];

// --- Cargos (Cadastro mestre corporativo) ---
export interface Cargo {
  id: string;
  name: string;
  code: string;
  category: "engenharia" | "saude" | "tecnico" | "gestao";
  status: "ativo" | "inativo";
  createdAt: string;
  updatedAt: string;
}

export const CARGOS: Cargo[] = [
  { id: "cg-1", name: "Engenheiro de Segurança do Trabalho", code: "CG-ENG-SST", category: "engenharia", status: "ativo", createdAt: "01/01/2026", updatedAt: "01/01/2026" },
  { id: "cg-2", name: "Médico do Trabalho", code: "CG-MED-TRB", category: "saude", status: "ativo", createdAt: "01/01/2026", updatedAt: "01/01/2026" },
  { id: "cg-3", name: "Técnico de Segurança do Trabalho", code: "CG-TEC-SST", category: "tecnico", status: "ativo", createdAt: "01/01/2026", updatedAt: "01/01/2026" },
  { id: "cg-4", name: "Nutricionista Ocupacional", code: "CG-NUT-OCP", category: "saude", status: "ativo", createdAt: "01/01/2026", updatedAt: "15/02/2026" },
  { id: "cg-5", name: "Higienista Ocupacional", code: "CG-HIG-OCP", category: "engenharia", status: "ativo", createdAt: "01/01/2026", updatedAt: "01/01/2026" },
  { id: "cg-6", name: "Enfermeiro do Trabalho", code: "CG-ENF-TRB", category: "saude", status: "ativo", createdAt: "01/01/2026", updatedAt: "01/01/2026" },
  { id: "cg-7", name: "Auxiliar Administrativo SST", code: "CG-AUX-ADM", category: "gestao", status: "inativo", createdAt: "01/01/2026", updatedAt: "10/02/2026" },
];

// --- Contratos ---
export interface Contrato {
  id: string;
  code: string;
  cot: string;
  client: string;
  uo: string;
  services: string[]; // service IDs
  status: "ativo" | "encerrado" | "em_implantacao";
  startDate: string;
  endDate: string;
  hoursContracted: number;
}

export const CONTRATOS: Contrato[] = [
  { id: "ct-1", code: "#1024", cot: "COT-2026-001", client: "Empresa Alpha", uo: "uo-1", services: ["sv-1", "sv-3"], status: "ativo", startDate: "01/01/2026", endDate: "31/12/2026", hoursContracted: 480 },
  { id: "ct-2", code: "#1031", cot: "COT-2026-002", client: "Empresa Beta", uo: "uo-2", services: ["sv-2"], status: "ativo", startDate: "01/02/2026", endDate: "31/07/2026", hoursContracted: 320 },
  { id: "ct-3", code: "#1018", cot: "COT-2026-003", client: "Empresa Gamma", uo: "uo-1", services: ["sv-3"], status: "ativo", startDate: "01/03/2026", endDate: "30/09/2026", hoursContracted: 240 },
  { id: "ct-4", code: "#1042", cot: "COT-2026-004", client: "Empresa Delta", uo: "uo-3", services: ["sv-4"], status: "em_implantacao", startDate: "01/04/2026", endDate: "31/12/2026", hoursContracted: 160 },
  { id: "ct-5", code: "#1055", cot: "COT-2026-005", client: "Empresa Epsilon", uo: "uo-4", services: ["sv-1", "sv-2"], status: "ativo", startDate: "01/01/2026", endDate: "30/06/2026", hoursContracted: 600 },
];

// --- Horas Aplicáveis por Contrato (customização do Facilitador do Processo) ---
// O Facilitador herda a estrutura padrão (Serviço → Entrega → Atividade)
// mas pode definir as horas aplicáveis para cada atividade naquele contrato,
// sem alterar o padrão mestre corporativo mantido pela Gestão Corporativa (DR).
export interface ContratoAtividadeConfig {
  id: string;
  contratoId: string;
  atividadeId: string;
  horasAplicaveis: number; // horas definidas pelo facilitador para este contrato
  observacao?: string;
}

export const CONTRATO_ATIVIDADE_CONFIGS: ContratoAtividadeConfig[] = [
  // ct-1 (#1024) — sv-1 (Eng. SST)
  { id: "cac-1", contratoId: "ct-1", atividadeId: "at-1", horasAplicaveis: 3, observacao: "Reduzido — escopo menor neste contrato" },
  { id: "cac-2", contratoId: "ct-1", atividadeId: "at-2", horasAplicaveis: 1 },
  { id: "cac-3", contratoId: "ct-1", atividadeId: "at-3", horasAplicaveis: 3 },
  { id: "cac-4", contratoId: "ct-1", atividadeId: "at-4", horasAplicaveis: 2 },
  { id: "cac-5", contratoId: "ct-1", atividadeId: "at-5", horasAplicaveis: 4 },
  { id: "cac-6", contratoId: "ct-1", atividadeId: "at-6", horasAplicaveis: 4, observacao: "Relatório simplificado" },
  { id: "cac-7", contratoId: "ct-1", atividadeId: "at-7", horasAplicaveis: 2 },
  // ct-1 (#1024) — sv-3 (Consultoria SST)
  { id: "cac-8", contratoId: "ct-1", atividadeId: "at-11", horasAplicaveis: 3 },
  { id: "cac-9", contratoId: "ct-1", atividadeId: "at-12", horasAplicaveis: 4 },
  { id: "cac-10", contratoId: "ct-1", atividadeId: "at-13", horasAplicaveis: 2, observacao: "Entrega parcial" },
  // ct-2 (#1031) — sv-2 (Higiene Ocupacional)
  { id: "cac-11", contratoId: "ct-2", atividadeId: "at-8", horasAplicaveis: 5 },
  { id: "cac-12", contratoId: "ct-2", atividadeId: "at-9", horasAplicaveis: 4, observacao: "Sem análise de poeira" },
  { id: "cac-13", contratoId: "ct-2", atividadeId: "at-10", horasAplicaveis: 6 },
  // ct-5 (#1055) — sv-1 (Eng. SST) — sem customização (herda padrão)
];

/** Get horas aplicáveis for an activity in a contract. Falls back to padrão if not customized. */
export function getHorasAplicaveis(contratoId: string, atividadeId: string): { horas: number; customizado: boolean } {
  const config = CONTRATO_ATIVIDADE_CONFIGS.find(c => c.contratoId === contratoId && c.atividadeId === atividadeId);
  if (config) return { horas: config.horasAplicaveis, customizado: true };
  const atividade = ATIVIDADES.find(a => a.id === atividadeId);
  return { horas: atividade?.timeHours ?? 0, customizado: false };
}

/** Get config observation for an activity in a contract */
export function getConfigObservacao(contratoId: string, atividadeId: string): string | undefined {
  return CONTRATO_ATIVIDADE_CONFIGS.find(c => c.contratoId === contratoId && c.atividadeId === atividadeId)?.observacao;
}

/** Sum horas aplicáveis for a service in a contract */
export function getSumHorasAplicaveisServico(contratoId: string, servicoId: string): number {
  const entregas = getEntregasByServico(servicoId);
  let sum = 0;
  entregas.forEach(e => {
    getAtividadesByEntrega(e.id).forEach(a => {
      sum += getHorasAplicaveis(contratoId, a.id).horas;
    });
  });
  return sum;
}

/** Sum horas aplicáveis for an entrega in a contract */
export function getSumHorasAplicaveisEntrega(contratoId: string, entregaId: string): number {
  return getAtividadesByEntrega(entregaId).reduce((sum, a) => sum + getHorasAplicaveis(contratoId, a.id).horas, 0);
}

// --- Atividades (leaf — pertence a exatamente 1 entrega) ---
export interface Atividade {
  id: string;
  name: string;
  code: string;
  timeHours: number;
  entregaId: string; // belongs to exactly one entrega (1:N)
  cargosPermitidos: string[]; // cargo IDs allowed to execute this activity
  status: "ativa" | "rascunho" | "inativa";
}

export const ATIVIDADES: Atividade[] = [
  // Entregas do sv-1 (Engenharia SST)
  { id: "at-1", name: "Coleta de dados ambientais", code: "ATV-001", timeHours: 4, entregaId: "et-1", cargosPermitidos: ["cg-1", "cg-3"], status: "ativa" },
  { id: "at-2", name: "Reunião de alinhamento", code: "ATV-002", timeHours: 1, entregaId: "et-1", cargosPermitidos: ["cg-1", "cg-3", "cg-5"], status: "ativa" },
  { id: "at-3", name: "Inspeção de campo", code: "ATV-003", timeHours: 3, entregaId: "et-2", cargosPermitidos: ["cg-1", "cg-3"], status: "ativa" },
  { id: "at-4", name: "Deslocamento", code: "ATV-004", timeHours: 2, entregaId: "et-2", cargosPermitidos: ["cg-1", "cg-3", "cg-5"], status: "ativa" },
  { id: "at-5", name: "Análise de risco", code: "ATV-005", timeHours: 4, entregaId: "et-2", cargosPermitidos: ["cg-1", "cg-5"], status: "ativa" },
  { id: "at-6", name: "Elaboração de relatório final", code: "ATV-006", timeHours: 6, entregaId: "et-3", cargosPermitidos: ["cg-1"], status: "ativa" },
  { id: "at-7", name: "Revisão documental", code: "ATV-007", timeHours: 2, entregaId: "et-3", cargosPermitidos: ["cg-1", "cg-3"], status: "ativa" },
  // Entregas do sv-2 (Higiene Ocupacional)
  { id: "at-8", name: "Avaliação quantitativa", code: "ATV-008", timeHours: 5, entregaId: "et-4", cargosPermitidos: ["cg-5", "cg-1"], status: "ativa" },
  { id: "at-9", name: "Análise laboratorial", code: "ATV-009", timeHours: 5, entregaId: "et-4", cargosPermitidos: ["cg-5"], status: "ativa" },
  { id: "at-10", name: "Elaboração de laudo técnico", code: "ATV-010", timeHours: 6, entregaId: "et-5", cargosPermitidos: ["cg-5", "cg-1"], status: "ativa" },
  // Entregas do sv-3 (Consultoria SST)
  { id: "at-11", name: "Pesquisa normativa", code: "ATV-011", timeHours: 3, entregaId: "et-6", cargosPermitidos: ["cg-1", "cg-3"], status: "ativa" },
  { id: "at-12", name: "Diagnóstico preliminar", code: "ATV-012", timeHours: 4, entregaId: "et-6", cargosPermitidos: ["cg-1"], status: "ativa" },
  { id: "at-13", name: "Relatório consultivo", code: "ATV-013", timeHours: 3, entregaId: "et-7", cargosPermitidos: ["cg-1"], status: "ativa" },
  // Entregas do sv-4 (Treinamento NR-35)
  { id: "at-14", name: "Preparação de material didático", code: "ATV-014", timeHours: 3, entregaId: "et-8", cargosPermitidos: ["cg-3", "cg-1"], status: "rascunho" },
  { id: "at-15", name: "Aplicação de treinamento", code: "ATV-015", timeHours: 8, entregaId: "et-8", cargosPermitidos: ["cg-3"], status: "rascunho" },
  { id: "at-16", name: "Avaliação de resultados", code: "ATV-016", timeHours: 2, entregaId: "et-8", cargosPermitidos: [], status: "rascunho" }, // sem cargo — inconsistente
];

// --- Entregas (mid-level — pertence a exatamente 1 serviço) ---
export interface Entrega {
  id: string;
  name: string;
  code: string;
  servicoId: string; // belongs to exactly one service (1:N)
  status: "ativa" | "rascunho" | "inativa";
}

export const ENTREGAS: Entrega[] = [
  // sv-1: Engenharia de Segurança do Trabalho
  { id: "et-1", name: "Planejamento", code: "ETG-001", servicoId: "sv-1", status: "ativa" },
  { id: "et-2", name: "Execução Técnica", code: "ETG-002", servicoId: "sv-1", status: "ativa" },
  { id: "et-3", name: "Relatório e Fechamento", code: "ETG-003", servicoId: "sv-1", status: "ativa" },
  // sv-2: Higiene Ocupacional
  { id: "et-4", name: "Avaliação Ambiental", code: "ETG-004", servicoId: "sv-2", status: "ativa" },
  { id: "et-5", name: "Laudos Técnicos", code: "ETG-005", servicoId: "sv-2", status: "ativa" },
  // sv-3: Consultoria SST
  { id: "et-6", name: "Diagnóstico", code: "ETG-006", servicoId: "sv-3", status: "ativa" },
  { id: "et-7", name: "Entrega Consultiva", code: "ETG-007", servicoId: "sv-3", status: "ativa" },
  // sv-4: Treinamento NR-35
  { id: "et-8", name: "Capacitação", code: "ETG-008", servicoId: "sv-4", status: "rascunho" },
];

// --- Serviços (Parametrização — padrão global) ---
export interface Servico {
  id: string;
  name: string;
  code: string;
  cr: string;
  uo: string;
  totalHours: number;
  status: "ativo" | "rascunho" | "inativo";
  mobilityLimit: number;
  version: number;
  validFrom: string;
  validTo: string | null;
}

export const SERVICOS: Servico[] = [
  { id: "sv-1", name: "Engenharia de Segurança do Trabalho", code: "SST-001", cr: "CR 100", uo: "UO Porto Alegre", totalHours: 120, status: "ativo", mobilityLimit: 50, version: 3, validFrom: "01/01/2026", validTo: null },
  { id: "sv-2", name: "Higiene Ocupacional", code: "HO-002", cr: "CR 200", uo: "UO Caxias do Sul", totalHours: 80, status: "ativo", mobilityLimit: 50, version: 2, validFrom: "01/02/2026", validTo: null },
  { id: "sv-3", name: "Consultoria SST", code: "CSST-003", cr: "CR 100", uo: "UO Porto Alegre", totalHours: 60, status: "ativo", mobilityLimit: 80, version: 1, validFrom: "01/03/2026", validTo: null },
  { id: "sv-4", name: "Treinamento NR-35", code: "TR-004", cr: "CR 300", uo: "UO Canoas", totalHours: 40, status: "rascunho", mobilityLimit: 50, version: 1, validFrom: "01/04/2026", validTo: null },
];

// --- Catálogo de Serviços pré-cadastrados (para select no modal de criação) ---
export interface CatalogoServico {
  code: string;
  name: string;
}

export const CATALOGO_SERVICOS: CatalogoServico[] = [
  { code: "SST-001", name: "Engenharia de Segurança do Trabalho" },
  { code: "HO-002", name: "Higiene Ocupacional" },
  { code: "CSST-003", name: "Consultoria SST" },
  { code: "TR-004", name: "Treinamento NR-35" },
  { code: "MED-005", name: "Medicina Ocupacional" },
  { code: "ERG-006", name: "Ergonomia" },
  { code: "AMB-007", name: "Gestão Ambiental" },
  { code: "INC-008", name: "Proteção Contra Incêndio" },
  { code: "PSI-009", name: "Saúde Mental e Psicossocial" },
  { code: "AUD-010", name: "Auditoria de Conformidade" },
];

// --- Version History ---
export interface VersionHistoryEntry {
  id: string;
  entityType: "servico" | "entrega" | "atividade" | "cargo";
  entityId: string;
  version: number;
  date: string;
  author: string;
  changes: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

export const VERSION_HISTORY: VersionHistoryEntry[] = [
  { id: "vh-1", entityType: "servico", entityId: "sv-1", version: 3, date: "08/03/2026 14:20", author: "Ana BackOffice", changes: "Tempo total alterado de 100h para 120h", field: "totalHours", oldValue: "100h", newValue: "120h" },
  { id: "vh-2", entityType: "servico", entityId: "sv-1", version: 2, date: "15/02/2026 10:00", author: "Ana BackOffice", changes: "Adicionada entrega Relatório e Fechamento" },
  { id: "vh-3", entityType: "servico", entityId: "sv-1", version: 1, date: "01/01/2026 09:00", author: "Pedro Admin", changes: "Serviço criado" },
  { id: "vh-4", entityType: "servico", entityId: "sv-2", version: 2, date: "20/02/2026 11:30", author: "Ana BackOffice", changes: "Limite mobilidade alterado de 30km para 50km", field: "mobilityLimit", oldValue: "30km", newValue: "50km" },
  { id: "vh-5", entityType: "servico", entityId: "sv-2", version: 1, date: "01/02/2026 09:00", author: "Pedro Admin", changes: "Serviço criado" },
  { id: "vh-6", entityType: "atividade", entityId: "at-3", version: 2, date: "06/03/2026 09:00", author: "Ana BackOffice", changes: "Cargo Técnico de Segurança adicionado como permitido", field: "cargosPermitidos", oldValue: "CG-ENG-SST", newValue: "CG-ENG-SST, CG-TEC-SST" },
  { id: "vh-7", entityType: "atividade", entityId: "at-3", version: 1, date: "01/01/2026 09:00", author: "Pedro Admin", changes: "Atividade criada" },
  { id: "vh-8", entityType: "cargo", entityId: "cg-7", version: 2, date: "10/02/2026 14:00", author: "Ana BackOffice", changes: "Cargo inativado", field: "status", oldValue: "ativo", newValue: "inativo" },
  { id: "vh-9", entityType: "cargo", entityId: "cg-7", version: 1, date: "01/01/2026 09:00", author: "Pedro Admin", changes: "Cargo criado" },
];

// --- Computed helpers ---

/** Get entregas for a service (1:N) */
export function getEntregasByServico(servicoId: string): Entrega[] {
  return ENTREGAS.filter(e => e.servicoId === servicoId);
}

/** Get atividades for an entrega (1:N) */
export function getAtividadesByEntrega(entregaId: string): Atividade[] {
  return ATIVIDADES.filter(a => a.entregaId === entregaId);
}

/** Sum hours of all activities for a service */
export function getSumHoursForServico(servicoId: string): number {
  const entregas = getEntregasByServico(servicoId);
  let sum = 0;
  entregas.forEach(e => {
    getAtividadesByEntrega(e.id).forEach(a => { sum += a.timeHours; });
  });
  return sum;
}

/** Sum hours of activities for an entrega */
export function getSumHoursForEntrega(entregaId: string): number {
  return getAtividadesByEntrega(entregaId).reduce((sum, a) => sum + a.timeHours, 0);
}

/** Get the parent entrega for an atividade */
export function getEntregaForAtividade(atividadeId: string): Entrega | undefined {
  const atividade = ATIVIDADES.find(a => a.id === atividadeId);
  if (!atividade) return undefined;
  return ENTREGAS.find(e => e.id === atividade.entregaId);
}

/** Get the parent servico for an entrega */
export function getServicoForEntrega(entregaId: string): Servico | undefined {
  const entrega = ENTREGAS.find(e => e.id === entregaId);
  if (!entrega) return undefined;
  return SERVICOS.find(s => s.id === entrega.servicoId);
}

/** Get all cargos permitted across all activities of a service */
export function getCargosPermitidosByServico(servicoId: string): Cargo[] {
  const entregas = getEntregasByServico(servicoId);
  const cargoIds = new Set<string>();
  entregas.forEach(e => {
    getAtividadesByEntrega(e.id).forEach(a => {
      a.cargosPermitidos.forEach(cid => cargoIds.add(cid));
    });
  });
  return CARGOS.filter(c => cargoIds.has(c.id));
}

/** Get activities that have no cargo assigned (inconsistent) */
export function getAtividadesSemCargo(servicoId?: string): Atividade[] {
  const ativs = servicoId
    ? getEntregasByServico(servicoId).flatMap(e => getAtividadesByEntrega(e.id))
    : ATIVIDADES;
  return ativs.filter(a => a.cargosPermitidos.length === 0 && a.status !== "inativa");
}

/** Get version history for an entity */
export function getHistoryForEntity(entityType: "servico" | "entrega" | "atividade" | "cargo", entityId: string): VersionHistoryEntry[] {
  return VERSION_HISTORY.filter(h => h.entityType === entityType && h.entityId === entityId).sort((a, b) => b.version - a.version);
}

// --- Proficiências (lista mestre) ---
export const PROFICIENCIAS = [
  "Eng. Responsável",
  "Elaborador",
  "Médica Coordenadora",
  "Técnico Executor",
  "Profissional de Saúde",
  "Higienista",
  "Enfermeira SST",
  "Auditor Interno",
  "Instrutor NR",
];

// --- Recursos (Pessoas) ---
export interface Recurso {
  id: string;
  name: string;
  usuarioId: string;
  role: string;
  cargoId: string;
  uo: string;
  atribuicoes: string[];
  tipoProfissional: "proprio" | "terceiro";
  mobility: boolean;
  status: "ativo" | "inativo";
  hoursMonthly: number;
}




// --- Recursos (Pessoas) ---
export interface Recurso {
  id: string;
  name: string;
  usuarioId: string;
  role: string;
  cargoId: string;
  uo: string;
  atribuicoes: string[];
  tipoProfissional: "proprio" | "terceiro";
  mobility: boolean;
  status: "ativo" | "inativo";
  hoursMonthly: number;
}

export const RECURSOS: Recurso[] = [
  { id: "rc-1", name: "Carlos Silva", usuarioId: "usr-1", role: "Engenheiro de Segurança", cargoId: "cg-1", uo: "UO Porto Alegre", atribuicoes: ["Eng. Responsável", "Elaborador"], tipoProfissional: "proprio", mobility: true, status: "ativo", hoursMonthly: 160 },
  { id: "rc-2", name: "Ana Paula Souza", usuarioId: "usr-2", role: "Médica do Trabalho", cargoId: "cg-2", uo: "UO Caxias do Sul", atribuicoes: ["Médica Coordenadora"], tipoProfissional: "proprio", mobility: true, status: "ativo", hoursMonthly: 120 },
  { id: "rc-3", name: "João Pereira", usuarioId: "usr-3", role: "Técnico de Segurança", cargoId: "cg-3", uo: "UO Canoas", atribuicoes: ["Técnico Executor"], tipoProfissional: "proprio", mobility: false, status: "inativo", hoursMonthly: 160 },
  { id: "rc-4", name: "Maria Fernandes", usuarioId: "usr-4", role: "Nutricionista", cargoId: "cg-4", uo: "UO Porto Alegre", atribuicoes: ["Profissional de Saúde"], tipoProfissional: "terceiro", mobility: true, status: "ativo", hoursMonthly: 120 },
  { id: "rc-5", name: "Roberto Lima", usuarioId: "usr-5", role: "Higienista Ocupacional", cargoId: "cg-5", uo: "UO Porto Alegre", atribuicoes: ["Higienista"], tipoProfissional: "proprio", mobility: true, status: "ativo", hoursMonthly: 160 },
  { id: "rc-6", name: "Fernanda Costa", usuarioId: "usr-6", role: "Enfermeira do Trabalho", cargoId: "cg-6", uo: "UO Caxias do Sul", atribuicoes: ["Enfermeira SST"], tipoProfissional: "proprio", mobility: false, status: "ativo", hoursMonthly: 160 },
  { id: "rc-7", name: "Paulo Mendes", usuarioId: "usr-7", role: "Técnico de Segurança", cargoId: "cg-3", uo: "UO Porto Alegre", atribuicoes: ["Técnico Executor"], tipoProfissional: "proprio", mobility: true, status: "ativo", hoursMonthly: 160 },
  { id: "rc-8", name: "Luciana Rocha", usuarioId: "usr-8", role: "Engenheira de Segurança", cargoId: "cg-1", uo: "UO Canoas", atribuicoes: ["Eng. Responsável"], tipoProfissional: "proprio", mobility: true, status: "ativo", hoursMonthly: 160 },
  { id: "rc-9", name: "Marcos Oliveira", usuarioId: "usr-9", role: "Engenheiro de Segurança", cargoId: "cg-1", uo: "UO Caxias do Sul", atribuicoes: ["Eng. Responsável"], tipoProfissional: "proprio", mobility: true, status: "ativo", hoursMonthly: 160 },
  { id: "rc-10", name: "Patrícia Almeida", usuarioId: "usr-10", role: "Técnica de Segurança", cargoId: "cg-3", uo: "UO Caxias do Sul", atribuicoes: ["Técnico Executor", "Elaborador"], tipoProfissional: "proprio", mobility: false, status: "ativo", hoursMonthly: 160 },
  { id: "rc-11", name: "Rafael Santos", usuarioId: "usr-11", role: "Higienista Ocupacional", cargoId: "cg-5", uo: "UO Caxias do Sul", atribuicoes: ["Higienista"], tipoProfissional: "terceiro", mobility: true, status: "inativo", hoursMonthly: 140 },
  { id: "rc-12", name: "Camila Ribeiro", usuarioId: "usr-12", role: "Nutricionista Ocupacional", cargoId: "cg-4", uo: "UO Caxias do Sul", atribuicoes: ["Profissional de Saúde"], tipoProfissional: "proprio", mobility: false, status: "ativo", hoursMonthly: 120 },
  { id: "rc-13", name: "Diego Teixeira", usuarioId: "usr-13", role: "Técnico de Segurança", cargoId: "cg-3", uo: "UO Caxias do Sul", atribuicoes: ["Técnico Executor"], tipoProfissional: "terceiro", mobility: true, status: "ativo", hoursMonthly: 160 },
];

// --- Alocações ---
export interface Alocacao {
  id: string;
  contractCode: string;
  contractId: string;
  serviceId: string;
  service: string;
  resource: string;
  resourceId: string;
  cargoId: string;
  level: string;
  status: "alocado" | "pendente";
  hoursAllocated: number;
}

export const ALOCACOES: Alocacao[] = [
  { id: "al-1", contractCode: "#1024", contractId: "ct-1", serviceId: "sv-1", service: "Eng. Segurança do Trabalho", resource: "Carlos Silva", resourceId: "rc-1", cargoId: "cg-1", level: "Serviço", status: "alocado", hoursAllocated: 40 },
  { id: "al-2", contractCode: "#1031", contractId: "ct-2", serviceId: "sv-2", service: "Higiene Ocupacional", resource: "Roberto Lima", resourceId: "rc-5", cargoId: "cg-5", level: "Entrega", status: "alocado", hoursAllocated: 32 },
  { id: "al-3", contractCode: "#1018", contractId: "ct-3", serviceId: "sv-3", service: "Consultoria SST", resource: "—", resourceId: "", cargoId: "cg-1", level: "—", status: "pendente", hoursAllocated: 0 },
  { id: "al-4", contractCode: "#1042", contractId: "ct-4", serviceId: "sv-4", service: "Treinamento NR-35", resource: "—", resourceId: "", cargoId: "cg-3", level: "—", status: "pendente", hoursAllocated: 0 },
  { id: "al-5", contractCode: "#1055", contractId: "ct-5", serviceId: "sv-1", service: "Eng. Segurança do Trabalho", resource: "Luciana Rocha", resourceId: "rc-8", cargoId: "cg-1", level: "Serviço", status: "alocado", hoursAllocated: 40 },
  { id: "al-6", contractCode: "#1055", contractId: "ct-5", serviceId: "sv-2", service: "Higiene Ocupacional", resource: "—", resourceId: "", cargoId: "cg-5", level: "—", status: "pendente", hoursAllocated: 0 },
];

// --- Execuções (visão do Técnico — atividade pronta para realização) ---
export type ExecStatus = "planejada" | "em_realizacao" | "realizada_parcial" | "concluida" | "pendencia_apontamento" | "bloqueada_competencia";

export interface Execucao {
  id: string;
  // Contexto completo (chega pronto do Coordenador)
  atividadeId: string;
  atividadeName: string;
  atividadeCode: string;
  entregaName: string;
  servicoName: string;
  servicoCode: string;
  contratoCode: string;
  clienteName: string;
  // Execução
  resourceId: string;
  resourceName: string;
  horasPlanejadas: number;
  horasRealizadas: number;
  status: ExecStatus;
  date: string; // data planejada
  competencia: string; // "03/2026"
  iniciadoEm?: string;
  concluidoEm?: string;
  // Apontamentos
  apontamentos: Apontamento[];
  comentarios: { id: string; author: string; text: string; date: string }[];
}

export interface Apontamento {
  id: string;
  horas: number;
  descricao: string;
  date: string;
  tipo: "execucao" | "deslocamento" | "preparacao";
}

export const EXECUCOES: Execucao[] = [
  {
    id: "ex-1", atividadeId: "at-1", atividadeName: "Coleta de dados ambientais", atividadeCode: "ATV-001",
    entregaName: "Planejamento", servicoName: "Eng. Segurança do Trabalho", servicoCode: "SST-001",
    contratoCode: "#1024", clienteName: "Empresa Alpha",
    resourceId: "rc-1", resourceName: "Carlos Silva",
    horasPlanejadas: 3, horasRealizadas: 0, status: "planejada", date: "11/03/2026", competencia: "03/2026",
    apontamentos: [], comentarios: [],
  },
  {
    id: "ex-2", atividadeId: "at-10", atividadeName: "Elaboração de laudo técnico", atividadeCode: "ATV-010",
    entregaName: "Laudos Técnicos", servicoName: "Higiene Ocupacional", servicoCode: "HO-002",
    contratoCode: "#1031", clienteName: "Empresa Beta",
    resourceId: "rc-5", resourceName: "Roberto Lima",
    horasPlanejadas: 6, horasRealizadas: 3, status: "em_realizacao", date: "10/03/2026", competencia: "03/2026",
    iniciadoEm: "10/03/2026 08:30",
    apontamentos: [
      { id: "ap-1", horas: 2, descricao: "Levantamento de dados laboratoriais", date: "10/03/2026 08:30", tipo: "execucao" },
      { id: "ap-2", horas: 1, descricao: "Deslocamento ao laboratório", date: "10/03/2026 10:30", tipo: "deslocamento" },
    ],
    comentarios: [
      { id: "ec-1", author: "Roberto Lima", text: "Aguardando resultados do laboratório para finalizar o laudo.", date: "10/03/2026 14:00" },
    ],
  },
  {
    id: "ex-3", atividadeId: "at-2", atividadeName: "Reunião de alinhamento", atividadeCode: "ATV-002",
    entregaName: "Planejamento", servicoName: "Consultoria SST", servicoCode: "CSST-003",
    contratoCode: "#1018", clienteName: "Empresa Gamma",
    resourceId: "rc-1", resourceName: "Carlos Silva",
    horasPlanejadas: 1, horasRealizadas: 1, status: "concluida", date: "09/03/2026", competencia: "03/2026",
    iniciadoEm: "09/03/2026 14:00", concluidoEm: "09/03/2026 15:00",
    apontamentos: [
      { id: "ap-3", horas: 1, descricao: "Reunião com cliente — alinhamento de escopo", date: "09/03/2026 14:00", tipo: "execucao" },
    ],
    comentarios: [],
  },
  {
    id: "ex-4", atividadeId: "at-3", atividadeName: "Inspeção de campo", atividadeCode: "ATV-003",
    entregaName: "Execução Técnica", servicoName: "Eng. Segurança do Trabalho", servicoCode: "SST-001",
    contratoCode: "#1024", clienteName: "Empresa Alpha",
    resourceId: "rc-7", resourceName: "Paulo Mendes",
    horasPlanejadas: 3, horasRealizadas: 3.5, status: "concluida", date: "09/03/2026", competencia: "03/2026",
    iniciadoEm: "09/03/2026 08:00", concluidoEm: "09/03/2026 11:30",
    apontamentos: [
      { id: "ap-4", horas: 2.5, descricao: "Inspeção em área de risco — setor B", date: "09/03/2026 08:00", tipo: "execucao" },
      { id: "ap-5", horas: 1, descricao: "Deslocamento ida+volta", date: "09/03/2026 08:00", tipo: "deslocamento" },
    ],
    comentarios: [
      { id: "ec-2", author: "Paulo Mendes", text: "Área B apresentou pendências de sinalização. Registrado no relatório.", date: "09/03/2026 12:00" },
    ],
  },
  {
    id: "ex-5", atividadeId: "at-11", atividadeName: "Pesquisa normativa", atividadeCode: "ATV-011",
    entregaName: "Diagnóstico", servicoName: "Eng. Segurança do Trabalho", servicoCode: "SST-001",
    contratoCode: "#1055", clienteName: "Empresa Epsilon",
    resourceId: "rc-8", resourceName: "Luciana Rocha",
    horasPlanejadas: 3, horasRealizadas: 0, status: "planejada", date: "11/03/2026", competencia: "03/2026",
    apontamentos: [], comentarios: [],
  },
  {
    id: "ex-6", atividadeId: "at-6", atividadeName: "Elaboração de relatório final", atividadeCode: "ATV-006",
    entregaName: "Relatório e Fechamento", servicoName: "Eng. Segurança do Trabalho", servicoCode: "SST-001",
    contratoCode: "#1024", clienteName: "Empresa Alpha",
    resourceId: "rc-1", resourceName: "Carlos Silva",
    horasPlanejadas: 4, horasRealizadas: 2, status: "realizada_parcial", date: "10/03/2026", competencia: "03/2026",
    iniciadoEm: "10/03/2026 13:00",
    apontamentos: [
      { id: "ap-6", horas: 2, descricao: "Redação do relatório — seção 1 e 2", date: "10/03/2026 13:00", tipo: "execucao" },
    ],
    comentarios: [
      { id: "ec-3", author: "Carlos Silva", text: "Faltam dados da inspeção do Paulo para seção 3. Continuarei amanhã.", date: "10/03/2026 17:00" },
    ],
  },
  {
    id: "ex-7", atividadeId: "at-5", atividadeName: "Análise de risco", atividadeCode: "ATV-005",
    entregaName: "Execução Técnica", servicoName: "Eng. Segurança do Trabalho", servicoCode: "SST-001",
    contratoCode: "#1024", clienteName: "Empresa Alpha",
    resourceId: "rc-1", resourceName: "Carlos Silva",
    horasPlanejadas: 4, horasRealizadas: 4, status: "pendencia_apontamento", date: "08/03/2026", competencia: "03/2026",
    iniciadoEm: "08/03/2026 08:00",
    apontamentos: [],
    comentarios: [
      { id: "ec-4", author: "Carlos Silva", text: "Realizada mas esqueci de lançar os apontamentos.", date: "10/03/2026 09:00" },
    ],
  },
  {
    id: "ex-8", atividadeId: "at-7", atividadeName: "Revisão documental", atividadeCode: "ATV-007",
    entregaName: "Relatório e Fechamento", servicoName: "Eng. Segurança do Trabalho", servicoCode: "SST-001",
    contratoCode: "#1024", clienteName: "Empresa Alpha",
    resourceId: "rc-1", resourceName: "Carlos Silva",
    horasPlanejadas: 2, horasRealizadas: 0, status: "bloqueada_competencia", date: "05/02/2026", competencia: "02/2026",
    apontamentos: [], comentarios: [],
  },
];

// --- Indisponibilidades ---
export interface Indisponibilidade {
  id: string;
  resource: string;
  type: string;
  startDate: string;
  endDate: string;
  uo: string;
  hours: string;
  scope: "Individual" | "UO";
}

export const INDISPONIBILIDADES: Indisponibilidade[] = [
  { id: "in-1", resource: "Carlos Silva", type: "Férias", startDate: "03/03/2026", endDate: "07/03/2026", uo: "UO Porto Alegre", hours: "40h", scope: "Individual" },
  { id: "in-2", resource: "Ana Paula Souza", type: "Reunião", startDate: "10/03/2026", endDate: "10/03/2026", uo: "UO Caxias do Sul", hours: "2h", scope: "Individual" },
  { id: "in-3", resource: "Todos - UO Canoas", type: "Feriado Municipal", startDate: "15/03/2026", endDate: "15/03/2026", uo: "UO Canoas", hours: "8h", scope: "UO" },
  { id: "in-4", resource: "João Pereira", type: "Evento", startDate: "12/03/2026", endDate: "12/03/2026", uo: "UO Canoas", hours: "4h", scope: "Individual" },
  { id: "in-5", resource: "Carlos Silva", type: "Reunião", startDate: "11/03/2026", endDate: "11/03/2026", uo: "UO Porto Alegre", hours: "3h", scope: "Individual" },
  { id: "in-6", resource: "Carlos Silva", type: "Evento", startDate: "18/03/2026", endDate: "18/03/2026", uo: "UO Porto Alegre", hours: "4h", scope: "Individual" },
  { id: "in-7", resource: "Carlos Silva", type: "Reunião", startDate: "20/03/2026", endDate: "20/03/2026", uo: "UO Porto Alegre", hours: "2h", scope: "Individual" },
  { id: "in-8", resource: "Carlos Silva", type: "Férias", startDate: "24/03/2026", endDate: "28/03/2026", uo: "UO Porto Alegre", hours: "40h", scope: "Individual" },
  { id: "in-9", resource: "Carlos Silva", type: "Evento", startDate: "14/04/2026", endDate: "14/04/2026", uo: "UO Porto Alegre", hours: "6h", scope: "Individual" },
];

// --- Indisponibilidades Corporativas (DR) ---
export interface IndisponibilidadeCorporativa {
  id: string;
  nome: string;
  data: string;
  tipo: string;
  escopo: string;
  status: "Ativo" | "Inativo";
  recorrente: boolean;
  anoReferencia: number;
  observacao: string;
}

export const INDISPONIBILIDADES_CORPORATIVAS: IndisponibilidadeCorporativa[] = [
  { id: "ic-1", nome: "Confraternização Universal", data: "01/01/2026", tipo: "Feriado Nacional", escopo: "Brasil", status: "Ativo", recorrente: false, anoReferencia: 2026, observacao: "" },
  { id: "ic-2", nome: "Paixão de Cristo", data: "03/04/2026", tipo: "Feriado Nacional", escopo: "Brasil", status: "Ativo", recorrente: false, anoReferencia: 2026, observacao: "" },
  { id: "ic-3", nome: "Tiradentes", data: "21/04/2026", tipo: "Feriado Nacional", escopo: "Brasil", status: "Ativo", recorrente: false, anoReferencia: 2026, observacao: "" },
  { id: "ic-4", nome: "Dia Mundial do Trabalho", data: "01/05/2026", tipo: "Feriado Nacional", escopo: "Brasil", status: "Ativo", recorrente: false, anoReferencia: 2026, observacao: "" },
  { id: "ic-5", nome: "Independência do Brasil", data: "07/09/2026", tipo: "Feriado Nacional", escopo: "Brasil", status: "Ativo", recorrente: false, anoReferencia: 2026, observacao: "" },
  { id: "ic-6", nome: "Nossa Senhora Aparecida", data: "12/10/2026", tipo: "Feriado Nacional", escopo: "Brasil", status: "Ativo", recorrente: false, anoReferencia: 2026, observacao: "" },
  { id: "ic-7", nome: "Finados", data: "02/11/2026", tipo: "Feriado Nacional", escopo: "Brasil", status: "Ativo", recorrente: false, anoReferencia: 2026, observacao: "" },
  { id: "ic-8", nome: "Proclamação da República", data: "15/11/2026", tipo: "Feriado Nacional", escopo: "Brasil", status: "Ativo", recorrente: false, anoReferencia: 2026, observacao: "" },
  { id: "ic-9", nome: "Dia Nacional de Zumbi e da Consciência Negra", data: "20/11/2026", tipo: "Feriado Nacional", escopo: "Brasil", status: "Ativo", recorrente: false, anoReferencia: 2026, observacao: "" },
  { id: "ic-10", nome: "Natal", data: "25/12/2026", tipo: "Feriado Nacional", escopo: "Brasil", status: "Ativo", recorrente: false, anoReferencia: 2026, observacao: "" },
];

// --- Mobilidades (contextual — nasce da atividade) ---
export interface Mobilidade {
  id: string;
  resource: string;
  resourceId: string;
  cargoId: string;
  from: string;
  to: string;
  distance: string;
  limit: string;
  status: "pendente" | "aprovada" | "rejeitada" | "cancelada";
  alert: boolean;
  date: string;
  // Contexto da necessidade (nasce da atividade)
  contratoId: string;
  contratoCode: string;
  servicoId: string;
  servicoName: string;
  entregaId: string;
  entregaName: string;
  atividadeId: string;
  atividadeName: string;
  motivo: string;
  solicitante: string;
  comentarios: { id: string; author: string; role: string; text: string; date: string }[];
  timeline: { id: string; action: string; user: string; date: string; detail?: string }[];
}

export const MOBILIDADES: Mobilidade[] = [
  {
    id: "mb-1", resource: "Maria Fernandes", resourceId: "rc-4", cargoId: "cg-4",
    from: "UO Porto Alegre", to: "UO Caxias do Sul", distance: "120km", limit: "50km",
    status: "pendente", alert: true, date: "09/03/2026",
    contratoId: "ct-2", contratoCode: "#1031", servicoId: "sv-2", servicoName: "Higiene Ocupacional",
    entregaId: "et-4", entregaName: "Avaliação Ambiental", atividadeId: "at-8", atividadeName: "Avaliação quantitativa",
    motivo: "Nenhum Higienista disponível na carteira do contrato #1031 (UO Caxias). Solicitada mobilidade de Maria Fernandes (UO POA).",
    solicitante: "Maria Coordenadora",
    comentarios: [
      { id: "mc-1", author: "Maria Coordenadora", role: "Coordenador", text: "Necessidade urgente — cliente solicitou antecipação da avaliação ambiental.", date: "09/03/2026 08:30" },
      { id: "mc-2", author: "Ana BackOffice", role: "BackOffice DR", text: "Distância excede limite parametrizado (50km). Requer aprovação do DR.", date: "09/03/2026 10:15" },
    ],
    timeline: [
      { id: "mt-1", action: "Necessidade identificada na atividade", user: "Maria Coordenadora", date: "09/03/2026 08:00", detail: "Atividade: Avaliação quantitativa — sem recurso compatível na carteira" },
      { id: "mt-2", action: "Busca por pessoa compatível em outras UOs", user: "Sistema", date: "09/03/2026 08:05", detail: "Cargo: Higienista Ocupacional — encontrada Maria Fernandes (UO POA)" },
      { id: "mt-3", action: "Solicitação de mobilidade criada", user: "Maria Coordenadora", date: "09/03/2026 08:10" },
      { id: "mt-4", action: "⚠ Alerta: distância 120km excede limite 50km", user: "Sistema", date: "09/03/2026 08:10" },
      { id: "mt-5", action: "Aguardando aprovação do DR", user: "Sistema", date: "09/03/2026 08:10" },
    ],
  },
  {
    id: "mb-2", resource: "Carlos Silva", resourceId: "rc-1", cargoId: "cg-1",
    from: "UO Porto Alegre", to: "UO Canoas", distance: "18km", limit: "50km",
    status: "aprovada", alert: false, date: "07/03/2026",
    contratoId: "ct-4", contratoCode: "#1042", servicoId: "sv-4", servicoName: "Treinamento NR-35",
    entregaId: "et-8", entregaName: "Capacitação", atividadeId: "at-14", atividadeName: "Preparação de material didático",
    motivo: "Engenheiro SST necessário para revisão técnica do material de NR-35 no contrato #1042.",
    solicitante: "João Coordenador",
    comentarios: [
      { id: "mc-3", author: "João Coordenador", role: "Coordenador", text: "Precisamos de engenheiro para validar o material técnico.", date: "07/03/2026 09:00" },
    ],
    timeline: [
      { id: "mt-6", action: "Necessidade identificada na atividade", user: "João Coordenador", date: "07/03/2026 08:30", detail: "Atividade: Prep. material didático — sem Eng. SST na UO Canoas" },
      { id: "mt-7", action: "Solicitação de mobilidade criada", user: "João Coordenador", date: "07/03/2026 08:35" },
      { id: "mt-8", action: "Mobilidade aprovada", user: "Maria Coordenadora", date: "07/03/2026 14:00", detail: "Dentro do limite parametrizado" },
    ],
  },
  {
    id: "mb-3", resource: "Roberto Lima", resourceId: "rc-5", cargoId: "cg-5",
    from: "UO Porto Alegre", to: "UO Novo Hamburgo", distance: "25km", limit: "50km",
    status: "pendente", alert: false, date: "08/03/2026",
    contratoId: "ct-5", contratoCode: "#1055", servicoId: "sv-2", servicoName: "Higiene Ocupacional",
    entregaId: "et-5", entregaName: "Laudos Técnicos", atividadeId: "at-10", atividadeName: "Elaboração de laudo técnico",
    motivo: "Contrato #1055 necessita Higienista para laudo técnico — recurso disponível apenas em UO POA.",
    solicitante: "Maria Coordenadora",
    comentarios: [],
    timeline: [
      { id: "mt-9", action: "Necessidade identificada na atividade", user: "Maria Coordenadora", date: "08/03/2026 10:00", detail: "Atividade: Elaboração de laudo técnico" },
      { id: "mt-10", action: "Solicitação de mobilidade criada", user: "Maria Coordenadora", date: "08/03/2026 10:05" },
    ],
  },
  {
    id: "mb-4", resource: "João Pereira", resourceId: "rc-3", cargoId: "cg-3",
    from: "UO Canoas", to: "UO Gravataí", distance: "55km", limit: "50km",
    status: "rejeitada", alert: true, date: "06/03/2026",
    contratoId: "ct-3", contratoCode: "#1018", servicoId: "sv-3", servicoName: "Consultoria SST",
    entregaId: "et-6", entregaName: "Diagnóstico", atividadeId: "at-11", atividadeName: "Pesquisa normativa",
    motivo: "Técnico de Segurança necessário para pesquisa normativa — não há recurso em UO Gravataí.",
    solicitante: "João Coordenador",
    comentarios: [
      { id: "mc-4", author: "Ana BackOffice", role: "BackOffice DR", text: "Distância 55km excede limite. Rejeitada — avaliar solicitação de terceiro.", date: "06/03/2026 16:00" },
      { id: "mc-5", author: "João Coordenador", role: "Coordenador", text: "Entendido. Vou abrir solicitação de terceiro para essa atividade.", date: "06/03/2026 16:30" },
    ],
    timeline: [
      { id: "mt-11", action: "Necessidade identificada na atividade", user: "João Coordenador", date: "06/03/2026 09:00", detail: "Atividade: Pesquisa normativa — sem Técnico SST na UO destino" },
      { id: "mt-12", action: "Solicitação de mobilidade criada", user: "João Coordenador", date: "06/03/2026 09:05" },
      { id: "mt-13", action: "⚠ Alerta: distância 55km excede limite 50km", user: "Sistema", date: "06/03/2026 09:05" },
      { id: "mt-14", action: "Mobilidade rejeitada", user: "Ana BackOffice", date: "06/03/2026 16:00", detail: "Excede limite — escalonado para terceiro" },
      { id: "mt-15", action: "Solicitação de terceiro criada automaticamente", user: "Sistema", date: "06/03/2026 16:01", detail: "Ref: TC-002" },
    ],
  },
];

// --- Terceiros (nasce da atividade — escalonamento) ---
export interface Terceiro {
  id: string;
  service: string;
  contractCode: string;
  contratoId: string;
  atividadeId: string;
  atividadeName: string;
  entregaName: string;
  servicoName: string;
  cargoNecessario: string;
  requester: string;
  uo: string;
  status: "pendente" | "aprovada" | "em_contratacao" | "rejeitada" | "concluida";
  date: string;
  justification: string;
  origem: "sem_capacidade" | "mobilidade_rejeitada" | "sobrecarga";
  origemMobilidadeId?: string;
  comentarios: { id: string; author: string; role: string; text: string; date: string }[];
  timeline: { id: string; action: string; user: string; date: string; detail?: string }[];
}

export const TERCEIROS: Terceiro[] = [
  {
    id: "tc-1", service: "Eng. Segurança do Trabalho", contractCode: "#1024", contratoId: "ct-1",
    atividadeId: "at-5", atividadeName: "Análise de risco", entregaName: "Execução Técnica", servicoName: "Eng. Segurança do Trabalho",
    cargoNecessario: "Engenheiro de Segurança do Trabalho",
    requester: "Maria Coordenadora", uo: "UO Porto Alegre",
    status: "pendente", date: "08/03/2026", justification: "Todos os engenheiros SST estão com carga acima de 90%. Não há capacidade interna para a análise de risco do contrato #1024.",
    origem: "sobrecarga",
    comentarios: [
      { id: "tc-c1", author: "Maria Coordenadora", role: "Coordenador", text: "Verifiquei a capacidade de Carlos Silva e Luciana Rocha — ambos acima de 90%.", date: "08/03/2026 09:00" },
      { id: "tc-c2", author: "Ana BackOffice", role: "BackOffice DR", text: "Confirmo sobrecarga. Encaminhando para contratação.", date: "08/03/2026 14:00" },
    ],
    timeline: [
      { id: "tt-1", action: "Necessidade identificada na atividade", user: "Maria Coordenadora", date: "08/03/2026 08:30", detail: "Atividade: Análise de risco — cargo: Eng. SST" },
      { id: "tt-2", action: "Verificação de capacidade interna", user: "Sistema", date: "08/03/2026 08:31", detail: "Carlos Silva: 92% | Luciana Rocha: 95% — sem capacidade" },
      { id: "tt-3", action: "Solicitação de terceiro criada", user: "Maria Coordenadora", date: "08/03/2026 08:35", detail: "Origem: sobrecarga interna" },
      { id: "tt-4", action: "Em análise pelo BackOffice DR", user: "Ana BackOffice", date: "08/03/2026 14:00" },
    ],
  },
  {
    id: "tc-2", service: "Treinamento NR-35", contractCode: "#1042", contratoId: "ct-4",
    atividadeId: "at-15", atividadeName: "Aplicação de treinamento", entregaName: "Capacitação", servicoName: "Treinamento NR-35",
    cargoNecessario: "Técnico de Segurança do Trabalho",
    requester: "João Coordenador", uo: "UO Canoas",
    status: "aprovada", date: "05/03/2026", justification: "Especialista em NR-35 não disponível na UO. Mobilidade rejeitada (mb-4) — escalonado para terceiro.",
    origem: "mobilidade_rejeitada", origemMobilidadeId: "mb-4",
    comentarios: [
      { id: "tc-c3", author: "João Coordenador", role: "Coordenador", text: "Mobilidade rejeitada para João Pereira. Precisamos de terceiro.", date: "06/03/2026 16:35" },
    ],
    timeline: [
      { id: "tt-5", action: "Mobilidade rejeitada (MB-004)", user: "Sistema", date: "06/03/2026 16:00", detail: "João Pereira — distância excede limite" },
      { id: "tt-6", action: "Escalonamento automático para terceiro", user: "Sistema", date: "06/03/2026 16:01" },
      { id: "tt-7", action: "Solicitação criada pelo Coordenador", user: "João Coordenador", date: "06/03/2026 16:35" },
      { id: "tt-8", action: "Solicitação aprovada", user: "Ana BackOffice", date: "07/03/2026 10:00", detail: "Autorizada contratação de terceiro" },
    ],
  },
  {
    id: "tc-3", service: "Higiene Ocupacional", contractCode: "#1031", contratoId: "ct-2",
    atividadeId: "at-9", atividadeName: "Análise laboratorial", entregaName: "Avaliação Ambiental", servicoName: "Higiene Ocupacional",
    cargoNecessario: "Higienista Ocupacional",
    requester: "Maria Coordenadora", uo: "UO Caxias do Sul",
    status: "em_contratacao", date: "03/03/2026", justification: "Demanda excepcional: análise laboratorial especializada não coberta por recursos internos.",
    origem: "sem_capacidade",
    comentarios: [
      { id: "tc-c4", author: "Maria Coordenadora", role: "Coordenador", text: "Nenhum higienista com certificação laboratorial no quadro.", date: "03/03/2026 11:00" },
      { id: "tc-c5", author: "Ana BackOffice", role: "BackOffice DR", text: "Processo de contratação iniciado — prazo estimado 5 dias úteis.", date: "04/03/2026 09:00" },
    ],
    timeline: [
      { id: "tt-9", action: "Necessidade identificada na atividade", user: "Maria Coordenadora", date: "03/03/2026 10:30", detail: "Atividade: Análise laboratorial — cargo: Higienista" },
      { id: "tt-10", action: "Verificação: sem recurso interno compatível", user: "Sistema", date: "03/03/2026 10:31" },
      { id: "tt-11", action: "Solicitação de terceiro criada", user: "Maria Coordenadora", date: "03/03/2026 11:00", detail: "Origem: sem capacidade interna" },
      { id: "tt-12", action: "Aprovada — em contratação", user: "Ana BackOffice", date: "04/03/2026 09:00" },
    ],
  },
];

// --- Comentários ---
export interface Comentario {
  id: string;
  activity: string;
  serviceCode: string;
  author: string;
  text: string;
  date: string;
  role: string;
}

export const COMENTARIOS: Comentario[] = [
  { id: "cm-1", activity: "Coleta de dados ambientais", serviceCode: "SST-001", author: "Maria Coordenadora", text: "Verificar se o equipamento de medição está calibrado antes da próxima visita.", date: "10/03/2026 09:15", role: "Coordenador" },
  { id: "cm-2", activity: "Coleta de dados ambientais", serviceCode: "SST-001", author: "Carlos Silva", text: "Equipamento verificado. Calibração válida até 15/04/2026.", date: "10/03/2026 10:30", role: "Técnico" },
  { id: "cm-3", activity: "Elaboração de laudo técnico", serviceCode: "HO-002", author: "Roberto Lima", text: "Preciso dos resultados da análise do laboratório para concluir o laudo.", date: "09/03/2026 16:45", role: "Técnico" },
  { id: "cm-4", activity: "Reunião de alinhamento", serviceCode: "CSST-003", author: "João Coordenador", text: "Pauta da reunião atualizada. Incluir discussão sobre novos procedimentos.", date: "09/03/2026 14:20", role: "Coordenador" },
];

// --- Usuários Admin ---
export interface Usuario {
  id: string;
  name: string;
  email: string;
  role: string;
  uo: string;
  status: "ativo" | "inativo";
}

export const USUARIOS: Usuario[] = [
  { id: "us-1", name: "Carlos Silva", email: "carlos.silva@sesi.org.br", role: "Técnico / Executor", uo: "UO Porto Alegre", status: "ativo" },
  { id: "us-2", name: "Maria Coordenadora", email: "maria.coord@sesi.org.br", role: "Facilitador do Processo", uo: "UO Porto Alegre", status: "ativo" },
  { id: "us-3", name: "Ana BackOffice", email: "ana.bo@sesi.org.br", role: "Gestão Corporativa (DR)", uo: "DR", status: "ativo" },
  { id: "us-4", name: "Pedro Admin", email: "pedro.admin@sesi.org.br", role: "Administrador", uo: "DR", status: "ativo" },
  { id: "us-5", name: "Lucia BO", email: "lucia.bo@sesi.org.br", role: "BackOffice UO", uo: "UO Canoas", status: "inativo" },
];

// --- Alocação por Atividade (nível granular — Facilitador) ---
export interface AlocacaoAtividade {
  id: string;
  contratoId: string;
  atividadeId: string;
  recursoId: string;
  horasAlocadas: number;
  status: "alocado" | "substituido";
}

export const ALOCACOES_ATIVIDADE: AlocacaoAtividade[] = [
  { id: "aa-1", contratoId: "ct-1", atividadeId: "at-1", recursoId: "rc-1", horasAlocadas: 3, status: "alocado" },
  { id: "aa-2", contratoId: "ct-1", atividadeId: "at-3", recursoId: "rc-7", horasAlocadas: 3, status: "alocado" },
  { id: "aa-3", contratoId: "ct-1", atividadeId: "at-6", recursoId: "rc-1", horasAlocadas: 4, status: "alocado" },
  { id: "aa-4", contratoId: "ct-2", atividadeId: "at-8", recursoId: "rc-5", horasAlocadas: 5, status: "alocado" },
];

/** Get resources whose cargo is compatible with a specific activity */
export function getRecursosCompativeisParaAtividade(atividadeId: string): Recurso[] {
  const atv = ATIVIDADES.find(a => a.id === atividadeId);
  if (!atv) return [];
  return RECURSOS.filter(r => atv.cargosPermitidos.includes(r.cargoId));
}

/** Get activity-level allocations for a contract + activity */
export function getAlocacoesAtividade(contratoId: string, atividadeId: string): AlocacaoAtividade[] {
  return ALOCACOES_ATIVIDADE.filter(a => a.contratoId === contratoId && a.atividadeId === atividadeId && a.status === "alocado");
}

/** Get all activity-level allocations for a resource across all contracts */
export function getHorasAlocadasRecurso(recursoId: string): number {
  return ALOCACOES_ATIVIDADE.filter(a => a.recursoId === recursoId && a.status === "alocado")
    .reduce((sum, a) => sum + a.horasAlocadas, 0);
}

/** Get capacity info for a resource */
export function getCapacidadeRecurso(recursoId: string): { total: number; alocado: number; disponivel: number } {
  const r = RECURSOS.find(rc => rc.id === recursoId);
  if (!r) return { total: 0, alocado: 0, disponivel: 0 };
  const alocado = getHorasAlocadasRecurso(recursoId);
  return { total: r.hoursMonthly, alocado, disponivel: r.hoursMonthly - alocado };
}

// --- Helpers ---
export function getCargoById(id: string) {
  return CARGOS.find(c => c.id === id);
}

export function getServicoById(id: string) {
  return SERVICOS.find(s => s.id === id);
}

export function getRecursoById(id: string) {
  return RECURSOS.find(r => r.id === id);
}

export function getContratoById(id: string) {
  return CONTRATOS.find(c => c.id === id);
}

/** Get recursos whose cargo is permitted for a given service (derived from activities) */
export function getRecursosElegiveisParaServico(servicoId: string): Recurso[] {
  const cargosPermitidos = getCargosPermitidosByServico(servicoId);
  const cargoIds = cargosPermitidos.map(c => c.id);
  return RECURSOS.filter(r => cargoIds.includes(r.cargoId));
}

export function getCapacidadeUO(uoName: string) {
  const recursos = RECURSOS.filter(r => r.uo === uoName);
  const totalCapacity = recursos.reduce((acc, r) => acc + r.hoursMonthly, 0);
  const allocated = ALOCACOES.filter(a => a.status === "alocado" && RECURSOS.find(r => r.id === a.resourceId)?.uo === uoName)
    .reduce((acc, a) => acc + a.hoursAllocated, 0);
  return { total: totalCapacity, allocated, available: totalCapacity - allocated, resources: recursos.length };
}

/** Category labels */
export const CARGO_CATEGORY_LABELS: Record<Cargo["category"], string> = {
  engenharia: "Engenharia",
  saude: "Saúde",
  tecnico: "Técnico",
  gestao: "Gestão",
};
