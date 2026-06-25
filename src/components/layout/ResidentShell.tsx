import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Home, Inbox, CalendarRange, User, LogOut, Globe, BedDouble, BookOpen, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
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
  const [signOutOpen, setSignOutOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate("/auth", { replace: true }); };

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
                <DropdownMenuItem onClick={() => navigate("/app/onboarding")}>
                  <BookOpen className="h-4 w-4 mr-2" strokeWidth={ICON_STROKE} />
                  Onboarding
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/app/faqs")}>
                  <HelpCircle className="h-4 w-4 mr-2" strokeWidth={ICON_STROKE} />
                  FAQs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang(lang === "pt" ? "en" : "pt")}>
                  <Globe className="h-4 w-4 mr-2" strokeWidth={ICON_STROKE} />
                  {lang === "pt" ? "English" : "Português"}
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
      <nav className="fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto px-6 pb-4 pt-2">
          <div className="flex items-center justify-around bg-background/90 backdrop-blur-xl border border-border/60 rounded-full shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)] px-3 py-2">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-center h-11 w-11 rounded-full transition-all duration-300",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={ICON_STROKE} />
              </NavLink>
            ))}
          </div>
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
