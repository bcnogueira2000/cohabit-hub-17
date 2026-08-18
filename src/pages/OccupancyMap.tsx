import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, parseRoomNumber, type RoomSide } from "@/lib/utils";

type RoomRow = { id: string; number: string; floor: number; typology: string; typology_id: string | null };
type StayRow = {
  id: string;
  room_id: string | null;
  check_in: string;
  check_out: string;
  status: string;
  contract_id: string | null;
  full_name: string;
  contract: { id: string; status: string; start_date: string; end_date: string; actual_end_date: string | null } | null;
};

const sideOrder: RoomSide[] = ["esquerdo", "direito", "indefinido"];
const sideLabels: Record<RoomSide, string> = {
  esquerdo: "Esquerdo",
  direito: "Direito",
  indefinido: "Indefinido",
};

const dayMs = 86400000;
const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseDay = (s: string) => toDay(new Date(s));
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const diffDays = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / dayMs);

const useOccupancyData = () =>
  useQuery({
    queryKey: ["occupancy-map"],
    queryFn: async () => {
      const [roomsRes, staysRes, typRes] = await Promise.all([
        supabase.from("rooms" as any).select("id, number, floor, typology, typology_id").order("number"),
        supabase
          .from("stays" as any)
          .select(
            "id, room_id, check_in, check_out, status, contract_id, full_name, contract:contracts(id, status, start_date, end_date, actual_end_date)",
          ),
        supabase.from("room_typologies" as any).select("id, name").order("sort_order"),
      ]);
      if (roomsRes.error) throw roomsRes.error;
      if (staysRes.error) throw staysRes.error;
      if (typRes.error) throw typRes.error;
      return {
        rooms: (roomsRes.data ?? []) as unknown as RoomRow[],
        stays: (staysRes.data ?? []) as unknown as StayRow[],
        typologies: (typRes.data ?? []) as unknown as { id: string; name: string }[],
      };
    },
  });

type Bar = { stayId: string; contractId: string | null; roomId: string; label: string; tone: "reserved" | "occupied"; startIdx: number; endIdx: number };

const OccupancyMap = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useOccupancyData();
  const rooms = data?.rooms ?? [];
  const stays = data?.stays ?? [];
  const typologies = data?.typologies ?? [];

  const [floor, setFloor] = useState<string>("all");
  const [typology, setTypology] = useState<string>("all");
  const [monthOffset, setMonthOffset] = useState(0);

  const windowStart = useMemo(() => addMonths(new Date(), monthOffset), [monthOffset]);
  const windowEnd = useMemo(() => addMonths(windowStart, 3), [windowStart]);
  const totalDays = useMemo(() => diffDays(windowEnd, windowStart), [windowStart, windowEnd]);

  const days = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => new Date(windowStart.getTime() + i * dayMs)),
    [windowStart, totalDays],
  );

  const monthSpans = useMemo(() => {
    const spans: { label: string; count: number }[] = [];
    for (const d of days) {
      const label = d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
      const last = spans[spans.length - 1];
      if (last && last.label === label) last.count++;
      else spans.push({ label, count: 1 });
    }
    return spans;
  }, [days]);

  const filteredRooms = useMemo(
    () =>
      rooms.filter(
        (r) =>
          (floor === "all" || String(parseRoomNumber(r.number).floor ?? r.floor) === floor) &&
          (typology === "all" || r.typology_id === typology),
      ),
    [rooms, floor, typology],
  );

  const barsByRoom = useMemo(() => {
    const map = new Map<string, Bar[]>();
    for (const s of stays) {
      if (!s.room_id) continue;
      let tone: "reserved" | "occupied" | null = null;
      let start = parseDay(s.check_in);
      let end = parseDay(s.check_out);
      const c = s.contract;
      if (s.contract_id && c) {
        if (c.status === "reserved") tone = "reserved";
        else if (c.status === "active") tone = "occupied";
        else if (c.status === "terminated") {
          tone = "occupied";
          start = parseDay(c.start_date);
          end = parseDay(c.actual_end_date ?? c.end_date);
        }
      } else if (!s.contract_id) {
        if (s.status === "confirmed") tone = "reserved";
        else if (s.status === "checked_in") tone = "occupied";
      }
      if (!tone) continue;
      // sobreposição com a janela visível
      if (end < windowStart || start >= windowEnd) continue;
      const startIdx = Math.max(0, diffDays(start, windowStart));
      const endIdx = Math.min(totalDays - 1, diffDays(end, windowStart));
      if (endIdx < startIdx) continue;
      const arr = map.get(s.room_id) ?? [];
      arr.push({
        stayId: s.id,
        contractId: s.contract_id,
        roomId: s.room_id,
        label: s.full_name,
        tone,
        startIdx,
        endIdx,
      });
      map.set(s.room_id, arr);
    }
    return map;
  }, [stays, windowStart, windowEnd, totalDays]);

  const byFloor = useMemo(
    () =>
      filteredRooms.reduce<Record<number, RoomRow[]>>((acc, r) => {
        const f = parseRoomNumber(r.number).floor ?? r.floor;
        (acc[f] ??= []).push(r);
        return acc;
      }, {}),
    [filteredRooms],
  );

  const floors = useMemo(
    () => [...new Set(rooms.map((r) => parseRoomNumber(r.number).floor ?? r.floor))].sort((a, b) => a - b),
    [rooms],
  );

  const colWidth = 20;
  const labelWidth = 132;
  const gridWidth = totalDays * colWidth;

  const openBar = (bar: Bar) => {
    if (bar.contractId) navigate(`/finance/contracts/${bar.contractId}`);
    else navigate(`/rooms/${bar.roomId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Mapa de Ocupação</h1>
          <p className="text-muted-foreground mt-1">Janela de 3 meses · barras por estadia/contrato</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={floor} onValueChange={setFloor}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Piso" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pisos</SelectItem>
              {floors.map((f) => (
                <SelectItem key={f} value={String(f)}>Piso {f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typology} onValueChange={setTypology}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipologia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tipologias</SelectItem>
              {typologies.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setMonthOffset((o) => o - 1)} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonthOffset(0)}>Hoje</Button>
            <Button variant="outline" size="icon" onClick={() => setMonthOffset((o) => o + 1)} aria-label="Mês seguinte">
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-2"><span className="h-3 w-6 rounded bg-info/60 border border-info/40" />Reservado</span>
        <span className="flex items-center gap-2"><span className="h-3 w-6 rounded bg-primary/60 border border-primary/40" />Ocupado</span>
        <span className="flex items-center gap-2"><span className="h-3 w-6 rounded bg-muted border border-border" />Livre</span>
      </div>

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <div className="p-6 text-muted-foreground">A carregar…</div>
        ) : (
          <div style={{ minWidth: labelWidth + gridWidth }}>
            {/* Cabeçalho meses */}
            <div className="flex sticky top-0 z-10 bg-card border-b border-border">
              <div style={{ width: labelWidth }} className="shrink-0 border-r border-border" />
              {monthSpans.map((m) => (
                <div
                  key={m.label}
                  style={{ width: m.count * colWidth }}
                  className="shrink-0 border-r border-border px-2 py-1.5 text-xs font-medium capitalize truncate"
                >
                  {m.label}
                </div>
              ))}
            </div>
            {/* Cabeçalho dias */}
            <div className="flex border-b border-border bg-muted/30">
              <div style={{ width: labelWidth }} className="shrink-0 border-r border-border" />
              {days.map((d, i) => {
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    style={{ width: colWidth }}
                    className={cn(
                      "shrink-0 text-center text-[10px] leading-6 text-muted-foreground",
                      weekend && "bg-muted/60",
                    )}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>

            {Object.entries(byFloor)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([f, rs]) => (
                <div key={f}>
                  <div className="flex bg-muted/50 border-b border-border">
                    <div style={{ width: labelWidth }} className="shrink-0 px-3 py-1.5 text-xs font-semibold">
                      Piso {f}
                    </div>
                    <div style={{ width: gridWidth }} className="shrink-0" />
                  </div>
                  {sideOrder.map((side) => {
                    const list = rs
                      .filter((r) => parseRoomNumber(r.number).side === side)
                      .sort(
                        (a, b) =>
                          (parseRoomNumber(a.number).sequence ?? 0) - (parseRoomNumber(b.number).sequence ?? 0),
                      );
                    if (!list.length) return null;
                    return (
                      <div key={side}>
                        <div className="flex border-b border-border/60">
                          <div
                            style={{ width: labelWidth }}
                            className="shrink-0 px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground"
                          >
                            {sideLabels[side]}
                          </div>
                          <div style={{ width: gridWidth }} className="shrink-0" />
                        </div>
                        {list.map((r) => {
                          const bars = barsByRoom.get(r.id) ?? [];
                          return (
                            <div key={r.id} className="flex border-b border-border/40 hover:bg-muted/20">
                              <div
                                style={{ width: labelWidth }}
                                className="shrink-0 border-r border-border px-3 py-2 text-xs"
                              >
                                <span className="font-medium">{r.number}</span>
                                <span className="text-muted-foreground"> · {r.typology}</span>
                              </div>
                              <div className="relative shrink-0" style={{ width: gridWidth, height: 32 }}>
                                {days.map((d, i) => {
                                  const weekend = d.getDay() === 0 || d.getDay() === 6;
                                  return (
                                    <div
                                      key={i}
                                      className={cn("absolute top-0 bottom-0 border-r border-border/30", weekend && "bg-muted/40")}
                                      style={{ left: i * colWidth, width: colWidth }}
                                    />
                                  );
                                })}
                                {bars.map((bar) => (
                                  <button
                                    key={bar.stayId}
                                    type="button"
                                    onClick={() => openBar(bar)}
                                    title={`${bar.label} · ${bar.tone === "occupied" ? "Ocupado" : "Reservado"}`}
                                    className={cn(
                                      "absolute top-1 bottom-1 rounded px-1.5 text-[10px] font-medium truncate text-left border transition-opacity hover:opacity-80",
                                      bar.tone === "occupied"
                                        ? "bg-primary/60 border-primary/40 text-primary-foreground"
                                        : "bg-info/50 border-info/40 text-foreground",
                                    )}
                                    style={{
                                      left: bar.startIdx * colWidth + 1,
                                      width: (bar.endIdx - bar.startIdx + 1) * colWidth - 2,
                                    }}
                                  >
                                    {bar.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default OccupancyMap;
