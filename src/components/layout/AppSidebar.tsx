import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  FileText,
  Users,
  Eye,
  AlertCircle,
  ArrowRightLeft,
  MessageSquare,
  BarChart3,
  LayoutDashboard,
  Wrench,
  Building2,
  Settings,
  ChevronDown,
  ChevronRight,
  Power,
} from "lucide-react";

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path?: string;
}

interface MenuSection {
  number: number;
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    number: 1,
    title: "OPERACIONALIZAÇÃO",
    items: [
      { label: "Contratos", icon: FileText, path: "/contratos" },
      { label: "Recursos e Capacidade", icon: Users, path: "/recursos" },
    ],
  },
  {
    number: 2,
    title: "CONTROLE",
    items: [
      { label: "Acompanhamento", icon: Eye, path: "/" },
      { label: "Indisponibilidades", icon: AlertCircle, path: "/indisponibilidades" },
      { label: "Mobilidade", icon: ArrowRightLeft, path: "/mobilidade" },
      { label: "Comentários", icon: MessageSquare, path: "/comentarios" },
    ],
  },
  {
    number: 3,
    title: "GESTÃO E MONITORAMENTO",
    items: [
      { label: "Relatórios", icon: BarChart3, path: "/relatorios" },
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    ],
  },
  {
    number: 4,
    title: "PARAMETRIZAÇÃO",
    items: [
      { label: "Serviços", icon: Wrench, path: "/servicos" },
      { label: "Cadastro de Cargos", icon: Building2, path: "/cargos" },
      { label: "Etapas e Atividades", icon: Settings, path: "/etapas-atividades" },
    ],
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<number[]>([1, 2, 3, 4]);

  const toggleSection = (num: number) => {
    setExpandedSections((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-[220px] min-h-screen bg-sidebar flex flex-col text-sidebar-foreground shrink-0">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-md bg-sidebar-active flex items-center justify-center text-xs font-bold text-sidebar-active-foreground">
            GR
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Gestão de Recursos</div>
            <div className="text-xs opacity-70">Flow MV</div>
          </div>
        </div>
        <div className="bg-sidebar-muted rounded-md px-3 py-2 text-xs">
          <div className="opacity-70 text-[10px] uppercase tracking-wider">Perfil Ativo</div>
          <div className="font-medium flex items-center justify-between">
            Coordenador
            <ChevronDown className="w-3 h-3 opacity-60" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 pb-4 overflow-y-auto scrollbar-thin">
        {/* Home */}
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-sidebar-muted transition-colors mb-1"
        >
          <Home className="w-4 h-4" />
          Home
        </button>

        {menuSections.map((section) => (
          <div key={section.number} className="mt-3">
            <button
              onClick={() => toggleSection(section.number)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity"
            >
              <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px]">
                {section.number}
              </span>
              <span className="flex-1 text-left">{section.title}</span>
              {expandedSections.includes(section.number) ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>

            {expandedSections.includes(section.number) && (
              <div className="mt-0.5 space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.label}
                      onClick={() => item.path && navigate(item.path)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? "bg-sidebar-active text-sidebar-active-foreground font-medium"
                          : "hover:bg-sidebar-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 text-[10px] opacity-50">Protótipo v1.0</div>
    </aside>
  );
}
