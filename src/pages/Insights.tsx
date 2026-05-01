import { TrendingUp, Sparkles, Users, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requests, cleaningTasks, rooms, residents, opsTasks } from "@/lib/mockData";

const Insights = () => {
  const totalRequests = requests.length;
  const resolved = requests.filter((r) => r.status === "resolved" || r.status === "closed").length;
  const resolutionRate = Math.round((resolved / totalRequests) * 100);
  const urgentOpen = requests.filter((r) => r.priority === "urgent" && r.status !== "resolved" && r.status !== "closed").length;
  const cleaningsCompleted = cleaningTasks.filter((t) => t.status === "completed").length;
  const cleaningsTotal = cleaningTasks.length;
  const occupancy = Math.round((rooms.filter((r) => r.status === "occupied").length / rooms.length) * 100);
  const overdueTasks = opsTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length;

  const byCategory = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = sortedCats[0]?.[1] || 1;

  const alerts: { icon: any; text: string; tone: string }[] = [];
  if (urgentOpen > 0) alerts.push({ icon: AlertTriangle, text: `${urgentOpen} pedido(s) urgente(s) por resolver`, tone: "bg-destructive/10 text-destructive border-destructive/30" });
  if (overdueTasks > 0) alerts.push({ icon: Clock, text: `${overdueTasks} tarefa(s) com prazo ultrapassado`, tone: "bg-warning/15 text-warning border-warning/30" });
  const checkingOut = residents.filter((r) => r.status === "checking_out").length;
  if (checkingOut > 0) alerts.push({ icon: Users, text: `${checkingOut} check-out(s) próximo(s) — preparar inspeção`, tone: "bg-info/10 text-info border-info/30" });

  const kpis = [
    { label: "Taxa de resolução", value: `${resolutionRate}%`, sub: `${resolved}/${totalRequests} pedidos`, icon: CheckCircle2, tone: "bg-success/10 text-success" },
    { label: "Ocupação", value: `${occupancy}%`, sub: "Quartos ativos", icon: TrendingUp, tone: "bg-primary/10 text-primary" },
    { label: "Limpezas concluídas", value: `${cleaningsCompleted}/${cleaningsTotal}`, sub: "Esta semana", icon: Sparkles, tone: "bg-info/10 text-info" },
    { label: "Pedidos urgentes", value: urgentOpen, sub: "Por resolver", icon: AlertTriangle, tone: "bg-destructive/10 text-destructive" },
  ];

  const catLabel: Record<string, string> = {
    maintenance: "Manutenção", cleaning: "Limpeza", consumables: "Consumíveis", wifi_tech: "Wi-Fi/Tech",
    noise: "Ruído", billing: "Faturação", lost_found: "Perdidos", feedback: "Feedback", other: "Outros",
  };

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl lg:text-4xl font-semibold">Insights</h1>
        <p className="text-muted-foreground mt-1">Saúde operacional e métricas chave</p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((a, i) => (
            <Card key={i} className={`p-3 border ${a.tone} flex items-center gap-3`}>
              <a.icon className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{a.text}</span>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {kpis.map(({ label, value, sub, icon: Icon, tone }) => (
          <Card key={label} className="p-5 border-border/60 shadow-card">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tone}`}><Icon className="h-4 w-4" /></div>
            </div>
            <div className="font-display text-3xl font-semibold">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{sub}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5 lg:p-6 border-border/60 shadow-card">
        <h2 className="font-display text-xl font-semibold mb-4">Pedidos por categoria</h2>
        <div className="space-y-3">
          {sortedCats.map(([cat, count]) => (
            <div key={cat}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium">{catLabel[cat] || cat}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full gradient-warm rounded-full transition-all" style={{ width: `${(count / maxCat) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Insights;
