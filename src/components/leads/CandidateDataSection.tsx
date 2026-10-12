import { Input } from "@/components/ui/input";
import type { Lead } from "@/hooks/useLeads";

export type CandidateData = {
  nationality: string;
  dateOfBirth: string;
  address: string;
  postalCode: string;
  city: string;
  documentNumber: string;
  documentValidity: string;
  taxNumber: string;
};

export const candidateDataFromLead = (lead: Lead): CandidateData => ({
  nationality: (lead as any).nationality ?? "",
  dateOfBirth: lead.dateOfBirth ?? "",
  address: lead.address ?? "",
  postalCode: lead.postalCode ?? "",
  city: lead.city ?? "",
  documentNumber: lead.documentNumber ?? "",
  documentValidity: lead.documentValidity ?? "",
  taxNumber: lead.taxNumber ?? "",
});

/** Patch (snake_case) para gravar as correções do candidato na lead. */
export const candidateDataPatch = (d: CandidateData) => ({
  nationality: d.nationality.trim() || null,
  date_of_birth: d.dateOfBirth || null,
  address: d.address.trim() || null,
  postal_code: d.postalCode.trim() || null,
  city: d.city.trim() || null,
  document_number: d.documentNumber.trim() || null,
  document_validity: d.documentValidity || null,
  tax_number: d.taxNumber.trim() || null,
});

const F = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) => (
  <div className="space-y-1">
    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</label>
    <Input {...props} />
  </div>
);

/** Dados do candidato pré-preenchidos (formulário/lead) e editáveis. */
export const CandidateDataSection = ({
  value,
  onChange,
}: {
  value: CandidateData;
  onChange: (v: CandidateData) => void;
}) => {
  const set = (k: keyof CandidateData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="rounded-xl border border-border/60 p-3 space-y-3">
      <h3 className="font-display text-sm font-semibold">Dados do candidato</h3>
      <div className="grid grid-cols-2 gap-3">
        <F label="Nacionalidade" value={value.nationality} onChange={set("nationality")} />
        <F label="Data de nascimento" type="date" value={value.dateOfBirth} onChange={set("dateOfBirth")} />
      </div>
      <F label="Morada de residência" value={value.address} onChange={set("address")} />
      <div className="grid grid-cols-2 gap-3">
        <F label="Código postal" value={value.postalCode} onChange={set("postalCode")} />
        <F label="Localidade" value={value.city} onChange={set("city")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <F label="Nº do documento" value={value.documentNumber} onChange={set("documentNumber")} />
        <F label="Validade do documento" type="date" value={value.documentValidity} onChange={set("documentValidity")} />
      </div>
      <F label="NIF (999999990 se não tiver)" value={value.taxNumber} onChange={set("taxNumber")} />
    </div>
  );
};
