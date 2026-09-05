import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { generateContractDocxFromLead } from "@/lib/generateContractDocxFromLead";
import type { Lead } from "@/hooks/useLeads";

const PROFILES = ["Estudante", "Profissional", "Nómada digital", "Outro"];

type Props = {
  lead: Lead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export const LeadContractDialog = ({ lead, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<{ fileName: string; signedUrl: string } | null>(null);

  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [paymentDay, setPaymentDay] = useState("5");
  const [depositDue, setDepositDue] = useState("");
  const [nationality, setNationality] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentValidity, setDocumentValidity] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [profile, setProfile] = useState("");
  const [employerOrSchool, setEmployerOrSchool] = useState("");
  const [stayDates, setStayDates] = useState<{ checkIn: string; checkOut: string; roomNumber: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setDoc(null);
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("leads" as any)
        .select("*")
        .eq("id", lead.id)
        .maybeSingle();
      const { data: stay, error: stayErr } = await supabase
        .from("stays" as any)
        .select("check_in, check_out, room_id")
        .eq("lead_id", lead.id)
        .in("status", ["confirmed", "checked_in"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (stayErr) console.error("stay lookup", stayErr);
      const l: any = data ?? {};
      setMonthlyAmount(l.draft_rent_amount != null ? String(l.draft_rent_amount) : "");
      setDepositDue(l.draft_deposit_due != null ? String(l.draft_deposit_due) : "");
      setPaymentDay(l.draft_payment_day != null ? String(l.draft_payment_day) : "5");
      setNationality(l.nationality ?? "");
      setDateOfBirth(l.date_of_birth ? String(l.date_of_birth).split("T")[0] : "");
      setAddress(l.address ?? "");
      setPostalCode(l.postal_code ?? "");
      setCity(l.city ?? "");
      setDocumentNumber(l.document_number ?? "");
      setDocumentValidity(l.document_validity ? String(l.document_validity).split("T")[0] : "");
      setTaxNumber(l.tax_number ?? "");
      const lp = l.profile ? String(l.profile) : "";
      setProfile(lp ? PROFILES.find((p) => p.toLowerCase() === lp.toLowerCase()) ?? "Outro" : "");
      setEmployerOrSchool(l.employer_or_school ?? "");
      const s: any = stay ?? null;
      let roomNumber = "";
      if (s?.room_id) {
        const { data: room } = await supabase
          .from("rooms" as any)
          .select("number")
          .eq("id", s.room_id)
          .maybeSingle();
        roomNumber = (room as any)?.number ?? "";
      }
      if (cancelled) return;
      setStayDates(
        s
          ? {
              checkIn: String(s.check_in).split("T")[0],
              checkOut: String(s.check_out).split("T")[0],
              roomNumber,
            }
          : null
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open, lead.id]);

  const handleGenerate = async () => {
    const rent = Number(monthlyAmount);
    if (!rent || rent <= 0) {
      toast.error("Indica a renda mensal");
      return;
    }
    if (!stayDates) {
      toast.error("Esta lead não tem reserva ativa com datas.");
      return;
    }
    setBusy(true);
    try {
      const patch: Record<string, any> = {
        draft_rent_amount: rent,
        draft_deposit_due: Number(depositDue || 0),
        draft_payment_day: Number(paymentDay || 5),
        nationality: nationality.trim() || null,
        date_of_birth: dateOfBirth || null,
        address: address.trim() || null,
        postal_code: postalCode.trim() || null,
        city: city.trim() || null,
        document_number: documentNumber.trim() || null,
        document_validity: documentValidity || null,
        tax_number: taxNumber.trim() || null,
        profile: profile || null,
        employer_or_school: employerOrSchool.trim() || null,
      };
      const { error: upErr } = await supabase.from("leads" as any).update(patch as any).eq("id", lead.id);
      if (upErr) throw upErr;

      const result = await generateContractDocxFromLead(lead.id, {
        monthlyAmount: rent,
        paymentDay: Number(paymentDay || 5),
        depositDue: Number(depositDue || 0),
        startDate: stayDates.checkIn,
        endDate: stayDates.checkOut,
        roomNumber: stayDates.roomNumber,
      });

      const { error: genErr } = await supabase
        .from("leads" as any)
        .update({ contract_generated_at: new Date().toISOString() } as any)
        .eq("id", lead.id);
      if (genErr) throw genErr;

      qc.invalidateQueries({ queryKey: ["leads"] });
      setDoc({ fileName: result.fileName, signedUrl: result.signedUrl });
      toast.success("Contrato gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o contrato.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Gerar contrato</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Gera apenas o documento para assinatura. O contrato só é criado quando marcares "Assinou".
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {stayDates ? (
            <p className="text-xs text-muted-foreground">
              Quarto {stayDates.roomNumber || "—"} · {stayDates.checkIn} a {stayDates.checkOut}
            </p>
          ) : (
            <p className="text-xs text-destructive">Sem reserva ativa associada a esta lead.</p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Renda mensal (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Dia de vencimento</Label>
              <Input
                type="number"
                min="1"
                max="28"
                value={paymentDay}
                onChange={(e) => setPaymentDay(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Caução (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={depositDue}
                onChange={(e) => setDepositDue(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-display text-base font-semibold">Dados legais</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nacionalidade</Label>
                <Input value={nationality} onChange={(e) => setNationality(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Morada de residência</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código postal</Label>
                <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="1000-001" className="mt-1.5" />
              </div>
              <div>
                <Label>Localidade</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lisboa" className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Nº do documento</Label>
                <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Validade</Label>
                <Input type="date" value={documentValidity} onChange={(e) => setDocumentValidity(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>NIF</Label>
                <Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Perfil</Label>
                <Select value={profile} onValueChange={setProfile}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Escolher" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{profile === "Estudante" ? "Instituição de ensino" : "Local de trabalho"}</Label>
                <Input value={employerOrSchool} onChange={(e) => setEmployerOrSchool(e.target.value)} className="mt-1.5" />
              </div>
            </div>
          </div>

          {doc ? (
            <Button asChild className="w-full rounded-full gradient-warm border-0">
              <a href={doc.signedUrl} download={doc.fileName}>
                <Download className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Descarregar {doc.fileName}
              </a>
            </Button>
          ) : null}

          <Button
            onClick={handleGenerate}
            disabled={busy || !stayDates}
            variant={doc ? "outline" : "default"}
            className={doc ? "w-full rounded-full" : "w-full rounded-full gradient-warm border-0"}
          >
            {busy ? "A gerar…" : doc ? "Gerar novamente" : "Gerar contrato"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadContractDialog;
