import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type RoomComboboxRoom = {
  id: string;
  number: string;
  typology?: string | null;
  floor?: number | string | null;
};

type ExtraOption = { value: string; label: string };

interface RoomComboboxProps {
  rooms: RoomComboboxRoom[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** "typology" (default) | "floor" | "none" */
  detail?: "typology" | "floor" | "none";
  extraOptions?: ExtraOption[];
  sort?: boolean;
}

export function RoomCombobox({
  rooms,
  value,
  onChange,
  placeholder = "Escolher quarto",
  className,
  detail = "typology",
  extraOptions = [],
  sort = true,
}: RoomComboboxProps) {
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const arr = sort
      ? [...rooms].sort((a, b) => a.number.localeCompare(b.number, "pt", { numeric: true }))
      : rooms;
    return arr;
  }, [rooms, sort]);

  const labelFor = (r: RoomComboboxRoom) => {
    if (detail === "typology" && r.typology) return `Quarto ${r.number} · ${r.typology}`;
    if (detail === "floor" && r.floor != null) return `Quarto ${r.number} · piso ${r.floor}`;
    return `Quarto ${r.number}`;
  };

  const selectedLabel = (() => {
    const extra = extraOptions.find((o) => o.value === value);
    if (extra) return extra.label;
    const room = list.find((r) => r.id === value);
    return room ? labelFor(room) : "";
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !selectedLabel && "text-muted-foreground", className)}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar quarto…" />
          <CommandList className="max-h-64">
            <CommandEmpty>Sem resultados.</CommandEmpty>
            <CommandGroup>
              {extraOptions.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} strokeWidth={1.5} />
                  {o.label}
                </CommandItem>
              ))}
              {list.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.number} ${r.typology ?? ""} ${r.floor ?? ""}`}
                  onSelect={() => {
                    onChange(r.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === r.id ? "opacity-100" : "opacity-0")} strokeWidth={1.5} />
                  {labelFor(r)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
