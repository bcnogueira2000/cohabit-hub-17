import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Home, CalendarCheck, CalendarX, BedDouble, History } from "lucide-react";
import { useMyStay } from "@/hooks/useMyStay";
import { useLang } from "@/lib/i18n";

const fmt = (d: string | null, lang: string) =>
  d ? new Date(d).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const statusColor: Record<string, string> = {
  active: "bg-success text-success-foreground",
  upcoming: "bg-primary/15 text-primary",
  checking_out: "bg-warning text-warning-foreground",
  past: "bg-muted text-muted-foreground",
};

const MyStay = () => {
  const { lang, t } = useLang();
  const { data, isLoading } = useMyStay();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("common.loading")}
      </div>
    );
  }

  const r = data?.resident;
  const room = data?.room;
  const stays = data?.stays ?? [];

  return (
    <div className="px-4 py-6 space-y-5">
      <Link to="/app/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
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
          <Card className="p-4 border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold">{r.full_name}</span>
              <Badge className={statusColor[r.status] ?? "bg-muted"}>
                {r.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <BedDouble className="h-3 w-3" /> {lang === "pt" ? "Quarto" : "Room"}
                </p>
                <p className="text-sm font-medium mt-1">
                  {room ? `${room.number}` : "—"}
                  {room && (
                    <span className="text-xs text-muted-foreground ml-1">
                      · {lang === "pt" ? `Piso ${room.floor}` : `Floor ${room.floor}`} · {room.typology}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Home className="h-3 w-3" /> {lang === "pt" ? "Edifício" : "Building"}
                </p>
                <p className="text-sm font-medium mt-1">Living Colours</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CalendarCheck className="h-3 w-3" /> Check-in
                </p>
                <p className="text-sm font-medium mt-1">{fmt(r.move_in, lang)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CalendarX className="h-3 w-3" /> Check-out
                </p>
                <p className="text-sm font-medium mt-1">{fmt(r.move_out, lang)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-border/60">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-primary" />
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
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      {s.status.replace(/_/g, " ")}
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
