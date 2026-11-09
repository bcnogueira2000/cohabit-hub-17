import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Caixa de pesquisa por residente/quarto usada nas listas financeiras. */
export const ListSearchField = ({
  value,
  onChange,
  className,
  placeholder = "Residente ou quarto",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) => (
  <div className={cn("w-full sm:w-auto min-w-0", className)}>
    <Label className="text-xs text-muted-foreground">Pesquisar</Label>
    <div className="relative mt-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full sm:w-[240px] rounded-full pl-9 text-base sm:text-sm"
      />
    </div>
  </div>
);
