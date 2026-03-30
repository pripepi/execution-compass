import React, { createContext, useContext, useState, ReactNode } from "react";

interface DetailPanelContextType {
  panelContent: ReactNode | null;
  panelTitle: string;
  openPanel: (title: string, content: ReactNode) => void;
  closePanel: () => void;
  isOpen: boolean;
}

const DetailPanelContext = createContext<DetailPanelContextType | undefined>(undefined);

export function DetailPanelProvider({ children }: { children: ReactNode }) {
  const [panelContent, setPanelContent] = useState<ReactNode | null>(null);
  const [panelTitle, setPanelTitle] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const openPanel = (title: string, content: ReactNode) => {
    setPanelTitle(title);
    setPanelContent(content);
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
    setTimeout(() => {
      setPanelContent(null);
      setPanelTitle("");
    }, 250);
  };

  return (
    <DetailPanelContext.Provider value={{ panelContent, panelTitle, openPanel, closePanel, isOpen }}>
      {children}
    </DetailPanelContext.Provider>
  );
}

export function useDetailPanel() {
  const ctx = useContext(DetailPanelContext);
  if (!ctx) throw new Error("useDetailPanel must be used within DetailPanelProvider");
  return ctx;
}
