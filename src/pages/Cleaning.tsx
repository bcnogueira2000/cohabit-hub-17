import { useState } from "react";
import { Sparkles, Check, Clock, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { cleaningTasks as seed, cleaningTypeLabels, cleaningServiceLabels, cleaningServiceDescriptions, cleaningSourceLabels } from "@/lib/mockData";
import { CleaningTask, CleaningService } from "@/lib/types";
import { cn } from "@/lib/utils";

const isToday = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};
const isFuture = (iso: string) => new Date(iso) > new Date() && !isToday(iso);

const statusStyles: Record<string, string> = {
  scheduled: "bg-info/15 text-info",
  in_progress: "bg-warning/20 text-warning",
  completed: "bg-success/15 text-success",
  skipped: "bg-muted text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  scheduled: "Agendada",
  in_progress: "Em curso",
  completed: "Concluída",
  skipped: "Saltada",
};

const Cleaning = () => {
  const [tasks, setTasks] = useState(seed);
  const [selected, setSelected] = useState<CleaningTask | null>(null);

  const today = tasks.filter((t) => isToday(t.scheduledFor) && t.status !== "completed");
  const upcoming = tasks.filter((t) => isFuture(t.scheduledFor));
  const completed = tasks.filter((t) => t.status === "completed");

  const updateTask = (id: string, patch: Partial<CleaningTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setSelected((s) => (s && s.id === id ? { ...s, ...patch } : s));
  };

  const TaskCard = ({ t }: { t: CleaningTask }) => (
    <Card
      onClick={() => setSelected(t)}
      className="p-4 cursor-pointer hover:shadow-elegant transition-smooth border-border/60"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusStyles[t.status])}>
              {statusLabel[t.status]}
            </span>
            <span className="text-[11px] text-muted-foreground">{cleaningTypeLabels[t.type]}</span>
          </div>
          <div className="font-medium">{t.area}</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
              {new Date(t.scheduledFor).toLocaleString("pt-PT", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            {t.assignedTo && <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.assignedTo}</span>}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl lg:text-4xl font-semibold">Cleaning</h1>
        <p className="text-muted-foreground mt-1">Planeamento de limpezas, checklists e estado por área</p>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="bg-muted/60 rounded-full p-1 mb-5">
          <TabsTrigger value="today" className="rounded-full data-[state=active]:bg-card">Hoje · {today.length}</TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-full data-[state=active]:bg-card">Próximas · {upcoming.length}</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-full data-[state=active]:bg-card">Concluídas · {completed.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-2">
          {today.length === 0 && <Card className="p-10 text-center text-muted-foreground border-dashed">Nada agendado para hoje.</Card>}
          {today.map((t) => <TaskCard key={t.id} t={t} />)}
        </TabsContent>
        <TabsContent value="upcoming" className="space-y-2">
          {upcoming.length === 0 && <Card className="p-10 text-center text-muted-foreground border-dashed">Sem limpezas futuras.</Card>}
          {upcoming.map((t) => <TaskCard key={t.id} t={t} />)}
        </TabsContent>
        <TabsContent value="completed" className="space-y-2">
          {completed.map((t) => <TaskCard key={t.id} t={t} />)}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className={cn("inline-flex w-fit text-xs px-2 py-0.5 rounded-full font-medium mb-2", statusStyles[selected.status])}>
                  {statusLabel[selected.status]}
                </div>
                <SheetTitle className="font-display text-2xl">{selected.area}</SheetTitle>
              </SheetHeader>

              <div className="space-y-3 my-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-4 w-4" /> {cleaningTypeLabels[selected.type]}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {new Date(selected.scheduledFor).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
                </div>
                {selected.assignedTo && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" /> {selected.assignedTo}
                  </div>
                )}
              </div>

              {selected.checklist && (
                <div className="mb-5">
                  <h3 className="font-display text-lg font-semibold mb-2">Checklist</h3>
                  <div className="space-y-1.5">
                    {selected.checklist.map((item, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 cursor-pointer"
                      >
                        <Checkbox
                          checked={item.done}
                          onCheckedChange={(checked) => {
                            const newChecklist = [...selected.checklist!];
                            newChecklist[idx] = { ...item, done: !!checked };
                            updateTask(selected.id, { checklist: newChecklist });
                          }}
                        />
                        <span className={cn("text-sm", item.done && "line-through text-muted-foreground")}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                {selected.status !== "in_progress" && (
                  <Button onClick={() => updateTask(selected.id, { status: "in_progress" })} className="rounded-full gradient-warm border-0">
                    <Clock className="h-4 w-4 mr-1.5" /> Iniciar
                  </Button>
                )}
                {selected.status !== "completed" && (
                  <Button onClick={() => updateTask(selected.id, { status: "completed" })} variant="outline" className="rounded-full border-success/40 text-success hover:bg-success/10 hover:text-success">
                    <Check className="h-4 w-4 mr-1.5" /> Marcar concluída
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Cleaning;
