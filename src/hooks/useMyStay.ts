import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MyStayData {
  resident: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    move_in: string | null;
    move_out: string | null;
    status: string;
    avatar_color: string | null;
    room_id: string | null;
  } | null;
  room: {
    id: string;
    number: string;
    floor: number;
    typology: string;
  } | null;
  stays: Array<{
    id: string;
    check_in: string;
    check_out: string;
    status: string;
    source: string;
    notes: string | null;
  }>;
}

export const useMyStay = () => {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my_stay", user?.id],
    queryFn: async (): Promise<MyStayData> => {
      const { data: resident } = await supabase
        .from("residents")
        .select("*")
        .limit(1)
        .maybeSingle();

      let room: MyStayData["room"] = null;
      if (resident?.room_id) {
        const { data: r } = await supabase
          .from("rooms")
          .select("id, number, floor, typology")
          .eq("id", resident.room_id)
          .maybeSingle();
        room = (r as any) ?? null;
      }

      let stays: MyStayData["stays"] = [];
      if (resident?.id) {
        const { data: s } = await supabase
          .from("stays")
          .select("id, check_in, check_out, status, source, notes")
          .eq("resident_id", resident.id)
          .order("check_in", { ascending: false });
        stays = (s as any) ?? [];
      }

      return { resident: (resident as any) ?? null, room, stays };
    },
  });
};
