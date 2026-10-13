import { useMemo, useState } from "react";
import { Sun, ChevronDown, ChevronUp, Zap, Hourglass, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/hooks/useLeads";
import { useLeadPendingExtras } from "@/components/leads/LeadPendingContext";
import { leadPendingStep } from "@/lib/leadContractRules";
import { docsBadge } from "@/lib/leadDocuments";
import { buildDailyBrief, type BriefItem } from "@/lib/dailyBrief";
import { shortName } from "@/lib/shortName";

const STORAGE_KEY = "leads.dailyBrief.collapsed";

export const DailyBrief = ({ leads, onSelectLead }: { leads: Lead[]; onSelectLead: (l: Lead) => void }) => {
  const { extrasFor } = useLeadPendingExtras();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");
  const [open, setOpen] = useState<string | null>(null);

  const items = useMemo(
    () =>
      buildDailyBrief(
        leads.map((l) => ({
          id: l.id,
          status: l.status,
          createdAt: l.createdAt,
          nextActionDate: l.nextActionDate,
          step: leadPendingStep(l, extrasFor(l)),
          docs: docsBadge(l as any),
        }))
      ),
    [leads, extrasFor]
  );
  const byId = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const team = items.filter((i) => i.side === "team");
  const client = items.filter((i) => i.side === "client");
  const teamCount = new Set(team.flatMap((i) => i.ids)).size;
  const clientCount = new Set(client.flatMap((i) => i.ids)).size;

  const toggle = () => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1");
    setCollapsed(!collapsed);
  };

  const today = new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
  const summary =
    teamCount === 0 && clientCount === 0
      ? "Tudo em dia. Nenhuma lead precisa de atenção."
      : `Hoje há ${teamCount} ${teamCount === 1 ? "lead" : "leads"} com ação do vosso lado e ${clientCount} à espera do cliente.`;

  const renderItem = (it: BriefItem) => (
    <li key={it.key}>
      <button
        onClick={() => setOpen(open === it.key ? null : it.key)}
        className="w-full flex items-center justify-between text-left text-sm rounded-md px-2 py-1.5 hover:bg-muted/50 transition-smooth"
      >
        <span>{it.label}</span>
        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open === it.key ? "rotate-90" : ""}`} />
      </button>
      {open === it.key && (
        <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
          {it.ids.map((id) => {
            const l = byId.get(id);
            if (!l) return null;
            return (
              <button
                key={id}
                onClick={() => onSelectLead(l)}
                className="text-xs rounded-full border border-border bg-background px-2.5 py-1 hover:bg-muted transition-smooth"
              >
                {shortName(l.fullName)}
              </button>
            );
          })}
        </div>
      )}
    </li>
  );

  return (
    <Card className="p-4 lg:p-5 mb-5 border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Sun className="h-5 w-5 text-primary mt-0.5" strokeWidth={1.5} />
          <div>
            <div className="font-display font-semibold">
              Daily Brief <span className="text-muted-foreground font-normal capitalize">· {today}</span>
            </div>
            <div className="text-sm text-muted-foreground">{summary}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={toggle} aria-label={collapsed ? "Expandir" : "Recolher"}>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>
      {!collapsed && items.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              <Zap className="h-3.5 w-3.5" strokeWidth={1.5} /> Do vosso lado
            </div>
            {team.length ? <ul>{team.map(renderItem)}</ul> : <div className="text-sm text-muted-foreground px-2">Nada pendente.</div>}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              <Hourglass className="h-3.5 w-3.5" strokeWidth={1.5} /> Follow-up · à espera do cliente
            </div>
            {client.length ? <ul>{client.map(renderItem)}</ul> : <div className="text-sm text-muted-foreground px-2">Nada pendente.</div>}
          </div>
        </div>
      )}
    </Card>
  );
};
