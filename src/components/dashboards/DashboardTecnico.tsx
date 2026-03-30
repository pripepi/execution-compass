import React, { useState } from "react";
import { PageHeader, DataCard, ValidarBadge, StatusBadge } from "@/components/ui-custom/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Clock, CheckCircle2, Play, FileX, Lock } from "lucide-react";
import { ExecStatus } from "@/data/mockData";
import { useExecucoes } from "@/contexts/ExecucoesContext";
import { useNavigate } from "react-router-dom";

const statusLabels: Record<ExecStatus, string> = {
  planejada: "Planejada",
  em_realizacao: "Em realização",
  realizada_parcial: "Parcial",
  concluida: "Concluída",
  pendencia_apontamento: "Pendência",
  bloqueada_competencia: "Bloqueada",
};

const statusVariants: Record<ExecStatus, "info" | "success" | "warning" | "danger"> = {
  planejada: "info",
  em_realizacao: "info",
  realizada_parcial: "warning",
  concluida: "success",
  pendencia_apontamento: "danger",
  bloqueada_competencia: "danger",
};

export default function DashboardTecnico() {
  const navigate = useNavigate();
  const { execucoes } = useExecucoes();
  // Simulate current user = "Carlos Silva" (rc-1)
  const myExecucoes = execucoes.filter(e => e.resourceId === "rc-1");

  const planejadas = myExecucoes.filter(e => e.status === "planejada").length;
  const emRealizacao = myExecucoes.filter(e => e.status === "em_realizacao" || e.status === "realizada_parcial").length;
  const concluidas = myExecucoes.filter(e => e.status === "concluida").length;
  const pendencias = myExecucoes.filter(e => e.status === "pendencia_apontamento").length;
  const bloqueadas = myExecucoes.filter(e => e.status === "bloqueada_competencia").length;
  const horasRealizadas = myExecucoes.reduce((s, e) => s + e.horasRealizadas, 0);
  const horasPlanejadas = myExecucoes.reduce((s, e) => s + e.horasPlanejadas, 0);
  const totalApontamentos = myExecucoes.reduce((s, e) => s + e.apontamentos.length, 0);

  // Chart: horas por atividade
  const horasPorAtividade = myExecucoes
    .filter(e => e.status !== "bloqueada_competencia")
    .map(e => ({
      name: e.atividadeName.length > 14 ? e.atividadeName.slice(0, 14) + "…" : e.atividadeName,
      planejado: e.horasPlanejadas,
      realizado: e.horasRealizadas,
    }));

  return (
    <div className="max-w-5xl">
      <PageHeader title="Meu Painel" description="Visão pessoal das atividades, horas lançadas e pendências" />

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <DataCard label="Planejadas" value={planejadas} />
        <DataCard label="Em realização" value={emRealizacao} variant="default" />
        <DataCard label="Concluídas" value={concluidas} variant="success" />
        <DataCard label="Pendência apontamento" value={pendencias} variant={pendencias > 0 ? "danger" : "success"} />
        <DataCard label="Horas realizadas" value={`${horasRealizadas}h`} sublabel={`de ${horasPlanejadas}h plan.`} />
      </div>

      {/* Alerts */}
      {(pendencias > 0 || bloqueadas > 0) && (
        <div className="bg-status-warning-muted border border-status-warning/20 rounded-md p-4 mb-6 space-y-1">
          <div className="flex items-center gap-2 text-status-warning font-medium text-sm mb-2">
            <AlertTriangle className="w-4 h-4" /> Atenção
          </div>
          {pendencias > 0 && <p className="text-xs text-foreground">• {pendencias} atividade(s) realizada(s) sem apontamento de horas — regularize antes do fechamento</p>}
          {bloqueadas > 0 && <p className="text-xs text-foreground">• {bloqueadas} atividade(s) bloqueada(s) por competência encerrada</p>}
        </div>
      )}

      {/* Horas chart */}
      {horasPorAtividade.length > 0 && (
        <div className="bg-card border border-border rounded-md p-4 mb-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Horas: Planejado × Realizado</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={horasPorAtividade}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="planejado" fill="hsl(var(--muted))" name="Planejado" radius={[3, 3, 0, 0]} />
              <Bar dataKey="realizado" fill="hsl(var(--primary))" name="Realizado" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Progress summary */}
      <div className="bg-card border border-border rounded-md p-4 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Progresso Geral</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">Horas realizadas</span>
              <span className="text-xs font-data font-semibold text-foreground">{horasRealizadas}h / {horasPlanejadas}h</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${horasPlanejadas > 0 ? Math.min(100, (horasRealizadas / horasPlanejadas) * 100) : 0}%` }} />
            </div>
          </div>
          <div className="text-center px-4 border-l border-border">
            <p className="text-lg font-semibold font-data text-foreground">{totalApontamentos}</p>
            <p className="text-[10px] text-muted-foreground">Apontamentos</p>
          </div>
        </div>
      </div>

      {/* Activity list */}
      <div className="bg-card border border-border rounded-md p-4 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Painel do Técnico / Executor</h3>
        {myExecucoes.length === 0 ? (
          <EmptyState message="Nenhuma atividade atribuída." />
        ) : (
          <div className="space-y-1">
            {myExecucoes.map(ex => (
              <div
                key={ex.id}
                onClick={() => navigate(`/execucao/${ex.id}`)}
                className="flex items-center gap-3 py-2.5 px-2 rounded-md border border-transparent hover:border-border hover:bg-accent/30 cursor-pointer transition-colors"
              >
                {ex.status === "bloqueada_competencia" ? (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                ) : ex.status === "concluida" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                ) : ex.status === "pendencia_apontamento" ? (
                  <Clock className="w-3.5 h-3.5 text-status-danger" />
                ) : ex.status === "em_realizacao" || ex.status === "realizada_parcial" ? (
                  <Play className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{ex.atividadeName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{ex.entregaName} · {ex.servicoName} · {ex.contratoCode}</p>
                </div>
                <StatusBadge variant={statusVariants[ex.status]}>{statusLabels[ex.status]}</StatusBadge>
                <span className="text-xs font-data text-muted-foreground w-16 text-right">{ex.horasRealizadas}/{ex.horasPlanejadas}h</span>
                <span className="text-[10px] text-muted-foreground w-20 text-right">{ex.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ValidarBadge>Definir meta diária de horas do técnico para acompanhamento pessoal</ValidarBadge>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <FileX className="w-8 h-8 mb-2 opacity-40" />
      <p className="text-xs">{message}</p>
    </div>
  );
}
