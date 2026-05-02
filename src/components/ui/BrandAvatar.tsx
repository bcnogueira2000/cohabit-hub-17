import { cn, colorKey, getInitials } from "@/lib/utils";

interface BrandAvatarProps {
  name?: string | null;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const palette = [
  "bg-brand-teal/15 text-brand-teal",
  "bg-brand-lilac/20 text-brand-lilac",
  "bg-brand-yellow/25 text-[hsl(var(--brand-charcoal))]",
  "bg-brand-coral/15 text-brand-coral",
];

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export const BrandAvatar = ({ name, src, size = "md", className }: BrandAvatarProps) => {
  const initials = getInitials(name);
  const key = colorKey(name);
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        className={cn("rounded-full object-cover shrink-0", sizeMap[size], className)}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-full flex items-center justify-center font-semibold shrink-0 select-none",
        palette[key],
        sizeMap[size],
        className,
      )}
    >
      {initials}
    </div>
  );
};
