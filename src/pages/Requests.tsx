import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter, User } from "lucide-react";
import { shortName } from "@/lib/shortName";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRequests, useResidents, useRooms } from "@/hooks/useData";
import { categoryLabels } from "@/lib/labels";
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

const priorityBorder: Record<string, string> = {
  urgent: "border-l-destructive",
  high: "border-l-destructive/70",
  medium: "border-l-warning",
  low: "border-l-primary",
};

const Requests = () => {
  const { data: requests = [] } = useRequests();
  const { data: residents = [] } = useResidents();
  const { data: rooms = [] } = useRooms();
  const [filter, setFilter] = useState<RequestStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => requests.filter((r) => {
    const matchesFilter = filter === "all" || r.status === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || (r.location ?? "").toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  }), [requests, filter, search]);

  const stats = useMemo(() => {
    const open = requests.filter((r) => r.status === "open").length;
    const inProgress = requests.filter((r) => ["in_progress", "waiting_resident", "waiting_supplier"].includes(r.status)).length;
    const resolved = requests.filter((r) => r.status === "resolved").length;
    const done = requests.filter((r) => r.status === "resolved" && r.updatedAt && r.createdAt);
    const avg = done.length ? done.reduce((s, r) => s + (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()), 0) / done.length / 86400000 : null;
    return { open, inProgress, resolved, avg };
  }, [requests]);

  return (
    <div className="px-4 lg:px-10 2xl:px-14 py-6 lg:py-10 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Manutenção</h1>
          <p className="text-muted-foreground mt-1">Avarias, reparações e incidentes da operação</p>
        </div>
        <Button asChild className="rounded-full gradient-warm border-0 shadow-elegant">
          <Link to="/requests/new"><Plus className="h-4 w-4 mr-1.5" /> Novo pedido</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Abertos", value: stats.open, cls: "text-warning" },
          { label: "Em curso", value: stats.inProgress, cls: "text-primary" },
          { label: "Resolvidos", value: stats.resolved, cls: "text-success" },
          { label: "Resposta média", value: stats.avg == null ? "—" : `${stats.avg.toFixed(1)}d`, cls: "text-foreground" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-muted/50 py-5 text-center">
            <div className={cn("font-display text-2xl font-semibold", k.cls)}>{k.value}</div>
            <div className="text-xs text-muted-foreground mt-1.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Procurar por título, código, local…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border/70 rounded-full" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {statusFilters.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-smooth border",
              filter === f.value ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-foreground/30")}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Nenhum pedido encontrado.
          </Card>
        )}
        {filtered.map((r) => {
          const resident = residents.find((p) => p.id === r.residentId);
          const room = rooms.find((rm) => rm.id === (r.roomId ?? resident?.roomId));
          return (
            <Link key={r.id} to={`/requests/${r.id}`} className="block">
              <Card className={cn("p-4 lg:p-5 border-l-4 rounded-xl hover:shadow-elegant transition-smooth border-border/60", priorityBorder[r.priority])}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-semibold text-base">{r.title}</span>
                    {room && <span className="rounded-md bg-accent text-accent-foreground px-2 py-0.5 text-xs font-semibold">Quarto {room.number}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <PriorityBadge priority={r.priority} />
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                {resident && <div className="text-xs text-muted-foreground mt-1">{shortName(resident.fullName)}</div>}
                {r.description && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1">{r.description}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs text-muted-foreground">
                  <span>
                    <span className="font-mono">{r.code}</span> · {categoryLabels[r.category]}
                    {r.location ? ` · ${r.location}` : ""}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title="Responsável"><User className="h-3 w-3" />{r.assignedTo ? shortName(r.assignedTo) : "Sem responsável"}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}</span>
                  </span>
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
