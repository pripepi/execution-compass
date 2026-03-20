import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  FileText,
  Layers,
  ClipboardList,
  AlertTriangle,
  Users,
  ChevronRight,
  CalendarIcon,
  X,
} from "lucide-react";
import { contratosMock } from "@/data/mockData";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const summaryCards = [
  { label: "CONTRATOS EM EXECUÇÃO", value: 4, icon: FileText, accent: "border-t-card-accent-green" },
  { label: "ETAPAS EM ANDAMENTO", value: 7, icon: Layers, accent: "border-t-card-accent-blue" },
  { label: "TAREFAS PENDENTES", value: 11, icon: ClipboardList, accent: "border-t-card-accent-orange" },
  { label: "SEM APONTAMENTO", value: 6, icon: AlertTriangle, accent: "border-t-card-accent-red" },
  { label: "RECURSOS EM ATIVIDADE", value: 17, icon: Users, accent: "border-t-card-accent-yellow" },
];

export default function AcompanhamentoLista() {
  const navigate = useNavigate();
  const [searchEmpresa, setSearchEmpresa] = useState("");
  const [searchCot, setSearchCot] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const hasActiveFilters = searchEmpresa || searchCot || statusFilter !== "Todos" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchEmpresa("");
    setSearchCot("");
    setStatusFilter("Todos");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const filtered = useMemo(() => {
    return contratosMock.filter((c) => {
      if (searchEmpresa && !c.empresa.toLowerCase().includes(searchEmpresa.toLowerCase())) return false;
      if (searchCot && !c.cot.includes(searchCot)) return false;
      if (statusFilter !== "Todos" && c.status !== statusFilter) return false;
      // Date range filter is a prototype placeholder — mock data doesn't have real dates to parse
      return true;
    });
  }, [searchEmpresa, searchCot, statusFilter, dateFrom, dateTo]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      {/* Title */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Acompanhamento de Execução</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe a execução dos contratos, suas etapas, tarefas e recursos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-card rounded-lg border border-border border-t-[3px] ${card.accent} p-4 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                </div>
                <Icon className="w-5 h-5 text-muted-foreground opacity-40" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={searchEmpresa}
              onChange={(e) => setSearchEmpresa(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="relative min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Nº COT..."
              value={searchCot}
              onChange={(e) => setSearchCot(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option>Todos</option>
            <option>Em execução</option>
            <option>Em implantação</option>
            <option>Concluído</option>
            <option>Suspenso</option>
          </select>

          {/* Date range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 px-3 text-sm font-normal gap-2",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                {dateFrom
                  ? format(dateFrom, "dd/MM/yy", { locale: ptBR })
                  : "De"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 px-3 text-sm font-normal gap-2",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                {dateTo
                  ? format(dateTo, "dd/MM/yy", { locale: ptBR })
                  : "Até"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Contract List */}
      <div className="space-y-2">
        {filtered.map((contrato, idx) => (
          <button
            key={contrato.id}
            onClick={() => navigate(`/acompanhamento/${contrato.id}`)}
            className="w-full bg-card rounded-lg border border-border p-4 hover:shadow-md transition-all hover:border-primary/30 text-left group"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{contrato.empresa}</span>
                  <span className="text-xs text-muted-foreground">{contrato.cot}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{contrato.codigoMV}</span>
                  <StatusBadge status={contrato.status} />
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span>{contrato.uo}</span>
                  <span>Competência: {contrato.competencia}</span>
                  <span>Etapa: {contrato.etapaAtual}</span>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-6 text-xs text-muted-foreground shrink-0">
                <div className="text-center">
                  <div className="font-semibold text-foreground text-sm">{contrato.tarefasAndamento}</div>
                  <div>tarefas</div>
                </div>
                {contrato.tarefasSemApontamento > 0 && (
                  <div className="text-center">
                    <div className="font-semibold text-status-danger text-sm">{contrato.tarefasSemApontamento}</div>
                    <div className="text-status-danger">s/ apontamento</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="font-semibold text-foreground text-sm">{contrato.recursosEnvolvidos}</div>
                  <div>recursos</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
