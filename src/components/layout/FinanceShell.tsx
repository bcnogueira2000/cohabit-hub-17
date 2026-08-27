import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { FileText, Wallet, Tag, LogOut, ArrowLeft, Undo2, Receipt } from "lucide-react";
import { useMyRoles, useProfile } from "@/hooks/useProfile";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import { BrandAvatar } from "@/components/ui/BrandAvatar";
import logo from "@/assets/logo.png";

type NavItem = { to: string; label: string; icon: any; end?: boolean };

const financeItems: NavItem[] = [
  { to: "/finance/contracts", label: "Contratos", icon: FileText },
  { to: "/finance/payments", label: "Pagamentos", icon: Wallet },
  { to: "/finance/pricing", label: "Tipologias e preços", icon: Tag },
  { to: "/finance/moloni", label: "Moloni", icon: Receipt },
];

const Brand = ({ compact = false }: { compact?: boolean }) => (
  <Link to="/finance/contracts" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
    <img src={logo} alt="Living Colours" className={compact ? "h-8 w-8 object-contain" : "h-10 w-10 object-contain"} />
    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Financeiro</span>
  </Link>
);

export const FinanceShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  useMyRoles();

  const handleSignOut = async () => { await signOut(); navigate("/auth", { replace: true }); };

  const displayName = profile?.full_name || user?.email || "";
  const displayEmail = user?.email ?? "";

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Brand />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {financeItems.map(({ to, label, icon: Icon, end }) => (
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
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.5} />
              <span className="flex-1">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-sidebar-foreground/85 hover:bg-sidebar-accent/60 transition-smooth"
          >
            <Undo2 className="h-4 w-4" strokeWidth={1.5} /> Voltar à operação
          </Link>
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
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/60 transition-smooth"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-2 h-14">
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={() => navigate("/")}
              aria-label="Voltar à operação"
              className="p-2 -ml-1 rounded-full hover:bg-muted/60 transition-smooth shrink-0"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
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
          {financeItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-smooth text-center px-1",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
          <Link
            to="/"
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground px-1 text-center"
          >
            <Undo2 className="h-5 w-5" strokeWidth={1.5} />
            Operação
          </Link>
        </div>
      </nav>
    </div>
  );
};
