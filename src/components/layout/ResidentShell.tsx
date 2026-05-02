import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Inbox, CalendarRange, PartyPopper, MoreHorizontal, Bell, Sparkles, BookOpen, HelpCircle, User, LogOut, Globe, BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo.png";

export const ResidentShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t, lang, setLang } = useLang();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate("/auth", { replace: true }); };

  const tabs = [
    { to: "/app/home", label: t("tab.home"), icon: Home, end: true },
    { to: "/app/requests", label: t("tab.requests"), icon: Inbox },
    { to: "/app/bookings", label: t("tab.bookings"), icon: CalendarRange },
    { to: "/app/events", label: t("tab.events"), icon: PartyPopper },
  ];

  const more = [
    { to: "/app/my-stay", label: lang === "pt" ? "A minha estadia" : "My stay", icon: BedDouble },
    { to: "/app/profile", label: lang === "pt" ? "O meu perfil" : "My profile", icon: User },
    { to: "/app/services", label: lang === "pt" ? "Serviços" : "Services", icon: Sparkles },
    { to: "/app/notifications", label: lang === "pt" ? "Notificações" : "Notifications", icon: Bell },
    { to: "/app/onboarding", label: "Onboarding", icon: BookOpen },
    { to: "/app/faqs", label: "FAQs", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Link to="/app/home" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src={logo} alt="Living Colours" className="h-8 w-8 object-contain" />
            <div className="font-display text-sm font-bold tracking-tight">Living Colours</div>
          </Link>
          <NotificationBell />
        </div>
      </header>

      <main className="pb-24 max-w-2xl mx-auto">
        <div key={location.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border">
        <div className="grid grid-cols-5 h-16 max-w-2xl mx-auto">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-smooth",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" />
              {t("tab.more")}
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <div className="grid grid-cols-2 gap-2 pt-4">
                {more.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-lg p-3 bg-muted/40 hover:bg-muted transition-smooth"
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{label}</span>
                  </NavLink>
                ))}
                <button
                  onClick={() => { setLang(lang === "pt" ? "en" : "pt"); setMoreOpen(false); }}
                  className="flex items-center gap-3 rounded-lg p-3 bg-muted/40 hover:bg-muted transition-smooth"
                >
                  <Globe className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{lang === "pt" ? "English" : "Português"}</span>
                </button>
                <button
                  onClick={() => { setMoreOpen(false); handleSignOut(); }}
                  className="flex items-center gap-3 rounded-lg p-3 bg-muted/40 hover:bg-muted transition-smooth"
                >
                  <LogOut className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{lang === "pt" ? "Sair" : "Sign out"}</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
};
