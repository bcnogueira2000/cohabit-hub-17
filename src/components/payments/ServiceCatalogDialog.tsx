import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Moon, Package, Pencil, Plane, Plus, Shirt, Sparkles, Tag, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCreateService, useServiceCatalog, useUpdateService, type ServiceItem } from "@/hooks/usePayments";

const UNITS = ["unidade", "hora", "noite", "dia", "viagem", "mês"];
const OTHER = "__other";
const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

const iconFor = (name: string): LucideIcon => {
  const n = name.toLowerCase();
  if (n.includes("limpeza")) return Sparkles;
  if (n.includes("kit")) return Package;
  if (n.includes("noite") || n.includes("visita")) return Moon;
  if (n.includes("lavagem") || n.includes("roupa")) return Shirt;
  if (n.includes("transfer") || n.includes("aeroporto")) return Plane;
  return Tag;
};

const ServiceCard = ({ s, onEdit }: { s: ServiceItem; onEdit: () => void }) => {
  const update = useUpdateService();
  const Icon = iconFor(s.name);
  const toggle = async (active: boolean) => {
    try {
      await update.mutateAsync({ id: s.id, name: s.name, unitLabel: s.unitLabel, defaultPrice: s.defaultPrice, vatRate: s.vatRate, active });
      toast({ title: active ? "Serviço ativado" : "Serviço desativado" });
    } catch (e: any) { toast({ title: "Não foi possível guardar", description: e?.message, variant: "destructive" }); }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(); } }}
      className={cn(
        "group relative flex gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !s.active && "opacity-60",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{s.name}</span>
          {!s.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Inativo</span>}
        </div>
        {s.defaultPrice > 0 ? (
          <div className="text-sm text-muted-foreground mt-0.5">
            <span className="font-display font-semibold text-foreground">{eur(s.defaultPrice)}</span> / {s.unitLabel}
          </div>
        ) : (
          <div className="text-xs text-warning mt-1">Sem preço definido</div>
        )}
      </div>
      <div className="flex flex-col items-end justify-between gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <Switch checked={s.active} onCheckedChange={toggle} disabled={update.isPending} aria-label={s.active ? "Desativar serviço" : "Ativar serviço"} />
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} aria-label="Editar serviço">
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
};

type Form = { name: string; price: string; unit: string; customUnit: string; description: string; vat: string };

const toForm = (s?: ServiceItem): Form => {
  const unit = s?.unitLabel ?? "unidade";
  const known = UNITS.includes(unit);
  return {
    name: s?.name ?? "", price: s ? String(s.defaultPrice) : "", unit: known ? unit : OTHER, customUnit: known ? "" : unit,
    description: s?.description ?? "", vat: s?.vatRate == null ? "" : String(s.vatRate),
  };
};

const validate = (f: Form) => {
  const e: Partial<Record<keyof Form, string>> = {};
  if (!f.name.trim()) e.name = "O nome é obrigatório";
  const price = Number(f.price.replace(",", "."));
  if (f.price.trim() === "" || isNaN(price) || price < 0) e.price = "Indica um preço igual ou superior a 0";
  if (f.unit === OTHER && !f.customUnit.trim()) e.customUnit = "Indica a unidade";
  if (f.vat.trim() !== "") {
    const v = Number(f.vat.replace(",", "."));
    if (isNaN(v) || v < 0 || v > 100) e.vat = "Entre 0 e 100, ou vazio";
  }
  return e;
};

const ServiceForm = ({ service, services, onDone }: { service?: ServiceItem; services: ServiceItem[]; onDone: () => void }) => {
  const update = useUpdateService();
  const create = useCreateService();
  const initial = useMemo(() => toForm(service), [service]);
  const [f, setF] = useState<Form>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const [advanced, setAdvanced] = useState(false);
  const errors = validate(f);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const pending = update.isPending || create.isPending;
  const set = (k: keyof Form, v: string) => { setF({ ...f, [k]: v }); setTouched({ ...touched, [k]: true }); };
  const err = (k: keyof Form) => touched[k] && errors[k] ? <p className="text-xs text-destructive mt-1">{errors[k]}</p> : null;

  const save = async () => {
    setTouched({ name: true, price: true, customUnit: true, vat: true });
    if (Object.keys(errors).length) return;
    const payload = {
      name: f.name.trim(), unitLabel: f.unit === OTHER ? f.customUnit.trim() : f.unit,
      defaultPrice: Number(f.price.replace(",", ".")), vatRate: f.vat.trim() === "" ? null : Number(f.vat.replace(",", ".")),
      description: f.description,
    };
    try {
      if (service) await update.mutateAsync({ id: service.id, active: service.active, ...payload });
      else await create.mutateAsync({ ...payload, existingCodes: services.map((s) => s.code), sortOrder: Math.max(0, ...services.map((s) => s.sortOrder)) + 1 });
      toast({ title: service ? "Serviço guardado" : "Serviço criado" });
      onDone();
    } catch (e: any) { toast({ title: "Não foi possível guardar", description: e?.message, variant: "destructive" }); }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={onDone}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>
      <h3 className="font-display text-lg font-semibold">{service ? "Editar serviço" : "Novo serviço"}</h3>

      <div>
        <Label htmlFor="svc-name">Nome</Label>
        <Input id="svc-name" autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Lavagem de roupa de cama" />
        {err("name")}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="svc-price">Preço</Label>
          <div className="relative">
            <Input id="svc-price" type="number" step="0.01" min="0" className="pr-8" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="0,00" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
          </div>
          {err("price")}
        </div>
        <div>
          <Label>Unidade</Label>
          <Select value={f.unit} onValueChange={(v) => set("unit", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              <SelectItem value={OTHER}>Outra…</SelectItem>
            </SelectContent>
          </Select>
          {f.unit === OTHER && (
            <Input className="mt-2" value={f.customUnit} onChange={(e) => set("customUnit", e.target.value)} placeholder="Ex.: semana" aria-label="Outra unidade" />
          )}
          {err("customUnit")}
        </div>
      </div>

      <div>
        <Label htmlFor="svc-desc">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <Input id="svc-desc" value={f.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      <Collapsible open={advanced} onOpenChange={setAdvanced}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn("h-4 w-4 transition-transform", advanced && "rotate-180")} /> Avançado
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <Label htmlFor="svc-vat">Taxa de IVA (%) <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Input id="svc-vat" type="number" step="0.01" min="0" max="100" className="w-32" value={f.vat} onChange={(e) => set("vat", e.target.value)} />
          {err("vat")}
          <p className="text-xs text-muted-foreground mt-1">Aplica-se só a lançamentos novos.</p>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={!dirty || !f.name.trim() || pending}>{pending ? "A guardar…" : "Guardar"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancelar</Button>
      </div>
      {service && <p className="text-xs text-muted-foreground">Alterar o preço não muda lançamentos já feitos.</p>}
    </form>
  );
};

export const ServiceCatalogDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { data: services = [], isLoading } = useServiceCatalog();
  const [view, setView] = useState<{ mode: "list" } | { mode: "edit"; id: string } | { mode: "new" }>({ mode: "list" });
  const editing = view.mode === "edit" ? services.find((s) => s.id === view.id) : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setView({ mode: "list" }); } }}>
      <DialogContent className="max-w-[640px] max-h-[85vh] overflow-y-auto">
        {view.mode === "list" ? (
          <>
            <DialogHeader className="flex-row items-start justify-between gap-4 space-y-0 pr-6">
              <div className="space-y-1">
                <DialogTitle>Catálogo de serviços</DialogTitle>
                <DialogDescription>Define os serviços que podes lançar aos residentes.</DialogDescription>
              </div>
              <Button className="rounded-full shrink-0" onClick={() => setView({ mode: "new" })}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar serviço
              </Button>
            </DialogHeader>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">A carregar…</p>
            ) : services.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Ainda não há serviços.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((s) => <ServiceCard key={s.id} s={s} onEdit={() => setView({ mode: "edit", id: s.id })} />)}
              </div>
            )}
          </>
        ) : (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
              <DialogDescription>Dados do serviço</DialogDescription>
            </DialogHeader>
            <ServiceForm key={editing?.id ?? "new"} service={editing} services={services} onDone={() => setView({ mode: "list" })} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
