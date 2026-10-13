import { shortName } from "@/lib/shortName";
import { useRef, useState } from "react";
import { Clock, ChevronDown, Phone, User as UserIcon, CheckCircle2, PenLine, AlertTriangle } from "lucide-react";
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
import { leadPendingStep, daysAgoLabel, isFlowLockedStatus, type LeadSubState } from "@/lib/leadContractRules";
import { useLeadPendingExtras } from "@/components/leads/LeadPendingContext";
import { docsBadge, DOCS_BADGE_LABEL } from "@/lib/leadDocuments";

export const statusTone: Record<LeadStatus, string> = {
  new: "bg-muted text-muted-foreground",
  contacted: "bg-info/10 text-info",
  visit_scheduled: "bg-info/10 text-info",
  visited: "bg-info/10 text-info",
  proposal_sent: "bg-warning/10 text-warning",
  negotiating: "bg-warning/10 text-warning",
  reserved: "bg-primary/10 text-primary",
  won: "bg-success/10 text-success",
  lost: "bg-destructive/10 text-destructive",
};

/** Estados que a equipa pode escolher manualmente (reserved/won só por fluxo). */
export const manualStatusOptions: LeadStatus[] = (Object.keys(leadStatusLabels) as LeadStatus[]).filter(
  (s) => s !== "reserved" && s !== "won"
);

/** Lead ativa com contrato gerado à espera de assinatura (reservada ou não). */
export const isAwaitingSignature = (l: Lead) =>
  !["won", "lost"].includes(l.status) && !!l.contractGeneratedAt && !l.contractId && !l.contractSignedAt;

export const AwaitingSignatureBadge = () => (
  <Badge variant="outline" className="bg-warning/15 text-warning border-warning/40 gap-1">
    <PenLine className="h-3 w-3" strokeWidth={1.5} /> Em assinatura
  </Badge>
);

const subStateTone: Record<LeadSubState, string> = {
  awaiting_payment: "bg-success/10 text-success border-success/30",
  awaiting_signature: "bg-warning/15 text-warning border-warning/40",
  awaiting_contract: "bg-primary/10 text-primary border-primary/30",
  awaiting_fee: "bg-warning/10 text-warning border-warning/30",
  awaiting_agreement: "bg-info/10 text-info border-info/30",
  awaiting_form: "bg-muted text-muted-foreground",
  send_form: "bg-muted text-muted-foreground",
};

/** Etiqueta única da próxima ação pendente (derivada, nunca selecionável). */
export const LeadSubStateBadge = ({ lead }: { lead: Lead }) => {
  const { extrasFor } = useLeadPendingExtras();
  const step = leadPendingStep(lead, extrasFor(lead));
  if (!step) return null;
  return (
    <Badge variant="outline" className={`${subStateTone[step.key]} gap-1`}>
      {step.key === "awaiting_signature" && <PenLine className="h-3 w-3" strokeWidth={1.5} />}
      {step.label}
      {step.since && <span className="opacity-70">· {daysAgoLabel(step.since)}</span>}
    </Badge>
  );
};

/** Alerta: lead contratada cuja caução ou 1.ª renda deixou de estar paga (sem downgrade automático). */
export const WonAtRiskBadge = ({ lead }: { lead: Lead }) => {
  const { extrasFor } = useLeadPendingExtras();
  if (lead.status !== "won" || !lead.contractSignedAt) return null;
  const x = extrasFor(lead);
  if (x.depositPaid === undefined || x.firstRentPaid === undefined) return null;
  if (x.depositPaid && x.firstRentPaid) return null;
  const what = [!x.depositPaid && "caução", !x.firstRentPaid && "1.ª renda"].filter(Boolean).join(" e ");
  return (
    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1" title="Um pagamento foi anulado depois de a lead passar a Contratado">
      <AlertTriangle className="h-3 w-3" strokeWidth={1.5} /> Atenção: {what} deixou de estar paga
    </Badge>
  );
};

/** Etiqueta secundária dos documentos pedidos/recebidos (independente de "Pendente: …"). */
export const DocsBadge = ({ lead }: { lead: Lead }) => {
  const b = docsBadge(lead);
  if (!b) return null;
  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 h-5 ${b === "to_validate" ? "bg-info/10 text-info border-info/30" : "bg-muted text-muted-foreground"}`}
    >
      {DOCS_BADGE_LABEL[b]}
    </Badge>
  );
};

export const FLOW_LOCK_NOTE = "Este estado muda pelo fluxo (Desistiu, cancelar contrato)";

export const LeadStatusBadge = ({
  lead,
  onStatusChange,
  isPending,
}: {
  lead: Lead;
  onStatusChange: (leadId: string, newStatus: LeadStatus, lostReason?: string) => void;
  isPending?: boolean;
}) => {
  if (isFlowLockedStatus(lead.status)) {
    return (
      <Badge variant="outline" className={statusTone[lead.status]} title={FLOW_LOCK_NOTE}>
        {leadStatusLabels[lead.status]}
      </Badge>
    );
  }
  return (
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
        {manualStatusOptions.map((s) => (
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
};

export const today = () => new Date().toISOString().slice(0, 10);

const rank = (l: Lead) => {
  if (l.status === "new") return -1;
  const t = today();
  if (!l.nextActionDate) return 3;
  const d = l.nextActionDate.slice(0, 10);
  if (d < t) return 0;
  if (d === t) return 1;
  return 2;
};

// Mais recente primeiro: data em que a lead entrou no estado atual
export const sortByUrgency = (a: Lead, b: Lead) =>
  (b.statusChangedAt || b.createdAt).localeCompare(a.statusChangedAt || a.createdAt);

const isClosed = (l: Lead) => ["won", "lost"].includes(l.status);

export const urgencyBorder = (l: Lead) => {
  if (l.status === "negotiating" && l.formSubmittedAt) return "border-l-[3px] border-success";
  if (isClosed(l)) return "";
  const r = rank(l);
  if (r === 0) return "border-l-[3px] border-destructive";
  if (r === 1) return "border-l-[3px] border-warning";
  return "";
};

export const isOverdue = (l: Lead) => !isClosed(l) && rank(l) === 0;

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
  reserved: "border-primary",
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

  const scrollerRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });
  const [dragging, setDragging] = useState(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    if ((e.target as HTMLElement).closest("button,a,input,textarea,select,[role='menuitem']")) return;
    drag.current = { active: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const el = scrollerRef.current;
    if (!drag.current.active || !el) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(dx) > 4) {
      drag.current.moved = true;
      setDragging(true);
    }
    if (drag.current.moved) {
      el.scrollLeft = drag.current.startScroll - dx;
      e.preventDefault();
    }
  };

  const endDrag = () => {
    drag.current.active = false;
    if (drag.current.moved) setTimeout(() => setDragging(false), 0);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div
      ref={scrollerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onClickCapture={onClickCapture}
      className={`hidden lg:flex gap-4 overflow-x-auto pb-4 min-h-[60vh] select-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >

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
                  {(l.contractId || l.stayId) && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} /> Convertido
                    </Badge>
                  )}
                  <LeadSubStateBadge lead={l} />
                  <WonAtRiskBadge lead={l} />
                  <DocsBadge lead={l} />

                </div>
                <div className="font-display text-sm font-semibold truncate">{shortName(l.fullName)}</div>
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
