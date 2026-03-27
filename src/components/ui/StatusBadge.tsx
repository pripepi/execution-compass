import { cn } from "@/lib/utils";

type StatusType = "active" | "warning" | "danger" | "info" | "neutral" | "implantation";

const statusMap: Record<string, StatusType> = {
  "Em execução": "active",
  "Em andamento": "active",
  "Ativo": "active",
  "Concluída": "info",
  "Concluído": "info",
  "Pendente": "warning",
  "Rascunho": "warning",
  "Atrasada": "danger",
  "Suspenso": "danger",
  "Não iniciada": "neutral",
  "Em implantação": "implantation",
  "Afastado": "warning",
  "Inativo": "neutral",
};

const styleMap: Record<StatusType, string> = {
  active: "bg-status-active-bg text-status-active",
  warning: "bg-status-warning-bg text-status-warning",
  danger: "bg-status-danger-bg text-status-danger",
  info: "bg-status-info-bg text-status-info",
  neutral: "bg-status-neutral-bg text-status-neutral",
  implantation: "bg-status-implantation-bg text-status-implantation",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const type = statusMap[status] || "neutral";
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", styleMap[type], className)}>
      {status}
    </span>
  );
}
