import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supplierCategoryLabels } from "@/lib/labels";
import { useCreateSupplier, useUpdateSupplier } from "@/hooks/useSuppliers";
import type { Supplier, SupplierCategory } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  trigger: React.ReactNode;
  supplier?: Supplier;
  onSaved?: (id?: string) => void;
}

const empty = {
  name: "",
  category: "other" as SupplierCategory,
  contactName: "",
  phone: "",
  email: "",
  website: "",
  notes: "",
  active: true,
};

export const SupplierDialog = ({ trigger, supplier, onSaved }: Props) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const create = useCreateSupplier();
  const update = useUpdateSupplier();

  useEffect(() => {
    if (open && supplier) {
      setForm({
        name: supplier.name,
        category: supplier.category,
        contactName: supplier.contactName ?? "",
        phone: supplier.phone ?? "",
        email: supplier.email ?? "",
        website: supplier.website ?? "",
        notes: supplier.notes ?? "",
        active: supplier.active,
      });
    } else if (open && !supplier) {
      setForm(empty);
    }
  }, [open, supplier]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      contactName: form.contactName || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      notes: form.notes || null,
      active: form.active,
    };
    try {
      if (supplier) {
        await update.mutateAsync({ id: supplier.id, patch: payload });
        toast.success("Fornecedor atualizado");
        onSaved?.(supplier.id);
      } else {
        const created = await create.mutateAsync(payload);
        toast.success("Fornecedor criado");
        onSaved?.(created.id);
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
          <DialogTitle>{supplier ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Canalizações Silva" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as SupplierCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(supplierCategoryLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pessoa de contacto</Label>
              <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="active">Ativo</Label>
            <Switch id="active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending}>
            {supplier ? "Guardar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
