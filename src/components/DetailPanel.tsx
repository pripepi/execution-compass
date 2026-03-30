import React from "react";
import { useDetailPanel } from "@/contexts/DetailPanelContext";
import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DetailPanel() {
  const { isOpen, panelTitle, panelContent, closePanel } = useDetailPanel();

  if (!isOpen) return null;

  return (
    <aside className="w-[340px] h-screen border-l border-border bg-card shrink-0 flex flex-col animate-slide-in-right overflow-hidden shadow-panel">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground truncate pr-2">{panelTitle}</h3>
        <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-accent transition-colors shrink-0">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
        {panelContent}
      </div>
    </aside>
  );
}

// Reusable tabbed detail panel content
interface TabbedDetailProps {
  dados: React.ReactNode;
  timeline: React.ReactNode;
  acoes?: React.ReactNode;
}

export function TabbedDetail({ dados, timeline, acoes }: TabbedDetailProps) {
  return (
    <Tabs defaultValue="dados" className="w-full">
      <TabsList className="w-full grid grid-cols-3 h-9 bg-muted rounded-lg">
        <TabsTrigger value="dados" className="text-[12px] rounded-md">Dados</TabsTrigger>
        <TabsTrigger value="timeline" className="text-[12px] rounded-md">Timeline</TabsTrigger>
        <TabsTrigger value="acoes" className="text-[12px] rounded-md">Ações</TabsTrigger>
      </TabsList>
      <TabsContent value="dados" className="mt-4">{dados}</TabsContent>
      <TabsContent value="timeline" className="mt-4">{timeline}</TabsContent>
      <TabsContent value="acoes" className="mt-4">
        {acoes || <p className="text-xs text-muted-foreground italic">Nenhuma ação disponível.</p>}
      </TabsContent>
    </Tabs>
  );
}
