import { useState } from "react";
import { Link } from "react-router-dom";
import { DoorClosed, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useRooms, useResidents } from "@/hooks/useData";
import { roomStatusLabels } from "@/lib/labels";
import { Room, RoomStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusTone: Record<RoomStatus, string> = {
  available: "bg-success/15 text-success border-success/30",
  occupied: "bg-primary/10 text-primary border-primary/30",
  reserved: "bg-info/15 text-info border-info/30",
  maintenance: "bg-warning/20 text-warning border-warning/30",
  cleaning_required: "bg-accent text-accent-foreground border-accent",
  out_of_service: "bg-destructive/10 text-destructive border-destructive/30",
};

const statusFilters: { value: RoomStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "occupied", label: "Ocupados" },
  { value: "available", label: "Disponíveis" },
  { value: "cleaning_required", label: "Precisa limpeza" },
  { value: "maintenance", label: "Manutenção" },
];

const Rooms = () => {
  const { data: rooms = [] } = useRooms();
  const { data: residents = [] } = useResidents();
  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const filtered = rooms.filter((r) => filter === "all" || r.status === filter);

  const byFloor = filtered.reduce<Record<number, Room[]>>((acc, r) => {
    (acc[r.floor] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl lg:text-4xl font-semibold">Rooms</h1>
        <p className="text-muted-foreground mt-1">{rooms.length} quartos · vista por andar</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
        {statusFilters.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-smooth",
              filter === f.value ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-foreground/30")}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {Object.entries(byFloor).sort(([a], [b]) => Number(a) - Number(b)).map(([floor, rs]) => (
          <div key={floor}>
            <h2 className="font-display text-xl font-semibold mb-3">{floor}º andar</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {rs.map((r) => {
                const resident = residents.find((p) => p.id === r.currentResidentId);
                return (
                  <Link key={r.id} to={`/rooms/${r.id}`}>
                    <Card className="p-4 hover:shadow-elegant transition-smooth border-border/60 cursor-pointer h-full">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DoorClosed className="h-4 w-4 text-muted-foreground" />
                          <span className="font-display text-2xl font-semibold">{r.number}</span>
                        </div>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", statusTone[r.status])}>{roomStatusLabels[r.status]}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">{r.typology}</div>
                      {resident ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{resident.fullName}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">Sem residente</div>
                      )}
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Rooms;
