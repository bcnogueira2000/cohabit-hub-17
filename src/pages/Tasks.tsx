import { useEffect, useState } from "react";
import { ListChecks, Calendar, Clock, AlertCircle, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useOpsTasks, useResidents, useRooms, useCreateOpsTask, useUpdateOpsTask, useDeleteOpsTask } from "@/hooks/useData";
import { useStaffUsers } from "@/hooks/useStaffUsers";
import { taskStatusLabels } from "@/lib/labels";
import { OpsTask, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { useToast } from "@/hooks/use-toast";

const columns: { id: TaskStatus; label: string; tone: string }[] = [
  { id: "todo", label: "A fazer", tone: "bg-info/10 text-info border-info/30" },
  { id: "in_progress", label: "Em curso", tone: "bg-warning/15 text-warning border-warning/30" },
  { id: "blocked", label: "Bloqueadas", tone: "bg-destructive/10 text-destructive border-destructive/30" },
  { id: "done", label: "Concluídas", tone: "bg-success/15 text-success border-success/30" },
];

const priorityDot: Record<string, string> = {
  low: "bg-muted-foreground/40", medium: "bg-info", high: "bg-destructive",
};

const NONE = "__none__";

const Tasks = () => {
  const { data: tasks = [] } = useOpsTasks();
  const { data: residents = [] } = useResidents();
  const { data: rooms = [] } = useRooms();
  const { data: staff = [] } = useStaffUsers();
  const createTask = useCreateOpsTask();
  const updateTask = useUpdateOpsTask();
  const deleteTask = useDeleteOpsTask();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tasks.find((t) => t.id === selectedId) || null;

  // Local edit state for the sheet (assignee + due date)
  const [editAssignee, setEditAssignee] = useState<string>(NONE);
  const [editDueDate, setEditDueDate] = useState<string>("");

  useEffect(() => {
    if (!selected) return;
    setEditAssignee(selected.assignedToUserId ?? NONE);
    setEditDueDate(selected.dueDate ? selected.dueDate.slice(0, 10) : "");
  }, [selected?.id, selected?.assignedToUserId, selected?.dueDate]);

  const setStatus = (id: string, status: TaskStatus) => updateTask.mutate({ id, patch: { status } });

  const onAssigneeChange = (value: string) => {
    if (!selected) return;
    setEditAssignee(value);
    const member = staff.find((s) => s.user_id === value);
    updateTask.mutate({
      id: selected.id,
      patch: {
        assignedToUserId: value === NONE ? null : value,
        assignedTo: value === NONE ? null : (member?.full_name || member?.email || null),
      },
    });
  };

  const onDueDateChange = (value: string) => {
    if (!selected) return;
    setEditDueDate(value);
    updateTask.mutate({
      id: selected.id,
      patch: { dueDate: value ? new Date(value).toISOString() : null },
    });
  };

  const onDelete = () => {
    if (!selected) return;
    deleteTask.mutate(selected.id, {
      onSuccess: () => {
        toast({ title: "Tarefa eliminada", description: selected.code });
        setSelectedId(null);
      },
      onError: (e: any) => toast({ title: "Erro a eliminar", description: e?.message, variant: "destructive" }),
    });
  };

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Tasks</h1>
          <p className="text-muted-foreground mt-1">Tarefas operacionais atribuídas à equipa</p>
        </div>
        <NewTaskDialog
          onCreate={(t) => createTask.mutate({
            title: t.title, description: t.description, category: t.category,
            priority: t.priority, assignedTo: t.assignedTo,
            assignedToUserId: t.assignedToUserId, dueDate: t.dueDate,
          })}
          trigger={
            <Button className="rounded-full gradient-warm border-0 shadow-elegant">
              <Plus className="h-4 w-4 mr-1.5" /> Nova tarefa
            </Button>
          }
        />
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const items = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium", col.tone)}>{col.label}</div>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {items.map((t) => {
                  const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done";
                  return (
                    <Card key={t.id} onClick={() => setSelectedId(t.id)} className="p-3.5 cursor-pointer hover:shadow-elegant transition-smooth border-border/60">
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", priorityDot[t.priority])} />
                        <span className="text-[10px] font-mono text-muted-foreground">{t.code}</span>
                      </div>
                      <div className="font-medium text-sm leading-snug mb-2">{t.title}</div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{t.assignedTo || "Sem atribuição"}</span>
                        {t.dueDate && (
                          <span className={cn("flex items-center gap-1", overdue && "text-destructive")}>
                            {overdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                            {new Date(t.dueDate).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {items.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-6 border-2 border-dashed border-border/50 rounded-lg">Vazio</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-muted-foreground">{selected.code}</span>
                  <span className={cn("h-2 w-2 rounded-full", priorityDot[selected.priority])} />
                  <span className="text-xs text-muted-foreground capitalize">{selected.priority}</span>
                </div>
                <SheetTitle className="font-display text-2xl">{selected.title}</SheetTitle>
              </SheetHeader>
              <p className="text-sm text-muted-foreground my-4 whitespace-pre-line">{selected.description}</p>

              <div className="space-y-2 text-sm mb-5">
                <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><span>{taskStatusLabels[selected.status]}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Atribuída a</span><span>{selected.assignedTo || "—"}</span></div>
                {selected.dueDate && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Prazo</span>
                    <span>{new Date(selected.dueDate).toLocaleDateString("pt-PT", { dateStyle: "medium" })}</span>
                  </div>
                )}
                {selected.roomId && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Quarto</span>
                    <span>{rooms.find((r) => r.id === selected.roomId)?.number}</span>
                  </div>
                )}
                {selected.residentId && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Residente</span>
                    <span>{residents.find((r) => r.id === selected.residentId)?.fullName}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                {selected.status !== "in_progress" && selected.status !== "done" && (
                  <Button onClick={() => setStatus(selected.id, "in_progress")} className="rounded-full gradient-warm border-0">
                    <Clock className="h-4 w-4 mr-1.5" /> Iniciar
                  </Button>
                )}
                {selected.status !== "done" && (
                  <Button onClick={() => setStatus(selected.id, "done")} variant="outline" className="rounded-full border-success/40 text-success hover:bg-success/10 hover:text-success">
                    <ListChecks className="h-4 w-4 mr-1.5" /> Concluir
                  </Button>
                )}
                {selected.status !== "blocked" && selected.status !== "done" && (
                  <Button onClick={() => setStatus(selected.id, "blocked")} variant="outline" className="rounded-full">Bloquear</Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Tasks;
