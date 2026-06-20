import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  useSpaces,
  useSpaceBookingsForDay,
  useCreateBooking,
} from "@/hooks/useResidentBookings";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ICON_STROKE } from "@/lib/residentLabels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

// Generate 30-min slots from 07:00 to 23:30
const TIME_SLOTS = Array.from({ length: 34 }, (_, i) => {
  const h = Math.floor((i + 14) / 2);
  const m = (i + 14) % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const BookingNew = () => {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const { data: allSpaces = [], isLoading: spacesLoading } = useSpaces();
  const spaces = useMemo(() => allSpaces.filter((s: any) => s.active !== false), [allSpaces]);
  const create = useCreateBooking();

  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const { data: dayBookings = [] } = useSpaceBookingsForDay(spaceId, date);

  const occupiedSlots = useMemo(() => {
    const set = new Set<string>();
    dayBookings.forEach((b) => {
      const s = new Date(b.start_at);
      const e = new Date(b.end_at);
      const cur = new Date(s);
      while (cur < e) {
        set.add(
          `${String(cur.getHours()).padStart(2, "0")}:${cur.getMinutes() === 0 ? "00" : "30"}`,
        );
        cur.setMinutes(cur.getMinutes() + 30);
      }
    });
    return set;
  }, [dayBookings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId) {
      toast.error(lang === "pt" ? "Escolhe um espaço" : "Pick a space");
      return;
    }
    const startISO = new Date(`${date}T${startTime}:00`).toISOString();
    const endISO = new Date(`${date}T${endTime}:00`).toISOString();
    if (new Date(endISO) <= new Date(startISO)) {
      toast.error(lang === "pt" ? "A hora de fim tem de ser depois do início" : "End must be after start");
      return;
    }
    if (new Date(startISO).getTime() < Date.now()) {
      toast.error(lang === "pt" ? "Não podes reservar no passado" : "Cannot book in the past");
      return;
    }
    try {
      await create.mutateAsync({
        space_id: spaceId,
        start_at: startISO,
        end_at: endISO,
        title: title.trim() || (lang === "pt" ? "Reserva" : "Booking"),
        notes: notes.trim() || undefined,
      });
      toast.success(lang === "pt" ? "Reserva criada!" : "Booking created!");
      navigate("/app/bookings");
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  return (
    <div className="px-4 py-6 space-y-5">
      <Link to="/app/bookings" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" strokeWidth={ICON_STROKE} /> {t("common.back")}
      </Link>

      <h1 className="font-display text-2xl font-semibold">
        {lang === "pt" ? "Nova reserva" : "New booking"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label className="mb-2 block">{lang === "pt" ? "Espaço" : "Space"}</Label>
          {spacesLoading ? (
            <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : spaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {lang === "pt" ? "Sem espaços disponíveis." : "No spaces available."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {spaces.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSpaceId(s.id)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-smooth",
                    spaceId === s.id
                      ? "border-primary bg-primary/5 shadow-soft"
                      : "border-border/60 bg-card hover:border-border",
                  )}
                >
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3" strokeWidth={ICON_STROKE} /> {s.capacity}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="date">{lang === "pt" ? "Data" : "Date"}</Label>
          <Input
            id="date"
            type="date"
            value={date}
            min={today()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="start">{lang === "pt" ? "Início" : "Start"}</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger id="start">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((s) => {
                  const occ = occupiedSlots.has(s);
                  return (
                    <SelectItem key={s} value={s} disabled={occ}>
                      {s}{occ ? (lang === "pt" ? " — ocupado" : " — booked") : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="end">{lang === "pt" ? "Fim" : "End"}</Label>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger id="end">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="title">{lang === "pt" ? "Título" : "Title"}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === "pt" ? "Ex: Sessão de cinema" : "e.g. Movie night"}
            maxLength={120}
          />
        </div>

        <div>
          <Label htmlFor="notes">{lang === "pt" ? "Notas" : "Notes"}</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <Button type="submit" className="w-full gradient-warm border-0" disabled={create.isPending}>
          {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("common.submit")}
        </Button>
      </form>
    </div>
  );
};

export default BookingNew;
