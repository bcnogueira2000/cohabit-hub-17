import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Inbox, Sparkles, ListChecks, Users, DoorClosed, CalendarRange, BarChart3, Settings, MoreHorizontal, Sun, LogOut, LogIn, UserCheck, Shield, ArrowLeft } from "lucide-react";
import { usePendingProfiles, useMyRoles } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo.png";

const baseNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/my-day", label: "O meu dia", icon: Sun },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/cleaning", label: "Cleaning", icon: Sparkles },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/residents", label: "Residents", icon: Users },
  { to: "/stays", label: "Estadias", icon: LogIn },
  { to: "/approvals", label: "Aprovações", icon: UserCheck },
  { to: "/rooms", label: "Rooms", icon: DoorClosed },
  { to: "/bookings", label: "Reservas espaços", icon: CalendarRange },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const adminOnlyItem = { to: "/users", label: "Utilizadores", icon: Shield, end: false };

const mobileBottom = [
  { to: "/my-day", label: "Hoje", icon: Sun, end: false },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/cleaning", label: "Cleaning", icon: Sparkles },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
];

const Brand = () => (
  <div className="flex items-center gap-2.5 px-2 py-1">
    <img src={logo} alt="Living Colours" className="h-10 w-10 object-contain" />
    <div className="leading-tight">
      <div className="font-display text-base font-bold text-foreground tracking-tight">Living Colours</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Operations</div>
    </div>
  </div>
);

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: pending = [] } = usePendingProfiles();
  const { data: myRoles = [] } = useMyRoles();
  const isAdmin = myRoles.includes("admin");
  const navItems = isAdmin ? [...baseNavItems, adminOnlyItem] : baseNavItems;
  const [moreOpen, setMoreOpen] = useState(false);
  const handleSignOut = async () => { await signOut(); navigate("/auth", { replace: true }); };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-4 py-5 border-b border-sidebar-border">
          <Brand />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{label}</span>
              {to === "/approvals" && pending.length > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-2 py-0.5 font-semibold">{pending.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {user && (
            <div className="flex items-center justify-between gap-2 px-2 py-1">
              <span className="text-[11px] text-muted-foreground truncate" title={user.email ?? ""}>
                {user.email}
              </span>
              <NotificationBell />
            </div>
          )}
          <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/60 transition-smooth">
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
                aria-label="Voltar ao dashboard"
                className="p-2 -ml-1 rounded-full hover:bg-muted/60 transition-smooth shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="px-1"><Brand /></div>
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
              More
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <div className="grid grid-cols-2 gap-2 pt-4">
                {navItems.slice(5).map(({ to, label, icon: Icon }) => (
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
