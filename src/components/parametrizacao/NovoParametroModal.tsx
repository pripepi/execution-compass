import { useState, useMemo } from "react";
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
  const [etapas, setEtapas] = useState<EtapaBlock[]>([createEmptyEtapa()]);

  const resetForm = () => {
    setServico("");
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

        <Separator />

        {/* Etapas */}
        <div className="space-y-4">
          {etapas.map((etapa, index) => (
            <EtapaBlockComponent
              key={etapa.id}
              etapa={etapa}
              index={index}
              canRemove={etapas.length > 1}
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
  onUpdate,
  onRemove,
}: {
  etapa: EtapaBlock;
  index: number;
  canRemove: boolean;
  onUpdate: (updates: Partial<EtapaBlock>) => void;
  onRemove: () => void;
}) {
  const [etapaSearch, setEtapaSearch] = useState("");
  const [etapaPopoverOpen, setEtapaPopoverOpen] = useState(false);

  const filteredEtapas = useMemo(() => {
    if (!etapaSearch.trim()) return etapasCadastro;
    const q = etapaSearch.toLowerCase();
    return etapasCadastro.filter((e) => e.nome.toLowerCase().includes(q));
  }, [etapaSearch]);

  const selectedEtapaCadastro = etapasCadastro.find(
    (e) => e.id === etapa.etapaId
  );

  const handleSelectEtapa = (ec: EtapaCadastro) => {
    onUpdate({ etapaId: ec.id, atividadesSelecionadas: [] });
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
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Etapa select with search */}
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
              {selectedEtapaCadastro
                ? selectedEtapaCadastro.nome
                : "Selecione uma etapa"}
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
            <div className="max-h-48 overflow-y-auto">
              {filteredEtapas.map((ec) => (
                <button
                  key={ec.id}
                  onClick={() => handleSelectEtapa(ec)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                    etapa.etapaId === ec.id ? "bg-accent/60 font-medium" : ""
                  }`}
                >
                  {etapa.etapaId === ec.id && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                  <span className={etapa.etapaId === ec.id ? "" : "ml-5.5"}>
                    {ec.nome}
                  </span>
                </button>
              ))}
              {filteredEtapas.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhuma etapa encontrada.
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tipo da etapa */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tipo <span className="text-destructive">*</span>
        </Label>
        <Select
          value={etapa.tipo}
          onValueChange={(v) =>
            onUpdate({
              tipo: v as TipoEtapa,
              tempoNovo: "",
              tempoRenovacao: "",
              tempoUnico: "",
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {tipoOptions.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
