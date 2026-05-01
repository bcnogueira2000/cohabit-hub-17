import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  mapBooking, mapCleaning, mapOpsTask, mapRequest, mapResident, mapRoom, mapSpace,
} from "@/lib/dataMappers";
import type { Booking, CleaningTask, OpsTask, Request, Resident, Room, Space } from "@/lib/types";

// ============ READ HOOKS ============

export const useRooms = () =>
  useQuery({
    queryKey: ["rooms"],
    queryFn: async (): Promise<Room[]> => {
      const { data, error } = await supabase.from("rooms").select("*").order("number");
      if (error) throw error;
      return (data ?? []).map(mapRoom);
    },
  });

export const useResidents = () =>
  useQuery({
    queryKey: ["residents"],
    queryFn: async (): Promise<Resident[]> => {
      const { data, error } = await supabase.from("residents").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []).map(mapResident);
    },
  });

export const useRequests = () =>
  useQuery({
    queryKey: ["requests"],
    queryFn: async (): Promise<Request[]> => {
      const { data, error } = await supabase.from("requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRequest);
    },
  });

export const useOpsTasks = () =>
  useQuery({
    queryKey: ["ops_tasks"],
    queryFn: async (): Promise<OpsTask[]> => {
      const { data, error } = await supabase.from("ops_tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapOpsTask);
    },
  });

export const useCleaningTasks = () =>
  useQuery({
    queryKey: ["cleaning_tasks"],
    queryFn: async (): Promise<CleaningTask[]> => {
      const { data, error } = await supabase.from("cleaning_tasks").select("*").order("scheduled_for");
      if (error) throw error;
      return (data ?? []).map(mapCleaning);
    },
  });

export const useSpaces = () =>
  useQuery({
    queryKey: ["spaces"],
    queryFn: async (): Promise<Space[]> => {
      const { data, error } = await supabase.from("spaces").select("*").order("name");
      if (error) throw error;
      return (data ?? []).map(mapSpace);
    },
  });

export const useBookings = () =>
  useQuery({
    queryKey: ["bookings"],
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase.from("bookings").select("*").order("start_at");
      if (error) throw error;
      return (data ?? []).map(mapBooking);
    },
  });

// ============ MUTATIONS ============

export const useCreateRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string; category: any; description?: string; priority: any;
      residentId?: string | null; roomId?: string | null; location?: string;
      permissionToEnter?: any;
    }) => {
      const { error, data } = await supabase.from("requests").insert({
        title: input.title,
        category: input.category,
        description: input.description ?? "",
        priority: input.priority,
        resident_id: input.residentId ?? null,
        room_id: input.roomId ?? null,
        location: input.location ?? "",
        permission_to_enter: input.permissionToEnter ?? "with_notice",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["ops_tasks"] });
      qc.invalidateQueries({ queryKey: ["cleaning_tasks"] });
    },
  });
};

export const useUpdateRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Request> }) => {
      const dbPatch: any = {};
      if (patch.status) dbPatch.status = patch.status;
      if (patch.assignedTo !== undefined) dbPatch.assigned_to = patch.assignedTo;
      if (patch.priority) dbPatch.priority = patch.priority;
      const { error } = await supabase.from("requests").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requests"] }),
  });
};

export const useCreateOpsTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string; description?: string; category: any; priority: any;
      assignedTo?: string | null; dueDate?: string | null;
    }) => {
      const { error, data } = await supabase.from("ops_tasks").insert({
        title: input.title,
        description: input.description ?? "",
        category: input.category,
        priority: input.priority,
        assigned_to: input.assignedTo ?? null,
        due_date: input.dueDate ?? null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops_tasks"] }),
  });
};

export const useUpdateOpsTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<OpsTask> }) => {
      const dbPatch: any = {};
      if (patch.status) dbPatch.status = patch.status;
      if (patch.assignedTo !== undefined) dbPatch.assigned_to = patch.assignedTo;
      if (patch.priority) dbPatch.priority = patch.priority;
      if (patch.title) dbPatch.title = patch.title;
      if (patch.description !== undefined) dbPatch.description = patch.description;
      const { error } = await supabase.from("ops_tasks").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops_tasks"] }),
  });
};

export const useUpdateCleaningTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CleaningTask> }) => {
      const dbPatch: any = {};
      if (patch.status) dbPatch.status = patch.status;
      if (patch.assignedTo !== undefined) dbPatch.assigned_to = patch.assignedTo;
      if (patch.checklist !== undefined) dbPatch.checklist = patch.checklist;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      const { error } = await supabase.from("cleaning_tasks").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cleaning_tasks"] }),
  });
};

export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { spaceId: string; residentId: string | null; title: string; start: string; end: string }) => {
      const { error } = await supabase.from("bookings").insert({
        space_id: input.spaceId,
        resident_id: input.residentId,
        title: input.title,
        start_at: input.start,
        end_at: input.end,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
};

export const useDeleteBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
};
