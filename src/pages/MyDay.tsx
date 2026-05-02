import { useMemo, useState } from "react";
import { Sparkles, ListChecks, Clock, Check, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useCleaningTasks, useOpsTasks, useUpdateCleaningTask, useUpdateOpsTask } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Item =
  | { kind: "cleaning"; id: string; time: Date; title: string; subtitle: string; status: string; raw: any }
  | { kind: "task"; id: string; time: Date; title: string; subtitle: string; status: string; raw: any };

const isToday = (d: Date) => d.toDateString() === new Date().toDateString();

const MyDay = () => {
  const { user } = useAuth();
  const { data: cleanings = [] } = useCleaningTasks();
  const { data: tasks = [] } = useOpsTasks();
  const updateCleaning = useUpdateCleaningTask();
  const updateTask = useUpdateOpsTask();

  const [filter, setFilter] = useState<"all" | "cleaning" | "task">("all");
  const [scope, setScope] = useState<"today" | "mine">("today");
  const [sel, setSel] = useState<Item | null>(null);
  const [notes, setNotes] = useState("");

  const items: Item[] = useMemo(() => {
    const isMine = (assignedUserId: string | null) =>
      !!user && assignedUserId === user.id;

    const cleaningItems: Item[] = cleanings
      .filter((c) => {
        if (c.status === "completed") return false;
        if (scope === "mine") return isMine(c.assignedToUserId);
        // today scope
        return isToday(new Date(c.scheduledFor));
      })
      .map((c) => ({
        kind: "cleaning",
        id: c.id,
        time: new Date(c.scheduledFor),
        title: c.area,
        subtitle: `${c.service === "normal" ? "Limpeza normal" : "Limpeza simples"} · ${c.assignedTo ?? "Sem atribuição"}`,
        status: c.status,
        raw: c,
      }));

    const taskItems: Item[] = tasks
      .filter((t) => {
        if (t.status === "done") return false;
        if (scope === "mine") return isMine(t.assignedToUserId);
        // today scope: only those due today
        return t.dueDate && isToday(new Date(t.dueDate));
      })
      .map((t) => ({
        kind: "task",
        id: t.id,
        time: new Date(t.dueDate ?? t.createdAt),
        title: t.title,
        subtitle: `Tarefa · ${t.assignedTo ?? "Sem atribuição"}`,
        status: t.status,
        raw: t,
      }));

    let merged = [...cleaningItems, ...taskItems].sort(
      (x, y) => x.time.getTime() - y.time.getTime(),
    );
    if (filter !== "all") merged = merged.filter((m) => m.kind === filter);
    return merged;
  }, [cleanings, tasks, filter, scope, user]);

  const openItem = (it: Item) => {
    setSel(it);
    setNotes(it.kind === "cleaning" ? (it.raw.notes ?? "") : (it.raw.description ?? ""));
  };

  const setStatus = (it: Item, status: string) => {
    if (it.kind === "cleaning") updateCleaning.mutate({ id: it.id, patch: { status: status as any } });
    else updateTask.mutate({ id: it.id, patch: { status: status as any } });
    setSel(null);
  };

  const toggleChecklist = (idx: number) => {
    if (!sel || sel.kind !== "cleaning" || !sel.raw.checklist) return;
    const next = [...sel.raw.checklist];
    next[idx] = { ...next[idx], done: !next[idx].done };
    updateCleaning.mutate({ id: sel.id, patch: { checklist: next } });
    setSel({ ...sel, raw: { ...sel.raw, checklist: next } });
  };

  const saveNotes = () => {
    if (!sel) return;
    if (sel.kind === "cleaning") updateCleaning.mutate({ id: sel.id, patch: { notes } });
    else updateTask.mutate({ id: sel.id, patch: { description: notes } });
  };

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-8 max-w-3xl mx-auto pb-24">
      <div className="mb-5">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">O meu dia</div>
        <h1 className="font-display text-3xl font-semibold capitalize">
          {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
      </div>

      {/* Scope toggle */}
      <div className="inline-flex p-1 rounded-full bg-muted/40 border border-border mb-4">
        <button
          onClick={() => setScope("today")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-smooth",
            scope === "today" ? "bg-foreground text-background" : "text-muted-foreground",
          )}
        >
          Hoje
        </button>
        <button
          onClick={() => setScope("mine")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-smooth",
            scope === "mine" ? "bg-foreground text-background" : "text-muted-foreground",
          )}
        >
          Atribuídas a mim
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {([["all","Todas"],["cleaning","Limpeza"],["task","Manutenção/Tarefas"]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v as any)}
            className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-smooth",
              filter === v ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border")}>
            {l}
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground border-dashed">
          {scope === "mine"
            ? "Não tens tarefas atribuídas neste momento."
            : "Nada por fazer hoje. Bom trabalho!"}
        </Card>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <Card key={`${it.kind}-${it.id}`} onClick={() => openItem(it)}
            className="p-4 cursor-pointer active:scale-[0.99] transition-transform border-border/60">
            <div className="flex items-start gap-3">
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                it.kind === "cleaning" ? "bg-primary/10 text-primary" : "bg-info/10 text-info")}>
                {it.kind === "cleaning" ? <Sparkles className="h-5 w-5" /> : <ListChecks className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {scope === "mine" && !isToday(it.time)
                    ? it.time.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })
                    : it.time.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                  {it.status === "in_progress" && <span className="px-1.5 py-0.5 rounded-full bg-warning/20 text-warning text-[10px]">em curso</span>}
                </div>
                <div className="font-medium leading-tight">{it.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{it.subtitle}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          {sel && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">{sel.title}</SheetTitle>
              </SheetHeader>
              <div className="text-sm text-muted-foreground my-3 flex flex-wrap gap-3">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />
                  {sel.time.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {sel.subtitle}</span>
              </div>

              {sel.kind === "cleaning" && Array.isArray(sel.raw.checklist) && sel.raw.checklist.length > 0 && (
                <div className="my-4">
                  <div className="text-sm font-semibold mb-2">Checklist</div>
                  <div className="space-y-1">
                    {sel.raw.checklist.map((it: any, idx: number) => (
                      <label key={idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 cursor-pointer">
                        <Checkbox checked={it.done} onCheckedChange={() => toggleChecklist(idx)} />
                        <span className={cn("text-sm", it.done && "line-through text-muted-foreground")}>{it.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="my-4">
                <div className="text-sm font-semibold mb-2">Notas</div>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} rows={3}
                  placeholder="Apontamentos, fotos por descrever, etc." />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {sel.status !== "in_progress" && sel.status !== "completed" && sel.status !== "done" && (
                  <Button onClick={() => setStatus(sel, "in_progress")} className="rounded-full gradient-warm border-0 h-12">
                    <Clock className="h-4 w-4 mr-1.5" /> Iniciar
                  </Button>
                )}
                <Button onClick={() => setStatus(sel, sel.kind === "cleaning" ? "completed" : "done")}
                  className="rounded-full h-12 col-span-2 bg-success text-success-foreground hover:bg-success/90">
                  <Check className="h-4 w-4 mr-1.5" /> Concluir
                </Button>
                {sel.kind === "task" && sel.status !== "blocked" && (
                  <Button variant="outline" onClick={() => setStatus(sel, "blocked")} className="rounded-full h-12 col-span-2">
                    Bloquear
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

export default MyDay;
