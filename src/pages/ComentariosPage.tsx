import React, { useState } from "react";
import { PageHeader, ValidarBadge } from "@/components/ui-custom/StatusBadge";
import { MessageSquare, Send } from "lucide-react";
import { COMENTARIOS, ATIVIDADES } from "@/data/mockData";
import { toast } from "sonner";

type CommentFilter = "todos" | "meus" | "para_mim";

export default function ComentariosPage() {
  const [newComment, setNewComment] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [comments, setComments] = useState(COMENTARIOS);
  const [filter, setFilter] = useState<CommentFilter>("todos");

  const filtered = comments.filter((c) => {
    if (filter === "meus") return c.author === "Carlos Silva";
    if (filter === "para_mim") return c.role === "Facilitador";
    return true;
  });

  const handleSend = () => {
    if (!newComment.trim() || !selectedActivity) {
      toast.error("Selecione uma atividade e escreva o comentário");
      return;
    }
    setComments([{
      id: `cm-${Date.now()}`,
      activity: selectedActivity,
      serviceCode: "SST-001",
      author: "Você",
      text: newComment,
      date: "11/03/2026 09:00",
      role: "Técnico"
    }, ...comments]);
    setNewComment("");
    toast.success("Comentário enviado");
  };

  const tabs: {key: CommentFilter;label: string;}[] = [
  { key: "todos", label: "Todos" },
  { key: "meus", label: "Meus comentários" },
  { key: "para_mim", label: "Para mim" }];


  return (
    <div className="max-w-6xl">
      <PageHeader title="Comentários Operacionais" description="Comunicação contextualizada entre facilitadores e executores sobre as atividades" />

      <div className="flex gap-2 mb-4">
        {tabs.map((t) =>
        <button key={t.key} onClick={() => setFilter(t.key)}
        className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${filter === t.key ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-accent'}`}>
            {t.label}
          </button>
        )}
      </div>

      <div className="space-y-3 mb-6">
        {filtered.map((c) =>
        <div key={c.id} className="bg-card border border-border rounded-md p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{c.author}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{c.role}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{c.activity} · {c.serviceCode}</p>
                <p className="text-sm text-foreground">{c.text}</p>
                <p className="text-[10px] text-muted-foreground mt-2 font-data">{c.date}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border border-border rounded-md p-3">
        <p className="text-xs text-muted-foreground mb-2">Novo comentário</p>
        <div className="flex gap-2">
          <select value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} className="border border-input rounded-md text-xs p-2 bg-background w-48">
            <option value="">Selecionar atividade...</option>
            {ATIVIDADES.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
          <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escreva seu comentário..."
          className="flex-1 border border-input rounded-md text-sm p-2 bg-background"
          onKeyDown={(e) => e.key === "Enter" && handleSend()} />
          <button onClick={handleSend} className="px-4 py-2 text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 flex items-center gap-2 bg-sidebar">
            <Send className="w-4 h-4" /> Enviar
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Rascunhos são salvos localmente. <ValidarBadge>Única exceção ao salvamento explícito</ValidarBadge></p>
      </div>
    </div>);

}