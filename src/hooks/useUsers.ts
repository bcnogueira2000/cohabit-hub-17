import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "@/hooks/useProfile";

export interface UserWithRoles extends Profile {
  roles: AppRole[];
}

export const useAllUsers = () =>
  useQuery({
    queryKey: ["all_users"],
    queryFn: async (): Promise<UserWithRoles[]> => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;
      const { data: roles, error: rErr } = await supabase
        .from("user_roles" as any)
        .select("user_id, role");
      if (rErr) throw rErr;

      const rolesByUser = new Map<string, AppRole[]>();
      ((roles ?? []) as any[]).forEach((r) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        rolesByUser.set(r.user_id, arr);
      });

      return ((profiles ?? []) as any[]).map((p) => ({
        ...(p as Profile),
        roles: rolesByUser.get(p.user_id) ?? [],
      }));
    },
  });

export const useSetUserRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      role: AppRole;
      action: "add" | "remove";
    }) => {
      const { data, error } = await supabase.functions.invoke("set-user-role", {
        body: input,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_users"] });
      qc.invalidateQueries({ queryKey: ["my_roles"] });
    },
  });
};
