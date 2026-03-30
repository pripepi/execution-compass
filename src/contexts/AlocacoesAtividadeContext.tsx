import React, { createContext, useContext, useState, ReactNode } from "react";
import { ALOCACOES_ATIVIDADE, AlocacaoAtividade } from "@/data/mockData";

interface AlocacoesAtividadeContextType {
  alocacoesAtv: AlocacaoAtividade[];
  setAlocacoesAtv: React.Dispatch<React.SetStateAction<AlocacaoAtividade[]>>;
}

const AlocacoesAtividadeContext = createContext<AlocacoesAtividadeContextType | undefined>(undefined);

export function AlocacoesAtividadeProvider({ children }: { children: ReactNode }) {
  const [alocacoesAtv, setAlocacoesAtv] = useState<AlocacaoAtividade[]>(ALOCACOES_ATIVIDADE);
  return (
    <AlocacoesAtividadeContext.Provider value={{ alocacoesAtv, setAlocacoesAtv }}>
      {children}
    </AlocacoesAtividadeContext.Provider>
  );
}

export function useAlocacoesAtividade() {
  const ctx = useContext(AlocacoesAtividadeContext);
  if (!ctx) throw new Error("useAlocacoesAtividade must be used within AlocacoesAtividadeProvider");
  return ctx;
}
