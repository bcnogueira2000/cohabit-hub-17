import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requests as seedRequests, residents, categoryLabels } from "@/lib/mockData";
import { StatusBadge, PriorityBadge } from "@/components/ui/StatusBadge";
import { RequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusFilters: { value: RequestStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abertos" },
  { value: "in_progress", label: "Em curso" },
  { value: "waiting_resident", label: "Aguarda residente" },
  { value: "waiting_supplier", label: "Aguarda fornecedor" },
  { value: "resolved", label: "Resolvidos" },
];

const Requests = () => {
  const [filter, setFilter] = useState<RequestStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return seedRequests.filter((r) => {
      const matchesFilter = filter === "all" || r.status === filter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Requests</h1>
          <p className="text-muted-foreground mt-1">Pedidos, avarias e incidentes da operação</p>
        </div>
        <Button asChild className="rounded-full gradient-warm border-0 shadow-elegant">
          <Link to="/requests/new"><Plus className="h-4 w-4 mr-1.5" /> Novo pedido</Link>
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Procurar por título, código, local…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/70 rounded-full"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-smooth border",
              filter === f.value
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:border-foreground/30"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Nenhum pedido encontrado.
          </Card>
        )}
        {filtered.map((r) => {
          const resident = residents.find((p) => p.id === r.residentId);
          return (
            <Link key={r.id} to={`/requests/${r.id}`}>
              <Card className="p-4 lg:p-5 hover:shadow-elegant transition-smooth border-border/60 cursor-pointer">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-mono text-muted-foreground">{r.code}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-xs font-medium text-accent-foreground bg-accent px-2 py-0.5 rounded-full">
                        {categoryLabels[r.category]}
                      </span>
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <div className="font-medium text-base mb-1">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {resident?.fullName || "—"} · {r.location}
                      {r.assignedTo && <> · <span className="text-foreground/70">{r.assignedTo}</span></>}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Requests;
