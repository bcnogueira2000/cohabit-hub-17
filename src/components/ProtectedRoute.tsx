import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useMyRoles } from "@/hooks/useProfile";

interface Props {
  children: React.ReactNode;
  /** If set, only users with one of these roles can access. */
  requireRole?: ("resident" | "staff" | "manager" | "admin")[];
}

export const ProtectedRoute = ({ children, requireRole }: Props) => {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: pLoading } = useProfile();
  const { data: roles = [], isLoading: rLoading } = useMyRoles();
  const location = useLocation();

  if (loading || (user && (pLoading || rLoading))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">A carregar…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  const isStaff = roles.some((r) => r === "staff" || r === "manager" || r === "admin");
  const isResident = roles.includes("resident");
  const pending = profile?.account_status === "pending_approval";

  // Pending users (no role yet) -> pending screen, unless that's where they are.
  if (pending && !isStaff && !isResident) {
    if (location.pathname !== "/app/pending-approval") {
      return <Navigate to="/app/pending-approval" replace />;
    }
    return <>{children}</>;
  }

  if (requireRole && requireRole.length > 0) {
    const ok = requireRole.some((r) =>
      r === "resident" ? isResident : roles.includes(r as any)
    );
    // DEV: staff/admin/manager podem aceder a qualquer área (inclui portal residente)
    // para facilitar testes sem trocar de login. Remover antes de produção.
    const devBypass = isStaff;
    if (!ok && !devBypass) {
      // Redirect to the right home for their role
      if (isResident) return <Navigate to="/app/home" replace />;
      if (isStaff) return <Navigate to="/" replace />;
      return <Navigate to="/app/pending-approval" replace />;
    }
  }

  return <>{children}</>;
};
