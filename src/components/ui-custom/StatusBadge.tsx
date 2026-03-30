import React, { ReactNode } from "react";
import { Briefcase, User } from "lucide-react";

interface StatusBadgeProps {
  variant: "success" | "warning" | "danger" | "info";
  children: ReactNode;
}

const variantClasses = {
  success: "bg-status-success-muted text-status-success border-status-success/20",
  warning: "bg-status-warning-muted text-status-warning border-status-warning/20",
  danger: "bg-status-danger-muted text-status-danger border-status-danger/20",
  info: "bg-status-info-muted text-status-info border-status-info/20"
};

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border leading-none ${variantClasses[variant]}`}>
      {children}
    </span>);

}

interface ValidarBadgeProps {
  children?: ReactNode;
}

export function ValidarBadge({ children }: ValidarBadgeProps) {
  return null;




}

/** Badge for Cargo / Papel Operacional — uses indigo/purple tones */
export function CargoBadge({ children }: {children: ReactNode;}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/8 text-primary border border-primary/20 leading-none">
      <Briefcase className="w-3 h-3" />
      {children}
    </span>);

}

/** Badge for Pessoa / Recurso vinculado — uses neutral/warm tones */
export function PessoaBadge({ children }: {children: ReactNode;}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-foreground/6 text-foreground border border-foreground/10 leading-none">
      <User className="w-3 h-3" />
      {children}
    </span>);

}


interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">{title}</h1>
        {description}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>);

}

interface DataCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

export function DataCard({ label, value, sublabel, variant = "default" }: DataCardProps) {
  const accentColors = {
    default: "border-l-primary",
    success: "border-l-status-success",
    warning: "border-l-status-warning",
    danger: "border-l-status-danger"
  };

  return (
    <div className={`bg-card border border-border border-l-4 ${accentColors[variant]} rounded-md p-4 shadow-sm`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold font-data text-foreground leading-none">{value}</p>
      {sublabel ? <p className="mt-2 text-[11px] text-muted-foreground">{sublabel}</p> : null}
    </div>);

}