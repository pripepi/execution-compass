import React, { useState } from "react";
import { PageHeader, StatusBadge, ValidarBadge, CargoBadge, PessoaBadge } from "@/components/ui-custom/StatusBadge";
import { useDetailPanel } from "@/contexts/DetailPanelContext";
import { ActivityTimeline } from "@/components/ui-custom/ActivityTimeline";
import { TabbedDetail } from "@/components/DetailPanel";
import { Plus, ChevronRight, Layers, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ALOCACOES, RECURSOS, SERVICOS, CONTRATOS, CARGOS, getCargoById, getRecursosElegiveisParaServico, getCargosPermitidosByServico, Alocacao } from "@/data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type FilterTab = "todos" | "pendentes" | "alocados";

export default function AlocacaoPage() {
  const navigate = useNavigate();
  const { openPanel } = useDetailPanel();
  const [tab, setTab] = useState<FilterTab>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alocacoes, setAlocacoes] = useState(ALOCACOES);
  const [selectedContract, setSelectedContract] = useState(CONTRATOS[0].id);
  const [selectedService, setSelectedService] = useState("");
  const [selectedResource, setSelectedResource] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("Serviço");

  // Get services available for selected contract
  const contractObj = CONTRATOS.find(c => c.id === selectedContract);
  const availableServices = SERVICOS.filter(s => contractObj?.services.includes(s.id));

  // Get eligible resources for selected service
  const serviceObj = SERVICOS.find(s => s.id === selectedService);
  const eligibleResources = selectedService ? getRecursosElegiveisParaServico(selectedService).filter(r => r.status === "ativo") : [];

  const filtered = alocacoes.filter(a => {
    if (tab === "pendentes") return a.status === "pendente";
    if (tab === "alocados") return a.status === "alocado";
    return true;
  });

  const handleCreate = () => {
    const resource = RECURSOS.find(r => r.id === selectedResource);
    if (!resource || !serviceObj) return;
    const newAlloc: Alocacao = {
      id: `al-${Date.now()}`,
      contractCode: contractObj?.code || "",
      contractId: selectedContract,
      serviceId: selectedService,
      service: serviceObj.name,
      resource: resource.name,
      resourceId: resource.id,
      cargoId: resource.cargoId,
      level: selectedLevel,
      status: "alocado",
      hoursAllocated: 0,
    };
    setAlocacoes([newAlloc, ...alocacoes]);
    setDialogOpen(false);
    toast.success("Alocação confirmada", { description: `${resource.name} → ${serviceObj.name}` });
  };

  const handleConfirmAlocacao = (a: Alocacao) => {
    const eligible = getRecursosElegiveisParaServico(a.serviceId).filter(r => r.status === "ativo");
    if (eligible.length === 0) {
      toast.error("Nenhum recurso elegível disponível para este serviço");
      return;
    }
    setAlocacoes(prev => prev.map(item => item.id === a.id ? {
      ...item, status: "alocado" as const, resource: eligible[0].name, resourceId: eligible[0].id, level: "Serviço"
    } : item));
    toast.success("Recurso alocado com sucesso", { description: `${eligible[0].name} (${eligible[0].role})` });
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "pendentes", label: "Pendentes" },
    { key: "alocados", label: "Alocados" },
  ];

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Alocação de Recursos"
        description="Vincule pessoas com cargo elegível aos serviços de cada contrato"
        actions={
          <button onClick={() => setDialogOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Nova Alocação
          </button>
        }
      />

      <div className="bg-muted/50 border border-border rounded-md p-3 mb-4 flex items-start gap-2">
        <Layers className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-foreground">Fluxo de alocação</p>
          <p className="text-xs text-muted-foreground">
            Contrato → Serviço → <strong>Cargo elegível</strong> → Pessoa disponível com cargo compatível → Alocação no nível de serviço ou entrega.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${tab === t.key ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-accent'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Contrato</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Serviço</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Cargo Elegível</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Recurso</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Nível</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((a) => {
              const cargo = getCargoById(a.cargoId);
              return (
                <tr key={a.id} className="hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => openPanel("Detalhes da Alocação", (
                    <AlocacaoDetail alloc={a} onConfirm={handleConfirmAlocacao} />
                  ))}>
                  <td className="px-4 py-3 font-data text-xs">{a.contractCode}</td>
                  <td className="px-4 py-3 font-medium text-foreground text-sm">{a.service}</td>
                  <td className="px-4 py-3 text-xs">
                    <CargoBadge>{cargo?.name || "—"}</CargoBadge>
                  </td>
                  <td className="px-4 py-3 text-xs">{a.resource !== "—" ? <PessoaBadge>{a.resource}</PessoaBadge> : <span className="text-muted-foreground italic">Aguardando</span>}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{a.level}</td>
                  <td className="px-4 py-3">
                    {a.status === "alocado" ? <StatusBadge variant="success">Alocado</StatusBadge> : <StatusBadge variant="warning">Pendente</StatusBadge>}
                  </td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      <div className="mt-4 space-y-2">
        <ValidarBadge>Fluxo de mobilidade: recurso fora da UO gera solicitação automática?</ValidarBadge>
        <br />
        <ValidarBadge>Alocação a nível de entrega ou serviço — regras de escalonamento</ValidarBadge>
      </div>

      {/* Dialog: Nova Alocação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Alocação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Contrato</label>
              <select value={selectedContract} onChange={e => { setSelectedContract(e.target.value); setSelectedService(""); setSelectedResource(""); }}
                className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1">
                {CONTRATOS.map(c => <option key={c.id} value={c.id}>{c.code} - {c.client}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Serviço</label>
              <select value={selectedService} onChange={e => { setSelectedService(e.target.value); setSelectedResource(""); }}
                className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1">
                <option value="">Selecionar serviço...</option>
                {availableServices.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
              {selectedService && serviceObj && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted-foreground">Cargos permitidos:</span>
                  {getCargosPermitidosByServico(selectedService).map(c => (
                    <span key={c.id} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{c.name}</span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Recurso (cargo compatível e disponível)</label>
              <select value={selectedResource} onChange={e => setSelectedResource(e.target.value)}
                className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1" disabled={!selectedService}>
                <option value="">Selecionar recurso...</option>
                {eligibleResources.map(r => <option key={r.id} value={r.id}>{r.name} - {r.role} ({r.uo})</option>)}
              </select>
              {selectedService && eligibleResources.length === 0 && (
                <p className="text-[10px] text-status-danger mt-1">Nenhum recurso disponível com cargo elegível para este serviço</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nível de alocação</label>
              <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}
                className="w-full border border-input rounded-md text-sm p-2 bg-background mt-1">
                <option>Serviço</option><option>Entrega</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setDialogOpen(false)} className="px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent">Cancelar</button>
            <button onClick={handleCreate} disabled={!selectedResource || !selectedService}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">Confirmar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlocacaoDetail({ alloc, onConfirm }: { alloc: Alocacao; onConfirm: (a: Alocacao) => void }) {
  const cargo = getCargoById(alloc.cargoId);
  const eligible = getRecursosElegiveisParaServico(alloc.serviceId).filter(r => r.status === "ativo");

  return (
    <TabbedDetail
      dados={
        <div className="space-y-2">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Contrato</span><span className="font-data">{alloc.contractCode}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Serviço</span><span>{alloc.service}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Cargo elegível</span><span className="text-primary">{cargo?.name || "—"}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Recurso</span><span className={alloc.resource === "—" ? "italic text-muted-foreground" : "font-medium"}>{alloc.resource === "—" ? "Aguardando" : alloc.resource}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Nível</span><span>{alloc.level}</span></div>
          <hr className="border-border" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1"><Users className="w-3 h-3" /> Recursos elegíveis disponíveis</p>
          {eligible.length > 0 ? eligible.map(r => (
            <div key={r.id} className="flex items-center justify-between text-xs pl-2 border-l-2 border-primary/20 py-0.5">
              <span className="font-medium text-foreground">{r.name}</span>
              <span className="text-muted-foreground">{r.role} · {r.uo}</span>
            </div>
          )) : <p className="text-xs text-status-danger italic">Nenhum recurso elegível disponível</p>}
        </div>
      }
      timeline={
        <ActivityTimeline events={[
          { id: "1", type: "allocation", title: "Alocação criada", description: alloc.resource !== "—" ? `${alloc.resource} alocado` : "Aguardando alocação", user: "Sistema", timestamp: "05/03/2026" },
        ]} />
      }
      acoes={alloc.status === "pendente" ? (
        <div className="space-y-2">
          <button onClick={() => onConfirm(alloc)} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">
            Alocar Primeiro Elegível
          </button>
          <p className="text-[10px] text-muted-foreground">Aloca automaticamente o primeiro recurso disponível com cargo compatível.</p>
        </div>
      ) : undefined}
    />
  );
}
