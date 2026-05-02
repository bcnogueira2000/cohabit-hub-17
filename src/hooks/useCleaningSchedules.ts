import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CleaningRecurrence = "weekly" | "biweekly" | "monthly";

export type CleaningSchedule = {
  id: string;
  name: string;
  type: string;
  service: "normal" | "simple";
  area: string;
  room_id: string | null;
  recurrence: CleaningRecurrence;
  day_of_week: number; // 0 = Sun
  hour: number;
  minute: number;
  assigned_to: string | null;
  notes: string | null;
  active: boolean;
  last_generated_until: string | null;
  created_at: string;
};

export const useCleaningSchedules = () =>
  useQuery({
    queryKey: ["cleaning_schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cleaning_schedules" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CleaningSchedule[];
    },
  });

export const useUpsertCleaningSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CleaningSchedule> & { id?: string }) => {
      const { id, ...payload } = input;
      if (id) {
        const { error } = await supabase.from("cleaning_schedules" as any).update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cleaning_schedules" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cleaning_schedules"] }),
  });
};

export const useDeleteCleaningSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cleaning_schedules" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cleaning_schedules"] }),
  });
};

export const useGenerateCleaningInstances = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { scheduleId: string; count?: number }) => {
      const { data, error } = await supabase.rpc("generate_cleaning_instances" as any, {
        p_schedule_id: input.scheduleId,
        p_count: input.count ?? 8,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cleaning_schedules"] });
      qc.invalidateQueries({ queryKey: ["cleaning_tasks"] });
    },
  });
};
