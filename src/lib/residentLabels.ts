import { Wrench, Sparkles, Wifi, Search, Package, MessageSquare, type LucideIcon } from "lucide-react";
import type {
  RequestStatus,
  RequestCategory,
  RequestPriority,
  PermissionToEnter,
} from "@/hooks/useResidentRequests";

export const ICON_STROKE = 1.5;

type Bi = { pt: string; en: string };

export const statusLabels: Record<RequestStatus, Bi> = {
  open: { pt: "Aberto", en: "Open" },
  in_progress: { pt: "Em curso", en: "In progress" },
  waiting_resident: { pt: "Aguarda-te", en: "Waiting on you" },
  waiting_supplier: { pt: "Aguarda fornecedor", en: "Waiting on supplier" },
  resolved: { pt: "Resolvido", en: "Resolved" },
  closed: { pt: "Fechado", en: "Closed" },
};

// Semantic tokens matching src/components/ui/StatusBadge.tsx (staff side)
export const statusBadgeClass: Record<RequestStatus, string> = {
  open: "bg-info/15 text-info border-info/30",
  in_progress: "bg-warning/15 text-warning border-warning/30",
  waiting_resident: "bg-info/15 text-info border-info/30",
  waiting_supplier: "bg-info/15 text-info border-info/30",
  resolved: "bg-success/15 text-success border-success/30",
  closed: "bg-muted text-muted-foreground border-border",
};

export const priorityLabels: Record<RequestPriority, Bi> = {
  low: { pt: "Baixa", en: "Low" },
  medium: { pt: "Média", en: "Medium" },
  high: { pt: "Alta", en: "High" },
  urgent: { pt: "Urgente", en: "Urgent" },
};

export const priorityDotClass: Record<RequestPriority, string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-info",
  high: "bg-warning",
  urgent: "bg-destructive",
};

export const permissionLabels: Record<PermissionToEnter, Bi> = {
  yes: { pt: "Sim", en: "Yes" },
  no: { pt: "Não", en: "No" },
  with_notice: { pt: "Com aviso", en: "With notice" },
};

export const categoryOptions: {
  value: RequestCategory;
  icon: LucideIcon;
  pt: string;
  en: string;
}[] = [
  { value: "maintenance", icon: Wrench, pt: "Manutenção", en: "Maintenance" },
  { value: "cleaning", icon: Sparkles, pt: "Limpeza", en: "Cleaning" },
  { value: "wifi_tech", icon: Wifi, pt: "Wi-Fi / Tech", en: "Wi-Fi / Tech" },
  { value: "lost_found", icon: Search, pt: "Lost & Found", en: "Lost & Found" },
  { value: "consumables", icon: Package, pt: "Consumíveis", en: "Consumables" },
  { value: "other", icon: MessageSquare, pt: "Outro", en: "Other" },
];

export const categoryLabels: Record<RequestCategory, Bi> = categoryOptions.reduce(
  (acc, o) => {
    acc[o.value] = { pt: o.pt, en: o.en };
    return acc;
  },
  {} as Record<RequestCategory, Bi>,
);

export const pickLabel = (b: Bi, lang: string) => (lang === "pt" ? b.pt : b.en);

import type { Database } from "@/integrations/supabase/types";

export type ResidentStatus = Database["public"]["Enums"]["resident_status"];
export type StayStatus = Database["public"]["Enums"]["stay_status"];

export const residentStatusLabels: Record<ResidentStatus, Bi> = {
  upcoming: { pt: "A chegar", en: "Upcoming" },
  active: { pt: "Ativo", en: "Active" },
  checking_out: { pt: "Check-out próximo", en: "Checking out" },
  past: { pt: "Anterior", en: "Past" },
};

export const residentStatusBadgeClass: Record<ResidentStatus, string> = {
  upcoming: "bg-info/15 text-info border-info/30",
  active: "bg-success/15 text-success border-success/30",
  checking_out: "bg-warning/15 text-warning border-warning/30",
  past: "bg-muted text-muted-foreground border-border",
};

export const stayStatusLabels: Record<StayStatus, Bi> = {
  pending: { pt: "Pendente", en: "Pending" },
  confirmed: { pt: "Confirmada", en: "Confirmed" },
  checked_in: { pt: "Em casa", en: "Checked in" },
  checked_out: { pt: "Saiu", en: "Checked out" },
  cancelled: { pt: "Cancelada", en: "Cancelled" },
};

export const stayStatusBadgeClass: Record<StayStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-info/15 text-info border-info/30",
  checked_in: "bg-success/15 text-success border-success/30",
  checked_out: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};
