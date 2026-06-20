import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "resident" | "staff" | "manager" | "admin";
export type AccountStatus = "pending_approval" | "active" | "rejected" | "disabled";

export interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  account_status: AccountStatus;
  resident_id: string | null;
  requested_room_number: string | null;
  expected_move_in: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  gender: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  employer_or_school: string | null;
  alternate_address: string | null;
  special_needs: string | null;
  iban: string | null;
  photo_url: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | "full_name"
    | "phone"
    | "nationality"
    | "date_of_birth"
    | "gender"
    | "emergency_contact_name"
    | "emergency_contact_phone"
    | "employer_or_school"
    | "alternate_address"
    | "special_needs"
    | "iban"
    | "photo_url"
    | "document_url"
  >
>;

export const useProfile = () => {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });
};

export const useProfileByResidentId = (residentId: string | null | undefined) =>
  useQuery({
    enabled: !!residentId,
    queryKey: ["profile_by_resident", residentId],
    queryFn: async (): Promise<Profile | null> => {
      if (!residentId) return null;
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("resident_id", residentId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: ProfileUpdate) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("profiles" as any)
        .update(input as any)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
};

export const useMyRoles = () => {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my_roles", user?.id],
    queryFn: async (): Promise<AppRole[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => r.role as AppRole);
    },
  });
};

export const useIsStaff = () => {
  const { data: roles = [] } = useMyRoles();
  return roles.some((r) => r === "staff" || r === "manager" || r === "admin");
};

export const useIsResident = () => {
  const { data: roles = [] } = useMyRoles();
  return roles.includes("resident");
};

// Admin queries — list pending profiles & approve
export const usePendingProfiles = () =>
  useQuery({
    queryKey: ["pending_profiles"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("account_status", "pending_approval")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

export const useApproveProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; residentId: string }) => {
      // 1. Link resident to user
      const { error: resErr } = await supabase
        .from("residents")
        .update({ user_id: input.userId } as any)
        .eq("id", input.residentId);
      if (resErr) throw resErr;
      // 2. Update profile
      const { error: profErr } = await supabase
        .from("profiles" as any)
        .update({ account_status: "active", resident_id: input.residentId } as any)
        .eq("user_id", input.userId);
      if (profErr) throw profErr;
      // 3. Insert role
      const { error: roleErr } = await supabase
        .from("user_roles" as any)
        .insert({ user_id: input.userId, role: "resident" } as any);
      if (roleErr && !String(roleErr.message).includes("duplicate")) throw roleErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending_profiles"] });
      qc.invalidateQueries({ queryKey: ["residents"] });
    },
  });
};

export const useRejectProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles" as any)
        .update({ account_status: "rejected" } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending_profiles"] }),
  });
};
