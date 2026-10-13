import { useMemo, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
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
      : `Hoje há ${teamCount} ${teamCount === 1 ? "lead" : "leads"} com ação do nosso lado e ${clientCount} à espera do cliente.`;

  const renderItem = (it: BriefItem) => (
    <li key={it.key}>
      <button
        onClick={() => setOpen(open === it.key ? null : it.key)}
        className="w-full flex items-start gap-3 text-left text-sm rounded-md px-2 py-1.5 hover:bg-primary/10 transition-smooth"
      >
        <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${it.side === "team" ? "bg-primary" : "bg-warning"}`} />
        <span className="flex-1">{it.label}</span>
        <ChevronRight className={`h-3.5 w-3.5 mt-0.5 text-muted-foreground transition-transform ${open === it.key ? "rotate-90" : ""}`} />
      </button>
      {open === it.key && (
        <div className="flex flex-wrap gap-1.5 pl-7 pr-2 pb-2 pt-1">
          {it.ids.map((id) => {
            const l = byId.get(id);
            if (!l) return null;
            return (
              <button
                key={id}
                onClick={() => onSelectLead(l)}
                className="text-xs rounded-full border border-primary/20 bg-card px-2.5 py-1 hover:bg-primary/10 transition-smooth"
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
    <Card className="mb-5 overflow-hidden border-primary/25 bg-accent/40 shadow-soft">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-primary/15">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
          <span className="font-display font-bold">Daily Brief</span>
          <span className="text-sm text-muted-foreground capitalize">· {today}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={toggle} aria-label={collapsed ? "Expandir" : "Recolher"}>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>
      {!collapsed && (
        <>
          <div className="px-3 py-3">
            <p className="px-2 pb-2 text-sm text-muted-foreground">{summary}</p>
            {items.length > 0 && <ul className="space-y-0.5">{[...team, ...client].map(renderItem)}</ul>}
          </div>
          <div className="border-t border-primary/15 px-5 py-3 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> do nosso lado</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> à espera do cliente</span>
            <span className="ml-auto text-xs text-muted-foreground">Resumo automático · clica numa linha para ver as leads</span>
          </div>
        </>
      )}
    </Card>
  );
};
