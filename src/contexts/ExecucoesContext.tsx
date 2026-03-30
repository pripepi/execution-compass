import React, { createContext, useContext, useState, ReactNode } from "react";
import { EXECUCOES, Execucao } from "@/data/mockData";

interface ExecucoesContextType {
  execucoes: Execucao[];
  setExecucoes: React.Dispatch<React.SetStateAction<Execucao[]>>;
}

const ExecucoesContext = createContext<ExecucoesContextType | undefined>(undefined);

export function ExecucoesProvider({ children }: { children: ReactNode }) {
  const [execucoes, setExecucoes] = useState<Execucao[]>(EXECUCOES);
  return (
    <ExecucoesContext.Provider value={{ execucoes, setExecucoes }}>
      {children}
    </ExecucoesContext.Provider>
  );
}

export function useExecucoes() {
  const ctx = useContext(ExecucoesContext);
  if (!ctx) throw new Error("useExecucoes must be used within ExecucoesProvider");
  return ctx;
}
