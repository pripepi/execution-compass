import React, { useState } from "react";
import { PageHeader, StatusBadge, ValidarBadge, DataCard, CargoBadge } from "@/components/ui-custom/StatusBadge";
import {
  Plus, ChevronRight, Package, Layers, Activity, FileText, MessageSquare,
  AlertTriangle, Shield, Users, ExternalLink, ArrowRight
} from "lucide-react";
import { useDetailPanel } from "@/contexts/DetailPanelContext";
import { TabbedDetail } from "@/components/DetailPanel";
import { useNavigate } from "react-router-dom";
import { TERCEIROS, SERVICOS, CONTRATOS, ATIVIDADES, ENTREGAS, getCargoById, getAtividadesByEntrega, getEntregasByServico, Terceiro } from "@/data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type FilterTab = "todos" | "pendentes" | "aprovadas" | "em_contratacao";

const origemLabels: Record<Terceiro["origem"], { label: string; variant: "warning" | "danger" | "info" }> = {
  sem_capacidade: { label: "Sem capacidade interna", variant: "info" },
  mobilidade_rejeitada: { label: "Mobilidade rejeitada", variant: "danger" },
  sobrecarga: { label: "Sobrecarga interna", variant: "warning" },
};

export default function TerceirosPage() {
  const { openPanel } = useDetailPanel();
  const navigate = useNavigate();
  const [terceiros, setTerceiros] = useState(TERCEIROS);
  const [tab, setTab] = useState<FilterTab>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commentDialog, setCommentDialog] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  // Dialog form state
  const [selContrato, setSelContrato] = useState(CONTRATOS[0].id);
  const [selServico, setSelServico] = useState("");
  const [selEntrega, setSelEntrega] = useState("");
  const [selAtividade, setSelAtividade] = useState("");
  const [selOrigem, setSelOrigem] = useState<Terceiro["origem"]>("sem_capacidade");
  const [justificativa, setJustificativa] = useState("");

  const contratoObj = CONTRATOS.find(c => c.id === selContrato);
  const formServices = SERVICOS.filter(s => contratoObj?.services.includes(s.id));
  const formEntregas = selServico ? getEntregasByServico(selServico) : [];
  const formAtividades = selEntrega ? getAtividadesByEntrega(selEntrega) : [];

  const filtered = terceiros.filter(t => {
    if (tab === "pendentes") return t.status === "pendente";
    if (tab === "aprovadas") return t.status === "aprovada" || t.status === "concluida";
    if (tab === "em_contratacao") return t.status === "em_contratacao";
    return true;
  });

  const pendentes = terceiros.filter(t => t.status === "pendente").length;
  const emContratacao = terceiros.filter(t => t.status === "em_contratacao").length;
  const aprovadas = terceiros.filter(t => t.status === "aprovada").length;

  const handleCreate = () => {
    const atv = ATIVIDADES.find(a => a.id === selAtividade);
    const entrega = ENTREGAS.find(e => e.id === selEntrega);
    const servico = SERVICOS.find(s => s.id === selServico);
    if (!atv || !entrega || !servico || !contratoObj) return;
    const cargoName = atv.cargosPermitidos.length > 0 ? getCargoById(atv.cargosPermitidos[0])?.name || "—" : "—";

    const newTerceiro: Terceiro = {
      id: `tc-${Date.now()}`,
      service: servico.name,
      contractCode: contratoObj.code,
      contratoId: selContrato,
      atividadeId: atv.id,
      atividadeName: atv.name,
      entregaName: entrega.name,
      servicoName: servico.name,
      cargoNecessario: cargoName,
      requester: "Facilitador (atual)",
      uo: contratoObj.uo === "uo-1" ? "UO Porto Alegre" : contratoObj.uo,
      status: "pendente",
      date: "11/03/2026",
      justification: justificativa,
      origem: selOrigem,
      comentarios: [],
      timeline: [
        { id: `tt-${Date.now()}`, action: "Necessidade identificada na atividade", user: "Facilitador", date: "11/03/2026 10:00", detail: `Atividade: ${atv.name} — cargo: ${cargoName}` },
        { id: `tt-${Date.now() + 1}`, action: "Solicitação de terceiro criada", user: "Facilitador", date: "11/03/2026 10:05", detail: `Origem: ${origemLabels[selOrigem].label}` },
      ],
    };
    setTerceiros([newTerceiro, ...terceiros]);
    setDialogOpen(false);
    resetForm();
    toast.success("Solicitação de terceiro criada");
  };

  const resetForm = () => {
    setSelServico(""); setSelEntrega(""); setSelAtividade(""); setJustificativa(""); setSelOrigem("sem_capacidade");
  };

  const handleApprove = (id: string) => {
    setTerceiros(prev => prev.map(t => t.id === id ? {
      ...t, status: "aprovada" as const,
      timeline: [...t.timeline, { id: `tt-${Date.now()}`, action: "Solicitação aprovada", user: "Gestão Corporativa (DR)", date: "11/03/2026 14:00" }]
    } : t));
    toast.success("Solicitação aprovada");
  };

  const handleReject = (id: string) => {
    setTerceiros(prev => prev.map(t => t.id === id ? {
      ...t, status: "rejeitada" as const,
      timeline: [...t.timeline, { id: `tt-${Date.now()}`, action: "Solicitação rejeitada", user: "Gestão Corporativa (DR)", date: "11/03/2026 14:00" }]
    } : t));
    toast.error("Solicitação rejeitada");
  };

  const handleAddComment = (id: string) => {
    if (!newComment.trim()) return;
    setTerceiros(prev => prev.map(t => t.id === id ? {
      ...t, comentarios: [...t.comentarios, { id: `tc-c-${Date.now()}`, author: "Facilitador", role: "Facilitador", text: newComment, date: "11/03/2026 10:00" }]
    } : t));
    setNewComment("");
    setCommentDialog(null);
    toast.success("Comentário adicionado");
  };

  const openTerceiroDetail = (t: Terceiro) => {
    const origemInfo = origemLabels[t.origem];
    openPanel(`Terceiro: ${t.atividadeName}`, (
      <TabbedDetail
        dados={
          <div className="space-y-3">
            {/* Origin context */}
            <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">Origem da necessidade</p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Contrato</span>
                  <span className="font-data font-medium ml-auto">{t.contractCode}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Package className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="ml-auto">{t.servicoName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Etapa</span>
                  <span className="ml-auto">{t.entregaName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-primary" />
                  <span className="text-primary font-medium">Atividade</span>
                  <span className="ml-auto font-medium">{t.atividadeName}</span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Cargo necessário</span><CargoBadge>{t.cargoNecessario}</CargoBadge></div>
              <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Solicitante</span><span className="font-medium">{t.requester}</span></div>
              <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">UO</span><span>{t.uo}</span></div>
              <div className="flex justify-between text-[12px] items-center">
                <span className="text-muted-foreground">Origem</span>
                <StatusBadge variant={origemInfo.variant}>{origemInfo.label}</StatusBadge>
              </div>
              {t.origemMobilidadeId && (
                <div className="bg-status-warning-muted border border-status-warning/20 rounded-md p-2 text-[11px] text-status-warning flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3" /> Originada da mobilidade {t.origemMobilidadeId} (rejeitada)
                </div>
              )}
            </div>

            {/* Justification */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Justificativa</p>
              <p className="text-[12px] text-foreground leading-relaxed bg-muted/20 rounded-md p-2.5 border border-border/50">{t.justification}</p>
            </div>

            {/* Comments */}
            {t.comentarios.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Comentários ({t.comentarios.length})
                </p>
                <div className="space-y-2">
                  {t.comentarios.map(c => (
                    <div key={c.id} className="bg-muted/30 rounded-md p-2.5 border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-foreground">{c.author}</span>
                        <span className="text-[10px] text-muted-foreground">{c.date}</span>
                      </div>
                      <p className="text-[11px] text-foreground/80">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
        timeline={
          <div className="space-y-0">
            {t.timeline.map((ev, i) => {
              const isEscalation = ev.action.includes("Escalonamento") || ev.action.includes("Mobilidade");
              const isApproval = ev.action.includes("aprovad") || ev.action.includes("contratação");
              return (
                <div key={ev.id} className="relative pl-6 pb-4">
                  {i < t.timeline.length - 1 && <div className="absolute left-[9px] top-4 bottom-0 w-px bg-border" />}
                  <div className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                    isEscalation ? 'border-status-warning bg-status-warning-muted' :
                    isApproval ? 'border-status-success bg-status-success-muted' :
                    ev.action.includes("rejeitad") ? 'border-status-danger bg-status-danger-muted' :
                    'border-border bg-card'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isEscalation ? 'bg-status-warning' :
                      isApproval ? 'bg-status-success' :
                      ev.action.includes("rejeitad") ? 'bg-status-danger' :
                      'bg-muted-foreground'
                    }`} />
                  </div>
                  <p className={`text-[12px] font-medium ${isEscalation ? 'text-status-warning' : isApproval ? 'text-status-success' : 'text-foreground'}`}>{ev.action}</p>
                  {ev.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{ev.detail}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{ev.user} · {ev.date}</p>
                </div>
              );
            })}
          </div>
        }
        acoes={
          <div className="space-y-3">
            {t.status === "pendente" && (
              <>
                <button onClick={() => handleApprove(t.id)} className="w-full px-4 py-2.5 bg-status-success text-status-success-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-colors">
                  Aprovar Solicitação
                </button>
                <button onClick={() => handleReject(t.id)} className="w-full px-4 py-2.5 border border-status-danger/30 text-status-danger rounded-lg text-sm hover:bg-status-danger-muted transition-colors">
                  Rejeitar
                </button>
              </>
            )}
            <button onClick={() => setCommentDialog(t.id)} className="w-full px-4 py-2.5 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" /> Adicionar Comentário
            </button>
            <div className="pt-2 space-y-1.5">
              <ValidarBadge>Prazo SLA para contratação de terceiro?</ValidarBadge>
              <ValidarBadge>Terceiro pode executar apenas a atividade ou todo o serviço?</ValidarBadge>
            </div>
          </div>
        }
      />
    ));
  };

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "todos", label: "Todos" },
    { key: "pendentes", label: "Pendentes", count: pendentes },
    { key: "em_contratacao", label: "Em contratação", count: emContratacao },
    { key: "aprovadas", label: "Aprovadas", count: aprovadas },
  ];

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Solicitação de Terceiro"
        description="Escalonamento para profissional credenciado quando não há capacidade interna"
        actions={
          <button onClick={() => setDialogOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Nova Solicitação
          </button>
        }
      />

      {/* Role banner */}
      <div className="bg-primary/5 border border-primary/15 rounded-lg p-3.5 mb-5 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-[12px] font-semibold text-foreground">Fluxo de escalonamento do Facilitador do Processo</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            A solicitação nasce quando a <strong>atividade</strong> não possui recurso interno compatível: sem capacidade, sobrecarga ou mobilidade rejeitada.
            O Facilitador é responsável por justificar a necessidade e acompanhar o tratamento.
          </p>
          <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><StatusBadge variant="info">Sem capacidade</StatusBadge></span>
            <span className="flex items-center gap-1"><StatusBadge variant="warning">Sobrecarga</StatusBadge></span>
            <span className="flex items-center gap-1"><StatusBadge variant="danger">Mobilidade rejeitada</StatusBadge></span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <DataCard label="Pendentes" value={pendentes} variant="warning" />
        <DataCard label="Em contratação" value={emContratacao} variant="default" />
        <DataCard label="Aprovadas" value={aprovadas} variant="success" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-[11px] rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              tab === t.key ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted font-data">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground">Nenhuma solicitação encontrada</p>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Atividade / Contrato</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Cargo necessário</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Origem</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Solicitante</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Data</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((t) => {
              const origemInfo = origemLabels[t.origem];
              return (
                <tr key={t.id} className="hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => openTerceiroDetail(t)}>
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-[12px] font-medium text-foreground">{t.atividadeName}</span>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <span className="font-data">{t.contractCode}</span>
                        <span>·</span>
                        <span>{t.servicoName}</span>
                        <span>·</span>
                        <span>{t.entregaName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><CargoBadge>{t.cargoNecessario}</CargoBadge></td>
                  <td className="px-4 py-3"><StatusBadge variant={origemInfo.variant}>{origemInfo.label}</StatusBadge></td>
                  <td className="px-4 py-3 text-[12px]">{t.requester}</td>
                  <td className="px-4 py-3">
                    {t.status === "pendente" && <StatusBadge variant="warning">Pendente</StatusBadge>}
                    {t.status === "aprovada" && <StatusBadge variant="success">Aprovada</StatusBadge>}
                    {t.status === "em_contratacao" && <StatusBadge variant="info">Em contratação</StatusBadge>}
                    {t.status === "rejeitada" && <StatusBadge variant="danger">Rejeitada</StatusBadge>}
                    {t.status === "concluida" && <StatusBadge variant="success">Concluída</StatusBadge>}
                  </td>
                  <td className="px-4 py-3 font-data text-[12px]">{t.date}</td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cross-module links */}

      <div className="mt-4 space-y-2">
        <ValidarBadge>Fluxo: mobilidade rejeitada gera solicitação de terceiro automaticamente?</ValidarBadge>
        <br />
        <ValidarBadge>Terceiro pode atuar em múltiplas atividades do mesmo contrato?</ValidarBadge>
      </div>

      {/* Nova Solicitação Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Solicitação de Terceiro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Contrato</label>
              <select value={selContrato} onChange={e => { setSelContrato(e.target.value); setSelServico(""); setSelEntrega(""); setSelAtividade(""); }}
                className="w-full border border-input rounded-lg text-sm p-2 bg-background mt-1">
                {CONTRATOS.map(c => <option key={c.id} value={c.id}>{c.code} — {c.client}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Serviço</label>
              <select value={selServico} onChange={e => { setSelServico(e.target.value); setSelEntrega(""); setSelAtividade(""); }}
                className="w-full border border-input rounded-lg text-sm p-2 bg-background mt-1">
                <option value="">Selecionar serviço...</option>
                {formServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Entrega</label>
              <select value={selEntrega} onChange={e => { setSelEntrega(e.target.value); setSelAtividade(""); }}
                disabled={!selServico}
                className="w-full border border-input rounded-lg text-sm p-2 bg-background mt-1 disabled:opacity-50">
                <option value="">Selecionar etapa...</option>
                {formEntregas.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Atividade (onde falta recurso)</label>
              <select value={selAtividade} onChange={e => setSelAtividade(e.target.value)}
                disabled={!selEntrega}
                className="w-full border border-input rounded-lg text-sm p-2 bg-background mt-1 disabled:opacity-50">
                <option value="">Selecionar atividade...</option>
                {formAtividades.map(a => {
                  const cargos = a.cargosPermitidos.map(cid => getCargoById(cid)?.name).filter(Boolean).join(", ");
                  return <option key={a.id} value={a.id}>{a.name} — {cargos || "sem cargo"}</option>;
                })}
              </select>
              {selAtividade && (() => {
                const atv = ATIVIDADES.find(a => a.id === selAtividade);
                if (!atv) return null;
                return (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground">Cargos necessários:</span>
                    {atv.cargosPermitidos.map(cid => {
                      const c = getCargoById(cid);
                      return c && <CargoBadge key={c.id}>{c.name}</CargoBadge>;
                    })}
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Motivo da solicitação</label>
              <select value={selOrigem} onChange={e => setSelOrigem(e.target.value as Terceiro["origem"])}
                className="w-full border border-input rounded-lg text-sm p-2 bg-background mt-1">
                <option value="sem_capacidade">Sem capacidade interna</option>
                <option value="sobrecarga">Sobrecarga de recursos</option>
                <option value="mobilidade_rejeitada">Mobilidade rejeitada</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Justificativa</label>
              <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)}
                className="w-full border border-input rounded-lg text-sm p-3 bg-background mt-1 min-h-[80px]"
                placeholder="Descreva por que um terceiro é necessário para esta atividade..." />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => { setDialogOpen(false); resetForm(); }} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Cancelar</button>
            <button onClick={handleCreate} disabled={!selAtividade || !justificativa.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Criar Solicitação</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment dialog */}
      <Dialog open={!!commentDialog} onOpenChange={() => setCommentDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Comentário</DialogTitle></DialogHeader>
          <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
            className="w-full border border-input rounded-lg text-sm p-3 bg-background min-h-[100px]"
            placeholder="Comentário contextual sobre esta solicitação..." />
          <DialogFooter>
            <button onClick={() => setCommentDialog(null)} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Cancelar</button>
            <button onClick={() => commentDialog && handleAddComment(commentDialog)} disabled={!newComment.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Enviar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
