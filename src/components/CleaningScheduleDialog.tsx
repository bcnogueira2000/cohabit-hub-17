import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUpsertCleaningSchedule, type CleaningSchedule } from "@/hooks/useCleaningSchedules";
import { useRooms } from "@/hooks/useData";
import { cleaningTypeLabels, cleaningServiceLabels } from "@/lib/labels";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schedule?: CleaningSchedule | null;
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const CleaningScheduleDialog = ({ open, onOpenChange, schedule }: Props) => {
  const upsert = useUpsertCleaningSchedule();
  const { data: rooms = [] } = useRooms();

  const [form, setForm] = useState({
    name: "",
    type: "room_regular",
    service: "normal" as "normal" | "simple",
    area: "",
    room_id: "__none__",
    recurrence: "weekly" as "weekly" | "biweekly" | "monthly",
    day_of_week: 1,
    hour: 10,
    minute: 0,
    assigned_to: "",
    notes: "",
    active: true,
  });

  useEffect(() => {
    if (schedule) {
      setForm({
        name: schedule.name,
        type: schedule.type,
        service: schedule.service,
        area: schedule.area,
        room_id: schedule.room_id ?? "__none__",
        recurrence: schedule.recurrence,
        day_of_week: schedule.day_of_week,
        hour: schedule.hour,
        minute: schedule.minute,
        assigned_to: schedule.assigned_to ?? "",
        notes: schedule.notes ?? "",
        active: schedule.active,
      });
    } else {
      setForm({
        name: "",
        type: "room_regular",
        service: "normal",
        area: "",
        room_id: "__none__",
        recurrence: "weekly",
        day_of_week: 1,
        hour: 10,
        minute: 0,
        assigned_to: "",
        notes: "",
        active: true,
      });
    }
  }, [schedule, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.area.trim()) {
      toast.error("Preenche nome e área");
      return;
    }
    try {
      await upsert.mutateAsync({
        id: schedule?.id,
        name: form.name.trim(),
        type: form.type as any,
        service: form.service,
        area: form.area.trim(),
        room_id: form.room_id === "__none__" ? null : form.room_id,
        recurrence: form.recurrence,
        day_of_week: form.day_of_week,
        hour: form.hour,
        minute: form.minute,
        assigned_to: form.assigned_to.trim() || null,
        notes: form.notes.trim() || null,
        active: form.active,
      });
      toast.success(schedule ? "Agendamento atualizado" : "Agendamento criado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{schedule ? "Editar agendamento" : "Novo agendamento recorrente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Limpeza semanal — Cozinha" className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(cleaningTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Serviço</Label>
              <Select value={form.service} onValueChange={(v: any) => setForm({ ...form, service: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(cleaningServiceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Área (descrição)</Label>
            <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex.: Cozinha piso 1" className="mt-1.5" />
          </div>
          <div>
            <Label>Quarto (opcional)</Label>
            <Select value={form.room_id} onValueChange={(v) => setForm({ ...form, room_id: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— sem quarto —</SelectItem>
                {rooms.map((r) => <SelectItem key={r.id} value={r.id}>Quarto {r.number}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cadência</Label>
              <Select value={form.recurrence} onValueChange={(v: any) => setForm({ ...form, recurrence: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dia da semana</Label>
              <Select value={String(form.day_of_week)} onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hora</Label>
              <Input type="number" min={0} max={23} value={form.hour} onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })} className="mt-1.5" />
            </div>
            <div>
              <Label>Minuto</Label>
              <Input type="number" min={0} max={59} value={form.minute} onChange={(e) => setForm({ ...form, minute: Number(e.target.value) })} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>Responsável (opcional)</Label>
            <Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1.5" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <Label htmlFor="active" className="cursor-pointer">Ativo</Label>
            <Switch id="active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending}>{schedule ? "Guardar" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
