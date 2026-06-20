import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Inbox, CalendarRange, Sparkles, PartyPopper, ArrowRight, Plus } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useProfile } from "@/hooks/useProfile";
import { useMyRequests, isActiveRequest } from "@/hooks/useResidentRequests";
import { useMyBookings } from "@/hooks/useResidentBookings";
import { useMyStay } from "@/hooks/useMyStay";
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
  const { data: stay } = useMyStay();

  const myActiveRequests = requests.filter((r) => isActiveRequest(r.status));
  const myUpcomingBooking = bookings
    .filter((b) => new Date(b.start_at) > new Date())
    .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))[0];

  const firstName = profile?.full_name?.split(" ")[0] || "";

  // Days lived in the house based on the most recent checked-in stay
  const activeStay = stay?.stays?.find((s) => s.status === "checked_in");
  const daysHere = activeStay?.check_in
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(activeStay.check_in).getTime()) / (1000 * 60 * 60 * 24)),
      )
    : null;

  const shortcuts = [
    {
      to: "/app/requests/new",
      label: t("home.new_request"),
      icon: Plus,
      bg: "bg-brand-coral/10",
      iconColor: "text-brand-coral",
    },
    {
      to: "/app/bookings/new",
      label: t("home.book_space"),
      icon: CalendarRange,
      bg: "bg-brand-teal/10",
      iconColor: "text-brand-teal",
    },
    {
      to: "/app/services",
      label: t("home.services"),
      icon: Sparkles,
      bg: "bg-brand-lilac/15",
      iconColor: "text-brand-lilac",
    },
    {
      to: "/app/events",
      label: t("home.events"),
      icon: PartyPopper,
      bg: "bg-brand-yellow/15",
      iconColor: "text-brand-yellow",
    },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Greeting banner */}
      <div className="gradient-living rounded-3xl p-6 text-foreground shadow-elegant relative overflow-hidden">
        <div className="absolute inset-0 bg-background/10 backdrop-blur-[1px]" aria-hidden />
        <div className="relative">
          <p className="text-sm font-medium opacity-90">{t("home.greeting")} 👋</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1 leading-tight">
            {firstName || (lang === "pt" ? "Bem-vindo" : "Welcome")}
          </h1>
          {daysHere !== null ? (
            <p className="mt-3 text-sm font-medium bg-background/30 inline-flex px-3 py-1 rounded-full backdrop-blur-sm">
              {lang === "pt"
                ? daysHere === 0
                  ? "Primeiro dia em casa 🌱"
                  : `${daysHere} ${daysHere === 1 ? "dia" : "dias"} a viver aqui`
                : daysHere === 0
                  ? "First day at home 🌱"
                  : `${daysHere} ${daysHere === 1 ? "day" : "days"} living here`}
            </p>
          ) : (
            <p className="mt-3 text-sm opacity-90">{t("home.welcome")}</p>
          )}
        </div>
      </div>

      {/* Shortcuts */}
      <div className="grid grid-cols-2 gap-3">
        {shortcuts.map(({ to, label, icon: Icon, bg, iconColor }) => (
          <Link
            key={to}
            to={to}
            className={
              "rounded-2xl p-5 border border-border/60 transition-smooth hover:shadow-elegant hover:-translate-y-0.5 " +
              bg
            }
          >
            <Icon className={"h-6 w-6 " + iconColor} />
            <div className="mt-3 text-sm font-semibold text-foreground">{label}</div>
          </Link>
        ))}
      </div>

      {/* Active requests */}
      <Card className="p-5 border-border/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" /> {t("home.active_requests")}
          </h2>
          <Link to="/app/requests" className="text-xs text-primary flex items-center gap-1 hover:underline">
            {lang === "pt" ? "Ver todos" : "See all"} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {myActiveRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {lang === "pt" ? "Sem pedidos ativos." : "No active requests."}
          </p>
        ) : (
          <div className="space-y-2">
            {myActiveRequests.slice(0, 3).map((r) => (
              <Link
                key={r.id}
                to={`/app/requests/${r.id}`}
                className="block p-3 bg-muted/40 rounded-lg hover:bg-muted/60 transition-smooth"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium truncate">{r.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                    {lang === "pt"
                      ? (statusLabels[r.status] ?? r.status)
                      : (statusLabelsEn[r.status] ?? r.status)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Next booking */}
      <Card className="p-5 border-border/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" /> {t("home.next_booking")}
          </h2>
          <Link to="/app/bookings" className="text-xs text-primary flex items-center gap-1 hover:underline">
            {lang === "pt" ? "Ver todas" : "See all"} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!myUpcomingBooking ? (
          <p className="text-sm text-muted-foreground">
            {lang === "pt" ? "Sem reservas próximas." : "No upcoming bookings."}
          </p>
        ) : (
          <div className="p-3 bg-muted/40 rounded-lg">
            <div className="text-sm font-medium">{myUpcomingBooking.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {new Date(myUpcomingBooking.start_at).toLocaleString(
                lang === "pt" ? "pt-PT" : "en-GB",
                { dateStyle: "medium", timeStyle: "short" },
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Home;
