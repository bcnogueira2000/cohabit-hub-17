import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useCreateService, useServiceCatalog, useUpdateService, type ServiceItem } from "@/hooks/usePayments";

type Draft = { name: string; unitLabel: string; price: string; vat: string; active: boolean };
const toDraft = (s: ServiceItem): Draft => ({
  name: s.name, unitLabel: s.unitLabel, price: String(s.defaultPrice), vat: s.vatRate == null ? "" : String(s.vatRate), active: s.active,
});

/** Valida e converte; devolve mensagem de erro ou os valores. */
const parse = (d: Draft) => {
  if (!d.name.trim()) return { error: "O nome é obrigatório" };
  const price = Number(d.price.replace(",", "."));
  if (d.price.trim() === "" || isNaN(price) || price < 0) return { error: "O preço tem de ser 0 ou mais" };
  let vat: number | null = null;
  if (d.vat.trim() !== "") {
    vat = Number(d.vat.replace(",", "."));
    if (isNaN(vat) || vat < 0 || vat > 100) return { error: "O IVA tem de estar entre 0 e 100 (ou vazio)" };
  }
  return { value: { name: d.name, unitLabel: d.unitLabel, defaultPrice: price, vatRate: vat, active: d.active } };
};

const Row = ({ service }: { service: ServiceItem }) => {
  const update = useUpdateService();
  const [d, setD] = useState<Draft>(toDraft(service));
  useEffect(() => setD(toDraft(service)), [service]);
  const dirty = JSON.stringify(d) !== JSON.stringify(toDraft(service));
  const save = async () => {
    const r = parse(d);
    if ("error" in r) return toast({ title: r.error, variant: "destructive" });
    try {
      await update.mutateAsync({ id: service.id, ...r.value! });
      toast({ title: "Serviço guardado", description: "Os lançamentos já feitos não mudam." });
    } catch (e: any) { toast({ title: "Não foi possível guardar", description: e?.message, variant: "destructive" }); }
  };
  return (
    <tr className={`border-b border-border/50 ${d.active ? "" : "text-muted-foreground"}`}>
      <td className="py-2 pr-2"><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></td>
      <td className="pr-2 w-28"><Input value={d.unitLabel} onChange={(e) => setD({ ...d, unitLabel: e.target.value })} /></td>
      <td className="pr-2 w-28"><Input type="number" step="0.01" min="0" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} /></td>
      <td className="pr-2 w-24"><Input type="number" step="0.01" min="0" max="100" placeholder="—" value={d.vat} onChange={(e) => setD({ ...d, vat: e.target.value })} /></td>
      <td className="pr-2 text-center"><Switch checked={d.active} onCheckedChange={(v) => setD({ ...d, active: v })} /></td>
      <td><Button size="sm" variant={dirty ? "default" : "ghost"} disabled={!dirty || update.isPending} onClick={save}>Guardar</Button></td>
    </tr>
  );
};

export const ServiceCatalogDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { data: services = [] } = useServiceCatalog();
  const create = useCreateService();
  const empty: Draft = { name: "", unitLabel: "unidade", price: "0", vat: "", active: true };
  const [n, setN] = useState<Draft>(empty);

  const add = async () => {
    const r = parse(n);
    if ("error" in r) return toast({ title: r.error, variant: "destructive" });
    try {
      await create.mutateAsync({
        ...r.value!, existingCodes: services.map((s) => s.code),
        sortOrder: Math.max(0, ...services.map((s) => s.sortOrder)) + 1,
      });
      toast({ title: "Serviço criado" });
      setN(empty);
    } catch (e: any) { toast({ title: "Não foi possível criar", description: e?.message, variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Catálogo de serviços</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">Os serviços não se apagam: desativa-os para deixarem de aparecer ao lançar extras. Alterar o preço não muda lançamentos já feitos.</p>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left">
            <tr><th className="pb-1">Nome</th><th>Unidade</th><th>Preço base (€)</th><th>IVA (%)</th><th className="text-center">Ativo</th><th /></tr>
          </thead>
          <tbody>{services.map((s) => <Row key={s.id} service={s} />)}</tbody>
        </table>

        <div className="rounded-xl bg-muted/50 p-4 space-y-3">
          <h4 className="font-semibold text-sm">Novo serviço</h4>
          <div className="grid grid-cols-[1fr_7rem_7rem_6rem] gap-2">
            <div><Label>Nome</Label><Input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} placeholder="Ex.: Lavagem de roupa de cama" /></div>
            <div><Label>Unidade</Label><Input value={n.unitLabel} onChange={(e) => setN({ ...n, unitLabel: e.target.value })} /></div>
            <div><Label>Preço (€)</Label><Input type="number" step="0.01" min="0" value={n.price} onChange={(e) => setN({ ...n, price: e.target.value })} /></div>
            <div><Label>IVA (%)</Label><Input type="number" step="0.01" min="0" max="100" placeholder="—" value={n.vat} onChange={(e) => setN({ ...n, vat: e.target.value })} /></div>
          </div>
          <Button onClick={add} disabled={create.isPending}>Adicionar serviço</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
