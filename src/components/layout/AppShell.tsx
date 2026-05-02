import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Inbox, Sparkles, ListChecks, Users, DoorClosed,
  CalendarRange, BarChart3, Settings, MoreHorizontal, Sun, LogOut, LogIn,
  UserCheck, Shield, ArrowLeft,
} from "lucide-react";
import { usePendingProfiles, useMyRoles, useProfile } from "@/hooks/useProfile";
import { cn, getInitials } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import { BrandAvatar } from "@/components/ui/BrandAvatar";
import logo from "@/assets/logo.png";

type NavItem = { to: string; label: string; icon: any; end?: boolean };
type NavSection = { label: string; items: NavItem[] };

const baseSections: NavSection[] = [
  {
    label: "Principal",
    items: [
      { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
      { to: "/my-day", label: "O meu dia", icon: Sun },
    ],
  },
  {
    label: "Operações",
    items: [
      { to: "/requests", label: "Pedidos", icon: Inbox },
      { to: "/cleaning", label: "Limpezas", icon: Sparkles },
      { to: "/tasks", label: "Tarefas", icon: ListChecks },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { to: "/residents", label: "Residentes", icon: Users },
      { to: "/stays", label: "Estadias", icon: LogIn },
      { to: "/approvals", label: "Aprovações", icon: UserCheck },
    ],
  },
  {
    label: "Espaços",
    items: [
      { to: "/rooms", label: "Quartos", icon: DoorClosed },
      { to: "/bookings", label: "Reservas", icon: CalendarRange },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/insights", label: "Insights", icon: BarChart3 },
      { to: "/settings", label: "Definições", icon: Settings },
    ],
  },
];

const adminItem: NavItem = { to: "/users", label: "Utilizadores", icon: Shield };

const mobileBottom: NavItem[] = [
  { to: "/my-day", label: "Hoje", icon: Sun },
  { to: "/requests", label: "Pedidos", icon: Inbox },
  { to: "/cleaning", label: "Limpezas", icon: Sparkles },
  { to: "/tasks", label: "Tarefas", icon: ListChecks },
];

const Brand = ({ compact = false }: { compact?: boolean }) => (
  <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
    <img src={logo} alt="Living Colours" className={compact ? "h-8 w-8 object-contain" : "h-9 w-9 object-contain"} />
    <div className="leading-tight">
      <div className="font-display text-[15px] font-bold text-foreground tracking-tight">Living Colours</div>
    </div>
  </Link>
);

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: pending = [] } = usePendingProfiles();
  const { data: myRoles = [] } = useMyRoles();
  const isAdmin = myRoles.includes("admin");
  const sections: NavSection[] = isAdmin
    ? baseSections.map((s, i) => (i === baseSections.length - 1 ? { ...s, items: [...s.items, adminItem] } : s))
    : baseSections;
  const [moreOpen, setMoreOpen] = useState(false);
  const handleSignOut = async () => { await signOut(); navigate("/auth", { replace: true }); };

  const flatItems = sections.flatMap((s) => s.items);
  const moreItems = flatItems.slice(5); // mobile "more"

  const displayName = profile?.full_name || user?.email || "";
  const displayEmail = user?.email ?? "";

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Brand />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-smooth",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )
                    }
                  >
                    <Icon className="h-[17px] w-[17px]" />
                    <span className="flex-1">{label}</span>
                    {to === "/approvals" && pending.length > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-semibold min-w-[18px] text-center">
                        {pending.length}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <BrandAvatar name={displayName || displayEmail} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate" title={displayName}>
                {displayName ? getInitials(displayName) === "??" ? displayEmail : displayName : displayEmail}
              </div>
              <div className="text-[10.5px] text-muted-foreground truncate" title={displayEmail}>
                {displayEmail}
              </div>
            </div>
            <NotificationBell />
          </div>
          <button
            onClick={handleSignOut}
            className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/60 transition-smooth"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-2 h-14">
          <div className="flex items-center gap-1 min-w-0">
            {location.pathname !== "/" && (
              <button
                onClick={() => navigate("/")}
                aria-label="Voltar ao painel"
                className="p-2 -ml-1 rounded-full hover:bg-muted/60 transition-smooth shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="px-1"><Brand compact /></div>
          </div>
          <NotificationBell />
        </div>
      </header>

      {/* Main */}
      <main className="lg:pl-64 pb-20 lg:pb-0">
        <div key={location.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border">
        <div className="grid grid-cols-5 h-16">
          {mobileBottom.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-smooth",
                  isActive ? "text-primary" : "text-muted-foreground",
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
              Mais
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <div className="grid grid-cols-2 gap-2 pt-4">
                {moreItems.map(({ to, label, icon: Icon }) => (
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
                  onClick={() => { setMoreOpen(false); handleSignOut(); }}
                  className="flex items-center gap-3 rounded-lg p-3 bg-muted/40 hover:bg-muted transition-smooth col-span-2"
                >
                  <LogOut className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Sair</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
};
