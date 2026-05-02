import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Inbox, ChevronRight, Loader2 } from "lucide-react";
import { useMyRequests, isActiveRequest, type RequestStatus, type RequestPriority } from "@/hooks/useResidentRequests";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const statusColor: Record<RequestStatus, string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  waiting_resident: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  waiting_supplier: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const priorityDot: Record<RequestPriority, string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-rose-500",
};

const Requests = () => {
  const { t, lang } = useLang();
  const { data: requests = [], isLoading } = useMyRequests();
  const [tab, setTab] = useState<"active" | "archive">("active");

  const filtered = requests.filter((r) =>
    tab === "active" ? isActiveRequest(r.status) : !isActiveRequest(r.status),
  );

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{t("tab.requests")}</h1>
        <Button asChild size="sm" className="gradient-warm border-0">
          <Link to="/app/requests/new">
            <Plus className="h-4 w-4 mr-1" />
            {t("home.new_request")}
          </Link>
        </Button>
      </div>

      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        {(["active", "archive"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-smooth",
              tab === k ? "bg-background shadow-soft" : "text-muted-foreground",
            )}
          >
            {k === "active"
              ? lang === "pt" ? "Ativos" : "Active"
              : lang === "pt" ? "Arquivados" : "Archived"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/60">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {tab === "active"
              ? lang === "pt" ? "Sem pedidos ativos." : "No active requests."
              : lang === "pt" ? "Sem pedidos arquivados." : "No archived requests."}
          </p>
          {tab === "active" && (
            <Button asChild variant="outline" size="sm">
              <Link to="/app/requests/new">
                <Plus className="h-4 w-4 mr-1" />
                {t("home.new_request")}
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Link
              key={r.id}
              to={`/app/requests/${r.id}`}
              className="block bg-card border border-border/60 rounded-xl p-4 hover:shadow-soft transition-smooth"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", priorityDot[r.priority])} />
                    <span className="text-[10px] font-mono text-muted-foreground">{r.code}</span>
                    <Badge variant="outline" className={cn("text-[10px]", statusColor[r.status])}>
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {r.category.replace(/_/g, " ")} · {new Date(r.created_at).toLocaleDateString("pt-PT")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Requests;
