import { useState } from "react";
import { format, parse, isValid } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  lang: "pt" | "en";
  placeholder: string;
  invalid?: boolean;
  fromYear?: number;
  toYear?: number;
  defaultMonthYear?: number;
};

const toDate = (value: string) => {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
};

const CandidateDateField = ({
  id,
  name,
  value,
  onChange,
  lang,
  placeholder,
  invalid,
  fromYear = 1930,
  toYear = new Date().getFullYear() + 20,
  defaultMonthYear,
}: Props) => {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const locale = lang === "pt" ? pt : enUS;

  return (
    <>
      <input type="hidden" id={id} name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="lc-date-trigger"
            data-empty={!selected ? "true" : "false"}
            data-invalid={invalid ? "true" : "false"}
            aria-labelledby={`${id}-label`}
          >
            <span>{selected ? format(selected, "dd/MM/yyyy") : placeholder}</span>
            <CalendarIcon size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={
              selected ?? (defaultMonthYear ? new Date(defaultMonthYear, 0, 1) : undefined)
            }
            onSelect={(date) => {
              if (date) onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }}
            locale={locale}
            captionLayout="dropdown-buttons"
            fromYear={fromYear}
            toYear={toYear}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </>
  );
};

export default CandidateDateField;
