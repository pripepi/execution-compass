import React, { useState, useMemo, useCallback } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { useExecucoes } from "@/contexts/ExecucoesContext";
import { useAlocacoesAtividade } from "@/contexts/AlocacoesAtividadeContext";
import { PageHeader, StatusBadge, DataCard, CargoBadge, PessoaBadge, ValidarBadge } from "@/components/ui-custom/StatusBadge";
import {
  ChevronDown, ChevronRight, Search, FileText, Users, Package, Layers, Clock, Activity,
  AlertTriangle, Lock, Edit3, CheckCircle2, ArrowRight,
  UserPlus, UserMinus, RefreshCw, Gauge, Shield, CheckSquare, Square,
  ArrowDownUp, Filter, X, Copy,
  TrendingUp, Calendar, MapPin, Star, Save, Pencil, RotateCcw, Info, Plus,
  CalendarDays, CalendarRange, BarChart3 } from
"lucide-react";
import { format, eachMonthOfInterval, getDaysInMonth, differenceInCalendarDays, startOfMonth, endOfMonth, isWithinInterval, max as dateMax, min as dateMin } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  CONTRATOS, SERVICOS, ALOCACOES, UOS, RECURSOS, ALOCACOES_ATIVIDADE,
  getCargoById, getAtividadesByEntrega,
  getEntregasByServico,
  getHorasAplicaveis, getSumHorasAplicaveisServico, getSumHorasAplicaveisEntrega,
  getSumHoursForServico, getSumHoursForEntrega,
  getRecursosCompativeisParaAtividade, getCapacidadeRecurso, getRecursoById,
  Contrato, AlocacaoAtividade, Atividade, Execucao, CONTRATO_ATIVIDADE_CONFIGS, ContratoAtividadeConfig, ATIVIDADES, ENTREGAS } from
"@/data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

// ══════════════════════════════════════════════════════════════
// OCORRÊNCIA ADICIONAL — derived from a DR activity, contract-scoped
// ══════════════════════════════════════════════════════════════
interface OcorrenciaAdicional {
  id: string;
  contratoId: string;
  entregaId: string;
  atividadeBaseId: string; // references the DR activity this is derived from
  descricao: string; // free-text describing this specific occurrence
  horasContrato: number;
  horasDR: number; // inherited reference from DR activity
  cargosPermitidos: string[]; // inherited from base activity
  criadoPor: string;
  criadoEm: string;
}

// ══════════════════════════════════════════════════════════════
// PROGRAMAÇÃO TEMPORAL — planned dates & monthly distribution
// ══════════════════════════════════════════════════════════════
interface ProgramacaoAtividade {
  contratoId: string;
  atividadeId: string; // can be a regular atv.id or an ocorrência id
  dataInicio: Date;
  dataFim: Date;
  definidoPor: string;
  definidoEm: string;
}

interface CompetenciaDistribuicao {
  competencia: string; // "MM/YYYY"
  mes: Date;
  diasUteis: number;
  diasAtividade: number;
  horasPrevistas: number;
  horasAlocadas: number;
  horasRealizadas: number;
}

function calcDistribuicaoMensal(
dataInicio: Date,
dataFim: Date,
totalHoras: number,
horasAlocadasByMonth?: Record<string, number>)
: CompetenciaDistribuicao[] {
  if (dataFim < dataInicio) return [];
  const months = eachMonthOfInterval({ start: dataInicio, end: dataFim });
  // Calculate proportional days per month
  const diasPorMes = months.map((m) => {
    const inicioMes = startOfMonth(m);
    const fimMes = endOfMonth(m);
    const efInicio = dateMax([dataInicio, inicioMes]);
    const efFim = dateMin([dataFim, fimMes]);
    const dias = differenceInCalendarDays(efFim, efInicio) + 1;
    return Math.max(dias, 0);
  });
  const totalDias = diasPorMes.reduce((s, d) => s + d, 0);

  return months.map((m, i) => {
    const comp = format(m, "MM/yyyy");
    const diasUteis = Math.round(getDaysInMonth(m) * 0.72); // ~22 working days
    const horasPrevistas = totalDias > 0 ? Math.round(diasPorMes[i] / totalDias * totalHoras * 10) / 10 : 0;
    return {
      competencia: comp,
      mes: m,
      diasUteis,
      diasAtividade: diasPorMes[i],
      horasPrevistas,
      horasAlocadas: horasAlocadasByMonth?.[comp] ?? 0,
      horasRealizadas: 0 // placeholder for execution data
    };
  });
}

type StatusFilter = "todos" | "ativo" | "em_implantacao" | "encerrado" | "vencido";
type ContractTypeFilter = "todos" | "novo" | "renovacao" | "indiferente";
type ContractTab = "padrao" | "estrutura" | "equipe" | "acoes";
type TeamSort = "saldo_desc" | "saldo_asc" | "carga_desc" | "nome";
type ContractType = "Novo" | "Renovação" | "Indiferente";

// Deterministic mock: assign contract types based on id hash
const CONTRACT_TYPE_MAP: Record<string, ContractType> = {
  "ct-1": "Novo",
  "ct-2": "Renovação",
  "ct-3": "Indiferente",
  "ct-4": "Novo",
  "ct-5": "Renovação"
};
function getContractType(id: string): ContractType {
  return CONTRACT_TYPE_MAP[id] || (["Novo", "Renovação", "Indiferente"] as ContractType[])[id.charCodeAt(id.length - 1) % 3];
}

// Mock vigência data per contract
const CONTRACT_VIGENCIA: Record<string, {inicio: string;fim: string;}> = {
  "ct-1": { inicio: "01/01/2026", fim: "31/12/2026" },
  "ct-2": { inicio: "01/02/2026", fim: "31/07/2026" },
  "ct-3": { inicio: "01/03/2026", fim: "30/09/2026" },
  "ct-4": { inicio: "01/04/2026", fim: "31/12/2026" },
  "ct-5": { inicio: "01/01/2026", fim: "30/06/2026" }
};

function isContratoVencido(contrato: Contrato): boolean {
  const parts = contrato.endDate.split("/");
  if (parts.length !== 3) return false;
  const endDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  return endDate < new Date();
}

// ══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ══════════════════════════════════════════════════════════════

function getRecursoSaldo(recursoId: string) {
  const cap = getCapacidadeRecurso(recursoId);
  const indispHoras = recursoId === "rc-1" ? 40 : recursoId === "rc-3" ? 8 : 0;
  return {
    capacidade: cap.total,
    alocado: cap.alocado,
    indisponivel: indispHoras,
    saldo: Math.max(cap.total - cap.alocado - indispHoras, 0),
    pctUsado: cap.total > 0 ? (cap.alocado + indispHoras) / cap.total * 100 : 0
  };
}

function SaldoBadge({ saldo, capacidade }: {saldo: number;capacidade: number;}) {
  const pct = capacidade > 0 ? saldo / capacidade * 100 : 0;
  if (saldo === 0) return <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-status-danger-muted text-status-danger border border-status-danger/20 font-semibold">Sem saldo</span>;
  if (pct < 20) return <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-status-warning-muted text-status-warning border border-status-warning/20 font-semibold">{saldo}h livres</span>;
  return <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-status-success-muted text-status-success border border-status-success/20 font-semibold">{saldo}h livres</span>;
}

function ComparisonStatus({ padrao, aplicavel }: {padrao: number;aplicavel: number;}) {
  if (aplicavel === padrao) return (
    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border font-medium">
      <CheckCircle2 className="w-2.5 h-2.5" /> Herdado
    </span>);

  if (aplicavel > padrao) return (
    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-status-danger-muted text-status-danger border border-status-danger/20 font-medium">
      <AlertTriangle className="w-2.5 h-2.5" /> Excede padrão
    </span>);

  return (
    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/15 font-medium">
      <Edit3 className="w-2.5 h-2.5" /> Ajustado
    </span>);

}

function ComparisonBar({ padrao, aplicavel, size = "md" }: {padrao: number;aplicavel: number;size?: "sm" | "md";}) {
  const max = Math.max(padrao, aplicavel, 1);
  const h = size === "sm" ? "h-1" : "h-1.5";
  const overflow = aplicavel > padrao;
  return (
    <div className="flex flex-col gap-0.5 w-24">
      <div className={`${h} rounded-full bg-muted overflow-hidden`}>
        <div className={`${h} rounded-full bg-muted-foreground/30`} style={{ width: `${padrao / max * 100}%` }} />
      </div>
      <div className={`${h} rounded-full bg-muted overflow-hidden`}>
        <div className={`${h} rounded-full ${overflow ? 'bg-status-danger' : aplicavel < padrao ? 'bg-primary' : 'bg-muted-foreground/30'}`} style={{ width: `${aplicavel / max * 100}%` }} />
      </div>
    </div>);

}

function CapacityCard({ recursoId, compact = false }: {recursoId: string;compact?: boolean;}) {
  const s = getRecursoSaldo(recursoId);
  const overloaded = s.pctUsado > 90;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden flex">
          <div className="h-1.5 bg-primary transition-all" style={{ width: `${Math.min(s.alocado / s.capacidade * 100, 100)}%` }} />
          <div className="h-1.5 bg-status-warning transition-all" style={{ width: `${Math.min(s.indisponivel / s.capacidade * 100, 100)}%` }} />
        </div>
        <SaldoBadge saldo={s.saldo} capacidade={s.capacidade} />
        {overloaded && <AlertTriangle className="w-3 h-3 text-status-danger" />}
      </div>);

  }

  return (
    <div className="bg-muted/20 rounded-lg border border-border/50 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Competência 03/2026
        </span>
        <SaldoBadge saldo={s.saldo} capacidade={s.capacidade} />
      </div>
      <div className="grid grid-cols-4 gap-2 text-[9px] mb-1.5">
        <div className="text-center"><p className="text-muted-foreground">Capacidade</p><p className="font-data font-semibold text-foreground">{s.capacidade}h</p></div>
        <div className="text-center"><p className="text-muted-foreground">Alocado</p><p className="font-data font-semibold text-foreground">{s.alocado}h</p></div>
        <div className="text-center"><p className="text-status-warning">Indisp.</p><p className="font-data font-semibold text-status-warning">{s.indisponivel}h</p></div>
        <div className="text-center">
          <p className={s.saldo === 0 ? 'text-status-danger' : s.saldo < 20 ? 'text-status-warning' : 'text-status-success'}>Saldo</p>
          <p className={`font-data font-bold ${s.saldo === 0 ? 'text-status-danger' : s.saldo < 20 ? 'text-status-warning' : 'text-status-success'}`}>{s.saldo}h</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
        <div className="h-2 bg-primary transition-all" style={{ width: `${Math.min(s.alocado / s.capacidade * 100, 100)}%` }} />
        <div className="h-2 bg-status-warning transition-all" style={{ width: `${Math.min(s.indisponivel / s.capacidade * 100, 100)}%` }} />
      </div>
      <div className="flex items-center gap-3 mt-1 text-[8px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" /> Alocado</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-status-warning inline-block" /> Indisponível</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted inline-block border border-border" /> Livre</span>
      </div>
      {overloaded &&
      <div className="mt-1.5 flex items-center gap-1 text-[9px] text-status-danger font-medium">
          <AlertTriangle className="w-3 h-3" /> Capacidade acima de 90%
        </div>
      }
    </div>);

}

// ══════════════════════════════════════════════════════════════
// ACTIVITY ALLOCATION PANEL (inline — per activity)
// ══════════════════════════════════════════════════════════════
function AtividadeAlocacaoPanel({
  atv, contratoId, alocacoesAtiv, horasContrato, onAlocar, onDesalocar, onSubstituir,
  programacao, onSetProgramacao, onRemoveProgramacao, distribuicao, isGestaoCorporativaDR, isCoordenador
}: {atv: Atividade;contratoId: string;horasContrato: number;alocacoesAtiv: AlocacaoAtividade[];onAlocar: (contratoId: string, atividadeId: string, recursoId: string, horas: number) => void;onDesalocar: (alocId: string) => void;onSubstituir: (alocId: string, novoRecursoId: string) => void;programacao?: ProgramacaoAtividade;onSetProgramacao?: (dataInicio: Date, dataFim: Date) => void;onRemoveProgramacao?: () => void;distribuicao?: CompetenciaDistribuicao[];isGestaoCorporativaDR?: boolean;isCoordenador?: boolean;}) {
  const compativeis = getRecursosCompativeisParaAtividade(atv.id);
  const horasJaAlocadas = alocacoesAtiv.reduce((s, a) => s + a.horasAlocadas, 0);
  const horasRestantes = horasContrato - horasJaAlocadas;
  const [showAdd, setShowAdd] = useState(false);
  const [selRecurso, setSelRecurso] = useState("");
  const [selHoras, setSelHoras] = useState(horasRestantes > 0 ? horasRestantes : 1);
  const [showSubstituir, setShowSubstituir] = useState<string | null>(null);
  const [subRecurso, setSubRecurso] = useState("");
  const [sortPeople, setSortPeople] = useState<TeamSort>("saldo_desc");
  // Mobilidade state (coordenador only)
  const [showMobilidadeModal, setShowMobilidadeModal] = useState(false);
  const [mobDataInicio, setMobDataInicio] = useState("");
  const [mobDataFim, setMobDataFim] = useState("");
  const [mobUO, setMobUO] = useState("");
  const [mobilidadeEfetivada, setMobilidadeEfetivada] = useState(false);
  // Alocação efetiva state (coordenador only)
  const [alocacaoEfetivaId, setAlocacaoEfetivaId] = useState<string | null>(null);
  const [mobilidadePendenteUO, setMobilidadePendenteUO] = useState<string | null>(null);
  const [showSubstituirEfetiva, setShowSubstituirEfetiva] = useState(false);
  const alocacaoEfetivaRecurso = alocacaoEfetivaId ? getRecursoById(alocacaoEfetivaId) : null;
  const alocacaoEfetivaCargo = alocacaoEfetivaRecurso ? getCargoById(alocacaoEfetivaRecurso.cargoId) : null;
  const recursosAlocadosIds = alocacoesAtiv.map((a) => a.recursoId);
  const recursosDisponiveis = compativeis.filter((r) => !recursosAlocadosIds.includes(r.id) && r.status === "ativo");
  const cargosNomes = atv.cargosPermitidos.map((cid) => getCargoById(cid)?.name || cid);

  // Date planning local state
  const [editingDates, setEditingDates] = useState(false);
  const [tempInicio, setTempInicio] = useState(programacao ? format(programacao.dataInicio, "yyyy-MM-dd") : "");
  const [tempFim, setTempFim] = useState(programacao ? format(programacao.dataFim, "yyyy-MM-dd") : "");

  const sortedDisponiveis = [...recursosDisponiveis].sort((a, b) => {
    const sa = getRecursoSaldo(a.id);
    const sb = getRecursoSaldo(b.id);
    if (sortPeople === "saldo_desc") return sb.saldo - sa.saldo;
    if (sortPeople === "saldo_asc") return sa.saldo - sb.saldo;
    if (sortPeople === "carga_desc") return sb.alocado - sa.alocado;
    return a.name.localeCompare(b.name);
  });
  const bestMatchId = sortedDisponiveis.length > 0 && sortPeople === "saldo_desc" ? sortedDisponiveis[0].id : null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-3 relative">
      {mobilidadeEfetivada && !mobilidadePendenteUO && (
        <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
          Alocação Efetivada
        </span>
      )}
      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Horas da atividade — Competência 03/2026
        </p>
        <div className="grid grid-cols-4 gap-3 text-[10px]">
          <div className="text-center"><p className="text-muted-foreground">Previsão contrato</p><p className="font-data font-semibold text-foreground text-sm">{horasContrato}h</p></div>
          <div className="text-center"><p className="text-muted-foreground">Realizadas</p><p className="font-data font-semibold text-foreground text-sm">{horasJaAlocadas}h</p></div>
          <div className="text-center"><p className="text-muted-foreground">Saldo</p><p className={`font-data font-semibold text-sm ${horasRestantes < 0 ? 'text-status-danger' : horasRestantes === 0 ? 'text-status-success' : 'text-foreground'}`}>{horasRestantes}h</p></div>
          <div className="text-center">
            <p className="text-muted-foreground">Progresso</p>
            <p className={`font-data font-semibold text-sm ${horasJaAlocadas > horasContrato ? 'text-status-danger' : horasJaAlocadas === horasContrato ? 'text-status-success' : 'text-primary'}`}>{horasContrato > 0 ? Math.round(horasJaAlocadas / horasContrato * 100) : 0}%</p>
            <div className="h-1 rounded-full bg-muted overflow-hidden mt-1 mx-auto w-12">
              <div className={`h-1 rounded-full ${horasJaAlocadas > horasContrato ? 'bg-status-danger' : 'bg-primary'}`} style={{ width: `${Math.min(horasContrato > 0 ? horasJaAlocadas / horasContrato * 100 : 0, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {horasRestantes < 0 &&
      <div className="flex items-center gap-2 px-3 py-2 bg-status-danger-muted border border-status-danger/20 rounded-md text-[10px] text-status-danger font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Horas alocadas excedem o padrão do contrato ({Math.abs(horasRestantes)}h acima)
        </div>
      }
      {atv.cargosPermitidos.length === 0 &&
      <div className="flex items-center gap-2 px-3 py-2 bg-status-danger-muted border border-status-danger/20 rounded-md text-[10px] text-status-danger font-medium">
          <Shield className="w-3.5 h-3.5 shrink-0" /> Nenhum cargo permitido — impossível alocar
        </div>
      }

      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-1"><Shield className="w-3 h-3" /> Cargos permitidos</p>
        <div className="flex flex-wrap gap-1">{cargosNomes.map((n, i) => <CargoBadge key={i}>{n}</CargoBadge>)}</div>
      </div>

      {/* ── Programação temporal ── */}
      {!isCoordenador && !isGestaoCorporativaDR && (
      <div className="bg-muted/20 rounded-lg border border-border/50 p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
            <CalendarRange className="w-3 h-3" /> Programação temporal
          </p>
          {programacao && !editingDates &&
          <div className="flex items-center gap-1">
              <button onClick={() => {setEditingDates(true);setTempInicio(format(programacao.dataInicio, "yyyy-MM-dd"));setTempFim(format(programacao.dataFim, "yyyy-MM-dd"));}}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Editar datas">
                <Pencil className="w-3 h-3" />
              </button>
              {onRemoveProgramacao &&
            <button onClick={onRemoveProgramacao}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Remover programação">
                  <X className="w-3 h-3" />
                </button>
            }
            </div>
          }
        </div>

        {!programacao && !editingDates ?
        <button onClick={() => setEditingDates(true)}
        className="w-full flex items-center justify-center gap-1.5 text-[10px] font-medium px-3 py-2 border border-dashed border-primary/30 text-primary rounded-md hover:bg-primary/5 transition-colors">
            <CalendarDays className="w-3.5 h-3.5" /> Definir datas de início e fim planejadas
          </button> :
        editingDates ?
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground font-medium">Data início planejada</label>
                <input type="date" value={tempInicio} onChange={(e) => setTempInicio(e.target.value)}
              className="w-full border border-input rounded-md text-[11px] p-1.5 bg-background mt-0.5 font-data" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium">Data fim planejada</label>
                <input type="date" value={tempFim} onChange={(e) => setTempFim(e.target.value)}
              className="w-full border border-input rounded-md text-[11px] p-1.5 bg-background mt-0.5 font-data" />
              </div>
            </div>
            {tempInicio && tempFim && new Date(tempInicio) > new Date(tempFim) &&
          <p className="text-[9px] text-status-danger flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Data de início deve ser anterior à data de fim</p>
          }
            {tempInicio && tempFim && new Date(tempInicio) <= new Date(tempFim) &&
          <div className="text-[9px] text-muted-foreground">
                Duração: <strong className="text-foreground font-data">{differenceInCalendarDays(new Date(tempFim), new Date(tempInicio)) + 1} dias</strong>
                {" "}• Competências: <strong className="text-foreground font-data">{eachMonthOfInterval({ start: new Date(tempInicio), end: new Date(tempFim) }).length}</strong>
              </div>
          }
            <div className="flex gap-2 justify-end">
              <button onClick={() => {setEditingDates(false);setTempInicio(programacao ? format(programacao.dataInicio, "yyyy-MM-dd") : "");setTempFim(programacao ? format(programacao.dataFim, "yyyy-MM-dd") : "");}}
            className="text-[10px] px-3 py-1.5 border border-border rounded-md text-foreground hover:bg-accent">Cancelar</button>
              <button
              onClick={() => {
                if (tempInicio && tempFim && new Date(tempInicio) <= new Date(tempFim) && onSetProgramacao) {
                  onSetProgramacao(new Date(tempInicio), new Date(tempFim));
                  setEditingDates(false);
                }
              }}
              disabled={!tempInicio || !tempFim || new Date(tempInicio) > new Date(tempFim)}
              className="text-[10px] px-3 py-1.5 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1">
                <Save className="w-3 h-3" /> Salvar programação
              </button>
            </div>
          </div> :
        programacao ?
        <div className="space-y-2.5">
            {/* Date summary */}
            <div className="grid grid-cols-3 gap-3 text-[10px]">
              <div className="bg-card rounded-md border border-border p-2 text-center">
                <p className="text-muted-foreground flex items-center justify-center gap-1"><CalendarDays className="w-2.5 h-2.5" /> Início</p>
                <p className="font-data font-semibold text-foreground text-[11px] mt-0.5">{format(programacao.dataInicio, "dd/MM/yyyy")}</p>
              </div>
              <div className="bg-card rounded-md border border-border p-2 text-center">
                <p className="text-muted-foreground flex items-center justify-center gap-1"><CalendarDays className="w-2.5 h-2.5" /> Fim</p>
                <p className="font-data font-semibold text-foreground text-[11px] mt-0.5">{format(programacao.dataFim, "dd/MM/yyyy")}</p>
              </div>
              <div className="bg-card rounded-md border border-border p-2 text-center">
                <p className="text-muted-foreground">Duração</p>
                <p className="font-data font-semibold text-foreground text-[11px] mt-0.5">{differenceInCalendarDays(programacao.dataFim, programacao.dataInicio) + 1} dias</p>
              </div>
            </div>

            {/* Monthly distribution table */}
            {distribuicao && distribuicao.length > 0 &&
          <div>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> Provisão mensal por competência
                </p>
                <div className="bg-card rounded-md border border-border overflow-hidden">
                  <div className="grid grid-cols-[1fr,60px,60px,60px,60px,40px] gap-0 text-[8px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border bg-muted/30 px-2 py-1.5">
                    <span>Competência</span>
                    <span className="text-right">Dias</span>
                    <span className="text-right">Previstas</span>
                    <span className="text-right">Realizadas</span>
                    <span className="text-right">Saldo</span>
                    <span className="text-center">%</span>
                  </div>
                  {distribuicao.map((d, idx) => {
                const saldo = d.horasPrevistas - d.horasAlocadas;
                const pct = d.horasPrevistas > 0 ? Math.round(d.horasAlocadas / d.horasPrevistas * 100) : 0;
                return (
                  <div key={idx} className={`grid grid-cols-[1fr,60px,60px,60px,60px,40px] gap-0 text-[10px] px-2 py-1.5 border-b border-border/30 last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <span className="font-data font-medium text-foreground">{d.competencia}</span>
                        <span className="text-right font-data text-muted-foreground">{d.diasAtividade}d</span>
                        <span className="text-right font-data font-medium text-primary">{d.horasPrevistas}h</span>
                        <span className="text-right font-data text-foreground">{d.horasAlocadas}h</span>
                        <span className={`text-right font-data font-medium ${saldo < 0 ? 'text-status-danger' : saldo === 0 ? 'text-status-success' : 'text-foreground'}`}>{saldo.toFixed(1)}h</span>
                        <span className="text-center">
                          <span className={`text-[8px] px-1 py-0.5 rounded font-medium ${pct >= 100 ? 'bg-status-success-muted text-status-success' : pct > 0 ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{pct}%</span>
                        </span>
                      </div>);

              })}
                  {/* Total row */}
                  <div className="grid grid-cols-[1fr,60px,60px,60px,60px,40px] gap-0 text-[10px] px-2 py-1.5 bg-muted/30 font-semibold border-t border-border">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-right font-data text-muted-foreground">{distribuicao.reduce((s, d) => s + d.diasAtividade, 0)}d</span>
                    <span className="text-right font-data text-primary">{distribuicao.reduce((s, d) => s + d.horasPrevistas, 0).toFixed(1)}h</span>
                    <span className="text-right font-data text-foreground">{horasJaAlocadas}h</span>
                    <span className={`text-right font-data ${horasRestantes < 0 ? 'text-status-danger' : 'text-foreground'}`}>{horasRestantes}h</span>
                    <span />
                  </div>
                </div>

                {/* Visual bar per month */}
                <div className="mt-2 flex items-end gap-1 h-10">
                  {distribuicao.map((d, idx) => {
                const maxH = Math.max(...distribuicao.map((x) => x.horasPrevistas), 1);
                const barH = d.horasPrevistas / maxH * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full rounded-t relative" style={{ height: `${barH}%`, minHeight: '2px' }}>
                          <div className="absolute inset-0 bg-primary/20 rounded-t" />
                          <div className="absolute bottom-0 left-0 right-0 bg-primary rounded-t transition-all" style={{ height: `${d.horasPrevistas > 0 ? Math.min(d.horasAlocadas / d.horasPrevistas * 100, 100) : 0}%` }} />
                        </div>
                        <span className="text-[7px] font-data text-muted-foreground">{d.competencia.slice(0, 2)}</span>
                      </div>);

              })}
                </div>
              </div>
          }

            {/* Traceability */}
            <div className="text-[8px] text-muted-foreground flex items-center gap-2 pt-1 border-t border-border/30">
              <span>Definido por: <strong className="text-foreground">{programacao.definidoPor}</strong></span>
              <span>•</span>
              <span>Em: {programacao.definidoEm}</span>
            </div>
          </div> :
        null}
      </div>
      )}

      {/* Alocação Efetiva card for Coordenador */}
      {isCoordenador && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1"><Users className="w-3 h-3" /> Alocação Efetiva</p>
          {!alocacaoEfetivaId ? (
            <div className="bg-muted/30 rounded-md p-3 text-center">
              <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1 opacity-40" />
              {mobilidadePendenteUO ? (
                <p className="text-[11px] font-semibold text-amber-600 italic">
                  Solicitação Mobilidade Pendente — UO {UOS.find(u => u.id === mobilidadePendenteUO)?.name || mobilidadePendenteUO}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">Nenhuma pessoa alocada</p>
              )}
            </div>
          ) : alocacaoEfetivaRecurso ? (
            <div className="bg-card border border-border rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PessoaBadge>{alocacaoEfetivaRecurso.name}</PessoaBadge>
                  {alocacaoEfetivaCargo && <CargoBadge>{alocacaoEfetivaCargo.name}</CargoBadge>}
                  <span className="text-[10px] text-muted-foreground">{alocacaoEfetivaRecurso.uo}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowSubstituirEfetiva(true)} title="Substituir recurso"
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setAlocacaoEfetivaId(null); setMobilidadeEfetivada(false); setMobilidadePendenteUO(null); toast.info("Alocação removida"); }} title="Remover alocação"
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-status-danger transition-colors">
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Modal Substituir recurso efetivo */}
          <Dialog open={showSubstituirEfetiva} onOpenChange={setShowSubstituirEfetiva}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base">Substituir recurso</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">Selecione um técnico disponível com cargo compatível.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 max-h-60 overflow-y-auto py-2">
                {recursosDisponiveis.filter(r => alocacaoEfetivaCargo ? r.cargoId === alocacaoEfetivaRecurso?.cargoId : true).map(r => {
                  const cargo = getCargoById(r.cargoId);
                  return (
                    <button key={r.id} onClick={() => { setAlocacaoEfetivaId(r.id); setShowSubstituirEfetiva(false); toast.success(`Recurso substituído por ${r.name}`); }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border hover:border-primary/30 hover:bg-accent/30 transition-colors text-left">
                      <span className="text-[11px] font-medium text-foreground">{r.name}</span>
                      <span className="text-[9px] text-muted-foreground">{cargo?.name} · {r.uo}</span>
                    </button>
                  );
                })}
                {recursosDisponiveis.filter(r => alocacaoEfetivaCargo ? r.cargoId === alocacaoEfetivaRecurso?.cargoId : true).length === 0 && (
                  <p className="text-[11px] text-muted-foreground italic text-center py-3">Nenhum técnico disponível com cargo compatível</p>
                )}
              </div>
              <DialogFooter>
                <button onClick={() => setShowSubstituirEfetiva(false)} className="text-[11px] px-4 py-2 border border-border rounded-md text-foreground hover:bg-accent">Fechar</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Original allocation list for non-coordenador */}
      {!isCoordenador && (
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1"><Users className="w-3 h-3" />&nbsp;</p>
        {alocacoesAtiv.length === 0 ?
        <div className="bg-muted/30 rounded-md p-3 text-center">
            <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1 opacity-40" />
            <p className="text-[11px] text-muted-foreground italic">Nenhuma pessoa alocada</p>
          </div> :

        <div className="space-y-2">
            {alocacoesAtiv.map((aloc) => {
            const rec = getRecursoById(aloc.recursoId);
            if (!rec) return null;
            const cargo = getCargoById(rec.cargoId);
            const isCompatible = atv.cargosPermitidos.includes(rec.cargoId);
            return;
          })}
          </div>
        }
      </div>
      )}

      {!isCoordenador &&
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1"><Gauge className="w-3 h-3" /> Equipe compatível ({sortedDisponiveis.length})</p>
          <select value={sortPeople} onChange={(e) => setSortPeople(e.target.value as TeamSort)} className="text-[9px] border border-input rounded px-1.5 py-0.5 bg-background text-foreground">
            <option value="saldo_desc">↓ Maior saldo</option>
            <option value="saldo_asc">↑ Menor saldo</option>
            <option value="carga_desc">↓ Maior carga</option>
            <option value="nome">A-Z Nome</option>
          </select>
        </div>
        {sortedDisponiveis.length === 0 ?
        <div className="bg-muted/30 rounded-md p-3 text-center"><p className="text-[10px] text-status-danger italic">Nenhuma pessoa disponível com cargo compatível</p></div> :

        <div className="space-y-1.5">
            {sortedDisponiveis.map((r) => {
            const cargo = getCargoById(r.cargoId);
            const s = getRecursoSaldo(r.id);
            const isBest = r.id === bestMatchId;
            return (
              <div key={r.id} className={`rounded-lg border px-3 py-2 transition-colors ${isBest ? 'bg-accent/30 border-primary/30' : s.saldo === 0 ? 'bg-muted/10 border-border/30 opacity-60' : 'bg-card border-border hover:border-primary/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isBest && <Star className="w-3 h-3 text-primary fill-primary/30" />}
                      <span className={`text-[11px] font-medium ${s.saldo === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>{r.name}</span>
                      <span className="text-[9px] text-muted-foreground">{cargo?.name}</span>
                      {isBest && <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">Melhor opção</span>}
                    </div>
                    <SaldoBadge saldo={s.saldo} capacidade={s.capacidade} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[8px] text-muted-foreground">
                    <span>Cap: {s.capacidade}h</span><span>Aloc: {s.alocado}h</span>
                    {s.indisponivel > 0 && <span className="text-status-warning">Indisp: {s.indisponivel}h</span>}
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden flex">
                      <div className="h-1.5 bg-primary" style={{ width: `${Math.min(s.alocado / s.capacidade * 100, 100)}%` }} />
                      <div className="h-1.5 bg-status-warning" style={{ width: `${Math.min(s.indisponivel / s.capacidade * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>);

          })}
          </div>
        }
      </div>
      }

      {!isGestaoCorporativaDR && (
      !showAdd ?
      <button onClick={() => setShowAdd(true)} disabled={recursosDisponiveis.length === 0 || horasRestantes <= 0}
      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <UserPlus className="w-3.5 h-3.5" /> Alocar pessoa nesta atividade
        </button> :

      <div className="border border-primary/20 bg-primary/3 rounded-md p-3 space-y-2">
          <p className="text-[11px] font-medium text-foreground flex items-center gap-1"><UserPlus className="w-3.5 h-3.5 text-primary" /> Nova alocação</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Pessoa</label>
              <select value={selRecurso} onChange={(e) => setSelRecurso(e.target.value)} className="w-full border border-input rounded-md text-[11px] p-1.5 bg-background mt-0.5">
                <option value="">Selecionar...</option>
                {sortedDisponiveis.filter((r) => getRecursoSaldo(r.id).saldo > 0).map((r) => {
                const s = getRecursoSaldo(r.id);
                return <option key={r.id} value={r.id}>{r.name} — {r.role} ({s.saldo}h livres)</option>;
              })}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Horas</label>
              <input type="number" min={1} max={horasRestantes} value={selHoras} onChange={(e) => setSelHoras(Number(e.target.value))}
            className="w-full border border-input rounded-md text-[11px] p-1.5 bg-background mt-0.5 font-data" />
            </div>
          </div>
          {selRecurso && (() => {const s = getRecursoSaldo(selRecurso);if (selHoras > s.saldo) return <p className="text-[10px] text-status-danger flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Excede saldo ({s.saldo}h livres)</p>;return null;})()}
          <div className="flex gap-2 justify-end flex-wrap">
            <button onClick={() => {setShowAdd(false);setSelRecurso("");}} className="text-[11px] px-3 py-1.5 border border-border rounded-md text-foreground hover:bg-accent">Cancelar</button>
            <button onClick={() => {onAlocar(contratoId, atv.id, selRecurso, selHoras); if (isCoordenador) { setAlocacaoEfetivaId(selRecurso); setMobilidadeEfetivada(true); } setShowAdd(false);setSelRecurso("");}} disabled={!selRecurso || selHoras <= 0}
          className="text-[11px] px-3 py-1.5 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50">Confirmar alocação</button>
            {isCoordenador && (
              <button onClick={() => setShowMobilidadeModal(true)}
                className="text-[11px] px-3 py-1.5 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 transition-colors">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Solicitar Mobilidade</span>
              </button>
            )}
          </div>
        </div>)
      }

      {/* Modal Solicitar Mobilidade */}
      {isCoordenador && (
        <Dialog open={showMobilidadeModal} onOpenChange={setShowMobilidadeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Solicitar Mobilidade</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Preencha os campos obrigatórios para solicitar a mobilidade.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-[11px] font-medium text-foreground">Data de Início Prevista <span className="text-red-500">*</span></label>
                <input type="date" value={mobDataInicio} onChange={(e) => setMobDataInicio(e.target.value)}
                  className="w-full border border-input rounded-md text-[12px] p-2 bg-background mt-1" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-foreground">Data de Fim Prevista <span className="text-red-500">*</span></label>
                <input type="date" value={mobDataFim} onChange={(e) => setMobDataFim(e.target.value)}
                  className="w-full border border-input rounded-md text-[12px] p-2 bg-background mt-1" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-foreground">UO de Destino <span className="text-red-500">*</span></label>
                <select value={mobUO} onChange={(e) => setMobUO(e.target.value)}
                  className="w-full border border-input rounded-md text-[12px] p-2 bg-background mt-1">
                  <option value="">Selecionar UO...</option>
                  {UOS.map((uo, idx) => (
                    <option key={uo.id} value={uo.id}>{uo.name} — {(idx + 1) * 12}km</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <button onClick={() => { setShowMobilidadeModal(false); setMobDataInicio(""); setMobDataFim(""); setMobUO(""); }}
                className="text-[11px] px-4 py-2 border border-border rounded-md text-foreground hover:bg-accent">Cancelar</button>
              <button
                disabled={!mobDataInicio || !mobDataFim || !mobUO}
                onClick={() => {
                  setMobilidadeEfetivada(true);
                  setMobilidadePendenteUO(mobUO);
                  setShowMobilidadeModal(false);
                  setShowAdd(false);
                  setSelRecurso("");
                  setMobDataInicio(""); setMobDataFim(""); setMobUO("");
                  toast.success("Mobilidade solicitada com sucesso!");
                }}
                className="text-[11px] px-4 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Solicitar
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>);

}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function ContratosPage({ singleContractId }: {singleContractId?: string;} = {}) {
  const isDetailMode = !!singleContractId;
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const isGestaoCorporativaDR = currentProfile.role === "backoffice_dr";
  const isCoordenador = currentProfile.role === "coordenador";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  // Coordenador: multi-select UO filter
  const [selectedUos, setSelectedUos] = useState<string[]>([]);
  // Coordenador: "Sem alocação" filter
  const [semAlocacaoFilter, setSemAlocacaoFilter] = useState(false);
  // Coordenador: Serviço filter
  const [servicoFilter, setServicoFilter] = useState<string>("todos");
  // Coordenador: date period filter
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [contractTypeFilter, setContractTypeFilter] = useState<ContractTypeFilter>("todos");
  const [expandedContract, setExpandedContract] = useState<string | null>(singleContractId ?? null);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [expandedEntregas, setExpandedEntregas] = useState<Set<string>>(new Set());
  const [expandedAtividades, setExpandedAtividades] = useState<Set<string>>(new Set());
  const { alocacoesAtv, setAlocacoesAtv } = useAlocacoesAtividade();
  const { execucoes, setExecucoes } = useExecucoes();
  const [contractTab, setContractTab] = useState<ContractTab>("padrao");

  // ── Contract standard overrides (local state — editable by Facilitador) ──
  const [contratoConfigs, setContratoConfigs] = useState<ContratoAtividadeConfig[]>([...CONTRATO_ATIVIDADE_CONFIGS]);
  const [editingHoras, setEditingHoras] = useState<Record<string, number>>({});
  const [savedContracts, setSavedContracts] = useState<Set<string>>(new Set());

  // ── Entrega edit modal (DR profile only) ──
  const [editEntregaModal, setEditEntregaModal] = useState<{entregaId: string;contratoId: string;} | null>(null);
  const [editEntregaName, setEditEntregaName] = useState("");
  const [editEntregaCode, setEditEntregaCode] = useState("");
  const [editEntregaStatus, setEditEntregaStatus] = useState<"ativa" | "rascunho" | "inativa">("ativa");
  const [localEntregaEdits, setLocalEntregaEdits] = useState<Record<string, {name: string;code: string;status: "ativa" | "rascunho" | "inativa";}>>({});

  // ── DR Padrão DR inline overrides ──
  const DR_ENTREGA_STORAGE_KEY = "gr-contratos-dr-entrega-overrides";
  const [drEntregaOverrides, setDrEntregaOverrides] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(DR_ENTREGA_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}
    return {};
  });
  const [drAtividadeOverrides, setDrAtividadeOverrides] = useState<Record<string, number>>({});
  const [editingDrKey, setEditingDrKey] = useState<string | null>(null);
  const [editingDrRawValue, setEditingDrRawValue] = useState<string>("");

  // DR display helpers
  const getDisplayedDrHoras = (realValue: number) => isGestaoCorporativaDR ? 0 : realValue;

  const getDisplayedDrHorasEntrega = (entregaId: string, realValue: number) => {
    if (!isGestaoCorporativaDR) return realValue;
    if (drEntregaOverrides[entregaId] !== undefined) return drEntregaOverrides[entregaId];
    return 0;
  };

  const getDisplayedDrHorasAtividade = (atividadeId: string, realValue: number) => {
    if (!isGestaoCorporativaDR) return realValue;
    if (drAtividadeOverrides[atividadeId] !== undefined) return drAtividadeOverrides[atividadeId];
    return 0;
  };

  /** Returns DR hours for an entrega, using overrides if DR or Coordenador */
  const getDisplayedDrHorasEntregaAgg = (entregaId: string) => {
    if (isGestaoCorporativaDR || isCoordenador) {
      if (drEntregaOverrides[entregaId] !== undefined) return drEntregaOverrides[entregaId];
      const atvs = getAtividadesByEntrega(entregaId);
      if (isGestaoCorporativaDR) {
        return atvs.reduce((s, a) => s + (drAtividadeOverrides[a.id] !== undefined ? drAtividadeOverrides[a.id] : 0), 0);
      }
      // Coordenador: use atv overrides if available, otherwise default
      return atvs.reduce((s, a) => s + (drAtividadeOverrides[a.id] !== undefined ? drAtividadeOverrides[a.id] : a.timeHours), 0);
    }
    return getSumHoursForEntrega(entregaId);
  };

  const getDisplayedDrHorasServicoAgg = (servicoId: string) => {
    if (isGestaoCorporativaDR || isCoordenador) {
      return getEntregasByServico(servicoId).reduce((s, e) => s + getDisplayedDrHorasEntregaAgg(e.id), 0);
    }
    return getSumHoursForServico(servicoId);
  };

  const getDisplayedDrHorasContratoAgg = (contrato: Contrato) => {
    if (isGestaoCorporativaDR || isCoordenador) {
      return SERVICOS.filter((s) => contrato.services.includes(s.id)).reduce((s, sv) => s + getDisplayedDrHorasServicoAgg(sv.id), 0);
    }
    return SERVICOS.filter((s) => contrato.services.includes(s.id)).reduce((s, sv) => s + getSumHoursForServico(sv.id), 0);
  };

  // Persist drEntregaOverrides to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(DR_ENTREGA_STORAGE_KEY, JSON.stringify(drEntregaOverrides));
    } catch {}
  }, [drEntregaOverrides]);

  const startDrEdit = (key: string, currentValue: number) => {
    setEditingDrKey(key);
    setEditingDrRawValue(currentValue === 0 ? "" : String(currentValue));
  };

  const cancelDrEdit = () => {
    setEditingDrKey(null);
    setEditingDrRawValue("");
  };

  const saveDrEntregaEdit = (entregaId: string) => {
    const parsed = parseFloat(editingDrRawValue);
    if (editingDrRawValue.trim() === "" || isNaN(parsed)) {
      toast.error("Informe o valor do Padrão DR");
      return;
    }
    if (parsed < 0) {
      toast.error("O valor não pode ser negativo");
      return;
    }
    setDrEntregaOverrides((prev) => ({ ...prev, [entregaId]: parsed }));
    setEditingDrKey(null);
    toast.success("Padrão DR atualizado");
  };

  const getDisplayedEntrega = (entrega: typeof ENTREGAS[0]) => {
    const edit = localEntregaEdits[entrega.id];
    return edit ? { ...entrega, ...edit } : entrega;
  };

  const openEntregaEditModal = (entrega: typeof ENTREGAS[0], contratoId: string) => {
    const displayed = getDisplayedEntrega(entrega);
    setEditEntregaName(displayed.name);
    setEditEntregaCode(displayed.code);
    setEditEntregaStatus(displayed.status);
    setEditEntregaModal({ entregaId: entrega.id, contratoId });
  };

  const saveEntregaEdit = () => {
    if (!editEntregaModal) return;
    setLocalEntregaEdits((prev) => ({
      ...prev,
      [editEntregaModal.entregaId]: { name: editEntregaName, code: editEntregaCode, status: editEntregaStatus }
    }));
    setEditEntregaModal(null);
    toast.success("Entrega atualizada com sucesso");
  };

  // ── Ocorrências adicionais (contract-scoped, derived from DR activities) ──
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaAdicional[]>([]);
  const [showOcorrenciaDialog, setShowOcorrenciaDialog] = useState<{
    contratoId: string;entregaId: string;servicoId: string;atividadeBaseId: string;
  } | null>(null);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaHoras, setNovaHoras] = useState(0);

  // ── Programação temporal das atividades no contrato ──
  const [programacoes, setProgramacoes] = useState<ProgramacaoAtividade[]>([]);

  const getProgramacao = (contratoId: string, atividadeId: string): ProgramacaoAtividade | undefined =>
  programacoes.find((p) => p.contratoId === contratoId && p.atividadeId === atividadeId);

  const setProgramacao = (contratoId: string, atividadeId: string, dataInicio: Date, dataFim: Date) => {
    setProgramacoes((prev) => {
      const idx = prev.findIndex((p) => p.contratoId === contratoId && p.atividadeId === atividadeId);
      const entry: ProgramacaoAtividade = {
        contratoId, atividadeId, dataInicio, dataFim,
        definidoPor: "Facilitador do Processo",
        definidoEm: new Date().toLocaleString("pt-BR")
      };
      if (idx >= 0) {const u = [...prev];u[idx] = entry;return u;}
      return [...prev, entry];
    });
  };

  const removeProgramacao = (contratoId: string, atividadeId: string) => {
    setProgramacoes((prev) => prev.filter((p) => !(p.contratoId === contratoId && p.atividadeId === atividadeId)));
  };

  const getDistribuicao = useCallback((contratoId: string, atividadeId: string, totalHoras: number): CompetenciaDistribuicao[] => {
    const prog = getProgramacao(contratoId, atividadeId);
    if (!prog) return [];
    return calcDistribuicaoMensal(prog.dataInicio, prog.dataFim, totalHoras);
  }, [programacoes]);

  const getOcorrenciasByAtividade = (contratoId: string, atividadeBaseId: string) =>
  ocorrencias.filter((o) => o.contratoId === contratoId && o.atividadeBaseId === atividadeBaseId);

  const getAdicionaisByEntrega = (contratoId: string, entregaId: string) =>
  ocorrencias.filter((o) => o.contratoId === contratoId && o.entregaId === entregaId);

  const getAdicionaisByServico = (contratoId: string, servicoId: string) => {
    const entregas = getEntregasByServico(servicoId);
    return ocorrencias.filter((o) => o.contratoId === contratoId && entregas.some((e) => e.id === o.entregaId));
  };

  const getSumAdicionaisEntrega = (contratoId: string, entregaId: string) =>
  getAdicionaisByEntrega(contratoId, entregaId).reduce((s, o) => s + o.horasContrato, 0);

  const getSumAdicionaisServico = (contratoId: string, servicoId: string) =>
  getAdicionaisByServico(contratoId, servicoId).reduce((s, o) => s + o.horasContrato, 0);

  const getSumAdicionaisContrato = (contratoId: string) =>
  ocorrencias.filter((o) => o.contratoId === contratoId).reduce((s, o) => s + o.horasContrato, 0);

  const isAdicional = (atvId: string) => atvId.startsWith("ocr-");

  const openOcorrenciaDialog = (contratoId: string, entregaId: string, servicoId: string, atividadeBaseId: string) => {
    const base = ATIVIDADES.find((a) => a.id === atividadeBaseId);
    setShowOcorrenciaDialog({ contratoId, entregaId, servicoId, atividadeBaseId });
    setNovaDescricao("");
    setNovaHoras(base?.timeHours ?? 2);
  };

  const handleAddOcorrencia = () => {
    if (!showOcorrenciaDialog || !novaDescricao.trim()) return;
    const { contratoId, entregaId, atividadeBaseId } = showOcorrenciaDialog;
    const base = ATIVIDADES.find((a) => a.id === atividadeBaseId);
    if (!base) return;
    const count = ocorrencias.filter((o) => o.contratoId === contratoId && o.atividadeBaseId === atividadeBaseId).length;
    const nova: OcorrenciaAdicional = {
      id: `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      contratoId,
      entregaId,
      atividadeBaseId,
      descricao: novaDescricao.trim(),
      horasContrato: novaHoras,
      horasDR: base.timeHours,
      cargosPermitidos: [...base.cargosPermitidos],
      criadoPor: "Facilitador do Processo",
      criadoEm: new Date().toLocaleString("pt-BR")
    };
    setOcorrencias((prev) => [...prev, nova]);
    toast.success("Ocorrência adicional criada", { description: `${base.name} — ${nova.descricao} (${nova.horasContrato}h)` });
    setShowOcorrenciaDialog(null);
    setNovaDescricao("");
    setNovaHoras(0);
  };

  const updateOcorrenciaHoras = (ocrId: string, horas: number) => {
    setOcorrencias((prev) => prev.map((o) => o.id === ocrId ? { ...o, horasContrato: horas } : o));
  };

  const removeOcorrencia = (ocrId: string) => {
    setOcorrencias((prev) => prev.filter((o) => o.id !== ocrId));
    toast.info("Ocorrência adicional removida");
  };

  // Get horas for a contract+activity from local state
  const getLocalHoras = (contratoId: string, atividadeId: string): {horas: number;customizado: boolean;} => {
    // Check ocorrências adicionais first
    const ocr = ocorrencias.find((o) => o.id === atividadeId);
    if (ocr) return { horas: ocr.horasContrato, customizado: true };
    const cfg = contratoConfigs.find((c) => c.contratoId === contratoId && c.atividadeId === atividadeId);
    if (cfg) return { horas: cfg.horasAplicaveis, customizado: true };
    const atv = ATIVIDADES.find((a) => a.id === atividadeId);
    return { horas: atv?.timeHours ?? 0, customizado: false };
  };

  const getLocalSumEntrega = (contratoId: string, entregaId: string): number => {
    const base = getAtividadesByEntrega(entregaId).reduce((sum, a) => sum + getLocalHoras(contratoId, a.id).horas, 0);
    const adicionais = getSumAdicionaisEntrega(contratoId, entregaId);
    return base + adicionais;
  };

  const getLocalSumServico = (contratoId: string, servicoId: string): number => {
    const base = getEntregasByServico(servicoId).reduce((sum, e) => {
      return sum + getAtividadesByEntrega(e.id).reduce((s, a) => s + getLocalHoras(contratoId, a.id).horas, 0);
    }, 0);
    const adicionais = getSumAdicionaisServico(contratoId, servicoId);
    return base + adicionais;
  };

  const setAtvHoras = (contratoId: string, atividadeId: string, horas: number) => {
    setContratoConfigs((prev) => {
      const idx = prev.findIndex((c) => c.contratoId === contratoId && c.atividadeId === atividadeId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], horasAplicaveis: horas };
        return updated;
      }
      return [...prev, { id: `cac-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, contratoId, atividadeId, horasAplicaveis: horas }];
    });
  };

  const resetAtvHoras = (contratoId: string, atividadeId: string) => {
    setContratoConfigs((prev) => prev.filter((c) => !(c.contratoId === contratoId && c.atividadeId === atividadeId)));
  };

  const resetEntregaHoras = (contratoId: string, entregaId: string) => {
    const atvIds = getAtividadesByEntrega(entregaId).map((a) => a.id);
    setContratoConfigs((prev) => prev.filter((c) => !(c.contratoId === contratoId && atvIds.includes(c.atividadeId))));
  };

  const adjustEntregaHoras = (contratoId: string, entregaId: string, newTotal: number) => {
    const atvs = getAtividadesByEntrega(entregaId);
    const currentTotal = atvs.reduce((s, a) => s + getLocalHoras(contratoId, a.id).horas, 0);
    if (currentTotal === 0 || atvs.length === 0) return;
    const factor = newTotal / currentTotal;
    atvs.forEach((a) => {
      const current = getLocalHoras(contratoId, a.id).horas;
      const newHoras = Math.max(Math.round(current * factor * 2) / 2, 0.5); // round to 0.5
      setAtvHoras(contratoId, a.id, newHoras);
    });
  };

  const saveContractStandard = (contratoId: string) => {
    setSavedContracts((prev) => new Set(prev).add(contratoId));
    toast.success("Padrão do contrato salvo", { description: "Este padrão será usado como referência para alocação e execução." });
  };

  const hasUnsavedChanges = (contratoId: string) => {
    return contratoConfigs.some((c) => c.contratoId === contratoId) && !savedContracts.has(contratoId);
  };

  // Batch state
  const [selectedAtvs, setSelectedAtvs] = useState<Set<string>>(new Set());
  const [quickFilterStatus, setQuickFilterStatus] = useState<"todos" | "pendente" | "parcial" | "completo">("todos");
  const [quickFilterResponsavel, setQuickFilterResponsavel] = useState<string>("todos");
  const [batchPerson, setBatchPerson] = useState("");
  const [showBatchDialog, setShowBatchDialog] = useState<"apply_person" | "swap" | null>(null);
  const [swapFrom, setSwapFrom] = useState("");
  const [swapTo, setSwapTo] = useState("");
  const [teamSort, setTeamSort] = useState<TeamSort>("saldo_desc");
  const [uoFilter, setUoFilter] = useState<string>("todos");

  // Helper to parse dd/MM/yyyy to Date
  const parseDateBR = (d: string) => { const p = d.split("/"); return p.length === 3 ? new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])) : null; };

  const ativos = CONTRATOS.filter((c) => c.status === "ativo").length;
  const pendentesAloc = ALOCACOES.filter((a) => a.status === "pendente").length;
  const totalContratado = CONTRATOS.filter((c) => c.status !== "encerrado").reduce((a, c) => a + c.hoursContracted, 0);

  const toggleExpand = (id: string) => {
    if (!isDetailMode) {
      navigate(`/contratos/${id}`);
      return;
    }
    setExpandedContract((prev) => prev === id ? null : id);
    setContractTab("padrao");
    setSelectedAtvs(new Set());
  };
  const toggleService = (key: string) => setExpandedServices((prev) => {const n = new Set(prev);n.has(key) ? n.delete(key) : n.add(key);return n;});
  const toggleEntrega = (key: string) => setExpandedEntregas((prev) => {const n = new Set(prev);n.has(key) ? n.delete(key) : n.add(key);return n;});
  const toggleAtividade = (key: string) => setExpandedAtividades((prev) => {const n = new Set(prev);n.has(key) ? n.delete(key) : n.add(key);return n;});

  const toggleSelectAtv = (contratoId: string, atvId: string) => {
    const key = `${contratoId}::${atvId}`;
    setSelectedAtvs((prev) => {const n = new Set(prev);n.has(key) ? n.delete(key) : n.add(key);return n;});
  };
  const isAtvSelected = (contratoId: string, atvId: string) => selectedAtvs.has(`${contratoId}::${atvId}`);
  const clearSelection = () => setSelectedAtvs(new Set());

  const selectAllPendentes = (contratoId: string) => {
    const contrato = CONTRATOS.find((c) => c.id === contratoId);
    if (!contrato) return;
    const newSet = new Set(selectedAtvs);
    SERVICOS.filter((s) => contrato.services.includes(s.id)).forEach((sv) => {
      getEntregasByServico(sv.id).forEach((e) => {
        if (isCoordenador) {
          // Coordenador: select entregas
          const atvs = getAtividadesByEntrega(e.id);
          const totalHoras = atvs.reduce((s, atv) => {const { horas } = getLocalHoras(contratoId, atv.id);return s + horas;}, 0);
          const totalAloc = atvs.reduce((s, atv) => s + alocacoesAtv.filter((a) => a.contratoId === contratoId && a.atividadeId === atv.id && a.status === "alocado").reduce((ss, a) => ss + a.horasAlocadas, 0), 0);
          if (totalAloc < totalHoras) newSet.add(`${contratoId}::${e.id}`);
        } else {
          getAtividadesByEntrega(e.id).forEach((atv) => {
            const alocs = alocacoesAtv.filter((a) => a.contratoId === contratoId && a.atividadeId === atv.id && a.status === "alocado");
            const { horas } = getLocalHoras(contratoId, atv.id);
            if (alocs.reduce((s, a) => s + a.horasAlocadas, 0) < horas) newSet.add(`${contratoId}::${atv.id}`);
          });
        }
      });
    });
    setSelectedAtvs(newSet);
  };

  // Allocation handlers
  const handleAlocar = (contratoId: string, atividadeId: string, recursoId: string, horas: number) => {
    const rec = getRecursoById(recursoId);
    const newAloc: AlocacaoAtividade = { id: `aa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, contratoId, atividadeId, recursoId, horasAlocadas: horas, status: "alocado" };
    setAlocacoesAtv((prev) => [...prev, newAloc]);

    // Create Execucao entry for the Técnico if not already existing
    if (rec && horas > 0) {
      const atv = ATIVIDADES.find(a => a.id === atividadeId);
      const entrega = atv ? ENTREGAS.find(e => e.id === atv.entregaId) : undefined;
      const servico = entrega ? SERVICOS.find(s => s.id === entrega.servicoId) : undefined;
      const contrato = CONTRATOS.find(c => c.id === contratoId);
      const alreadyExists = execucoes.some(ex => ex.atividadeId === atividadeId && ex.resourceId === recursoId && ex.contratoCode === contrato?.code);
      if (!alreadyExists && atv && entrega && servico && contrato) {
        const today = format(new Date(), "dd/MM/yyyy");
        const competencia = format(new Date(), "MM/yyyy");
        const newExec: Execucao = {
          id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          atividadeId: atv.id,
          atividadeName: atv.name,
          atividadeCode: atv.code,
          entregaName: entrega.name,
          servicoName: servico.name,
          servicoCode: servico.code,
          contratoCode: contrato.code,
          clienteName: contrato.client,
          resourceId: rec.id,
          resourceName: rec.name,
          horasPlanejadas: horas,
          horasRealizadas: 0,
          status: "planejada",
          date: today,
          competencia,
          apontamentos: [],
          comentarios: [],
        };
        setExecucoes(prev => [...prev, newExec]);
      }
    }

    toast.success("Pessoa alocada", { description: `${rec?.name} — ${horas}h` });
  };
  const handleDesalocar = (alocId: string) => {
    const aloc = alocacoesAtv.find((a) => a.id === alocId);
    const rec = aloc ? getRecursoById(aloc.recursoId) : null;
    setAlocacoesAtv((prev) => prev.filter((a) => a.id !== alocId));
    toast.info("Alocação removida", { description: rec?.name });
  };
  const handleSubstituir = (alocId: string, novoRecursoId: string) => {
    const novoRec = getRecursoById(novoRecursoId);
    setAlocacoesAtv((prev) => prev.map((a) => a.id === alocId ? { ...a, recursoId: novoRecursoId } : a));
    toast.success("Responsável substituído", { description: `Novo: ${novoRec?.name}` });
  };

  const getAtvAlocacoes = (contratoId: string, atividadeId: string) =>
  alocacoesAtv.filter((a) => a.contratoId === contratoId && a.atividadeId === atividadeId && a.status === "alocado");

  const getAtvAllocStatus = (contratoId: string, atvId: string) => {
    const alocs = getAtvAlocacoes(contratoId, atvId);
    const { horas } = getLocalHoras(contratoId, atvId);
    const horasAloc = alocs.reduce((s, a) => s + a.horasAlocadas, 0);
    if (horasAloc === 0) return "pendente";
    if (horasAloc >= horas) return "completo";
    return "parcial";
  };

  const passesQuickFilter = (contratoId: string, atvId: string) => {
    if (contractTab !== "acoes") return true;
    const status = getAtvAllocStatus(contratoId, atvId);
    if (quickFilterStatus !== "todos" && status !== quickFilterStatus) return false;
    if (quickFilterResponsavel !== "todos") {
      const alocs = getAtvAlocacoes(contratoId, atvId);
      if (!alocs.some((a) => a.recursoId === quickFilterResponsavel)) return false;
    }
    return true;
  };

  const handleBatchApplyPerson = () => {
    if (!batchPerson) return;
    let count = 0;
    selectedAtvs.forEach((key) => {
      const [cId, aId] = key.split("::");
      const existing = getAtvAlocacoes(cId, aId);
      const { horas } = getLocalHoras(cId, aId);
      const rest = horas - existing.reduce((s, a) => s + a.horasAlocadas, 0);
      if (rest <= 0 || existing.some((a) => a.recursoId === batchPerson)) return;
      const comp = getRecursosCompativeisParaAtividade(aId);
      if (!comp.some((r) => r.id === batchPerson)) return;
      handleAlocar(cId, aId, batchPerson, rest);
      count++;
    });
    const rec = getRecursoById(batchPerson);
    toast.success(`Responsável aplicado`, { description: `${rec?.name} → ${count} atividade(s)` });
    setShowBatchDialog(null);setBatchPerson("");clearSelection();
  };

  const handleBatchSwap = () => {
    if (!swapFrom || !swapTo) return;
    let count = 0;
    setAlocacoesAtv((prev) => prev.map((a) => {
      if (selectedAtvs.has(`${a.contratoId}::${a.atividadeId}`) && a.recursoId === swapFrom) {count++;return { ...a, recursoId: swapTo };}
      return a;
    }));
    toast.success(`Troca em lote`, { description: `${count} substituição(ões)` });
    setShowBatchDialog(null);setSwapFrom("");setSwapTo("");clearSelection();
  };

  const allAllocatedPeople = useMemo(() => {
    const ids = new Set(alocacoesAtv.map((a) => a.recursoId));
    return Array.from(ids).map((id) => getRecursoById(id)).filter(Boolean);
  }, [alocacoesAtv]);

  const getContractAllocStats = (contrato: Contrato) => {
    const services = SERVICOS.filter((s) => contrato.services.includes(s.id));
    let totalAtvs = 0,alocadas = 0,parciais = 0,pendentes = 0,totalHorasContrato = 0,totalHorasAlocadas = 0,horasAdicionais = 0;
    services.forEach((sv) => {
      getEntregasByServico(sv.id).forEach((e) => {
        getAtividadesByEntrega(e.id).forEach((atv) => {
          totalAtvs++;
          const { horas } = getLocalHoras(contrato.id, atv.id);
          totalHorasContrato += horas;
          const alocs = alocacoesAtv.filter((a) => a.contratoId === contrato.id && a.atividadeId === atv.id && a.status === "alocado");
          const horasAloc = alocs.reduce((s, a) => s + a.horasAlocadas, 0);
          totalHorasAlocadas += horasAloc;
          if (horasAloc === 0) pendentes++;else
          if (horasAloc >= horas) alocadas++;else
          parciais++;
        });
        // Additional activities
        getAdicionaisByEntrega(contrato.id, e.id).forEach((extra) => {
          totalAtvs++;
          totalHorasContrato += extra.horasContrato;
          horasAdicionais += extra.horasContrato;
          const alocs = alocacoesAtv.filter((a) => a.contratoId === contrato.id && a.atividadeId === extra.id && a.status === "alocado");
          const horasAloc = alocs.reduce((s, a) => s + a.horasAlocadas, 0);
          totalHorasAlocadas += horasAloc;
          if (horasAloc === 0) pendentes++;else
          if (horasAloc >= extra.horasContrato) alocadas++;else
          parciais++;
        });
      });
    });
    return { totalAtvs, alocadas, parciais, pendentes, totalHorasContrato, totalHorasAlocadas, horasAdicionais };
  };

  const getContractTeam = (contratoId: string) => {
    const alocs = alocacoesAtv.filter((a) => a.contratoId === contratoId && a.status === "alocado");
    const ids = new Set(alocs.map((a) => a.recursoId));
    return Array.from(ids).map((id) => {
      const rec = getRecursoById(id);
      const horasNeste = alocs.filter((a) => a.recursoId === id).reduce((s, a) => s + a.horasAlocadas, 0);
      return rec ? { ...rec, horasNesteContrato: horasNeste } : null;
    }).filter(Boolean);
  };

  // Count adjustments in a contract
  const countAdjustments = (contratoId: string) => contratoConfigs.filter((c) => c.contratoId === contratoId).length;

  const filtered = CONTRATOS.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.code.toLowerCase().includes(q) || c.client.toLowerCase().includes(q) || c.cot.toLowerCase().includes(q);
    const matchStatus = statusFilter === "todos" || (statusFilter === "vencido" ? isContratoVencido(c) : c.status === statusFilter);
    const matchUo = (isCoordenador || isGestaoCorporativaDR)
      ? (selectedUos.length === 0 || selectedUos.includes(c.uo))
      : (uoFilter === "todos" || c.uo === uoFilter);
    const matchType = contractTypeFilter === "todos" || getContractType(c.id).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === contractTypeFilter;
    const matchSemAlocacao = !semAlocacaoFilter || (() => {
      const stats = getContractAllocStats(c);
      return stats.totalHorasAlocadas === 0;
    })();
    const matchServico = servicoFilter === "todos" || c.services.includes(servicoFilter);
    const matchPeriodo = (() => {
      if (!periodoInicio && !periodoFim) return true;
      const cStart = parseDateBR(c.startDate);
      const cEnd = parseDateBR(c.endDate);
      if (!cStart || !cEnd) return true;
      if (periodoInicio) { const fStart = new Date(periodoInicio); if (cEnd < fStart) return false; }
      if (periodoFim) { const fEnd = new Date(periodoFim); if (cStart > fEnd) return false; }
      return true;
    })();
    return matchSearch && matchStatus && matchUo && matchType && matchSemAlocacao && matchServico && matchPeriodo;
  });

  // In detail mode, only show the single contract
  const displayedContracts = isDetailMode ?
  CONTRATOS.filter((c) => c.id === singleContractId) :
  filtered;

  return (
    <div className={isDetailMode ? "" : "max-w-7xl"}>
      {!isDetailMode &&
      <>
      <PageHeader
          title="Contratos"
          description="Defina o padrão operacional dos contratos e acompanhe a equipe e a execução" />

      {/* 4-layer legend */}
      



















        

      {/* Summary cards */}
      <div className={`grid gap-4 mb-5 ${isCoordenador ? 'grid-cols-5' : isGestaoCorporativaDR ? 'grid-cols-3' : 'grid-cols-4'}`}>
        <DataCard label="Contratos ativos" value={ativos} variant="success" />
        <DataCard label="Alocações pendentes" value={pendentesAloc} variant="warning" />
        {!(isGestaoCorporativaDR || isCoordenador) && <DataCard label="Horas contratadas" value={`${totalContratado}h`} />}
        <DataCard label="Contratos com ajuste" value={new Set(contratoConfigs.map((c) => c.contratoId)).size} sublabel={isCoordenador ? `${new Set(contratoConfigs.map((c) => {const atv = ATIVIDADES.find((a) => a.id === c.atividadeId);return atv?.entregaId;}).filter(Boolean)).size} etapa(s) ajustada(s)` : `${contratoConfigs.length} atividade(s) ajustada(s)`} />
        {isCoordenador &&
          <>
            <DataCard label="Sem alocação" value={CONTRATOS.filter((c) => c.status !== "encerrado").filter((ct) => {
              const stats = getContractAllocStats(ct);
              return stats.totalHorasAlocadas === 0;
            }).length} variant="danger" sublabel="Sem recurso alocado" />
            <DataCard label="Sem apontamento" value={CONTRATOS.filter((c) => c.status !== "encerrado").filter((ct) => {
              const stats = getContractAllocStats(ct);
              return stats.totalHorasAlocadas > 0 && stats.totalAtvs > 0;
            }).length} variant="warning" sublabel="Com alocação, sem horas" />
          </>
          }
      </div>

      {/* Toolbar */}
      {(isCoordenador || isGestaoCorporativaDR) ? (
        <div className="space-y-3 mb-4">
          {/* Row 1: Quick links + unified search */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {(["todos", "ativo", "encerrado", "vencido"] as const).map((f) =>
                <button key={f} onClick={() => setStatusFilter(f as StatusFilter)}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${statusFilter === f ? 'bg-foreground/8 text-foreground border border-border' : 'text-muted-foreground hover:text-foreground border border-transparent'}`}>
                  {f === "todos" ? "Todos" : f === "vencido" ? "Vencido" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Buscar empresa, COT ou código MV..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-72 pl-9 pr-4 py-2 border border-input rounded-lg text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          {/* Row 2: Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Multi-select UO */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg border border-border bg-card text-foreground hover:bg-accent transition-colors">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                {selectedUos.length === 0 ? "Todas as UOs" : `${selectedUos.length} UO(s)`}
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg p-2 z-50 hidden group-hover:block min-w-[180px]">
                {UOS.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-foreground hover:bg-accent rounded cursor-pointer">
                    <input type="checkbox" checked={selectedUos.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUos(prev => [...prev, u.id]);
                        else setSelectedUos(prev => prev.filter(id => id !== u.id));
                      }}
                      className="rounded border-input" />
                    {u.name}
                  </label>
                ))}
                {selectedUos.length > 0 && (
                  <button onClick={() => setSelectedUos([])} className="w-full text-left text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 mt-1 border-t border-border">
                    Limpar seleção
                  </button>
                )}
              </div>
            </div>
            <div className="w-px h-7 bg-border" />
            {/* Serviço filter */}
            <select value={servicoFilter} onChange={(e) => setServicoFilter(e.target.value)}
              className="px-2.5 py-1.5 text-[11px] rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="todos">Todos os Serviços</option>
              {SERVICOS.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </select>
            <div className="w-px h-7 bg-border" />
            {/* Tipo filter */}
            <select value={contractTypeFilter} onChange={(e) => setContractTypeFilter(e.target.value as ContractTypeFilter)}
              className="px-2.5 py-1.5 text-[11px] rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="todos">Todos os tipos</option>
              <option value="novo">Novo</option>
              <option value="renovacao">Renovação</option>
              <option value="indiferente">Indiferente</option>
            </select>
            {isCoordenador && (
              <>
                <div className="w-px h-7 bg-border" />
                {/* Sem alocação — only for Coordenador */}
                <button onClick={() => setSemAlocacaoFilter(!semAlocacaoFilter)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${semAlocacaoFilter ? 'bg-status-danger-muted text-status-danger border border-status-danger/30' : 'text-muted-foreground hover:text-foreground border border-border'}`}>
                  <Users className="w-3 h-3" /> Sem alocação
                </button>
              </>
            )}
            <div className="w-px h-7 bg-border" />
            {/* Date period */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <CalendarDays className="w-3 h-3 text-muted-foreground" />
              <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-border bg-card text-foreground text-[11px] focus:outline-none focus:ring-2 focus:ring-ring" />
              <span className="text-muted-foreground">até</span>
              <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-border bg-card text-foreground text-[11px] focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex gap-2 flex-wrap">
              <select value={uoFilter} onChange={(e) => setUoFilter(e.target.value)}
              className="px-2.5 py-1.5 text-[11px] rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="todos">Todas as UOs</option>
              {UOS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className="w-px h-7 bg-border" />
            {(["todos", "ativo", "em_implantacao", "encerrado", "vencido"] as StatusFilter[]).map((f) =>
              <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-2.5 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${statusFilter === f ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {f === "todos" ? "Todos" : f === "em_implantacao" ? "Implantação" : f === "vencido" ? "Vencido" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
              )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar contrato..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-56 pl-9 pr-4 py-2 border border-input rounded-lg text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      )}

      {!isDetailMode && filtered.length === 0 &&
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground">Nenhum contrato encontrado</p>
        </div>
        }
      </>
      }

      {/* ═══ Contract cards ═══ */}
      <div className="space-y-3">
        {displayedContracts.map((contrato) => {
          const isExpanded = isDetailMode ? true : expandedContract === contrato.id;
          const contratoServices = SERVICOS.filter((s) => contrato.services.includes(s.id));
          const contratoAlocacoes = ALOCACOES.filter((a) => a.contractId === contrato.id);
          const pendentes = contratoAlocacoes.filter((a) => a.status === "pendente").length;
          const totalPadraoContrato = contratoServices.reduce((s, sv) => s + getSumHoursForServico(sv.id), 0);
          const totalContratoLocal = contratoServices.reduce((s, sv) => s + getLocalSumServico(contrato.id, sv.id), 0);
          const uoName = UOS.find((u) => u.id === contrato.uo)?.name ?? contrato.uo;
          const hasAdjustments = totalContratoLocal !== totalPadraoContrato;
          const exceedsContracted = totalContratoLocal > contrato.hoursContracted;
          const adjustCount = countAdjustments(contrato.id);
          const allocStats = isExpanded ? getContractAllocStats(contrato) : null;
          const contractTeam = isExpanded ? getContractTeam(contrato.id) : [];

          return (
            <div key={contrato.id} className={`border rounded-lg overflow-hidden shadow-card ${exceedsContracted ? 'border-status-danger/30' : 'border-border'}`}>
              {!isDetailMode &&
              <button onClick={() => toggleExpand(contrato.id)}
              className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-accent/20 transition-colors text-left">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-foreground">{contrato.client}</span>
                      <span className="text-[11px] font-data text-muted-foreground">{contrato.code}</span>
                      {isCoordenador && <span className="text-[10px] font-data text-muted-foreground/70">{contrato.cot}</span>}
                      {contrato.status === "ativo" && <StatusBadge variant="success">Ativo</StatusBadge>}
                      {contrato.status === "em_implantacao" && <StatusBadge variant="info">Em implantação</StatusBadge>}
                      {contrato.status === "encerrado" && <StatusBadge variant="danger">Encerrado</StatusBadge>}
                      {isCoordenador && (() => {
                        const cType = getContractType(contrato.id);
                        const typeColor = cType === "Novo" ? "bg-status-success-muted text-status-success border-status-success/20" :
                        cType === "Renovação" ? "bg-primary/10 text-primary border-primary/20" :
                        "bg-muted text-muted-foreground border-border";
                        return <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${typeColor}`}>{cType}</span>;
                      })()}
                      {hasAdjustments && <ComparisonStatus padrao={totalPadraoContrato} aplicavel={totalContratoLocal} />}
                      {adjustCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/8 text-primary border border-primary/15 font-medium">{adjustCount} ajuste(s)</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
                      <span>{uoName}</span>
                      <span>{contratoServices.length} serviço(s)</span>
                      <span>{contrato.startDate} – {contrato.endDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {pendentes > 0 && <StatusBadge variant="warning">{pendentes} pendente(s)</StatusBadge>}
                  {exceedsContracted && <span className="text-[10px] text-status-danger flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Excede</span>}
                  {!(isGestaoCorporativaDR || isCoordenador) &&
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Contratado: <span className="font-data font-medium text-foreground">{contrato.hoursContracted}h</span></div>
                    <div className="text-[10px] flex items-center gap-1.5">
                      <span className="text-muted-foreground font-data">{totalPadraoContrato}h</span>
                      <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />
                      <span className={`font-data font-medium ${hasAdjustments ? 'text-primary' : 'text-foreground'}`}>{totalContratoLocal}h</span>
                    </div>
                  </div>
                  }
                  {isGestaoCorporativaDR || isCoordenador ?
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} /> :
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  }
                </div>
              </button>
              }

              {/* ═══ EXPANDED ═══ */}
              {isExpanded && allocStats &&
              <div className="border-t border-border">
                  {/* Summary block */}
                  <div className="bg-muted/10 px-5 py-4 border-b border-border">
                    <div className="grid grid-cols-6 gap-3">
                      {isGestaoCorporativaDR || isCoordenador ?
                    <div className="bg-card rounded-lg border border-border p-3 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Serviços</p>
                        <p className="font-data font-bold text-lg text-foreground mt-1">{contratoServices.length}</p>
                      </div> :

                    <div className="bg-card rounded-lg border border-border p-3 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Contrato</p>
                        <p className="font-data font-bold text-lg text-foreground mt-1">{contrato.hoursContracted}h</p>
                      </div>
                    }
                      <div className="bg-card rounded-lg border border-border p-3 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Padrão DR</p>
                        <p className="font-data font-bold text-lg text-muted-foreground mt-1">{isGestaoCorporativaDR || isCoordenador ? getDisplayedDrHorasContratoAgg(contrato) : totalPadraoContrato}h</p>
                        
                      </div>
                      {!isGestaoCorporativaDR &&
                    <div className={`bg-card rounded-lg border p-3 text-center ${hasAdjustments ? 'border-primary/30 bg-primary/3' : 'border-border'}`}>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{isCoordenador ? 'Previsão Contrato' : 'Padrão Contrato'}</p>
                        <p className={`font-data font-bold text-lg mt-1 ${hasAdjustments ? 'text-primary' : 'text-foreground'}`}>{totalContratoLocal}h</p>
                        {hasAdjustments}
                      </div>
                    }
                      {allocStats.horasAdicionais > 0 &&
                    <div className="bg-card rounded-lg border border-accent p-3 text-center bg-accent/10">
                          <p className="text-[9px] uppercase tracking-wider text-accent-foreground font-semibold">Adicionais</p>
                          <p className="font-data font-bold text-lg mt-1 text-accent-foreground">{allocStats.horasAdicionais}h</p>
                          <p className="text-[8px] text-muted-foreground mt-0.5">{ocorrencias.filter((o) => o.contratoId === contrato.id).length} ocorrência(s)</p>
                        </div>
                    }
                      <div className={`bg-card rounded-lg border p-3 text-center ${allocStats.totalHorasAlocadas > allocStats.totalHorasContrato ? 'border-status-danger/30' : 'border-border'}`}>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Realizadas</p>
                        <p className={`font-data font-bold text-lg mt-1 ${allocStats.totalHorasAlocadas > allocStats.totalHorasContrato ? 'text-status-danger' : 'text-foreground'}`}>{allocStats.totalHorasAlocadas}h</p>
                      </div>
                      <div className="bg-card rounded-lg border border-border p-3 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Saldo Aloc.</p>
                        <p className={`font-data font-bold text-lg mt-1 ${allocStats.totalHorasContrato - allocStats.totalHorasAlocadas < 0 ? 'text-status-danger' : 'text-status-success'}`}>
                          {allocStats.totalHorasContrato - allocStats.totalHorasAlocadas}h
                        </p>
                      </div>
                      <div className="bg-card rounded-lg border border-border p-3 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Progresso</p>
                        <p className="font-data font-bold text-lg text-foreground mt-1">
                          {allocStats.totalHorasContrato > 0 ? Math.round(allocStats.totalHorasAlocadas / allocStats.totalHorasContrato * 100) : 0}%
                        </p>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                          <div className={`h-1.5 rounded-full ${allocStats.totalHorasAlocadas > allocStats.totalHorasContrato ? 'bg-status-danger' : 'bg-primary'}`}
                        style={{ width: `${Math.min(allocStats.totalHorasContrato > 0 ? allocStats.totalHorasAlocadas / allocStats.totalHorasContrato * 100 : 0, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-[10px] text-muted-foreground">{allocStats.totalAtvs} atividade(s):</span>
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-status-success-muted text-status-success border border-status-success/20 font-medium"><CheckCircle2 className="w-3 h-3" /> {allocStats.alocadas} completa(s)</span>
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium"><TrendingUp className="w-3 h-3" /> {allocStats.parciais} parcial(is)</span>
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-status-warning-muted text-status-warning border border-status-warning/20 font-medium"><Clock className="w-3 h-3" /> {allocStats.pendentes} pendente(s)</span>
                    </div>
                    {exceedsContracted &&
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-status-danger-muted border border-status-danger/20 rounded-md text-[10px] text-status-danger font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Padrão do contrato excede o contratado em {totalContratoLocal - contrato.hoursContracted}h
                      </div>
                  }
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-0 border-b border-border bg-card">
                    {[
                  { key: "padrao" as ContractTab, icon: Edit3, label: isCoordenador || isGestaoCorporativaDR ? "Contrato" : "Padrão do Contrato" },
                  { key: "estrutura" as ContractTab, icon: Layers, label: "Alocação" },
                  ...(!isGestaoCorporativaDR ? [{ key: "acoes" as ContractTab, icon: CheckSquare, label: "Alocar em Lote" }] : []),
                  { key: "equipe" as ContractTab, icon: Users, label: "Equipe" }].
                  map((tab) =>
                  <button key={tab.key} onClick={() => {setContractTab(tab.key);if (tab.key !== "acoes") clearSelection();}}
                  className={`flex items-center gap-1.5 px-5 py-3 text-[11px] font-medium border-b-2 transition-colors ${contractTab === tab.key ?
                  'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                        <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                        {tab.key === "padrao" && !isGestaoCorporativaDR && hasUnsavedChanges(contrato.id) && <span className="w-1.5 h-1.5 rounded-full bg-status-warning" />}
                      </button>
                  )}
                  </div>

                  {/* ═══ TAB: Padrão do Contrato ═══ */}
                  {contractTab === "padrao" &&
                <div className="bg-muted/5">
                      {/* Explanation */}
                      






                  

                      {/* Save bar */}
                      {!isGestaoCorporativaDR &&
                  <div className="px-5 py-2 bg-card border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-medium text-foreground">{adjustCount} ajuste(s) neste contrato</span>
                          {hasUnsavedChanges(contrato.id) &&
                      <span className="text-[9px] px-2 py-0.5 rounded bg-status-warning-muted text-status-warning border border-status-warning/20 font-medium animate-pulse">Não salvo</span>
                      }
                          {savedContracts.has(contrato.id) &&
                      <span className="text-[9px] px-2 py-0.5 rounded bg-status-success-muted text-status-success border border-status-success/20 font-medium">✓ Salvo</span>
                      }
                        </div>
                        <button onClick={() => saveContractStandard(contrato.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                          <Save className="w-3.5 h-3.5" /> {isCoordenador ? 'Salvar como referência' : 'Salvar padrão do contrato'}
                        </button>
                      </div>
                  }

                      {/* Header row */}
                      <div className="flex items-center justify-between px-5 py-2 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>Serviço → Entrega → Atividade</span>
                        <div className="flex items-center gap-4">
                          <span className="w-20 text-right">Padrão DR</span>
                          {!isGestaoCorporativaDR &&
                      <>
                            <span className="w-24 text-right">{isCoordenador ? 'Previsão Contrato' : 'Padrão Contrato'}</span>
                            <span className="w-14 text-center">Desvio</span>
                            <span className="w-20 text-center">Status</span>
                          </>
                      }
                          <span className="w-10" />
                        </div>
                      </div>

                      {contratoServices.map((servico) => {
                    const sKey = `${contrato.id}-${servico.id}`;
                    const isSvcExp = expandedServices.has(sKey);
                    const serviceEntregas = getEntregasByServico(servico.id);
                    const drTotal = isCoordenador ? getDisplayedDrHorasServicoAgg(servico.id) : getSumHoursForServico(servico.id);
                    const ctTotal = getLocalSumServico(contrato.id, servico.id);

                    return (
                      <div key={servico.id} className="border-t border-border">
                            <button onClick={() => toggleService(sKey)}
                        className="w-full flex items-center justify-between px-5 py-3 pl-8 hover:bg-accent/10 transition-colors text-left">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <Package className="w-4 h-4 text-primary shrink-0" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-semibold text-foreground">{servico.name}</span>
                                    <span className="text-[11px] font-data text-muted-foreground">{servico.code}</span>
                                    <Lock className="w-3 h-3 text-muted-foreground/50" />
                                  </div>
                                   <span className="text-[11px] text-muted-foreground">{serviceEntregas.length} etapa(s)</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 shrink-0">
                                <span className="w-20 text-right font-data text-[12px] text-muted-foreground">{isGestaoCorporativaDR || isCoordenador ? getDisplayedDrHorasServicoAgg(servico.id) : drTotal}h</span>
                                {!isGestaoCorporativaDR &&
                            <>
                                  <span className={`w-24 text-right font-data text-[12px] font-semibold ${ctTotal !== drTotal ? 'text-primary' : 'text-foreground'}`}>{ctTotal}h</span>
                                  <span className={`w-14 text-center font-data text-[11px] ${ctTotal !== drTotal ? ctTotal > drTotal ? 'text-status-danger' : 'text-primary' : 'text-muted-foreground'}`}>
                                    {ctTotal !== drTotal ? `${ctTotal > drTotal ? '+' : ''}${ctTotal - drTotal}h` : '—'}
                                  </span>
                                  <div className="w-20 flex justify-center"><ComparisonStatus padrao={drTotal} aplicavel={ctTotal} /></div>
                                </>
                            }
                                <div className="w-10 flex justify-end">
                                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isSvcExp ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                            </button>

                            {isSvcExp &&
                        <div className="bg-background/50 border-t border-border">
                                {serviceEntregas.map((entrega) => {
                            const eKey = `${sKey}-${entrega.id}`;
                            const isEExp = expandedEntregas.has(eKey);
                            const atividades = getAtividadesByEntrega(entrega.id);
                            const eDR = isCoordenador ? getDisplayedDrHorasEntregaAgg(entrega.id) : getSumHoursForEntrega(entrega.id);
                            const eCT = getLocalSumEntrega(contrato.id, entrega.id);
                            const eEditKey = `entrega::${contrato.id}::${entrega.id}`;
                            const isEditingEntrega = editingHoras[eEditKey] !== undefined;

                            return (
                              <div key={entrega.id} className="border-b border-border/50 last:border-0">
                                      <div className="flex items-center justify-between px-5 py-2.5 pl-14 hover:bg-accent/10 transition-colors">
                                        <button onClick={() => toggleEntrega(eKey)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                          <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                          <span className="text-[12px] font-medium text-foreground">{(isGestaoCorporativaDR ? getDisplayedEntrega(entrega) : entrega).name}</span>
                                          <span className="text-[10px] font-data text-muted-foreground">{(isGestaoCorporativaDR ? getDisplayedEntrega(entrega) : entrega).code}</span>
                                        </button>
                                        <div className="flex items-center gap-4 shrink-0">
                                          {isGestaoCorporativaDR ?
                                    <>
                              {editingDrKey === `dr-entrega-${contrato.id}-${entrega.id}` ?
                                      <div className="w-20 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                  <input type="number" min={0} step={0.5} value={editingDrRawValue}
                                        onChange={(e) => setEditingDrRawValue(e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-14 text-right border border-primary rounded px-1 py-0.5 text-[11px] font-data bg-background" autoFocus />
                                                  <button onClick={() => saveDrEntregaEdit(entrega.id)}
                                        className="text-[9px] px-1.5 py-0.5 bg-primary text-primary-foreground rounded">✓</button>
                                                  <button onClick={cancelDrEdit}
                                        className="text-[9px] px-1 py-0.5 text-muted-foreground">✕</button>
                                                </div> :

                                      <span className="w-20 text-right font-data text-[11px] text-muted-foreground">{getDisplayedDrHorasEntregaAgg(entrega.id)}h</span>
                                      }
                                            </> :

                                    <>
                                              <span className="w-20 text-right font-data text-[11px] text-muted-foreground">{eDR}h</span>
                                              {isEditingEntrega ?
                                      <div className="w-24 flex items-center justify-end gap-1">
                                                  <input type="number" min={0} step={0.5} value={editingHoras[eEditKey]}
                                        onChange={(e) => setEditingHoras((prev) => ({ ...prev, [eEditKey]: Number(e.target.value) }))}
                                        className="w-14 text-right border border-primary rounded px-1 py-0.5 text-[11px] font-data bg-background" />
                                                  <button onClick={() => {
                                          adjustEntregaHoras(contrato.id, entrega.id, editingHoras[eEditKey]);
                                          setEditingHoras((prev) => {const n = { ...prev };delete n[eEditKey];return n;});
                                          toast.success(`Etapa ajustada: ${editingHoras[eEditKey]}h`);
                                        }} className="text-[9px] px-1.5 py-0.5 bg-primary text-primary-foreground rounded">✓</button>
                                                  <button onClick={() => setEditingHoras((prev) => {const n = { ...prev };delete n[eEditKey];return n;})}
                                        className="text-[9px] px-1 py-0.5 text-muted-foreground">✕</button>
                                                </div> :
                                      <span className={`w-24 text-right font-data text-[11px] font-medium ${eCT !== eDR ? 'text-primary' : 'text-foreground'}`}>{eCT}h</span>
                                      }
                                              <span className={`w-14 text-center font-data text-[10px] ${eCT !== eDR ? eCT > eDR ? 'text-status-danger' : 'text-primary' : 'text-muted-foreground'}`}>
                                                {eCT !== eDR ? `${eCT > eDR ? '+' : ''}${eCT - eDR}h` : '—'}
                                              </span>
                                              <div className="w-20 flex justify-center"><ComparisonStatus padrao={eDR} aplicavel={eCT} /></div>
                                            </>
                                    }
                                          <div className="w-10 flex justify-end gap-0.5">
                                            {isGestaoCorporativaDR ?
                                      editingDrKey !== `dr-entrega-${contrato.id}-${entrega.id}` &&
                                      <button onClick={(e) => {e.stopPropagation();startDrEdit(`dr-entrega-${contrato.id}-${entrega.id}`, getDisplayedDrHorasEntregaAgg(entrega.id));}}
                                      title="Editar Padrão DR"
                                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors">
                                                  <Pencil className="w-3 h-3" />
                                                </button> :


                                      <>
                                              {!isEditingEntrega &&
                                        <button onClick={() => setEditingHoras((prev) => ({ ...prev, [eEditKey]: eCT }))}
                                        title="Ajustar total da etapa"
                                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors">
                                                  <Pencil className="w-3 h-3" />
                                                </button>
                                        }
                                              {eCT !== eDR &&
                                        <button onClick={() => {
                                          if (isCoordenador) {
                                            const atvs = getAtividadesByEntrega(entrega.id);
                                            atvs.forEach((a) => {
                                              const drH = drAtividadeOverrides[a.id] !== undefined ? drAtividadeOverrides[a.id] : a.timeHours;
                                              setAtvHoras(contrato.id, a.id, drH);
                                            });
                                          } else {
                                            resetEntregaHoras(contrato.id, entrega.id);
                                          }
                                          toast.info("Etapa restaurada ao padrão DR");
                                        }}
                                        title="Restaurar padrão DR"
                                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                                                  <RotateCcw className="w-3 h-3" />
                                                </button>
                                        }
                                            </>
                                      }
                                          </div>
                                        </div>
                                      </div>

                                      {isEExp &&
                                <div className="divide-y divide-border/30">
                                          {atividades.map((atv) => {
                                    const atvKey = `${eKey}-${atv.id}`;
                                    const isAtvExp = expandedAtividades.has(atvKey);
                                    const drH = isCoordenador ? drAtividadeOverrides[atv.id] !== undefined ? drAtividadeOverrides[atv.id] : atv.timeHours : atv.timeHours;
                                    const { horas: ctH, customizado } = getLocalHoras(contrato.id, atv.id);
                                    const aEditKey = `atv::${contrato.id}::${atv.id}`;
                                    const isEditingAtv = editingHoras[aEditKey] !== undefined;
                                    const atvOcorrencias = getOcorrenciasByAtividade(contrato.id, atv.id);
                                    const atvAlocs = getAtvAlocacoes(contrato.id, atv.id);
                                    const horasAloc = atvAlocs.reduce((s, a) => s + a.horasAlocadas, 0);
                                    const alocPct = ctH > 0 ? Math.round(horasAloc / ctH * 100) : 0;
                                    const prog = getProgramacao(contrato.id, atv.id);

                                    return (
                                      <div key={atv.id}>
                                                {/* Activity row — expandable */}
                                                <div className={`flex items-center justify-between px-5 py-2 pl-20 hover:bg-accent/5 transition-colors ${customizado ? 'bg-primary/2' : ''}`}>
                                                  <button onClick={() => toggleAtividade(atvKey)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                                    <Activity className="w-3 h-3 text-muted-foreground shrink-0" />
                                                    <span className="text-[11px] text-foreground">{atv.name}</span>
                                                    <span className="text-[9px] font-data text-muted-foreground">{atv.code}</span>
                                                    {atvOcorrencias.length > 0 &&
                                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent/50 text-accent-foreground border border-accent/30 font-medium">+{atvOcorrencias.length} ocorrência(s)</span>
                                            }
                                                    {prog &&
                                            <span className="text-[8px] px-1 py-0.5 rounded bg-secondary text-secondary-foreground border border-border flex items-center gap-0.5">
                                                        <CalendarRange className="w-2.5 h-2.5" /> {format(prog.dataInicio, "dd/MM")} – {format(prog.dataFim, "dd/MM")}
                                                      </span>
                                            }
                                                    {alocPct > 0 &&
                                            <span className={`text-[8px] px-1 py-0.5 rounded-md font-medium border ${alocPct >= 100 ? 'bg-status-success-muted text-status-success border-status-success/20' : 'bg-status-warning-muted text-status-warning border-status-warning/20'}`}>{alocPct}% aloc.</span>
                                            }
                                                  </button>
                                                    <div className="flex items-center gap-4 shrink-0">
                                                    {isGestaoCorporativaDR ?
                                            <span className="w-20 text-right font-data text-[11px] text-muted-foreground">—</span> :

                                            <>
                                                        <span className="w-20 text-right font-data text-[11px] text-muted-foreground">—</span>
                                                        {isEditingAtv ?
                                              <div className="w-24 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <input type="number" min={0} step={0.5} value={editingHoras[aEditKey]}
                                                onChange={(e) => setEditingHoras((prev) => ({ ...prev, [aEditKey]: Number(e.target.value) }))}
                                                className="w-14 text-right border border-primary rounded px-1 py-0.5 text-[11px] font-data bg-background" autoFocus />
                                                            <button onClick={() => {setAtvHoras(contrato.id, atv.id, editingHoras[aEditKey]);setEditingHoras((prev) => {const n = { ...prev };delete n[aEditKey];return n;});}}
                                                className="text-[9px] px-1.5 py-0.5 bg-primary text-primary-foreground rounded">✓</button>
                                                            <button onClick={() => setEditingHoras((prev) => {const n = { ...prev };delete n[aEditKey];return n;})}
                                                className="text-[9px] px-1 py-0.5 text-muted-foreground">✕</button>
                                                          </div> :
                                              <span className={`w-24 text-right font-data text-[11px] font-medium flex items-center justify-end gap-1 ${customizado ? ctH > drH ? 'text-status-danger' : 'text-primary' : 'text-foreground'}`}>
                                                            <Clock className="w-3 h-3" />{ctH}h
                                                          </span>
                                              }
                                                        <span className={`w-14 text-center font-data text-[10px] ${ctH !== drH ? ctH > drH ? 'text-status-danger' : 'text-primary' : 'text-muted-foreground'}`}>
                                                          {ctH !== drH ? `${ctH > drH ? '+' : ''}${ctH - drH}h` : '—'}
                                                        </span>
                                                        <div className="w-20 flex justify-center"><ComparisonStatus padrao={drH} aplicavel={ctH} /></div>
                                                      </>
                                            }
                                                    <div className="w-10 flex justify-end gap-0.5">
                                                    {isGestaoCorporativaDR || isCoordenador ?
                                              null :

                                              <>
                                                        {!isEditingAtv &&
                                                <button onClick={(e) => {e.stopPropagation();setEditingHoras((prev) => ({ ...prev, [aEditKey]: ctH }));}}
                                                title="Ajustar horas" className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors">
                                                            <Pencil className="w-3 h-3" />
                                                          </button>
                                                }
                                                        {customizado &&
                                                <button onClick={(e) => {e.stopPropagation();resetAtvHoras(contrato.id, atv.id);toast.info(`${atv.name}: restaurado para ${drH}h (padrão DR)`);}}
                                                title="Restaurar padrão DR" className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                                                            <RotateCcw className="w-3 h-3" />
                                                          </button>
                                                }
                                                      </>
                                              }
                                                      <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isAtvExp ? 'rotate-180' : ''}`} />
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* ── Expanded unified panel ── */}
                                                {isAtvExp &&
                                        <div className="px-5 py-3 pl-24 pr-5 bg-muted/5 border-t border-border/20 space-y-4">
                                                    {/* Section 1: Ocorrências adicionais */}
                                                    <div>
                                                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                                                        <Copy className="w-3 h-3" /> Ocorrências adicionais ({atvOcorrencias.length})
                                                      </p>
                                                      {atvOcorrencias.map((ocr) => {
                                              const oEditKey = `atv::${contrato.id}::${ocr.id}`;
                                              const isEditingOcr = editingHoras[oEditKey] !== undefined;
                                              const ocrProg = getProgramacao(contrato.id, ocr.id);
                                              const ocrAlocs = getAtvAlocacoes(contrato.id, ocr.id);
                                              const ocrHorasAloc = ocrAlocs.reduce((s, a) => s + a.horasAlocadas, 0);
                                              const ocrPct = ocr.horasContrato > 0 ? Math.round(ocrHorasAloc / ocr.horasContrato * 100) : 0;
                                              return (
                                                <div key={ocr.id} className="rounded-md border border-accent/40 bg-accent/5 p-2 mb-1.5">
                                                            <div className="flex items-center justify-between">
                                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <Copy className="w-2.5 h-2.5 text-accent-foreground shrink-0" />
                                                                <span className="text-[10px] text-foreground italic">{ocr.descricao}</span>
                                                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground border border-accent font-semibold">Ocorrência</span>
                                                                {ocrProg &&
                                                      <span className="text-[7px] px-1 py-0.5 rounded bg-secondary text-secondary-foreground border border-border flex items-center gap-0.5">
                                                                    <CalendarRange className="w-2 h-2" /> {format(ocrProg.dataInicio, "dd/MM")} – {format(ocrProg.dataFim, "dd/MM")}
                                                                  </span>
                                                      }
                                                                {ocrPct > 0 &&
                                                      <span className={`text-[7px] px-1 py-0.5 rounded-md font-medium border ${ocrPct >= 100 ? 'bg-status-success-muted text-status-success border-status-success/20' : 'bg-status-warning-muted text-status-warning border-status-warning/20'}`}>{ocrPct}%</span>
                                                      }
                                                                <span className="text-[7px] text-muted-foreground">{ocr.criadoPor.split(" ")[0]} · {ocr.criadoEm}</span>
                                                              </div>
                                                              <div className="flex items-center gap-3 shrink-0">
                                                                <span className="text-[9px] font-data text-muted-foreground">DR: {ocr.horasDR}h</span>
                                                                {isEditingOcr ?
                                                      <div className="flex items-center gap-1">
                                                                    <input type="number" min={0} step={0.5} value={editingHoras[oEditKey]}
                                                        onChange={(e) => setEditingHoras((prev) => ({ ...prev, [oEditKey]: Number(e.target.value) }))}
                                                        className="w-14 text-right border border-primary rounded px-1 py-0.5 text-[10px] font-data bg-background" autoFocus />
                                                                    <button onClick={() => {updateOcorrenciaHoras(ocr.id, editingHoras[oEditKey]);setEditingHoras((prev) => {const n = { ...prev };delete n[oEditKey];return n;});}}
                                                        className="text-[9px] px-1.5 py-0.5 bg-primary text-primary-foreground rounded">✓</button>
                                                                    <button onClick={() => setEditingHoras((prev) => {const n = { ...prev };delete n[oEditKey];return n;})}
                                                        className="text-[9px] px-1 py-0.5 text-muted-foreground">✕</button>
                                                                  </div> :

                                                      <span className="text-[10px] font-data font-medium text-accent-foreground">{ocr.horasContrato}h</span>
                                                      }
                                                                {!isEditingOcr &&
                                                      <button onClick={() => setEditingHoras((prev) => ({ ...prev, [oEditKey]: ocr.horasContrato }))}
                                                      className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-2.5 h-2.5" /></button>
                                                      }
                                                                <button onClick={() => removeOcorrencia(ocr.id)}
                                                      className="p-0.5 rounded hover:bg-status-danger-muted text-muted-foreground hover:text-status-danger transition-colors"><X className="w-2.5 h-2.5" /></button>
                                                              </div>
                                                            </div>
                                                          </div>);

                                            })}
                                                      <button onClick={() => openOcorrenciaDialog(contrato.id, entrega.id, servico.id, atv.id)}
                                            className="flex items-center gap-1 text-[9px] text-primary/70 hover:text-primary hover:bg-primary/3 transition-colors px-2 py-1 rounded font-medium mt-1">
                                                        <Plus className="w-2.5 h-2.5" /> Nova ocorrência de "{atv.name}"
                                                      </button>
                                                    </div>

                                                    {/* Section 2: Programação + Alocação */}
                                                    <AtividadeAlocacaoPanel atv={atv} contratoId={contrato.id} horasContrato={ctH} alocacoesAtiv={atvAlocs}
                                          onAlocar={handleAlocar} onDesalocar={handleDesalocar} onSubstituir={handleSubstituir}
                                          programacao={prog}
                                          onSetProgramacao={(di, df) => setProgramacao(contrato.id, atv.id, di, df)}
                                          onRemoveProgramacao={() => removeProgramacao(contrato.id, atv.id)}
                                          distribuicao={getDistribuicao(contrato.id, atv.id, ctH)}
                                          isGestaoCorporativaDR={isGestaoCorporativaDR} isCoordenador={isCoordenador} />
                                                  </div>
                                        }
                                              </div>);

                                  })}
                                          {/* Subtotal */}
                                          <div className="flex items-center justify-between px-5 py-2 pl-20 bg-muted/20 text-[10px] font-medium">
                                            <div className="flex items-center gap-2">
                                               <span className="text-muted-foreground">Subtotal da etapa</span>
                                              {getSumAdicionaisEntrega(contrato.id, entrega.id) > 0 &&
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent/50 text-accent-foreground border border-accent/30 font-medium">
                                                  +{getSumAdicionaisEntrega(contrato.id, entrega.id)}h adicionais
                                                </span>
                                      }
                                            </div>
                                            <div className="flex items-center gap-4">
                                              <span className="w-20 text-right font-data text-muted-foreground">{isGestaoCorporativaDR || isCoordenador ? getDisplayedDrHorasEntregaAgg(entrega.id) : eDR}h</span>
                                              {!isGestaoCorporativaDR &&
                                      <>
                                                <span className={`w-24 text-right font-data font-semibold ${eCT !== eDR ? 'text-primary' : 'text-foreground'}`}>{eCT}h</span>
                                                <span className="w-14" /><span className="w-20" />
                                              </>
                                      }
                                              <span className="w-10" />
                                            </div>
                                          </div>
                                        </div>
                                }
                                    </div>);

                          })}

                                {/* Service total */}
                                <div className={`flex items-center justify-between px-5 py-3 pl-14 text-[11px] font-medium ${!isGestaoCorporativaDR && ctTotal > contrato.hoursContracted ? 'bg-status-danger-muted' : 'bg-muted/30'}`}>
                                  <span className="text-muted-foreground">Total do serviço</span>
                                  <div className="flex items-center gap-4">
                                    <span className="w-20 text-right font-data text-muted-foreground">{isGestaoCorporativaDR || isCoordenador ? getDisplayedDrHorasServicoAgg(servico.id) : drTotal}h</span>
                                    {!isGestaoCorporativaDR &&
                              <>
                                      <span className={`w-24 text-right font-data font-semibold ${ctTotal !== drTotal ? 'text-primary' : 'text-foreground'}`}>{ctTotal}h</span>
                                      <span className="w-14" />
                                      <div className="w-20 flex justify-center"><ComparisonStatus padrao={drTotal} aplicavel={ctTotal} /></div>
                                    </>
                              }
                                    <span className="w-10" />
                                  </div>
                                </div>
                              </div>
                        }
                          </div>);

                  })}

                      {/* Contract total footer */}
                      <div className={`flex items-center justify-between px-5 py-3 text-[12px] font-semibold border-t border-border ${!isGestaoCorporativaDR && exceedsContracted ? 'bg-status-danger-muted' : 'bg-muted/40'}`}>
                        <span className={!isGestaoCorporativaDR && exceedsContracted ? "text-status-danger" : "text-muted-foreground"}>
                          {!isGestaoCorporativaDR && exceedsContracted ? "Total excede o contratado" : "Total do contrato"}
                        </span>
                        <div className="flex items-center gap-4 text-[11px]">
                          {!(isGestaoCorporativaDR || isCoordenador) &&
                      <>
                            <span className="text-muted-foreground font-data">Contratado: <strong className="text-foreground">{contrato.hoursContracted}h</strong></span>
                            <span className="text-muted-foreground">|</span>
                          </>
                      }
                          <span className="text-muted-foreground font-data">DR: <strong>{isGestaoCorporativaDR || isCoordenador ? getDisplayedDrHorasContratoAgg(contrato) : totalPadraoContrato}h</strong></span>
                          {!(isGestaoCorporativaDR || isCoordenador) &&
                      <>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className={`font-data font-semibold ${hasAdjustments ? 'text-primary' : 'text-foreground'}`}>{totalContratoLocal}h</span>
                          </>
                      }
                        </div>
                      </div>
                    </div>
                }

                  {/* ═══ TAB: Alocação ═══ */}
                  {contractTab === "estrutura" &&
                <div className="bg-muted/5">
                      <div className="flex items-center justify-between px-5 py-2 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>Serviço → Entrega → Atividade</span>
                        <div className="flex items-center gap-6">
                          <span className="w-20 text-right">Padrão DR</span>
                          <span className="w-20 text-right">Contrato</span>
                          <span className="w-24 text-center">Comparação</span>
                          <span className="w-14 text-center">Alocação</span>
                          <span className="w-4" />
                        </div>
                      </div>

                      {contratoServices.map((servico) => {
                    const serviceKey = `${contrato.id}-${servico.id}`;
                    const isServiceExpanded = expandedServices.has(serviceKey);
                    const serviceEntregas = getEntregasByServico(servico.id);
                    const horasPadrao = isGestaoCorporativaDR || isCoordenador ? getDisplayedDrHorasServicoAgg(servico.id) : getSumHoursForServico(servico.id);
                    const horasContrato = getLocalSumServico(contrato.id, servico.id);

                    return (
                      <div key={servico.id} className="border-t border-border">
                            <button onClick={() => toggleService(serviceKey)}
                        className="w-full flex items-center justify-between px-5 py-3 pl-8 hover:bg-accent/10 transition-colors text-left">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <Package className="w-4 h-4 text-primary shrink-0" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-semibold text-foreground">{servico.name}</span>
                                    <span className="text-[11px] font-data text-muted-foreground">{servico.code}</span>
                                  </div>
                                  <span className="text-[11px] text-muted-foreground">{serviceEntregas.length} etapa(s)</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 shrink-0">
                                <span className="w-20 text-right font-data text-[12px] text-muted-foreground">{horasPadrao}h</span>
                                <span className={`w-20 text-right font-data text-[12px] font-semibold ${horasContrato !== horasPadrao ? 'text-primary' : 'text-foreground'}`}>{horasContrato}h</span>
                                <div className="w-24 flex justify-center"><ComparisonBar padrao={horasPadrao} aplicavel={horasContrato} /></div>
                                <div className="w-14" />
                                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isServiceExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {isServiceExpanded &&
                        <div className="bg-background/50 border-t border-border">
                                {serviceEntregas.map((entrega) => {
                            const entregaKey = `${serviceKey}-${entrega.id}`;
                            const isEntregaExpanded = expandedEntregas.has(entregaKey);
                            const atividades = getAtividadesByEntrega(entrega.id);
                            const ePadrao = isGestaoCorporativaDR || isCoordenador ? getDisplayedDrHorasEntregaAgg(entrega.id) : getSumHoursForEntrega(entrega.id);
                            const eContrato = getLocalSumEntrega(contrato.id, entrega.id);

                            return (
                              <div key={entrega.id} className="border-b border-border/50 last:border-0">
                                      <button onClick={() => toggleEntrega(entregaKey)}
                                className="w-full flex items-center justify-between px-5 py-2.5 pl-14 hover:bg-accent/10 transition-colors text-left">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                          <span className="text-[12px] font-medium text-foreground">{entrega.name}</span>
                                          <span className="text-[10px] font-data text-muted-foreground">{entrega.code}</span>
                                        </div>
                                        <div className="flex items-center gap-6 shrink-0">
                                          <span className="w-20 text-right font-data text-[11px] text-muted-foreground">{ePadrao}h</span>
                                          <span className={`w-20 text-right font-data text-[11px] font-medium ${eContrato !== ePadrao ? 'text-primary' : 'text-foreground'}`}>{eContrato}h</span>
                                          <div className="w-24 flex justify-center"><ComparisonBar padrao={ePadrao} aplicavel={eContrato} size="sm" /></div>
                                          <div className="w-14" />
                                          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isEntregaExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                      </button>

                                      {isEntregaExpanded &&
                                <div className="divide-y divide-border/30">
                                          {atividades.map((atv) => {
                                    const atvKey = `${entregaKey}-${atv.id}`;
                                    const isAtvExpanded = expandedAtividades.has(atvKey);
                                    const drH = isGestaoCorporativaDR || isCoordenador ? drAtividadeOverrides[atv.id] !== undefined ? drAtividadeOverrides[atv.id] : isGestaoCorporativaDR ? 0 : atv.timeHours : atv.timeHours;
                                    const { horas: ctH, customizado } = getLocalHoras(contrato.id, atv.id);
                                    const atvAlocacoes = getAtvAlocacoes(contrato.id, atv.id);
                                    const horasAloc = atvAlocacoes.reduce((s, a) => s + a.horasAlocadas, 0);
                                    const alocPct = ctH > 0 ? Math.round(horasAloc / ctH * 100) : 0;
                                    const atvOcrs = getOcorrenciasByAtividade(contrato.id, atv.id);
                                    const prog = getProgramacao(contrato.id, atv.id);

                                    return (
                                      <div key={atv.id}>
                                                <button onClick={() => toggleAtividade(atvKey)}
                                        className={`w-full flex items-center justify-between px-5 py-2 pl-20 hover:bg-accent/5 transition-colors text-left ${
                                        alocPct === 0 ? '' : alocPct >= 100 ? 'bg-status-success-muted/10' : 'bg-primary/3'}`
                                        }>
                                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <Activity className="w-3 h-3 text-muted-foreground shrink-0" />
                                                    <span className="text-[11px] text-foreground">{atv.name}</span>
                                                    <span className="text-[9px] font-data text-muted-foreground">{atv.code}</span>
                                                    {customizado && <span className="text-[8px] px-1 py-0.5 rounded bg-primary/8 text-primary border border-primary/15">Ajustado</span>}
                                                    {atvOcrs.length > 0 &&
                                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent/50 text-accent-foreground border border-accent/30 font-medium">+{atvOcrs.length} ocorrência(s)</span>
                                            }
                                                    {prog &&
                                            <span className="text-[8px] px-1 py-0.5 rounded bg-secondary text-secondary-foreground border border-border flex items-center gap-0.5">
                                                        <CalendarRange className="w-2.5 h-2.5" /> {format(prog.dataInicio, "dd/MM")} – {format(prog.dataFim, "dd/MM")}
                                                      </span>
                                            }
                                                    {alocPct === 0 && <span className="w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse" />}
                                                  </div>
                                                  <div className="flex items-center gap-6 shrink-0">
                                                    <span className="w-20 text-right font-data text-[11px] text-muted-foreground">{drH}h</span>
                                                    <span className={`w-20 text-right font-data text-[11px] font-medium ${customizado ? 'text-primary' : 'text-foreground'}`}>{ctH}h</span>
                                                    <div className="w-24 flex justify-center"><ComparisonBar padrao={drH} aplicavel={ctH} size="sm" /></div>
                                                    <div className="w-14 flex justify-center">
                                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${alocPct >= 100 ?
                                              'bg-status-success-muted text-status-success border-status-success/20' :
                                              alocPct > 0 ? 'bg-status-warning-muted text-status-warning border-status-warning/20' :
                                              'bg-muted text-muted-foreground border-border'}`}>{alocPct}%</span>
                                                    </div>
                                                    <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isAtvExpanded ? 'rotate-180' : ''}`} />
                                                  </div>
                                                </button>
                                                {isAtvExpanded &&
                                        <div className="px-5 py-3 pl-24 pr-5 bg-muted/5 border-t border-border/20 space-y-4">
                                                    {/* Ocorrências inline under base activity */}
                                                    <div>
                                                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                                                        <Copy className="w-3 h-3" /> Ocorrências adicionais ({atvOcrs.length})
                                                      </p>
                                                      {atvOcrs.map((ocr) => {
                                              const ocrAlocs = getAtvAlocacoes(contrato.id, ocr.id);
                                              const ocrHorasAloc = ocrAlocs.reduce((s, a) => s + a.horasAlocadas, 0);
                                              const ocrPct = ocr.horasContrato > 0 ? Math.round(ocrHorasAloc / ocr.horasContrato * 100) : 0;
                                              const ocrKey = `${entregaKey}-${ocr.id}`;
                                              const isOcrExp = expandedAtividades.has(ocrKey);
                                              const fakeAtv: Atividade = { id: ocr.id, name: `${atv.name} — ${ocr.descricao}`, code: atv.code, timeHours: ocr.horasContrato, entregaId: ocr.entregaId, cargosPermitidos: ocr.cargosPermitidos, status: "ativa" };
                                              return (
                                                <div key={ocr.id} className="rounded-md border border-accent/40 bg-accent/5 mb-1.5">
                                                            <button onClick={() => toggleAtividade(ocrKey)}
                                                  className="w-full flex items-center justify-between p-2 text-left hover:bg-accent/10 transition-colors rounded-md">
                                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <Copy className="w-2.5 h-2.5 text-accent-foreground shrink-0" />
                                                                <span className="text-[10px] text-foreground italic">{ocr.descricao}</span>
                                                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground border border-accent font-semibold">Ocorrência</span>
                                                                <span className="text-[7px] text-muted-foreground">{ocr.criadoPor.split(" ")[0]} · {ocr.criadoEm}</span>
                                                              </div>
                                                              <div className="flex items-center gap-3 shrink-0">
                                                                <span className="text-[9px] font-data text-muted-foreground">DR: {ocr.horasDR}h</span>
                                                                <span className="text-[10px] font-data font-medium text-accent-foreground">{ocr.horasContrato}h</span>
                                                                <span className={`text-[8px] px-1 py-0.5 rounded-md font-medium border ${ocrPct >= 100 ? 'bg-status-success-muted text-status-success border-status-success/20' : ocrPct > 0 ? 'bg-status-warning-muted text-status-warning border-status-warning/20' : 'bg-muted text-muted-foreground border-border'}`}>{ocrPct}%</span>
                                                                <ChevronDown className={`w-2.5 h-2.5 text-muted-foreground transition-transform ${isOcrExp ? 'rotate-180' : ''}`} />
                                                              </div>
                                                            </button>
                                                            {isOcrExp &&
                                                  <div className="p-2 pt-0">
                                                                <AtividadeAlocacaoPanel atv={fakeAtv} contratoId={contrato.id} horasContrato={ocr.horasContrato} alocacoesAtiv={ocrAlocs}
                                                    onAlocar={handleAlocar} onDesalocar={handleDesalocar} onSubstituir={handleSubstituir}
                                                    programacao={getProgramacao(contrato.id, ocr.id)}
                                                    onSetProgramacao={(di, df) => setProgramacao(contrato.id, ocr.id, di, df)}
                                                    onRemoveProgramacao={() => removeProgramacao(contrato.id, ocr.id)}
                                                    distribuicao={getDistribuicao(contrato.id, ocr.id, ocr.horasContrato)} isCoordenador={isCoordenador} />
                                                              </div>
                                                  }
                                                          </div>);

                                            })}
                                                      <button onClick={() => openOcorrenciaDialog(contrato.id, entrega.id, servico.id, atv.id)}
                                            className="flex items-center gap-1 text-[9px] text-primary/70 hover:text-primary hover:bg-primary/3 transition-colors px-2 py-1 rounded font-medium mt-1">
                                                        <Plus className="w-2.5 h-2.5" /> Nova ocorrência de "{atv.name}"
                                                      </button>
                                                    </div>

                                                    {/* Programação + Alocação */}
                                                    <AtividadeAlocacaoPanel atv={atv} contratoId={contrato.id} horasContrato={ctH} alocacoesAtiv={atvAlocacoes}
                                          onAlocar={handleAlocar} onDesalocar={handleDesalocar} onSubstituir={handleSubstituir}
                                          programacao={prog}
                                          onSetProgramacao={(di, df) => setProgramacao(contrato.id, atv.id, di, df)}
                                          onRemoveProgramacao={() => removeProgramacao(contrato.id, atv.id)}
                                          distribuicao={getDistribuicao(contrato.id, atv.id, ctH)} isCoordenador={isCoordenador} />
                                                  </div>
                                        }
                                              </div>);

                                  })}
                                          <div className="flex items-center justify-between px-5 py-2 pl-20 bg-muted/20 text-[10px] font-medium">
                                            <div className="flex items-center gap-2">
                                              <span className="text-muted-foreground">Subtotal da etapa</span>
                                              {getSumAdicionaisEntrega(contrato.id, entrega.id) > 0 &&
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent/50 text-accent-foreground border border-accent/30 font-medium">
                                                  +{getSumAdicionaisEntrega(contrato.id, entrega.id)}h adicionais
                                                </span>
                                      }
                                            </div>
                                            <div className="flex items-center gap-6">
                                              <span className="w-20 text-right font-data text-muted-foreground">{ePadrao}h</span>
                                              <span className={`w-20 text-right font-data font-semibold ${eContrato !== ePadrao ? 'text-primary' : 'text-foreground'}`}>{eContrato}h</span>
                                              <div className="w-24" /><div className="w-14" /><div className="w-3" />
                                            </div>
                                          </div>
                                        </div>
                                }
                                    </div>);

                          })}
                                <div className={`flex items-center justify-between px-5 py-3 pl-14 text-[11px] font-medium ${horasContrato > contrato.hoursContracted ? 'bg-status-danger-muted' : 'bg-muted/30'}`}>
                                  <span className="text-muted-foreground">Total do serviço</span>
                                  <div className="flex items-center gap-6">
                                    <span className="w-20 text-right font-data text-muted-foreground">{horasPadrao}h</span>
                                    <span className={`w-20 text-right font-data font-semibold ${horasContrato !== horasPadrao ? 'text-primary' : 'text-foreground'}`}>{horasContrato}h</span>
                                    <div className="w-24 flex justify-center"><ComparisonBar padrao={horasPadrao} aplicavel={horasContrato} /></div>
                                    <div className="w-14 flex justify-center"><ComparisonStatus padrao={horasPadrao} aplicavel={horasContrato} /></div>
                                    <div className="w-3.5" />
                                  </div>
                                </div>
                              </div>
                        }
                          </div>);

                  })}

                      <div className={`flex items-center justify-between px-5 py-3 text-[12px] font-semibold border-t border-border ${exceedsContracted ? 'bg-status-danger-muted' : 'bg-muted/40'}`}>
                        <span className={exceedsContracted ? "text-status-danger" : "text-muted-foreground"}>
                          {exceedsContracted ? "Total excede o contratado" : "Total do contrato"}
                        </span>
                        <div className="flex items-center gap-4 text-[11px]">
                          {!isCoordenador &&
                      <>
                            <span className="text-muted-foreground font-data">Contratado: <strong className="text-foreground">{contrato.hoursContracted}h</strong></span>
                            <span className="text-muted-foreground">|</span>
                          </>
                      }
                          <span className="text-muted-foreground font-data">DR: <strong>{totalPadraoContrato}h</strong></span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className={`font-data font-semibold ${hasAdjustments ? 'text-primary' : 'text-foreground'}`}>{totalContratoLocal}h</span>
                        </div>
                      </div>
                    </div>
                }

                  {/* ═══ TAB: Equipe ═══ */}
                  {contractTab === "equipe" &&
                <div className="p-5 space-y-5">
                      {/* Coordenador: contract-level hours summary (previsão, realizadas, saldo) */}
                      {isCoordenador && allocStats &&
                  <div className="bg-muted/20 rounded-lg border border-border/50 p-4 space-y-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5" /> Horas do contrato
                          </p>
                          <div className="grid grid-cols-3 gap-4 text-[11px]">
                            <div className="text-center bg-card rounded-lg border border-border p-3">
                              <p className="text-muted-foreground text-[9px] uppercase font-semibold">Previsão</p>
                              <p className="font-data font-bold text-lg text-primary mt-1">{allocStats.totalHorasContrato}h</p>
                            </div>
                            <div className="text-center bg-card rounded-lg border border-border p-3">
                              <p className="text-muted-foreground text-[9px] uppercase font-semibold">Realizadas</p>
                              <p className="font-data font-bold text-lg text-foreground mt-1">{allocStats.totalHorasAlocadas}h</p>
                            </div>
                            <div className="text-center bg-card rounded-lg border border-border p-3">
                              <p className={`text-[9px] uppercase font-semibold ${allocStats.totalHorasContrato - allocStats.totalHorasAlocadas < 0 ? 'text-status-danger' : 'text-status-success'}`}>Saldo</p>
                              <p className={`font-data font-bold text-lg mt-1 ${allocStats.totalHorasContrato - allocStats.totalHorasAlocadas < 0 ? 'text-status-danger' : 'text-status-success'}`}>
                                {allocStats.totalHorasContrato - allocStats.totalHorasAlocadas}h
                              </p>
                            </div>
                          </div>
                          {/* Bar chart */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground w-16">Previsão</span>
                              <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                                <div className="h-4 rounded bg-primary/70 transition-all" style={{ width: '100%' }} />
                              </div>
                              <span className="text-[9px] font-data font-medium text-primary w-12 text-right">{allocStats.totalHorasContrato}h</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground w-16">Realizadas</span>
                              <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                                <div className="h-4 rounded bg-foreground/60 transition-all" style={{ width: `${allocStats.totalHorasContrato > 0 ? Math.min(allocStats.totalHorasAlocadas / allocStats.totalHorasContrato * 100, 100) : 0}%` }} />
                              </div>
                              <span className="text-[9px] font-data font-medium text-foreground w-12 text-right">{allocStats.totalHorasAlocadas}h</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground w-16">Saldo</span>
                              <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                                <div className={`h-4 rounded transition-all ${allocStats.totalHorasContrato - allocStats.totalHorasAlocadas < 0 ? 'bg-status-danger/70' : 'bg-status-success/70'}`} style={{ width: `${allocStats.totalHorasContrato > 0 ? Math.min(Math.abs(allocStats.totalHorasContrato - allocStats.totalHorasAlocadas) / allocStats.totalHorasContrato * 100, 100) : 0}%` }} />
                              </div>
                              <span className={`text-[9px] font-data font-medium w-12 text-right ${allocStats.totalHorasContrato - allocStats.totalHorasAlocadas < 0 ? 'text-status-danger' : 'text-status-success'}`}>{allocStats.totalHorasContrato - allocStats.totalHorasAlocadas}h</span>
                            </div>
                          </div>
                        </div>
                  }

                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-primary" /> Equipe alocada ({contractTeam.length})
                        </p>
                        <select value={teamSort} onChange={(e) => setTeamSort(e.target.value as TeamSort)}
                    className="text-[10px] border border-input rounded-md px-2 py-1 bg-background text-foreground">
                          <option value="saldo_desc">↓ Maior saldo</option>
                          <option value="saldo_asc">↑ Menor saldo</option>
                          <option value="carga_desc">↓ Maior carga</option>
                          <option value="nome">A-Z Nome</option>
                        </select>
                      </div>
                      {contractTeam.length === 0 ?
                  <div className="bg-muted/30 rounded-lg p-6 text-center">
                          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                          <p className="text-[12px] text-muted-foreground">Nenhuma pessoa alocada</p>
                        </div> :

                  <div className="space-y-3">
                          {[...contractTeam].filter(Boolean).sort((a, b) => {
                      if (!a || !b) return 0;
                      const sa = getRecursoSaldo(a.id);const sb = getRecursoSaldo(b.id);
                      if (teamSort === "saldo_desc") return sb.saldo - sa.saldo;
                      if (teamSort === "saldo_asc") return sa.saldo - sb.saldo;
                      if (teamSort === "carga_desc") return sb.alocado - sa.alocado;
                      return a.name.localeCompare(b.name);
                    }).map((rec) => {
                      if (!rec) return null;
                      const cargo = getCargoById(rec.cargoId);
                      const s = getRecursoSaldo(rec.id);
                      const horasNeste = (rec as any).horasNesteContrato || 0;
                      const realizadas = Math.round(horasNeste * 0.6); // mock realizadas
                      const saldoPessoa = horasNeste - realizadas;
                      return (
                        <div key={rec.id} className={`bg-card rounded-lg border p-4 ${s.saldo === 0 ? 'border-status-danger/30' : s.saldo < 20 ? 'border-status-warning/30' : 'border-border'}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <PessoaBadge>{rec.name}</PessoaBadge>
                                    <CargoBadge>{cargo?.name || "—"}</CargoBadge>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {rec.uo}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <p className="text-[9px] text-muted-foreground uppercase">Neste contrato</p>
                                      <p className="font-data font-bold text-[14px] text-foreground">{horasNeste}h</p>
                                    </div>
                                    <SaldoBadge saldo={s.saldo} capacidade={s.capacidade} />
                                  </div>
                                </div>
                                {isCoordenador ?
                          <div className="bg-muted/20 rounded-lg border border-border/50 p-2.5 space-y-1.5">
                                    <div className="grid grid-cols-3 gap-2 text-[9px]">
                                      <div className="text-center"><p className="text-muted-foreground">Previsão</p><p className="font-data font-semibold text-foreground">{horasNeste}h</p></div>
                                      <div className="text-center"><p className="text-muted-foreground">Realizadas</p><p className="font-data font-semibold text-foreground">{realizadas}h</p></div>
                                      <div className="text-center">
                                        <p className={saldoPessoa <= 0 ? 'text-status-danger' : 'text-status-success'}>Saldo</p>
                                        <p className={`font-data font-bold ${saldoPessoa <= 0 ? 'text-status-danger' : 'text-status-success'}`}>{saldoPessoa}h</p>
                                      </div>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                                      <div className="h-2 bg-primary transition-all" style={{ width: `${horasNeste > 0 ? Math.min(realizadas / horasNeste * 100, 100) : 0}%` }} />
                                    </div>
                                    <div className="flex items-center gap-3 text-[8px] text-muted-foreground">
                                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" /> Realizadas</span>
                                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted inline-block border border-border" /> Restante</span>
                                    </div>
                                  </div> :

                          <CapacityCard recursoId={rec.id} />
                          }
                              </div>);

                    })}
                        </div>
                  }
                      {/* All available */}
                      <div>
                        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                          <Gauge className="w-4 h-4 text-primary" /> Todas as pessoas disponíveis
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {[...RECURSOS].filter((r) => r.status === "ativo").sort((a, b) => {
                        const sa = getRecursoSaldo(a.id);const sb = getRecursoSaldo(b.id);
                        if (teamSort === "saldo_desc") return sb.saldo - sa.saldo;
                        if (teamSort === "saldo_asc") return sa.saldo - sb.saldo;
                        if (teamSort === "carga_desc") return sb.alocado - sa.alocado;
                        return a.name.localeCompare(b.name);
                      }).map((r) => {
                        const cargo = getCargoById(r.cargoId);
                        const s = getRecursoSaldo(r.id);
                        const isInTeam = contractTeam.some((t) => t?.id === r.id);
                        return (
                          <div key={r.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${isInTeam ? 'bg-primary/5 border-primary/20' : s.saldo === 0 ? 'bg-muted/10 border-border/30 opacity-50' : 'bg-card border-border'}`}>
                                <div className="flex items-center gap-2.5">
                                  {isInTeam && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                                  <span className={`text-[11px] font-medium ${s.saldo === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>{r.name}</span>
                                  <CargoBadge>{cargo?.name || "—"}</CargoBadge>
                                  <span className="text-[9px] text-muted-foreground">{r.uo}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                                    {!isCoordenador && <span>Cap: {s.capacidade}h</span>}
                                    <span>Aloc: {s.alocado}h</span>
                                    {!isCoordenador && s.indisponivel > 0 && <span className="text-status-warning">Indisp: {s.indisponivel}h</span>}
                                  </div>
                                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden flex">
                                    <div className="h-1.5 bg-primary" style={{ width: `${Math.min(s.alocado / s.capacidade * 100, 100)}%` }} />
                                    {!isCoordenador && <div className="h-1.5 bg-status-warning" style={{ width: `${Math.min(s.indisponivel / s.capacidade * 100, 100)}%` }} />}
                                  </div>
                                  <SaldoBadge saldo={s.saldo} capacidade={s.capacidade} />
                                </div>
                              </div>);

                      })}
                        </div>
                      </div>
                    </div>
                }

                  {/* ═══ TAB: Lote ═══ */}
                  {contractTab === "acoes" &&
                <div className="bg-muted/5">
                      <div className="px-5 py-3 bg-accent/10 border-b border-border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-primary" />
                            <span className="text-[12px] font-semibold text-foreground">Seleção múltipla & ações em lote</span>
                          </div>
                          <button onClick={() => selectAllPendentes(contrato.id)}
                      className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 bg-status-warning-muted text-status-warning border border-status-warning/30 rounded-md hover:bg-status-warning/10 transition-colors">
                            <CheckSquare className="w-3 h-3" /> Selecionar pendentes
                          </button>
                        </div>
                        <div className="flex items-center gap-3 py-2 bg-card border border-border rounded-lg px-3">
                          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div className="flex gap-1.5">
                            {(["todos", "pendente", "parcial", "completo"] as const).map((f) =>
                        <button key={f} onClick={() => setQuickFilterStatus(f)}
                        className={`px-2 py-1 text-[10px] rounded-md font-medium transition-colors ${quickFilterStatus === f ?
                        f === "pendente" ? 'bg-status-warning-muted text-status-warning border border-status-warning/30' :
                        f === "parcial" ? 'bg-primary/10 text-primary border border-primary/20' :
                        f === "completo" ? 'bg-status-success-muted text-status-success border border-status-success/30' :
                        'bg-foreground/8 text-foreground border border-border' :
                        'text-muted-foreground hover:text-foreground border border-transparent'}`}>
                                {f === "todos" ? "Todos" : f === "pendente" ? "⏳ Pendente" : f === "parcial" ? "◐ Parcial" : "✓ Completo"}
                              </button>
                        )}
                          </div>
                          <div className="w-px h-5 bg-border" />
                          <select value={quickFilterResponsavel} onChange={(e) => setQuickFilterResponsavel(e.target.value)}
                      className="text-[10px] border border-input rounded-md px-2 py-1 bg-background text-foreground">
                            <option value="todos">Todos os responsáveis</option>
                            {allAllocatedPeople.map((r) => r && <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                      </div>

                      {selectedAtvs.size > 0 &&
                  <div className="sticky top-0 z-30 mx-5 mt-3 bg-card border-2 border-primary/30 rounded-xl shadow-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-md text-[11px] font-semibold">
                              <CheckSquare className="w-3.5 h-3.5" /> {selectedAtvs.size} selecionada(s)
                            </div>
                            <button onClick={clearSelection} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="w-3 h-3" /> Limpar</button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setShowBatchDialog("apply_person")}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                              <Copy className="w-3.5 h-3.5" /> Aplicar responsável
                            </button>
                            <button onClick={() => setShowBatchDialog("swap")}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium border border-border bg-card text-foreground rounded-md hover:bg-accent transition-colors">
                              <ArrowDownUp className="w-3.5 h-3.5" /> Trocar em lote
                            </button>
                          </div>
                        </div>
                  }

                      <div className="px-5 py-2">
                        <div className="flex items-center justify-between py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
                          <span>{isCoordenador ? "Etapa de entrega" : "Atividade"}</span>
                          <div className="flex items-center gap-6">
                            <span className="w-16 text-right">Contrato</span>
                            <span className="w-14 text-center">Alocação</span>
                            <span className="w-20 text-center">Status</span>
                          </div>
                        </div>
                        {contratoServices.map((sv) =>
                    getEntregasByServico(sv.id).map((e) => {
                      if (isCoordenador) {
                        // Coordenador: list entregas instead of atividades
                        const atvs = getAtividadesByEntrega(e.id);
                        const totalHoras = atvs.reduce((s, atv) => {const { horas } = getLocalHoras(contrato.id, atv.id);return s + horas;}, 0);
                        const totalAloc = atvs.reduce((s, atv) => s + getAtvAlocacoes(contrato.id, atv.id).reduce((ss, a) => ss + a.horasAlocadas, 0), 0);
                        const pct = totalHoras > 0 ? Math.round(totalAloc / totalHoras * 100) : 0;
                        const status = totalAloc === 0 ? "pendente" : totalAloc >= totalHoras ? "completo" : "parcial";
                        if (quickFilterStatus !== "todos" && status !== quickFilterStatus) return null;
                        const isSelected = isAtvSelected(contrato.id, e.id);

                        return (
                          <div key={e.id} className={`flex items-center py-2 border-b border-border/30 last:border-0 ${isSelected ? 'bg-primary/5' : ''}`}>
                                  <button onClick={() => toggleSelectAtv(contrato.id, e.id)} className="pr-2 shrink-0">
                                    {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground/40" />}
                                  </button>
                                  <div className="flex-1 min-w-0 flex items-center gap-2 text-[11px]">
                                    {status === "pendente" && <span className="w-1.5 h-1.5 rounded-full bg-status-warning shrink-0 animate-pulse" />}
                                    {status === "parcial" && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                    {status === "completo" && <span className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0" />}
                                    <span className="text-foreground truncate">{e.name}</span>
                                    <span className="text-[9px] text-muted-foreground font-data">{e.code}</span>
                                  </div>
                                  <div className="flex items-center gap-6 shrink-0">
                                    <span className="w-16 text-right font-data text-[11px] text-foreground">{totalHoras}h</span>
                                    <span className={`w-14 text-center font-data text-[10px] font-medium ${pct >= 100 ? 'text-status-success' : pct > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{pct}%</span>
                                    <div className="w-20 flex justify-center">
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${status === "completo" ?
                                'bg-status-success-muted text-status-success border-status-success/20' :
                                status === "parcial" ? 'bg-primary/10 text-primary border-primary/20' :
                                'bg-status-warning-muted text-status-warning border-status-warning/20'}`}>
                                        {status === "completo" ? "Completo" : status === "parcial" ? "Parcial" : "Pendente"}
                                      </span>
                                    </div>
                                  </div>
                                </div>);
                      }

                      // Non-coordenador: list atividades
                      const standardAtvs = getAtividadesByEntrega(e.id).map((atv) => {
                        if (!passesQuickFilter(contrato.id, atv.id)) return null;
                        const { horas } = getLocalHoras(contrato.id, atv.id);
                        const atvAlocs = getAtvAlocacoes(contrato.id, atv.id);
                        const horasAloc = atvAlocs.reduce((s, a) => s + a.horasAlocadas, 0);
                        const pct = horas > 0 ? Math.round(horasAloc / horas * 100) : 0;
                        const status = getAtvAllocStatus(contrato.id, atv.id);
                        const isSelected = isAtvSelected(contrato.id, atv.id);

                        return (
                          <div key={atv.id} className={`flex items-center py-2 border-b border-border/30 last:border-0 ${isSelected ? 'bg-primary/5' : ''}`}>
                                  <button onClick={() => toggleSelectAtv(contrato.id, atv.id)} className="pr-2 shrink-0">
                                    {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground/40" />}
                                  </button>
                                  <div className="flex-1 min-w-0 flex items-center gap-2 text-[11px]">
                                    {status === "pendente" && <span className="w-1.5 h-1.5 rounded-full bg-status-warning shrink-0 animate-pulse" />}
                                    {status === "parcial" && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                    {status === "completo" && <span className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0" />}
                                    <span className="text-foreground truncate">{atv.name}</span>
                                    <span className="text-[9px] text-muted-foreground font-data">{atv.code}</span>
                                    {atvAlocs.length > 0 && <span className="text-[9px] text-muted-foreground">→ {atvAlocs.map((a) => getRecursoById(a.recursoId)?.name?.split(" ")[0]).join(", ")}</span>}
                                  </div>
                                  <div className="flex items-center gap-6 shrink-0">
                                    <span className="w-16 text-right font-data text-[11px] text-foreground">{horas}h</span>
                                    <span className={`w-14 text-center font-data text-[10px] font-medium ${pct >= 100 ? 'text-status-success' : pct > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{pct}%</span>
                                    <div className="w-20 flex justify-center">
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${status === "completo" ?
                                'bg-status-success-muted text-status-success border-status-success/20' :
                                status === "parcial" ? 'bg-primary/10 text-primary border-primary/20' :
                                'bg-status-warning-muted text-status-warning border-status-warning/20'}`}>
                                        {status === "completo" ? "Completo" : status === "parcial" ? "Parcial" : "Pendente"}
                                      </span>
                                    </div>
                                  </div>
                                </div>);

                      });
                      // Ocorrências adicionais in Lote tab
                      const extraAtvs = getAdicionaisByEntrega(contrato.id, e.id).map((ocr) => {
                        const baseAtv = ATIVIDADES.find((a) => a.id === ocr.atividadeBaseId);
                        const atvAlocs = getAtvAlocacoes(contrato.id, ocr.id);
                        const horasAloc = atvAlocs.reduce((s, a) => s + a.horasAlocadas, 0);
                        const pct = ocr.horasContrato > 0 ? Math.round(horasAloc / ocr.horasContrato * 100) : 0;
                        const status = horasAloc === 0 ? "pendente" : horasAloc >= ocr.horasContrato ? "completo" : "parcial";
                        const isSelected = isAtvSelected(contrato.id, ocr.id);

                        return (
                          <div key={ocr.id} className={`flex items-center py-2 border-b border-border/30 last:border-0 bg-accent/5 ${isSelected ? 'bg-primary/5' : ''}`}>
                                  <button onClick={() => toggleSelectAtv(contrato.id, ocr.id)} className="pr-2 shrink-0">
                                    {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground/40" />}
                                  </button>
                                  <div className="flex-1 min-w-0 flex items-center gap-2 text-[11px]">
                                    {status === "pendente" && <span className="w-1.5 h-1.5 rounded-full bg-status-warning shrink-0 animate-pulse" />}
                                    {status === "parcial" && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                    {status === "completo" && <span className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0" />}
                                    <span className="text-foreground truncate">{baseAtv?.name ?? "—"}</span>
                                    <span className="text-[9px] text-muted-foreground font-data italic">{ocr.descricao}</span>
                                    <span className="text-[8px] px-1 py-0.5 rounded bg-accent text-accent-foreground border border-accent font-semibold">Ocorrência</span>
                                    {atvAlocs.length > 0 && <span className="text-[9px] text-muted-foreground">→ {atvAlocs.map((a) => getRecursoById(a.recursoId)?.name?.split(" ")[0]).join(", ")}</span>}
                                  </div>
                                  <div className="flex items-center gap-6 shrink-0">
                                    <span className="w-16 text-right font-data text-[11px] text-accent-foreground">{ocr.horasContrato}h</span>
                                    <span className={`w-14 text-center font-data text-[10px] font-medium ${pct >= 100 ? 'text-status-success' : pct > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{pct}%</span>
                                    <div className="w-20 flex justify-center">
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${status === "completo" ?
                                'bg-status-success-muted text-status-success border-status-success/20' :
                                status === "parcial" ? 'bg-primary/10 text-primary border-primary/20' :
                                'bg-status-warning-muted text-status-warning border-status-warning/20'}`}>
                                        {status === "completo" ? "Completo" : status === "parcial" ? "Parcial" : "Pendente"}
                                      </span>
                                    </div>
                                  </div>
                                </div>);

                      });
                      return [...standardAtvs, ...extraAtvs];
                    })
                    )}
                      </div>
                    </div>
                }
                </div>
              }
            </div>);

        })}
      </div>

      {!isDetailMode






      }

      {/* Batch dialogs */}
      <Dialog open={showBatchDialog === "apply_person"} onOpenChange={() => setShowBatchDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm"><Copy className="w-4 h-4 text-primary" /> Aplicar responsável</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-[11px] text-muted-foreground">A pessoa será alocada em <strong>{selectedAtvs.size} atividade(s)</strong>, apenas onde houver cargo compatível e saldo.</p>
            <div>
              <label className="text-[11px] font-medium text-foreground">Pessoa</label>
              <select value={batchPerson} onChange={(e) => setBatchPerson(e.target.value)} className="w-full border border-input rounded-md text-[12px] p-2 bg-background mt-1">
                <option value="">Selecionar...</option>
                {[...RECURSOS].filter((r) => r.status === "ativo").sort((a, b) => getRecursoSaldo(b.id).saldo - getRecursoSaldo(a.id).saldo).map((r) => {
                  const cargo = getCargoById(r.cargoId);const s = getRecursoSaldo(r.id);
                  return <option key={r.id} value={r.id}>{r.name} — {cargo?.name} ({s.saldo}h livres)</option>;
                })}
              </select>
            </div>
            {batchPerson && <CapacityCard recursoId={batchPerson} />}
            <ValidarBadge>Compatibilidade verificada por cargo. Atividades incompatíveis serão ignoradas.</ValidarBadge>
          </div>
          <DialogFooter>
            <button onClick={() => setShowBatchDialog(null)} className="text-[11px] px-4 py-2 border border-border rounded-md text-foreground hover:bg-accent">Cancelar</button>
            <button onClick={handleBatchApplyPerson} disabled={!batchPerson} className="text-[11px] px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50">Aplicar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBatchDialog === "swap"} onOpenChange={() => setShowBatchDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm"><ArrowDownUp className="w-4 h-4 text-primary" /> Trocar responsável em lote</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-[11px] text-muted-foreground">Substituir em <strong>{selectedAtvs.size} atividade(s)</strong>.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-foreground">De (atual)</label>
                <select value={swapFrom} onChange={(e) => setSwapFrom(e.target.value)} className="w-full border border-input rounded-md text-[12px] p-2 bg-background mt-1">
                  <option value="">Selecionar...</option>
                  {allAllocatedPeople.map((r) => r && <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {swapFrom && <div className="mt-2"><CapacityCard recursoId={swapFrom} /></div>}
              </div>
              <div>
                <label className="text-[11px] font-medium text-foreground">Para (novo)</label>
                <select value={swapTo} onChange={(e) => setSwapTo(e.target.value)} className="w-full border border-input rounded-md text-[12px] p-2 bg-background mt-1">
                  <option value="">Selecionar...</option>
                  {[...RECURSOS].filter((r) => r.status === "ativo" && r.id !== swapFrom).sort((a, b) => getRecursoSaldo(b.id).saldo - getRecursoSaldo(a.id).saldo).map((r) => {
                    const s = getRecursoSaldo(r.id);
                    return <option key={r.id} value={r.id}>{r.name} ({s.saldo}h livres)</option>;
                  })}
                </select>
                {swapTo && <div className="mt-2"><CapacityCard recursoId={swapTo} /></div>}
              </div>
            </div>
            <ValidarBadge>A troca não verifica compatibilidade de cargo automaticamente nesta versão.</ValidarBadge>
          </div>
          <DialogFooter>
            <button onClick={() => setShowBatchDialog(null)} className="text-[11px] px-4 py-2 border border-border rounded-md text-foreground hover:bg-accent">Cancelar</button>
            <button onClick={handleBatchSwap} disabled={!swapFrom || !swapTo} className="text-[11px] px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50">Trocar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Nova Ocorrência Dialog ═══ */}
      <Dialog open={!!showOcorrenciaDialog} onOpenChange={() => {setShowOcorrenciaDialog(null);setNovaDescricao("");setNovaHoras(0);}}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm"><Copy className="w-4 h-4 text-primary" /> Nova ocorrência de atividade</DialogTitle>
            <DialogDescription className="text-[11px]">
              Cria uma nova ocorrência derivada da atividade padrão DR. A estrutura, cargos e referência de horas são herdados automaticamente. O padrão DR não é alterado.
            </DialogDescription>
          </DialogHeader>
          {showOcorrenciaDialog && (() => {
            const baseAtv = ATIVIDADES.find((a) => a.id === showOcorrenciaDialog.atividadeBaseId);
            const entrega = ENTREGAS.find((e) => e.id === showOcorrenciaDialog.entregaId);
            const servico = SERVICOS.find((s) => s.id === showOcorrenciaDialog.servicoId);
            const existingCount = getOcorrenciasByAtividade(showOcorrenciaDialog.contratoId, showOcorrenciaDialog.atividadeBaseId).length;
            const cargosNomes = (baseAtv?.cargosPermitidos ?? []).map((cid) => getCargoById(cid)?.name || cid);
            if (!baseAtv) return null;
            return (
              <div className="space-y-3 py-2">
                {/* Context */}
                <div className="text-[11px] bg-muted/30 rounded-lg border border-border p-3 space-y-1">
                  <p className="text-muted-foreground">Serviço: <strong className="text-foreground">{servico?.name}</strong></p>
                  <p className="text-muted-foreground">Entrega: <strong className="text-foreground">{entrega?.name}</strong></p>
                </div>
                {/* Base activity (read-only) */}
                <div className="bg-primary/3 border border-primary/15 rounded-lg p-3">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Atividade base (padrão DR)</p>
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-[12px] font-semibold text-foreground">{baseAtv.name}</span>
                    <span className="text-[10px] font-data text-muted-foreground">{baseAtv.code}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[10px]">
                    <span className="text-muted-foreground">Horas referência: <strong className="text-foreground font-data">{baseAtv.timeHours}h</strong></span>
                    <span className="text-muted-foreground">Cargos: <strong className="text-foreground">{cargosNomes.join(", ")}</strong></span>
                  </div>
                  {existingCount > 0 &&
                  <p className="text-[9px] text-primary mt-1.5 font-medium">{existingCount} ocorrência(s) já existente(s) neste contrato</p>
                  }
                </div>
                {/* Description */}
                <div>
                  <label className="text-[11px] font-medium text-foreground">Descrição da ocorrência <span className="text-status-danger">*</span></label>
                  <input type="text" value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)}
                  placeholder="Ex: 2ª visita técnica — unidade Canoas"
                  className="w-full border border-input rounded-md text-[12px] p-2 bg-background mt-1" autoFocus />
                  <p className="text-[9px] text-muted-foreground mt-0.5">Descreva do que se trata esta ocorrência adicional</p>
                </div>
                {/* Hours */}
                <div>
                  <label className="text-[11px] font-medium text-foreground">Horas previstas no contrato</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="number" min={0.5} step={0.5} value={novaHoras} onChange={(e) => setNovaHoras(Number(e.target.value))}
                    className="w-24 border border-input rounded-md text-[12px] p-2 bg-background font-data" />
                    <span className="text-[10px] text-muted-foreground">Referência DR: <strong className="font-data">{baseAtv.timeHours}h</strong></span>
                    {novaHoras !== baseAtv.timeHours && novaHoras > 0 &&
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${novaHoras > baseAtv.timeHours ? 'bg-status-danger-muted text-status-danger' : 'bg-primary/10 text-primary'}`}>
                        {novaHoras > baseAtv.timeHours ? '+' : ''}{novaHoras - baseAtv.timeHours}h vs DR
                      </span>
                    }
                  </div>
                </div>
                {/* Info box */}
                <div className="bg-accent/10 border border-accent/30 rounded-md px-3 py-2 text-[10px] text-accent-foreground">
                  <p className="font-medium flex items-center gap-1"><Copy className="w-3 h-3" /> Esta ocorrência será marcada como <strong>Adicional</strong></p>
                  <p className="text-muted-foreground mt-0.5">Herda estrutura e cargos da atividade base. As horas são contabilizadas além do padrão do contrato. Podem existir múltiplas ocorrências.</p>
                </div>
              </div>);

          })()}
          <DialogFooter>
            <button onClick={() => {setShowOcorrenciaDialog(null);setNovaDescricao("");setNovaHoras(0);}}
            className="text-[11px] px-4 py-2 border border-border rounded-md text-foreground hover:bg-accent">Cancelar</button>
            <button onClick={handleAddOcorrencia} disabled={!novaDescricao.trim() || novaHoras <= 0}
            className="text-[11px] px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50">Criar ocorrência</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Entrega Edit Modal (DR profile) ═══ */}
      <Dialog open={!!editEntregaModal} onOpenChange={() => setEditEntregaModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm"><Edit3 className="w-4 h-4 text-primary" /> Editar Entrega</DialogTitle>
            <DialogDescription className="text-[11px]">
              Altere os dados da entrega. A hierarquia e o relacionamento com o serviço serão mantidos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-medium text-foreground">Nome</label>
              <input type="text" value={editEntregaName} onChange={(e) => setEditEntregaName(e.target.value)}
              className="w-full border border-input rounded-md text-[12px] p-2 bg-background mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-foreground">Código</label>
              <input type="text" value={editEntregaCode} onChange={(e) => setEditEntregaCode(e.target.value)}
              className="w-full border border-input rounded-md text-[12px] p-2 bg-background mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-foreground">Status</label>
              <select value={editEntregaStatus} onChange={(e) => setEditEntregaStatus(e.target.value as "ativa" | "rascunho" | "inativa")}
              className="w-full border border-input rounded-md text-[12px] p-2 bg-background mt-1">
                <option value="ativa">Ativa</option>
                <option value="rascunho">Rascunho</option>
                <option value="inativa">Inativa</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditEntregaModal(null)}
            className="text-[11px] px-4 py-2 border border-border rounded-md text-foreground hover:bg-accent">Cancelar</button>
            <button onClick={saveEntregaEdit} disabled={!editEntregaName.trim() || !editEntregaCode.trim()}
            className="text-[11px] px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50">Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}