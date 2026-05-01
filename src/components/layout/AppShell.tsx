import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Inbox, Sparkles, ListChecks, Users, DoorClosed, CalendarRange, BarChart3, Settings, MoreHorizontal, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/cleaning", label: "Cleaning", icon: Sparkles },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/residents", label: "Residents", icon: Users },
  { to: "/rooms", label: "Rooms", icon: DoorClosed },
  { to: "/bookings", label: "Bookings", icon: CalendarRange },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const mobileBottom = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/cleaning", label: "Cleaning", icon: Sparkles },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
];

const Brand = () => (
  <div className="flex items-center gap-2.5 px-2 py-1">
    <div className="h-9 w-9 rounded-xl gradient-warm shadow-elegant flex items-center justify-center">
      <span className="font-display font-semibold text-primary-foreground text-lg leading-none">L</span>
    </div>
    <div className="leading-tight">
      <div className="font-display text-base font-semibold text-foreground">Living Colours</div>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Operations</div>
    </div>
  </div>
);

export const AppShell = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

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
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="rounded-lg bg-accent/60 p-3">
            <div className="text-xs font-medium text-accent-foreground">Versão MVP</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Operations Hub v0.1</div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Brand />
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
                {navItems.slice(4).map(({ to, label, icon: Icon }) => (
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
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
};
