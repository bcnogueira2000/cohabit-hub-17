import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Inbox, CalendarRange, Sparkles, PartyPopper, ArrowRight, Plus, BedDouble } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useProfile } from "@/hooks/useProfile";
import { useMyRequests, isActiveRequest } from "@/hooks/useResidentRequests";
import { useMyBookings } from "@/hooks/useResidentBookings";
import { useMyStay } from "@/hooks/useMyStay";
import { statusLabels } from "@/lib/labels";
import heroImg from "@/assets/home-hero.jpg";

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

  const resident = stay?.resident;
  const room = stay?.room;
  const city = "Lisboa"; // Living Colours building city (no per-resident city in schema yet)
  const moveIn = resident?.move_in ? new Date(resident.move_in) : null;
  const daysHere =
    moveIn && moveIn.getTime() <= Date.now()
      ? Math.max(0, Math.floor((Date.now() - moveIn.getTime()) / (1000 * 60 * 60 * 24)))
      : null;
  const hasStay = !!resident && !!moveIn;

  const shortcuts = [
    {
      to: "/app/requests/new",
      label: t("home.new_request"),
      icon: Plus,
      bg: "bg-[hsl(210_60%_92%)]",
      badge: "bg-[hsl(210_70%_52%)]",
    },
    {
      to: "/app/bookings/new",
      label: t("home.book_space"),
      icon: CalendarRange,
      bg: "bg-[hsl(78_30%_90%)]",
      badge: "bg-[hsl(78_35%_40%)]",
    },
    {
      to: "/app/services",
      label: t("home.services"),
      icon: Sparkles,
      bg: "bg-[hsl(16_60%_91%)]",
      badge: "bg-[hsl(16_65%_55%)]",
    },
    {
      to: "/app/events",
      label: t("home.events"),
      icon: PartyPopper,
      bg: "bg-[hsl(42_70%_90%)]",
      badge: "bg-[hsl(42_75%_48%)]",
    },
  ];

  return (
    <div className="px-4 py-5 space-y-6">
      {/* Hero */}
      <section
        className="relative rounded-3xl overflow-hidden shadow-elegant"
        style={{ height: 232 }}
      >
        <img
          src={heroImg}
          alt=""
          width={1280}
          height={896}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.05) 100%)",
          }}
          aria-hidden
        />
        <div className="relative h-full flex flex-col justify-end p-5 text-white">
          <p className="text-sm font-medium opacity-95">
            {t("home.greeting")}, {firstName || (lang === "pt" ? "amig@" : "friend")} 👋
          </p>
          <h1 className="font-serif text-[26px] sm:text-3xl font-semibold leading-tight mt-1">
            {lang === "pt" ? `A tua casa em ${city}.` : `Your home in ${city}.`}
          </h1>
          {hasStay && (
            <p className="text-xs opacity-90 mt-1.5 flex items-center gap-2 flex-wrap">
              {daysHere !== null && (
                <span>
                  {lang === "pt"
                    ? daysHere === 0
                      ? "Primeiro dia em casa"
                      : `${daysHere} ${daysHere === 1 ? "dia" : "dias"} aqui`
                    : daysHere === 0
                      ? "First day at home"
                      : `${daysHere} ${daysHere === 1 ? "day" : "days"} in`}
                </span>
              )}
              {room?.number && (
                <>
                  <span aria-hidden className="opacity-60">·</span>
                  <span className="inline-flex items-center gap-1">
                    <BedDouble className="h-3 w-3" />
                    {lang === "pt" ? "Quarto" : "Room"} {room.number}
                  </span>
                </>
              )}
            </p>
          )}
          <Link
            to="/app/my-stay"
            className="mt-3 inline-flex items-center gap-1.5 self-start text-xs font-medium bg-white/20 backdrop-blur-md hover:bg-white/30 transition-smooth px-3.5 py-1.5 rounded-full border border-white/25"
          >
            {lang === "pt" ? "Ver a minha estadia" : "View my stay"}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* Shortcuts */}
      <div className="grid grid-cols-2 gap-3">
        {shortcuts.map(({ to, label, icon: Icon, bg, badge }) => (
          <Link
            key={to}
            to={to}
            className={
              "rounded-2xl p-4 border border-border/50 transition-smooth hover:shadow-elegant hover:-translate-y-0.5 flex flex-col gap-3 " +
              bg
            }
          >
            <span
              className={
                "h-10 w-10 rounded-full flex items-center justify-center text-white shadow-sm " +
                badge
              }
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-foreground leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      {/* Active requests */}
      <Card className="p-5 rounded-2xl border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-semibold flex items-center gap-2">
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
                className="block p-3 bg-muted/40 rounded-xl hover:bg-muted/60 transition-smooth"
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
      <Card className="p-5 rounded-2xl border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-semibold flex items-center gap-2">
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
          <div className="p-3 bg-muted/40 rounded-xl">
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
