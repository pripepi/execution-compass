import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UOS, CONTRATOS, SERVICOS, ENTREGAS, ATIVIDADES, RECURSOS, getEntregasByServico, getAtividadesByEntrega } from "@/data/mockData";

export interface DashboardFilterState {
  uoId: string;
  contratoId: string;
  servicoId: string;
  entregaId: string;
  atividadeId: string;
  recursoId: string;
}

const ALL = "__all__";

interface Props {
  filters: DashboardFilterState;
  onChange: (f: DashboardFilterState) => void;
  /** Which filters to show */
  show?: ("uo" | "contrato" | "servico" | "entrega" | "atividade" | "recurso")[];
}

export const DEFAULT_FILTERS: DashboardFilterState = {
  uoId: ALL,
  contratoId: ALL,
  servicoId: ALL,
  entregaId: ALL,
  atividadeId: ALL,
  recursoId: ALL,
};

export function DashboardFilters({ filters, onChange, show = ["uo", "contrato", "servico", "entrega", "atividade"] }: Props) {
  const set = (key: keyof DashboardFilterState, val: string) => {
    const next = { ...filters, [key]: val };
    // cascade reset
    if (key === "uoId") { next.contratoId = ALL; next.servicoId = ALL; next.entregaId = ALL; next.atividadeId = ALL; }
    if (key === "contratoId") { next.servicoId = ALL; next.entregaId = ALL; next.atividadeId = ALL; }
    if (key === "servicoId") { next.entregaId = ALL; next.atividadeId = ALL; }
    if (key === "entregaId") { next.atividadeId = ALL; }
    onChange(next);
  };

  const filteredContratos = filters.uoId !== ALL ? CONTRATOS.filter(c => c.uo === filters.uoId) : CONTRATOS;
  const filteredServicos = filters.contratoId !== ALL
    ? SERVICOS.filter(s => CONTRATOS.find(c => c.id === filters.contratoId)?.services.includes(s.id))
    : SERVICOS;
  const filteredEntregas = filters.servicoId !== ALL ? getEntregasByServico(filters.servicoId) : ENTREGAS;
  const filteredAtividades = filters.entregaId !== ALL ? getAtividadesByEntrega(filters.entregaId) : ATIVIDADES;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {show.includes("uo") && (
        <Select value={filters.uoId} onValueChange={v => set("uoId", v)}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Carteira / UO" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as UOs</SelectItem>
            {UOS.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {show.includes("contrato") && (
        <Select value={filters.contratoId} onValueChange={v => set("contratoId", v)}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Contrato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos Contratos</SelectItem>
            {filteredContratos.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.client}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {show.includes("servico") && (
        <Select value={filters.servicoId} onValueChange={v => set("servicoId", v)}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Serviço" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos Serviços</SelectItem>
            {filteredServicos.map(s => <SelectItem key={s.id} value={s.id}>{s.code}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {show.includes("entrega") && (
        <Select value={filters.entregaId} onValueChange={v => set("entregaId", v)}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Etapa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas Etapas</SelectItem>
            {filteredEntregas.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {show.includes("atividade") && (
        <Select value={filters.atividadeId} onValueChange={v => set("atividadeId", v)}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Atividade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas Atividades</SelectItem>
            {filteredAtividades.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {show.includes("recurso") && (
        <Select value={filters.recursoId} onValueChange={v => set("recursoId", v)}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Pessoa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas Pessoas</SelectItem>
            {RECURSOS.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
