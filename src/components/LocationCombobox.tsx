import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocations } from "@/hooks/useLocations";
import { locationKindLabels } from "@/lib/labels";
import { useMemo, useState } from "react";

const NONE = "__none__";

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  className?: string;
  /** Only show non-room locations (shared spaces). */
  sharedOnly?: boolean;
}

export const LocationCombobox = ({ value, onChange, placeholder = "Escolher local…", className, sharedOnly }: Props) => {
  const { data: locations = [] } = useLocations({ excludeRooms: sharedOnly });
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const t = q.trim().toLowerCase();
    const g: Record<string, typeof locations> = {};
    for (const l of locations) {
      if (t && !l.name.toLowerCase().includes(t)) continue;
      (g[l.kind] ||= []).push(l);
    }
    return g;
  }, [locations, q]);

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => { onChange(v === NONE ? null : v); setQ(""); }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <div className="px-2 pb-1 sticky top-0 bg-popover z-10">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Pesquisar…"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <SelectItem value={NONE}>Sem local</SelectItem>
        {Object.entries(grouped).map(([kind, items]) => (
          <SelectGroup key={kind}>
            <SelectLabel>{locationKindLabels[kind] || kind}</SelectLabel>
            {items.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
                {l.floor != null && <span className="text-xs text-muted-foreground ml-1">· piso {l.floor}</span>}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};
