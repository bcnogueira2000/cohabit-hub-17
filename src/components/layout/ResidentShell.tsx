import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { Home, Inbox, CalendarRange, BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/lib/i18n";
import { NotificationBell } from "@/components/NotificationBell";
import { BrandAvatar } from "@/components/ui/BrandAvatar";
import logo from "@/assets/logo.asset.json";

const ICON_STROKE = 1.5;

export const ResidentShell = () => {
  const location = useLocation();
  const { data: profile } = useProfile();
  const { t, lang } = useLang();


  const tabs = [
    { to: "/app/home", label: t("tab.home"), icon: Home, end: true },
    { to: "/app/requests", label: t("tab.requests"), icon: Inbox },
    { to: "/app/bookings", label: t("tab.bookings"), icon: CalendarRange },
    { to: "/app/my-stay", label: lang === "pt" ? "A minha estadia" : "My stay", icon: BedDouble },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Link to="/app/home" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logo.url} alt="Living Colours" className="h-9 w-9 object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              to="/app/account"
              aria-label={lang === "pt" ? "A minha conta" : "My account"}
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BrandAvatar name={profile?.full_name} src={profile?.photo_url} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-24 max-w-2xl mx-auto">
        <div key={location.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto px-4 pb-3 pt-2">
          <div className="flex items-stretch justify-around bg-background/90 backdrop-blur-xl border border-border/60 rounded-3xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)] px-2 py-2">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 rounded-2xl py-2 px-0.5 transition-all duration-300",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={ICON_STROKE} />
                <span className="text-[10px] font-medium leading-none tracking-tight text-center whitespace-nowrap">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

