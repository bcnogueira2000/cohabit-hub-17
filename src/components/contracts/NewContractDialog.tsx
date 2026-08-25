import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStay, useRooms } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RoomCombobox } from "@/components/rooms/RoomCombobox";
import { ShieldCheck } from "lucide-react";

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

const PROFILES = ["Estudante", "Profissional", "Nómada digital", "Outro"];

export const NewContractDialog = ({ open, onOpenChange, defaults, leadId, onCreated }: Props) => {
  const { data: rooms = [] } = useRooms();
  const createStay = useCreateStay();
  const qc = useQueryClient();
  const [roomId, setRoomId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [transitional, setTransitional] = useState(false);
  const [profile, setProfile] = useState<string>("");
  const [nationality, setNationality] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [documentNumber, setDocumentNumber] = useState<string>("");
  const [documentValidity, setDocumentValidity] = useState<string>("");
  const [taxNumber, setTaxNumber] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");

  // Pré-preencher a partir da lead de origem (dados legais)
  useEffect(() => {
    if (!open || !leadId) return;
    let cancelled = false;
    (async () => {
      const { data: lead } = await supabase
        .from("leads" as any)
        .select(
          "nationality, profile, address, document_number, document_validity, tax_number, date_of_birth, age, gender"
        )
        .eq("id", leadId)
        .maybeSingle();
      if (cancelled || !lead) return;
      const ln = (lead as any).nationality as string | null;
      const lp = (lead as any).profile as string | null;
      const ldob = (lead as any).date_of_birth as string | null;
      const laddr = (lead as any).address as string | null;
      const ldoc = (lead as any).document_number as string | null;
      const ldocv = (lead as any).document_validity as string | null;
      const ltin = (lead as any).tax_number as string | null;
      if (ln) setNationality((v) => v || ln);
      if (lp) {
        const match = PROFILES.find((p) => p.toLowerCase() === String(lp).toLowerCase());
        setProfile((v) => v || match || "Outro");
      }
      if (ldob) setDateOfBirth((v) => v || String(ldob).split("T")[0]);
      if (laddr) setAddress((v) => v || laddr);
      if (ldoc) setDocumentNumber((v) => v || ldoc);
      if (ldocv) setDocumentValidity((v) => v || String(ldocv).split("T")[0]);
      if (ltin) setTaxNumber((v) => v || ltin);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, leadId]);

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
    const paymentDay = Number(fd.get("paymentDay") || 5);
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
        const COPY_FIELDS = [
          "nationality",
          "profile",
          "age",
          "gender",
          "address",
          "document_number",
          "document_validity",
          "tax_number",
        ] as const;
        const { data: lead } = await supabase
          .from("leads" as any)
          .select(COPY_FIELDS.join(", "))
          .eq("id", leadId)
          .maybeSingle();
        const { data: res } = await supabase
          .from("residents" as any)
          .select(COPY_FIELDS.join(", "))
          .eq("id", residentId)
          .maybeSingle();
        if (lead) {
          const patch: Record<string, any> = {};
          COPY_FIELDS.forEach((k) => {
            const leadVal = (lead as any)[k];
            const resVal = (res as any)?.[k];
            if (leadVal && !resVal) patch[k] = leadVal;
          });
          if (Object.keys(patch).length > 0) {
            await supabase.from("residents" as any).update(patch as any).eq("id", residentId);
          }
        }
      }

      // 1c. Dados legais introduzidos no formulário (prevalecem sobre os da lead)
      {
        const legal: Record<string, any> = {};
        const put = (key: string, raw: FormDataEntryValue | null) => {
          const v = String(raw ?? "").trim();
          if (v) legal[key] = v;
        };
        if (nationality.trim()) legal.nationality = nationality.trim();
        if (profile) legal.profile = profile;
        put("date_of_birth", fd.get("dateOfBirth"));
        put("address", fd.get("address"));
        put("document_number", fd.get("documentNumber"));
        put("document_validity", fd.get("documentValidity"));
        put("tax_number", fd.get("taxNumber"));
        put("employer_or_school", fd.get("employerOrSchool"));
        if (Object.keys(legal).length > 0) {
          const { error: legalErr } = await supabase
            .from("residents" as any)
            .update(legal as any)
            .eq("id", residentId);
          if (legalErr) throw legalErr;
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
          regular_rent_amount: transitional ? regularAmount : null,
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
          <div className="flex items-start gap-2 rounded-xl border border-border/60 p-3">
            <Checkbox
              id="transitional"
              checked={transitional}
              onCheckedChange={(v) => setTransitional(v === true)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="transitional" className="cursor-pointer">
                Aplicar renda transitória (obras em curso)
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cobra-se a renda transitória desde já; a renda regular fica guardada no contrato.
              </p>
            </div>
          </div>
          {transitional && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Renda transitória (já em vigor) (€)</Label>
                <Input name="transitionalAmount" type="number" min="0" step="0.01" required className="mt-1.5" />
              </div>
              <div>
                <Label>Renda regular (após período transitório) (€)</Label>
                <Input name="regularAmount" type="number" min="0" step="0.01" required className="mt-1.5" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {!transitional && (
              <div>
                <Label>Renda mensal (€)</Label>
                <Input name="monthlyAmount" type="number" min="0" step="0.01" required className="mt-1.5" />
              </div>
            )}
            <div>
              <Label>Dia de vencimento</Label>
              <Input name="paymentDay" type="number" min="1" max="28" defaultValue={5} required className="mt-1.5" />
            </div>
            <div>
              <Label>Caução devida (€)</Label>
              <Input name="depositDue" type="number" min="0" step="0.01" className="mt-1.5" />
            </div>
          </div>
          <div className="rounded-xl border border-border/60 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-display text-base font-semibold">Dados legais</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Opcionais — usados para gerar o contrato. Podes completar mais tarde na ficha do residente.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nacionalidade</Label>
                <Input value={nationality} onChange={(e) => setNationality(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input name="dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Morada de residência</Label>
              <Input name="address" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Nº do documento</Label>
                <Input name="documentNumber" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Validade</Label>
                <Input name="documentValidity" type="date" value={documentValidity} onChange={(e) => setDocumentValidity(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>NIF</Label>
                <Input name="taxNumber" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Perfil</Label>
                <Select value={profile} onValueChange={setProfile}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Escolher" /></SelectTrigger>
                  <SelectContent>
                    {PROFILES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{profile === "Estudante" ? "Instituição de ensino" : "Local de trabalho"}</Label>
                <Input name="employerOrSchool" className="mt-1.5" />
              </div>
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
