import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStay, useRooms } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RoomCombobox } from "@/components/rooms/RoomCombobox";

export type NewContractResult = { contractId: string; stayId: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pré-preenchimento (ex.: a partir de uma lead) */
  defaults?: {
    fullName?: string;
    email?: string;
    phone?: string;
    preferredRoomType?: string | null;
  };
  /** Lead de origem, se aplicável */
  leadId?: string | null;
  onCreated?: (result: NewContractResult) => void;
};

export const NewContractDialog = ({ open, onOpenChange, defaults, leadId, onCreated }: Props) => {
  const { data: rooms = [] } = useRooms();
  const createStay = useCreateStay();
  const qc = useQueryClient();
  const [roomId, setRoomId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [transitional, setTransitional] = useState(false);

  const sortedRooms = useMemo(() => {
    const pref = defaults?.preferredRoomType?.trim().toLowerCase();
    if (!pref) return rooms;
    const match = rooms.filter((r) => r.typology?.trim().toLowerCase() === pref);
    const rest = rooms.filter((r) => r.typology?.trim().toLowerCase() !== pref);
    return [...match, ...rest];
  }, [rooms, defaults?.preferredRoomType]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const checkInDate = String(fd.get("checkIn"));
    const checkOutDate = String(fd.get("checkOut"));
    const paymentDay = Number(fd.get("paymentDay") || 1);
    const depositDue = Number(fd.get("depositDue") || 0);
    // Com renda transitória: cobra-se a transitória desde já; a regular fica guardada.
    const transitionalAmount = Number(fd.get("transitionalAmount") || 0);
    const regularAmount = Number(fd.get("regularAmount") || 0);
    const monthlyAmount = transitional ? transitionalAmount : Number(fd.get("monthlyAmount"));

    if (!monthlyAmount || monthlyAmount <= 0) {
      toast.error(transitional ? "Indica a renda transitória" : "Indica a renda mensal");
      return;
    }
    if (transitional && (!regularAmount || regularAmount <= 0)) {
      toast.error("Indica a renda regular");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Estadia — caminho existente (triggers de check-in/limpeza/kit intactos)
      const stay: any = await createStay.mutateAsync({
        fullName: String(fd.get("fullName")),
        email: String(fd.get("email")),
        phone: String(fd.get("phone") || ""),
        roomId: roomId || null,
        checkIn: new Date(checkInDate).toISOString(),
        checkOut: new Date(checkOutDate).toISOString(),
        status: "confirmed",
        notes: String(fd.get("notes") || ""),
      });

      // O trigger cria/atualiza o residente — reler para obter resident_id
      const { data: freshStay, error: stayErr } = await supabase
        .from("stays" as any)
        .select("id, resident_id")
        .eq("id", stay.id)
        .single();
      if (stayErr) throw stayErr;
      const residentId = (freshStay as any)?.resident_id;
      if (!residentId) throw new Error("Residente não foi criado a partir da estadia");

      // 1b. Copiar dados da lead de origem para o residente (só campos vazios)
      if (leadId) {
        const { data: lead } = await supabase
          .from("leads" as any)
          .select("nationality, profile, age, gender")
          .eq("id", leadId)
          .maybeSingle();
        const { data: res } = await supabase
          .from("residents" as any)
          .select("nationality, profile, age, gender")
          .eq("id", residentId)
          .maybeSingle();
        if (lead) {
          const patch: Record<string, any> = {};
          (["nationality", "profile", "age", "gender"] as const).forEach((k) => {
            const leadVal = (lead as any)[k];
            const resVal = (res as any)?.[k];
            if (leadVal && !resVal) patch[k] = leadVal;
          });
          if (Object.keys(patch).length > 0) {
            await supabase.from("residents" as any).update(patch as any).eq("id", residentId);
          }
        }
      }


      // 2. Contrato
      const { data: contract, error: contractErr } = await supabase
        .from("contracts" as any)
        .insert({
          resident_id: residentId,
          lead_id: leadId ?? null,
          start_date: checkInDate,
          end_date: checkOutDate,
          status: "reserved",
          payment_day: paymentDay,
          deposit_due: depositDue,
          notes: String(fd.get("notes") || "") || null,
        } as any)
        .select("id")
        .single();
      if (contractErr) throw contractErr;
      const contractId = (contract as any).id as string;

      // 3. Ligar estadia ao contrato
      const { error: linkErr } = await supabase
        .from("stays" as any)
        .update({ contract_id: contractId } as any)
        .eq("id", stay.id);
      if (linkErr) throw linkErr;

      // 4. Primeiro período de renda
      const { error: periodErr } = await supabase
        .from("contract_rent_periods" as any)
        .insert({
          contract_id: contractId,
          valid_from: checkInDate,
          monthly_amount: monthlyAmount,
        } as any);
      if (periodErr) throw periodErr;

      // 5. Gerar as mensalidades (pró-rata por dias nos meses parciais)
      const { error: genErr } = await supabase.rpc("generate_rent_charges" as any, {
        p_contract_id: contractId,
      });
      if (genErr) throw genErr;

      qc.invalidateQueries({ queryKey: ["stays"] });
      qc.invalidateQueries({ queryKey: ["contracts"] });

      toast.success("Contrato e estadia criados");
      setRoomId("");
      onOpenChange(false);
      onCreated?.({ contractId, stayId: stay.id });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar contrato");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Novo contrato</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cria a estadia (com os automatismos de check-in) e o contrato de arrendamento.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome completo</Label>
              <Input name="fullName" defaultValue={defaults?.fullName ?? ""} required className="mt-1.5" />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={defaults?.email ?? ""} required className="mt-1.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input name="phone" defaultValue={defaults?.phone ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>Quarto</Label>
              <div className="mt-1.5">
                <RoomCombobox rooms={sortedRooms} value={roomId} onChange={setRoomId} placeholder="Escolher" sort={false} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Check-in</Label><Input name="checkIn" type="date" required className="mt-1.5" /></div>
            <div><Label>Check-out</Label><Input name="checkOut" type="date" required className="mt-1.5" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Renda mensal (€)</Label>
              <Input name="monthlyAmount" type="number" min="0" step="0.01" required className="mt-1.5" />
            </div>
            <div>
              <Label>Dia de vencimento</Label>
              <Input name="paymentDay" type="number" min="1" max="28" defaultValue={1} required className="mt-1.5" />
            </div>
            <div>
              <Label>Caução devida (€)</Label>
              <Input name="depositDue" type="number" min="0" step="0.01" className="mt-1.5" />
            </div>
          </div>
          <div><Label>Notas</Label><Textarea name="notes" className="mt-1.5" rows={2} /></div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full gradient-warm border-0 mt-2"
          >
            {submitting ? "A criar…" : "Criar contrato"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewContractDialog;
