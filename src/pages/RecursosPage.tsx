import React, { useState } from "react";
import { PageHeader, StatusBadge, ValidarBadge, CargoBadge, PessoaBadge } from "@/components/ui-custom/StatusBadge";
import { useDetailPanel } from "@/contexts/DetailPanelContext";
import { ActivityTimeline } from "@/components/ui-custom/ActivityTimeline";
import { TabbedDetail } from "@/components/DetailPanel";
import { Search, ChevronRight, Plus, Users, Briefcase, Pencil } from "lucide-react";
import { RECURSOS, CARGOS, getCargoById, ALOCACOES, getCapacidadeUO, UOS, Recurso, USUARIOS, PROFICIENCIAS } from "@/data/mockData";
import { useProfile } from "@/contexts/ProfileContext";
import { DataCard } from "@/components/ui-custom/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const selectClassName = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// ---- Resource Form (shared for create & edit) ----
interface ResourceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: Recurso | null; // null = create mode
}

function ResourceFormDialog({ open, onOpenChange, resource }: ResourceFormProps) {
  const isEdit = !!resource;

  const [usuarioId, setUsuarioId] = useState(resource?.usuarioId ?? "");
  const [role, setRole] = useState(resource?.role ?? "");
  const [cargoId, setCargoId] = useState(resource?.cargoId ?? CARGOS[0]?.id ?? "");
  const [uo, setUo] = useState(resource?.uo ?? UOS[0]?.name ?? "");
  const [hoursMonthly, setHoursMonthly] = useState(String(resource?.hoursMonthly ?? "160"));
  const [mobility, setMobility] = useState(resource?.mobility ?? false);
  const [status, setStatus] = useState<Recurso["status"]>(resource?.status ?? "ativo");
  const [tipoProfissional, setTipoProfissional] = useState<Recurso["tipoProfissional"]>(resource?.tipoProfissional ?? "proprio");
  const [selectedProficiencias, setSelectedProficiencias] = useState<string[]>(resource?.atribuicoes ?? []);

  // Reset form when resource changes
  React.useEffect(() => {
    if (open) {
      setUsuarioId(resource?.usuarioId ?? "");
      setRole(resource?.role ?? "");
      setCargoId(resource?.cargoId ?? CARGOS[0]?.id ?? "");
      setUo(resource?.uo ?? UOS[0]?.name ?? "");
      setHoursMonthly(String(resource?.hoursMonthly ?? "160"));
      setMobility(resource?.mobility ?? false);
      setStatus(resource?.status ?? "ativo");
      setTipoProfissional(resource?.tipoProfissional ?? "proprio");
      setSelectedProficiencias(resource?.atribuicoes ?? []);
    }
  }, [open, resource]);

  const handleProficienciaToggle = (prof: string) => {
    setSelectedProficiencias(prev =>
      prev.includes(prof) ? prev.filter(p => p !== prof) : [...prev, prof]
    );
  };

  const handleSave = () => {
    // Mock save — in production this would persist
    onOpenChange(false);
  };

  // Users already linked to a resource (except current editing)
  const usedUsuarioIds = RECURSOS.filter(r => !resource || r.id !== resource.id).map(r => r.usuarioId);
  const availableUsuarios = USUARIOS.filter(u => u.status === "ativo" && !usedUsuarioIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Recurso" : "Incluir Recurso"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Nome recurso — select de usuários */}
          <div className="space-y-1.5">
            <Label htmlFor="rf-usuario" className="text-xs">Nome recurso</Label>
            <select id="rf-usuario" value={usuarioId} onChange={e => setUsuarioId(e.target.value)} className={selectClassName}>
              <option value="">Selecionar usuário...</option>
              {availableUsuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              {/* If editing, always show current user even if not in available list */}
              {isEdit && resource?.usuarioId && !availableUsuarios.find(u => u.id === resource.usuarioId) && (
                <option value={resource.usuarioId}>{resource.name}</option>
              )}
            </select>
            {availableUsuarios.length === 0 && !isEdit && (
              <p className="text-[10px] text-muted-foreground">Nenhum usuário disponível para vincular.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Cargo */}
            <div className="space-y-1.5">
              <Label htmlFor="rf-cargo" className="text-xs">Cargo</Label>
              <select id="rf-cargo" value={cargoId} onChange={e => setCargoId(e.target.value)} className={selectClassName}>
                {CARGOS.filter(c => c.status === "ativo").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {/* Função / Papel */}
            <div className="space-y-1.5">
              <Label htmlFor="rf-role" className="text-xs">Função / Papel</Label>
              <Input id="rf-role" value={role} onChange={e => setRole(e.target.value)} placeholder="Ex: Engenheiro de Segurança" />
            </div>
          </div>

          {/* Proficiências — logo abaixo do Cargo */}
          <div className="space-y-1.5">
            <Label className="text-xs">Proficiências</Label>
            <div className="flex flex-wrap gap-2 p-2 border border-input rounded-md bg-background max-h-28 overflow-y-auto">
              {PROFICIENCIAS.map(prof => (
                <label key={prof} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={selectedProficiencias.includes(prof)}
                    onCheckedChange={() => handleProficienciaToggle(prof)}
                  />
                  {prof}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* UO */}
            <div className="space-y-1.5">
              <Label htmlFor="rf-uo" className="text-xs">UO</Label>
              <select id="rf-uo" value={uo} onChange={e => setUo(e.target.value)} className={selectClassName}>
                {UOS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            {/* Capacidade Mensal */}
            <div className="space-y-1.5">
              <Label htmlFor="rf-hours" className="text-xs">Capacidade Mensal (h)</Label>
              <Input id="rf-hours" type="number" value={hoursMonthly} onChange={e => setHoursMonthly(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo Profissional */}
            <div className="space-y-1.5">
              <Label htmlFor="rf-tipo" className="text-xs">Tipo profissional</Label>
              <select id="rf-tipo" value={tipoProfissional} onChange={e => setTipoProfissional(e.target.value as Recurso["tipoProfissional"])} className={selectClassName}>
                <option value="proprio">Próprio</option>
                <option value="terceiro">Terceiro</option>
              </select>
            </div>
            {/* Elegível Mobilidade */}
            <div className="space-y-1.5">
              <Label htmlFor="rf-mobility" className="text-xs">Elegível Mobilidade</Label>
              <select id="rf-mobility" value={mobility ? "sim" : "nao"} onChange={e => setMobility(e.target.value === "sim")} className={selectClassName}>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="rf-status" className="text-xs">Status</Label>
            <select id="rf-status" value={status} onChange={e => setStatus(e.target.value as Recurso["status"])} className={selectClassName}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>{isEdit ? "Salvar" : "Incluir"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RecursosPage() {
  const { openPanel } = useDetailPanel();
  const { currentProfile } = useProfile();
  const isUO = currentProfile.role === "backoffice_uo";
  const isCoordenador = currentProfile.role === "coordenador";
  const [search, setSearch] = useState("");
  const [cargoFilter, setCargoFilter] = useState("todos");

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Recurso | null>(null);

  const handleIncluir = () => {
    setEditingResource(null);
    setFormOpen(true);
  };

  const handleEditar = (resource: Recurso) => {
    setEditingResource(resource);
    setFormOpen(true);
  };

  const filtered = RECURSOS.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.role.toLowerCase().includes(search.toLowerCase());
    const matchCargo = cargoFilter === "todos" || r.cargoId === cargoFilter;
    const matchUO = isUO ? r.uo === "UO Caxias do Sul" : true;
    return matchSearch && matchCargo && matchUO;
  });

  // UO capacity cards
  const uoCapacities = isUO
    ? [getCapacidadeUO("UO Caxias do Sul")]
    : UOS.slice(0, 3).map(u => getCapacidadeUO(u.name));

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={isUO ? "Recursos da UO" : isCoordenador ? "Recursos e Capacidade" : "Gestão de Recursos"}
        description={isUO ? "Vincule pessoas a cargos e gerencie a capacidade local" : "Visualize e gerencie os recursos operacionais, cargos e atribuições"}
        actions={(isCoordenador || isUO) ? (
          <Button size="sm" onClick={handleIncluir}>
            <Plus className="w-4 h-4" />
            {isUO ? "Novo Recurso" : "Incluir"}
          </Button>
        ) : undefined}
      />

      {/* Capacity cards */}
      {isUO ? (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <DataCard label="Recursos na UO" value={uoCapacities[0].resources} />
          <DataCard label="Capacidade total" value={`${uoCapacities[0].total}h`} />
          <DataCard label="Horas alocadas" value={`${uoCapacities[0].allocated}h`} variant="warning" />
          <DataCard label="Horas disponíveis" value={`${uoCapacities[0].available}h`} variant="success" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-4">
          {UOS.slice(0, 3).map((u, i) => {
            const cap = getCapacidadeUO(u.name);
            const pct = cap.total > 0 ? Math.round((cap.allocated / cap.total) * 100) : 0;
            return (
              <div key={u.id} className="bg-card border border-border rounded-md p-3">
                <p className="text-xs text-muted-foreground">{u.name}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-semibold font-data text-foreground">{cap.resources}</span>
                  <span className="text-xs text-muted-foreground">recursos · {pct}% ocupado</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full mt-2">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar recursos..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-input rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={cargoFilter} onChange={e => setCargoFilter(e.target.value)}
          className="border border-input rounded-md text-xs p-2 bg-background">
          <option value="todos">Todos os cargos</option>
          {CARGOS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Recurso</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Cargo</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tipo</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">UO</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Proficiências</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Cap. Mensal</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Mobilidade</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => {
              const cargo = getCargoById(r.cargoId);
              return (
                <tr key={r.id} className="hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => openPanel(`Recurso: ${r.name}`, <ResourceDetail resource={r} isCoordenador={isCoordenador || isUO} onEditar={() => handleEditar(r)} />)}>
                  <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-3 text-xs">
                    <CargoBadge>{cargo?.name || r.role}</CargoBadge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.tipoProfissional === "proprio" ? <StatusBadge variant="info">Próprio</StatusBadge> : <StatusBadge variant="warning">Terceiro</StatusBadge>}
                  </td>
                  <td className="px-4 py-3 text-xs">{r.uo}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {r.atribuicoes.slice(0, 2).map(a => <span key={a} className="px-1.5 py-0.5 bg-muted rounded text-[10px]">{a}</span>)}
                      {r.atribuicoes.length > 2 && <span className="text-[10px] text-muted-foreground">+{r.atribuicoes.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-data text-xs">{r.hoursMonthly}h</td>
                  <td className="px-4 py-3 text-center">{r.mobility ? <StatusBadge variant="success">Sim</StatusBadge> : <StatusBadge variant="info">Não</StatusBadge>}</td>
                  <td className="px-4 py-3">
                    {r.status === "ativo" && <StatusBadge variant="success">Ativo</StatusBadge>}
                    {r.status === "inativo" && <StatusBadge variant="danger">Inativo</StatusBadge>}
                  </td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2">
        <ValidarBadge>Um recurso pode ter mais de um cargo? Ou cargo é fixo por vínculo?</ValidarBadge>
        <br />
        <ValidarBadge>BackOffice UO vincula pessoa ao cargo — Gestão Corporativa (DR) define quais cargos existem</ValidarBadge>
      </div>

      {/* Resource form dialog — Coordenador only */}
      {(isCoordenador || isUO) && (
        <ResourceFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          resource={editingResource}
        />
      )}
    </div>
  );
}

function ResourceDetail({ resource, isCoordenador, onEditar }: { resource: typeof RECURSOS[0]; isCoordenador: boolean; onEditar: () => void }) {
  const cargo = getCargoById(resource.cargoId);
  const alocacoes = ALOCACOES.filter(a => a.resourceId === resource.id);

  return (
    <TabbedDetail
      dados={
        <div className="space-y-2">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Nome</span><span className="font-medium">{resource.name}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Cargo</span><span className="text-primary">{cargo?.name || resource.role}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Código cargo</span><span className="font-data">{cargo?.code || "—"}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Tipo profissional</span><span>{resource.tipoProfissional === "proprio" ? "Próprio" : "Terceiro"}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">UO</span><span>{resource.uo}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Capacidade mensal</span><span className="font-data">{resource.hoursMonthly}h</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Elegível mobilidade</span><span>{resource.mobility ? "Sim" : "Não"}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Status</span><span>{resource.status === "ativo" ? "Ativo" : "Inativo"}</span></div>
          <hr className="border-border" />
          <p className="text-xs font-medium text-foreground mb-1">Proficiências</p>
          <div className="flex flex-wrap gap-1">
            {resource.atribuicoes.map(a => <span key={a} className="text-xs px-2 py-0.5 bg-muted rounded">{a}</span>)}
          </div>
          {alocacoes.length > 0 && (
            <>
              <hr className="border-border" />
              <p className="text-xs font-medium text-foreground mb-1">Alocações Ativas</p>
              {alocacoes.map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs pl-2 border-l-2 border-primary/20 py-0.5">
                  <span>{a.service}</span>
                  <span className="font-data text-muted-foreground">{a.contractCode}</span>
                </div>
              ))}
            </>
          )}
        </div>
      }
      timeline={
        <ActivityTimeline events={[
          { id: "1", type: "allocation", title: "Alocado ao serviço SST-001", description: "Contrato #1024", user: "Facilitador", timestamp: "05/03/2026" },
          { id: "2", type: "mobility", title: "Mobilidade aprovada", description: `UO Canoas → ${resource.uo}`, user: "Sistema", timestamp: "01/03/2026" },
        ]} />
      }
      acoes={
        isCoordenador ? (
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onEditar}>
              <Pencil className="w-3.5 h-3.5" />
              Editar recurso
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
