import React, { useState } from "react";
import { PageHeader, StatusBadge, DataCard, CargoBadge } from "@/components/ui-custom/StatusBadge";
import { useDetailPanel } from "@/contexts/DetailPanelContext";
import { TabbedDetail } from "@/components/DetailPanel";
import { Search, Plus, ChevronRight, ChevronDown, AlertTriangle, Layers, Package, History, Briefcase, Clock, Activity, X } from "lucide-react";
import { SERVICOS, UOS, CRS, CARGOS, ENTREGAS, CATALOGO_SERVICOS, CENTROS_CUSTO, getCargoById, getEntregasByServico, getAtividadesByEntrega, getSumHoursForServico, getSumHoursForEntrega, getHistoryForEntity, getCargosPermitidosByServico, getAtividadesSemCargo, Servico } from "@/data/mockData";

interface EtapaConfig {
  etapaId: string;
  tipo: "" | "novo" | "renovacao" | "indiferente";
  tempoNovo: string;
  tempoRenovacao: string;
  tempoUnico: string;
  atividades: { atividadeId: string; cargos: string[] }[];
}
import { useProfile } from "@/contexts/ProfileContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";

type ViewMode = "catalogo" | "arvore";
type StatusFilter = "todos" | "ativo" | "rascunho" | "inativo";

function UoMultiSelect({ selected, onChange, hasError }: { selected: string[]; onChange: (v: string[]) => void; hasError: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const handleBlur = React.useCallback((e: React.FocusEvent) => {
    if (ref.current && !ref.current.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }, []);

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  };

  return (
    <div ref={ref} className="relative mt-1.5" onBlur={handleBlur} tabIndex={-1}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between border rounded-lg text-sm p-2.5 bg-card text-left ${hasError ? 'border-status-danger' : 'border-input'} focus:outline-none focus:ring-2 focus:ring-ring`}
      >
        <span className={selected.length === 0 ? "text-muted-foreground" : "text-foreground"}>
          {selected.length === 0 ? "Selecione uma ou mais UOs" : `${selected.length} UO(s) selecionada(s)`}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 border border-input rounded-lg bg-card shadow-lg max-h-40 overflow-y-auto p-2 space-y-1">
          {UOS.map((u) => (
            <label key={u.id} className="flex items-center gap-2 cursor-pointer text-sm px-1.5 py-1 rounded hover:bg-accent/50">
              <input
                type="checkbox"
                checked={selected.includes(u.name)}
                onChange={() => toggle(u.name)}
                className="rounded border-input accent-primary"
              />
              {u.name}
            </label>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-[12px] font-medium">
              {name}
              <button type="button" onClick={() => toggle(name)} className="hover:text-status-danger transition-colors">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParametrizacaoPage() {
  const { openPanel } = useDetailPanel();
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const isCoordenador = currentProfile.role === "coordenador";
  const isTargetProfile = currentProfile.role === "coordenador" || currentProfile.role === "backoffice_dr";
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("catalogo");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [expandedEntregas, setExpandedEntregas] = useState<Set<string>>(new Set());
  const [services, setServices] = useState(SERVICOS);
  const [form, setForm] = useState({ catalogoCode: "", cr: isTargetProfile ? "" : "CR 100", uo: [] as string[], totalHours: "", mobilityLimit: "50", centroCusto: "" });
  const [editingService, setEditingService] = useState<Servico | null>(null);
  const [etapasConfig, setEtapasConfig] = useState<EtapaConfig[]>([{ etapaId: "", tipo: "", tempoNovo: "", tempoRenovacao: "", tempoUnico: "", atividades: [] }]);
  const [etapaSearches, setEtapaSearches] = useState<Record<number, string>>({});
  const [atividadeSearches, setAtividadeSearches] = useState<Record<string, string>>({});
  const isDR = currentProfile.role === "backoffice_dr";
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filtered = services.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || s.status === statusFilter;
    // Hide "Treinamento NR-35" for target profiles
    if (isTargetProfile && s.code === "TR-004") return false;
    return matchSearch && matchStatus;
  });

  const totalServices = services.length;
  const activeServices = services.filter((s) => s.status === "ativo").length;
  const draftServices = services.filter((s) => s.status === "rascunho").length;
  const inconsistentServices = services.filter((s) => getSumHoursForServico(s.id) > s.totalHours).length;
  const semCargoTotal = getAtividadesSemCargo().length;

  const toggleService = (id: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleEntrega = (id: string) => {
    setExpandedEntregas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setForm({ catalogoCode: "", cr: isTargetProfile ? "" : "CR 100", uo: isTargetProfile ? [] : [UOS[0].name], totalHours: "", mobilityLimit: "50", centroCusto: "" });
    setEditingService(null);
    setFormErrors({});
    setEtapasConfig([{ etapaId: "", tipo: "", tempoNovo: "", tempoRenovacao: "", tempoUnico: "", atividades: [] }]);
    setEtapaSearches({});
    setAtividadeSearches({});
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (service: Servico) => {
    setEditingService(service);
    setForm({
      catalogoCode: service.code,
      cr: service.cr,
      uo: [service.uo],
      totalHours: String(service.totalHours),
      mobilityLimit: String(service.mobilityLimit),
      centroCusto: ""
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const selectedCatalogo = CATALOGO_SERVICOS.find((c) => c.code === form.catalogoCode);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.catalogoCode) errors.catalogoCode = "Serviço é obrigatório";
    if (!form.cr) errors.cr = "CR é obrigatório";
    if (form.uo.length === 0) errors.uo = "Selecione ao menos uma UO";
    if (!isTargetProfile && !form.totalHours) errors.totalHours = "Tempo orçado é obrigatório";
    if (!form.mobilityLimit) errors.mobilityLimit = "Limite de mobilidade é obrigatório";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    if (!selectedCatalogo) return;

    if (editingService) {
      const updated = services.map((s) =>
      s.id === editingService.id ?
      {
        ...s,
        name: selectedCatalogo.name,
        code: selectedCatalogo.code,
        cr: form.cr,
        uo: form.uo[0] || "",
        totalHours: isTargetProfile ? s.totalHours : Number(form.totalHours),
        mobilityLimit: Number(form.mobilityLimit)
      } :
      s
      );
      setServices(updated);
      setDialogOpen(false);
      resetForm();
      toast.success("Serviço atualizado", { description: selectedCatalogo.name });

      const updatedService = updated.find((s) => s.id === editingService.id);
      if (updatedService) {
        openPanel(`Serviço: ${updatedService.name}`, <ServiceDetail service={updatedService} navigate={navigate} onEdit={openEditDialog} />);
      }
    } else {
      const exists = services.find((s) => s.code === selectedCatalogo.code);
      if (exists) {
        toast.error("Serviço já cadastrado", { description: `O código ${selectedCatalogo.code} já existe na lista.` });
        return;
      }

      const newService: Servico = {
        id: `sv-${Date.now()}`,
        name: selectedCatalogo.name,
        code: selectedCatalogo.code,
        cr: form.cr,
        uo: form.uo[0] || "",
        totalHours: isTargetProfile ? 0 : Number(form.totalHours),
        status: "rascunho",
        mobilityLimit: Number(form.mobilityLimit),
        version: 1,
        validFrom: "11/03/2026",
        validTo: null
      };
      setServices([newService, ...services]);
      setDialogOpen(false);
      resetForm();
      toast.success("Serviço criado com sucesso", { description: newService.name });
    }
  };

  /** Time bar — shows computed vs budget */
  function TimeBar({ computed, budget, size = "md" }: {computed: number;budget: number;size?: "sm" | "md";}) {
    const pct = budget > 0 ? Math.min(computed / budget * 100, 100) : 0;
    const overflow = computed > budget;
    const h = size === "sm" ? "h-1.5" : "h-2";
    return (
      <div className="flex items-center gap-2">
        <div className={`flex-1 ${h} rounded-full bg-muted overflow-hidden`}>
          <div
            className={`${h} rounded-full transition-all ${overflow ? 'bg-status-danger' : pct >= 80 ? 'bg-status-warning' : 'bg-primary'}`}
            style={{ width: `${pct}%` }} />
          
        </div>
        <span className={`text-[11px] font-data whitespace-nowrap ${overflow ? 'text-status-danger font-semibold' : 'text-muted-foreground'}`}>
          {computed}h / {budget}h
        </span>
      </div>);

  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Parâmetros de Serviços"
        actions={
        !isCoordenador ? <button onClick={openCreateDialog} className="flex items-center gap-2 px-4 py-2 text-primary-foreground rounded-lg text-sm font-medium transition-colors bg-sidebar">
            <Plus className="w-4 h-4" /> Novo Parâmetro
          </button> : undefined
        } />
      

      {/* Business rule banner */}
      








      

      <div className={`grid ${isTargetProfile ? 'grid-cols-3' : 'grid-cols-5'} gap-4 mb-6`}>
        <DataCard label="Total de serviços" value={totalServices} />
        <DataCard label="Ativos" value={activeServices} variant="success" />
        <DataCard label="Rascunho" value={draftServices} variant="warning" />
        {!isTargetProfile && <DataCard label="Inconsistentes" value={inconsistentServices} variant="danger" sublabel="Σ atividades > orçamento" />}
        {!isTargetProfile && <DataCard label="Sem cargo" value={semCargoTotal} variant={semCargoTotal > 0 ? "danger" : "success"} sublabel="Atividades" />}
      </div>

      {inconsistentServices > 0 &&
      <div className="bg-status-danger-muted border border-status-danger/20 rounded-lg p-3 mb-5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-status-danger mt-0.5 shrink-0" />
          <div>
            <p className="text-[12px] font-medium text-foreground">Inconsistência detectada</p>
            <p className="text-[11px] text-muted-foreground">{inconsistentServices} serviço(s) com soma de atividades maior que o tempo orçado.</p>
          </div>
        </div>
      }

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(currentProfile.role === "coordenador" || currentProfile.role === "backoffice_dr") ? (
            <>
              <button onClick={() => setViewMode("catalogo")}
              className={`px-3 py-2 text-[12px] font-medium transition-colors border-b-2 ${viewMode === "catalogo" ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                Catálogo
              </button>
              <button onClick={() => setViewMode("arvore")}
              className={`px-3 py-2 text-[12px] font-medium transition-colors border-b-2 flex items-center gap-1.5 ${viewMode === "arvore" ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                <Layers className="w-3.5 h-3.5" /> Árvore Hierárquica
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setViewMode("catalogo")}
              className={`px-3 py-1.5 text-[12px] rounded-lg font-medium transition-colors ${viewMode === "catalogo" ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-accent'}`}>
                Catálogo
              </button>
              <button onClick={() => setViewMode("arvore")}
              className={`px-3 py-1.5 text-[12px] rounded-lg font-medium transition-colors flex items-center gap-1.5 ${viewMode === "arvore" ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-accent'}`}>
                <Layers className="w-3.5 h-3.5" /> Árvore Hierárquica
              </button>
            </>
          )}
          <div className="w-px h-7 bg-border mx-1" />
          {(["todos", "ativo", "rascunho", "inativo"] as StatusFilter[]).map((f) =>
          <button key={f} onClick={() => setStatusFilter(f)}
          className={`px-2.5 py-1.5 text-[11px] rounded-lg font-medium transition-colors capitalize ${statusFilter === f ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar serviço..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-64 pl-9 pr-4 py-2 border border-input rounded-lg text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {filtered.length === 0 &&
      <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground">Nenhum serviço encontrado</p>
          <p className="text-[12px] text-muted-foreground mt-1">Ajuste os filtros ou crie um novo serviço.</p>
        </div>
      }

      {/* ═══════════════ CATÁLOGO VIEW ═══════════════ */}
      {viewMode === "catalogo" && filtered.length > 0 &&
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Serviço</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">CR / UO</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Etapas</th>
                {!isTargetProfile && <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-48">Tempo (Σ / Orçado)</th>}
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Versão</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => {
              const sumHours = getSumHoursForServico(s.id);
              const entregasCount = getEntregasByServico(s.id).length;
              const atvsNoCargo = getAtividadesSemCargo(s.id).length;
              return (
                <tr key={s.id} className="hover:bg-accent/30 cursor-pointer transition-colors"
                onClick={() => openPanel(`Serviço: ${s.name}`, <ServiceDetail service={s} navigate={navigate} onEdit={openEditDialog} />)}>
                    <td className="px-4 py-3 font-data text-[12px] text-muted-foreground">{s.code}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground text-[13px]">{s.name}</span>
                      {atvsNoCargo > 0 &&
                    <span className="ml-2 text-[10px] text-status-danger"><AlertTriangle className="w-3 h-3 inline" /> {atvsNoCargo} s/ cargo</span>
                    }
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[12px]">{s.cr} · {s.uo}</td>
                    <td className="px-4 py-3 text-center font-data text-[12px]">{entregasCount}</td>
                    {!isTargetProfile && <td className="px-4 py-3">
                      <TimeBar computed={sumHours} budget={s.totalHours} size="sm" />
                    </td>}
                    <td className="px-4 py-3 text-center font-data text-[11px] text-muted-foreground">v{s.version}</td>
                    <td className="px-4 py-3">
                      {s.status === "ativo" && <StatusBadge variant="success">Ativo</StatusBadge>}
                      {s.status === "rascunho" && <StatusBadge variant="info">Rascunho</StatusBadge>}
                      {s.status === "inativo" && <StatusBadge variant="danger">Inativo</StatusBadge>}
                    </td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                  </tr>);

            })}
            </tbody>
          </table>
        </div>
      }

      {/* ═══════════════ ÁRVORE VIEW ═══════════════ */}
      {viewMode === "arvore" && filtered.length > 0 &&
      <div className="space-y-3">
          {filtered.map((s) => {
          const isExpanded = expandedServices.has(s.id);
          const entregas = getEntregasByServico(s.id);
          const sumHours = getSumHoursForServico(s.id);
          const isInconsistent = sumHours > s.totalHours;
          const atividadesSemCargoCount = getAtividadesSemCargo(s.id).length;
          const totalAtividades = entregas.reduce((sum, e) => sum + getAtividadesByEntrega(e.id).length, 0);

          return (
            <div key={s.id} className={`bg-card border rounded-lg overflow-hidden shadow-card ${isInconsistent ? 'border-status-danger/30' : 'border-border'}`}>
                {/* Service header */}
                <button
                onClick={() => toggleService(s.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/20 transition-colors text-left">
                
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.status === "ativo" ? "bg-status-success" : s.status === "rascunho" ? "bg-status-info" : "bg-status-danger"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-foreground">{s.name}</span>
                        <span className="text-[11px] font-data text-muted-foreground">{s.code}</span>
                        <StatusBadge variant={s.status === "ativo" ? "success" : s.status === "rascunho" ? "info" : "danger"}>
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </StatusBadge>
                        <span className="text-[10px] text-muted-foreground">v{s.version}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
                        <span>{entregas.length} etapa(s)</span>
                        <span>{totalAtividades} atividade(s)</span>
                        <span className="text-[10px]">{s.validFrom} — {s.validTo || "vigente"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {atividadesSemCargoCount > 0 && <StatusBadge variant="warning">{atividadesSemCargoCount} s/ cargo</StatusBadge>}
                    {isInconsistent && !isTargetProfile && <StatusBadge variant="danger">Excede orçamento</StatusBadge>}
                    {isTargetProfile ? (
                      <span className="text-[12px] font-data font-semibold text-foreground">Σ {sumHours}h</span>
                    ) : (
                      <div className="w-32">
                        <TimeBar computed={sumHours} budget={s.totalHours} size="sm" />
                      </div>
                    )}
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded &&
              <div className="border-t border-border bg-muted/10">
                    {/* Etapas */}
                    {entregas.length === 0 ?
                <div className="px-5 py-8 text-center">
                        <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                        <p className="text-[12px] text-muted-foreground">Nenhuma etapa cadastrada para este serviço</p>
                        <button onClick={() => navigate("/entregas")} className="text-[11px] text-primary mt-2 hover:underline">Criar etapa →</button>
                      </div> :

                <div className="divide-y divide-border">
                        {entregas.map((entrega) => {
                    const atividades = getAtividadesByEntrega(entrega.id);
                    const entregaSum = getSumHoursForEntrega(entrega.id);
                    const isEntregaExpanded = expandedEntregas.has(entrega.id);

                    return (
                      <div key={entrega.id}>
                              {/* Etapa row */}
                              <button
                          onClick={() => toggleEntrega(entrega.id)}
                          className="w-full flex items-center justify-between px-5 py-3 pl-10 hover:bg-accent/10 transition-colors text-left">
                          
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <Package className="w-4 h-4 text-primary shrink-0" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[13px] font-medium text-foreground">{entrega.name}</span>
                                      <span className="text-[11px] font-data text-muted-foreground">{entrega.code}</span>
                                      <StatusBadge variant={entrega.status === "ativa" ? "success" : "info"}>
                                        {entrega.status === "ativa" ? "Ativa" : "Rascunho"}
                                      </StatusBadge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {atividades.length} atividade(s) · Σ {entregaSum}h
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[12px] font-data font-semibold text-foreground">{entregaSum}h</span>
                                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isEntregaExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </button>

                              {/* Atividades */}
                              {isEntregaExpanded &&
                        <div className="bg-background/50 border-t border-border">
                                  {atividades.length === 0 ?
                          <div className="px-5 py-4 pl-16 text-[11px] text-muted-foreground italic">
                                      Nenhuma atividade nesta etapa · <button onClick={() => navigate("/entregas")} className="text-primary hover:underline">Criar atividade →</button>
                                    </div> :

                          <div className="divide-y divide-border/50">
                                      {atividades.map((atv) =>
                            <div key={atv.id} className="flex items-center justify-between px-5 py-2.5 pl-16 text-[12px] hover:bg-accent/10 transition-colors">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                            <span className="text-foreground">{atv.name}</span>
                                            <span className="text-[10px] font-data text-muted-foreground">{atv.code}</span>
                                            {atv.status !== "ativa" &&
                                <StatusBadge variant="info">{atv.status === "rascunho" ? "Rascunho" : "Inativa"}</StatusBadge>
                                }
                                          </div>
                                          <div className="flex items-center gap-3 shrink-0">
                                            {/* Cargos */}
                                            {atv.cargosPermitidos.length === 0 ?
                                <span className="text-[10px] text-status-danger flex items-center gap-0.5">
                                                <AlertTriangle className="w-3 h-3" /> Sem cargo
                                              </span> :

                                <div className="flex gap-0.5">
                                                {atv.cargosPermitidos.map((cid) => {
                                    const c = getCargoById(cid);
                                    return c &&
                                    <span key={c.id} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/8 text-primary border border-primary/15">{c.code}</span>;

                                  })}
                                              </div>
                                }
                                            {/* Time */}
                                            <span className="font-data text-foreground font-medium flex items-center gap-1">
                                              <Clock className="w-3 h-3 text-muted-foreground" />
                                              {atv.timeHours}h
                                            </span>
                                          </div>
                                        </div>
                            )}
                                      {/* Etapa subtotal */}
                                      <div className="flex items-center justify-between px-5 py-2 pl-16 bg-muted/30 text-[11px]">
                                        <span className="text-muted-foreground font-medium">Subtotal da etapa</span>
                                        <span className="font-data font-semibold text-foreground">{entregaSum}h</span>
                                      </div>
                                    </div>
                          }
                                </div>
                        }
                            </div>);

                  })}

                        {/* Service total footer */}
                        <div className={`flex items-center justify-between px-5 py-3 text-[12px] font-medium ${!isTargetProfile && isInconsistent ? 'bg-status-danger-muted' : 'bg-muted/40'}`}>
                          <div className="flex items-center gap-2">
                            {!isTargetProfile && isInconsistent && <AlertTriangle className="w-4 h-4 text-status-danger" />}
                            <span className={!isTargetProfile && isInconsistent ? "text-status-danger" : "text-muted-foreground"}>
                              {!isTargetProfile && isInconsistent ? "Σ atividades excede o orçamento do serviço" : "Total do serviço (cascata)"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-data">
                              Σ Atividades: <strong className={!isTargetProfile && isInconsistent ? "text-status-danger" : "text-foreground"}>{sumHours}h</strong>
                            </span>
                            {!isTargetProfile && <>
                              <span className="text-muted-foreground">|</span>
                              <span className="font-data">
                                Orçado: <strong className="text-foreground">{s.totalHours}h</strong>
                              </span>
                            </>}
                          </div>
                        </div>
                      </div>
                }
                  </div>
              }
              </div>);

        })}
        </div>
      }


      {/* Dialog: Novo/Editar Serviço */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {setDialogOpen(open);if (!open) resetForm();}}>
        <DialogContent className={isDR ? "max-w-2xl max-h-[85vh] overflow-y-auto" : ""}>
          <DialogHeader><DialogTitle>{editingService ? "Editar Serviço" : "Novo Parâmetro"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Serviço <span className="text-status-danger">*</span></label>
              <select
                value={form.catalogoCode}
                onChange={(e) => { setForm({ ...form, catalogoCode: e.target.value }); setFormErrors(prev => ({ ...prev, catalogoCode: "" })); }}
                className={`w-full border rounded-lg text-sm p-2.5 bg-card mt-1.5 focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.catalogoCode ? 'border-status-danger' : 'border-input'}`}>
                
                <option value="">Selecione um serviço</option>
                {CATALOGO_SERVICOS.map((c) =>
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                )}
              </select>
              {formErrors.catalogoCode && <p className="text-[11px] text-status-danger mt-1">{formErrors.catalogoCode}</p>}
            </div>
            <div className={isTargetProfile ? "" : "grid grid-cols-2 gap-3"}>
              {!isTargetProfile && <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tempo Orçado (h) <span className="text-status-danger">*</span></label>
                <input type="number" value={form.totalHours} onChange={(e) => { setForm({ ...form, totalHours: e.target.value }); setFormErrors(prev => ({ ...prev, totalHours: "" })); }} className={`w-full border rounded-lg text-sm p-2.5 bg-card mt-1.5 font-data focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.totalHours ? 'border-status-danger' : 'border-input'}`} placeholder="120" />
                {formErrors.totalHours && <p className="text-[11px] text-status-danger mt-1">{formErrors.totalHours}</p>}
              </div>}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Limite de Mobilidade (km) <span className="text-status-danger">*</span></label>
                <input type="number" value={form.mobilityLimit} onChange={(e) => { setForm({ ...form, mobilityLimit: e.target.value }); setFormErrors(prev => ({ ...prev, mobilityLimit: "" })); }} className={`w-full border rounded-lg text-sm p-2.5 bg-card mt-1.5 font-data focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.mobilityLimit ? 'border-status-danger' : 'border-input'}`} />
                {formErrors.mobilityLimit && <p className="text-[11px] text-status-danger mt-1">{formErrors.mobilityLimit}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">CR <span className="text-status-danger">*</span></label>
                <select value={form.cr} onChange={(e) => {
                  const newCr = e.target.value;
                  const matched = CENTROS_CUSTO.find((cc) => cc.cr === newCr && form.uo.length > 0 && cc.uo === form.uo[0]);
                  setForm({ ...form, cr: newCr, centroCusto: matched ? matched.code : "" });
                  setFormErrors(prev => ({ ...prev, cr: "" }));
                }} className={`w-full border rounded-lg text-sm p-2.5 bg-card mt-1.5 ${formErrors.cr ? 'border-status-danger' : 'border-input'}`}>
                  {isTargetProfile && <option value="">Selecione</option>}
                  {CRS.map((c) => <option key={c.id}>{c.code}</option>)}
                </select>
                {formErrors.cr && <p className="text-[11px] text-status-danger mt-1">{formErrors.cr}</p>}
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">UO <span className="text-status-danger">*</span></label>
                {isTargetProfile ? (
                  <UoMultiSelect
                    selected={form.uo}
                    onChange={(newUo) => {
                      const matched = CENTROS_CUSTO.find((cc) => cc.cr === form.cr && newUo.length > 0 && cc.uo === newUo[0]);
                      setForm({ ...form, uo: newUo, centroCusto: matched ? matched.code : "" });
                      setFormErrors(prev => ({ ...prev, uo: "" }));
                    }}
                    hasError={!!formErrors.uo}
                  />
                ) : (
                  <select value={form.uo[0] || ""} onChange={(e) => {
                    const newUo = e.target.value;
                    const matched = CENTROS_CUSTO.find((cc) => cc.cr === form.cr && cc.uo === newUo);
                    setForm({ ...form, uo: [newUo], centroCusto: matched ? matched.code : "" });
                    setFormErrors(prev => ({ ...prev, uo: "" }));
                  }} className={`w-full border rounded-lg text-sm p-2.5 bg-card mt-1.5 ${formErrors.uo ? 'border-status-danger' : 'border-input'}`}>
                    {UOS.map((u) => <option key={u.id}>{u.name}</option>)}
                  </select>
                )}
                {formErrors.uo && <p className="text-[11px] text-status-danger mt-1">{formErrors.uo}</p>}
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Centro de Custos</label>
                <select
                  value={form.centroCusto}
                  disabled
                  className="w-full border border-input rounded-lg text-sm p-2.5 bg-muted/50 mt-1.5 cursor-not-allowed text-foreground"
                >
                  {form.centroCusto ? (
                    <option value={form.centroCusto}>{form.centroCusto}</option>
                  ) : (
                    <option value="">—</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* ═══ Etapas do Serviço — DR only ═══ */}
          {isDR && (
            <div className="space-y-3 pt-2">
              <div className="border-t border-border pt-4" />
              {etapasConfig.map((etapa, idx) => {
                const etapaObj = ENTREGAS.find(e => e.id === etapa.etapaId);
                const atividadesDisponiveis = etapa.etapaId ? getAtividadesByEntrega(etapa.etapaId) : [];
                const searchTerm = etapaSearches[idx] || "";
                const filteredEtapas = ENTREGAS.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

                const updateEtapa = (patch: Partial<EtapaConfig>) => {
                  setEtapasConfig(prev => prev.map((et, i) => i === idx ? { ...et, ...patch } : et));
                };

                return (
                  <div key={idx} className="border border-border rounded-lg p-4 space-y-3 bg-card relative">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Etapa {idx + 1}</span>
                      {etapasConfig.length > 1 && (
                        <button type="button" onClick={() => setEtapasConfig(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-status-danger transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Etapa select with search */}
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Etapa <span className="text-status-danger">*</span></label>
                      <div className="relative mt-1.5">
                        <input
                          type="text"
                          placeholder="Selecione uma etapa"
                          value={etapaObj ? etapaObj.name : searchTerm}
                          onChange={(e) => {
                            setEtapaSearches(prev => ({ ...prev, [idx]: e.target.value }));
                            if (etapa.etapaId) updateEtapa({ etapaId: "", tipo: "", tempoNovo: "", tempoRenovacao: "", tempoUnico: "", atividades: [] });
                          }}
                          onFocus={() => setEtapaSearches(prev => ({ ...prev, [idx]: etapaObj ? "" : (prev[idx] || "") }))}
                          className="w-full border border-input rounded-lg text-sm p-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        {(!etapa.etapaId || searchTerm) && filteredEtapas.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 border border-input rounded-lg bg-card shadow-lg max-h-40 overflow-y-auto p-1">
                            {filteredEtapas.map(e => (
                              <button key={e.id} type="button" onClick={() => {
                                updateEtapa({ etapaId: e.id, tipo: "", tempoNovo: "", tempoRenovacao: "", tempoUnico: "", atividades: [] });
                                setEtapaSearches(prev => ({ ...prev, [idx]: "" }));
                              }} className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 rounded">
                                {e.name} <span className="text-muted-foreground text-[11px]">({e.code})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tipo */}
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tipo <span className="text-status-danger">*</span></label>
                      <select
                        value={etapa.tipo}
                        disabled={!etapa.etapaId}
                        onChange={(e) => updateEtapa({ tipo: e.target.value as EtapaConfig["tipo"], tempoNovo: "", tempoRenovacao: "", tempoUnico: "" })}
                        className={`w-full border border-input rounded-lg text-sm p-2.5 bg-card mt-1.5 ${!etapa.etapaId ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="">{etapa.etapaId ? "Selecione o tipo" : "Selecione a etapa primeiro"}</option>
                        <option value="novo">Novo</option>
                        <option value="renovacao">Renovação</option>
                        <option value="indiferente">Indiferente</option>
                      </select>
                    </div>

                    {/* Tempo fields */}
                    {etapa.tipo === "indiferente" && (
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tempo (h) <span className="text-status-danger">*</span></label>
                        <input type="number" value={etapa.tempoUnico} onChange={(e) => updateEtapa({ tempoUnico: e.target.value })} placeholder="Ex: 8" className="w-full border border-input rounded-lg text-sm p-2.5 bg-card mt-1.5 font-data focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    )}
                    {(etapa.tipo === "novo" || etapa.tipo === "renovacao") && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tempo Novo (h) <span className="text-status-danger">*</span></label>
                          <input type="number" value={etapa.tempoNovo} onChange={(e) => updateEtapa({ tempoNovo: e.target.value })} placeholder="Ex: 10" className="w-full border border-input rounded-lg text-sm p-2.5 bg-card mt-1.5 font-data focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tempo Renovação (h) <span className="text-status-danger">*</span></label>
                          <input type="number" value={etapa.tempoRenovacao} onChange={(e) => updateEtapa({ tempoRenovacao: e.target.value })} placeholder="Ex: 6" className="w-full border border-input rounded-lg text-sm p-2.5 bg-card mt-1.5 font-data focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                      </div>
                    )}

                    {/* Atividades multiselect */}
                    {etapa.etapaId && etapa.tipo && (
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Atividades</label>
                        <div className="mt-1.5 border border-input rounded-lg bg-card">
                          <input
                            type="text"
                            placeholder="Buscar atividade..."
                            value={atividadeSearches[`${idx}`] || ""}
                            onChange={(e) => setAtividadeSearches(prev => ({ ...prev, [`${idx}`]: e.target.value }))}
                            className="w-full text-sm p-2.5 bg-transparent focus:outline-none border-b border-input"
                          />
                          <div className="max-h-36 overflow-y-auto p-2 space-y-1">
                            {atividadesDisponiveis
                              .filter(a => a.name.toLowerCase().includes((atividadeSearches[`${idx}`] || "").toLowerCase()))
                              .map(atv => {
                                const isSelected = etapa.atividades.some(ea => ea.atividadeId === atv.id);
                                return (
                                  <label key={atv.id} className="flex items-center gap-2 cursor-pointer text-sm px-1.5 py-1 rounded hover:bg-accent/50">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        if (isSelected) {
                                          updateEtapa({ atividades: etapa.atividades.filter(ea => ea.atividadeId !== atv.id) });
                                        } else {
                                          updateEtapa({ atividades: [...etapa.atividades, { atividadeId: atv.id, cargos: [] }] });
                                        }
                                      }}
                                      className="rounded border-input accent-primary"
                                    />
                                    {atv.name} <span className="text-muted-foreground text-[10px]">({atv.code})</span>
                                  </label>
                                );
                              })}
                            {atividadesDisponiveis.length === 0 && (
                              <p className="text-[11px] text-muted-foreground italic px-1.5 py-1">Nenhuma atividade vinculada a esta etapa</p>
                            )}
                          </div>
                        </div>

                        {/* Cargos per selected atividade */}
                        {etapa.atividades.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {etapa.atividades.map(ea => {
                              const atvObj = atividadesDisponiveis.find(a => a.id === ea.atividadeId);
                              if (!atvObj) return null;
                              return (
                                <div key={ea.atividadeId} className="border border-border/60 rounded-lg p-3 bg-muted/20">
                                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Cargos — {atvObj.name}</label>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {CARGOS.filter(c => c.status === "ativo").map(cargo => {
                                      const isCargoSel = ea.cargos.includes(cargo.id);
                                      return (
                                        <button
                                          key={cargo.id}
                                          type="button"
                                          onClick={() => {
                                            const newCargos = isCargoSel ? ea.cargos.filter(c => c !== cargo.id) : [...ea.cargos, cargo.id];
                                            updateEtapa({
                                              atividades: etapa.atividades.map(a => a.atividadeId === ea.atividadeId ? { ...a, cargos: newCargos } : a)
                                            });
                                          }}
                                          className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${isCargoSel ? 'bg-primary/10 text-primary border-primary/20 font-medium' : 'bg-card text-muted-foreground border-input hover:border-primary/30'}`}
                                        >
                                          {cargo.code}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add etapa button */}
              <button
                type="button"
                onClick={() => setEtapasConfig(prev => [...prev, { etapaId: "", tipo: "", tempoNovo: "", tempoRenovacao: "", tempoUnico: "", atividades: [] }])}
                className="w-full border border-dashed border-border rounded-lg py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar etapa
              </button>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => {setDialogOpen(false);resetForm();}} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors">Cancelar</button>
            {isDR && !editingService && (
              <button
                onClick={() => {
                  if (!form.catalogoCode) { setFormErrors({ catalogoCode: "Serviço é obrigatório" }); return; }
                  const cat = CATALOGO_SERVICOS.find(c => c.code === form.catalogoCode);
                  if (!cat) return;
                  const newService: Servico = {
                    id: `sv-${Date.now()}`, name: cat.name, code: cat.code, cr: form.cr || "", uo: form.uo[0] || "",
                    totalHours: 0, status: "rascunho", mobilityLimit: Number(form.mobilityLimit) || 50, version: 1, validFrom: "30/03/2026", validTo: null
                  };
                  setServices([newService, ...services]);
                  setDialogOpen(false); resetForm();
                  toast.success("Rascunho salvo", { description: cat.name });
                }}
                className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors"
              >
                Salvar como rascunho
              </button>
            )}
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              {editingService ? "Salvar alterações" : isDR ? "Salvar parâmetro" : "Novo Parâmetro"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}

// ═══════════════════════════════════════════════════
// Detail panel for Service (opened via side panel)
// ═══════════════════════════════════════════════════
function ServiceDetail({ service, navigate, onEdit }: {service: Servico;navigate: (path: string) => void;onEdit: (s: Servico) => void;}) {
  const sumHours = getSumHoursForServico(service.id);
  const isInconsistent = sumHours > service.totalHours;
  const canActivate = service.status !== "ativo" && !isInconsistent;
  const entregas = getEntregasByServico(service.id);
  const history = getHistoryForEntity("servico", service.id);
  const cargosDerivados = getCargosPermitidosByServico(service.id);
  const semCargo = getAtividadesSemCargo(service.id);

  return (
    <TabbedDetail
      dados={
      <div className="space-y-4">
          {/* Key data */}
          <div className="space-y-2">
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Código</span><span className="font-data">{service.code}</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">CR / UO</span><span>{service.cr} · {service.uo}</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Tempo Orçado</span><span className="font-data">{service.totalHours}h</span></div>
            <div className="flex justify-between text-[12px]">
              <span className="text-muted-foreground">Σ Atividades (cascata)</span>
              <span className={`font-data ${isInconsistent ? 'text-status-danger font-semibold' : ''}`}>{sumHours}h</span>
            </div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Limite Mobilidade</span><span className="font-data">{service.mobilityLimit}km</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Versão</span><span className="font-data">v{service.version}</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Vigência</span><span className="font-data">{service.validFrom} — {service.validTo || "Atual"}</span></div>
          </div>

          {/* Alerts */}
          {isInconsistent &&
        <div className="bg-status-danger-muted border border-status-danger/20 rounded-lg p-2.5 text-[11px] text-status-danger flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Σ atividades ({sumHours}h) excede o orçamento ({service.totalHours}h)
            </div>
        }
          {semCargo.length > 0 &&
        <div className="bg-status-warning-muted border border-status-warning/20 rounded-lg p-2.5 text-[11px] text-status-warning flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 shrink-0" /> {semCargo.length} atividade(s) sem cargo permitido
            </div>
        }

          {/* Cascade breakdown */}
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Composição de tempo (cascata)</p>
            {entregas.length === 0 ?
          <p className="text-[11px] text-muted-foreground italic">Nenhuma etapa</p> :
          entregas.map((e) => {
            const ativs = getAtividadesByEntrega(e.id);
            const eSum = getSumHoursForEntrega(e.id);
            return (
              <div key={e.id} className="mb-3">
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-primary" /> {e.name}
                    </span>
                    <span className="font-data text-muted-foreground">{eSum}h</span>
                  </div>
                  {ativs.map((a) =>
                <div key={a.id} className="flex items-center justify-between pl-5 py-0.5 text-[11px] border-l-2 border-primary/10">
                      <span className="text-muted-foreground">{a.name}</span>
                      <span className="font-data text-muted-foreground">{a.timeHours}h</span>
                    </div>
                )}
                </div>);

          })}
          </div>

          {/* Cargos derived */}
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cargos permitidos (derivados das atividades)</p>
            <div className="flex flex-wrap gap-1.5">
              {cargosDerivados.length > 0 ? cargosDerivados.map((c) =>
            <CargoBadge key={c.id}>{c.name}</CargoBadge>
            ) :
            <span className="text-[11px] text-muted-foreground italic">Nenhum cargo</span>
            }
            </div>
          </div>

        </div>
      }
      timeline={
      <div className="space-y-0">
          {history.length === 0 ?
        <p className="text-[12px] text-muted-foreground italic">Sem histórico registrado.</p> :

        <div className="space-y-3">
              {history.map((h) =>
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
        </div>
      }
      acoes={
      <div className="space-y-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
              disabled={!canActivate}
              onClick={() => toast.success("Serviço ativado", { description: service.name })}
              className="w-full px-4 py-2.5 bg-status-success text-status-success-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
              
                Ativar Serviço
              </button>
            </TooltipTrigger>
            {!canActivate &&
          <TooltipContent>
                <p className="text-xs">{isInconsistent ? "Σ atividades excede o orçamento" : "Serviço já está ativo"}</p>
              </TooltipContent>
          }
          </Tooltip>
          <button onClick={() => onEdit(service)} className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Editar Serviço
          </button>
          <button onClick={() => toast.info("Nova versão criada", { description: `v${service.version + 1}` })} className="w-full px-4 py-2.5 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors flex items-center justify-center gap-2">
            <History className="w-4 h-4" /> Criar Nova Versão
          </button>
        </div>
      } />);


}