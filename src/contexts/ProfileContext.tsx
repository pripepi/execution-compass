import React, { createContext, useContext, useState, ReactNode } from "react";
import { UOS, CONTRATOS, SERVICOS } from "@/data/mockData";

export type ProfileRole = "tecnico" | "coordenador" | "backoffice_dr" | "backoffice_uo" | "administrador";

export interface Profile {
  role: ProfileRole;
  label: string;
  shortLabel: string;
}

export const PROFILES: Profile[] = [
  { role: "backoffice_dr", label: "Gestão Corporativa (DR)", shortLabel: "GC DR" },
  { role: "coordenador", label: "Coordenador", shortLabel: "Coord." },
  { role: "backoffice_uo", label: "BackOffice UO", shortLabel: "BO UO" },
  { role: "tecnico", label: "Técnico / Executor", shortLabel: "Técnico" },
  { role: "administrador", label: "", shortLabel: "Admin" },
];

/** Operational context: selected UO, Contract, Service */
export interface OperationalContext {
  uoId: string;
  uoName: string;
  contractId: string | null;
  contractCode: string | null;
  serviceId: string | null;
  serviceName: string | null;
}

interface ProfileContextType {
  currentProfile: Profile;
  setCurrentProfile: (profile: Profile) => void;
  operationalContext: OperationalContext;
  setOperationalContext: (ctx: Partial<OperationalContext>) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const DEFAULT_CONTEXT: OperationalContext = {
  uoId: UOS[0].id,
  uoName: UOS[0].name,
  contractId: CONTRATOS[0].id,
  contractCode: CONTRATOS[0].code,
  serviceId: null,
  serviceName: null,
};

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [currentProfile, setCurrentProfile] = useState<Profile>(PROFILES[0]);
  const [operationalContext, setOpCtx] = useState<OperationalContext>(DEFAULT_CONTEXT);

  const setOperationalContext = (partial: Partial<OperationalContext>) => {
    setOpCtx(prev => ({ ...prev, ...partial }));
  };

  return (
    <ProfileContext.Provider value={{ currentProfile, setCurrentProfile, operationalContext, setOperationalContext }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
