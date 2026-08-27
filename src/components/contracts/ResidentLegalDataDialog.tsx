import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const PROFILES = ["Estudante", "Profissional", "Nómada digital", "Outro"];

export const LEGAL_REQUIRED_FIELDS = [
  "nationality",
  "date_of_birth",
  "address",
  "postal_code",
  "city",
  "document_number",
  "document_validity",
  "profile",
  "employer_or_school",
] as const;

export type LegalField = (typeof LEGAL_REQUIRED_FIELDS)[number];

export type ResidentLegalData = Partial<Record<LegalField | "tax_number", string | null>>;

export const missingLegalFields = (r: ResidentLegalData | null | undefined): LegalField[] =>
  LEGAL_REQUIRED_FIELDS.filter((f) => !String((r as any)?.[f] ?? "").trim());

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  residentId: string;
  resident: ResidentLegalData;
  missing: LegalField[];
  onSaved: () => void;
};

export const ResidentLegalDataDialog = ({
  open,
  onOpenChange,
  residentId,
  resident,
  missing,
  onSaved,
}: Props) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const init: Record<string, string> = {};
    for (const f of LEGAL_REQUIRED_FIELDS) init[f] = String((resident as any)?.[f] ?? "");
    setValues(init);
  }, [open, resident]);

  const set = (k: string) => (v: string) => setValues((p) => ({ ...p, [k]: v }));
  const show = (f: LegalField) => missing.includes(f);
  const profile = values.profile ?? "";

  const handleSave = async () => {
    const empty = LEGAL_REQUIRED_FIELDS.filter((f) => !String(values[f] ?? "").trim());
    if (empty.length > 0) {
      toast.error("Preenche todos os campos em falta");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const f of LEGAL_REQUIRED_FIELDS) payload[f] = values[f].trim();
      const { error } = await supabase
        .from("residents" as any)
        .update(payload as any)
        .eq("id", residentId);
      if (error) throw error;
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível gravar os dados");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} /> Dados legais
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Faltam dados do residente para gerar o contrato. Completa-os para continuar.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {show("nationality") && (
              <div>
                <Label>Nacionalidade</Label>
                <Input value={values.nationality ?? ""} onChange={(e) => set("nationality")(e.target.value)} className="mt-1.5" />
              </div>
            )}
            {show("date_of_birth") && (
              <div>
                <Label>Data de nascimento</Label>
                <Input type="date" value={values.date_of_birth ?? ""} onChange={(e) => set("date_of_birth")(e.target.value)} className="mt-1.5" />
              </div>
            )}
          </div>
          {show("postal_code") && (
            <div>
              <Label>Código postal</Label>
              <Input
                value={values.postal_code ?? ""}
                onChange={(e) => set("postal_code")(e.target.value)}
                placeholder="1000-001"
                className="mt-1.5"
              />
            </div>
          )}
          {show("city") && (
            <div>
              <Label>Localidade</Label>
              <Input
                value={values.city ?? ""}
                onChange={(e) => set("city")(e.target.value)}
                placeholder="Lisboa"
                className="mt-1.5"
              />
            </div>
          )}
          {show("address") && (
            <div>
              <Label>Morada de residência</Label>
              <Input value={values.address ?? ""} onChange={(e) => set("address")(e.target.value)} className="mt-1.5" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {show("document_number") && (
              <div>
                <Label>Nº do documento</Label>
                <Input value={values.document_number ?? ""} onChange={(e) => set("document_number")(e.target.value)} className="mt-1.5" />
              </div>
            )}
            {show("document_validity") && (
              <div>
                <Label>Validade</Label>
                <Input type="date" value={values.document_validity ?? ""} onChange={(e) => set("document_validity")(e.target.value)} className="mt-1.5" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {show("profile") && (
              <div>
                <Label>Perfil</Label>
                <Select value={profile} onValueChange={set("profile")}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Escolher" /></SelectTrigger>
                  <SelectContent>
                    {PROFILES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {show("employer_or_school") && (
              <div>
                <Label>{profile === "Estudante" ? "Instituição de ensino" : "Local de trabalho"}</Label>
                <Input value={values.employer_or_school ?? ""} onChange={(e) => set("employer_or_school")(e.target.value)} className="mt-1.5" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "A gravar…" : "Gravar e gerar contrato"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
