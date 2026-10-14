import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSaveService, useServiceCatalog, type ServiceItem } from "@/hooks/usePayments";

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);
type Draft = { id?: string; name: string; description: string; price: string; unit: string; active: boolean };
const empty: Draft = { name: "", description: "", price: "0", unit: "unidade", active: true };

export const ServiceCatalog = () => {
  const { data: services = [], isLoading } = useServiceCatalog();
  const save = useSaveService();
  const [draft, setDraft] = useState<Draft | null>(null);

  const edit = (s: ServiceItem) => setDraft({ id: s.id, name: s.name, description: s.description ?? "", price: String(s.defaultPrice), unit: s.unitLabel, active: s.active });
  const submit = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return toast({ title: "Indica o nome do serviço", variant: "destructive" });
    if (!(Number(draft.price) >= 0)) return toast({ title: "Preço inválido", variant: "destructive" });
    try {
      await save.mutateAsync({ id: draft.id, name: draft.name, description: draft.description, defaultPrice: Number(draft.price), unitLabel: draft.unit, active: draft.active });
      toast({ title: draft.id ? "Serviço atualizado" : "Serviço adicionado" });
      setDraft(null);
    } catch (e: any) { toast({ title: "Não foi possível guardar", description: e?.message, variant: "destructive" }); }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-base font-semibold">Catálogo de serviços</h3>
          <p className="text-xs text-muted-foreground">Serviços extra e preço de referência. O preço pode ser ajustado em cada lançamento.</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setDraft({ ...empty })}><Plus className="h-4 w-4 mr-1" /> Adicionar serviço</Button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {services.map((s) => (
            <button key={s.id} onClick={() => edit(s)}
              className={cn("group text-left rounded-xl border border-border/60 p-4 transition-colors hover:border-primary/40", !s.active && "opacity-50")}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{s.name}</span>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </div>
              {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-display text-lg font-bold text-primary">{eur(s.defaultPrice)}<span className="text-xs font-normal text-muted-foreground">/{s.unitLabel}</span></span>
                {!s.active && <span className="text-[11px] text-muted-foreground">Inativo</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{draft?.id ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Preço (€)</Label><Input type="number" step="0.01" min="0" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></div>
                <div><Label>Unidade</Label><Input placeholder="unidade, noite, hora…" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /> Disponível para lançar</label>
              <Button className="w-full" onClick={submit} disabled={save.isPending}>{save.isPending ? "A guardar…" : "Guardar"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
