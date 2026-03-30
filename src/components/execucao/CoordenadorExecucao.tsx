import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parse, isAfter, isBefore, startOfDay, isEqual } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PageHeader, DataCard, StatusBadge } from "@/components/ui-custom/StatusBadge";
import {
  FileText, Search, ChevronRight, ChevronDown, AlertTriangle,
  CheckCircle2, Clock, Layers, Users, CalendarDays, User,
  Activity, Filter, X
} from "lucide-react";
import { EXECUCOES, CONTRATOS, ENTREGAS, RECURSOS, ATIVIDADES, UOS } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";

/* ── Types ── */
interface ContractGroup {
  contratoId: string;
  client: string;
  code: string;
  mvCode: string;
  uo: string;
  competencia: string;
  status: "em_execucao" | "concluido" | "implantacao";
  etapaAtual: string;
  atividades: number;
  semApontamento: number;
  recursos: number;
}

interface EtapaGroup {
  name: string;
  status: "concluida" | "em_andamento" | "pendente";
  periodo: string;
  atividades: typeof EXECUCOES;
  resourceNames: string[];
  progress: number;
}

const MV_CODES: Record<string, string> = {
  "ct-1": "MV-2026-001",
  "ct-2": "MV-2026-005",
  "ct-3": "MV-2026-003",
  "ct-4": "MV-2026-004",
  "ct-5": "MV-2026-002",
};

/* ── Tela 1: Listagem ── */
export function CoordenadorExecucaoList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [cotSearch, setCotSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataTermino, setDataTermino] = useState<Date | undefined>(undefined);

  const contracts = useMemo(() => {
    const groups = new Map<string, ContractGroup>();
    EXECUCOES.forEach(ex => {
      const ct = CONTRATOS.find(c => c.code === ex.contratoCode);
      const key = ex.contratoCode;
      if (!groups.has(key)) {
        const uo = ct ? UOS.find(u => u.id === ct.uo)?.name ?? ct.uo : "";
        groups.set(key, {
          contratoId: ct?.id ?? "",
          client: ex.clienteName,
          code: ex.contratoCode,
          mvCode: ct ? MV_CODES[ct.id] ?? "" : "",
          uo,
          competencia: ex.competencia,
          status: "em_execucao",
          etapaAtual: ex.entregaName,
          atividades: 0,
          semApontamento: 0,
          recursos: 0,
        });
      }
      const g = groups.get(key)!;
      g.atividades++;
      if (ex.status === "pendencia_apontamento" || (ex.horasRealizadas === 0 && ex.status !== "planejada" && ex.status !== "concluida")) {
        g.semApontamento++;
      }
      g.etapaAtual = ex.entregaName;
    });
    // Count unique resources per contract
    groups.forEach((g, key) => {
      const execs = EXECUCOES.filter(e => e.contratoCode === key);
      g.recursos = new Set(execs.map(e => e.resourceId)).size;
    });
    return Array.from(groups.values());
  }, []);

  const totalEtapas = useMemo(() => {
    const etapas = new Set<string>();
    EXECUCOES.forEach(e => etapas.add(`${e.contratoCode}-${e.entregaName}`));
    return etapas.size;
  }, []);

  const totalSemApontamento = contracts.reduce((s, c) => s + c.semApontamento, 0);
  const totalRecursos = useMemo(() => {
    return new Set(EXECUCOES.map(e => e.resourceId)).size;
  }, []);
  const totalAtividades = EXECUCOES.length;

  const filtered = contracts.filter(c => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!c.client.toLowerCase().includes(s) && !c.code.toLowerCase().includes(s) && !c.mvCode.toLowerCase().includes(s)) return false;
    }
    if (cotSearch && !c.code.toLowerCase().includes(cotSearch.toLowerCase())) return false;
    // Date range filter based on competencia (MM/YYYY)
    if (dataInicio || dataTermino) {
      try {
        const parts = c.competencia.split("/");
        if (parts.length === 2) {
          const compDate = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
          if (dataInicio && isBefore(compDate, startOfDay(dataInicio))) return false;
          if (dataTermino && isAfter(compDate, startOfDay(dataTermino))) return false;
        }
      } catch { /* keep */ }
    }
    return true;
  });

  if (selectedContract) {
    return <CoordenadorExecucaoDetail contractCode={selectedContract} onBack={() => setSelectedContract(null)} />;
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Acompanhamento de Execução"
        description="Acompanhe a execução dos contratos, suas etapas, atividades e recursos"
      />

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <div className="bg-card rounded-lg border border-border border-t-[3px] border-t-status-success p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Contratos em execução</p>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold text-foreground mt-2">{contracts.length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border border-t-[3px] border-t-primary p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Etapas em andamento</p>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold text-foreground mt-2">{totalEtapas}</p>
        </div>
        <div className="bg-card rounded-lg border border-border border-t-[3px] border-t-status-warning p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Atividades pendentes</p>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold text-foreground mt-2">{totalAtividades}</p>
        </div>
        <div className="bg-card rounded-lg border border-border border-t-[3px] border-t-status-danger p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Sem apontamento</p>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold text-status-danger mt-2">{totalSemApontamento}</p>
        </div>
        <div className="bg-card rounded-lg border border-border border-t-[3px] border-t-amber-400 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Recursos em atividade</p>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold text-foreground mt-2">{totalRecursos}</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-card border border-border rounded-lg p-4 mb-5 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar empresa..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg bg-background"
          />
        </div>
        <div className="relative min-w-[160px]">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Nº COT..."
            value={cotSearch}
            onChange={e => setCotSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg bg-background"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-input rounded-lg bg-background"
        >
          <option>Todos</option>
          <option>Ativo</option>
          <option>Implantação</option>
          <option>Concluído</option>
          <option>Vencido</option>
        </select>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm border border-input rounded-lg bg-background hover:text-foreground",
                dataInicio ? "text-foreground" : "text-muted-foreground"
              )}>
                <CalendarDays className="w-4 h-4" />
                {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Data de Início"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataInicio}
                onSelect={setDataInicio}
                locale={ptBR}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm border border-input rounded-lg bg-background hover:text-foreground",
                dataTermino ? "text-foreground" : "text-muted-foreground"
              )}>
                <CalendarDays className="w-4 h-4" />
                {dataTermino ? format(dataTermino, "dd/MM/yyyy") : "Data de Término"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataTermino}
                onSelect={setDataTermino}
                locale={ptBR}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        {(searchTerm || cotSearch || statusFilter !== "Todos" || dataInicio || dataTermino) && (
          <button
            onClick={() => {
              setSearchTerm("");
              setCotSearch("");
              setStatusFilter("Todos");
              setDataInicio(undefined);
              setDataTermino(undefined);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg bg-background hover:bg-accent transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpar Filtros
          </button>
        )}
      </div>

      {/* ── Contract list ── */}
      <div className="space-y-2">
        {filtered.map(ct => (
          <div
            key={ct.code}
            onClick={() => setSelectedContract(ct.code)}
            className="bg-card border border-border rounded-lg px-5 py-4 cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-foreground">{ct.client}</span>
                    <span className="text-[11px] font-data text-muted-foreground">{ct.code}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[11px] font-data text-muted-foreground">{ct.mvCode}</span>
                    <StatusBadge variant="success">Em execução</StatusBadge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span>{ct.uo}</span>
                    <span>Competência: {ct.competencia}</span>
                    <span>Etapa: {ct.etapaAtual}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-[13px] font-semibold font-data text-foreground">{ct.atividades}</p>
                  <p className="text-[10px] text-muted-foreground">{ct.atividades === 1 ? "atividade" : "atividades"}</p>
                </div>
                <div className="text-center">
                  <p className={`text-[13px] font-semibold font-data ${ct.semApontamento > 0 ? "text-status-danger" : "text-foreground"}`}>{ct.semApontamento}</p>
                  <p className="text-[10px] text-muted-foreground">s/ apontamento</p>
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold font-data text-foreground">{ct.recursos}</p>
                  <p className="text-[10px] text-muted-foreground">recursos</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground">Nenhum contrato encontrado</p>
        </div>
      )}
    </div>
  );
}

/* ── Tela 2: Detalhe do contrato ── */
function CoordenadorExecucaoDetail({ contractCode, onBack }: { contractCode: string; onBack: () => void }) {
  const navigate = useNavigate();
  const [expandedEtapas, setExpandedEtapas] = useState<Set<string>>(new Set());
  const [expandedAtividades, setExpandedAtividades] = useState<Set<string>>(new Set());
  const [resourceFilter, setResourceFilter] = useState("Todos os recursos");
  const [statusFilter, setStatusFilter] = useState("Todos os status");

  const execucoes = EXECUCOES.filter(e => e.contratoCode === contractCode);
  const contrato = CONTRATOS.find(c => c.code === contractCode);
  const uo = contrato ? UOS.find(u => u.id === contrato.uo)?.name ?? "" : "";
  const mvCode = contrato ? MV_CODES[contrato.id] ?? "" : "";
  const client = execucoes[0]?.clienteName ?? "";
  const competencia = execucoes[0]?.competencia ?? "";

  // Group by entrega (etapa)
  const etapas = useMemo(() => {
    const groups = new Map<string, EtapaGroup>();
    execucoes.forEach(ex => {
      const key = ex.entregaName;
      if (!groups.has(key)) {
        groups.set(key, {
          name: key,
          status: "em_andamento",
          periodo: "",
          atividades: [],
          resourceNames: [],
          progress: 0,
        });
      }
      const g = groups.get(key)!;
      g.atividades.push(ex);
      if (!g.resourceNames.includes(ex.resourceName)) {
        g.resourceNames.push(ex.resourceName);
      }
    });

    // Compute status and progress for each etapa
    groups.forEach(g => {
      const total = g.atividades.length;
      const concluidas = g.atividades.filter(a => a.status === "concluida").length;
      g.progress = total > 0 ? Math.round((concluidas / total) * 100) : 0;
      if (concluidas === total) g.status = "concluida";
      else if (concluidas > 0 || g.atividades.some(a => a.status === "em_realizacao" || a.status === "realizada_parcial")) g.status = "em_andamento";
      else g.status = "pendente";

      // Compute period from activity dates
      const dates = g.atividades.map(a => a.date).sort();
      if (dates.length > 0) {
        g.periodo = dates.length === 1 ? dates[0] : `${dates[0]} – ${dates[dates.length - 1]}`;
      }
    });

    return Array.from(groups.values());
  }, [execucoes]);

  const etapaCount = etapas.length;
  const atividadesEmAndamento = execucoes.filter(e => e.status === "em_realizacao" || e.status === "realizada_parcial").length;
  const semApontamento = execucoes.filter(e => e.status === "pendencia_apontamento" || (e.horasRealizadas === 0 && e.status !== "planejada" && e.status !== "concluida")).length;
  const recursosCount = new Set(execucoes.map(e => e.resourceId)).size;

  // Unique resource names for filter
  const uniqueResources = Array.from(new Set(execucoes.map(e => e.resourceName)));

  // Current etapa
  const etapaAtual = etapas.find(e => e.status === "em_andamento")?.name ?? etapas[0]?.name ?? "";

  const toggleEtapa = (name: string) => {
    setExpandedEtapas(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleAtividade = (id: string) => {
    setExpandedAtividades(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const statusLabel = (s: string) => {
    if (s === "concluida") return { label: "Concluída", variant: "success" as const };
    if (s === "em_andamento") return { label: "Em andamento", variant: "warning" as const };
    return { label: "Pendente", variant: "info" as const };
  };

  const actStatusLabel = (s: string) => {
    switch (s) {
      case "concluida": return { label: "Concluída", variant: "success" as const };
      case "em_realizacao": return { label: "Em andamento", variant: "warning" as const };
      case "realizada_parcial": return { label: "Parcial", variant: "warning" as const };
      case "pendencia_apontamento": return { label: "Pendência", variant: "danger" as const };
      case "bloqueada_competencia": return { label: "Bloqueada", variant: "danger" as const };
      default: return { label: "Planejada", variant: "info" as const };
    }
  };

  return (
    <div className="max-w-6xl">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        ← Voltar para lista
      </button>

      {/* ── Header card ── */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-lg font-semibold text-foreground">{client}</h1>
          <StatusBadge variant="success">Em execução</StatusBadge>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground flex-wrap">
          <span>COT: {contractCode}</span>
          <span>Código MV: {mvCode}</span>
          <span>{uo}</span>
          <span>Competência: {competencia}</span>
          <span>Etapa atual: <strong className="text-foreground">{etapaAtual}</strong></span>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <p className="text-[11px] font-medium text-muted-foreground">Etapas</p>
          </div>
          <p className="text-2xl font-semibold text-foreground mt-2">{etapaCount}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-[11px] font-medium text-muted-foreground">Atividades em andamento</p>
          </div>
          <p className="text-2xl font-semibold text-foreground mt-2">{atividadesEmAndamento}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <p className="text-[11px] font-medium text-muted-foreground">Sem apontamento</p>
          </div>
          <p className={`text-2xl font-semibold mt-2 ${semApontamento > 0 ? "text-status-danger" : "text-foreground"}`}>{semApontamento}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <p className="text-[11px] font-medium text-muted-foreground">Recursos</p>
          </div>
          <p className="text-2xl font-semibold text-foreground mt-2">{recursosCount}</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-card border border-border rounded-lg p-4 mb-5 flex items-center gap-3">
        <select
          value={resourceFilter}
          onChange={e => setResourceFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-input rounded-lg bg-background"
        >
          <option>Todos os recursos</option>
          {uniqueResources.map(r => <option key={r}>{r}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-input rounded-lg bg-background"
        >
          <option>Todos os status</option>
          <option>Concluída</option>
          <option>Em andamento</option>
          <option>Pendente</option>
        </select>
      </div>

      {/* ── Etapas do contrato ── */}
      <h2 className="text-sm font-semibold text-foreground mb-3">Etapas do contrato</h2>
      <div className="space-y-2">
        {etapas.map(etapa => {
          const isExpanded = expandedEtapas.has(etapa.name);
          const sl = statusLabel(etapa.status);
          const semAp = etapa.atividades.filter(a => a.status === "pendencia_apontamento" || (a.horasRealizadas === 0 && a.status !== "planejada" && a.status !== "concluida")).length;

          return (
            <div key={etapa.name} className="border border-border rounded-lg overflow-hidden">
              {/* Etapa header */}
              <div
                onClick={() => toggleEtapa(etapa.name)}
                className="bg-card px-5 py-4 cursor-pointer hover:bg-accent/30 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 rotate-0" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground">{etapa.name}</span>
                      <StatusBadge variant={sl.variant}>{sl.label}</StatusBadge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>{etapa.periodo}</span>
                      <span>{etapa.atividades.length} atividades</span>
                      <span>{etapa.resourceNames.length} recursos</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-32 flex items-center gap-2">
                    <Progress value={etapa.progress} className="h-2 flex-1" />
                    <span className="text-[12px] font-data font-medium text-foreground w-10 text-right">{etapa.progress}%</span>
                  </div>
                </div>
              </div>

              {/* Expanded: Atividades */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/20 px-5 py-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Atividades</p>
                  <div className="space-y-2">
                    {etapa.atividades.map(act => {
                      const as2 = actStatusLabel(act.status);
                      const pct = act.horasPlanejadas > 0 ? Math.round((act.horasRealizadas / act.horasPlanejadas) * 100) : 0;
                      const isActExpanded = expandedAtividades.has(act.id);
                      const ultimoAp = act.apontamentos.length > 0 ? act.apontamentos[act.apontamentos.length - 1] : null;

                      return (
                        <div key={act.id} className="border border-border rounded-lg overflow-hidden">
                          <div
                            onClick={() => toggleAtividade(act.id)}
                            className="bg-card px-4 py-3 cursor-pointer hover:bg-accent/20 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {isActExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[12px] font-medium text-foreground">{act.atividadeName}</span>
                                    <span className="text-[10px] font-data text-muted-foreground">{act.atividadeCode}</span>
                                    <StatusBadge variant={as2.variant}>{as2.label}</StatusBadge>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                    <span>Responsável: {act.resourceName}</span>
                                    <span>{act.date}</span>
                                    <span className="font-data">{act.horasRealizadas}h / {act.horasPlanejadas}h</span>
                                    {ultimoAp && <span>Último: {ultimoAp.date.split(" ")[0]}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="w-28 flex items-center gap-2 shrink-0">
                                <Progress value={pct} className="h-1.5 flex-1" />
                              </div>
                            </div>
                          </div>

                          {/* Expanded: Recursos vinculados */}
                          {isActExpanded && (
                            <div className="border-t border-border bg-muted/10 px-4 py-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recursos vinculados</p>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">
                                  {act.resourceName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-medium text-foreground">{act.resourceName}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {RECURSOS.find(r => r.id === act.resourceId)?.role ?? "Técnico"}
                                  </p>
                                </div>
                                <StatusBadge variant="success">Ativo</StatusBadge>
                                <span className="text-[11px] font-data text-muted-foreground">{act.horasRealizadas}h / {act.horasPlanejadas}h</span>
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="w-3 h-3" /> Em dia
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
