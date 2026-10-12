import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { COUNTRIES, DIAL_OPTIONS, flagOf, joinPhone, matchNationality, splitPhone } from "@/lib/countries";

/** Lista de nacionalidades com pesquisa. Grava sempre a forma portuguesa (ex.: "Portuguesa"). */
export const NationalitySelect = ({
  value,
  onChange,
  id,
  disabled,
  placeholder = "Escolher nacionalidade",
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const match = matchNationality(value);
  const raw = String(value ?? "").trim();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !raw && "text-muted-foreground")}>
            {match ? `${flagOf(match.iso)} ${match.nationalityPt}` : raw ? `${raw} (escolher da lista)` : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[240px]" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar país ou nacionalidade…" />
          <CommandList>
            <CommandEmpty>Sem resultados.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c.iso}
                  value={`${c.nationalityPt} ${c.countryPt} ${c.nationalityEn} ${c.countryEn}`}
                  onSelect={() => {
                    onChange(c.nationalityPt);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", match?.iso === c.iso ? "opacity-100" : "opacity-0")} />
                  {flagOf(c.iso)} {c.nationalityPt}
                  <span className="ml-auto text-xs text-muted-foreground">{c.countryPt}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

/** Indicativo (lista com pesquisa) + número. Grava "+351 912345678". */
export const PhoneInput = ({
  value,
  onChange,
  id,
  disabled,
  placeholder = "Número",
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState(() => splitPhone(value));
  // Sincroniza quando o valor muda por fora (ex.: abrir outra lead)
  useEffect(() => {
    if (joinPhone(parts.dial, parts.number) !== String(value ?? "").trim()) setParts(splitPhone(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const update = (p: { dial: string; number: string }) => {
    setParts(p);
    onChange(joinPhone(p.dial, p.number));
  };
  const current = DIAL_OPTIONS.find((d) => d.dial === parts.dial);
  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" disabled={disabled} className="w-[110px] shrink-0 justify-between font-normal px-2">
            <span className={cn("truncate", !parts.dial && "text-muted-foreground")}>
              {parts.dial ? `${current ? flagOf(current.iso) : ""} ${parts.dial}` : "Indicativo"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[280px]" align="start">
          <Command>
            <CommandInput placeholder="Pesquisar país ou indicativo…" />
            <CommandList>
              <CommandEmpty>Sem resultados.</CommandEmpty>
              <CommandGroup>
                {DIAL_OPTIONS.map((d) => (
                  <CommandItem
                    key={d.iso}
                    value={`${d.countryPt} ${d.countryEn} ${d.dial}`}
                    onSelect={() => {
                      update({ ...parts, dial: d.dial });
                      setOpen(false);
                    }}
                  >
                    {flagOf(d.iso)} {d.countryPt}
                    <span className="ml-auto text-xs text-muted-foreground">{d.dial}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        disabled={disabled}
        value={parts.number}
        placeholder={placeholder}
        onChange={(e) => update({ ...parts, number: e.target.value.replace(/[^\d\s]/g, "") })}
      />
    </div>
  );
};
