import { useState } from "react";
import { CalendarRange, Clock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { spaces, bookings as seed, residents } from "@/lib/mockData";
import { Booking } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const days = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  d.setHours(0, 0, 0, 0);
  return d;
});

const Bookings = () => {
  const [bookings, setBookings] = useState(seed);
  const [selectedSpace, setSelectedSpace] = useState<string>(spaces[0].id);
  const [open, setOpen] = useState(false);

  const cancelBooking = (id: string) => {
    setBookings((p) => p.filter((b) => b.id !== id));
    toast.success("Reserva cancelada");
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newBooking: Booking = {
      id: `b${Date.now()}`,
      spaceId: selectedSpace,
      residentId: String(fd.get("resident")),
      title: String(fd.get("title")),
      start: new Date(`${fd.get("date")}T${fd.get("startTime")}`).toISOString(),
      end: new Date(`${fd.get("date")}T${fd.get("endTime")}`).toISOString(),
    };
    setBookings((p) => [...p, newBooking]);
    setOpen(false);
    toast.success("Reserva criada");
  };

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Bookings</h1>
          <p className="text-muted-foreground mt-1">Reservas de espaços comuns · próximos 7 dias</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full gradient-warm border-0 shadow-elegant">
              <Plus className="h-4 w-4 mr-1.5" /> Nova reserva
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Nova reserva</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label>Espaço</Label>
                <Select value={selectedSpace} onValueChange={setSelectedSpace}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {spaces.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Residente</Label>
                <Select name="resident" defaultValue={residents[0].id}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {residents.map((r) => <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Título</Label><Input name="title" required className="mt-1.5" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Data</Label><Input name="date" type="date" required className="mt-1.5" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
                <div><Label>Início</Label><Input name="startTime" type="time" required defaultValue="10:00" className="mt-1.5" /></div>
                <div><Label>Fim</Label><Input name="endTime" type="time" required defaultValue="11:00" className="mt-1.5" /></div>
              </div>
              <Button type="submit" className="w-full rounded-full gradient-warm border-0 mt-2">Criar reserva</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {spaces.map((space) => {
          const spaceBookings = bookings.filter((b) => b.spaceId === space.id);
          return (
            <Card key={space.id} className="p-5 border-border/60 shadow-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                    <CalendarRange className="h-5 w-5 text-primary" /> {space.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{space.description} · até {space.capacity} pessoas</p>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {days.map((day) => {
                  const dayBookings = spaceBookings.filter((b) => new Date(b.start).toDateString() === day.toDateString());
                  return (
                    <div key={day.toISOString()} className="bg-muted/40 rounded-lg p-2 min-h-[100px]">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                        {day.toLocaleDateString("pt-PT", { weekday: "short" })}
                      </div>
                      <div className="text-sm font-display font-semibold mb-2">{day.getDate()}</div>
                      <div className="space-y-1">
                        {dayBookings.map((b) => {
                          const r = residents.find((rs) => rs.id === b.residentId);
                          return (
                            <div key={b.id} className="group bg-primary/10 text-primary text-[10px] rounded px-1.5 py-1 relative">
                              <div className="font-medium truncate">{b.title}</div>
                              <div className="flex items-center gap-1 text-[9px] opacity-70">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(b.start).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                              <div className="text-[9px] opacity-70 truncate">{r?.fullName.split(" ")[0]}</div>
                              <button
                                onClick={() => cancelBooking(b.id)}
                                className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 rounded-full bg-destructive text-destructive-foreground items-center justify-center"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Bookings;
