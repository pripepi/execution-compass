import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, CalendarDays } from "lucide-react";
import { CONTRATOS } from "@/data/mockData";
import { useProfile } from "@/contexts/ProfileContext";
import ContratosPage from "@/pages/ContratosPage";

const CONTRACT_VIGENCIA: Record<string, { inicio: string; fim: string }> = {
  "ct-1": { inicio: "01/01/2026", fim: "31/12/2026" },
  "ct-2": { inicio: "01/02/2026", fim: "31/07/2026" },
  "ct-3": { inicio: "01/03/2026", fim: "30/09/2026" },
  "ct-4": { inicio: "01/04/2026", fim: "31/12/2026" },
  "ct-5": { inicio: "01/01/2026", fim: "30/06/2026" },
};

export default function ContratoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const isCoordenador = currentProfile.role === "coordenador";
  const contrato = CONTRATOS.find((c) => c.id === id);

  if (!contrato) {
    return (
      <div className="max-w-7xl flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-lg font-semibold text-foreground">Contrato não encontrado</p>
        <p className="text-sm text-muted-foreground">O contrato solicitado não existe ou foi removido.</p>
        <button
          onClick={() => navigate("/contratos")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar para Contratos
        </button>
      </div>
    );
  }

  const vigencia = id ? CONTRACT_VIGENCIA[id] : null;

  return (
    <div className="max-w-7xl">
      {/* Detail header */}
      <div className="mb-5">
        <button
          onClick={() => navigate("/contratos")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 -ml-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar para Contratos</span>
        </button>
        <h1 className="text-xl font-semibold text-foreground">
          Contrato {contrato.client}
        </h1>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-sm text-muted-foreground">{contrato.code}</p>
          {vigencia && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border">
              <CalendarDays className="w-3 h-3" /> Vigência: {vigencia.inicio} – {vigencia.fim}
            </span>
          )}
        </div>
      </div>

      {/* Render ContratosPage in single-contract mode */}
      <ContratosPage singleContractId={id} />
    </div>
  );
}
