import React, { useState } from "react";
import { PageHeader, StatusBadge, DataCard, CargoBadge } from "@/components/ui-custom/StatusBadge";
import { useDetailPanel } from "@/contexts/DetailPanelContext";
import { TabbedDetail } from "@/components/DetailPanel";
import { Plus, ChevronRight, Package, Search, History, ClipboardList, Briefcase, AlertTriangle, Clock, Activity, Edit2 } from "lucide-react";
import { ENTREGAS, ATIVIDADES, SERVICOS, CARGOS, getAtividadesByEntrega, getSumHoursForEntrega, getServicoForEntrega, getEntregaForAtividade, getHistoryForEntity, getCargoById, Entrega, Atividade } from "@/data/mockData";
import { useProfile } from "@/contexts/ProfileContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type TabView = "entregas" | "atividades";
type StatusFilter = "todos" | "ativa" | "rascunho" | "inativa";

function generateEntregaCode(entregas: Entrega[]): string {
  const nums = entregas.
  map((e) => {
    const match = e.code.match(/^ETG-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }).
  filter((n) => n > 0);
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `ETG-${String(max + 1).padStart(3, "0")}`;
}

function generateAtividadeCode(atividades: Atividade[]): string {
  const nums = atividades.
  map((a) => {
    const match = a.code.match(/^ATV-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }).
  filter((n) => n > 0);
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `ATV-${String(max + 1).padStart(3, "0")}`;
}

export default function EntregasPage() {
  const { openPanel } = useDetailPanel();
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const isCoordenador = currentProfile.role === "coordenador";
  const isTargetProfile = currentProfile.role === "coordenador" || currentProfile.role === "backoffice_dr";
  const [tab, setTab] = useState<TabView>("entregas");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("todos");
  const [entregaDialogOpen, setEntregaDialogOpen] = useState(false);
  const [atividadeDialogOpen, setAtividadeDialogOpen] = useState(false);
  const [entregas, setEntregas] = useState(ENTREGAS);
  const [atividades, setAtividades] = useState(ATIVIDADES);
  const [entregaForm, setEntregaForm] = useState({ name: "", code: "", servicoId: "", timeHours: "" });
  const [atividadeForm, setAtividadeForm] = useState({ name: "", code: "", entregaId: "", timeHours: "", cargosPermitidos: [] as string[] });
  // Local map for etapa hours (isTargetProfile)
  const [entregaHoursMap, setEntregaHoursMap] = useState<Record<string, number>>({});
  const [editingEntrega, setEditingEntrega] = useState<Entrega | null>(null);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);

  const filteredEntregas = entregas.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || e.status === statusFilter;
    const matchService = serviceFilter === "todos" || e.servicoId === serviceFilter;
    return matchSearch && matchStatus && matchService;
  });

  const filteredAtividades = atividades.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || a.status === statusFilter;
    if (serviceFilter !== "todos") {
      const entrega = entregas.find((e) => e.id === a.entregaId);
      if (!entrega || entrega.servicoId !== serviceFilter) return false;
    }
    return matchSearch && matchStatus;
  });

  const totalEntregas = entregas.length;
  const totalAtividades = atividades.length;
  const semCargo = atividades.filter((a) => a.cargosPermitidos.length === 0 && a.status !== "inativa").length;
  const totalHorasAtividades = atividades.reduce((sum, a) => sum + a.timeHours, 0);
  const totalHorasEtapas = Object.values(entregaHoursMap).reduce((sum, h) => sum + h, 0);
  const totalHoras = isTargetProfile ? totalHorasEtapas : totalHorasAtividades;

  const openNewEntregaDialog = () => {
    setEditingEntrega(null);
    setEntregaForm({ name: "", code: generateEntregaCode(entregas), servicoId: "", timeHours: "" });
    setEntregaDialogOpen(true);
  };

  const openEditEntregaDialog = (entrega: Entrega) => {
    setEditingEntrega(entrega);
    setEntregaForm({ name: entrega.name, code: entrega.code, servicoId: entrega.servicoId, timeHours: String(entregaHoursMap[entrega.id] || "") });
    setEntregaDialogOpen(true);
  };

  const openNewAtividadeDialog = () => {
    setEditingAtividade(null);
    setAtividadeForm({ name: "", code: generateAtividadeCode(atividades), entregaId: "", timeHours: "", cargosPermitidos: [] });
    setAtividadeDialogOpen(true);
  };

  const openEditAtividadeDialog = (atividade: Atividade) => {
    setEditingAtividade(atividade);
    setAtividadeForm({
      name: atividade.name,
      code: atividade.code,
      entregaId: atividade.entregaId,
      timeHours: String(atividade.timeHours),
      cargosPermitidos: [...atividade.cargosPermitidos]
    });
    setAtividadeDialogOpen(true);
  };

  const handleSaveEntrega = () => {
    if (editingEntrega) {
      setEntregas((prev) =>
      prev.map((e) =>
      e.id === editingEntrega.id ?
      { ...e, name: entregaForm.name, servicoId: entregaForm.servicoId } :
      e
      )
      );
      if (entregaForm.timeHours) {
        setEntregaHoursMap((prev) => ({ ...prev, [editingEntrega.id]: Number(entregaForm.timeHours) }));
      }
      toast.success("Etapa atualizada", { description: entregaForm.name });
    } else {
      const newId = `et-${Date.now()}`;
      const newEntrega: Entrega = {
        id: newId,
        name: entregaForm.name,
        code: entregaForm.code,
        servicoId: entregaForm.servicoId,
        status: "rascunho"
      };
      setEntregas([newEntrega, ...entregas]);
      if (entregaForm.timeHours) {
        setEntregaHoursMap((prev) => ({ ...prev, [newId]: Number(entregaForm.timeHours) }));
      }
      toast.success("Etapa criada", { description: `${newEntrega.name} — pertence exclusivamente ao serviço selecionado` });
    }
    setEntregaDialogOpen(false);
    setEditingEntrega(null);
    setEntregaForm({ name: "", code: "", servicoId: "", timeHours: "" });
  };

  const handleSaveAtividade = () => {
    if (editingAtividade) {
      setAtividades((prev) =>
      prev.map((a) =>
      a.id === editingAtividade.id ?
      {
        ...a,
        name: atividadeForm.name,
        timeHours: Number(atividadeForm.timeHours),
        entregaId: atividadeForm.entregaId,
        cargosPermitidos: atividadeForm.cargosPermitidos
      } :
      a
      )
      );
      toast.success("Atividade atualizada", { description: atividadeForm.name });
    } else {
      const newAtividade: Atividade = {
        id: `at-${Date.now()}`,
        name: atividadeForm.name,
        code: atividadeForm.code,
        timeHours: Number(atividadeForm.timeHours),
        entregaId: atividadeForm.entregaId,
        cargosPermitidos: atividadeForm.cargosPermitidos,
        status: "rascunho"
      };
      setAtividades([newAtividade, ...atividades]);
      toast.success("Atividade criada", { description: `${newAtividade.name} — pertence exclusivamente à etapa selecionada` });
    }
    setAtividadeDialogOpen(false);
    setEditingAtividade(null);
    setAtividadeForm({ name: "", code: "", entregaId: "", timeHours: "", cargosPermitidos: [] });
  };

  const toggleCargo = (id: string) => {
    setAtividadeForm((f) => ({
      ...f,
      cargosPermitidos: f.cargosPermitidos.includes(id) ? f.cargosPermitidos.filter((c) => c !== id) : [...f.cargosPermitidos, id]
    }));
  };

  const activeCargos = CARGOS.filter((c) => c.status === "ativo");

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Etapas e Atividades"
        description="Vincule uma etapa de entrega a um serviço, sendo que cada atividade pertence a uma etapa."
        actions={
        !isCoordenador ? <div className="flex gap-2">
            <button onClick={openNewEntregaDialog} className="flex items-center gap-2 px-4 py-2 text-primary-foreground rounded-lg text-sm font-medium transition-colors bg-sidebar">
              <Plus className="w-4 h-4" /> Nova Etapa
            </button>
            <button onClick={openNewAtividadeDialog} className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors">
              <Plus className="w-4 h-4" /> Nova Atividade
            </button>
          </div> : undefined
        } />
      

      {/* Rule banner */}
      
      

      <div className="grid grid-cols-4 gap-4 mb-6">
        <DataCard label="Total etapas" value={totalEntregas} />
        <DataCard label="Total atividades" value={totalAtividades} />
        <DataCard label="TOTAL HORAS (ETAPAS)" value={`${totalHoras}h`} />
        <DataCard label="Sem cargo" value={semCargo} sublabel="Atividades sem cargo permitido" variant={semCargo > 0 ? "danger" : "success"} />
      </div>

      {semCargo > 0




      }

      {/* Tab + filter toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          {currentProfile.role === "coordenador" || currentProfile.role === "backoffice_dr" ?
          <>
              <button onClick={() => setTab("entregas")}
            className={`px-3 py-2 text-[12px] font-medium transition-colors border-b-2 flex items-center gap-1.5 ${tab === "entregas" ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                <Package className="w-3.5 h-3.5" /> Etapas
              </button>
              <button onClick={() => setTab("atividades")}
            className={`px-3 py-2 text-[12px] font-medium transition-colors border-b-2 flex items-center gap-1.5 ${tab === "atividades" ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                <Activity className="w-3.5 h-3.5" /> Atividades
              </button>
            </> :

          <>
              <button onClick={() => setTab("entregas")}
            className={`px-3 py-1.5 text-[12px] rounded-lg font-medium transition-colors flex items-center gap-1.5 ${tab === "entregas" ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-accent'}`}>
                <Package className="w-3.5 h-3.5" /> Etapas
              </button>
              <button onClick={() => setTab("atividades")}
            className={`px-3 py-1.5 text-[12px] rounded-lg font-medium transition-colors flex items-center gap-1.5 ${tab === "atividades" ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-accent'}`}>
                <Activity className="w-3.5 h-3.5" /> Atividades
              </button>
            </>
          }
          <div className="w-px h-7 bg-border mx-1" />
          {/* Service scope filter */}
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}
          className="px-2.5 py-1.5 text-[11px] rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="todos">Todos os serviços</option>
            {SERVICOS.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </select>
          <div className="w-px h-7 bg-border mx-1" />
          {(["todos", "ativa", "rascunho"] as StatusFilter[]).map((f) =>
          <button key={f} onClick={() => setStatusFilter(f)}
          className={`px-2.5 py-1.5 text-[11px] rounded-lg font-medium transition-colors capitalize ${statusFilter === f ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-56 pl-9 pr-4 py-2 border border-input rounded-lg text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {/* ═══════════════ ENTREGAS TABLE ═══════════════ */}
      {tab === "entregas" &&
      <>
          {filteredEntregas.length === 0 ?
        <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
               <p className="text-sm font-medium text-foreground">Nenhuma etapa encontrada</p>
               <p className="text-[12px] text-muted-foreground mt-1">Ajuste os filtros ou crie uma nova etapa.</p>
            </div> :

        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Etapa</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Serviço (proprietário)</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Atividades</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Horas</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEntregas.map((e) => {
                const ativs = getAtividadesByEntrega(e.id);
                const sumH = getSumHoursForEntrega(e.id);
                const servico = getServicoForEntrega(e.id);
                const atvsNoCargo = ativs.filter((a) => a.cargosPermitidos.length === 0 && a.status !== "inativa").length;
                return (
                  <tr key={e.id} className="hover:bg-accent/30 cursor-pointer transition-colors"
                  onClick={() => openPanel(`Etapa: ${e.name}`, <EntregaDetail entrega={e} onEdit={() => openEditEntregaDialog(e)} navigate={navigate} />)}>
                        <td className="px-4 py-3 font-data text-[12px] text-muted-foreground">{e.code}</td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-medium text-foreground">{e.name}</span>
                          {atvsNoCargo > 0 &&
                      <span className="ml-2 text-[10px] text-status-danger"><AlertTriangle className="w-3 h-3 inline" /> {atvsNoCargo} s/ cargo</span>
                      }
                        </td>
                        <td className="px-4 py-3 text-[12px] text-muted-foreground">{servico ? `${servico.code} — ${servico.name}` : "SST-001 — Engenharia de Segurança do Trabalho"}</td>
                        <td className="px-4 py-3 text-center font-data text-[12px]">{ativs.length}</td>
                        <td className="px-4 py-3 text-right font-data text-[12px] font-medium">{sumH}h</td>
                        <td className="px-4 py-3">
                          {e.status === "ativa" ? <StatusBadge variant="success">Ativa</StatusBadge> : e.status === "rascunho" ? <StatusBadge variant="info">Rascunho</StatusBadge> : <StatusBadge variant="danger">Inativa</StatusBadge>}
                        </td>
                        <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                      </tr>);

              })}
                </tbody>
              </table>
            </div>
        }
        </>
      }

      {/* ═══════════════ ATIVIDADES TABLE ═══════════════ */}
      {tab === "atividades" &&
      <>
          {filteredAtividades.length === 0 ?
        <div className="bg-card border border-border rounded-lg p-12 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-foreground">Nenhuma atividade encontrada</p>
            </div> :

        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Atividade</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Etapa (proprietária)</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Serviço</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cargos permitidos</th>
                    {!isTargetProfile && <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tempo</th>}
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAtividades.map((a) => {
                const entrega = getEntregaForAtividade(a.id);
                const servico = entrega ? getServicoForEntrega(entrega.id) : undefined;
                const hasCargo = a.cargosPermitidos.length > 0;
                return (
                  <tr key={a.id} className="hover:bg-accent/30 cursor-pointer transition-colors"
                  onClick={() => openPanel(`Atividade: ${a.name}`, <AtividadeDetail atividade={a} onEdit={() => openEditAtividadeDialog(a)} navigate={navigate} hideTime={isTargetProfile} />)}>
                        <td className="px-4 py-3 font-data text-[12px] text-muted-foreground">{a.code}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-foreground">{a.name}</td>
                        <td className="px-4 py-3 text-[12px] text-muted-foreground">{entrega ? `${entrega.code} — ${entrega.name}` : "—"}</td>
                        <td className="px-4 py-3 text-[12px] text-muted-foreground">{servico?.code ?? "—"}</td>
                        <td className="px-4 py-3">
                          {hasCargo ?
                      <div className="flex flex-wrap gap-1">
                              {a.cargosPermitidos.slice(0, 2).map((cid) => {
                          const c = getCargoById(cid);
                          return c && <CargoBadge key={c.id}>{c.code}</CargoBadge>;
                        })}
                              {a.cargosPermitidos.length > 2 && <span className="text-[10px] text-muted-foreground">+{a.cargosPermitidos.length - 2}</span>}
                            </div> :

                      <span className="text-[11px] text-status-danger flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Sem cargo
                            </span>
                      }
                        </td>
                        {!isTargetProfile && <td className="px-4 py-3 text-right font-data text-[12px] font-medium flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" /> {a.timeHours}h
                        </td>}
                        <td className="px-4 py-3">
                          {a.status === "ativa" ? <StatusBadge variant="success">Ativa</StatusBadge> : a.status === "rascunho" ? <StatusBadge variant="info">Rascunho</StatusBadge> : <StatusBadge variant="danger">Inativa</StatusBadge>}
                        </td>
                        <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                      </tr>);

              })}
                </tbody>
              </table>
            </div>
        }
        </>
      }

      {/* Dialog: Nova / Editar Entrega */}
      <Dialog open={entregaDialogOpen} onOpenChange={(open) => {if (!open) {setEntregaDialogOpen(false);setEditingEntrega(null);}}}>
        <DialogContent>
           <DialogHeader><DialogTitle>{editingEntrega ? "Editar Etapa" : "Nova Etapa"}</DialogTitle></DialogHeader>
           {!editingEntrega && <p className="text-[11px] text-muted-foreground mb-3">A etapa pertencerá exclusivamente ao serviço selecionado. Se precisar de uma etapa semelhante em outro serviço, crie uma nova.</p>}
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Código</label>
              <input value={entregaForm.code} readOnly disabled className="w-full border border-input rounded-lg text-sm p-2.5 bg-muted mt-1.5 font-data cursor-not-allowed opacity-70" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Nome da Etapa</label>
              <input value={entregaForm.name} onChange={(e) => setEntregaForm({ ...entregaForm, name: e.target.value })} className="w-full border border-input rounded-lg text-sm p-2.5 bg-card mt-1.5 focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: Planejamento" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Serviço proprietário</label>
              <div className="flex flex-wrap gap-2">
                {SERVICOS.map((s) =>
                <button key={s.id} type="button" onClick={() => setEntregaForm({ ...entregaForm, servicoId: s.id })}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors font-medium ${entregaForm.servicoId === s.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-accent'}`}>
                    {s.code} — {s.name}
                  </button>
                )}
              </div>
            </div>
            {isTargetProfile && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tempo Previsto (H)</label>
                <input type="number" value={entregaForm.timeHours} onChange={(e) => setEntregaForm({ ...entregaForm, timeHours: e.target.value })} className="w-full border border-input rounded-lg text-sm p-2.5 bg-card mt-1.5 font-data focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: 8" />
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => {setEntregaDialogOpen(false);setEditingEntrega(null);}} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Cancelar</button>
            <button onClick={handleSaveEntrega} disabled={!entregaForm.name || !entregaForm.code || !entregaForm.servicoId} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {editingEntrega ? "Salvar" : "Criar Etapa"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova / Editar Atividade */}
      <Dialog open={atividadeDialogOpen} onOpenChange={(open) => {if (!open) {setAtividadeDialogOpen(false);setEditingAtividade(null);}}}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingAtividade ? "Editar Atividade" : "Nova Atividade"}</DialogTitle></DialogHeader>
          {!editingAtividade && <p className="text-[11px] text-muted-foreground mb-3">{isTargetProfile ? "A atividade pertencerá exclusivamente à etapa selecionada. Cargos são obrigatórios." : "A atividade pertencerá exclusivamente à etapa selecionada. Tempo previsto e cargos são obrigatórios."}</p>}
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Código</label>
              <input value={atividadeForm.code} readOnly disabled className="w-full border border-input rounded-lg text-sm p-2.5 bg-muted mt-1.5 font-data cursor-not-allowed opacity-70" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Nome da Atividade</label>
              <input value={atividadeForm.name} onChange={(e) => setAtividadeForm({ ...atividadeForm, name: e.target.value })} className="w-full border border-input rounded-lg text-sm p-2.5 bg-card mt-1.5 focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: Inspeção de campo" />
            </div>
            {!isTargetProfile && <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tempo previsto (h)</label>
                <input type="number" value={atividadeForm.timeHours} onChange={(e) => setAtividadeForm({ ...atividadeForm, timeHours: e.target.value })} className="w-full border border-input rounded-lg text-sm p-2.5 bg-card mt-1.5 font-data focus:outline-none focus:ring-2 focus:ring-ring" placeholder="4" />
              </div>
            </div>}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Etapa proprietária</label>
              <select value={atividadeForm.entregaId} onChange={(e) => setAtividadeForm({ ...atividadeForm, entregaId: e.target.value })}
              className="w-full border border-input rounded-lg text-sm p-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecionar etapa...</option>
                {entregas.map((e) => {
                  const svc = getServicoForEntrega(e.id);
                  return <option key={e.id} value={e.id}>{e.code} — {e.name} ({svc?.code})</option>;
                })}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Cargos permitidos para execução</label>
              <div className="flex flex-wrap gap-2">
                {activeCargos.map((c) =>
                <button key={c.id} type="button" onClick={() => toggleCargo(c.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors font-medium flex items-center gap-1 ${atividadeForm.cargosPermitidos.includes(c.id) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-accent'}`}>
                    <Briefcase className="w-3 h-3" /> {c.name}
                  </button>
                )}
              </div>
              {atividadeForm.cargosPermitidos.length === 0 &&
              <p className="text-[10px] text-status-danger mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Atividade sem cargo não poderá ser atribuída a nenhum profissional</p>
              }
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => {setAtividadeDialogOpen(false);setEditingAtividade(null);}} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Cancelar</button>
            <button onClick={handleSaveAtividade} disabled={!atividadeForm.name || !atividadeForm.code || !atividadeForm.entregaId || (!isTargetProfile && !atividadeForm.timeHours)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {editingAtividade ? "Salvar" : "Criar Atividade"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}

// ═══════════════════════════════════════════════════
// Detail panels
// ═══════════════════════════════════════════════════
function EntregaDetail({ entrega, onEdit, navigate }: {entrega: Entrega;onEdit: () => void;navigate: (path: string) => void;}) {
  const atividades = getAtividadesByEntrega(entrega.id);
  const sumH = getSumHoursForEntrega(entrega.id);
  const servico = getServicoForEntrega(entrega.id);
  const history = getHistoryForEntity("entrega", entrega.id);
  const atvsNoCargo = atividades.filter((a) => a.cargosPermitidos.length === 0 && a.status !== "inativa");

  return (
    <TabbedDetail
      dados={
      <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Código</span><span className="font-data">{entrega.code}</span></div>
             <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Serviço proprietário</span><span className="font-data">{servico?.name ?? "—"} ({servico?.code})</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Atividades</span><span className="font-data">{atividades.length}</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">TOTAL HORAS (ETAPAS)</span><span className="font-data font-semibold">{sumH}h</span></div>
          </div>

          {atvsNoCargo.length > 0 &&
        <div className="bg-status-warning-muted border border-status-warning/20 rounded-lg p-2.5 text-[11px] text-status-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {atvsNoCargo.length} atividade(s) sem cargo permitido
            </div>
        }

          {/* Activity breakdown */}
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Composição de tempo</p>
            {atividades.length === 0 ?
          <p className="text-[11px] text-muted-foreground italic">Nenhuma atividade</p> :
          atividades.map((a) =>
          <div key={a.id} className="py-1.5 pl-2 border-l-2 border-primary/15 mb-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-foreground">{a.name} <span className="font-data text-muted-foreground text-[10px]">{a.code}</span></span>
                  <span className="font-data text-foreground font-medium">{a.timeHours > 0 ? `${a.timeHours}h` : ""}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {a.cargosPermitidos.length === 0 ?
              <span className="text-[10px] text-status-danger flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Sem cargo</span> :
              a.cargosPermitidos.map((cid) => {
                const c = getCargoById(cid);
                return c && <span key={c.id} className="text-[9px] px-1 py-0.5 rounded bg-primary/8 text-primary border border-primary/15">{c.code}</span>;
              })}
                </div>
              </div>
          )}
            {atividades.length > 0 &&
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50 text-[11px] font-medium">
                <span className="text-muted-foreground">Total da etapa</span>
                <span className="font-data text-foreground">{sumH}h</span>
              </div>
          }
          </div>

        </div>
      }
      timeline={
      <div className="space-y-3">
          {history.length === 0 ?
        <p className="text-[12px] text-muted-foreground italic">Sem histórico registrado.</p> :
        history.map((h) =>
        <div key={h.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-foreground">v{h.version}</span>
                  <span className="text-[10px] font-data text-muted-foreground">{h.date}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{h.changes}</p>
                {h.oldValue && h.newValue &&
            <div className="mt-1 flex items-center gap-1 text-[10px]">
                    <span className="line-through text-muted-foreground">{h.oldValue}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-foreground">{h.newValue}</span>
                  </div>
            }
                <p className="text-[10px] text-muted-foreground mt-0.5">por {h.author}</p>
              </div>
            </div>
        )}
        </div>
      }
      acoes={
      <div className="space-y-3">
           <button onClick={onEdit} className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
             <Edit2 className="w-4 h-4" /> Editar Etapa
          </button>
          <button onClick={() => toast.success("Status alterado")} className="w-full px-4 py-2.5 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors">
            {entrega.status === "ativa" ? "Desativar" : "Ativar"}
          </button>
        </div>
      } />);


}

function AtividadeDetail({ atividade, onEdit, navigate, hideTime }: {atividade: Atividade;onEdit: () => void;navigate: (path: string) => void;hideTime?: boolean;}) {
  const entrega = getEntregaForAtividade(atividade.id);
  const servico = entrega ? getServicoForEntrega(entrega.id) : undefined;
  const history = getHistoryForEntity("atividade", atividade.id);

  return (
    <TabbedDetail
      dados={
      <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Código</span><span className="font-data">{atividade.code}</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Etapa proprietária</span><span className="font-data">{entrega?.name ?? "—"} ({entrega?.code})</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Serviço</span><span className="font-data">{servico?.name ?? "—"} ({servico?.code})</span></div>
            {!hideTime && <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Tempo previsto</span><span className="font-data font-semibold">{atividade.timeHours}h</span></div>}
          </div>

          {/* Cargos */}
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cargos permitidos para execução</p>
            {atividade.cargosPermitidos.length === 0 ?
          <div className="bg-status-danger-muted border border-status-danger/20 rounded-lg p-2.5 text-[11px] text-status-danger flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Nenhum cargo — atividade não pode ser executada
              </div> :

          <div className="flex flex-wrap gap-1.5">
                {atividade.cargosPermitidos.map((cid) => {
              const c = getCargoById(cid);
              return c && <CargoBadge key={c.id}>{c.name}</CargoBadge>;
            })}
              </div>
          }
          </div>

          {/* Hierarchy path */}
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Caminho hierárquico</p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="text-foreground font-medium">{servico?.name ?? "—"}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">{entrega?.name ?? "—"}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-primary font-medium">{atividade.name}</span>
            </div>
          </div>

        </div>
      }
      timeline={
      <div className="space-y-3">
          {history.length === 0 ?
        <p className="text-[12px] text-muted-foreground italic">Sem histórico registrado.</p> :
        history.map((h) =>
        <div key={h.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-foreground">v{h.version}</span>
                  <span className="text-[10px] font-data text-muted-foreground">{h.date}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{h.changes}</p>
                {h.oldValue && h.newValue &&
            <div className="mt-1 flex items-center gap-1 text-[10px]">
                    <span className="line-through text-muted-foreground">{h.oldValue}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-foreground">{h.newValue}</span>
                  </div>
            }
                <p className="text-[10px] text-muted-foreground mt-0.5">por {h.author}</p>
              </div>
            </div>
        )}
        </div>
      }
      acoes={
      <div className="space-y-3">
          <button onClick={onEdit} className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            <Edit2 className="w-4 h-4" /> Editar Atividade
          </button>
          <button onClick={() => toast.success("Status alterado")} className="w-full px-4 py-2.5 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors">
            {atividade.status === "ativa" ? "Desativar" : "Ativar"}
          </button>
        </div>
      } />);


}