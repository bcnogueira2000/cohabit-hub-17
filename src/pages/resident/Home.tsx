import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Inbox, CalendarRange, Sparkles, PartyPopper, ArrowRight, Plus } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useProfile } from "@/hooks/useProfile";
import { useMyRequests, isActiveRequest } from "@/hooks/useResidentRequests";
import { useMyBookings } from "@/hooks/useResidentBookings";
import { statusLabels } from "@/lib/labels";

const statusLabelsEn: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_resident: "Waiting on you",
  waiting_supplier: "Waiting on supplier",
  resolved: "Resolved",
  closed: "Closed",
};

const Home = () => {
  const { t, lang } = useLang();
  const { data: profile } = useProfile();
  const { data: requests = [] } = useMyRequests();
  const { data: bookings = [] } = useMyBookings();

  const myActiveRequests = requests.filter((r) => isActiveRequest(r.status));
  const myUpcomingBooking = bookings
    .filter((b) => new Date(b.start_at) > new Date())
    .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))[0];

  const firstName = profile?.full_name?.split(" ")[0] || "";

  const shortcuts = [
    { to: "/app/requests/new", label: t("home.new_request"), icon: Plus, accent: true },
    { to: "/app/bookings/new", label: t("home.book_space"), icon: CalendarRange },
    { to: "/app/services", label: t("home.services"), icon: Sparkles },
    { to: "/app/events", label: t("home.events"), icon: PartyPopper },
  ];

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {t("home.greeting")}{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("home.welcome")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {shortcuts.map(({ to, label, icon: Icon, accent }) => (
          <Link
            key={to}
            to={to}
            className={
              "rounded-2xl p-4 border border-border/60 transition-smooth hover:shadow-elegant " +
              (accent ? "gradient-warm text-primary-foreground border-0 shadow-elegant" : "bg-card")
            }
          >
            <Icon className={"h-5 w-5 " + (accent ? "" : "text-primary")} />
            <div className="mt-2 text-sm font-semibold">{label}</div>
          </Link>
        ))}
      </div>

      <Card className="p-4 border-border/60">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" /> {t("home.active_requests")}
          </h2>
          <Link to="/app/requests" className="text-xs text-primary flex items-center gap-1">
            {lang === "pt" ? "Ver todos" : "See all"} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {myActiveRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">{lang === "pt" ? "Sem pedidos ativos." : "No active requests."}</p>
        ) : (
          <div className="space-y-2">
            {myActiveRequests.slice(0, 3).map((r) => (
              <Link key={r.id} to={`/app/requests/${r.id}`} className="block p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-smooth">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{r.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-2 shrink-0">
                    {lang === "pt" ? (statusLabels[r.status] ?? r.status) : (statusLabelsEn[r.status] ?? r.status)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 border-border/60">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" /> {t("home.next_booking")}
          </h2>
          <Link to="/app/bookings" className="text-xs text-primary flex items-center gap-1">
            {lang === "pt" ? "Ver todas" : "See all"} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!myUpcomingBooking ? (
          <p className="text-sm text-muted-foreground">{lang === "pt" ? "Sem reservas próximas." : "No upcoming bookings."}</p>
        ) : (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium">{myUpcomingBooking.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {new Date(myUpcomingBooking.start_at).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Home;
