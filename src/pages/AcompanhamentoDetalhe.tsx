import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { contratosMock, Etapa, Tarefa } from "@/data/mockData";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function AcompanhamentoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contrato = contratosMock.find((c) => c.id === id);
  const [expandedEtapas, setExpandedEtapas] = useState<string[]>([]);
  const [expandedTarefas, setExpandedTarefas] = useState<string[]>([]);

  if (!contrato) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Contrato não encontrado.
        <button onClick={() => navigate("/")} className="ml-2 text-primary underline">
          Voltar
        </button>
      </div>
    );
  }

  const toggleEtapa = (etapaId: string) =>
    setExpandedEtapas((prev) =>
      prev.includes(etapaId) ? prev.filter((e) => e !== etapaId) : [...prev, etapaId]
    );

  const toggleTarefa = (tarefaId: string) =>
    setExpandedTarefas((prev) =>
      prev.includes(tarefaId) ? prev.filter((t) => t !== tarefaId) : [...prev, tarefaId]
    );

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      {/* Back & Header */}
      <div>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para lista
        </button>

        <div className="bg-card rounded-lg border border-border p-5">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              {contrato.empresa}
              <StatusBadge status={contrato.status} />
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span>COT: {contrato.cot}</span>
              <span>Código MV: {contrato.codigoMV}</span>
              <span>{contrato.uo}</span>
              <span>Competência: {contrato.competencia}</span>
              <span>Etapa atual: <strong className="text-foreground">{contrato.etapaAtual}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Etapas", value: contrato.etapas.length, icon: Calendar },
          { label: "Tarefas em andamento", value: contrato.tarefasAndamento, icon: Clock },
          { label: "Sem apontamento", value: contrato.tarefasSemApontamento, icon: AlertTriangle, danger: true },
          { label: "Recursos", value: contrato.recursosEnvolvidos, icon: User },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </div>
            <div className={`text-xl font-bold ${s.danger && s.value > 0 ? "text-status-danger" : "text-foreground"}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Etapas */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Etapas do contrato</h2>
        {contrato.etapas.map((etapa, idx) => (
          <EtapaCard
            key={etapa.id}
            etapa={etapa}
            expanded={expandedEtapas.includes(etapa.id)}
            onToggle={() => toggleEtapa(etapa.id)}
            expandedTarefas={expandedTarefas}
            onToggleTarefa={toggleTarefa}
            delay={idx * 60}
          />
        ))}
      </div>
    </div>
  );
}

function EtapaCard({
  etapa,
  expanded,
  onToggle,
  expandedTarefas,
  onToggleTarefa,
  delay,
}: {
  etapa: Etapa;
  expanded: boolean;
  onToggle: () => void;
  expandedTarefas: string[];
  onToggleTarefa: (id: string) => void;
  delay: number;
}) {
  return (
    <div
      className="bg-card rounded-lg border border-border overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Etapa header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">{etapa.nome}</span>
            <StatusBadge status={etapa.status} />
            {etapa.pendencias > 0 && (
              <span className="text-xs text-status-danger font-medium">{etapa.pendencias} pendência(s)</span>
            )}
            {etapa.semApontamento > 0 && (
              <span className="text-xs text-status-warning font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {etapa.semApontamento} s/ apontamento
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span>{etapa.periodo}</span>
            <span>{etapa.quantidadeTarefas} tarefas</span>
            <span>{etapa.quantidadeRecursos} recursos</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${etapa.progresso}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground w-10 text-right">{etapa.progresso}%</span>
        </div>
      </button>

      {/* Tarefas */}
      {expanded && (
        <div className="border-t border-border">
          <div className="p-3 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Tarefas
            </p>
            <div className="space-y-1.5">
              {etapa.tarefas.map((tarefa) => (
                <TarefaRow
                  key={tarefa.id}
                  tarefa={tarefa}
                  expanded={expandedTarefas.includes(tarefa.id)}
                  onToggle={() => onToggleTarefa(tarefa.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TarefaRow({
  tarefa,
  expanded,
  onToggle,
}: {
  tarefa: Tarefa;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-card rounded-md border border-border overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors">
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{tarefa.nome}</span>
            <span className="text-xs text-muted-foreground">{tarefa.codigo}</span>
            <StatusBadge status={tarefa.status} />
            {tarefa.atraso && (
              <span className="text-xs text-status-danger font-medium flex items-center gap-0.5">
                <Clock className="w-3 h-3" /> Atraso
              </span>
            )}
            {tarefa.semApontamento && (
              <span className="text-xs text-status-warning font-medium flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> S/ apontamento
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-muted-foreground">
            <span>Responsável: {tarefa.recursoResponsavel}</span>
            <span>{tarefa.periodo}</span>
            <span>
              {tarefa.horasApontadas}h / {tarefa.horasPrevistas}h
            </span>
            {tarefa.ultimoApontamento && <span>Último: {tarefa.ultimoApontamento}</span>}
          </div>
        </div>
        {/* Mini progress */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                tarefa.status === "Concluída" ? "bg-status-active" : tarefa.atraso ? "bg-status-danger" : "bg-primary"
              }`}
              style={{ width: `${Math.min((tarefa.horasApontadas / tarefa.horasPrevistas) * 100, 100)}%` }}
            />
          </div>
        </div>
      </button>

      {/* Recursos */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Recursos vinculados
          </p>
          <div className="space-y-2">
            {tarefa.recursos.map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                  {r.nome.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{r.nome}</div>
                  <div className="text-muted-foreground">{r.funcao}</div>
                </div>
                <StatusBadge status={r.situacao} />
                <div className="text-muted-foreground">
                  {r.horasApontadas}h / {r.horasPrevistas}h
                </div>
                {r.pendencias > 0 && (
                  <span className="text-status-danger font-medium">{r.pendencias} pendência(s)</span>
                )}
                {r.pendencias === 0 && (
                  <span className="text-status-active flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Em dia
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
