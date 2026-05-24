import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocations } from "@/hooks/useLocations";
import { locationKindLabels } from "@/lib/labels";
import { useMemo } from "react";

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

  const grouped = useMemo(() => {
    const g: Record<string, typeof locations> = {};
    for (const l of locations) {
      (g[l.kind] ||= []).push(l);
    }
    return g;
  }, [locations]);

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-80">
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
