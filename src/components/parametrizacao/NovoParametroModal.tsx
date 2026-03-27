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
    setEtapas((prev) => prev.filter((e) => e.id !== id));
  };

  const addEtapa = () => {
    setEtapas((prev) => [...prev, createEmptyEtapa()]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Novo Parâmetro</DialogTitle>
        </DialogHeader>

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

        {/* Linha 1: Limite de mobilidade + UO */}
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

        {/* Linha 2: CR + Centro de Custos */}
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

        <Separator />

        {/* Etapas */}
        <div className="space-y-4">
          {etapas.map((etapa, index) => (
            <EtapaBlockComponent
              key={etapa.id}
              etapa={etapa}
              index={index}
              canRemove={etapas.length > 1}
              allEtapas={etapas}
              onUpdate={(updates) => updateEtapa(etapa.id, updates)}
              onRemove={() => removeEtapa(etapa.id)}
            />
          ))}

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

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
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

  // Exclusivity: check how the same etapaId is used in other blocks
  const otherBlocksForSameEtapa = useMemo(
    () => allEtapas.filter((e) => e.id !== etapa.id && e.etapaId === etapa.etapaId && e.etapaId !== ""),
    [allEtapas, etapa.id, etapa.etapaId]
  );

  const hasIndiferenteElsewhere = otherBlocksForSameEtapa.some((e) => e.tipo === "indiferente");
  const hasNovoOrRenovacaoElsewhere = otherBlocksForSameEtapa.some((e) => e.tipo === "novo" || e.tipo === "renovacao");

  // Build disabled tipo map with reasons
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

  // Check if selecting a given etapaId would be blocked (already used as indiferente AND novo/renovacao)
  const isEtapaBlocked = useCallback((etapaId: string) => {
    const others = allEtapas.filter((e) => e.id !== etapa.id && e.etapaId === etapaId && e.etapaId !== "");
    const hasInd = others.some((e) => e.tipo === "indiferente");
    const hasNR = others.some((e) => e.tipo === "novo" || e.tipo === "renovacao");
    // Blocked if both groups exist (shouldn't happen but defensive)
    return hasInd && hasNR;
  }, [allEtapas, etapa.id]);

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
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Etapa {index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4" />
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
              {filteredEtapas.map((ec) => {
                const isSelected = etapa.etapaId === ec.id;
                const blocked = isEtapaBlocked(ec.id);
                return (
                  <button
                    key={ec.id}
                    disabled={blocked}
                    onClick={() => handleSelectEtapa(ec)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between ${
                      blocked ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary" : "border-input"}`}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      {ec.nome}
                    </div>
                    {blocked && <span className="text-[10px] uppercase font-bold text-muted-foreground">Conflito</span>}
                  </button>
                );
              })}
              {filteredEtapas.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma etapa encontrada.</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tipo <span className="text-destructive">*</span>
        </Label>
        <Select
          disabled={!etapa.etapaId}
          value={etapa.tipo}
          onValueChange={(v) => onUpdate({ tipo: v as TipoEtapa })}
        >
          <SelectTrigger>
            <SelectValue placeholder={!etapa.etapaId ? "Selecione a etapa primeiro" : "Selecione o tipo"} />
          </SelectTrigger>
          <SelectContent>
            {tipoOptions.map((t) => {
              const disabledReason = tipoDisabledMap[t.value];
              return (
                <SelectItem
                  key={t.value}
                  value={t.value}
                  disabled={!!disabledReason}
                >
                  {t.label}
                  {disabledReason && (
                    <span className="ml-2 text-xs text-muted-foreground">({disabledReason})</span>
                  )}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {etapa.etapaId && Object.keys(tipoDisabledMap).length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Alguns tipos estão indisponíveis por conflito com outra etapa neste parâmetro.
          </p>
        )}
      </div>

      {/* Dynamic time fields */}
      {etapa.tipo === "novo" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tempo Novo (h)
            </Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={etapa.tempoNovo}
              onChange={(e) => onUpdate({ tempoNovo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tempo Renovação (h)
            </Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={etapa.tempoRenovacao}
              onChange={(e) => onUpdate({ tempoRenovacao: e.target.value })}
            />
          </div>
        </div>
      )}

      {etapa.tipo === "renovacao" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tempo Renovação (h)
            </Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={etapa.tempoRenovacao}
              onChange={(e) => onUpdate({ tempoRenovacao: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tempo Novo (h)
            </Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={etapa.tempoNovo}
              onChange={(e) => onUpdate({ tempoNovo: e.target.value })}
            />
          </div>
        </div>
      )}

      {etapa.tipo === "indiferente" && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tempo (h)
          </Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={etapa.tempoUnico}
            onChange={(e) => onUpdate({ tempoUnico: e.target.value })}
          />
        </div>
      )}

      {/* Atividades multiselect */}
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
