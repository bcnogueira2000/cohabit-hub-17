import { useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OpsTask, TaskPriority } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useStaffUsers } from "@/hooks/useStaffUsers";

interface Props {
  trigger: ReactNode;
  onCreate: (task: OpsTask) => void;
}

const categories: OpsTask["category"][] = ["maintenance", "logistics", "admin", "supplier", "other"];
const categoryLabels: Record<string, string> = {
  maintenance: "Manutenção",
  logistics: "Logística",
  admin: "Administrativo",
  supplier: "Fornecedor",
  other: "Outro",
};

const NONE = "__none__";

export const NewTaskDialog = ({ trigger, onCreate }: Props) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<OpsTask["category"]>("maintenance");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignedUserId, setAssignedUserId] = useState<string>(NONE);
  const [dueDate, setDueDate] = useState("");
  const { toast } = useToast();
  const { data: staff = [] } = useStaffUsers();

  const reset = () => {
    setTitle(""); setDescription(""); setCategory("maintenance");
    setPriority("medium"); setAssignedUserId(NONE); setDueDate("");
  };

  const submit = () => {
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    const selected = staff.find((s) => s.user_id === assignedUserId);
    const assignedName = selected?.full_name || selected?.email || null;
    const task: OpsTask = {
      id: `t-${Date.now()}`,
      code: "",
      title: title.trim(),
      description: description.trim(),
      category,
      status: "todo",
      priority,
      assignedTo: assignedName,
      assignedToUserId: assignedUserId === NONE ? null : assignedUserId,
      roomId: null,
      residentId: null,
      requestId: null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      createdAt: new Date().toISOString(),
    };
    onCreate(task);
    toast({ title: "Tarefa criada", description: task.title });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nova tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título *</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Comprar lâmpadas LED" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Descrição</Label>
            <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalhes adicionais..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as OpsTask["category"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Atribuída a</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger><SelectValue placeholder="Escolher…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não atribuído</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.full_name || s.email || s.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Prazo</Label>
              <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="rounded-full gradient-warm border-0" onClick={submit}>Criar tarefa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
