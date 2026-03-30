import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProfile, PROFILES } from "@/contexts/ProfileContext";
import { getGroupedNavItems } from "@/config/navigation";
import { ChevronDown } from "lucide-react";

/** Flow chain displayed in sidebar */
const FLOW_STEPS = [
"Serviço",
"Entrega",
"Atividade",
"Cargo",
"Padrão",
"Contrato",
"Pessoa",
"Alocação",
"Painel do Técnico / Executor"];


export function AppSidebar() {
  const { currentProfile, setCurrentProfile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const groups = getGroupedNavItems(currentProfile.role);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [flowOpen] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  const homeItems = currentProfile.role === "backoffice_dr" ? [] : (groups["Início"] ?? []);
  const collapsibleGroups = Object.entries(groups).filter(([group]) => group !== "Início" && !(currentProfile.role === "backoffice_dr" && group === "Início"));

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <aside className="w-[240px] h-full flex flex-col shrink-0 overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(265 45% 38%) 0%, hsl(265 45% 44%) 100%)" }}>
      <div className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/15">
            <span className="font-bold text-xs tracking-tight text-white">GR</span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white leading-none">Gestão de Recursos</p>
            <p className="text-[10px] mt-0.5 text-white/60">Flow MV</p>
          </div>
        </div>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors bg-white/10">
          
          <div className="flex flex-col items-start">
            <span className="text-[9px] text-white/50 uppercase tracking-wider font-medium">Perfil ativo</span>
            <span className="text-[12px] font-medium text-white mt-0.5">{currentProfile.label}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
        </button>
        {profileOpen &&
        <div className="mt-1.5 rounded-lg bg-white/10 p-1 space-y-0.5">
            {PROFILES.map((p) =>
          <button
            key={p.role}
            onClick={() => {
              setCurrentProfile(p);
              setProfileOpen(false);
              navigate(p.role === "backoffice_dr" ? "/parametrizacao" : "/");
            }}
            className={`w-full text-left px-3 py-1.5 rounded-md text-[12px] transition-colors ${
            currentProfile.role === p.role ?
            "bg-white text-sidebar-accent-foreground font-medium" :
            "text-white/80 hover:text-white hover:bg-white/10"}`
            }>
            
                {p.label}
              </button>
          )}
          </div>
        }
      </div>

      <div className="px-3 pb-3">
        {flowOpen &&
        <div className="px-3 mt-1 flex flex-wrap gap-1">
            {FLOW_STEPS.map((step, i) =>
          <React.Fragment key={step}>
                <span className="text-[9px] text-white/70 font-medium">{step}</span>
                {i < FLOW_STEPS.length - 1 && <span className="text-[9px] text-white/30">→</span>}
              </React.Fragment>
          )}
          </div>
        }
      </div>

      <div className="mx-5 border-t border-white/10" />

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-4 border-none">
        {homeItems.length > 0 &&
        <div className="space-y-0.5">
            {homeItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                isActive ?
                "bg-white text-sidebar-accent-foreground font-medium shadow-sm" :
                "text-white/80 hover:text-white hover:bg-white/10"}`
                }>
                
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>);

          })}
          </div>
        }

        {collapsibleGroups.map(([group, items], index) => {
          const isOpen = !!openGroups[group];
          const hasActiveItem = items.some((item) => location.pathname === item.path);
          const groupNumber = String(index + 1);

          return (
            <div key={group} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className={`w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                hasActiveItem ? "bg-white/10 text-white" : "text-white/80 hover:text-white hover:bg-white/10"}`
                }>
                
                <span className="w-4 h-4 rounded bg-white/15 flex items-center justify-center text-[9px] font-bold text-white/50 shrink-0">
                  {groupNumber}
                </span>
                <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-current/70">
                  {group}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen &&
              <div className="space-y-0.5 pl-6">
                  {items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] transition-all duration-200 ${
                      isActive ?
                      "bg-white text-sidebar-accent-foreground font-medium shadow-sm" :
                      "text-white/80 hover:text-white hover:bg-white/10"}`
                      }>
                      
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.id === "execucao" ? (currentProfile.role === "coordenador" ? "Acompanhamento" : currentProfile.role === "tecnico" ? "Execução" : item.label) : item.id === "recursos" && currentProfile.role === "coordenador" ? "Recursos e Capacidade" : item.label}</span>
                      </button>);

                })}
                </div>
              }
            </div>);

        })}
      </nav>

      <div className="px-5 py-3 border-t border-white/10">
        <p className="text-[10px] text-white/40">Protótipo v1.0

        </p>
      </div>
    </aside>);}