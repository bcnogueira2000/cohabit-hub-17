import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStay, useRooms } from "@/hooks/useData";
import type { Lead } from "@/hooks/useLeads";
import { toast } from "sonner";

export const ConvertLeadDialog = ({
  lead,
  open,
  onOpenChange,
  onConverted,
}: {
  lead: Lead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConverted: (stayId: string) => void;
}) => {
  const { data: rooms = [] } = useRooms();
  const createStay = useCreateStay();
  const [roomId, setRoomId] = useState<string>("");

  const sortedRooms = useMemo(() => {
    const pref = lead.preferredRoomType?.trim().toLowerCase();
    if (!pref) return rooms;
    const match = rooms.filter((r) => r.typology?.trim().toLowerCase() === pref);
    const rest = rooms.filter((r) => r.typology?.trim().toLowerCase() !== pref);
    return [...match, ...rest];
  }, [rooms, lead.preferredRoomType]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createStay.mutate(
      {
        fullName: String(fd.get("fullName")),
        email: String(fd.get("email")),
        phone: String(fd.get("phone") || ""),
        roomId: roomId || null,
        checkIn: new Date(String(fd.get("checkIn"))).toISOString(),
        checkOut: new Date(String(fd.get("checkOut"))).toISOString(),
        status: (fd.get("status") as "pending" | "confirmed") || "confirmed",
        notes: String(fd.get("notes") || ""),
      },
      {
        onSuccess: (data: any) => {
          toast.success("Estadia criada — residente e tarefas geradas automaticamente");
          setRoomId("");
          onOpenChange(false);
          if (data?.id) onConverted(data.id);
        },
        onError: (err: any) => toast.error(err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Converter lead em residente</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Criar estadia para {lead.fullName}. Os automatismos de check-in serão disparados conforme o
            estado escolhido.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome completo</Label>
              <Input name="fullName" defaultValue={lead.fullName} required className="mt-1.5" />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={lead.email} required className="mt-1.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input name="phone" defaultValue={lead.phone ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>Quarto</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Escolher" /></SelectTrigger>
                <SelectContent>
                  {sortedRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>Quarto {r.number} · {r.typology}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Check-in</Label><Input name="checkIn" type="date" required className="mt-1.5" /></div>
            <div><Label>Check-out</Label><Input name="checkOut" type="date" required className="mt-1.5" /></div>
          </div>
          <div>
            <Label>Estado inicial</Label>
            <Select name="status" defaultValue="confirmed">
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente (não dispara automatismos)</SelectItem>
                <SelectItem value="confirmed">Confirmada (cria limpeza + kit)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notas</Label><Textarea name="notes" className="mt-1.5" rows={2} /></div>
          <Button
            type="submit"
            disabled={createStay.isPending}
            className="w-full rounded-full gradient-warm border-0 mt-2"
          >
            Criar estadia
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
