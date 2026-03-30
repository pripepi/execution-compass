import {
  Home, Settings2, Package, ClipboardList, Users, UserCheck,
  PlayCircle, CalendarOff, ArrowRightLeft, UserPlus, MessageSquare,
  BarChart3, LayoutDashboard, Shield, FileText, Briefcase, Layers
} from "lucide-react";
// CalendarOff already imported above
import { ProfileRole } from "@/contexts/ProfileContext";

export interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  path: string;
  allowedRoles: ProfileRole[];
  group: string;
  /** Ordinal within group */
  order: number;
}

/**
 * Navigation structured in 4 business blocks:
 * 1. Atribuição ao Serviço (DR)
 * 2. Operacionalização do Contrato
 * 3. Execução e Controle
 * 4. Gestão e Monitoramento
 * + Sistema (admin only)
 */
export const NAV_ITEMS: NavItem[] = [
  // --- Home (always first, outside groups) ---
  { id: "home", label: "Início", icon: Home, path: "/", allowedRoles: ["tecnico","coordenador","backoffice_dr","backoffice_uo","administrador"], group: "Início", order: 0 },

  // --- 1. Atribuição ao Serviço (DR) ---
  { id: "parametrizacao", label: "Serviços", icon: Settings2, path: "/parametrizacao", allowedRoles: ["coordenador","backoffice_dr","administrador"], group: "PARAMETRIZAÇÃO", order: 1 },
  { id: "cargos", label: "Cadastro de Cargos", icon: Briefcase, path: "/cargos", allowedRoles: ["coordenador","backoffice_dr","administrador"], group: "PARAMETRIZAÇÃO", order: 2 },
  { id: "entregas", label: "Etapas e Atividades", icon: Package, path: "/entregas", allowedRoles: ["coordenador","backoffice_dr","administrador"], group: "PARAMETRIZAÇÃO", order: 3 },
  { id: "indisponibilidades-dr", label: "Indisponibilidades", icon: CalendarOff, path: "/indisponibilidades-corporativas", allowedRoles: ["backoffice_dr","administrador"], group: "PARAMETRIZAÇÃO", order: 4 },

  // --- 2. Operacionalização do Contrato ---
  { id: "contratos", label: "Contratos", icon: FileText, path: "/contratos", allowedRoles: ["coordenador","backoffice_dr","administrador"], group: "Operacionalização", order: 1 },
  { id: "recursos", label: "Pessoas e Capacidade", icon: Users, path: "/recursos", allowedRoles: ["backoffice_uo","coordenador","administrador"], group: "Operacionalização", order: 2 },
  
  { id: "terceiros", label: "Terceiros", icon: UserPlus, path: "/terceiros", allowedRoles: ["administrador"], group: "Operacionalização", order: 4 },

  // --- Controle ---
  { id: "execucao", label: "Painel do Técnico / Executor", icon: PlayCircle, path: "/execucao", allowedRoles: ["tecnico","coordenador","administrador"], group: "controle", order: 1 },
  { id: "indisponibilidades", label: "Indisponibilidades", icon: CalendarOff, path: "/indisponibilidades", allowedRoles: ["tecnico","backoffice_uo","coordenador","administrador"], group: "controle", order: 2 },
  { id: "mobilidade", label: "Mobilidade", icon: ArrowRightLeft, path: "/mobilidade", allowedRoles: ["coordenador","administrador"], group: "controle", order: 3 },
  { id: "comentarios", label: "Comentários", icon: MessageSquare, path: "/comentarios", allowedRoles: ["tecnico","coordenador","administrador"], group: "controle", order: 4 },

  // --- 4. Gestão e Monitoramento ---
  { id: "relatorios", label: "Relatórios", icon: BarChart3, path: "/relatorios", allowedRoles: ["coordenador","backoffice_dr","backoffice_uo","administrador"], group: "Gestão e Monitoramento", order: 1 },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", allowedRoles: ["tecnico","coordenador","backoffice_dr","backoffice_uo","administrador"], group: "Gestão e Monitoramento", order: 2 },

  // --- Sistema ---
  { id: "admin", label: "Administração", icon: Shield, path: "/admin", allowedRoles: ["administrador"], group: "Sistema", order: 1 },
];

/** Group ordering for display */
const GROUP_ORDER = [
  "Início",
  "PARAMETRIZAÇÃO",
  "Operacionalização",
  "controle",
  "Gestão e Monitoramento",
  "Sistema",
];

/** Coordenador sees PARAMETRIZAÇÃO after Gestão e Monitoramento */
const GROUP_ORDER_COORDENADOR = [
  "Início",
  "Operacionalização",
  "controle",
  "Gestão e Monitoramento",
  "PARAMETRIZAÇÃO",
  "Sistema",
];

export function getNavItemsForRole(role: ProfileRole): NavItem[] {
  return NAV_ITEMS.filter(item => item.allowedRoles.includes(role));
}

export function getGroupedNavItems(role: ProfileRole) {
  const items = getNavItemsForRole(role);
  const groups: Record<string, NavItem[]> = {};
  items.forEach(item => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });
  const order = role === "coordenador" ? GROUP_ORDER_COORDENADOR : GROUP_ORDER;
  const sorted: Record<string, NavItem[]> = {};
  order.forEach(g => {
    if (groups[g]) sorted[g] = groups[g].sort((a, b) => a.order - b.order);
  });
  return sorted;
}

/** Get the nav item for a given path */
export function getNavItemByPath(path: string): NavItem | undefined {
  return NAV_ITEMS.find(item => item.path === path);
}
