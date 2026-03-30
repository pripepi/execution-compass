import React, { useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { PageHeader, StatusBadge, ValidarBadge } from "@/components/ui-custom/StatusBadge";
import { Plus, CalendarOff, Pencil, Trash2 } from "lucide-react";
import { INDISPONIBILIDADES_CORPORATIVAS, IndisponibilidadeCorporativa } from "@/data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type StatusFilter = "todos" | "Ativo" | "Inativo";

export default function IndisponibilidadesCorporativasPage() {
  const { currentProfile } = useProfile();
  const usePurple = currentProfile.role === "backoffice_dr" || currentProfile.role === "coordenador";
  const [items, setItems] = useState<IndisponibilidadeCorporativa[]>(INDISPONIBILIDADES_CORPORATIVAS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<IndisponibilidadeCorporativa | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const emptyForm: Omit<IndisponibilidadeCorporativa, "id"> = {
    nome: "", data: "", tipo: "Feriado Nacional", escopo: "Brasil",
    status: "Ativo", recorrente: false, anoReferencia: 2026, observacao: ""
  };
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter((i) => statusFilter === "todos" || i.status === statusFilter);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: IndisponibilidadeCorporativa) => {
    setEditItem(item);
    setForm({ nome: item.nome, data: item.data, tipo: item.tipo, escopo: item.escopo, status: item.status, recorrente: item.recorrente, anoReferencia: item.anoReferencia, observacao: item.observacao });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.data) {
      toast.error("Preencha os campos obrigatórios", { description: "Nome e Data são obrigatórios." });
      return;
    }
    if (editItem) {
      setItems(items.map((i) => i.id === editItem.id ? { ...i, ...form } : i));
      toast.success("Indisponibilidade atualizada", { description: form.nome });
    } else {
      const newItem: IndisponibilidadeCorporativa = { id: `ic-${Date.now()}`, ...form };
      setItems([newItem, ...items]);
      toast.success("Indisponibilidade cadastrada", { description: form.nome });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const item = items.find((i) => i.id === id);
    setItems(items.filter((i) => i.id !== id));
    setDeleteConfirm(null);
    toast.success("Indisponibilidade removida", { description: item?.nome });
  };

  const tabs: {key: StatusFilter;label: string;}[] = [
  { key: "todos", label: "Todos" },
  { key: "Ativo", label: "Ativos" },
  { key: "Inativo", label: "Inativos" }];


  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Indisponibilidades"
        description="Gerencie indisponibilidades corporativas e feriados nacionais aplicáveis em nível Brasil"
        actions={
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 bg-sidebar-primary">
            <Plus className="w-4 h-4" /> Nova Indisponibilidade
          </button>
        } />
      

      





      

      <div className="flex gap-2 mb-4">
        {tabs.map((t) =>
        <button key={t.key} onClick={() => setStatusFilter(t.key)}
        className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${statusFilter === t.key ? (usePurple ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'bg-primary text-primary-foreground') : 'border border-border text-foreground hover:bg-accent'}`}>
            {t.label}
          </button>
        )}
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Data</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tipo</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Escopo</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Ano</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 &&
            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Nenhuma indisponibilidade encontrada.</td></tr>
            }
            {filtered.map((i) =>
            <tr key={i.id} className="hover:bg-accent/50 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{i.nome}</td>
                <td className="px-4 py-3 font-data text-xs">{i.data}</td>
                <td className="px-4 py-3 text-xs">{i.tipo}</td>
                <td className="px-4 py-3 text-xs">{i.escopo}</td>
                <td className="px-4 py-3">
                  <StatusBadge variant={i.status === "Ativo" ? "success" : "info"}>{i.status}</StatusBadge>
                </td>
                <td className="px-4 py-3 font-data text-xs">{i.anoReferencia}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(i)} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Editar">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => setDeleteConfirm(i.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <ValidarBadge>Feriados nacionais sincronizados para o ano de referência 2026</ValidarBadge>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Editar Indisponibilidade" : "Nova Indisponibilidade"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome *</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1" placeholder="Ex: Feriado Nacional" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data *</label>
              <input type="date" value={form.data.split("/").reverse().join("-")} onChange={(e) => {const v = e.target.value;const parts = v.split("-");setForm({ ...form, data: `${parts[2]}/${parts[1]}/${parts[0]}` });}} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1 font-data" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1">
                <option>Feriado Nacional</option>
                <option>Recesso Corporativo</option>
                <option>Evento Institucional</option>
                <option>Outro</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Escopo</label>
              <select value={form.escopo} onChange={(e) => setForm({ ...form, escopo: e.target.value })} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1">
                <option>Brasil</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "Ativo" | "Inativo" })} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1">
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Observação</label>
              <input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1" placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setDialogOpen(false)} className="px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">{editItem ? "Salvar" : "Cadastrar"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja remover esta indisponibilidade? Essa ação não pode ser desfeita.</p>
          <DialogFooter>
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent">Cancelar</button>
            <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:opacity-90">Excluir</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}