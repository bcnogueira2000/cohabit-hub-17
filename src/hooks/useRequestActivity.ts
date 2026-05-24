import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RequestActivity } from "@/lib/types";

const mapActivity = (a: any): RequestActivity => ({
  id: a.id,
  requestId: a.request_id,
  actorUserId: a.actor_user_id ?? null,
  actorName: a.actor_name ?? null,
  kind: a.kind,
  payload: a.payload ?? {},
  createdAt: a.created_at,
});

export const useRequestActivity = (requestId: string | undefined) =>
  useQuery({
    enabled: !!requestId,
    queryKey: ["request_activity", requestId],
    queryFn: async (): Promise<RequestActivity[]> => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from("request_activity" as any)
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map(mapActivity);
    },
  });
