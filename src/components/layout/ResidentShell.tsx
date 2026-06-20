import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Home, Inbox, CalendarRange, PartyPopper, MoreHorizontal, Sparkles, BookOpen, HelpCircle, User, LogOut, Globe, BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/lib/i18n";
import { NotificationBell } from "@/components/NotificationBell";
import { BrandAvatar } from "@/components/ui/BrandAvatar";
import logo from "@/assets/logo.png";
import wordmark from "@/assets/wordmark.png";

const ICON_STROKE = 1.5;

export const ResidentShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { t, lang, setLang } = useLang();
  const [moreOpen, setMoreOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate("/auth", { replace: true }); };

  const tabs = [
    { to: "/app/home", label: t("tab.home"), icon: Home, end: true },
    { to: "/app/requests", label: t("tab.requests"), icon: Inbox },
    { to: "/app/bookings", label: t("tab.bookings"), icon: CalendarRange },
    { to: "/app/my-stay", label: lang === "pt" ? "A minha estadia" : "My stay", icon: BedDouble },
  ];

  const more = [
    { to: "/app/events", label: t("tab.events"), icon: PartyPopper },
    { to: "/app/profile", label: lang === "pt" ? "O meu perfil" : "My profile", icon: User },
    { to: "/app/services", label: lang === "pt" ? "Serviços" : "Services", icon: Sparkles },
    { to: "/app/onboarding", label: "Onboarding", icon: BookOpen },
    { to: "/app/faqs", label: "FAQs", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Link to="/app/home" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src={logo} alt="" aria-hidden className="h-8 w-8 object-contain" />
            <img src={wordmark} alt="Living Colours" className="h-4 object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <BrandAvatar name={profile?.full_name} src={profile?.photo_url} size="sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate("/app/profile")}>
                  <User className="h-4 w-4 mr-2" strokeWidth={ICON_STROKE} />
                  {lang === "pt" ? "O meu perfil" : "My profile"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSignOutOpen(true)}>
                  <LogOut className="h-4 w-4 mr-2" strokeWidth={ICON_STROKE} />
                  {lang === "pt" ? "Terminar sessão" : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
              <Icon className="h-5 w-5" strokeWidth={ICON_STROKE} />
              {label}
            </NavLink>
          ))}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" strokeWidth={ICON_STROKE} />
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
                    <Icon className="h-5 w-5 text-primary" strokeWidth={ICON_STROKE} />
                    <span className="text-sm font-medium">{label}</span>
                  </NavLink>
                ))}
                <button
                  onClick={() => { setLang(lang === "pt" ? "en" : "pt"); setMoreOpen(false); }}
                  className="flex items-center gap-3 rounded-lg p-3 bg-muted/40 hover:bg-muted transition-smooth"
                >
                  <Globe className="h-5 w-5 text-primary" strokeWidth={ICON_STROKE} />
                  <span className="text-sm font-medium">{lang === "pt" ? "English" : "Português"}</span>
                </button>
                <button
                  onClick={() => { setMoreOpen(false); setSignOutOpen(true); }}
                  className="flex items-center gap-3 rounded-lg p-3 bg-muted/40 hover:bg-muted transition-smooth"
                >
                  <LogOut className="h-5 w-5 text-primary" strokeWidth={ICON_STROKE} />
                  <span className="text-sm font-medium">{lang === "pt" ? "Sair" : "Sign out"}</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "pt" ? "Tens a certeza que queres sair?" : "Are you sure you want to sign out?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "pt" ? "Vais ter de fazer login novamente para voltar à app." : "You'll need to log in again to come back."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "pt" ? "Cancelar" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>{lang === "pt" ? "Sair" : "Sign out"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
