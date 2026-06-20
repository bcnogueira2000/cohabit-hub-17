import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Home, CalendarCheck, CalendarX, BedDouble, History } from "lucide-react";
import { useMyStay } from "@/hooks/useMyStay";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  ICON_STROKE,
  pickLabel,
  residentStatusLabels,
  residentStatusBadgeClass,
  stayStatusLabels,
  stayStatusBadgeClass,
} from "@/lib/residentLabels";

const fmt = (d: string | null, lang: string) =>
  d ? new Date(d).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const MyStay = () => {
  const { lang, t } = useLang();
  const { data, isLoading } = useMyStay();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" strokeWidth={ICON_STROKE} /> {t("common.loading")}
      </div>
    );
  }

  const r = data?.resident;
  const room = data?.room;
  const stays = data?.stays ?? [];

  return (
    <div className="px-4 py-6 space-y-5">
      <Link to="/app/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" strokeWidth={ICON_STROKE} /> {t("common.back")}
      </Link>

      <h1 className="font-display text-2xl font-semibold">
        {lang === "pt" ? "A minha estadia" : "My stay"}
      </h1>

      {!r ? (
        <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
          {lang === "pt"
            ? "Ainda não tens dados de estadia. Aguarda aprovação ou contacta a equipa."
            : "No stay yet. Wait for approval or contact the team."}
        </Card>
      ) : (
        <>
          <Card className="p-5 border-border/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold">{r.full_name}</span>
              <Badge variant="outline" className={cn("text-[10px]", residentStatusBadgeClass[r.status])}>
                {pickLabel(residentStatusLabels[r.status], lang)}
              </Badge>
            </div>

            {/* Hero room number */}
            <div className="py-3 border-y border-border/50">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <BedDouble className="h-3 w-3" strokeWidth={ICON_STROKE} /> {lang === "pt" ? "Quarto" : "Room"}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-5xl font-semibold leading-none tracking-tight">
                  {room ? room.number : "—"}
                </span>
                {room && (
                  <span className="text-xs text-muted-foreground">
                    {lang === "pt" ? `Piso ${room.floor}` : `Floor ${room.floor}`} · {room.typology}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Home className="h-3 w-3" strokeWidth={ICON_STROKE} /> {lang === "pt" ? "Edifício" : "Building"}
                </p>
                <p className="text-sm font-medium mt-1">Living Colours</p>
              </div>
              <div />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CalendarCheck className="h-3 w-3" strokeWidth={ICON_STROKE} /> Check-in
                </p>
                <p className="text-sm font-medium mt-1">{fmt(r.move_in, lang)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CalendarX className="h-3 w-3" strokeWidth={ICON_STROKE} /> Check-out
                </p>
                <p className="text-sm font-medium mt-1">{fmt(r.move_out, lang)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-border/60">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-primary" strokeWidth={ICON_STROKE} />
              <h2 className="font-display font-semibold text-sm">
                {lang === "pt" ? "Histórico de estadias" : "Stay history"}
              </h2>
            </div>
            {stays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {lang === "pt" ? "Sem registos." : "No records."}
              </p>
            ) : (
              <div className="space-y-2">
                {stays.map((s) => (
                  <div key={s.id} className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {fmt(s.check_in, lang)} – {fmt(s.check_out, lang)}
                      </p>
                      {s.notes && <p className="text-xs text-muted-foreground mt-0.5">{s.notes}</p>}
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", stayStatusBadgeClass[s.status])}>
                      {pickLabel(stayStatusLabels[s.status], lang)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default MyStay;
