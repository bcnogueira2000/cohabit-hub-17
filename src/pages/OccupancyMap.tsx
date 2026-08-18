import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, colorKey, getInitials, parseRoomNumber, type RoomSide } from "@/lib/utils";

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
const monthLabel = (d: Date) =>
  `${d.toLocaleDateString("pt-PT", { month: "long" })} ${d.getFullYear()}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

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

const avatarTones = [
  "bg-primary/90 text-primary-foreground",
  "bg-secondary/90 text-secondary-foreground",
  "bg-warning/90 text-warning-foreground",
  "bg-destructive/90 text-destructive-foreground",
];

const OccupancyMap = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useOccupancyData();
  const rooms = data?.rooms ?? [];
  const stays = data?.stays ?? [];
  const typologies = data?.typologies ?? [];

  const [floor, setFloor] = useState<string>("all");
  const [typology, setTypology] = useState<string>("all");
  const [monthOffset, setMonthOffset] = useState(0);
  const [showEmpty, setShowEmpty] = useState(false);

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
      const label = `${d.toLocaleDateString("pt-PT", { month: "long" })} ${d.getFullYear()}`;
      const last = spans[spans.length - 1];
      if (last && last.label === label) last.count++;
      else spans.push({ label, count: 1 });
    }
    return spans;
  }, [days]);

  /** Colunas semanais (segunda a domingo), recortadas à janela visível. */
  const weekSpans = useMemo(() => {
    const spans: { key: string; label: string; startIdx: number; count: number; hasToday: boolean }[] = [];
    for (let i = 0; i < totalDays; ) {
      const d = days[i];
      const dow = (d.getDay() + 6) % 7; // 0 = segunda
      const count = Math.min(7 - dow, totalDays - i);
      const last = days[i + count - 1];
      const fmt = (x: Date) => x.toLocaleDateString("pt-PT", { day: "numeric", month: "short" }).replace(".", "");
      const today = new Date();
      const hasToday = days.slice(i, i + count).some((x) => diffDays(x, today) === 0);
      spans.push({
        key: d.toISOString(),
        label: `${d.getDate()}–${fmt(last)}`,
        startIdx: i,
        count,
        hasToday,
      });
      i += count;
    }
    return spans;
  }, [days, totalDays]);

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

  const visibleFloors = useMemo(() => {
    const entries = Object.entries(byFloor).sort(([a], [b]) => Number(a) - Number(b));
    if (showEmpty) return entries;
    const withBars = entries.filter(([, rs]) => rs.some((r) => (barsByRoom.get(r.id) ?? []).length > 0));
    return withBars.length ? withBars : entries;
  }, [byFloor, barsByRoom, showEmpty]);

  const hiddenCount = Object.keys(byFloor).length - visibleFloors.length;

  const dayWidth = 8;
  const labelWidth = 200;
  const gridWidth = totalDays * dayWidth;

  const openBar = (bar: Bar) => {
    if (bar.contractId) navigate(`/finance/contracts/${bar.contractId}`);
    else navigate(`/rooms/${bar.roomId}`);
  };

  const firstMonthLabel = monthSpans[0]?.label ?? "";

  const jumpMonths = useMemo(() => {
    const today = new Date();
    const start = addMonths(today, -3);
    const end = addMonths(today, 24);
    const list: { key: string; label: string; offset: number }[] = [];
    let cursor = start;
    while (cursor <= end) {
      const offset = cursor.getMonth() - today.getMonth() + (cursor.getFullYear() - today.getFullYear()) * 12;
      list.push({ key: monthKey(cursor), label: monthLabel(cursor), offset });
      cursor = addMonths(cursor, 1);
    }
    return list;
  }, []);

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="space-y-5">
        {/* Header — 3-month navigation + month jump */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight min-w-[200px] capitalize">
              {firstMonthLabel}
            </h1>
            <div className="flex items-center bg-muted p-1 rounded-lg border border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground rounded-md"
                onClick={() => setMonthOffset((o) => o - 3)}
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
              <Button
                variant={monthOffset === 0 ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs font-medium rounded-md"
                onClick={() => setMonthOffset(0)}
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground rounded-md"
                onClick={() => setMonthOffset((o) => o + 3)}
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>

            <Select
              value={monthKey(windowStart)}
              onValueChange={(key) => {
                const found = jumpMonths.find((m) => m.key === key);
                if (found) setMonthOffset(found.offset);
              }}
            >
              <SelectTrigger className="w-[180px] h-7 text-xs rounded-lg gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <SelectValue placeholder="Ir para mês" />
              </SelectTrigger>
              <SelectContent>
                {jumpMonths.map((m) => (
                  <SelectItem key={m.key} value={m.key} className="text-xs capitalize">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={floor} onValueChange={setFloor}>
              <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg"><SelectValue placeholder="Piso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pisos</SelectItem>
                {floors.map((f) => (
                  <SelectItem key={f} value={String(f)}>Piso {f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typology} onValueChange={setTypology}>
              <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg"><SelectValue placeholder="Tipologia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tipologias</SelectItem>
                {typologies.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Legend + toggle */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-yellow-400/35 border border-dashed border-yellow-600/70" />Reservado</span>
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-green-700/60 border border-green-700/50 shadow-sm" />Ocupado</span>
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-md bg-muted border border-border" />Livre</span>
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setShowEmpty((v) => !v)}>
            {showEmpty ? "Esconder pisos sem ocupação" : `Mostrar todos os pisos${hiddenCount > 0 ? ` (+${hiddenCount})` : ""}`}
          </Button>
        </div>

        {/* Timeline grid */}
        <Card className="overflow-hidden border border-border/60 shadow-card">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-sm text-muted-foreground">A carregar…</div>
            ) : (
              <div style={{ minWidth: labelWidth + gridWidth }}>
                {/* Month header */}
                <div className="flex sticky top-0 z-20 bg-muted/30 border-b border-border/60">
                  <div
                    style={{ width: labelWidth }}
                    className="shrink-0 sticky left-0 z-30 bg-card border-r border-border/60 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Quarto
                  </div>
                  {monthSpans.map((m) => (
                    <div
                      key={m.label}
                      style={{ width: m.count * dayWidth }}
                      className="shrink-0 border-l border-border/40 px-3 py-3 text-xs font-semibold capitalize text-foreground"
                    >
                      {m.label}
                    </div>
                  ))}
                </div>

                {/* Week header */}
                <div className="flex border-b border-border/60 bg-muted/20">
                  <div style={{ width: labelWidth }} className="shrink-0 sticky left-0 z-20 bg-card border-r border-border/60 px-5" />
                  {weekSpans.map((w) => (
                    <div
                      key={w.key}
                      style={{ width: w.count * dayWidth }}
                      className={cn(
                        "shrink-0 border-l border-border/30 text-center text-[10px] leading-5 px-1 py-2 truncate",
                        w.hasToday ? "bg-primary/5 text-primary font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {w.label}
                    </div>
                  ))}
                </div>

                {visibleFloors.map(([f, rs]) => (
                  <div key={f}>
                    {/* Floor row */}
                    <div className="flex bg-muted/40 border-y border-border/50">
                      <div
                        style={{ width: labelWidth }}
                        className="shrink-0 sticky left-0 z-20 bg-muted/60 border-r border-border/60 px-5 py-2 text-xs font-bold text-foreground"
                      >
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
                          {/* Side row */}
                          <div className="flex border-b border-border/30">
                            <div
                              style={{ width: labelWidth }}
                              className="shrink-0 sticky left-0 z-20 bg-card border-r border-border/60 px-5 pt-2 pb-1 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/80"
                            >
                              {sideLabels[side]}
                            </div>
                            <div style={{ width: gridWidth }} className="shrink-0" />
                          </div>

                          {list.map((r) => {
                            const bars = barsByRoom.get(r.id) ?? [];
                            return (
                              <div
                                key={r.id}
                                className="flex group border-b border-border/20 hover:bg-muted/20 transition-smooth"
                              >
                                <div
                                  style={{ width: labelWidth }}
                                  className="shrink-0 sticky left-0 z-20 bg-card group-hover:bg-muted/20 border-r border-border/60 px-5 py-1.5 text-sm flex flex-col justify-center transition-smooth"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground leading-tight">{r.number}</span>
                                    <span className="text-[10px] text-muted-foreground truncate leading-tight">{r.typology}</span>
                                  </div>
                                </div>
                                <div className="relative shrink-0 h-full" style={{ width: gridWidth }}>
                                  {/* weekly grid lines */}
                                  {weekSpans.map((w) => (
                                    <div
                                      key={w.key}
                                      className={cn(
                                        "absolute top-0 bottom-0 border-l",
                                        w.hasToday ? "bg-green-600/[0.03] border-green-600/20" : "border-border/20"
                                      )}
                                      style={{ left: w.startIdx * dayWidth, width: w.count * dayWidth }}
                                    />
                                  ))}
                                  {bars.map((bar) => {
                                    const width = Math.max(6, (bar.endIdx - bar.startIdx + 1) * dayWidth - 4);
                                    return (
                                      <button
                                        key={bar.stayId}
                                        type="button"
                                        onClick={() => openBar(bar)}
                                        title={`${bar.label} · ${bar.tone === "occupied" ? "Ocupado" : "Reservado"}`}
                                        className={cn(
                                          "absolute inset-y-0 h-full rounded-sm px-1 text-[9px] font-semibold text-left flex items-center gap-1 overflow-hidden transition-smooth hover:shadow-md hover:scale-[1.01]",
                                          bar.tone === "occupied"
                                            ? "bg-green-700/60 text-white border border-green-700/50 shadow-sm shadow-green-900/20"
                                            : "bg-yellow-400/35 text-yellow-950 border border-dashed border-yellow-600/70"
                                        )}
                                        style={{
                                          left: bar.startIdx * dayWidth + 2,
                                          width,
                                        }}
                                      >
                                        <span
                                          className={cn(
                                            "shrink-0 h-3 w-3 rounded-full grid place-items-center text-[7px] font-bold",
                                            bar.tone === "occupied"
                                              ? "bg-white/25 text-white"
                                              : "bg-yellow-950/15 text-yellow-950"
                                          )}
                                        >
                                          {getInitials(bar.label).slice(0, 2)}
                                        </span>
                                        {width > 55 && <span className="truncate">{bar.label}</span>}
                                      </button>
                                    );
                                  })}
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
          </div>
        </Card>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Janela de 3 meses · colunas semanais · use os saltos para ver até 2 anos</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Semana atual destacada</span>
        </div>
      </div>
    </div>
  );
};

export default OccupancyMap;
