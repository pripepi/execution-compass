import React, { useState } from "react";
import { PageHeader, StatusBadge, DataCard, CargoBadge } from "@/components/ui-custom/StatusBadge";
import { useDetailPanel } from "@/contexts/DetailPanelContext";
import { TabbedDetail } from "@/components/DetailPanel";
import { Plus, Search, ChevronRight, Edit2, Briefcase, History, AlertTriangle, Users } from "lucide-react";
import { CARGOS, CARGO_CATEGORY_LABELS, ATIVIDADES, SERVICOS, RECURSOS, getCargoById, getHistoryForEntity, getEntregasByServico, getAtividadesByEntrega, Cargo } from "@/data/mockData";
import { useProfile } from "@/contexts/ProfileContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type StatusFilter = "todos" | "ativo" | "inativo";
type CategoryFilter = "todos" | "engenharia" | "saude" | "tecnico" | "gestao";
type TabView = "cadastro" | "por_atividade";

const CATEGORY_CODE_PREFIX: Record<Cargo["category"], string> = {
  engenharia: "ENG",
  saude: "SAU",
  tecnico: "TEC",
  gestao: "GES"
};

function generateCargoCode(cargos: Cargo[], category: Cargo["category"]): string {
  const prefix = `CG-${CATEGORY_CODE_PREFIX[category]}-`;
  const existing = cargos.
  filter((c) => c.code.startsWith(prefix)).
  map((c) => {
    const num = parseInt(c.code.replace(prefix, ""), 10);
    return isNaN(num) ? 0 : num;
  });
  // Also check non-numeric suffixes – count total with this prefix
  const maxNum = existing.length > 0 ? Math.max(...existing) : 0;
  const next = String(maxNum + 1).padStart(3, "0");
  return `${prefix}${next}`;
}

export default function CargosPage() {
  const { openPanel } = useDetailPanel();
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const isCoordenador = currentProfile.role === "coordenador";
  const [cargos, setCargos] = useState(CARGOS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("todos");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  const [tab, setTab] = useState<TabView>("cadastro");
  const [form, setForm] = useState({ name: "", code: "", category: "tecnico" as Cargo["category"] });

  const filtered = cargos.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || c.status === statusFilter;
    const matchCategory = categoryFilter === "todos" || c.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const totalAtivos = cargos.filter((c) => c.status === "ativo").length;
  const totalInativos = cargos.filter((c) => c.status === "inativo").length;
  const pessoasVinculadas = RECURSOS.length;
  const atividadesSemCargo = ATIVIDADES.filter((a) => a.cargosPermitidos.length === 0 && a.status !== "inativa").length;

  const openNewDialog = () => {
    const code = generateCargoCode(cargos, "tecnico");
    setEditingCargo(null);
    setForm({ name: "", code, category: "tecnico" });
    setDialogOpen(true);
  };

  const openEditDialog = (cargo: Cargo) => {
    setEditingCargo(cargo);
    setForm({ name: cargo.name, code: cargo.code, category: cargo.category });
    setDialogOpen(true);
  };

  const handleCategoryChange = (category: Cargo["category"]) => {
    if (editingCargo) {
      setForm({ ...form, category });
    } else {
      const code = generateCargoCode(cargos, category);
      setForm({ ...form, category, code });
    }
  };

  const handleSave = () => {
    if (editingCargo) {
      setCargos((prev) =>
      prev.map((c) =>
      c.id === editingCargo.id ?
      { ...c, name: form.name, category: form.category, updatedAt: "17/03/2026" } :
      c
      )
      );
      toast.success("Cargo atualizado", { description: form.name });
    } else {
      const newCargo: Cargo = {
        id: `cg-${Date.now()}`,
        name: form.name,
        code: form.code,
        category: form.category,
        status: "ativo",
        createdAt: "17/03/2026",
        updatedAt: "17/03/2026"
      };
      setCargos([newCargo, ...cargos]);
      toast.success("Cargo criado", { description: newCargo.name });
    }
    setDialogOpen(false);
    setEditingCargo(null);
    setForm({ name: "", code: "", category: "tecnico" });
  };

  const handleToggleStatus = (id: string) => {
    setCargos((prev) => prev.map((c) => c.id === id ? { ...c, status: c.status === "ativo" ? "inativo" as const : "ativo" as const, updatedAt: "17/03/2026" } : c));
    toast.success("Status do cargo atualizado");
  };

  // Build activity-cargo matrix
  const servicosWithActivities = SERVICOS.map((s) => ({
    servico: s,
    entregas: getEntregasByServico(s.id).map((e) => ({
      entrega: e,
      atividades: getAtividadesByEntrega(e.id)
    }))
  }));

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Cadastro de Cargos"
        description="Cadastro mestre corporativo de cargos. Global, independente de UO ou contrato."
        actions={
        !isCoordenador ? <button onClick={openNewDialog} className="flex items-center gap-2 px-4 py-2 text-primary-foreground rounded-lg text-sm font-medium transition-colors bg-sidebar">
            <Plus className="w-4 h-4" /> Novo Cargo
          </button> : undefined
        } />
      

      <div className="grid grid-cols-4 gap-4 mb-6">
        <DataCard label="Cargos ativos" value={totalAtivos} variant="success" />
        <DataCard label="Cargos inativos" value={totalInativos} variant="danger" />
        <DataCard label="Pessoas vinculadas" value={pessoasVinculadas} />
        <DataCard label="Atividades sem cargo" value={atividadesSemCargo} variant={atividadesSemCargo > 0 ? "danger" : "success"} sublabel="Inconsistentes" />
      </div>

      {atividadesSemCargo > 0




      }

      {/* Tab + filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(currentProfile.role === "coordenador" || currentProfile.role === "backoffice_dr") ? (
            <>
              <button onClick={() => setTab("cadastro")}
              className={`px-3 py-2 text-[12px] font-medium transition-colors border-b-2 flex items-center gap-1.5 ${tab === "cadastro" ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                <Briefcase className="w-3.5 h-3.5" /> Cadastro de Cargos
              </button>
              <button onClick={() => setTab("por_atividade")}
              className={`px-3 py-2 text-[12px] font-medium transition-colors border-b-2 flex items-center gap-1.5 ${tab === "por_atividade" ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                <Users className="w-3.5 h-3.5" /> Cargos por Atividade
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setTab("cadastro")}
              className={`px-3 py-1.5 text-[12px] rounded-lg font-medium transition-colors flex items-center gap-1.5 ${tab === "cadastro" ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-accent'}`}>
                <Briefcase className="w-3.5 h-3.5" /> Cadastro de Cargos
              </button>
              <button onClick={() => setTab("por_atividade")}
              className={`px-3 py-1.5 text-[12px] rounded-lg font-medium transition-colors flex items-center gap-1.5 ${tab === "por_atividade" ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-accent'}`}>
                <Users className="w-3.5 h-3.5" /> Cargos por Atividade
              </button>
            </>
          )}
          {tab === "cadastro" &&
          <>
              <div className="w-px h-7 bg-border mx-1" />
              {(["todos", "ativo", "inativo"] as StatusFilter[]).map((f) =>
            <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-2.5 py-1.5 text-[11px] rounded-lg font-medium transition-colors capitalize ${statusFilter === f ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
            )}
              <div className="w-px h-7 bg-border mx-1" />
              {(["todos", "engenharia", "saude", "tecnico", "gestao"] as CategoryFilter[]).map((f) =>
            <button key={f} onClick={() => setCategoryFilter(f)}
            className={`px-2.5 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${categoryFilter === f ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {f === "todos" ? "Todas categorias" : CARGO_CATEGORY_LABELS[f as Cargo["category"]]}
                </button>
            )}
            </>
          }
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar cargo..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-56 pl-9 pr-4 py-2 border border-input rounded-lg text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {/* === CADASTRO TABLE === */}
      {tab === "cadastro" &&
      <>
          {filtered.length === 0 ?
        <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-foreground">Nenhum cargo encontrado</p>
              <p className="text-[12px] text-muted-foreground mt-1">Ajuste os filtros ou crie um novo cargo.</p>
            </div> :

        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cargo</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Categoria</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pessoas</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Atividades</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => {
                const pessoasCount = RECURSOS.filter((r) => r.cargoId === c.id).length;
                const atividadesCount = ATIVIDADES.filter((a) => a.cargosPermitidos.includes(c.id)).length;
                return (
                  <tr key={c.id} className="hover:bg-accent/30 cursor-pointer transition-colors"
                  onClick={() => openPanel(`Cargo: ${c.name}`, <CargoDetail cargo={c} onToggle={() => handleToggleStatus(c.id)} onEdit={() => openEditDialog(c)} navigate={navigate} />)}>
                        <td className="px-4 py-3 font-data text-[12px] text-muted-foreground">{c.code}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-foreground">{c.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                      c.category === "engenharia" ? "bg-primary/8 text-primary border border-primary/15" :
                      c.category === "saude" ? "bg-status-success-muted text-status-success border border-status-success/20" :
                      c.category === "tecnico" ? "bg-status-info-muted text-status-info border border-status-info/20" :
                      "bg-muted text-muted-foreground border border-border"}`
                      }>
                            {CARGO_CATEGORY_LABELS[c.category]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-data text-[12px]">{pessoasCount}</td>
                        <td className="px-4 py-3 text-center font-data text-[12px]">{atividadesCount}</td>
                        <td className="px-4 py-3">
                          {c.status === "ativo" ? <StatusBadge variant="success">Ativo</StatusBadge> : <StatusBadge variant="danger">Inativo</StatusBadge>}
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

      {/* === CARGOS POR ATIVIDADE === */}
      {tab === "por_atividade" &&
      <div className="space-y-3">
          {servicosWithActivities.map(({ servico, entregas }) =>
        <div key={servico.id} className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${servico.status === "ativo" ? "bg-status-success" : "bg-status-info"}`} />
                  <span className="text-[13px] font-medium text-foreground">{servico.name}</span>
                  <span className="text-[11px] font-data text-muted-foreground">{servico.code}</span>
                </div>
              </div>
              <div className="px-5 py-3 space-y-2">
                {entregas.map(({ entrega, atividades }) =>
            <div key={entrega.id}>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{entrega.name} ({entrega.code})</p>
                    {atividades.length === 0 ?
              <p className="text-[11px] text-muted-foreground italic ml-4">Nenhuma atividade</p> :

              <div className="space-y-1 ml-4">
                        {atividades.map((atv) =>
                <div key={atv.id} className="flex items-center justify-between py-1.5 pl-3 border-l-2 border-primary/15 text-[12px]">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground">{atv.name}</span>
                              <span className="text-[10px] font-data text-muted-foreground">{atv.code}</span>
                              <span className="font-data text-muted-foreground">{atv.timeHours}h</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {atv.cargosPermitidos.length === 0 ?
                    <span className="text-[10px] text-status-danger flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-status-danger-muted border border-status-danger/20">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Sem cargo
                                </span> :
                    atv.cargosPermitidos.map((cid) => {
                      const c = getCargoById(cid);
                      return c && <CargoBadge key={c.id}>{c.code}</CargoBadge>;
                    })}
                            </div>
                          </div>
                )}
                      </div>
              }
                  </div>
            )}
              </div>
            </div>
        )}
        </div>
      }


      {/* Dialog: Novo / Editar Cargo */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {if (!open) {setDialogOpen(false);setEditingCargo(null);}}}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCargo ? "Editar Cargo" : "Novo Cargo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Código</label>
              <input value={form.code} readOnly disabled className="w-full border border-input rounded-lg text-sm p-2.5 bg-muted mt-1.5 font-data cursor-not-allowed opacity-70" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Nome do Cargo</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-input rounded-lg text-sm p-2.5 bg-card mt-1.5 focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: Fisioterapeuta Ocupacional" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(CARGO_CATEGORY_LABELS) as [Cargo["category"], string][]).map(([key, label]) =>
                <button key={key} type="button" onClick={() => handleCategoryChange(key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] border transition-colors font-medium ${form.category === key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-accent'}`}>
                    {label}
                  </button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => {setDialogOpen(false);setEditingCargo(null);}} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Cancelar</button>
            <button onClick={handleSave} disabled={!form.name || !form.code} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {editingCargo ? "Salvar" : "Criar Cargo"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}

// --- Cargo Detail Panel ---
function CargoDetail({ cargo, onToggle, onEdit, navigate }: {cargo: Cargo;onToggle: () => void;onEdit: () => void;navigate: (path: string) => void;}) {
  const pessoasVinculadas = RECURSOS.filter((r) => r.cargoId === cargo.id);
  const atividadesVinculadas = ATIVIDADES.filter((a) => a.cargosPermitidos.includes(cargo.id));
  const history = getHistoryForEntity("cargo", cargo.id);

  return (
    <TabbedDetail
      dados={
      <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Código</span><span className="font-data">{cargo.code}</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Categoria</span><span>{CARGO_CATEGORY_LABELS[cargo.category]}</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Status</span>{cargo.status === "ativo" ? <StatusBadge variant="success">Ativo</StatusBadge> : <StatusBadge variant="danger">Inativo</StatusBadge>}</div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Criado em</span><span className="font-data">{cargo.createdAt}</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Atualizado em</span><span className="font-data">{cargo.updatedAt}</span></div>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pessoas vinculadas ({pessoasVinculadas.length})</p>
            {pessoasVinculadas.length === 0 ?
          <p className="text-[11px] text-muted-foreground italic">Nenhuma pessoa com este cargo</p> :
          pessoasVinculadas.map((r) =>
          <div key={r.id} className="flex items-center justify-between py-1 text-[12px]">
                <span className="text-foreground">{r.name}</span>
                <span className="text-[11px] text-muted-foreground">{r.uo}</span>
              </div>
          )}
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Atividades que permitem este cargo ({atividadesVinculadas.length})</p>
            {atividadesVinculadas.length === 0 ?
          <p className="text-[11px] text-muted-foreground italic">Nenhuma atividade configurada</p> :
          atividadesVinculadas.map((a) =>
          <div key={a.id} className="flex items-center justify-between py-1 text-[12px] pl-2 border-l-2 border-primary/15">
                <span className="text-foreground">{a.name}</span>
                <span className="font-data text-muted-foreground">{a.timeHours}h</span>
              </div>
          )}
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
            <Edit2 className="w-4 h-4" /> Editar Cargo
          </button>
          <button onClick={onToggle} className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${cargo.status === "ativo" ? 'border border-status-danger/30 text-status-danger hover:bg-status-danger-muted' : 'bg-status-success text-status-success-foreground hover:opacity-90'}`}>
            {cargo.status === "ativo" ? "Inativar Cargo" : "Reativar Cargo"}
          </button>
        </div>
      } />);


}