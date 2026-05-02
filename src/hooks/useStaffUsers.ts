import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StaffUser = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

export const useStaffUsers = () =>
  useQuery({
    queryKey: ["staff-users"],
    queryFn: async (): Promise<StaffUser[]> => {
      const { data, error } = await supabase.rpc("list_staff_users");
      if (error) throw error;
      return (data ?? []) as StaffUser[];
    },
  });
