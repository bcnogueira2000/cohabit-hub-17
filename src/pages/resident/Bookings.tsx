import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarRange, Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useMyBookings, useSpaces, useCancelBooking } from "@/hooks/useResidentBookings";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ICON_STROKE } from "@/lib/residentLabels";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Bookings = () => {
  const { t, lang } = useLang();
  const { data: bookings = [], isLoading } = useMyBookings();
  const { data: spaces = [] } = useSpaces();
  const cancel = useCancelBooking();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancelId, setCancelId] = useState<string | null>(null);

  const now = Date.now();
  const filtered = bookings
    .filter((b) =>
      tab === "upcoming" ? new Date(b.start_at).getTime() >= now : new Date(b.start_at).getTime() < now,
    )
    .sort((a, b) =>
      tab === "upcoming"
        ? +new Date(a.start_at) - +new Date(b.start_at)
        : +new Date(b.start_at) - +new Date(a.start_at),
    );

  const spaceName = (id: string) => spaces.find((s) => s.id === id)?.name ?? "—";

  const handleConfirmCancel = async () => {
    if (!cancelId) return;
    try {
      await cancel.mutateAsync(cancelId);
      toast.success(lang === "pt" ? "Reserva cancelada" : "Booking cancelled");
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setCancelId(null);
    }
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{t("tab.bookings")}</h1>
        <Button asChild size="sm" className="gradient-warm border-0">
          <Link to="/app/bookings/new">
            <Plus className="h-4 w-4 mr-1" strokeWidth={ICON_STROKE} />
            {lang === "pt" ? "Reservar" : "Book"}
          </Link>
        </Button>
      </div>

      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        {(["upcoming", "past"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-smooth",
              tab === k ? "bg-background shadow-soft" : "text-muted-foreground",
            )}
          >
            {k === "upcoming"
              ? lang === "pt" ? "Próximas" : "Upcoming"
              : lang === "pt" ? "Passadas" : "Past"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={ICON_STROKE} /> {t("common.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/60">
          <CalendarRange className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" strokeWidth={ICON_STROKE} />
          <p className="text-sm text-muted-foreground mb-4">
            {tab === "upcoming"
              ? lang === "pt" ? "Sem reservas próximas." : "No upcoming bookings."
              : lang === "pt" ? "Sem histórico." : "No past bookings."}
          </p>
          {tab === "upcoming" && (
            <Button asChild variant="outline" size="sm">
              <Link to="/app/bookings/new">
                <Plus className="h-4 w-4 mr-1" strokeWidth={ICON_STROKE} />
                {lang === "pt" ? "Reservar espaço" : "Book a space"}
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => {
            const start = new Date(b.start_at);
            const end = new Date(b.end_at);
            const isUpcoming = start.getTime() >= now;
            return (
              <Card key={b.id} className="p-4 border-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-primary font-semibold">
                      {spaceName(b.space_id)}
                    </p>
                    <p className="font-medium text-sm mt-0.5 truncate">{b.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {start.toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" · "}
                      {start.toLocaleTimeString(lang === "pt" ? "pt-PT" : "en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {end.toLocaleTimeString(lang === "pt" ? "pt-PT" : "en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {isUpcoming && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setCancelId(b.id)}
                      disabled={cancel.isPending}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" strokeWidth={ICON_STROKE} />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "pt" ? "Cancelar esta reserva?" : "Cancel this booking?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "pt"
                ? "A reserva será removida e o espaço fica disponível para outros residentes. Esta ação não pode ser desfeita."
                : "The booking will be removed and the space released for other residents. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "pt" ? "Voltar" : "Back"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive hover:bg-destructive/90">
              {lang === "pt" ? "Sim, cancelar" : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Bookings;
