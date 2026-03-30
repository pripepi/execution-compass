import React, { useState } from "react";
import { PageHeader, DataCard, ValidarBadge, StatusBadge } from "@/components/ui-custom/StatusBadge";
import { DashboardFilters, DEFAULT_FILTERS, DashboardFilterState } from "./DashboardFilters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, Users, ArrowRightLeft, UserPlus, Clock, FileX, ChevronRight } from "lucide-react";
import {
  CONTRATOS, SERVICOS, RECURSOS, ALOCACOES, ALOCACOES_ATIVIDADE, EXECUCOES, MOBILIDADES, TERCEIROS,
  ATIVIDADES, ENTREGAS, getEntregasByServico, getAtividadesByEntrega,
  getRecursosCompativeisParaAtividade, getCapacidadeRecurso, getHorasAlocadasRecurso,
} from "@/data/mockData";

const ALL = "__all__";

export default function DashboardFacilitador() {
  const [filters, setFilters] = useState<DashboardFilterState>(DEFAULT_FILTERS);
  const [drillSection, setDrillSection] = useState<string | null>(null);

  // --- KPIs do Facilitador ---
  // Alocação
  const totalAlocacoes = ALOCACOES_ATIVIDADE.filter(a => a.status === "alocado").length;
  const alocacoesPendentes = ALOCACOES.filter(a => a.status === "pendente").length;

  // Capacidade de pessoas
  const recursosDisponiveis = RECURSOS.filter(r => r.status === "ativo");
  const recursosComCarga = RECURSOS.map(r => {
    const alocado = getHorasAlocadasRecurso(r.id);
    return { ...r, alocado, pct: r.hoursMonthly > 0 ? Math.round((alocado / r.hoursMonthly) * 100) : 0 };
  });
  const sobrecarregados = recursosComCarga.filter(r => r.pct > 85);

  // Execução
  const atividadesEmRealizacao = EXECUCOES.filter(e => e.status === "em_realizacao" || e.status === "realizada_parcial").length;
  const atividadesConcluidas = EXECUCOES.filter(e => e.status === "concluida").length;
  const pendenciasLancamento = EXECUCOES.filter(e => e.status === "pendencia_apontamento").length;
  const horasRealizadas = EXECUCOES.reduce((s, e) => s + e.horasRealizadas, 0);
  const horasPlanejadas = EXECUCOES.reduce((s, e) => s + e.horasPlanejadas, 0);

  // Mobilidade & Terceiros
  const mobilidadesPendentes = MOBILIDADES.filter(m => m.status === "pendente");
  const mobilidadesComAlerta = MOBILIDADES.filter(m => m.alert);
  const terceirosPendentes = TERCEIROS.filter(t => t.status === "pendente" || t.status === "em_contratacao");

  // Atividades sem executor
  const atividadesSemExecutor = ATIVIDADES.filter(a => a.status === "ativa" && a.cargosPermitidos.length > 0).filter(a => {
    return getRecursosCompativeisParaAtividade(a.id).filter(r => r.status === "ativo").length === 0;
  });

  // Charts
  const capacidadePorPessoa = recursosComCarga.filter(r => r.alocado > 0 || r.status === "ativo").map(r => ({
    name: r.name.split(" ")[0],
    alocado: r.alocado,
    disponivel: Math.max(0, r.hoursMonthly - r.alocado),
  }));

  const statusPie = [
    { name: "Concluídas", value: EXECUCOES.filter(e => e.status === "concluida").length, color: "hsl(var(--status-success))" },
    { name: "Em realização", value: EXECUCOES.filter(e => e.status === "em_realizacao" || e.status === "realizada_parcial").length, color: "hsl(var(--primary))" },
    { name: "Planejadas", value: EXECUCOES.filter(e => e.status === "planejada").length, color: "hsl(var(--muted-foreground))" },
    { name: "Pendências", value: pendenciasLancamento, color: "hsl(var(--status-danger))" },
  ].filter(d => d.value > 0);

  // Horas por entrega (hierarchy)
  const horasPorEntrega = ENTREGAS.filter(e => e.status === "ativa").map(ent => {
    const execs = EXECUCOES.filter(ex => ex.entregaName === ent.name);
    return {
      name: ent.name.length > 16 ? ent.name.slice(0, 16) + "…" : ent.name,
      planejado: execs.reduce((s, e) => s + e.horasPlanejadas, 0),
      realizado: execs.reduce((s, e) => s + e.horasRealizadas, 0),
    };
  }).filter(d => d.planejado > 0 || d.realizado > 0);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Painel do Coordenador" description="Planejamento, alocação e redistribuição da execução operacional" />

      <DashboardFilters filters={filters} onChange={setFilters} show={["contrato", "servico", "entrega", "recurso"]} />

      {/* KPI Row 1 — Planejamento & Alocação */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <DataCard label="Alocações ativas" value={totalAlocacoes} variant="success" sublabel={`${alocacoesPendentes} pendentes`} />
        <div onClick={() => setDrillSection(drillSection === "sobrecarga" ? null : "sobrecarga")} className="cursor-pointer">
          <DataCard label="Pessoas sobrecarregadas" value={sobrecarregados.length} variant={sobrecarregados.length > 0 ? "danger" : "success"} sublabel="> 85% capacidade" />
        </div>
        <div onClick={() => setDrillSection(drillSection === "sem_executor" ? null : "sem_executor")} className="cursor-pointer">
          <DataCard label="Sem executor" value={atividadesSemExecutor.length} variant={atividadesSemExecutor.length > 0 ? "danger" : "success"} />
        </div>
        <DataCard label="Em realização" value={atividadesEmRealizacao} variant="default" />
        <DataCard label="Concluídas" value={atividadesConcluidas} variant="success" />
      </div>

      {/* KPI Row 2 — Exceções */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div onClick={() => setDrillSection(drillSection === "mobilidade" ? null : "mobilidade")} className="cursor-pointer">
          <DataCard label="Mobilidades pendentes" value={mobilidadesPendentes.length} variant={mobilidadesPendentes.length > 0 ? "warning" : "default"} sublabel={`${mobilidadesComAlerta.length} com alerta`} />
        </div>
        <div onClick={() => setDrillSection(drillSection === "terceiros" ? null : "terceiros")} className="cursor-pointer">
          <DataCard label="Terceiros em aberto" value={terceirosPendentes.length} variant={terceirosPendentes.length > 0 ? "warning" : "default"} />
        </div>
        <DataCard label="Pendência lançamento" value={pendenciasLancamento} variant={pendenciasLancamento > 0 ? "danger" : "success"} />
        <DataCard label="Horas realizadas" value={`${horasRealizadas}h`} sublabel={`de ${horasPlanejadas}h planejadas`} />
      </div>

      {/* Drill-downs */}
      {drillSection === "sobrecarga" && (
        <DrillPanel title="Pessoas com carga > 85%" onClose={() => setDrillSection(null)}>
          {sobrecarregados.length === 0 ? <EmptyState message="Nenhuma pessoa sobrecarregada." /> : (
            <div className="space-y-2">
              {sobrecarregados.map(r => (
                <div key={r.id} className="flex items-center gap-3 py-1.5 border-b border-border/50">
                  <span className="text-xs text-foreground w-36">{r.name}</span>
                  <span className="text-[10px] text-muted-foreground w-28">{r.role}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className={`rounded-full h-2 ${r.pct > 90 ? "bg-status-danger" : "bg-status-warning"}`} style={{ width: `${Math.min(100, r.pct)}%` }} />
                  </div>
                  <span className={`text-xs font-data font-semibold w-10 text-right ${r.pct > 90 ? "text-status-danger" : "text-status-warning"}`}>{r.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </DrillPanel>
      )}

      {drillSection === "sem_executor" && (
        <DrillPanel title="Atividades sem executor compatível" onClose={() => setDrillSection(null)}>
          {atividadesSemExecutor.length === 0 ? <EmptyState message="Todas as atividades têm executores." /> : (
            <div className="space-y-1">
              {atividadesSemExecutor.map(a => {
                const ent = ENTREGAS.find(e => e.id === a.entregaId);
                return (
                  <div key={a.id} className="flex items-center gap-2 py-1.5 border-b border-border/50">
                    <span className="text-xs text-foreground">{a.name}</span>
                    <span className="text-[10px] text-muted-foreground">({ent?.name})</span>
                    <StatusBadge variant="danger">Sem executor</StatusBadge>
                    <span className="text-[10px] text-muted-foreground ml-auto">→ Mobilidade ou Terceiro</span>
                  </div>
                );
              })}
            </div>
          )}
        </DrillPanel>
      )}

      {drillSection === "mobilidade" && (
        <DrillPanel title="Mobilidades pendentes" onClose={() => setDrillSection(null)}>
          {mobilidadesPendentes.length === 0 ? <EmptyState message="Sem mobilidades pendentes." /> : (
            <div className="space-y-2">
              {mobilidadesPendentes.map(m => (
                <div key={m.id} className="flex items-center gap-2 py-1.5 border-b border-border/50">
                  <span className="text-xs text-foreground w-28">{m.resource}</span>
                  <span className="text-[10px] text-muted-foreground">{m.from} → {m.to}</span>
                  <span className="text-[10px] font-data text-muted-foreground">{m.distance}</span>
                  {m.alert && <StatusBadge variant="danger">Excede limite</StatusBadge>}
                  <span className="text-[10px] text-muted-foreground ml-auto">{m.atividadeName}</span>
                </div>
              ))}
            </div>
          )}
        </DrillPanel>
      )}

      {drillSection === "terceiros" && (
        <DrillPanel title="Solicitações de terceiros em aberto" onClose={() => setDrillSection(null)}>
          {terceirosPendentes.length === 0 ? <EmptyState message="Sem solicitações de terceiros." /> : (
            <div className="space-y-2">
              {terceirosPendentes.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-border/50">
                  <span className="text-xs text-foreground w-36">{t.atividadeName}</span>
                  <StatusBadge variant={t.status === "pendente" ? "warning" : "info"}>{t.status === "pendente" ? "Pendente" : "Em contratação"}</StatusBadge>
                  <span className="text-[10px] text-muted-foreground ml-auto">{t.cargoNecessario}</span>
                </div>
              ))}
            </div>
          )}
        </DrillPanel>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Capacidade por Pessoa</h3>
          {capacidadePorPessoa.length === 0 ? <EmptyState message="Sem dados de capacidade." /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={capacidadePorPessoa} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="alocado" stackId="a" fill="hsl(var(--primary))" name="Alocado" radius={[0, 0, 0, 0]} />
                <Bar dataKey="disponivel" stackId="a" fill="hsl(var(--muted))" name="Disponível" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Status das Atividades</h3>
          {statusPie.length === 0 ? <EmptyState message="Sem atividades." /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                    {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusPie.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-foreground">{s.name}</span>
                    <span className="text-xs font-data text-muted-foreground ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Horas por Entrega */}
      {horasPorEntrega.length > 0 && (
        <div className="bg-card border border-border rounded-md p-4 mb-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Horas por Entrega — Planejado × Realizado</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={horasPorEntrega}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="planejado" fill="hsl(var(--muted))" name="Planejado" radius={[3, 3, 0, 0]} />
              <Bar dataKey="realizado" fill="hsl(var(--status-success))" name="Realizado" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alerts */}
      {(mobilidadesComAlerta.length > 0 || pendenciasLancamento > 0 || sobrecarregados.length > 0) && (
        <div className="bg-status-warning-muted border border-status-warning/20 rounded-md p-4 mb-6 space-y-1">
          <div className="flex items-center gap-2 text-status-warning font-medium text-sm mb-2">
            <AlertTriangle className="w-4 h-4" /> Atenção do Facilitador
          </div>
          {mobilidadesComAlerta.length > 0 && <p className="text-xs text-foreground">• {mobilidadesComAlerta.length} mobilidade(s) excedendo limite parametrizado</p>}
          {pendenciasLancamento > 0 && <p className="text-xs text-foreground">• {pendenciasLancamento} atividade(s) realizadas sem apontamento de horas</p>}
          {sobrecarregados.length > 0 && <p className="text-xs text-foreground">• {sobrecarregados.length} pessoa(s) com carga acima de 85% — considerar redistribuição</p>}
        </div>
      )}

      <div className="space-y-2">
        <ValidarBadge>Definir regra de redistribuição automática quando pessoa exceder 90%</ValidarBadge>
        <br />
        <ValidarBadge>Alertar facilitador quando prazo de entrega estiver próximo e atividades pendentes</ValidarBadge>
      </div>
    </div>
  );
}

function DrillPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-md p-4 mb-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Fechar ×</button>
      </div>
      {children}
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
