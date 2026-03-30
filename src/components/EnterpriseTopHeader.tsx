import React from "react";
import { Bell, Languages, Power } from "lucide-react";
import { useMobilidade } from "@/contexts/MobilidadeContext";

export function EnterpriseTopHeader() {
  const { notificationCount, clearNotifications } = useMobilidade();
  return (
    <header className="w-full bg-white shrink-0 border-b border-border" style={{ height: 48 }}>
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo */}
        <div className="flex items-center gap-1.5 select-none">
          <span className="text-lg font-bold tracking-tight" style={{ color: "hsl(265 45% 42%)" }}>
            flow
          </span>
          <span className="text-lg font-bold tracking-tight text-muted-foreground">
            executor
          </span>
        </div>

        {/* Right block */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Institutional info */}
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-muted-foreground leading-tight whitespace-nowrap">
              Informações da empresa -{" "}
              <span className="font-semibold text-foreground">[TRN] SESI DR</span>
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight whitespace-nowrap">
              Versão - 2023.9.2-RC4 | 16:33
            </p>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border hidden sm:block" />

          {/* Utility icons */}
          <div className="flex items-center gap-1.5">
            <button className="relative p-1.5 rounded-md hover:bg-accent transition-colors" onClick={clearNotifications}>
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] flex items-center justify-center rounded-full text-[8px] font-bold text-white px-0.5"
                style={{ background: notificationCount > 0 ? "hsl(45 90% 50%)" : "hsl(145 60% 40%)" }}
              >
                {notificationCount}
              </span>
            </button>

            <button className="flex items-center gap-1 p-1.5 rounded-md hover:bg-accent transition-colors">
              <Languages className="w-4 h-4 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground">PT</span>
            </button>

            <button className="p-1.5 rounded-md hover:bg-accent transition-colors">
              <Power className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
