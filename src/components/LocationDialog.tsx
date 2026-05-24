import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { locationKindLabels, locationStatusLabels } from "@/lib/labels";
import { useCreateLocation, useUpdateLocation } from "@/hooks/useLocations";
import type { Location, LocationKind, LocationStatus } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  trigger: React.ReactNode;
  location?: Location;
}

const empty = {
  name: "",
  kind: "other" as LocationKind,
  floor: "" as string | "",
  apartment: "",
  status: "active" as LocationStatus,
  notes: "",
};

export const LocationDialog = ({ trigger, location }: Props) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const create = useCreateLocation();
  const update = useUpdateLocation();

  useEffect(() => {
    if (open && location) {
      setForm({
        name: location.name,
        kind: location.kind,
        floor: location.floor != null ? String(location.floor) : "",
        apartment: location.apartment ?? "",
        status: location.status,
        notes: location.notes ?? "",
      });
    } else if (open && !location) {
      setForm(empty);
    }
  }, [open, location]);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      floor: form.floor === "" ? null : Number(form.floor),
      apartment: form.apartment || null,
      status: form.status,
      notes: form.notes || null,
    };
    try {
      if (location) {
        await update.mutateAsync({ id: location.id, patch: payload });
        toast.success("Local atualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Local criado");
      }
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro a gravar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{location ? "Editar local" : "Novo local"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Cozinha 5º piso" />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as LocationKind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(locationKindLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Piso</Label>
              <Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            </div>
            <div>
              <Label>Apartamento</Label>
              <Input value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LocationStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(locationStatusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending}>
            {location ? "Guardar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
