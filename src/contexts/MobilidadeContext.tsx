import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { MOBILIDADES, Mobilidade, RECURSOS } from "@/data/mockData";

interface MobilidadeContextType {
  mobilidades: Mobilidade[];
  notificationCount: number;
  clearNotifications: () => void;
  approveMobilidade: (id: string, resourceId?: string) => void;
  rejectMobilidade: (id: string) => void;
  setMobilidades: React.Dispatch<React.SetStateAction<Mobilidade[]>>;
}

const MobilidadeContext = createContext<MobilidadeContextType | undefined>(undefined);

export function MobilidadeProvider({ children }: { children: ReactNode }) {
  const [mobilidades, setMobilidades] = useState<Mobilidade[]>(MOBILIDADES);
  const [notificationCount, setNotificationCount] = useState(0);

  const approveMobilidade = useCallback((id: string, resourceId?: string) => {
    setMobilidades((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated: Mobilidade = {
          ...m,
          status: "aprovada" as const,
          timeline: [
            ...m.timeline,
            {
              id: `mt-${Date.now()}`,
              action: "Mobilidade aprovada",
              user: "Coordenador",
              date: "11/03/2026 10:00",
            },
          ],
        };
        if (resourceId) {
          const rec = RECURSOS.find((r) => r.id === resourceId);
          if (rec) {
            updated.resource = rec.name;
            updated.resourceId = resourceId;
          }
        }
        return updated;
      })
    );
  }, []);

  const rejectMobilidade = useCallback((id: string) => {
    setMobilidades((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status: "rejeitada" as const,
              timeline: [
                ...m.timeline,
                {
                  id: `mt-${Date.now()}`,
                  action: "Mobilidade rejeitada",
                  user: "Coordenador",
                  date: "11/03/2026 10:00",
                },
                {
                  id: `mt-${Date.now() + 1}`,
                  action: "→ Avaliar solicitação de terceiro",
                  user: "Sistema",
                  date: "11/03/2026 10:01",
                  detail: "Sem recurso interno — escalonamento sugerido",
                },
              ],
            }
          : m
      )
    );
    setNotificationCount((prev) => prev + 1);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotificationCount(0);
  }, []);

  return (
    <MobilidadeContext.Provider
      value={{
        mobilidades,
        notificationCount,
        clearNotifications,
        approveMobilidade,
        rejectMobilidade,
        setMobilidades,
      }}
    >
      {children}
    </MobilidadeContext.Provider>
  );
}

export function useMobilidade() {
  const context = useContext(MobilidadeContext);
  if (!context) throw new Error("useMobilidade must be used within MobilidadeProvider");
  return context;
}
