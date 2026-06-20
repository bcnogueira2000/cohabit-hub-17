import { Link } from "react-router-dom";
import { Plus, ArrowRight, Inbox, Sparkles, DoorClosed, AlertTriangle, ListChecks, Sun, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BrandAvatar } from "@/components/ui/BrandAvatar";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { useRequests, useCleaningTasks, useRooms, useResidents, useCreateOpsTask, useStays } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { capitalize, formatDate } from "@/lib/utils";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
};

const Dashboard = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: requests = [], isLoading: loadingRequests } = useRequests();
  const { data: cleaningTasks = [], isLoading: loadingCleaning } = useCleaningTasks();
  const { data: rooms = [], isLoading: loadingRooms } = useRooms();
  const { data: residents = [] } = useResidents();
  const { data: stays = [], isLoading: loadingStays } = useStays();
  const createTask = useCreateOpsTask();

  const isLoadingKpis = loadingRequests || loadingCleaning || loadingRooms || loadingStays;

  const now = Date.now();
  const in30d = now + 30 * 86400000;
  const in14d = now + 14 * 86400000;
  const upcomingArrivals = stays
    .filter((s) => (s.status === "confirmed" || s.status === "pending") && new Date(s.checkIn).getTime() >= now && new Date(s.checkIn).getTime() <= in30d)
    .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
    .slice(0, 3);
  const upcomingDepartures = stays
    .filter((s) => s.status === "checked_in" && new Date(s.checkOut).getTime() >= now && new Date(s.checkOut).getTime() <= in14d)
    .sort((a, b) => new Date(a.checkOut).getTime() - new Date(b.checkOut).getTime())
    .slice(0, 3);

  const openRequests = requests.filter((r) => r.status === "open" || r.status === "in_progress");
  const urgent = requests.filter((r) => r.priority === "urgent" && r.status !== "resolved" && r.status !== "closed");
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + 86400000);
  const todaysCleaning = cleaningTasks.filter((t) => {
    if (t.status === "completed" || t.status === "skipped") return false;
    const d = new Date(t.scheduledFor).getTime();
    return d >= startOfToday.getTime() && d < endOfToday.getTime();
  });
  const occupied = rooms.filter((r) => r.status === "occupied").length;
  const occupancy = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0;
  const checkingOut = residents.filter((r) => r.status === "checking_out").length;

  // Prefer profile name, fallback to capitalized email local part.
  const firstName =
    capitalize(profile?.full_name?.split(" ")[0] ?? "") ||
    capitalize(user?.email?.split("@")[0] ?? "") ||
    "equipa";

  const kpis = [
    { label: "Pedidos abertos", value: openRequests.length, sub: `${urgent.length} urgentes`, icon: Inbox, accent: "bg-primary/10 text-primary" },
    { label: "Limpezas hoje", value: todaysCleaning.length, sub: "Programadas", icon: Sparkles, accent: "bg-success/10 text-success" },
    { label: "Ocupação", value: `${occupancy}%`, sub: `${occupied}/${rooms.length} quartos`, icon: DoorClosed, accent: "bg-info/10 text-info" },
    { label: "Check-outs", value: checkingOut, sub: "Próximos 7 dias", icon: AlertTriangle, accent: "bg-warning/15 text-warning" },
  ];

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Sun className="h-3.5 w-3.5" />
            <span className="capitalize">{formatDate(new Date(), "long")}</span>
          </div>
          <h1 className="font-display text-2xl lg:text-[28px] font-semibold text-foreground">
            {greeting()}, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Aqui está o que precisa da tua atenção hoje.</p>
        </div>
        <div className="flex gap-2">
          <NewTaskDialog
            onCreate={(t) => createTask.mutate({
              title: t.title, description: t.description, category: t.category,
              priority: t.priority, assignedTo: t.assignedTo, dueDate: t.dueDate,
            })}
            trigger={
              <Button variant="outline" size="sm">
                <ListChecks className="h-4 w-4 mr-1.5" /> Nova tarefa
              </Button>
            }
          />
          <Button asChild size="sm">
            <Link to="/requests/new"><Plus className="h-4 w-4 mr-1.5" /> Novo pedido</Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-7">
        {kpis.map(({ label, value, sub, icon: Icon, accent }) => (
          <Card key={label} className="p-4 lg:p-5 border-border/70 shadow-none hover:shadow-card transition-smooth">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            {isLoadingKpis ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="font-display text-2xl lg:text-[26px] font-semibold text-foreground leading-tight">{value}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">{sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5 lg:p-6 border-border/70 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold">Pedidos abertos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Os que precisam de ação</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary -mr-2">
              <Link to="/requests">Ver todos <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          <div className="space-y-1">
            {loadingRequests ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : openRequests.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Sem pedidos abertos"
                description="A tua equipa está em dia. Quando entrarem novos pedidos, aparecem aqui."
                size="sm"
              />
            ) : (
              openRequests.slice(0, 5).map((r) => {
                const resident = residents.find((p) => p.id === r.residentId);
                return (
                  <Link
                    key={r.id}
                    to={`/requests/${r.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-smooth border border-transparent hover:border-border"
                  >
                    <BrandAvatar name={resident?.fullName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10.5px] font-mono text-muted-foreground">{r.code}</span>
                        <PriorityBadge priority={r.priority} />
                      </div>
                      <div className="font-medium text-sm truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {resident?.fullName || "—"} · {r.location}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-border/70 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold">Limpezas de hoje</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{todaysCleaning.length} agendadas</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary -mr-2" title="Ver todas">
              <Link to="/cleaning"><ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="space-y-2">
            {loadingCleaning ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : todaysCleaning.length === 0 ? (
              <EmptyState icon={Sparkles} title="Sem limpezas agendadas" size="sm" />
            ) : (
              todaysCleaning.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                    t.status === "in_progress" ? "bg-warning/20 text-warning" : "bg-secondary text-secondary-foreground"
                  }`}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{t.area}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(t.scheduledFor, "time")}
                      {t.assignedTo && ` · ${t.assignedTo}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <Card className="p-5 lg:p-6 border-border/70 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold flex items-center gap-2">
                <LogIn className="h-4 w-4 text-success" /> Próximas entradas
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Próximos 7 dias</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary -mr-2">
              <Link to="/stays">Ver estadias <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          <div className="space-y-1.5">
            {upcomingArrivals.length === 0 ? (
              <EmptyState icon={LogIn} title="Sem entradas agendadas" size="sm" />
            ) : (
              upcomingArrivals.map((s) => {
                const room = rooms.find((r) => r.id === s.roomId);
                return (
                  <Link key={s.id} to="/stays" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-smooth border border-transparent hover:border-border">
                    <div className="h-10 w-10 rounded-lg bg-success/10 text-success flex items-center justify-center font-display font-semibold text-sm">
                      {new Date(s.checkIn).getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{s.fullName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {room ? `Quarto ${room.number}` : "Sem quarto"} · {formatDate(s.checkIn, "weekday")}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{s.status === "confirmed" ? "Kit ✓" : "Pend."}</Badge>
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-border/70 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold flex items-center gap-2">
                <LogOut className="h-4 w-4 text-warning" /> Próximas saídas
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Próximos 7 dias</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary -mr-2">
              <Link to="/stays">Ver estadias <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          <div className="space-y-1.5">
            {upcomingDepartures.length === 0 ? (
              <EmptyState icon={LogOut} title="Sem saídas agendadas" size="sm" />
            ) : (
              upcomingDepartures.map((s) => {
                const room = rooms.find((r) => r.id === s.roomId);
                return (
                  <Link key={s.id} to="/stays" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-smooth border border-transparent hover:border-border">
                    <div className="h-10 w-10 rounded-lg bg-warning/15 text-warning flex items-center justify-center font-display font-semibold text-sm">
                      {new Date(s.checkOut).getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{s.fullName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {room ? `Quarto ${room.number}` : "—"} · {formatDate(s.checkOut, "weekday")}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
