import React, { useState } from "react";
import { PageHeader, DataCard, ValidarBadge, StatusBadge } from "@/components/ui-custom/StatusBadge";
import { DashboardFilters, DEFAULT_FILTERS, DashboardFilterState } from "./DashboardFilters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, ChevronRight, FileX } from "lucide-react";
import {
  CONTRATOS, SERVICOS, RECURSOS, ALOCACOES, EXECUCOES, MOBILIDADES, TERCEIROS,
  ATIVIDADES, ENTREGAS, getEntregasByServico, getAtividadesByEntrega,
  getHorasAplicaveis, CONTRATO_ATIVIDADE_CONFIGS, getRecursosCompativeisParaAtividade,
  getCapacidadeRecurso,
} from "@/data/mockData";

const ALL = "__all__";

export default function DashboardExecutivo() {
  const [filters, setFilters] = useState<DashboardFilterState>(DEFAULT_FILTERS);
  const [drillSection, setDrillSection] = useState<string | null>(null);

  // --- Computed KPIs ---
  const contratosNaoOperacionalizados = CONTRATOS.filter(c => c.status === "em_implantacao");
  const contratosAtivos = CONTRATOS.filter(c => c.status === "ativo");

  // Aderência ao padrão: % of contratos where all activities have contrato-specific config
  const aderenciaData = contratosAtivos.map(ct => {
    const serviceIds = ct.services;
    let totalAtividades = 0;
    let customizadas = 0;
    serviceIds.forEach(sId => {
      getEntregasByServico(sId).forEach(e => {
        getAtividadesByEntrega(e.id).forEach(a => {
          totalAtividades++;
          const cfg = CONTRATO_ATIVIDADE_CONFIGS.find(c => c.contratoId === ct.id && c.atividadeId === a.id);
          if (cfg) customizadas++;
        });
      });
    });
    return { contrato: ct.code, client: ct.client, total: totalAtividades, customizadas, pct: totalAtividades > 0 ? Math.round((customizadas / totalAtividades) * 100) : 0 };
  });
  const aderenciaMedia = aderenciaData.length > 0 ? Math.round(aderenciaData.reduce((s, d) => s + d.pct, 0) / aderenciaData.length) : 0;

  // Tempo padrão x tempo contrato desvios
  const desviosData: { atividade: string; contrato: string; padrao: number; contratado: number; desvio: number }[] = [];
  CONTRATO_ATIVIDADE_CONFIGS.forEach(cfg => {
    const atv = ATIVIDADES.find(a => a.id === cfg.atividadeId);
    const ct = CONTRATOS.find(c => c.id === cfg.contratoId);
    if (atv && ct) {
      const desvio = cfg.horasAplicaveis - atv.timeHours;
      if (desvio !== 0) {
        desviosData.push({ atividade: atv.name, contrato: ct.code, padrao: atv.timeHours, contratado: cfg.horasAplicaveis, desvio });
      }
    }
  });

  // Atividades sem executor compatível
  const atividadesSemExecutor = ATIVIDADES.filter(a => a.status === "ativa" && a.cargosPermitidos.length > 0).filter(a => {
    const compativeis = getRecursosCompativeisParaAtividade(a.id);
    return compativeis.filter(r => r.status === "ativo").length === 0;
  });

  // Pessoas
  const pessoasDisponiveis = RECURSOS.filter(r => r.status === "ativo").length;
  const pessoasAlocadas = ALOCACOES.filter(a => a.status === "alocado" && a.resourceId).length;
  const pessoasMobilidade = RECURSOS.filter(r => r.mobility).length;

  // Mobilidade & Terceiros
  const mobilidadesPendentes = MOBILIDADES.filter(m => m.status === "pendente").length;
  const terceirosPendentes = TERCEIROS.filter(t => t.status === "pendente").length;

  // Pendências de lançamento
  const pendenciasLancamento = EXECUCOES.filter(e => e.status === "pendencia_apontamento").length;

  // Horas consumidas
  const horasConsumidas = EXECUCOES.reduce((s, e) => s + e.horasRealizadas, 0);
  const horasPlanejadas = EXECUCOES.reduce((s, e) => s + e.horasPlanejadas, 0);
  const horasContratuais = CONTRATOS.reduce((s, c) => s + c.hoursContracted, 0);

  // Charts
  const horasPorServico = SERVICOS.filter(s => s.status === "ativo").map(s => ({
    name: s.code,
    padrao: s.totalHours,
    consumido: EXECUCOES.filter(e => e.servicoCode === s.code).reduce((sum, e) => sum + e.horasRealizadas, 0),
  }));

  const statusPie = [
    { name: "Concluídas", value: EXECUCOES.filter(e => e.status === "concluida").length, color: "hsl(var(--status-success))" },
    { name: "Em realização", value: EXECUCOES.filter(e => e.status === "em_realizacao" || e.status === "realizada_parcial").length, color: "hsl(var(--primary))" },
    { name: "Planejadas", value: EXECUCOES.filter(e => e.status === "planejada").length, color: "hsl(var(--status-warning))" },
    { name: "Pendências", value: EXECUCOES.filter(e => e.status === "pendencia_apontamento").length, color: "hsl(var(--status-danger))" },
    { name: "Bloqueadas", value: EXECUCOES.filter(e => e.status === "bloqueada_competencia").length, color: "hsl(var(--muted-foreground))" },
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Dashboard Executivo" description="Visão gerencial consolidada — contratos, aderência, capacidade e desvios" />

      <DashboardFilters filters={filters} onChange={setFilters} show={["uo", "contrato", "servico"]} />

      {/* KPI Row 1 — Strategic */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div onClick={() => setDrillSection(drillSection === "nao_op" ? null : "nao_op")} className="cursor-pointer">
          <DataCard
            label="Contratos não operacionalizados"
            value={contratosNaoOperacionalizados.length}
            variant={contratosNaoOperacionalizados.length > 0 ? "danger" : "success"}
            sublabel={`de ${CONTRATOS.length} contratos`}
          />
        </div>
        <DataCard label="Aderência ao padrão" value={`${aderenciaMedia}%`} variant={aderenciaMedia >= 80 ? "success" : "warning"} sublabel="Customização corporativa" />
        <div onClick={() => setDrillSection(drillSection === "desvios" ? null : "desvios")} className="cursor-pointer">
          <DataCard label="Desvios tempo padrão" value={desviosData.length} variant={desviosData.length > 3 ? "danger" : "warning"} sublabel="Padrão ≠ Contrato" />
        </div>
        <div onClick={() => setDrillSection(drillSection === "sem_executor" ? null : "sem_executor")} className="cursor-pointer">
          <DataCard label="Sem executor compatível" value={atividadesSemExecutor.length} variant={atividadesSemExecutor.length > 0 ? "danger" : "success"} />
        </div>
      </div>

      {/* KPI Row 2 — Operational */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <DataCard label="Pessoas disponíveis" value={pessoasDisponiveis} sublabel={`${RECURSOS.length} total`} />
        <DataCard label="Alocações ativas" value={pessoasAlocadas} variant="success" />
        <DataCard label="Em mobilidade" value={pessoasMobilidade + mobilidadesPendentes} variant={mobilidadesPendentes > 0 ? "warning" : "default"} sublabel={`${mobilidadesPendentes} pendente(s)`} />
        <DataCard label="Terceiros pendentes" value={terceirosPendentes} variant={terceirosPendentes > 0 ? "warning" : "default"} />
        <DataCard label="Pendência lançamento" value={pendenciasLancamento} variant={pendenciasLancamento > 0 ? "danger" : "success"} />
      </div>

      {/* Drill-down panels */}
      {drillSection === "nao_op" && (
        <DrillPanel title="Contratos não operacionalizados" onClose={() => setDrillSection(null)}>
          {contratosNaoOperacionalizados.length === 0 ? (
            <EmptyState message="Todos os contratos estão operacionalizados." />
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 px-2">Contrato</th><th className="text-left py-2">Cliente</th><th className="text-left py-2">UO</th><th className="text-left py-2">Status</th></tr></thead>
              <tbody>
                {contratosNaoOperacionalizados.map(c => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2 px-2 font-data text-foreground">{c.code}</td>
                    <td className="py-2 text-foreground">{c.client}</td>
                    <td className="py-2 text-muted-foreground">{c.uo}</td>
                    <td className="py-2"><StatusBadge variant="warning">Em implantação</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DrillPanel>
      )}

      {drillSection === "desvios" && (
        <DrillPanel title="Desvios: Tempo Padrão × Tempo Contrato" onClose={() => setDrillSection(null)}>
          {desviosData.length === 0 ? (
            <EmptyState message="Sem desvios entre tempo padrão e contratado." />
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 px-2">Atividade</th><th className="text-left py-2">Contrato</th><th className="text-right py-2">Padrão</th><th className="text-right py-2">Contrato</th><th className="text-right py-2 px-2">Desvio</th></tr></thead>
              <tbody>
                {desviosData.map((d, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-2 text-foreground">{d.atividade}</td>
                    <td className="py-2 font-data text-foreground">{d.contrato}</td>
                    <td className="py-2 text-right font-data text-muted-foreground">{d.padrao}h</td>
                    <td className="py-2 text-right font-data text-foreground">{d.contratado}h</td>
                    <td className={`py-2 px-2 text-right font-data font-semibold ${d.desvio < 0 ? "text-status-danger" : "text-status-warning"}`}>
                      {d.desvio > 0 ? "+" : ""}{d.desvio}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DrillPanel>
      )}

      {drillSection === "sem_executor" && (
        <DrillPanel title="Atividades sem executor compatível disponível" onClose={() => setDrillSection(null)}>
          {atividadesSemExecutor.length === 0 ? (
            <EmptyState message="Todas as atividades têm executores compatíveis disponíveis." />
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 px-2">Atividade</th><th className="text-left py-2">Código</th><th className="text-left py-2 px-2">Cargos requeridos</th></tr></thead>
              <tbody>
                {atividadesSemExecutor.map(a => {
                  const entrega = ENTREGAS.find(e => e.id === a.entregaId);
                  return (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="py-2 px-2 text-foreground">{a.name}<span className="text-muted-foreground ml-1 text-[10px]">({entrega?.name})</span></td>
                      <td className="py-2 font-data text-muted-foreground">{a.code}</td>
                      <td className="py-2 px-2"><StatusBadge variant="danger">Sem executor</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </DrillPanel>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Horas por Serviço — Padrão × Consumido</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={horasPorServico}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="padrao" fill="hsl(var(--muted))" name="Padrão" radius={[3, 3, 0, 0]} />
              <Bar dataKey="consumido" fill="hsl(var(--primary))" name="Consumido" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Distribuição de Atividades</h3>
          {statusPie.length === 0 ? (
            <EmptyState message="Sem atividades para exibir." />
          ) : (
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

      {/* Horas consumidas summary */}
      <div className="bg-card border border-border rounded-md p-4 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Consumo de Horas</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Horas Contratadas</p>
            <p className="text-xl font-semibold font-data text-foreground mt-1">{horasContratuais}h</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Horas Planejadas</p>
            <p className="text-xl font-semibold font-data text-foreground mt-1">{horasPlanejadas}h</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Horas Realizadas</p>
            <p className="text-xl font-semibold font-data text-primary mt-1">{horasConsumidas}h</p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${Math.min(100, (horasConsumidas / horasContratuais) * 100)}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{Math.round((horasConsumidas / horasContratuais) * 100)}% do total contratado</p>
          </div>
        </div>
      </div>

      {/* Aderência drill-down */}
      <div className="bg-card border border-border rounded-md p-4 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Aderência ao Padrão Corporativo por Contrato</h3>
        {aderenciaData.length === 0 ? (
          <EmptyState message="Sem contratos ativos para análise." />
        ) : (
          <div className="space-y-2">
            {aderenciaData.map(d => (
              <div key={d.contrato} className="flex items-center gap-3">
                <span className="text-xs font-data text-foreground w-16">{d.contrato}</span>
                <span className="text-xs text-muted-foreground w-28 truncate">{d.client}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className={`rounded-full h-2 transition-all ${d.pct >= 80 ? "bg-status-success" : d.pct >= 50 ? "bg-status-warning" : "bg-status-danger"}`}
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <span className={`text-xs font-data font-semibold w-10 text-right ${d.pct >= 80 ? "text-status-success" : d.pct >= 50 ? "text-status-warning" : "text-status-danger"}`}>
                  {d.pct}%
                </span>
                <span className="text-[10px] text-muted-foreground w-20">{d.customizadas}/{d.total} ativid.</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts */}
      {(mobilidadesPendentes > 0 || terceirosPendentes > 0 || pendenciasLancamento > 0) && (
        <div className="bg-status-warning-muted border border-status-warning/20 rounded-md p-4 mb-6 space-y-1">
          <div className="flex items-center gap-2 text-status-warning font-medium text-sm mb-2">
            <AlertTriangle className="w-4 h-4" /> Alertas
          </div>
          {mobilidadesPendentes > 0 && <p className="text-xs text-foreground">• {mobilidadesPendentes} mobilidade(s) aguardando aprovação</p>}
          {terceirosPendentes > 0 && <p className="text-xs text-foreground">• {terceirosPendentes} solicitação(ões) de terceiro pendente(s)</p>}
          {pendenciasLancamento > 0 && <p className="text-xs text-foreground">• {pendenciasLancamento} atividade(s) com pendência de apontamento</p>}
        </div>
      )}

      <div className="space-y-2">
        <ValidarBadge>Definir meta de aderência por nível organizacional</ValidarBadge>
        <br />
        <ValidarBadge>Incluir tendência mensal de consumo de horas</ValidarBadge>
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
