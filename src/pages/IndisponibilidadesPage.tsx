import React, { useState } from "react";
import { PageHeader, StatusBadge, ValidarBadge } from "@/components/ui-custom/StatusBadge";
import { Plus, CalendarOff, AlertTriangle, Pencil } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { INDISPONIBILIDADES, RECURSOS, UOS } from "@/data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDetailPanel } from "@/contexts/DetailPanelContext";
import { TabbedDetail } from "@/components/DetailPanel";
import { ActivityTimeline } from "@/components/ui-custom/ActivityTimeline";
import { Button } from "@/components/ui/button";

type ScopeFilter = "todos" | "individual" | "uo";

interface IndispItem {
  id: string;
  resource: string;
  type: string;
  startDate: string;
  endDate: string;
  uo: string;
  hours: string;
  scope: string;
}

export default function IndisponibilidadesPage() {
  const { currentProfile } = useProfile();
  const { openPanel } = useDetailPanel();
  const isUO = currentProfile.role === "backoffice_uo";
  const isTecnico = currentProfile.role === "tecnico";
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("todos");
  const [items, setItems] = useState(INDISPONIBILIDADES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IndispItem | null>(null);
  const [form, setForm] = useState({
    resource: isTecnico ? "Carlos Silva" : RECURSOS[0].name,
    type: "Férias",
    startDate: "",
    endDate: "",
    hours: "",
    scope: isTecnico ? "Individual" as "Individual" | "UO" : "Individual" as "Individual" | "UO",
    uo: UOS[0].name
  });

  const filtered = items.filter((i) => {
    if (isTecnico) return i.resource === "Carlos Silva";
    if (scopeFilter === "individual") return i.scope === "Individual";
    if (scopeFilter === "uo") return i.scope === "UO";
    return true;
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm({
      resource: isTecnico ? "Carlos Silva" : RECURSOS[0].name,
      type: "Férias",
      startDate: "",
      endDate: "",
      hours: "",
      scope: isTecnico ? "Individual" : "Individual",
      uo: UOS[0].name
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: IndispItem) => {
    setEditingItem(item);
    setForm({
      resource: item.resource,
      type: item.type,
      startDate: item.startDate,
      endDate: item.endDate,
      hours: item.hours,
      scope: item.scope as "Individual" | "UO",
      uo: item.uo
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingItem) {
      setItems((prev) => prev.map((it) => it.id === editingItem.id ? {
        ...it,
        resource: form.scope === "UO" ? `Todos - ${form.uo}` : form.resource,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        uo: form.uo,
        hours: form.hours,
        scope: form.scope
      } : it));
      setDialogOpen(false);
      toast.success("Indisponibilidade atualizada");
    } else {
      const newItem = {
        id: `in-${Date.now()}`,
        resource: form.scope === "UO" ? `Todos - ${form.uo}` : form.resource,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        uo: form.uo,
        hours: form.hours,
        scope: form.scope
      };
      setItems([newItem, ...items]);
      setDialogOpen(false);
      toast.success("Indisponibilidade registrada", { description: `${newItem.resource} - ${newItem.type}` });
    }
  };

  const handleRowClick = (item: IndispItem) => {
    if (isTecnico) {
      openPanel(`Indisponibilidade: ${item.type}`,
      <IndispDetail item={item} onEditar={() => openEditDialog(item)} />
      );
    }
  };

  const tabs: {key: ScopeFilter;label: string;}[] = [
  { key: "todos", label: "Todos" },
  { key: "individual", label: "Individual" },
  { key: "uo", label: "Por UO" }];


  const tipoOptions = isTecnico ?
  ["Férias", "Reunião", "Evento", "Atestado"] :
  ["Férias", "Reunião", "Feriado Municipal", "Evento", "Atestado"];

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Indisponibilidades"
        description={isUO ? "Registre indisponibilidades por UO (dia e unidade operacional)" : "Registre e visualize períodos de indisponibilidade dos recursos"}
        actions={
        <button onClick={openCreateDialog} className="flex items-center gap-2 px-4 py-2 text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 bg-sidebar">
            <Plus className="w-4 h-4" /> {isUO ? "Indisponibilidade por UO" : "Nova Indisponibilidade"}
          </button>
        } />
      

      





      

      {!isTecnico &&
      <div className="flex gap-2 mb-4">
          {tabs.map((t) =>
        <button key={t.key} onClick={() => setScopeFilter(t.key)}
        className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${scopeFilter === t.key ? (currentProfile.role === "coordenador" || currentProfile.role === "backoffice_uo" ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'bg-primary text-primary-foreground') : 'border border-border text-foreground hover:bg-accent'}`}>
              {t.label}
            </button>
        )}
        </div>
      }

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Recurso</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tipo</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Início</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Fim</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">UO</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Horas</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Escopo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((i) =>
            <tr key={i.id} className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => handleRowClick(i)}>
                <td className="px-4 py-3 font-medium text-foreground">{i.resource}</td>
                <td className="px-4 py-3 text-xs">{i.type}</td>
                <td className="px-4 py-3 font-data text-xs">{i.startDate}</td>
                <td className="px-4 py-3 font-data text-xs">{i.endDate}</td>
                <td className="px-4 py-3 text-xs">{i.uo}</td>
                <td className="px-4 py-3 text-right font-data">{i.hours}</td>
                <td className="px-4 py-3">
                  {i.scope === "UO" ?
                <span className="inline-flex items-center gap-1">
                      <StatusBadge variant="warning">UO</StatusBadge>
                      <AlertTriangle className="w-3 h-3 text-status-warning" />
                    </span> :
                <StatusBadge variant="info">Individual</StatusBadge>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <ValidarBadge>Integração com Agenda MV para bloqueio automático de horários</ValidarBadge>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? "Editar Indisponibilidade" : isUO ? "Indisponibilidade por UO" : "Nova Indisponibilidade"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Escopo</label>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as "Individual" | "UO" })} disabled={isTecnico} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1 disabled:opacity-60 disabled:cursor-not-allowed">
                <option value="Individual">Individual</option>
                <option value="UO">Por UO</option>
              </select>
            </div>
            {form.scope === "Individual" ?
            <div>
                <label className="text-xs text-muted-foreground">Recurso</label>
                <select value={form.resource} onChange={(e) => setForm({ ...form, resource: e.target.value })} disabled={isTecnico} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1 disabled:opacity-60 disabled:cursor-not-allowed">
                  {isTecnico ? <option>Carlos Silva</option> : RECURSOS.map((r) => <option key={r.id}>{r.name}</option>)}
                </select>
              </div> :

            <div>
                <label className="text-xs text-muted-foreground">UO</label>
                <select value={form.uo} onChange={(e) => setForm({ ...form, uo: e.target.value })} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1">
                  {UOS.map((u) => <option key={u.id}>{u.name}</option>)}
                </select>
                <p className="text-[10px] text-status-warning mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Afeta todos os recursos da unidade</p>
              </div>
            }
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1">
                {tipoOptions.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Data início</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1 font-data" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data fim</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1 font-data" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Horas</label>
              <input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1 font-data" placeholder="8h" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setDialogOpen(false)} className="px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">{editingItem ? "Salvar" : "Registrar"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}

function IndispDetail({ item, onEditar }: {item: IndispItem;onEditar: () => void;}) {
  return (
    <TabbedDetail
      dados={
      <div className="space-y-2">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Recurso</span><span className="font-medium">{item.resource}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Tipo</span><span>{item.type}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Início</span><span className="font-data">{item.startDate}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Fim</span><span className="font-data">{item.endDate}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">UO</span><span>{item.uo}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Horas</span><span className="font-data">{item.hours}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Escopo</span><span>{item.scope}</span></div>
        </div>
      }
      timeline={
      <ActivityTimeline events={[
      { id: "1", type: "status", title: "Indisponibilidade registrada", description: `${item.type} — ${item.resource}`, user: "Sistema", timestamp: item.startDate }]
      } />
      }
      acoes={
      <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onEditar}>
            <Pencil className="w-3.5 h-3.5" />
            Editar registro
          </Button>
        </div>
      } />);


}