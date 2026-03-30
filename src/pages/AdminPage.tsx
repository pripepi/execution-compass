import React from "react";
import { PageHeader, StatusBadge, ValidarBadge } from "@/components/ui-custom/StatusBadge";
import { Shield, Users, Key } from "lucide-react";
import { USUARIOS } from "@/data/mockData";

const permissions = [
  { module: "Parametrização de Serviços", tecnico: "—", facilitador: "Leitura", gc_dr: "Edição", bo_uo: "—", admin: "Total" },
  { module: "Entregas e Atividades", tecnico: "Leitura", facilitador: "Leitura", gc_dr: "Edição", bo_uo: "—", admin: "Total" },
  { module: "Gestão de Recursos", tecnico: "—", facilitador: "Leitura", gc_dr: "Edição", bo_uo: "Edição", admin: "Total" },
  { module: "Alocação de Recursos", tecnico: "—", facilitador: "Edição", gc_dr: "—", bo_uo: "—", admin: "Total" },
  { module: "Execução de Atividades", tecnico: "Edição", facilitador: "Leitura", gc_dr: "—", bo_uo: "—", admin: "Total" },
  { module: "Indisponibilidades", tecnico: "Edição", facilitador: "Leitura", gc_dr: "—", bo_uo: "Edição", admin: "Total" },
  { module: "Mobilidade", tecnico: "—", facilitador: "Edição", gc_dr: "—", bo_uo: "—", admin: "Total" },
  { module: "Solicitação de Terceiro", tecnico: "—", facilitador: "Edição", gc_dr: "Edição", bo_uo: "—", admin: "Total" },
  { module: "Comentários", tecnico: "Edição", facilitador: "Edição", gc_dr: "—", bo_uo: "—", admin: "Total" },
  { module: "Relatórios", tecnico: "—", facilitador: "Leitura", gc_dr: "Leitura", bo_uo: "Leitura", admin: "Total" },
  { module: "Dashboard", tecnico: "Leitura", facilitador: "Leitura", gc_dr: "Leitura", bo_uo: "Leitura", admin: "Total" },
  { module: "Administração", tecnico: "—", facilitador: "—", gc_dr: "—", bo_uo: "—", admin: "Total" },
];

export default function AdminPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader title="Administração e Permissões" description="Gerenciamento de usuários, perfis e permissões do sistema" />

      <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Usuários</h2>
      <div className="border border-border rounded-md overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">E-mail</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Perfil</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">UO</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {USUARIOS.map((u) => (
              <tr key={u.id} className="hover:bg-accent/50">
                <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 text-xs">{u.role}</td>
                <td className="px-4 py-3 text-xs">{u.uo}</td>
                <td className="px-4 py-3">
                  {u.status === "ativo" ? <StatusBadge variant="success">Ativo</StatusBadge> : <StatusBadge variant="info">Inativo</StatusBadge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Matriz de Permissões por Perfil</h2>
      <div className="border border-border rounded-md overflow-hidden mb-6 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Módulo</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground">Técnico</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground">Facilitador</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground">GC DR</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground">BO UO</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {permissions.map((p, i) => (
              <tr key={i} className="hover:bg-accent/50">
                <td className="px-3 py-2 font-medium text-foreground">{p.module}</td>
                <td className={`px-3 py-2 text-center ${p.tecnico === "—" ? "text-muted-foreground" : p.tecnico === "Edição" ? "text-primary font-medium" : ""}`}>{p.tecnico}</td>
                <td className={`px-3 py-2 text-center ${p.facilitador === "—" ? "text-muted-foreground" : p.facilitador === "Edição" ? "text-primary font-medium" : ""}`}>{p.facilitador}</td>
                <td className={`px-3 py-2 text-center ${p.gc_dr === "—" ? "text-muted-foreground" : p.gc_dr === "Edição" ? "text-primary font-medium" : ""}`}>{p.gc_dr}</td>
                <td className={`px-3 py-2 text-center ${p.bo_uo === "—" ? "text-muted-foreground" : p.bo_uo === "Edição" ? "text-primary font-medium" : ""}`}>{p.bo_uo}</td>
                <td className={`px-3 py-2 text-center ${p.admin === "Total" ? "text-status-success font-medium" : ""}`}>{p.admin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><Key className="w-4 h-4" /> Pontos de Integração</h2>
      <div className="space-y-2 mb-6">
        {[
          { name: "ERP MV (Contratos/Serviços)", status: "Planejado" },
          { name: "Agenda MV (Serviços assistenciais)", status: "Planejado" },
          { name: "Base de Produção (Boletim)", status: "Parking-lot" },
          { name: "Sistema Contábil (Rateio CR)", status: "Planejado" },
        ].map((int, i) => (
          <div key={i} className="bg-card border border-border rounded-md p-3 flex items-center justify-between">
            <span className="text-sm text-foreground">{int.name}</span>
            <StatusBadge variant={int.status === "Parking-lot" ? "warning" : "info"}>{int.status}</StatusBadge>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <ValidarBadge>Definir granularidade de permissões: módulo, ação, ou campo</ValidarBadge>
        <br />
        <ValidarBadge>Integração com SSO/autenticação existente no Flow MV</ValidarBadge>
      </div>
    </div>
  );
}
