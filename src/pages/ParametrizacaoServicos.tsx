import { useState, useMemo } from "react";
import { Plus, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { servicosParametrosMock } from "@/data/servicosMockData";
import { NovoParametroModal } from "@/components/parametrizacao/NovoParametroModal";

type TabFilter = "todos" | "ativo" | "rascunho" | "inativo";
type ViewTab = "catalogo" | "arvore";

export default function ParametrizacaoServicos() {
  const [viewTab, setViewTab] = useState<ViewTab>("catalogo");
  const [tabFilter, setTabFilter] = useState<TabFilter>("todos");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const totals = useMemo(() => {
    const ativos = servicosParametrosMock.filter((s) => s.status === "Ativo").length;
    const rascunho = servicosParametrosMock.filter((s) => s.status === "Rascunho").length;
    return { total: servicosParametrosMock.length, ativos, rascunho };
  }, []);

  const filtered = useMemo(() => {
    let list = servicosParametrosMock;
    if (tabFilter !== "todos") {
      const statusMap: Record<TabFilter, string> = {
        todos: "",
        ativo: "Ativo",
        rascunho: "Rascunho",
        inativo: "Inativo",
      };
      list = list.filter((s) => s.status === statusMap[tabFilter]);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.nome.toLowerCase().includes(q) ||
          s.codigo.toLowerCase().includes(q) ||
          s.crUo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tabFilter, search]);

  const summaryCards = [
    { label: "TOTAL DE SERVIÇOS", value: totals.total, accent: "hsl(var(--status-info))" },
    { label: "ATIVOS", value: totals.ativos, accent: "hsl(var(--status-active))" },
    { label: "RASCUNHO", value: totals.rascunho, accent: "hsl(var(--status-warning))" },
  ];

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "ativo", label: "Ativo" },
    { key: "rascunho", label: "Rascunho" },
    { key: "inativo", label: "Inativo" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Parâmetros de Serviços</h1>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Parâmetro
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-lg border p-5"
            style={{ borderTopWidth: 3, borderTopColor: card.accent }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {card.label}
            </p>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* View tabs + filter tabs + search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* View tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setViewTab("catalogo")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                viewTab === "catalogo"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Catálogo
            </button>
            <button
              onClick={() => setViewTab("arvore")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                viewTab === "arvore"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              🌳 Árvore Hierárquica
            </button>
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTabFilter(t.key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  tabFilter === t.key
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Código
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Serviço
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CR / UO
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Etapas
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Versão
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-sm text-muted-foreground">{s.codigo}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{s.nome}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{s.crUo}</td>
                <td className="px-4 py-3 text-sm text-center text-foreground">{s.etapas}</td>
                <td className="px-4 py-3 text-sm text-center text-muted-foreground">{s.versao}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-4 py-3">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum serviço encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NovoParametroModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
