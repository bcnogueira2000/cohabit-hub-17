import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSuppliers } from "@/hooks/useSuppliers";
import { supplierCategoryLabels } from "@/lib/labels";

const NONE = "__none__";

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  className?: string;
  /** Rótulo da opção "sem fornecedor" (por defeito "Sem fornecedor"). */
  noneLabel?: string;
}

export const SupplierCombobox = ({ value, onChange, placeholder = "Escolher fornecedor…", className, noneLabel = "Sem fornecedor" }: Props) => {
  const { data: suppliers = [] } = useSuppliers({ activeOnly: true });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return suppliers;
    return suppliers.filter((s) => s.name.toLowerCase().includes(t));
  }, [suppliers, q]);

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => { onChange(v === NONE ? null : v); setQ(""); }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 pb-1 sticky top-0 bg-popover">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Pesquisar…"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {filtered.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
            <span className="text-xs text-muted-foreground ml-1">
              · {supplierCategoryLabels[s.category]}
            </span>
          </SelectItem>
        ))}
        {filtered.length === 0 && <div className="px-2 py-2 text-sm text-muted-foreground">Sem resultados.</div>}
      </SelectContent>
    </Select>
  );
};
