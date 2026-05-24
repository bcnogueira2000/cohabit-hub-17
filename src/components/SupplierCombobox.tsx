import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSuppliers } from "@/hooks/useSuppliers";
import { supplierCategoryLabels } from "@/lib/labels";

const NONE = "__none__";

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  className?: string;
}

export const SupplierCombobox = ({ value, onChange, placeholder = "Escolher fornecedor…", className }: Props) => {
  const { data: suppliers = [] } = useSuppliers({ activeOnly: true });

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Sem fornecedor</SelectItem>
        {suppliers.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
            <span className="text-xs text-muted-foreground ml-1">
              · {supplierCategoryLabels[s.category]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
