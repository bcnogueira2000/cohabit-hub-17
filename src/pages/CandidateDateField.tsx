import { useEffect, useRef, useState } from "react";
import { format, isValid, parse } from "date-fns";

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

const toDisplayDate = (value: string) => {
  const date = toDate(value);
  return date ? format(date, "dd/MM/yyyy") : "";
};

const maskDate = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
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
  defaultMonthYear: _defaultMonthYear,
}: Props) => {
  const [displayValue, setDisplayValue] = useState(() => toDisplayDate(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayValue(toDisplayDate(value));
  }, [value]);

  const updateDate = (nextValue: string) => {
    const masked = maskDate(nextValue);
    setDisplayValue(masked);

    const parsed = parse(masked, "dd/MM/yyyy", new Date());
    const validDate =
      masked.length === 10 &&
      isValid(parsed) &&
      format(parsed, "dd/MM/yyyy") === masked &&
      parsed.getFullYear() >= fromYear &&
      parsed.getFullYear() <= toYear;

    inputRef.current?.setCustomValidity(
      masked.length > 0 && !validDate
        ? lang === "pt"
          ? "Introduza uma data válida no formato DD/MM/AAAA."
          : "Enter a valid date in DD/MM/YYYY format."
        : "",
    );
    onChange(validDate ? format(parsed, "yyyy-MM-dd") : "");
  };

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <input
        ref={inputRef}
        type="text"
        id={id}
        className="lc-date-input"
        value={displayValue}
        onChange={(event) => updateDate(event.target.value)}
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder={placeholder.toUpperCase()}
        required
        data-invalid={invalid ? "true" : "false"}
        aria-labelledby={`${id}-label`}
        aria-invalid={invalid || undefined}
      />
    </>
  );
};

export default CandidateDateField;
