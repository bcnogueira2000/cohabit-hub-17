import { useState } from "react";
import { Sparkles, Check, Clock, User, Plus, Repeat, Pencil, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useCleaningTasks, useUpdateCleaningTask } from "@/hooks/useData";
import { useCleaningSchedules, useUpsertCleaningSchedule, useDeleteCleaningSchedule, useGenerateCleaningInstances, type CleaningSchedule } from "@/hooks/useCleaningSchedules";
import { CleaningScheduleDialog } from "@/components/CleaningScheduleDialog";
import { cleaningTypeLabels, cleaningServiceLabels, cleaningServiceDescriptions, cleaningSourceLabels } from "@/lib/labels";
import { CleaningTask } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const isFuture = (iso: string) => new Date(iso) > new Date() && !isToday(iso);

const statusStyles: Record<string, string> = {
  scheduled: "bg-info/15 text-info",
  in_progress: "bg-warning/20 text-warning",
  completed: "bg-success/15 text-success",
  skipped: "bg-muted text-muted-foreground",
};
const statusLabel: Record<string, string> = {
  scheduled: "Agendada", in_progress: "Em curso", completed: "Concluída", skipped: "Saltada",
};

const Cleaning = () => {
  const { data: tasks = [] } = useCleaningTasks();
  const updateCleaning = useUpdateCleaningTask();
  const { data: schedules = [] } = useCleaningSchedules();
  const upsertSchedule = useUpsertCleaningSchedule();
  const deleteSchedule = useDeleteCleaningSchedule();
  const generate = useGenerateCleaningInstances();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tasks.find((t) => t.id === selectedId) || null;
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CleaningSchedule | null>(null);

  const today = tasks.filter((t) => isToday(t.scheduledFor) && t.status !== "completed");
  const upcoming = tasks.filter((t) => isFuture(t.scheduledFor));
  const completed = tasks.filter((t) => t.status === "completed");

  const updateTask = (id: string, patch: Partial<CleaningTask>) => updateCleaning.mutate({ id, patch });

  const DAY_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const RECURRENCE_LABEL: Record<string, string> = { weekly: "Semanal", biweekly: "Quinzenal", monthly: "Mensal" };

  const openNewSchedule = () => { setEditingSchedule(null); setScheduleDialogOpen(true); };
  const openEditSchedule = (s: CleaningSchedule) => { setEditingSchedule(s); setScheduleDialogOpen(true); };
  const handleGenerate = async (s: CleaningSchedule) => {
    try {
      const n = await generate.mutateAsync({ scheduleId: s.id, count: 8 });
      toast.success(`${n} limpeza${n === 1 ? "" : "s"} geradas a partir de "${s.name}"`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleDelete = async (s: CleaningSchedule) => {
    if (!confirm(`Apagar agendamento "${s.name}"? As limpezas já criadas mantêm-se.`)) return;
    try { await deleteSchedule.mutateAsync(s.id); toast.success("Agendamento removido"); }
    catch (e: any) { toast.error(e.message); }
  };

  const TaskCard = ({ t }: { t: CleaningTask }) => (
    <Card onClick={() => setSelectedId(t.id)} className="p-4 cursor-pointer hover:shadow-elegant transition-smooth border-border/60">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusStyles[t.status])}>{statusLabel[t.status]}</span>
            <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide",
              t.service === "normal" ? "bg-primary/15 text-primary" : "bg-secondary/15 text-secondary")}>
              {cleaningServiceLabels[t.service]}
            </span>
            <span className="text-[11px] text-muted-foreground">{cleaningTypeLabels[t.type]}</span>
          </div>
          <div className="font-medium">{t.area}</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
              {new Date(t.scheduledFor).toLocaleString("pt-PT", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            {t.assignedTo && <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.assignedTo}</span>}
            <span className="text-[11px]">· Origem: {cleaningSourceLabels[t.source]}</span>
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

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className={cn("inline-flex text-xs px-2 py-0.5 rounded-full font-medium", statusStyles[selected.status])}>{statusLabel[selected.status]}</div>
                  <div className={cn("inline-flex text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide",
                    selected.service === "normal" ? "bg-primary/15 text-primary" : "bg-secondary/15 text-secondary")}>
                    Serviço {cleaningServiceLabels[selected.service]}
                  </div>
                </div>
                <SheetTitle className="font-display text-2xl">{selected.area}</SheetTitle>
              </SheetHeader>
              <div className="rounded-lg bg-muted/40 border border-border/60 p-3 my-4 text-xs text-muted-foreground">
                {cleaningServiceDescriptions[selected.service]}
              </div>
              <div className="space-y-3 my-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4" /> {cleaningTypeLabels[selected.type]}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" />
                  {new Date(selected.scheduledFor).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
                </div>
                {selected.assignedTo && <div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /> {selected.assignedTo}</div>}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-[11px] uppercase tracking-wide">Origem:</span> {cleaningSourceLabels[selected.source]}
                </div>
              </div>
              {selected.checklist && Array.isArray(selected.checklist) && selected.checklist.length > 0 && (
                <div className="mb-5">
                  <h3 className="font-display text-lg font-semibold mb-2">Checklist</h3>
                  <div className="space-y-1.5">
                    {selected.checklist.map((item, idx) => (
                      <label key={idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 cursor-pointer">
                        <Checkbox checked={item.done} onCheckedChange={(c) => {
                          const next = [...selected.checklist!];
                          next[idx] = { ...item, done: !!c };
                          updateTask(selected.id, { checklist: next });
                        }} />
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
