import React, { useState } from "react";
import { PageHeader, DataCard, ValidarBadge } from "@/components/ui-custom/StatusBadge";
import { Download, Filter } from "lucide-react";
import { RECURSOS, SERVICOS, CONTRATOS } from "@/data/mockData";
import { toast } from "sonner";

const mockRelatorio = [
{ resource: "Carlos Silva", service: "SST-001", contract: "#1024", hoursPlanned: "40h", hoursExecuted: "38h", hoursUnavailable: "8h", period: "Mar/2026", uo: "UO Porto Alegre" },
{ resource: "Ana Paula Souza", service: "HO-002", contract: "#1031", hoursPlanned: "32h", hoursExecuted: "30h", hoursUnavailable: "2h", period: "Mar/2026", uo: "UO Caxias do Sul" },
{ resource: "João Pereira", service: "SST-001", contract: "#1024", hoursPlanned: "24h", hoursExecuted: "20h", hoursUnavailable: "4h", period: "Mar/2026", uo: "UO Canoas" },
{ resource: "Maria Fernandes", service: "CSST-003", contract: "#1018", hoursPlanned: "16h", hoursExecuted: "14h", hoursUnavailable: "0h", period: "Mar/2026", uo: "UO Porto Alegre" }];


export default function RelatoriosPage() {
  const [competencia, setCompetencia] = useState("Mar/2026");
  const [uoFilter, setUoFilter] = useState("Todas");

  const filtered = mockRelatorio.filter((r) => {
    if (uoFilter !== "Todas" && r.uo !== uoFilter) return false;
    return r.period === competencia;
  });

  const totalPlanned = filtered.reduce((acc, r) => acc + parseInt(r.hoursPlanned), 0);
  const totalExecuted = filtered.reduce((acc, r) => acc + parseInt(r.hoursExecuted), 0);
  const totalUnavailable = filtered.reduce((acc, r) => acc + parseInt(r.hoursUnavailable), 0);
  const aproveitamento = totalPlanned > 0 ? Math.round(totalExecuted / totalPlanned * 100) : 0;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Relatórios Operacionais"
        description="Relatórios de horas para produção e acompanhamento de execução"
        actions={
        <div className="flex gap-2">
            <button onClick={() => toast.info("Filtros avançados em desenvolvimento")} className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-md text-sm hover:bg-accent">
              <Filter className="w-4 h-4" /> Filtros
            </button>
            <button onClick={() => toast.success("Relatório exportado")} className="flex items-center gap-2 px-4 py-2 text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 bg-sidebar">
              <Download className="w-4 h-4" /> Exportar
            </button>
          </div>
        } />
      

      <div className="grid grid-cols-4 gap-4 mb-6">
        <DataCard label="Total horas planejadas" value={`${totalPlanned}h`} />
        <DataCard label="Total horas executadas" value={`${totalExecuted}h`} variant="success" />
        <DataCard label="Horas indisponíveis" value={`${totalUnavailable}h`} variant="warning" />
        <DataCard label="Aproveitamento" value={`${aproveitamento}%`} variant={aproveitamento >= 85 ? "success" : "warning"} sublabel="Meta: 85%" />
      </div>

      <div className="flex gap-2 mb-4">
        <select value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="border border-input rounded-md text-xs p-2 bg-background">
          <option value="Mar/2026">Competência: Mar/2026</option>
          <option value="Fev/2026">Competência: Fev/2026</option>
          <option value="Jan/2026">Competência: Jan/2026</option>
        </select>
        <select value={uoFilter} onChange={(e) => setUoFilter(e.target.value)} className="border border-input rounded-md text-xs p-2 bg-background">
          <option value="Todas">Todas as UOs</option>
          <option value="UO Porto Alegre">UO Porto Alegre</option>
          <option value="UO Caxias do Sul">UO Caxias do Sul</option>
          <option value="UO Canoas">UO Canoas</option>
        </select>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Recurso</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Serviço</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Contrato</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Previsto</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Executado</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Indisponível</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Competência</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r, i) =>
            <tr key={i} className="hover:bg-accent/50">
                <td className="px-4 py-3 font-medium text-foreground">{r.resource}</td>
                <td className="px-4 py-3 font-data text-xs">{r.service}</td>
                <td className="px-4 py-3 font-data text-xs">{r.contract}</td>
                <td className="px-4 py-3 text-right font-data">{r.hoursPlanned}</td>
                <td className="px-4 py-3 text-right font-data">{r.hoursExecuted}</td>
                <td className="px-4 py-3 text-right font-data">{r.hoursUnavailable}</td>
                <td className="px-4 py-3 text-xs">{r.period}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2">
        <ValidarBadge>Relação entre "Relatórios de horas" e "Enviar dados para boletim de produção" (Parking-lot)</ValidarBadge>
        <br />
        <ValidarBadge>Integração com base de produção e ERP para geração automática de relatórios</ValidarBadge>
      </div>
    </div>);

}