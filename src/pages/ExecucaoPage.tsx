import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatusBadge, ValidarBadge, DataCard } from "@/components/ui-custom/StatusBadge";
import {
  Play, Clock, ChevronRight, AlertTriangle,
  CheckCircle2, FileText, Package, Layers, Activity, MessageSquare,
  PauseCircle, Lock, CalendarOff, Briefcase, Timer, CalendarDays, User, CalendarRange
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { Execucao, ExecStatus, Apontamento } from "@/data/mockData";
import { useExecucoes } from "@/contexts/ExecucoesContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, addDays, differenceInCalendarDays, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CoordenadorExecucaoList } from "@/components/execucao/CoordenadorExecucao";

type ViewMode = "dia" | "semana" | "mes";

const STATUS_CONFIG: Record<ExecStatus, { label: string; variant: "success" | "warning" | "danger" | "info"; icon: React.ElementType }> = {
  planejada: { label: "Planejada", variant: "info", icon: Clock },
  em_realizacao: { label: "Em realização", variant: "warning", icon: Play },
  realizada_parcial: { label: "Em realização", variant: "warning", icon: PauseCircle },
  concluida: { label: "Concluída", variant: "success", icon: CheckCircle2 },
  pendencia_apontamento: { label: "Sem apontamento", variant: "danger", icon: AlertTriangle },
  bloqueada_competencia: { label: "Bloqueada", variant: "danger", icon: Lock },
};

const COMPETENCIA_ATUAL = "03/2026";
const DIAS_SEMANA = [
  { date: "09/03/2026", label: "Seg 09", dayOfWeek: "seg" },
  { date: "10/03/2026", label: "Ter 10", dayOfWeek: "ter" },
  { date: "11/03/2026", label: "Qua 11", dayOfWeek: "qua", isToday: true },
  { date: "12/03/2026", label: "Qui 12", dayOfWeek: "qui" },
  { date: "13/03/2026", label: "Sex 13", dayOfWeek: "sex" },
];

export default function ExecucaoPage() {
  const { currentProfile } = useProfile();

  // Coordenador gets a completely different contract-centric view
  if (currentProfile.role === "coordenador") {
    return <CoordenadorExecucaoList />;
  }

  return <ExecucaoPageInner />;
}

function ExecucaoPageInner() {
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const isTecnico = currentProfile.role === "tecnico";
  const showDateRange = isTecnico;
  const [viewMode, setViewMode] = useState<ViewMode>("dia");
  const [filterMode, setFilterMode] = useState<"visao_dia" | "sem_apontamento" | "concluida">("visao_dia");
  const [selectedDay, setSelectedDay] = useState("11/03/2026");
  const { execucoes, setExecucoes } = useExecucoes();
  const [indispDialog, setIndispDialog] = useState(false);

  // Date range filter state (max 7 days)
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(undefined);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>(undefined);
  const [dateRangeActive, setDateRangeActive] = useState(false);

  const customDays = useMemo(() => {
    if (!dateRangeActive || !dateRangeStart || !dateRangeEnd) return null;
    const days = eachDayOfInterval({ start: dateRangeStart, end: dateRangeEnd });
    return days.map((d, i) => ({
      date: format(d, "dd/MM/yyyy"),
      label: format(d, "EEE dd", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()),
      dayOfWeek: format(d, "EEE", { locale: ptBR }),
      isToday: format(d, "dd/MM/yyyy") === "11/03/2026",
    }));
  }, [dateRangeActive, dateRangeStart, dateRangeEnd]);

  const activeDays = dateRangeActive && customDays ? customDays : DIAS_SEMANA;

  const handleDateRangeStartSelect = (date: Date | undefined) => {
    setDateRangeStart(date);
    if (date && dateRangeEnd) {
      const diff = differenceInCalendarDays(dateRangeEnd, date);
      if (diff < 0 || diff > 6) {
        setDateRangeEnd(addDays(date, 6));
      }
    }
  };

  const handleDateRangeEndSelect = (date: Date | undefined) => {
    if (date && dateRangeStart) {
      const diff = differenceInCalendarDays(date, dateRangeStart);
      if (diff < 0) return;
      if (diff > 6) {
        date = addDays(dateRangeStart, 6);
        toast.info("Intervalo limitado a 7 dias");
      }
    }
    setDateRangeEnd(date);
  };

  const applyDateRange = () => {
    if (!dateRangeStart || !dateRangeEnd) return;
    setDateRangeActive(true);
    setViewMode("semana");
    toast.success(`Exibindo ${differenceInCalendarDays(dateRangeEnd, dateRangeStart) + 1} dias`);
  };

  const clearDateRange = () => {
    setDateRangeActive(false);
    setDateRangeStart(undefined);
    setDateRangeEnd(undefined);
  };

  const myExecs = isTecnico
    ? execucoes.filter(e => e.resourceName === "Carlos Silva")
    : execucoes;

  const dayExecs = myExecs.filter(e => e.date === selectedDay);
  const weekExecs = myExecs.filter(e => activeDays.some(d => d.date === e.date));
  // Month view: all execs for current month (03/2026)
  const monthExecs = myExecs.filter(e => {
    const parts = e.date.split("/");
    if (parts.length === 3) return `${parts[1]}/${parts[2]}` === COMPETENCIA_ATUAL.replace("/", "/");
    return false;
  });
  const baseExecs = viewMode === "mes" ? monthExecs : viewMode === "dia" ? dayExecs : weekExecs;
  const visibleExecs = isTecnico ? baseExecs.filter(e => {
    if (filterMode === "sem_apontamento") return e.status === "planejada" && e.horasRealizadas === 0;
    if (filterMode === "concluida") return e.status === "concluida";
    // visao_dia: Planejadas + Em realização
    return e.status === "planejada" || e.status === "em_realizacao" || e.status === "realizada_parcial" || e.status === "pendencia_apontamento";
  }).sort((a, b) => {
    const order = (s: ExecStatus) => s === "planejada" || s === "pendencia_apontamento" ? 0 : s === "em_realizacao" || s === "realizada_parcial" ? 1 : 2;
    return order(a.status) - order(b.status);
  }) : baseExecs;

  const totalPlanejadas = visibleExecs.filter(e => e.status === "planejada").length;
  const emRealizacao = visibleExecs.filter(e => e.status === "em_realizacao" || e.status === "realizada_parcial").length;
  const concluidas = visibleExecs.filter(e => e.status === "concluida").length;
  const pendencias = visibleExecs.filter(e => e.status === "pendencia_apontamento").length;
  const bloqueadas = visibleExecs.filter(e => e.status === "bloqueada_competencia").length;
  const horasPlan = visibleExecs.reduce((s, e) => s + e.horasPlanejadas, 0);
  const horasReal = visibleExecs.reduce((s, e) => s + e.horasRealizadas, 0);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={isTecnico ? "Painel do Técnico / Executor" : "Acompanhamento de Execução"}
        description={isTecnico
          ? "Planeje o dia, realize suas atividades e lance as horas de execução"
          : "Acompanhe a execução das atividades dos seus recursos"
        }
      />

      {/* ── Context bar ── */}
      {!isTecnico && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-[12px] font-medium text-foreground">Competência: <span className="font-data text-primary">{COMPETENCIA_ATUAL}</span></span>
            </div>
          </div>
        </div>
      )}

      {isTecnico && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span>Carlos Silva</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/8 text-primary border border-primary/15 font-medium">Técnico / Executor</span>
          </div>
          <button onClick={() => setIndispDialog(true)}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 border border-border rounded-lg text-foreground hover:bg-accent transition-colors">
            <CalendarOff className="w-3.5 h-3.5" /> Registrar Indisponibilidade
          </button>
        </div>
      )}

      {/* ── View mode + day selector + date range ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-2 items-center">
          {isTecnico ? (
            <>
              <button onClick={() => setFilterMode("visao_dia")}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${filterMode === "visao_dia" ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                Visão do Dia
              </button>
              <div className="h-4 w-px bg-border mx-1" />
              <button onClick={() => setFilterMode("sem_apontamento")}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${filterMode === "sem_apontamento" ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                Sem apontamento
              </button>
              <button onClick={() => setFilterMode("concluida")}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${filterMode === "concluida" ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                Concluída
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setViewMode("dia"); clearDateRange(); }}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${viewMode === "dia" && !dateRangeActive ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                Visão do Dia
              </button>
              <button onClick={() => { setViewMode("semana"); clearDateRange(); }}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${viewMode === "semana" && !dateRangeActive ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                Visão da Semana
              </button>
            </>
          )}

          {showDateRange && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              <div className="flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-muted-foreground" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-7 px-2.5 text-[11px] font-data">
                      {dateRangeStart ? format(dateRangeStart, "dd/MM/yyyy") : "Data de Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateRangeStart} onSelect={handleDateRangeStartSelect} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-[10px] text-muted-foreground">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-7 px-2.5 text-[11px] font-data">
                      {dateRangeEnd ? format(dateRangeEnd, "dd/MM/yyyy") : "Data de Término"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRangeEnd}
                      onSelect={handleDateRangeEndSelect}
                      disabled={dateRangeStart ? (date) => date < dateRangeStart! || differenceInCalendarDays(date, dateRangeStart!) > 6 : undefined}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px]" onClick={applyDateRange}
                  disabled={!dateRangeStart || !dateRangeEnd}>
                  Aplicar
                </Button>
                {dateRangeActive && (
                  <button onClick={clearDateRange} className="text-[10px] text-muted-foreground hover:text-foreground underline">Limpar</button>
                )}
              </div>
            </>
          )}
        </div>
        {viewMode === "dia" && !dateRangeActive && !isTecnico && (
          <div className="flex gap-1">
            {activeDays.map(d => (
              <button key={d.date} onClick={() => setSelectedDay(d.date)}
                className={`px-2.5 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${
                  selectedDay === d.date
                    ? 'bg-primary text-primary-foreground'
                    : d.isToday
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}>
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <DataCard label="Planejadas" value={totalPlanejadas} />
        <DataCard label="Em realização" value={emRealizacao} variant="warning" />
        <DataCard label="Concluídas" value={concluidas} variant="success" />
        <DataCard label="Pendências" value={pendencias} variant="danger" sublabel={pendencias > 0 ? "Apontamento" : undefined} />
        <div className="bg-card rounded-lg border border-border border-l-[3px] border-l-primary p-4 shadow-card">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Horas</p>
          <p className="text-lg font-semibold font-data text-foreground mt-1 leading-none">
            {horasReal}<span className="text-muted-foreground text-sm font-normal">/{horasPlan}h</span>
          </p>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
            <div className={`h-1.5 rounded-full ${horasReal > horasPlan ? 'bg-status-danger' : 'bg-primary'}`}
              style={{ width: `${Math.min(horasPlan > 0 ? (horasReal / horasPlan) * 100 : 0, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* ── Blocked warning ── */}
      {bloqueadas > 0 && (
        <div className="bg-status-danger-muted border border-status-danger/20 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Lock className="w-4 h-4 text-status-danger mt-0.5 shrink-0" />
          <div>
            <p className="text-[12px] font-medium text-foreground">{bloqueadas} atividade(s) bloqueada(s) por competência</p>
            <p className="text-[11px] text-muted-foreground">Competência anterior encerrada — não é possível registrar apontamentos.</p>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {visibleExecs.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground">Nenhuma atividade para {viewMode === "dia" ? "este dia" : viewMode === "mes" ? "este mês" : "esta semana"}</p>
          <p className="text-[12px] text-muted-foreground mt-1">Suas atividades aparecerão aqui conforme o Facilitador definir as alocações.</p>
        </div>
      )}

      {/* ── Activity list ── */}
      <div className="space-y-2">
        {(viewMode === "mes" ? (() => {
          // Group month execs by date
          const dateMap = new Map<string, typeof myExecs>();
          monthExecs.forEach(e => {
            if (!dateMap.has(e.date)) dateMap.set(e.date, []);
            dateMap.get(e.date)!.push(e);
          });
          return Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
            date,
            label: date.slice(0, 5),
            dayOfWeek: "",
            isToday: date === "11/03/2026",
          }));
        })() : viewMode === "semana" || dateRangeActive ? activeDays : [activeDays.find(d => d.date === selectedDay)!]).map(day => {
          if (!day) return null;
          const dayItems = viewMode === "mes" ? monthExecs.filter(e => e.date === day.date) : myExecs.filter(e => e.date === day.date);
          if ((viewMode === "semana" || viewMode === "mes") && dayItems.length === 0) return null;

          // For técnico: filter items based on filterMode
          const filteredDayItems = isTecnico ? dayItems.filter(e => {
            if (filterMode === "sem_apontamento") return e.status === "planejada" && e.horasRealizadas === 0;
            if (filterMode === "concluida") return e.status === "concluida";
            return e.status === "planejada" || e.status === "em_realizacao" || e.status === "realizada_parcial" || e.status === "pendencia_apontamento";
          }).sort((a, b) => {
            const order = (s: ExecStatus) => s === "planejada" || s === "pendencia_apontamento" ? 0 : s === "em_realizacao" || s === "realizada_parcial" ? 1 : 2;
            return order(a.status) - order(b.status);
          }) : dayItems;

          if (filteredDayItems.length === 0 && (viewMode === "semana" || viewMode === "mes")) return null;

          // Group by Serviço > Etapa for técnico
          const groupedByServiceEtapa = isTecnico ? (() => {
            const groups: { key: string; servicoName: string; servicoCode: string; entregaName: string; clienteName: string; contratoCode: string; items: typeof filteredDayItems }[] = [];
            filteredDayItems.forEach(exec => {
              const key = `${exec.servicoCode}::${exec.entregaName}`;
              let group = groups.find(g => g.key === key);
              if (!group) {
                group = { key, servicoName: exec.servicoName, servicoCode: exec.servicoCode, entregaName: exec.entregaName, clienteName: exec.clienteName, contratoCode: exec.contratoCode, items: [] };
                groups.push(group);
              }
              group.items.push(exec);
            });
            return groups;
          })() : null;

          return (
            <div key={day.date}>
              {(viewMode === "semana" || viewMode === "mes") && (
                <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                  <span className={`text-[12px] font-semibold ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                    {day.label}
                  </span>
                  {day.isToday && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">Hoje</span>}
                  <span className="text-[10px] text-muted-foreground">{filteredDayItems.length} atividade(s)</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Técnico: grouped by Serviço > Etapa */}
              {isTecnico && groupedByServiceEtapa ? (
                <div className="space-y-3">
                  {groupedByServiceEtapa.map(group => (
                    <div key={group.key} className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
                      {/* Group header: Serviço > Etapa */}
                      <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2 text-[11px]">
                        <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground">{group.clienteName}</span>
                        <span className="text-muted-foreground/40">›</span>
                        <span className="font-data text-muted-foreground">{group.contratoCode}</span>
                        <span className="text-muted-foreground/40">›</span>
                        <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{group.servicoName}</span>
                        <span className="text-muted-foreground/40">›</span>
                        <Package className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{group.entregaName}</span>
                      </div>
                      {/* Activities within this group */}
                      <div className="divide-y divide-border/50">
                        {group.items.map(exec => {
                          const cfg = STATUS_CONFIG[exec.status];
                          const StatusIcon = cfg.icon;
                          const pct = exec.horasPlanejadas > 0 ? Math.round((exec.horasRealizadas / exec.horasPlanejadas) * 100) : 0;
                          const isBloqueada = exec.status === "bloqueada_competencia";
                          return (
                            <div key={exec.id}
                              onClick={() => navigate(`/execucao/${exec.id}`)}
                              className={`px-4 py-3 cursor-pointer hover:bg-accent/20 transition-all ${isBloqueada ? 'opacity-60' : ''}`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  exec.status === "concluida" ? 'bg-status-success-muted' :
                                  exec.status === "em_realizacao" || exec.status === "realizada_parcial" ? 'bg-status-warning-muted' :
                                  exec.status === "pendencia_apontamento" ? 'bg-status-danger-muted' :
                                  isBloqueada ? 'bg-status-danger-muted' : 'bg-muted'
                                }`}>
                                  <StatusIcon className={`w-3.5 h-3.5 ${
                                    exec.status === "concluida" ? 'text-status-success' :
                                    exec.status === "em_realizacao" || exec.status === "realizada_parcial" ? 'text-status-warning' :
                                    exec.status === "pendencia_apontamento" || isBloqueada ? 'text-status-danger' :
                                    'text-muted-foreground'
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-medium text-foreground truncate">{exec.atividadeName}</span>
                                    <span className="text-[10px] font-data text-muted-foreground">{exec.atividadeCode}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right">
                                    <div className="text-[12px] font-data font-semibold text-foreground">{exec.horasRealizadas}/{exec.horasPlanejadas}h</div>
                                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                                      <div className={`h-1.5 rounded-full ${pct > 100 ? 'bg-status-danger' : pct >= 100 ? 'bg-status-success' : 'bg-primary'}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }} />
                                    </div>
                                  </div>
                                  <StatusBadge variant={cfg.variant}>{cfg.label}</StatusBadge>
                                  {exec.apontamentos.length > 0 && (
                                    <span className="text-[9px] font-data px-1.5 py-0.5 rounded-full bg-muted border border-border">{exec.apontamentos.length} apt</span>
                                  )}
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Non-técnico: flat list */
                <div className="space-y-1.5">
                  {filteredDayItems.map(exec => {
                    const cfg = STATUS_CONFIG[exec.status];
                    const StatusIcon = cfg.icon;
                    const pct = exec.horasPlanejadas > 0 ? Math.round((exec.horasRealizadas / exec.horasPlanejadas) * 100) : 0;
                    const isBloqueada = exec.status === "bloqueada_competencia";

                    return (
                      <div key={exec.id}
                        onClick={() => navigate(`/execucao/${exec.id}`)}
                        className={`bg-card border rounded-lg px-4 py-3 cursor-pointer hover:shadow-md transition-all ${
                          isBloqueada ? 'border-status-danger/20 opacity-60' : 'border-border hover:border-primary/20'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            exec.status === "concluida" ? 'bg-status-success-muted' :
                            exec.status === "em_realizacao" || exec.status === "realizada_parcial" ? 'bg-status-warning-muted' :
                            exec.status === "pendencia_apontamento" ? 'bg-status-danger-muted' :
                            isBloqueada ? 'bg-status-danger-muted' :
                            'bg-muted'
                          }`}>
                            <StatusIcon className={`w-4 h-4 ${
                              exec.status === "concluida" ? 'text-status-success' :
                              exec.status === "em_realizacao" || exec.status === "realizada_parcial" ? 'text-status-warning' :
                              exec.status === "pendencia_apontamento" || isBloqueada ? 'text-status-danger' :
                              'text-muted-foreground'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-foreground truncate">{exec.atividadeName}</span>
                              <span className="text-[10px] font-data text-muted-foreground">{exec.atividadeCode}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                              <Briefcase className="w-3 h-3 shrink-0" />
                              <span className="font-medium">{exec.clienteName}</span>
                              <span className="text-muted-foreground/40">›</span>
                              <span className="font-data">{exec.contratoCode}</span>
                              <span className="text-muted-foreground/40">›</span>
                              <span>{exec.servicoName}</span>
                              <span className="text-muted-foreground/40">›</span>
                              <span>{exec.entregaName}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-center">
                              <span className="text-[9px] text-muted-foreground block">Comp.</span>
                              <span className="text-[11px] font-data font-medium text-foreground">{exec.competencia}</span>
                            </div>
                            <div className="h-6 w-px bg-border" />
                            <div className="text-right">
                              <div className="text-[12px] font-data font-semibold text-foreground">{exec.horasRealizadas}/{exec.horasPlanejadas}h</div>
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                                <div className={`h-1.5 rounded-full ${pct > 100 ? 'bg-status-danger' : pct >= 100 ? 'bg-status-success' : 'bg-primary'}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            </div>
                            <StatusBadge variant={cfg.variant}>{cfg.label}</StatusBadge>
                            {exec.apontamentos.length > 0 && (
                              <span className="text-[9px] font-data px-1.5 py-0.5 rounded-full bg-muted border border-border">{exec.apontamentos.length} apt</span>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 ml-11 text-[10px]">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                            Alocado pelo Facilitador
                          </span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            Dia: <span className="font-data text-foreground">{exec.date}</span>
                          </span>
                          {exec.iniciadoEm && (
                            <span className="text-muted-foreground">
                              Iniciado: <span className="font-data text-foreground">{exec.iniciadoEm}</span>
                            </span>
                          )}
                          {exec.comentarios.length > 0 && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" /> {exec.comentarios.length}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Indisponibilidade Dialog ── */}
      <Dialog open={indispDialog} onOpenChange={setIndispDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Indisponibilidade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Tipo</label>
              <select className="w-full border border-input rounded-lg text-sm p-2 bg-background mt-1">
                <option>Atestado médico</option>
                <option>Falta justificada</option>
                <option>Falta injustificada</option>
                <option>Compensação</option>
                <option>Outro</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">Data início</label>
                <input type="text" placeholder="dd/mm/aaaa" className="w-full border border-input rounded-lg text-sm p-2 bg-background mt-1 font-data" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">Data fim</label>
                <input type="text" placeholder="dd/mm/aaaa" className="w-full border border-input rounded-lg text-sm p-2 bg-background mt-1 font-data" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Horas impactadas</label>
              <input type="number" placeholder="8" className="w-full border border-input rounded-lg text-sm p-2 bg-background mt-1 font-data" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Observação</label>
              <textarea className="w-full border border-input rounded-lg text-sm p-3 bg-background mt-1 min-h-[60px]" placeholder="Opcional..." />
            </div>
            <ValidarBadge>Indisponibilidade deve reagendar atividades automaticamente?</ValidarBadge>
          </div>
          <DialogFooter>
            <button onClick={() => setIndispDialog(false)} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Cancelar</button>
            <button onClick={() => { setIndispDialog(false); toast.success("Indisponibilidade registrada"); }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Registrar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
