import React from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { useNavigate } from "react-router-dom";
import { PageHeader, DataCard, StatusBadge } from "@/components/ui-custom/StatusBadge";
import { useDetailPanel } from "@/contexts/DetailPanelContext";
import { ActivityTimeline, TimelineEvent } from "@/components/ui-custom/ActivityTimeline";
import { ArrowRight, Clock, AlertTriangle, CalendarOff, Layers, FileText, Users } from "lucide-react";
import { EXECUCOES, SERVICOS, INDISPONIBILIDADES, ALOCACOES, CONTRATOS, CARGOS, RECURSOS, getCapacidadeUO, getSumHoursForServico } from "@/data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useMobilidade } from "@/contexts/MobilidadeContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";

const mockTimeline: TimelineEvent[] = [
{ id: "1", type: "status", title: "Atividade concluída", description: "Coleta de dados finalizada - Contrato #1024", user: "Carlos Silva", timestamp: "10/03/2026 14:32" },
{ id: "2", type: "allocation", title: "Recurso alocado", description: "Roberto Lima alocado ao Serviço de Higiene Ocupacional", user: "Maria Coordenadora", timestamp: "10/03/2026 11:15" },
{ id: "3", type: "mobility", title: "Solicitação de mobilidade", description: "Transferência para UO Porto Alegre - Distância: 25km", user: "Sistema", timestamp: "09/03/2026 16:40" },
{ id: "4", type: "comment", title: "Comentário adicionado", description: "Verificar disponibilidade de equipamento para próxima semana", user: "João Técnico", timestamp: "09/03/2026 10:22" }];


// Weekly mini-calendar for Técnico
function WeekCalendar() {
  const days = [
  { day: "Seg", date: "09", hasActivity: true, hasUnavail: false },
  { day: "Ter", date: "10", hasActivity: true, hasUnavail: false },
  { day: "Qua", date: "11", hasActivity: true, hasUnavail: false },
  { day: "Qui", date: "12", hasActivity: false, hasUnavail: true },
  { day: "Sex", date: "13", hasActivity: true, hasUnavail: false }];

  return (
    <div className="bg-card border border-border rounded-md p-4 mb-4">
      <p className="text-xs font-medium text-foreground mb-3">Semana 10–14 Mar</p>
      <div className="grid grid-cols-5 gap-2">
        {days.map((d) =>
        <div key={d.date} className={`text-center p-2 rounded-md border ${d.hasUnavail ? 'border-status-danger/30 bg-status-danger-muted' : d.hasActivity ? 'border-primary/20 bg-primary/5' : 'border-border'}`}>
            <p className="text-[10px] text-muted-foreground">{d.day}</p>
            <p className="text-sm font-data font-medium text-foreground">{d.date}</p>
            {d.hasActivity && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}
            {d.hasUnavail && <CalendarOff className="w-3 h-3 text-status-danger mx-auto mt-1" />}
          </div>
        )}
      </div>
    </div>);

}

// Técnico Home
function TecnicoHome() {
  const navigate = useNavigate();
  const { openPanel } = useDetailPanel();

  const tasks = [
  { id: 1, activity: "Coleta de dados ambientais", service: "Eng. Segurança", contract: "#1024", time: "2h", status: "pendente" as const },
  { id: 2, activity: "Elaboração de laudo técnico", service: "Higiene Ocupacional", contract: "#1031", time: "4h", status: "em_andamento" as const },
  { id: 3, activity: "Reunião de alinhamento", service: "Consultoria SST", contract: "#1018", time: "1h", status: "pendente" as const },
  { id: 4, activity: "Inspeção de campo", service: "Eng. Segurança", contract: "#1024", time: "3h", status: "concluida" as const }];


  const statusMap = {
    pendente: { variant: "warning" as const, label: "Pendente" },
    em_andamento: { variant: "info" as const, label: "Em andamento" },
    concluida: { variant: "success" as const, label: "Concluída" }
  };

  return (
    <>
      <PageHeader title="Painel do Técnico / Executor" description="Visão do dia · 10/03/2026" />
      <div className="grid grid-cols-3 gap-4 mb-4">
        <DataCard label="Atividades do dia" value={4} sublabel="2 pendentes" variant="warning" />
        <DataCard label="Horas apontadas (mês)" value="64h" sublabel="de 160h previstas" />
        <DataCard label="Horas indisponíveis" value="8h" sublabel="Férias: 03/03" variant="danger" />
      </div>

      <WeekCalendar />

      <h2 className="text-sm font-medium text-foreground mb-3">Tarefas Pendentes</h2>
      <div className="space-y-2">
        {tasks.map((task) =>
        <button
          key={task.id}
          onClick={() => openPanel("Detalhes da Atividade", <ActivityTimeline events={mockTimeline} />)}
          className="w-full bg-card border border-border rounded-md p-4 flex items-center justify-between hover:border-primary/30 transition-colors text-left">
          
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{task.activity}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{task.service} · Contrato {task.contract}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-data text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{task.time}</span>
              <StatusBadge variant={statusMap[task.status].variant}>{statusMap[task.status].label}</StatusBadge>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={() => navigate("/execucao")} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity">Executar Atividade</button>
        <button onClick={() => navigate("/indisponibilidades")} className="px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent transition-colors">Registrar Indisponibilidade</button>
      </div>
    </>);

}

// Facilitador do Processo Home
function CoordenadorHome() {
  const navigate = useNavigate();
  const { mobilidades, approveMobilidade, rejectMobilidade } = useMobilidade();

  const approvals = mobilidades.filter((m) => m.status === "pendente");
  const pendingAlloc = ALOCACOES.filter((a) => a.status === "pendente");
  const activeContracts = CONTRATOS.filter((c) => c.status === "ativo");
  const lateActivities = [
  { id: 1, activity: "Elaboração de laudo técnico", resource: "Roberto Lima", service: "HO-002", daysLate: 2 },
  { id: 2, activity: "Pesquisa normativa", resource: "Carlos Silva", service: "SST-001", daysLate: 1 }];

  const [approveModalId, setApproveModalId] = React.useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = React.useState<string | null>(null);
  const [selectedResource, setSelectedResource] = React.useState("");
  const [modalComment, setModalComment] = React.useState("");

  const availableResources = RECURSOS.filter((r) => r.status === "ativo");

  const handleApprove = (id: string) => {
    setApproveModalId(id);
    setSelectedResource("");
    setModalComment("");
  };

  const confirmApprove = () => {
    if (!approveModalId || !selectedResource) return;
    approveMobilidade(approveModalId, selectedResource);
    toast("Solicitação de Mobilidade Aprovada", {
      duration: 5000,
      position: "top-right",
      style: { background: "hsla(145, 60%, 40%, 0.15)", border: "1px solid hsla(145, 60%, 40%, 0.3)", color: "hsl(145, 60%, 30%)" },
    });
    setApproveModalId(null);
  };

  const handleReject = (id: string) => {
    setRejectModalId(id);
    setModalComment("");
  };

  const confirmReject = () => {
    if (!rejectModalId) return;
    rejectMobilidade(rejectModalId);
    toast("Solicitação de Mobilidade Rejeitada", {
      duration: 5000,
      position: "top-right",
      style: { background: "hsla(45, 90%, 50%, 0.15)", border: "1px solid hsla(45, 90%, 50%, 0.3)", color: "hsl(45, 80%, 30%)" },
    });
    setRejectModalId(null);
  };

  return (
    <>
      <PageHeader title="Painel do Coordenador" description="Defina horas aplicáveis no contrato, aloque recursos e acompanhe a execução" />

      {/* Role clarification */}
      





      

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <DataCard label="Contratos ativos" value={activeContracts.length} variant="success" />
        <DataCard label="Alocações pendentes" value={pendingAlloc.length} variant="warning" />
        <DataCard label="Aprovações pendentes" value={approvals.length} variant="warning" />
        <DataCard label="Atividades atrasadas" value={lateActivities.length} variant="danger" />
      </div>

      {/* Chart block */}
      {(() => {
        const chartData = [
        { name: "Contratos ativos", value: activeContracts.length },
        { name: "Alocações pendentes", value: pendingAlloc.length },
        { name: "Aprovações pendentes", value: approvals.length },
        { name: "Atividades atrasadas", value: lateActivities.length }];

        const barColors = ["#5E35B1", "#E6A817", "#EF9A09", "#D32F2F"];
        return (
          <div className="bg-card border border-border rounded-lg p-5 mb-6">
            <p className="text-xs font-medium text-foreground mb-4">Indicadores gerais</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Quantidade">
                  {chartData.map((_, i) =>
                  <Cell key={i} fill={barColors[i]} />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>);

      })()}

      {/* Pending allocations */}
      {pendingAlloc.length > 0 &&
      <>
          <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-status-warning" /> Alocações Pendentes
          </h2>
          <div className="space-y-2 mb-6">
            {pendingAlloc.map((a) =>
          <div key={a.id} className="bg-card border border-border rounded-md p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.service}</p>
                  <p className="text-xs text-muted-foreground">Contrato {a.contractCode} · Cargo necessário: {CARGOS.find((c) => c.id === a.cargoId)?.name}</p>
                </div>
                <StatusBadge variant="warning">Pendente</StatusBadge>
              </div>
          )}
          </div>
        </>
      }

      <h2 className="text-sm font-medium text-foreground mb-3">Aprovações de Mobilidade</h2>
      <div className="space-y-2 mb-6">
        {approvals.map((a) =>
        <div key={a.id} className="bg-card border border-border rounded-md p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Mobilidade: {a.status === "aprovada" ? a.resource : "—"}</p>
              <p className="text-xs text-muted-foreground">{a.from} → {a.to} · {a.date}</p>
              {a.alert && <span className="text-[10px] text-status-danger flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3" /> Excede limite ({a.distance})</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleApprove(a.id)} className="px-3 py-1.5 bg-status-success text-status-success-foreground rounded text-xs font-medium hover:opacity-90">Aprovar</button>
              <button onClick={() => handleReject(a.id)} className="px-3 py-1.5 border border-border text-foreground rounded text-xs hover:bg-accent">Rejeitar</button>
            </div>
          </div>
        )}
      </div>

      <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-status-danger" /> Atividades Atrasadas
      </h2>
      <div className="space-y-2 mb-6">
        {lateActivities.map((a) =>
        <div key={a.id} className="bg-card border border-status-danger/20 rounded-md p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{a.activity}</p>
              <p className="text-xs text-muted-foreground">{a.resource} · {a.service}</p>
            </div>
            <StatusBadge variant="danger">{a.daysLate}d atraso</StatusBadge>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate("/contratos")} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Ver Contratos
        </button>
        <button onClick={() => navigate("/alocacao")} className="px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent">Alocar Recursos</button>
        <button onClick={() => navigate("/execucao")} className="px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent">Acompanhar Execução</button>
      </div>

      {/* Approve Modal */}
      <Dialog open={!!approveModalId} onOpenChange={() => setApproveModalId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aprovar Mobilidade</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recursos disponíveis *</Label>
              <Select value={selectedResource} onValueChange={setSelectedResource}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {availableResources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} — {r.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Adicionar comentário</Label>
              <Textarea value={modalComment} onChange={(e) => setModalComment(e.target.value)} placeholder="Escreva um comentário sobre esta mobilidade..." />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setApproveModalId(null)} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Cancelar</button>
            <button onClick={confirmApprove} disabled={!selectedResource} className="px-4 py-2 bg-status-success text-status-success-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">Aprovar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={!!rejectModalId} onOpenChange={() => setRejectModalId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar Mobilidade</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Adicionar comentário</Label>
              <Textarea value={modalComment} onChange={(e) => setModalComment(e.target.value)} placeholder="Escreva um comentário sobre esta reprovação..." />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setRejectModalId(null)} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Cancelar</button>
            <button onClick={confirmReject} className="px-4 py-2 bg-status-danger text-status-danger-foreground rounded-lg text-sm font-medium hover:opacity-90">Rejeitar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>);

}

// Gestão Corporativa (DR) Home
function BackOfficeDRHome() {
  const navigate = useNavigate();
  const inconsistentes = SERVICOS.filter((s) => getSumHoursForServico(s.id) > s.totalHours);

  return (
    <>
      <PageHeader title="Gestão Corporativa (DR)" description="Defina padrões corporativos: serviços, etapas, atividades e cargos" />

      




      

      <div className="grid grid-cols-3 gap-4 mb-6">
        <DataCard label="Serviços ativos" value={SERVICOS.filter((s) => s.status === "ativo").length} variant="success" />
        <DataCard label="Serviços pendentes" value={SERVICOS.filter((s) => s.status === "rascunho").length} variant="warning" />
        <DataCard label="Cargos cadastrados" value={CARGOS.length} />
      </div>

      {inconsistentes.length > 0 &&
      <>
          <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-danger" /> Serviços Inconsistentes
          </h2>
          <div className="space-y-2 mb-6">
            {inconsistentes.map((s) =>
          <div key={s.id} className="bg-status-danger-muted border border-status-danger/20 rounded-md p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.code} · Soma {getSumHoursForServico(s.id)}h &gt; Total {s.totalHours}h</p>
                </div>
                <StatusBadge variant="danger">Inconsistente</StatusBadge>
              </div>
          )}
          </div>
        </>
      }

      <div className="flex gap-3">
        <button onClick={() => navigate("/parametrizacao")} className="px-4 py-2 text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 bg-sidebar">Parametrizar Serviços</button>
        <button onClick={() => navigate("/entregas")} className="px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent">Etapas e Atividades</button>
        <button onClick={() => navigate("/cargos")} className="px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent">Cadastro de Cargos</button>
      </div>
    </>);

}

// BackOffice UO Home
function BackOfficeUOHome() {
  const navigate = useNavigate();
  const uoIndisps = INDISPONIBILIDADES.filter((i) => i.uo === "UO Canoas");
  const capacity = getCapacidadeUO("UO Canoas");

  return (
    <>
      <PageHeader title="Painel BackOffice UO" description="Visualize métricas da UO e acompanhe as indisponibilidades da semana" />

      <div className="bg-muted/50 border border-border rounded-md p-3 mb-4 flex items-start gap-2">
        <Layers className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Seu papel:</strong> Manter o cadastro de pessoas vinculadas a cargos na UO, gerenciar capacidade e registrar indisponibilidades.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <DataCard label="Recursos na UO" value={capacity.resources} />
        <DataCard label="Capacidade total" value={`${capacity.total}h`} />
        <DataCard label="Horas alocadas" value={`${capacity.allocated}h`} variant="warning" />
        <DataCard label="Indisponibilidades (mês)" value={uoIndisps.length} variant="danger" />
      </div>

      <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <CalendarOff className="w-4 h-4 text-status-warning" /> Indisponibilidades da Semana
      </h2>
      <div className="space-y-2 mb-6">
        {uoIndisps.map((i) =>
        <div key={i.id} className="bg-card border border-border rounded-md p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{i.resource}</p>
              <p className="text-xs text-muted-foreground">{i.type} · {i.startDate} – {i.endDate}</p>
            </div>
            <span className="text-xs font-data text-muted-foreground">{i.hours}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate("/recursos")} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">Gerenciar Recursos</button>
        <button onClick={() => navigate("/indisponibilidades")} className="px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent">Indisponibilidades por UO</button>
      </div>
    </>);

}

// Admin Home
function AdminHome() {
  const navigate = useNavigate();
  const occupationData = [
  { name: "Out", value: 72 },
  { name: "Nov", value: 78 },
  { name: "Dez", value: 74 },
  { name: "Jan", value: 80 },
  { name: "Fev", value: 82 },
  { name: "Mar", value: 78 }];


  return (
    <>
      <PageHeader title="Administração" description="Visão geral do sistema" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <DataCard label="Usuários ativos" value={86} />
        <DataCard label="Serviços cadastrados" value={SERVICOS.length} variant="success" />
        <DataCard label="Contratos ativos" value={CONTRATOS.filter((c) => c.status === "ativo").length} />
        <DataCard label="Alertas de sistema" value={3} variant="danger" />
      </div>

      <div className="bg-card border border-border rounded-md p-4 mb-6">
        <p className="text-xs font-medium text-foreground mb-3">Taxa de Ocupação (últimos 6 meses)</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={occupationData}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(217, 91%, 48%)" radius={[3, 3, 0, 0]} name="Ocupação %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate("/admin")} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">Administração</button>
        <button onClick={() => navigate("/dashboard")} className="px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent">Dashboard Gerencial</button>
      </div>
    </>);

}

export default function HomePage() {
  const { currentProfile } = useProfile();

  const homeMap: Record<string, React.ReactNode> = {
    tecnico: <TecnicoHome />,
    coordenador: <CoordenadorHome />,
    backoffice_dr: <BackOfficeDRHome />,
    backoffice_uo: <BackOfficeUOHome />,
    administrador: <AdminHome />
  };

  return (
    <div className="p-6 max-w-5xl">
      {homeMap[currentProfile.role]}
    </div>);

}