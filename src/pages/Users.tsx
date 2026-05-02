import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldCheck, UserCog, Home as HomeIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAllUsers, useSetUserRole } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/hooks/useProfile";

const ALL_ROLES: AppRole[] = ["resident", "staff", "manager", "admin"];

const roleStyles: Record<AppRole, string> = {
  resident: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  staff: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  manager: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  admin: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

const roleIcon: Record<AppRole, React.ComponentType<{ className?: string }>> = {
  resident: HomeIcon,
  staff: UserCog,
  manager: ShieldCheck,
  admin: Shield,
};

const Users = () => {
  const { user } = useAuth();
  const { data: users = [], isLoading } = useAllUsers();
  const setRole = useSetUserRole();

  const toggle = async (userId: string, role: AppRole, hasRole: boolean) => {
    try {
      await setRole.mutateAsync({
        user_id: userId,
        role,
        action: hasRole ? "remove" : "add",
      });
      toast.success(hasRole ? `Removido: ${role}` : `Atribuído: ${role}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao alterar role");
    }
  };

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl lg:text-4xl font-semibold">Utilizadores</h1>
        <p className="text-muted-foreground mt-1">
          Gere os papéis (roles) de cada utilizador. Apenas admins podem alterar.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
        </div>
      ) : users.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/60">
          <p className="text-sm text-muted-foreground">Sem utilizadores.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const isMe = u.user_id === user?.id;
            return (
              <Card key={u.user_id} className="p-4 lg:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">
                        {u.full_name || u.email}
                      </p>
                      {isMe && (
                        <Badge variant="outline" className="text-[10px]">
                          tu
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          u.account_status === "active"
                            ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px]"
                            : u.account_status === "pending_approval"
                            ? "border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px]"
                            : "text-[10px]"
                        }
                      >
                        {u.account_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ALL_ROLES.map((r) => {
                      const has = u.roles.includes(r);
                      const Icon = roleIcon[r];
                      return (
                        <Button
                          key={r}
                          size="sm"
                          variant={has ? "default" : "outline"}
                          disabled={setRole.isPending}
                          onClick={() => toggle(u.user_id, r, has)}
                          className={
                            has ? "" : "border-dashed text-muted-foreground"
                          }
                        >
                          <Icon className="h-3.5 w-3.5 mr-1.5" />
                          {r}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Users;
