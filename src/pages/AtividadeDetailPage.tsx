import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { StatusBadge, ValidarBadge } from "@/components/ui-custom/StatusBadge";
import {
  ArrowLeft, Play, CheckCircle2, Clock, AlertTriangle, Lock,
  PauseCircle, FileText, Package, Layers, Activity, MessageSquare,
  Plus, Briefcase, Timer, Save, ChevronDown, User, CalendarDays, RefreshCw,
  Info, ArrowRight, CalendarRange, BarChart3, Pencil, X } from
"lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import {
  ExecStatus, Apontamento,
  getAtividadesByEntrega, ENTREGAS } from
"@/data/mockData";
import { useExecucoes } from "@/contexts/ExecucoesContext";
import { toast } from "sonner";
import {
  format, eachMonthOfInterval, getDaysInMonth, differenceInCalendarDays,
  startOfMonth, endOfMonth, max as dateMax, min as dateMin, parseISO } from
"date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_CONFIG: Record<ExecStatus, {label: string;variant: "success" | "warning" | "danger" | "info";icon: React.ElementType;}> = {
  planejada: { label: "Planejada", variant: "info", icon: Clock },
  em_realizacao: { label: "Em realização", variant: "warning", icon: Play },
  realizada_parcial: { label: "Realizada parcial", variant: "warning", icon: PauseCircle },
  concluida: { label: "Concluída", variant: "success", icon: CheckCircle2 },
  pendencia_apontamento: { label: "Pendência de apontamento", variant: "danger", icon: AlertTriangle },
  bloqueada_competencia: { label: "Bloqueada (competência)", variant: "danger", icon: Lock }
};

const TIPO_LABELS: Record<Apontamento["tipo"], string> = {
  execucao: "Execução",
  deslocamento: "Deslocamento",
  preparacao: "Preparação"
};

const COMPETENCIA_ATUAL = "03/2026";

// ── Temporal distribution (same logic as ContratosPage) ──
interface CompetenciaDistribuicao {
  competencia: string;
  mes: Date;
  diasUteis: number;
  diasAtividade: number;
  horasPrevistas: number;
  horasRealizadas: number;
}

function calcDistribuicaoMensal(
dataInicio: Date, dataFim: Date, totalHoras: number,
horasRealizadasByMonth?: Record<string, number>)
: CompetenciaDistribuicao[] {
  if (dataFim < dataInicio) return [];
  const months = eachMonthOfInterval({ start: dataInicio, end: dataFim });
  const diasPorMes = months.map((m) => {
    const efInicio = dateMax([dataInicio, startOfMonth(m)]);
    const efFim = dateMin([dataFim, endOfMonth(m)]);
    return Math.max(differenceInCalendarDays(efFim, efInicio) + 1, 0);
  });
  const totalDias = diasPorMes.reduce((s, d) => s + d, 0);
  return months.map((m, i) => {
    const comp = format(m, "MM/yyyy");
    return {
      competencia: comp,
      mes: m,
      diasUteis: Math.round(getDaysInMonth(m) * 0.72),
      diasAtividade: diasPorMes[i],
      horasPrevistas: totalDias > 0 ? Math.round(diasPorMes[i] / totalDias * totalHoras * 10) / 10 : 0,
      horasRealizadas: horasRealizadasByMonth?.[comp] ?? 0
    };
  });
}

function parseDateBR(dateStr: string): Date | null {
  // accepts "dd/mm/yyyy", "dd/mm/yyyy HH:mm", or "yyyy-mm-dd"
  const cleaned = dateStr.split(" ")[0]; // strip time portion if present
  if (cleaned.includes("-")) return parseISO(cleaned);
  const parts = cleaned.split("/");
  if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  return null;
}

function getCompetenciaForDate(dateStr: string): string {
  const d = parseDateBR(dateStr);
  if (!d) return COMPETENCIA_ATUAL;
  return format(d, "MM/yyyy");
}

export default function AtividadeDetailPage() {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const isTecnico = currentProfile.role === "tecnico";
  const isCoordenador = currentProfile.role === "coordenador";
  const isExecProfile = isTecnico || isCoordenador;
  const { execucoes, setExecucoes } = useExecucoes();
  const exec = execucoes.find((e) => e.id === id);

  // Form states
  const [apHoras, setApHoras] = useState<number>(1);
  const [apDescricao, setApDescricao] = useState("");
  const [apTipo, setApTipo] = useState<Apontamento["tipo"]>("execucao");
  const [apDataReal, setApDataReal] = useState("2026-03-11"); // auto-fill with current date
  const [showApForm, setShowApForm] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [paraOutroExecutor, setParaOutroExecutor] = useState(false);
  const [outroExecutorId, setOutroExecutorId] = useState("");

  // ── Temporal programming state ──
  const [programacao, setProgramacao] = useState<Record<string, {dataInicio: string;dataFim: string;}>>({});
  const [editingProg, setEditingProg] = useState(false);
  const [tempInicio, setTempInicio] = useState("");
  const [tempFim, setTempFim] = useState("");

  const getProg = () => {
    if (!exec) return null;
    const p = programacao[exec.id];
    if (!p) {
      // Default from exec.date
      const d = parseDateBR(exec.date);
      if (d) return { dataInicio: format(d, "yyyy-MM-dd"), dataFim: format(d, "yyyy-MM-dd") };
      return null;
    }
    return p;
  };

  const prog = exec ? getProg() : null;
  const progInicio = prog ? parseISO(prog.dataInicio) : null;
  const progFim = prog ? parseISO(prog.dataFim) : null;

  // Build realized hours per competência from apontamentos
  const horasRealizadasByMonth = useMemo(() => {
    if (!exec) return {};
    const map: Record<string, number> = {};
    exec.apontamentos.forEach((ap) => {
      const comp = getCompetenciaForDate(ap.date);
      map[comp] = (map[comp] ?? 0) + ap.horas;
    });
    return map;
  }, [exec]);

  const distribuicao = useMemo(() => {
    if (!exec || !progInicio || !progFim) return [];
    return calcDistribuicaoMensal(progInicio, progFim, exec.horasPlanejadas, horasRealizadasByMonth);
  }, [exec, progInicio, progFim, horasRealizadasByMonth]);

  // Timeline events
  const timelineEvents = useMemo(() => {
    if (!exec) return [];
    const events: {action: string;date: string;type: string;detail?: string;}[] = [];
    if (exec.iniciadoEm) events.push({ action: "Realização iniciada", date: exec.iniciadoEm, type: "start" });
    exec.apontamentos.forEach((ap) => events.push({ action: ap.descricao, date: ap.date, type: "apontamento", detail: `${ap.horas}h · ${TIPO_LABELS[ap.tipo]}` }));
    exec.comentarios.forEach((c) => events.push({ action: c.text, date: c.date, type: "comment", detail: c.author }));
    if (exec.concluidoEm) events.push({ action: "Atividade concluída", date: exec.concluidoEm, type: "done" });
    return events;
  }, [exec]);

  // Other executors available (from all executions sharing the same entrega)
  const outrosExecutores = useMemo(() => {
    if (!exec) return [];
    const names = new Map<string, string>();
    execucoes.forEach(e => {
      if (e.entregaName === exec.entregaName && e.resourceId !== exec.resourceId) {
        names.set(e.resourceId, e.resourceName);
      }
    });
    return Array.from(names.entries()).map(([id, name]) => ({ id, name }));
  }, [execucoes, exec]);

  if (!exec) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <p className="text-sm font-medium text-foreground">Atividade não encontrada</p>
        <button onClick={() => navigate("/execucao")} className="mt-4 text-[12px] text-primary hover:underline">← Voltar</button>
      </div>);

  }

  const cfg = STATUS_CONFIG[exec.status];
  const StatusIcon = cfg.icon;
  const isBloqueada = exec.status === "bloqueada_competencia";
  const pct = exec.horasPlanejadas > 0 ? Math.round(exec.horasRealizadas / exec.horasPlanejadas * 100) : 0;
  const horasRestantes = exec.horasPlanejadas - exec.horasRealizadas;
  const excedeu = horasRestantes < 0;
  const hasPendencia = exec.status === "pendencia_apontamento";

  const entrega = ENTREGAS.find((e) => e.name === exec.entregaName);
  const siblings = entrega ? getAtividadesByEntrega(entrega.id).filter((a) => a.id !== exec.atividadeId) : [];
  const etapaAtividades = entrega ? getAtividadesByEntrega(entrega.id) : [];

  const now = () => "11/03/2026 " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const handleIniciar = () => {
    setExecucoes((prev) => prev.map((e) => e.id === id ? { ...e, status: "em_realizacao" as ExecStatus, iniciadoEm: now() } : e));
    toast.success("Realização iniciada");
  };
  const handleSalvarAndamento = () => {
    setExecucoes((prev) => prev.map((e) => e.id === id ? { ...e, status: "realizada_parcial" as ExecStatus } : e));
    toast.success("Andamento salvo — atividade em realização parcial");
  };
  const handleConcluir = () => {
    if (exec.apontamentos.length === 0) {toast.error("Registre pelo menos um apontamento antes de concluir");return;}
    setExecucoes((prev) => prev.map((e) => e.id === id ? {
      ...e, status: "concluida" as ExecStatus, concluidoEm: now(),
      horasRealizadas: e.apontamentos.reduce((s, a) => s + a.horas, 0)
    } : e));
    toast.success("Atividade concluída com sucesso");
  };

  const handleSaveProgramacao = () => {
    if (!tempInicio || !tempFim) return;
    const di = parseISO(tempInicio);
    const df = parseISO(tempFim);
    if (df < di) return;
    setProgramacao((prev) => ({ ...prev, [exec.id]: { dataInicio: tempInicio, dataFim: tempFim } }));
    // Update competência based on start date
    const novaComp = format(di, "MM/yyyy");
    if (novaComp !== exec.competencia) {
      setExecucoes((prev) => prev.map((e) => e.id === id ? { ...e, competencia: novaComp, date: format(di, "dd/MM/yyyy") } : e));
      toast.success("Programação salva", { description: `Competência ajustada: ${exec.competencia} → ${novaComp}` });
    } else {
      setExecucoes((prev) => prev.map((e) => e.id === id ? { ...e, date: format(di, "dd/MM/yyyy") } : e));
      toast.success("Programação temporal salva");
    }
    setEditingProg(false);
  };

  const handleAddApontamento = () => {
    if (!apDescricao.trim() || apHoras <= 0) return;
    const dataReal = apDataReal || now();
    const compReal = getCompetenciaForDate(dataReal);
    const compsDaProg = distribuicao.map((d) => d.competencia);
    const foraDoIntervalo = compsDaProg.length > 0 && !compsDaProg.includes(compReal);
    const newAp: Apontamento = { id: `ap-${Date.now()}`, horas: apHoras, descricao: apDescricao, date: dataReal, tipo: apTipo };
    setExecucoes((prev) => prev.map((e) => e.id === id ? {
      ...e, apontamentos: [...e.apontamentos, newAp],
      horasRealizadas: e.apontamentos.reduce((s, a) => s + a.horas, 0) + apHoras,
      status: e.status === "pendencia_apontamento" ? "realizada_parcial" as ExecStatus : e.status
    } : e));
    setApHoras(1);setApDescricao("");setApTipo("execucao");setApDataReal("2026-03-11");setShowApForm(false);setParaOutroExecutor(false);setOutroExecutorId("");
    if (foraDoIntervalo) {
      toast.warning(`Apontamento em ${compReal} — fora da programação planejada`, { description: `${apHoras}h registrada(s)` });
    } else {
      toast.success(`Apontamento registrado: ${apHoras}h`);
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    setExecucoes((prev) => prev.map((e) => e.id === id ? {
      ...e, comentarios: [...e.comentarios, { id: `ec-${Date.now()}`, author: currentProfile.label, text: commentText, date: now() }]
    } : e));
    setCommentText("");setShowCommentForm(false);
    toast.success("Observação registrada");
  };

  const canAct = isExecProfile && !isBloqueada;
  const canApontar = canAct && (exec.status === "planejada" || exec.status === "em_realizacao" || exec.status === "realizada_parcial" || exec.status === "pendencia_apontamento");
  const canEditProg = canAct && exec.status !== "concluida";

  return (
    <div className="max-w-3xl">
      {/* Back */}
      <button onClick={() => navigate("/execucao")} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Painel do Técnico / Executor
      </button>

      {/* ═══ HEADER ═══ */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-foreground">{exec.atividadeName}</h1>
              <span className="text-[11px] font-data text-muted-foreground">{exec.atividadeCode}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground flex-wrap">
              <Briefcase className="w-3 h-3 shrink-0" />
              <span className="font-medium text-foreground">{exec.clienteName}</span>
              <span className="text-muted-foreground/40">›</span>
              <FileText className="w-3 h-3 shrink-0" />
              <span className="font-data">{exec.contratoCode}</span>
              <span className="text-muted-foreground/40">›</span>
              <Package className="w-3 h-3 shrink-0" />
              <span>{exec.servicoName}</span>
              <span className="text-muted-foreground/40">›</span>
              <Layers className="w-3 h-3 shrink-0" />
              <span>{exec.entregaName}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[12px]">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Responsável:</span>
              <span className="font-medium text-foreground">{exec.resourceName}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium ${
            exec.status === "concluida" ? "bg-status-success-muted text-status-success border-status-success/20" :
            exec.status === "em_realizacao" || exec.status === "realizada_parcial" ? "bg-status-warning-muted text-status-warning border-status-warning/20" :
            exec.status === "pendencia_apontamento" || isBloqueada ? "bg-status-danger-muted text-status-danger border-status-danger/20" :
            "bg-muted text-muted-foreground border-border"}`
            }>
              <StatusIcon className="w-4 h-4" />
              {cfg.label}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABBED CONTENT FOR TÉCNICO ═══ */}
      {isTecnico ? (
        <Tabs defaultValue="visao-geral" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-10 bg-muted rounded-lg mb-4">
            <TabsTrigger value="visao-geral" className="text-[12px] rounded-md">Visão Geral</TabsTrigger>
            <TabsTrigger value="horas-lancadas" className="text-[12px] rounded-md">Horas Lançadas</TabsTrigger>
            <TabsTrigger value="historico" className="text-[12px] rounded-md">Histórico e Comentários</TabsTrigger>
          </TabsList>

          {/* ── TAB: Visão Geral ── */}
          <TabsContent value="visao-geral" className="space-y-4">
            {/* Bloqueio / Pendência alerts */}
            {isBloqueada && (
              <div className="bg-status-danger-muted border border-status-danger/20 rounded-xl p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-status-danger">Competência {exec.competencia} encerrada</p>
                  <p className="text-[12px] text-status-danger/80 mt-0.5">Não é possível registrar apontamentos.</p>
                </div>
              </div>
            )}
            {hasPendencia && (
              <div className="bg-status-warning-muted border border-status-warning/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-status-warning">Pendência de apontamento</p>
                  <p className="text-[12px] text-status-warning/80 mt-0.5">Atividade realizada mas sem horas registradas.</p>
                </div>
              </div>
            )}

            {/* Progresso */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" /> Progresso da Realização
                </p>
                <span className={`text-[13px] font-data font-semibold ${excedeu ? 'text-status-danger' : pct >= 100 ? 'text-status-success' : 'text-foreground'}`}>
                  {exec.horasRealizadas}/{exec.horasPlanejadas}h
                  <span className="text-muted-foreground font-normal text-[11px] ml-1">({pct}%)</span>
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden mb-3">
                <div className={`h-3 rounded-full transition-all duration-500 ${excedeu ? 'bg-status-danger' : pct >= 100 ? 'bg-status-success' : 'bg-primary'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Planejado: <span className="font-data font-medium text-foreground">{exec.horasPlanejadas}h</span></span>
                  <span className="text-muted-foreground">Realizado: <span className={`font-data font-medium ${excedeu ? 'text-status-danger' : 'text-foreground'}`}>{exec.horasRealizadas}h</span></span>
                </div>
                <span className={`font-data font-medium ${excedeu ? 'text-status-danger' : horasRestantes === 0 ? 'text-status-success' : 'text-muted-foreground'}`}>
                  {excedeu ? `${Math.abs(horasRestantes)}h excedente` : horasRestantes === 0 ? '✓ Completo' : `${horasRestantes}h restante`}
                </span>
              </div>
            </div>

            {/* Ações de Realização */}
            {canAct && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded flex items-center justify-center bg-primary/10">
                    <Play className="w-3 h-3 text-primary" />
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Ações de Realização</p>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Sua ação</span>
                </div>

                {canApontar && !showApForm && (
                  <div className="flex items-center gap-3">
                    <button onClick={() => setShowApForm(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                      <Plus className="w-4 h-4" /> Novo Apontamento
                    </button>
                    <button onClick={() => { if (exec.status === "planejada") handleIniciar(); handleConcluir(); }}
                      className="flex items-center gap-2 px-4 py-2.5 border border-status-success/30 text-status-success rounded-lg text-sm font-medium hover:bg-status-success-muted transition-colors">
                      <CheckCircle2 className="w-4 h-4" /> Concluir Realização
                    </button>
                  </div>
                )}

                {canApontar && showApForm && (
                  <div className="space-y-3">
                    {/* Para outro executor toggle */}
                    {isTecnico && outrosExecutores.length > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                        <input
                          type="checkbox"
                          id="para-outro"
                          checked={paraOutroExecutor}
                          onChange={(e) => { setParaOutroExecutor(e.target.checked); if (!e.target.checked) setOutroExecutorId(""); }}
                          className="rounded border-input accent-primary"
                        />
                        <label htmlFor="para-outro" className="text-[12px] text-foreground cursor-pointer">Lançar horas para outro executor</label>
                      </div>
                    )}

                    {/* Outro executor select */}
                    {paraOutroExecutor && (
                      <div>
                        <label className="text-[11px] text-muted-foreground font-medium">Executor</label>
                        <select value={outroExecutorId} onChange={(e) => setOutroExecutorId(e.target.value)}
                          className="w-full border border-input rounded-lg text-sm p-2.5 bg-background mt-1">
                          <option value="">Selecione o executor</option>
                          {outrosExecutores.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-muted-foreground font-medium">Atividade</label>
                        <select value={apTipo} onChange={(e) => setApTipo(e.target.value as Apontamento["tipo"])}
                          className="w-full border border-input rounded-lg text-sm p-2.5 bg-background mt-1">
                          {paraOutroExecutor ? (
                            /* When delegating: show all activities linked to etapa */
                            etapaAtividades.map(atv => (
                              <option key={atv.id} value="execucao">{atv.name}</option>
                            ))
                          ) : (
                            <>
                              <option value="execucao">Execução</option>
                              <option value="deslocamento">Deslocamento</option>
                              <option value="preparacao">Preparação</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground font-medium">Horas</label>
                        <input type="number" min={0.5} step={0.5} value={apHoras} onChange={(e) => setApHoras(Number(e.target.value))}
                          className="w-full border border-input rounded-lg text-sm p-2.5 bg-background mt-1 font-data" />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground font-medium">Data real</label>
                        <input type="date" value={apDataReal} onChange={(e) => setApDataReal(e.target.value)}
                          className="w-full border border-input rounded-lg text-sm p-2.5 bg-background mt-1 font-data" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">Descrição</label>
                      <textarea value={apDescricao} onChange={(e) => setApDescricao(e.target.value)}
                        className="w-full border border-input rounded-lg text-sm p-3 bg-background mt-1 min-h-[70px]"
                        placeholder="Descreva o trabalho executado..." />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setShowApForm(false); setApDescricao(""); setApDataReal("2026-03-11"); setApHoras(1); setApTipo("execucao"); setParaOutroExecutor(false); setOutroExecutorId(""); }}
                        className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors">
                        Cancelar
                      </button>
                      <button onClick={() => { if (exec.status === "planejada") handleIniciar(); handleAddApontamento(); }}
                        disabled={!apDescricao.trim() || apHoras <= 0 || (paraOutroExecutor && !outroExecutorId)}
                        className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                        Registrar apontamento
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Info cards */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-card">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Contrato</p>
                  <p className="text-[12px] font-medium text-foreground mt-1">{exec.clienteName}</p>
                  <p className="text-[11px] font-data text-muted-foreground">{exec.contratoCode}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Serviço</p>
                  <p className="text-[12px] font-medium text-foreground mt-1">{exec.servicoName}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Entrega</p>
                  <p className="text-[12px] font-medium text-foreground mt-1">{exec.entregaName}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB: Horas Lançadas ── */}
          <TabsContent value="horas-lancadas" className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" /> Horas Lançadas ({exec.apontamentos.length})
                </p>
                <span className="text-[12px] font-data font-medium text-foreground">
                  Total: {exec.apontamentos.reduce((s, a) => s + a.horas, 0)}h
                </span>
              </div>
              {exec.apontamentos.length === 0 ? (
                <div className="bg-muted/20 rounded-lg p-6 text-center">
                  <Timer className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-[12px] text-muted-foreground">Nenhum apontamento registrado</p>
                  {hasPendencia && <p className="text-[11px] text-status-danger mt-1">⚠ Esta atividade aguarda registro de horas</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  {exec.apontamentos.map((ap, i) => {
                    const apComp = getCompetenciaForDate(ap.date);
                    const compsProg = distribuicao.map((d) => d.competencia);
                    const foraComp = compsProg.length > 0 && !compsProg.includes(apComp);
                    return (
                      <div key={ap.id} className={`flex items-start gap-3 rounded-lg px-4 py-3 border ${foraComp ? 'bg-status-warning-muted/20 border-status-warning/20' : 'bg-muted/15 border-border/50'}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          ap.tipo === "execucao" ? "bg-primary/10" : ap.tipo === "deslocamento" ? "bg-status-warning-muted" : "bg-muted"}`}>
                          <span className="text-[10px] font-semibold font-data text-foreground">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-foreground">{ap.descricao}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-medium ${
                              ap.tipo === "execucao" ? "bg-primary/8 text-primary border-primary/15" :
                              ap.tipo === "deslocamento" ? "bg-status-warning-muted text-status-warning border-status-warning/20" :
                              "bg-muted text-muted-foreground border-border"}`}>{TIPO_LABELS[ap.tipo]}</span>
                            <span>{ap.date}</span>
                          </div>
                        </div>
                        <span className="text-[14px] font-data font-semibold text-foreground shrink-0">{ap.horas}h</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TAB: Histórico e Comentários ── */}
          <TabsContent value="historico" className="space-y-4">
            {/* Comentários */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Comentários ({exec.comentarios.length})
                </p>
                {canAct && !showCommentForm && (
                  <button onClick={() => setShowCommentForm(true)} className="text-[11px] text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                )}
              </div>
              {showCommentForm && canAct && (
                <div className="mb-3 bg-muted/20 rounded-lg p-3 border border-border/50">
                  <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    className="w-full border border-input rounded-lg text-sm p-3 bg-background min-h-[70px]"
                    placeholder="Registre observações, pendências ou informações relevantes..." />
                  <div className="flex gap-2 justify-end mt-2">
                    <button onClick={() => { setShowCommentForm(false); setCommentText(""); }} className="px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground">Cancelar</button>
                    <button onClick={handleAddComment} disabled={!commentText.trim()}
                      className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-[11px] font-medium hover:bg-primary/90 disabled:opacity-50">Enviar</button>
                  </div>
                </div>
              )}
              {exec.comentarios.length === 0 && !showCommentForm ? (
                <p className="text-[12px] text-muted-foreground italic">Nenhuma observação registrada.</p>
              ) : (
                <div className="space-y-2">
                  {exec.comentarios.map((c) => (
                    <div key={c.id} className="bg-muted/15 rounded-lg p-3 border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-foreground flex items-center gap-1"><User className="w-3 h-3 text-muted-foreground" /> {c.author}</span>
                        <span className="text-[10px] text-muted-foreground">{c.date}</span>
                      </div>
                      <p className="text-[12px] text-foreground/80 leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Histórico */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-card">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-4">
                <Clock className="w-3.5 h-3.5" /> Histórico da Realização ({timelineEvents.length})
              </p>
              {timelineEvents.length === 0 ? (
                <p className="text-[12px] text-muted-foreground italic">Nenhuma ação registrada — inicie a realização.</p>
              ) : (
                <div className="space-y-0">
                  {timelineEvents.map((ev, i) => (
                    <div key={i} className="relative pl-6 pb-3.5">
                      {i < timelineEvents.length - 1 && <div className="absolute left-[9px] top-4 bottom-0 w-px bg-border" />}
                      <div className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                        ev.type === "done" ? 'border-status-success bg-status-success-muted' :
                        ev.type === "start" ? 'border-primary bg-primary/10' :
                        ev.type === "apontamento" ? 'border-primary/50 bg-primary/5' :
                        'border-border bg-card'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          ev.type === "done" ? 'bg-status-success' : ev.type === "start" ? 'bg-primary' : ev.type === "apontamento" ? 'bg-primary/60' : 'bg-muted-foreground'}`} />
                      </div>
                      <p className={`text-[12px] font-medium ${ev.type === "done" ? 'text-status-success' : 'text-foreground'}`}>{ev.action}</p>
                      {ev.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{ev.detail}</p>}
                      <p className="text-[10px] text-muted-foreground">{ev.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        /* ═══ NON-TÉCNICO: Original layout ═══ */
        <>
          {/* BLOCO 1: ALOCAÇÃO MACRO */}
          <div className="bg-muted/20 border border-border rounded-xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-muted-foreground/10">
                <Info className="w-3 h-3 text-muted-foreground" />
              </div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Alocação Macro</p>
              <span className="text-[9px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-medium">Definida pelo Facilitador do Processo</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-background rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Contrato</p>
                <p className="text-[13px] font-medium text-foreground mt-1">{exec.clienteName}</p>
                <p className="text-[11px] font-data text-muted-foreground">{exec.contratoCode}</p>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Serviço</p>
                <p className="text-[13px] font-medium text-foreground mt-1">{exec.servicoName}</p>
                <p className="text-[11px] font-data text-muted-foreground">{exec.servicoCode}</p>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Entrega</p>
                <p className="text-[13px] font-medium text-foreground mt-1">{exec.entregaName}</p>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Competência alocada</p>
                <p className="text-[15px] font-data font-semibold text-primary mt-1">{exec.competencia}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Horas: {exec.horasPlanejadas}h</p>
              </div>
            </div>
          </div>

          {/* BLOQUEIO / PENDÊNCIA */}
          {isBloqueada && (
            <div className="bg-status-danger-muted border border-status-danger/20 rounded-xl p-4 mb-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-status-danger">Competência {exec.competencia} encerrada</p>
                <p className="text-[12px] text-status-danger/80 mt-0.5">Não é possível registrar apontamentos. A competência vigente é {COMPETENCIA_ATUAL}.</p>
              </div>
            </div>
          )}
          {hasPendencia && (
            <div className="bg-status-warning-muted border border-status-warning/20 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-status-warning">Pendência de apontamento</p>
                <p className="text-[12px] text-status-warning/80 mt-0.5">Atividade realizada mas sem horas registradas. Lance os apontamentos abaixo.</p>
              </div>
            </div>
          )}

          {/* AÇÕES DE REALIZAÇÃO */}
          {canAct && (
            <div className="bg-card border border-border rounded-xl p-5 mb-4 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-primary/10">
                  <Play className="w-3 h-3 text-primary" />
                </div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Ações de Realização</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {canApontar && (
                  <>
                    <button onClick={() => { if (exec.status === "planejada") handleIniciar(); setShowApForm(true); }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                      <Plus className="w-4 h-4" /> Registrar Apontamento
                    </button>
                    <button onClick={() => { if (exec.status === "planejada") handleIniciar(); handleConcluir(); }}
                      className="flex items-center gap-2 px-4 py-2.5 border border-status-success/30 text-status-success rounded-lg text-sm font-medium hover:bg-status-success-muted transition-colors">
                      <CheckCircle2 className="w-4 h-4" /> Concluir Realização
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* PROGRESSO */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> Progresso da Realização
              </p>
              <span className={`text-[13px] font-data font-semibold ${excedeu ? 'text-status-danger' : pct >= 100 ? 'text-status-success' : 'text-foreground'}`}>
                {exec.horasRealizadas}/{exec.horasPlanejadas}h
                <span className="text-muted-foreground font-normal text-[11px] ml-1">({pct}%)</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-3">
              <div className={`h-3 rounded-full transition-all duration-500 ${excedeu ? 'bg-status-danger' : pct >= 100 ? 'bg-status-success' : 'bg-primary'}`}
                style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex gap-4">
                <span className="text-muted-foreground">Planejado: <span className="font-data font-medium text-foreground">{exec.horasPlanejadas}h</span></span>
                <span className="text-muted-foreground">Realizado: <span className={`font-data font-medium ${excedeu ? 'text-status-danger' : 'text-foreground'}`}>{exec.horasRealizadas}h</span></span>
              </div>
              <span className={`font-data font-medium ${excedeu ? 'text-status-danger' : horasRestantes === 0 ? 'text-status-success' : 'text-muted-foreground'}`}>
                {excedeu ? `${Math.abs(horasRestantes)}h excedente` : horasRestantes === 0 ? '✓ Completo' : `${horasRestantes}h restante`}
              </span>
            </div>
          </div>

          {/* FORMULÁRIO DE APONTAMENTO (non-tecnico) */}
          {showApForm && canApontar && (
            <div className="bg-primary/3 border border-primary/15 rounded-xl p-5 mb-4">
              <p className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Novo Apontamento de Horas
              </p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">Tipo</label>
                  <select value={apTipo} onChange={(e) => setApTipo(e.target.value as Apontamento["tipo"])}
                    className="w-full border border-input rounded-lg text-sm p-2.5 bg-background mt-1">
                    <option value="execucao">Execução</option>
                    <option value="deslocamento">Deslocamento</option>
                    <option value="preparacao">Preparação</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">Horas</label>
                  <input type="number" min={0.5} step={0.5} value={apHoras} onChange={(e) => setApHoras(Number(e.target.value))}
                    className="w-full border border-input rounded-lg text-sm p-2.5 bg-background mt-1 font-data" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">Data real</label>
                  <input type="date" value={apDataReal} onChange={(e) => setApDataReal(e.target.value)}
                    className="w-full border border-input rounded-lg text-sm p-2.5 bg-background mt-1 font-data" />
                </div>
              </div>
              <div className="mb-3">
                <label className="text-[11px] text-muted-foreground font-medium">Descrição do que foi realizado</label>
                <textarea value={apDescricao} onChange={(e) => setApDescricao(e.target.value)}
                  className="w-full border border-input rounded-lg text-sm p-3 bg-background mt-1 min-h-[80px]"
                  placeholder="Descreva o trabalho executado neste período..." />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowApForm(false); setApDescricao(""); setApDataReal(""); }} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors">Cancelar</button>
                <button onClick={handleAddApontamento} disabled={!apDescricao.trim() || apHoras <= 0}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  Salvar
                </button>
              </div>
            </div>
          )}

          {/* HORAS LANÇADAS */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> Horas Lançadas ({exec.apontamentos.length})
              </p>
              <span className="text-[12px] font-data font-medium text-foreground">
                Total: {exec.apontamentos.reduce((s, a) => s + a.horas, 0)}h
              </span>
            </div>
            {exec.apontamentos.length === 0 ? (
              <div className="bg-muted/20 rounded-lg p-6 text-center">
                <Timer className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-[12px] text-muted-foreground">Nenhum apontamento registrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exec.apontamentos.map((ap, i) => (
                  <div key={ap.id} className="flex items-start gap-3 rounded-lg px-4 py-3 border bg-muted/15 border-border/50">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      ap.tipo === "execucao" ? "bg-primary/10" : ap.tipo === "deslocamento" ? "bg-status-warning-muted" : "bg-muted"}`}>
                      <span className="text-[10px] font-semibold font-data text-foreground">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground">{ap.descricao}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-medium ${
                          ap.tipo === "execucao" ? "bg-primary/8 text-primary border-primary/15" :
                          ap.tipo === "deslocamento" ? "bg-status-warning-muted text-status-warning border-status-warning/20" :
                          "bg-muted text-muted-foreground border-border"}`}>{TIPO_LABELS[ap.tipo]}</span>
                        <span>{ap.date}</span>
                      </div>
                    </div>
                    <span className="text-[14px] font-data font-semibold text-foreground shrink-0">{ap.horas}h</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COMENTÁRIOS */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Comentários de Execução ({exec.comentarios.length})
              </p>
              {canAct && !showCommentForm && (
                <button onClick={() => setShowCommentForm(true)} className="text-[11px] text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              )}
            </div>
            {showCommentForm && canAct && (
              <div className="mb-3 bg-muted/20 rounded-lg p-3 border border-border/50">
                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  className="w-full border border-input rounded-lg text-sm p-3 bg-background min-h-[70px]"
                  placeholder="Registre observações..." />
                <div className="flex gap-2 justify-end mt-2">
                  <button onClick={() => { setShowCommentForm(false); setCommentText(""); }} className="px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground">Cancelar</button>
                  <button onClick={handleAddComment} disabled={!commentText.trim()}
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-[11px] font-medium hover:bg-primary/90 disabled:opacity-50">Enviar</button>
                </div>
              </div>
            )}
            {exec.comentarios.length === 0 && !showCommentForm ? (
              <p className="text-[12px] text-muted-foreground italic">Nenhuma observação registrada.</p>
            ) : (
              <div className="space-y-2">
                {exec.comentarios.map((c) => (
                  <div key={c.id} className="bg-muted/15 rounded-lg p-3 border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-foreground flex items-center gap-1"><User className="w-3 h-3 text-muted-foreground" /> {c.author}</span>
                      <span className="text-[10px] text-muted-foreground">{c.date}</span>
                    </div>
                    <p className="text-[12px] text-foreground/80 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTÓRICO */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4 shadow-card">
            <button onClick={() => setShowTimeline(!showTimeline)} className="w-full flex items-center justify-between text-left">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Histórico da Realização ({timelineEvents.length})
              </p>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showTimeline ? 'rotate-180' : ''}`} />
            </button>
            {showTimeline && (
              <div className="mt-4 space-y-0">
                {timelineEvents.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground italic">Nenhuma ação registrada.</p>
                ) : (
                  timelineEvents.map((ev, i) => (
                    <div key={i} className="relative pl-6 pb-3.5">
                      {i < timelineEvents.length - 1 && <div className="absolute left-[9px] top-4 bottom-0 w-px bg-border" />}
                      <div className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                        ev.type === "done" ? 'border-status-success bg-status-success-muted' :
                        ev.type === "start" ? 'border-primary bg-primary/10' :
                        ev.type === "apontamento" ? 'border-primary/50 bg-primary/5' :
                        'border-border bg-card'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          ev.type === "done" ? 'bg-status-success' : ev.type === "start" ? 'bg-primary' : ev.type === "apontamento" ? 'bg-primary/60' : 'bg-muted-foreground'}`} />
                      </div>
                      <p className={`text-[12px] font-medium ${ev.type === "done" ? 'text-status-success' : 'text-foreground'}`}>{ev.action}</p>
                      {ev.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{ev.detail}</p>}
                      <p className="text-[10px] text-muted-foreground">{ev.date}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}