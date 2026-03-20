import { Bell, Globe, Power } from "lucide-react";

export function AppHeader() {
  return (
    <header className="h-12 bg-card border-b flex items-center justify-end px-6 gap-4 shrink-0">
      <span className="text-xs text-muted-foreground mr-auto">
        Informações da empresa – <strong>[TRN] SESI DR</strong>
        <span className="ml-2 opacity-60">Versão - 2023.9.2-RC4 | 16:33</span>
      </span>
      <button className="relative">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-status-active text-[9px] font-bold text-primary-foreground flex items-center justify-center">
          0
        </span>
      </button>
      <button className="flex items-center gap-1 text-xs text-muted-foreground">
        <Globe className="w-4 h-4" /> PT
      </button>
      <button>
        <Power className="w-4 h-4 text-muted-foreground" />
      </button>
    </header>
  );
}
