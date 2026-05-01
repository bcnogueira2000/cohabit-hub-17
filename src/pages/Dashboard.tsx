import { Link } from "react-router-dom";
import { Plus, ArrowRight, Inbox, Sparkles, DoorClosed, AlertTriangle, ListChecks, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requests, cleaningTasks, rooms, residents } from "@/lib/mockData";
import { StatusBadge, PriorityBadge } from "@/components/ui/StatusBadge";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { tasksStore } from "@/lib/tasksStore";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
};

const formatDate = () =>
  new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });

const Dashboard = () => {
  const openRequests = requests.filter((r) => r.status === "open" || r.status === "in_progress");
  const urgent = requests.filter((r) => r.priority === "urgent" && r.status !== "resolved" && r.status !== "closed");
  const todaysCleaning = cleaningTasks.filter((t) => t.status !== "completed");
  const occupied = rooms.filter((r) => r.status === "occupied").length;
  const occupancy = Math.round((occupied / rooms.length) * 100);
  const checkingOut = residents.filter((r) => r.status === "checking_out").length;

  const kpis = [
    { label: "Pedidos abertos", value: openRequests.length, sub: `${urgent.length} urgentes`, icon: Inbox, accent: "bg-primary/10 text-primary" },
    { label: "Limpezas hoje", value: todaysCleaning.length, sub: "Programadas", icon: Sparkles, accent: "bg-success/10 text-success" },
    { label: "Ocupação", value: `${occupancy}%`, sub: `${occupied}/${rooms.length} quartos`, icon: DoorClosed, accent: "bg-info/10 text-info" },
    { label: "Check-outs", value: checkingOut, sub: "Próximos 7 dias", icon: AlertTriangle, accent: "bg-warning/15 text-warning" },
  ];

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Sun className="h-4 w-4" />
            <span className="capitalize">{formatDate()}</span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            {greeting()}, Maria.
          </h1>
          <p className="text-muted-foreground mt-1">Aqui está o que precisa da tua atenção hoje.</p>
        </div>
        <div className="flex gap-2">
          <NewTaskDialog
            nextCode={tasksStore.nextCode()}
            onCreate={(t) => tasksStore.add(t)}
            trigger={
              <Button variant="outline" className="rounded-full">
                <ListChecks className="h-4 w-4 mr-1.5" /> Nova tarefa
              </Button>
            }
          />
          <Button asChild className="rounded-full gradient-warm border-0 shadow-elegant">
            <Link to="/requests/new"><Plus className="h-4 w-4 mr-1.5" /> Novo pedido</Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        {kpis.map(({ label, value, sub, icon: Icon, accent }) => (
          <Card key={label} className="p-4 lg:p-5 shadow-card hover:shadow-elegant transition-smooth border-border/60">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="font-display text-3xl font-semibold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{sub}</div>
          </Card>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Open requests */}
        <Card className="lg:col-span-2 p-5 lg:p-6 shadow-card border-border/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold">Pedidos abertos</h2>
              <p className="text-sm text-muted-foreground">Os que precisam de ação</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/requests">Ver todos <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          <div className="space-y-2">
            {openRequests.slice(0, 5).map((r) => {
              const resident = residents.find((p) => p.id === r.residentId);
              return (
                <Link
                  key={r.id}
                  to={`/requests/${r.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth border border-transparent hover:border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-muted-foreground">{r.code}</span>
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
            })}
          </div>
        </Card>

        {/* Today's cleaning */}
        <Card className="p-5 lg:p-6 shadow-card border-border/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold">Limpeza de hoje</h2>
              <p className="text-sm text-muted-foreground">{todaysCleaning.length} agendadas</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/cleaning"><ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="space-y-2">
            {todaysCleaning.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                  t.status === "in_progress" ? "bg-warning/20 text-warning" : "bg-secondary text-secondary-foreground"
                }`}>
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{t.area}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.scheduledFor).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                    {t.assignedTo && ` · ${t.assignedTo}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
