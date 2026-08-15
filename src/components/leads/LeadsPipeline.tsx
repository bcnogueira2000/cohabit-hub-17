import { Clock, ChevronDown, Phone, User as UserIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { leadStatusLabels, leadSourceLabels } from "@/lib/labels";
import type { Lead, LeadStatus } from "@/hooks/useLeads";
import type { StaffUser } from "@/hooks/useStaffUsers";

export const statusTone: Record<LeadStatus, string> = {
  new: "bg-muted text-muted-foreground",
  contacted: "bg-info/10 text-info",
  visit_scheduled: "bg-info/10 text-info",
  visited: "bg-info/10 text-info",
  proposal_sent: "bg-warning/10 text-warning",
  negotiating: "bg-warning/10 text-warning",
  won: "bg-success/10 text-success",
  lost: "bg-destructive/10 text-destructive",
  archived: "bg-secondary text-secondary-foreground",
};

export const today = () => new Date().toISOString().slice(0, 10);

const rank = (l: Lead) => {
  const t = today();
  if (!l.nextActionDate) return 3;
  const d = l.nextActionDate.slice(0, 10);
  if (d < t) return 0;
  if (d === t) return 1;
  return 2;
};

export const sortByUrgency = (a: Lead, b: Lead) => {
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 3) return b.createdAt.localeCompare(a.createdAt);
  return (a.nextActionDate || "").localeCompare(b.nextActionDate || "");
};

export const urgencyBorder = (l: Lead) => {
  const r = rank(l);
  if (r === 0) return "border-l-[3px] border-destructive";
  if (r === 1) return "border-l-[3px] border-warning";
  return "";
};

export const isOverdue = (l: Lead) => rank(l) === 0;

export const LeadStatusBadge = ({
  lead,
  onStatusChange,
  isPending,
}: {
  lead: Lead;
  onStatusChange: (leadId: string, newStatus: LeadStatus, lostReason?: string) => void;
  isPending?: boolean;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild disabled={isPending}>
      <Badge
        variant="outline"
        className={`${statusTone[lead.status]} cursor-pointer gap-1 pr-1.5`}
        onClick={(e) => e.stopPropagation()}
      >
        {leadStatusLabels[lead.status]}
        <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
      </Badge>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
      {(Object.keys(leadStatusLabels) as LeadStatus[]).map((s) => (
        <DropdownMenuItem
          key={s}
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(lead.id, s);
          }}
          className={s === lead.status ? "bg-muted" : ""}
        >
          {leadStatusLabels[s]}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

const chipClass = "text-[11px] px-1.5 py-0.5 rounded bg-accent/60 text-accent-foreground";

export const LeadChips = ({ lead }: { lead: Lead }) => {
  const chips = [lead.preferredRoomType, lead.preferredMoveIn, lead.phone].filter(
    (v) => !!v && String(v).trim() !== ""
  );
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {lead.preferredRoomType?.trim() && <span className={chipClass}>{lead.preferredRoomType}</span>}
      {lead.preferredMoveIn?.trim() && <span className={chipClass}>{lead.preferredMoveIn}</span>}
      {lead.phone?.trim() && (
        <span className={`${chipClass} inline-flex items-center gap-1`}>
          <Phone className="h-3 w-3" strokeWidth={1.5} />
          {lead.phone}
        </span>
      )}
    </div>
  );
};

const fmtDate = (v: string) =>
  new Date(v).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });

const relativeDate = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
};

export type PipelineColumn = {
  key: string;
  label: string;
  statuses: LeadStatus[];
  leads: Lead[];
};

const columnBorder: Record<string, string> = {
  new: "border-muted-foreground",
  contact: "border-info",
  negotiation: "border-warning",
  won: "border-success",
  lost: "border-destructive",
};

export const LeadsPipeline = ({
  columns,
  staff,
  onSelectLead,
  onStatusChange,
  isPending,
}: {
  columns: PipelineColumn[];
  staff: StaffUser[];
  onSelectLead: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus, lostReason?: string) => void;
  isPending: boolean;
}) => {
  const ownerName = (l: Lead) =>
    l.assignedTo || staff.find((s) => s.user_id === l.assignedToUserId)?.full_name || null;

  return (
    <div className="hidden lg:flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
      {columns.map((col) => (
        <div
          key={col.key}
          className={`min-w-[260px] flex-1 flex flex-col rounded-xl bg-muted/30 border border-border/40 ${
            col.key === "won" || col.key === "lost" ? "max-w-[280px]" : ""
          }`}
        >
          <div className={`p-3 border-t-2 ${columnBorder[col.key] ?? "border-border"}`}>
            <span className="font-display text-sm font-semibold">{col.label}</span>{" "}
            <span className="text-muted-foreground text-xs">({col.leads.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {col.leads.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">Sem leads</div>
            )}
            {col.leads.map((l) => (
              <Card
                key={l.id}
                onClick={() => onSelectLead(l)}
                className={`p-3 shadow-card border-border/60 hover:shadow-elegant transition-smooth cursor-pointer ${urgencyBorder(l)}`}
              >
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <LeadStatusBadge lead={l} onStatusChange={onStatusChange} isPending={isPending} />
                  <Badge variant="outline" className="text-muted-foreground">
                    {leadSourceLabels[l.source]}
                  </Badge>
                </div>
                <div className="font-display text-sm font-semibold truncate">{l.fullName}</div>
                <div className="text-xs text-muted-foreground truncate">{l.email}</div>
                <LeadChips lead={l} />
                {l.nextAction && (
                  <div
                    className={`flex items-center gap-1.5 mt-2 text-xs ${
                      isOverdue(l) ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="truncate">{l.nextAction}</span>
                    {l.nextActionDate && <span>· {fmtDate(l.nextActionDate)}</span>}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 mt-2 text-xs text-muted-foreground">
                  {ownerName(l) ? (
                    <span className="flex items-center gap-1.5 truncate">
                      <UserIcon className="h-3.5 w-3.5" strokeWidth={1.5} /> {ownerName(l)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span>{relativeDate(l.createdAt)}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
