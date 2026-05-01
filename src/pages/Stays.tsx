import { useState, useMemo } from "react";
import { Plus, Calendar, LogIn, LogOut, Home, Trash2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStays, useRooms, useCreateStay, useUpdateStay, useDeleteStay } from "@/hooks/useData";
import { toast } from "sonner";
import type { Stay, StayStatus } from "@/lib/types";

const statusLabel: Record<StayStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  checked_in: "Em casa",
  checked_out: "Saiu",
  cancelled: "Cancelada",
};

const statusTone: Record<StayStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-info/10 text-info",
  checked_in: "bg-success/10 text-success",
  checked_out: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

type Filter = "upcoming" | "current" | "leaving" | "history" | "all";

const Stays = () => {
  const { data: stays = [], isLoading } = useStays();
  const { data: rooms = [] } = useRooms();
  const createStay = useCreateStay();
  const updateStay = useUpdateStay();
  const deleteStay = useDeleteStay();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [roomId, setRoomId] = useState<string>("");

  const filtered = useMemo(() => {
    const now = Date.now();
    const in7 = now + 7 * 24 * 3600 * 1000;
    return stays.filter((s) => {
      const ci = new Date(s.checkIn).getTime();
      const co = new Date(s.checkOut).getTime();
      switch (filter) {
        case "upcoming": return s.status !== "cancelled" && s.status !== "checked_out" && ci > now;
        case "current": return s.status === "checked_in" || (s.status === "confirmed" && ci <= now && co >= now);
        case "leaving": return s.status === "checked_in" && co <= in7;
        case "history": return s.status === "checked_out" || s.status === "cancelled";
        case "all": return true;
      }
    });
  }, [stays, filter]);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createStay.mutate({
      fullName: String(fd.get("fullName")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone") || ""),
      roomId: roomId || null,
      checkIn: new Date(String(fd.get("checkIn"))).toISOString(),
      checkOut: new Date(String(fd.get("checkOut"))).toISOString(),
      status: fd.get("status") as any,
      notes: String(fd.get("notes") || ""),
    }, {
      onSuccess: () => { setOpen(false); setRoomId(""); toast.success("Estadia criada — automatismos disparados"); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const advance = (s: Stay) => {
    const next: StayStatus =
      s.status === "pending" ? "confirmed" :
      s.status === "confirmed" ? "checked_in" :
      s.status === "checked_in" ? "checked_out" : s.status;
    if (next === s.status) return;
    updateStay.mutate({ id: s.id, patch: { status: next } }, {
      onSuccess: () => toast.success(`Estado: ${statusLabel[next]}`),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const remove = (id: string) => {
    if (!confirm("Eliminar estadia? As tarefas geradas mantêm-se.")) return;
    deleteStay.mutate(id, { onSuccess: () => toast.success("Estadia eliminada") });
  };

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Estadias</h1>
          <p className="text-muted-foreground mt-1">Reservas de quarto · entradas, saídas e automatismos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full gradient-warm border-0 shadow-elegant">
              <Plus className="h-4 w-4 mr-1.5" /> Nova estadia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Nova estadia</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome completo</Label><Input name="fullName" required className="mt-1.5" /></div>
                <div><Label>Email</Label><Input name="email" type="email" required className="mt-1.5" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input name="phone" className="mt-1.5" /></div>
                <div>
                  <Label>Quarto</Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Escolher" /></SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => <SelectItem key={r.id} value={r.id}>Quarto {r.number} · {r.typology}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Check-in</Label><Input name="checkIn" type="date" required className="mt-1.5" /></div>
                <div><Label>Check-out</Label><Input name="checkOut" type="date" required className="mt-1.5" /></div>
              </div>
              <div>
                <Label>Estado inicial</Label>
                <Select name="status" defaultValue="confirmed">
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente (não dispara automatismos)</SelectItem>
                    <SelectItem value="confirmed">Confirmada (cria limpeza + kit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notas</Label><Textarea name="notes" className="mt-1.5" rows={2} /></div>
              <Button type="submit" className="w-full rounded-full gradient-warm border-0 mt-2">Criar estadia</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-5">
        <TabsList>
          <TabsTrigger value="upcoming">A chegar</TabsTrigger>
          <TabsTrigger value="current">Em casa</TabsTrigger>
          <TabsTrigger value="leaving">A sair</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">A carregar…</div>}
        {!isLoading && filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground border-dashed">
            Sem estadias neste filtro.
          </Card>
        )}
        {filtered.map((s) => {
          const room = rooms.find((r) => r.id === s.roomId);
          const ci = new Date(s.checkIn);
          const co = new Date(s.checkOut);
          return (
            <Card key={s.id} className="p-4 lg:p-5 shadow-card border-border/60 hover:shadow-elegant transition-smooth">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <Badge variant="outline" className={statusTone[s.status]}>{statusLabel[s.status]}</Badge>
                    {room && <span className="text-xs text-muted-foreground flex items-center gap-1"><Home className="h-3 w-3" /> Quarto {room.number}</span>}
                    <span className="text-[11px] text-muted-foreground capitalize">· {s.source.replace("_", " ")}</span>
                  </div>
                  <div className="font-display text-lg font-semibold truncate">{s.fullName}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.email}{s.phone && ` · ${s.phone}`}</div>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="flex items-center gap-1.5 text-success"><LogIn className="h-3.5 w-3.5" /> {ci.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="flex items-center gap-1.5 text-warning"><LogOut className="h-3.5 w-3.5" /> {co.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {Math.max(1, Math.round((co.getTime() - ci.getTime()) / 86400000))} noites
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.status !== "checked_out" && s.status !== "cancelled" && (
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => advance(s)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {s.status === "pending" && "Confirmar"}
                      {s.status === "confirmed" && "Check-in"}
                      {s.status === "checked_in" && "Check-out"}
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 p-5 bg-muted/30 border-dashed">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <strong className="text-foreground">Como funcionam os automatismos:</strong>
            <ul className="mt-1.5 space-y-1 list-disc list-inside">
              <li>Confirmar estadia → cria automaticamente limpeza pré-entrada (D-1) e tarefa "Kit de boas-vindas" (D-0). O residente é criado/atualizado e o quarto fica reservado.</li>
              <li>Check-in → quarto passa a ocupado, residente fica ativo.</li>
              <li>Check-out → residente fica "a sair" (gera inspeção + devolução de caução) e o quarto fica a precisar de limpeza.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Stays;
