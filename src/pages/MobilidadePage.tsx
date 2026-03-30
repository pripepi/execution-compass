import React, { useState } from "react";
import { PageHeader, StatusBadge, ValidarBadge, DataCard, CargoBadge, PessoaBadge } from "@/components/ui-custom/StatusBadge";
import { useDetailPanel } from "@/contexts/DetailPanelContext";
import { ActivityTimeline } from "@/components/ui-custom/ActivityTimeline";
import { TabbedDetail } from "@/components/DetailPanel";
import {
  AlertTriangle, ChevronRight, ChevronDown, Lock, MapPin, Activity,
  Package, Layers, MessageSquare, ArrowRight, Users, Shield, FileText, ExternalLink } from
"lucide-react";
import { useNavigate } from "react-router-dom";
import { getCargoById, Mobilidade, RECURSOS } from "@/data/mockData";
import { useMobilidade } from "@/contexts/MobilidadeContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type FilterTab = "todos" | "pendentes" | "aprovadas" | "rejeitadas";

export default function MobilidadePage() {
  const { openPanel } = useDetailPanel();
  const navigate = useNavigate();
  const { mobilidades, setMobilidades, approveMobilidade, rejectMobilidade } = useMobilidade();
  const [tab, setTab] = useState<FilterTab>("todos");
  const [commentDialog, setCommentDialog] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [approveModalId, setApproveModalId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState("");
  const [modalComment, setModalComment] = useState("");

  const availableResources = RECURSOS.filter((r) => r.status === "ativo");

  const filtered = mobilidades.filter((m) => {
    if (tab === "pendentes") return m.status === "pendente";
    if (tab === "aprovadas") return m.status === "aprovada";
    if (tab === "rejeitadas") return m.status === "rejeitada";
    return true;
  });

  const pendentes = mobilidades.filter((m) => m.status === "pendente").length;
  const aprovadas = mobilidades.filter((m) => m.status === "aprovada").length;
  const alertas = mobilidades.filter((m) => m.alert).length;
  const rejeitadas = mobilidades.filter((m) => m.status === "rejeitada").length;

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

  const handleAddComment = (id: string) => {
    if (!newComment.trim()) return;
    setMobilidades((prev) => prev.map((m) => m.id === id ? {
      ...m,
      comentarios: [...m.comentarios, { id: `mc-${Date.now()}`, author: "Facilitador", role: "Facilitador", text: newComment, date: "11/03/2026 10:00" }]
    } : m));
    setNewComment("");
    setCommentDialog(null);
    toast.success("Comentário adicionado");
  };

  const openMobilidadeDetail = (m: Mobilidade) => {
    const cargo = getCargoById(m.cargoId);
    openPanel(`Mobilidade: ${m.resource}`,
    <TabbedDetail
      dados={
      <div className="space-y-3">
            {/* Context: where the need came from */}
            <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">Origem da necessidade</p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Contrato</span>
                  <span className="font-data font-medium ml-auto">{m.contratoCode}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Package className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="ml-auto">{m.servicoName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Entrega</span>
                  <span className="ml-auto">{m.entregaName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-primary" />
                  <span className="text-primary font-medium">Atividade</span>
                  <span className="ml-auto font-medium">{m.atividadeName}</span>
                </div>
              </div>
            </div>

            {/* Person & cargo */}
            <div className="space-y-2">
              <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Pessoa solicitada</span><PessoaBadge>{m.status === "aprovada" ? m.resource : "—"}</PessoaBadge></div>
              <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Cargo</span><CargoBadge>{m.status === "aprovada" ? (cargo?.name || "—") : "—"}</CargoBadge></div>
              <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Solicitante</span><span className="font-medium">{m.solicitante}</span></div>
            </div>

            {/* Route */}
            <div className="border border-border rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Deslocamento</p>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="font-medium text-foreground">{m.from}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{m.to}</span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-[11px]">
                <span className="text-muted-foreground">Distância: <span className="font-data font-semibold text-foreground">{m.distance}</span></span>
                <span className="text-muted-foreground">Limite: <span className="font-data">{m.limit}</span></span>
              </div>
              {m.alert &&
          <div className="mt-2 bg-status-danger-muted border border-status-danger/20 rounded-md p-2 text-[11px] text-status-danger flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span><strong>Excede limite parametrizado</strong> — distância {m.distance} &gt; limite {m.limit}</span>
                </div>
          }
            </div>

            {/* Motivo */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Motivo</p>
              <p className="text-[12px] text-foreground leading-relaxed">{m.motivo}</p>
            </div>

            {/* Comments */}
            {m.comentarios.length > 0 &&
        <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Comentários ({m.comentarios.length})
                </p>
                <div className="space-y-2">
                  {m.comentarios.map((c) =>
            <div key={c.id} className="bg-muted/30 rounded-md p-2.5 border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-foreground">{c.author}</span>
                        <span className="text-[10px] text-muted-foreground">{c.date}</span>
                      </div>
                      <p className="text-[11px] text-foreground/80">{c.text}</p>
                    </div>
            )}
                </div>
              </div>
        }
          </div>
      }
      timeline={
      <div className="space-y-0">
            {m.timeline.map((ev, i) => {
          const isAlert = ev.action.includes("⚠");
          const isEscalation = ev.action.includes("terceiro") || ev.action.includes("Escalonamento");
          return (
            <div key={ev.id} className="relative pl-6 pb-4">
                  {i < m.timeline.length - 1 && <div className="absolute left-[9px] top-4 bottom-0 w-px bg-border" />}
                  <div className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
              isAlert ? 'border-status-danger bg-status-danger-muted' :
              isEscalation ? 'border-status-warning bg-status-warning-muted' :
              ev.action.includes("aprovada") ? 'border-status-success bg-status-success-muted' :
              ev.action.includes("rejeitada") ? 'border-status-danger bg-status-danger-muted' :
              'border-border bg-card'}`
              }>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                isAlert ? 'bg-status-danger' :
                isEscalation ? 'bg-status-warning' :
                ev.action.includes("aprovada") ? 'bg-status-success' :
                ev.action.includes("rejeitada") ? 'bg-status-danger' :
                'bg-muted-foreground'}`
                } />
                  </div>
                  <p className={`text-[12px] font-medium ${isAlert ? 'text-status-danger' : isEscalation ? 'text-status-warning' : 'text-foreground'}`}>{ev.action}</p>
                  {ev.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{ev.detail}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{ev.user} · {ev.date}</p>
                </div>);

        })}
          </div>
      }
      acoes={
      <div className="space-y-3">
            {m.status === "pendente" &&
        <>
                <button onClick={() => handleApprove(m.id)} className="w-full px-4 py-2.5 bg-status-success text-status-success-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-colors">
                  Aprovar Mobilidade
                </button>
                <button onClick={() => handleReject(m.id)} className="w-full px-4 py-2.5 border border-status-danger/30 text-status-danger rounded-lg text-sm hover:bg-status-danger-muted transition-colors">
                  Rejeitar 
                </button>
              </>
        }
            {m.status === "rejeitada" &&
        <button onClick={() => navigate("/terceiros")} className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" /> Abrir Solicitação de Terceiro
              </button>
        }
            <button onClick={() => setCommentDialog(m.id)} className="w-full px-4 py-2.5 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" /> Adicionar Comentário
            </button>
            <div className="pt-2 space-y-1.5">
              <ValidarBadge>Mobilidade rejeitada gera solicitação de terceiro automaticamente?</ValidarBadge>
              <ValidarBadge>Limite de distância é por serviço ou global?</ValidarBadge>
            </div>
          </div>
      } />

    );
  };

  const tabs: {key: FilterTab;label: string;count?: number;}[] = [
  { key: "todos", label: "Todos" },
  { key: "pendentes", label: "Pendentes", count: pendentes },
  { key: "aprovadas", label: "Aprovadas", count: aprovadas },
  { key: "rejeitadas", label: "Rejeitadas", count: rejeitadas }];


  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Mobilidade de Recursos"
        description="Solicitações de mobilidade entre carteiras — originadas por necessidade de atividade" />
      

      {/* Role banner */}
      








      

      {/* Alert banner */}
      {alertas > 0







      }

      {/* Cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <DataCard label="Pendentes" value={pendentes} variant="warning" />
        <DataCard label="Aprovadas" value={aprovadas} variant="success" />
        <DataCard label="Rejeitadas" value={rejeitadas} variant="danger" />
        <DataCard label="Com alerta distância" value={alertas} variant="danger" sublabel="Excede limite" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map((t) =>
        <button key={t.key} onClick={() => setTab(t.key)}
        className={`px-3 py-1.5 text-[11px] rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
        tab === t.key ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground hover:text-foreground'}`
        }>
            {t.label}
            {t.count !== undefined && t.count > 0 &&
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted font-data">{t.count}</span>
          }
          </button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 &&
      <div className="bg-card border border-border rounded-lg p-12 text-center">
          <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground">Nenhuma solicitação encontrada</p>
          <p className="text-[12px] text-muted-foreground mt-1">Ajuste os filtros.</p>
        </div>
      }

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Pessoa</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Atividade / Contrato</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Origem → Destino</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Distância</th>
              <th className="text-center px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Alerta</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((m) => {
              const cargo = getCargoById(m.cargoId);
              return (
                <tr key={m.id} className="hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => openMobilidadeDetail(m)}>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-foreground text-[13px]">{m.status === "aprovada" ? m.resource : "—"}</span>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{m.status === "aprovada" ? cargo?.name : ""}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-[12px] text-foreground">{m.atividadeName}</span>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <span className="font-data">{m.contratoCode}</span>
                        <span>·</span>
                        <span>{m.servicoName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px]">
                    <span className="text-muted-foreground">{m.from}</span>
                    <span className="mx-1.5 text-muted-foreground">→</span>
                    <span className="text-foreground">{m.to}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-data text-[12px]">
                    <span className={m.alert ? 'text-status-danger font-semibold' : 'text-foreground'}>{m.distance}</span>
                    <div className="text-[10px] text-muted-foreground">limite {m.limit}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.alert &&
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-status-danger-muted text-status-danger border border-status-danger/20 font-medium">
                        <AlertTriangle className="w-3 h-3" /> Excede
                      </span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {m.status === "pendente" && <StatusBadge variant="warning">Pendente</StatusBadge>}
                    {m.status === "aprovada" && <StatusBadge variant="success">Aprovada</StatusBadge>}
                    {m.status === "rejeitada" && <StatusBadge variant="danger">Rejeitada</StatusBadge>}
                    {m.status === "cancelada" && <StatusBadge variant="info">Cancelada</StatusBadge>}
                  </td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>);

            })}
          </tbody>
        </table>
      </div>


      <div className="mt-4 space-y-2">
        <ValidarBadge>Fluxo: mobilidade entre carteiras de clientes diferentes na mesma UO — como tratar?</ValidarBadge>
        <br />
        <ValidarBadge>Aprovação de mobilidade acima do limite: Coordenador ou DR?</ValidarBadge>
      </div>

      {/* Comment dialog */}
      <Dialog open={!!commentDialog} onOpenChange={() => setCommentDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Comentário</DialogTitle></DialogHeader>
          <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
          className="w-full border border-input rounded-lg text-sm p-3 bg-background min-h-[100px]"
          placeholder="Escreva um comentário contextual sobre esta mobilidade..." />
          <DialogFooter>
            <button onClick={() => setCommentDialog(null)} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Cancelar</button>
            <button onClick={() => commentDialog && handleAddComment(commentDialog)} disabled={!newComment.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Enviar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>);

}