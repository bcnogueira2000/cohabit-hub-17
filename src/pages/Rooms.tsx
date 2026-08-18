import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DoorClosed, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useRooms, useResidents, useStays } from "@/hooks/useData";
import { roomStatusLabels } from "@/lib/labels";
import { Room, RoomStatus } from "@/lib/types";
import { cn, parseRoomNumber, type RoomSide } from "@/lib/utils";

// Badge tone per status
const statusTone: Record<RoomStatus, string> = {
  available: "bg-muted text-muted-foreground border-border",
  occupied: "bg-primary/15 text-primary border-primary/30",
  reserved: "bg-info/15 text-info border-info/30",
  maintenance: "bg-warning/20 text-warning border-warning/40",
  cleaning_required: "bg-accent text-accent-foreground border-accent",
  out_of_service: "bg-destructive/10 text-destructive border-destructive/30",
};

// Card surface per status — disponíveis ficam brancos (card default)
const cardTone: Record<RoomStatus, string> = {
  available: "bg-card border-border/60",
  occupied: "bg-primary/10 border-primary/30",
  reserved: "bg-info/10 border-info/30",
  maintenance: "bg-warning/10 border-warning/30",
  cleaning_required: "bg-accent/60 border-accent",
  out_of_service: "bg-destructive/10 border-destructive/30",
};

const statusFilters: { value: RoomStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "occupied", label: "Ocupados" },
  { value: "reserved", label: "Reservados" },
  { value: "available", label: "Disponíveis" },
  { value: "cleaning_required", label: "Precisa limpeza" },
  { value: "maintenance", label: "Manutenção" },
];

const sideOrder: RoomSide[] = ["esquerdo", "direito", "indefinido"];
const sideLabels: Record<RoomSide, string> = {
  esquerdo: "Esquerdo",
  direito: "Direito",
  indefinido: "Indefinido",
};

const Rooms = () => {
  const { data: rooms = [] } = useRooms();
  const { data: residents = [] } = useResidents();
  const { data: stays = [] } = useStays();
  const [filter, setFilter] = useState<RoomStatus | "all">("all");

  // Estado efetivo derivado das estadias/contratos:
  // sem estadia ativa -> disponível; estadia futura/confirmada -> reservado; check-in feito -> ocupado.
  const derived = useMemo(() => {
    const map = new Map<string, { status: RoomStatus; residentId: string | null; name: string | null }>();
    for (const s of stays) {
      if (!s.roomId) continue;
      if (s.status === "checked_out" || s.status === "cancelled") continue;
      const status: RoomStatus = s.status === "checked_in" ? "occupied" : "reserved";
      const current = map.get(s.roomId);
      // ocupado tem prioridade sobre reservado
      if (!current || (current.status === "reserved" && status === "occupied")) {
        map.set(s.roomId, { status, residentId: s.residentId ?? null, name: s.fullName ?? null });
      }
    }
    return map;
  }, [stays]);

  const effective = (r: Room): RoomStatus => {
    const d = derived.get(r.id);
    if (d) return d.status;
    // estados operacionais mantêm-se quando não há estadia
    if (r.status === "maintenance" || r.status === "out_of_service" || r.status === "cleaning_required") {
      return r.status;
    }
    return "available";
  };

  const filtered = rooms.filter((r) => filter === "all" || effective(r) === filter);

  const byFloor = filtered.reduce<Record<number, Room[]>>((acc, r) => {
    (acc[r.floor] ||= []).push(r);
    return acc;
  }, {});

  const counts = rooms.reduce(
    (acc, r) => {
      const s = effective(r);
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl lg:text-4xl font-semibold">Rooms</h1>
        <p className="text-muted-foreground mt-1">
          {rooms.length} quartos · {counts.occupied ?? 0} ocupados · {counts.reserved ?? 0} reservados ·{" "}
          {counts.available ?? 0} disponíveis
        </p>
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

      <div className="space-y-8">
        {Object.entries(byFloor).sort(([a], [b]) => Number(a) - Number(b)).map(([floor, rs]) => {
          const bySide = rs.reduce<Record<RoomSide, Room[]>>((acc, r) => {
            const { side } = parseRoomNumber(r.number);
            (acc[side] ||= []).push(r);
            return acc;
          }, { esquerdo: [], direito: [], indefinido: [] });

          const presentSides = sideOrder.filter((s) => bySide[s].length > 0);

          return (
            <div key={floor}>
              <h2 className="font-display text-xl font-semibold mb-3">{floor}º andar</h2>
              <div className={cn("grid gap-4", presentSides.length > 1 ? "lg:grid-cols-2" : "grid-cols-1")}>
                {presentSides.map((side) => {
                  const sorted = [...bySide[side]].sort((a, b) => {
                    const sa = parseRoomNumber(a.number).sequence ?? 0;
                    const sb = parseRoomNumber(b.number).sequence ?? 0;
                    return sa - sb;
                  });
                  return (
                    <div key={side}>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        {sideLabels[side]}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sorted.map((r) => {
                          const status = effective(r);
                          const d = derived.get(r.id);
                          const resident = residents.find((p) => p.id === (d?.residentId ?? r.currentResidentId));
                          const occupantName = resident?.fullName ?? d?.name ?? null;
                          return (
                            <Link key={r.id} to={`/rooms/${r.id}`}>
                              <Card className={cn("px-3 py-2.5 hover:shadow-elegant transition-smooth cursor-pointer h-full", cardTone[status])}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <DoorClosed className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="font-display text-sm font-semibold">{r.number}</span>
                                  <span className="text-xs text-muted-foreground truncate">{r.typology}</span>
                                  <span className={cn("ml-auto text-[10px] leading-none px-2 py-1 rounded-full border font-medium shrink-0 whitespace-nowrap", statusTone[status])}>
                                    {roomStatusLabels[status]}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 mt-1.5 text-xs min-w-0">
                                  {occupantName ? (
                                    <>
                                      <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <span className="truncate">{occupantName}</span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground italic">Sem residente</span>
                                  )}
                                </div>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Rooms;
