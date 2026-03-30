import { useState, useMemo, useCallback } from "react";
import { Plus, Trash2, X, Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  etapasCadastro,
  servicosList,
  crList,
  uoList,
  centroCustosList,
  type EtapaCadastro,
} from "@/data/servicosMockData";

type TipoEtapa = "novo" | "renovacao" | "indiferente";

interface EtapaBlock {
  id: string;
  etapaId: string;
  tipo: TipoEtapa | "";
  tempoNovo: string;
  tempoRenovacao: string;
  tempoUnico: string;
  atividadesSelecionadas: string[];
}

function createEmptyEtapa(): EtapaBlock {
  return {
    id: crypto.randomUUID(),
    etapaId: "",
    tipo: "",
    tempoNovo: "",
    tempoRenovacao: "",
    tempoUnico: "",
    atividadesSelecionadas: [],
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovoParametroModal({ open, onOpenChange }: Props) {
  const [servico, setServico] = useState("");
  const [limiteMobilidade, setLimiteMobilidade] = useState("");
  const [cr, setCr] = useState("");
  const [uosSelecionadas, setUosSelecionadas] = useState<string[]>([]);
  const [centroCustos, setCentroCustos] = useState("");
  const [etapas, setEtapas] = useState<EtapaBlock[]>([createEmptyEtapa()]);
  const [activeTab, setActiveTab] = useState("servico");

  const uosFiltradas = useMemo(() => {
    if (!cr) return uoList;
    return uoList.filter((u) => u.crId === cr);
  }, [cr]);

  const resetForm = () => {
    setServico("");
    setLimiteMobilidade("");
    setCr("");
    setUosSelecionadas([]);
    setCentroCustos("");
    setEtapas([createEmptyEtapa()]);
    setActiveTab("servico");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const updateEtapa = (id: string, updates: Partial<EtapaBlock>) => {
    setEtapas((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const removeEtapa = (id: string) => {
    setEtapas((prev) => {
      const newEtapas = prev.filter((e) => e.id !== id);
      if (activeTab === id) {
        setActiveTab("servico");
      }
      return newEtapas;
    });
  };

  const addEtapa = () => {
    const newEtapa = createEmptyEtapa();
    setEtapas((prev) => [...prev, newEtapa]);
    setActiveTab(newEtapa.id);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl">Novo Parâmetro</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4">
            <TabsList className="w-full justify-start h-10 bg-transparent border-b rounded-none p-0 gap-6">
              <TabsTrigger 
                value="servico" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-10 text-sm font-medium"
              >
                Serviço
              </TabsTrigger>
              {etapas.map((etapa, index) => (
                <TabsTrigger 
                  key={etapa.id} 
                  value={etapa.id}
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-10 text-sm font-medium"
                >
                  Etapa {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <TabsContent value="servico" className="mt-0 space-y-6">
              {/* Serviço */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Serviço <span className="text-destructive">*</span>
                </Label>
                <Select value={servico} onValueChange={setServico}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicosList.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Linha 2: Limite de mobilidade + UO */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Limite de mobilidade (km) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Ex: 50"
                    value={limiteMobilidade}
                    onChange={(e) => setLimiteMobilidade(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    UO <span className="text-destructive">*</span>
                  </Label>
                  <UoMultiselect
                    uos={uosFiltradas}
                    selected={uosSelecionadas}
                    onChange={setUosSelecionadas}
                  />
                </div>
              </div>

              {/* Linha 3: CR + Centro de Custos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    CR <span className="text-destructive">*</span>
                  </Label>
                  <Select value={cr} onValueChange={(v) => { setCr(v); setUosSelecionadas([]); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {crList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Centro de Custos
                  </Label>
                  <Select value={centroCustos} onValueChange={setCentroCustos}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {centroCustosList.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEtapa}
                  className="gap-2 w-full border-dashed"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar etapa
                </Button>
              </div>
            </TabsContent>

            {etapas.map((etapa, index) => (
              <TabsContent key={etapa.id} value={etapa.id} className="mt-0">
                <div className="space-y-6">
                  <EtapaBlockComponent
                    etapa={etapa}
                    index={index}
                    canRemove={etapas.length > 1}
                    allEtapas={etapas}
                    onUpdate={(updates) => updateEtapa(etapa.id, updates)}
                    onRemove={() => removeEtapa(etapa.id)}
                  />
                  
                  <div className="pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEtapa}
                      className="gap-2 w-full border-dashed"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar etapa
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <DialogFooter className="p-6 border-t flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={handleClose}>
            Salvar como rascunho
          </Button>
          <Button onClick={handleClose}>Salvar parâmetro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Etapa Block ─── */

function EtapaBlockComponent({
  etapa,
  index,
  canRemove,
  allEtapas,
  onUpdate,
  onRemove,
}: {
  etapa: EtapaBlock;
  index: number;
  canRemove: boolean;
  allEtapas: EtapaBlock[];
  onUpdate: (updates: Partial<EtapaBlock>) => void;
  onRemove: () => void;
}) {
  const [etapaSearch, setEtapaSearch] = useState("");
  const [etapaPopoverOpen, setEtapaPopoverOpen] = useState(false);

  const otherBlocksForSameEtapa = useMemo(
    () => allEtapas.filter((e) => e.id !== etapa.id && e.etapaId === etapa.etapaId && e.etapaId !== ""),
    [allEtapas, etapa.id, etapa.etapaId]
  );

  const hasIndiferenteElsewhere = otherBlocksForSameEtapa.some((e) => e.tipo === "indiferente");
  const hasNovoOrRenovacaoElsewhere = otherBlocksForSameEtapa.some((e) => e.tipo === "novo" || e.tipo === "renovacao");

  const tipoDisabledMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (hasIndiferenteElsewhere) {
      map["novo"] = "Etapa já cadastrada como Indiferente neste parâmetro";
      map["renovacao"] = "Etapa já cadastrada como Indiferente neste parâmetro";
    }
    if (hasNovoOrRenovacaoElsewhere) {
      map["indiferente"] = "Etapa já cadastrada como Novo/Renovação neste parâmetro";
    }
    return map;
  }, [hasIndiferenteElsewhere, hasNovoOrRenovacaoElsewhere]);

  const filteredEtapas = useMemo(() => {
    let list = etapasCadastro;
    if (etapaSearch.trim()) {
      const q = etapaSearch.toLowerCase();
      list = list.filter((e) => e.nome.toLowerCase().includes(q));
    }
    return list;
  }, [etapaSearch]);

  const selectedEtapaCadastro = etapasCadastro.find(
    (e) => e.id === etapa.etapaId
  );

  const handleSelectEtapa = (ec: EtapaCadastro) => {
    onUpdate({ etapaId: ec.id, tipo: "", atividadesSelecionadas: [], tempoNovo: "", tempoRenovacao: "", tempoUnico: "" });
    setEtapaPopoverOpen(false);
    setEtapaSearch("");
  };

  const tipoOptions: { value: TipoEtapa; label: string }[] = [
    { value: "novo", label: "Novo" },
    { value: "renovacao", label: "Renovação" },
    { value: "indiferente", label: "Indiferente" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Configurações da Etapa {index + 1}</h3>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remover
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Etapa <span className="text-destructive">*</span>
        </Label>
        <Popover open={etapaPopoverOpen} onOpenChange={setEtapaPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between font-normal"
            >
              {selectedEtapaCadastro ? selectedEtapaCadastro.nome : "Selecione uma etapa"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <div className="p-2">
              <Input
                placeholder="Buscar etapa..."
                value={etapaSearch}
                onChange={(e) => setEtapaSearch(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredEtapas.map((ec) => (
                <button
                  key={ec.id}
                  onClick={() => handleSelectEtapa(ec)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                >
                  {ec.nome}
                  {etapa.etapaId === ec.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
              {filteredEtapas.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma etapa encontrada.</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {etapa.etapaId && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tipo <span className="text-destructive">*</span>
            </Label>
            <Select value={etapa.tipo} onValueChange={(v) => onUpdate({ tipo: v as TipoEtapa })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo primeiro" />
              </SelectTrigger>
              <SelectContent>
                {tipoOptions.map((opt) => {
                  const disabledReason = tipoDisabledMap[opt.value];
                  return (
                    <SelectItem 
                      key={opt.value} 
                      value={opt.value}
                      disabled={!!disabledReason}
                    >
                      {opt.label} {disabledReason && `(${disabledReason})`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {etapa.tipo && (
            <div className="grid grid-cols-2 gap-4">
              {etapa.tipo === "indiferente" ? (
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tempo Único (min) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={etapa.tempoUnico}
                    onChange={(e) => onUpdate({ tempoUnico: e.target.value })}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tempo Novo (min) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={etapa.tempoNovo}
                      onChange={(e) => onUpdate({ tempoNovo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tempo Renovação (min) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={etapa.tempoRenovacao}
                      onChange={(e) => onUpdate({ tempoRenovacao: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {selectedEtapaCadastro && (
        <AtividadesMultiselect
          atividades={selectedEtapaCadastro.atividades}
          selected={etapa.atividadesSelecionadas}
          onChange={(ids) => onUpdate({ atividadesSelecionadas: ids })}
        />
      )}
    </div>
  );
}

/* ─── Atividades Multiselect ─── */

function AtividadesMultiselect({
  atividades,
  selected,
  onChange,
}: {
  atividades: { id: string; nome: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return atividades;
    const q = search.toLowerCase();
    return atividades.filter((a) => a.nome.toLowerCase().includes(q));
  }, [search, atividades]);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

  const selectedNames = atividades.filter((a) => selected.includes(a.id));

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Atividades
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal h-auto min-h-10"
          >
            <span className="flex flex-wrap gap-1 flex-1 text-left">
              {selectedNames.length > 0 ? (
                selectedNames.map((a) => (
                  <Badge
                    key={a.id}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {a.nome}
                    <button
                      type="button"
                      className="ml-1 hover:text-destructive"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggle(a.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">
                  Selecione atividades...
                </span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2">
            <Input
              placeholder="Buscar atividade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((a) => {
              const isSelected = selected.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-input"
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                  {a.nome}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Nenhuma atividade encontrada.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ─── UO Multiselect ─── */

function UoMultiselect({
  uos,
  selected,
  onChange,
}: {
  uos: { id: string; nome: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return uos;
    const q = search.toLowerCase();
    return uos.filter((u) => u.nome.toLowerCase().includes(q));
  }, [search, uos]);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

  const selectedNames = uos.filter((u) => selected.includes(u.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal h-auto min-h-10"
        >
          <span className="flex flex-wrap gap-1 flex-1 text-left truncate">
            {selectedNames.length > 0 ? (
              selectedNames.map((u) => (
                <Badge key={u.id} variant="secondary" className="text-xs font-normal">
                  {u.nome}
                  <button
                    type="button"
                    className="ml-1 hover:text-destructive"
                    onClick={(ev) => { ev.stopPropagation(); toggle(u.id); }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">Selecione uma ou mais UOs</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="Buscar UO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filtered.map((u) => {
            const isSelected = selected.includes(u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggle(u.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-primary border-primary" : "border-input"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                {u.nome}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma UO encontrada.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
