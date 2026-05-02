import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  mapBooking, mapCleaning, mapOpsTask, mapRequest, mapResident, mapRoom, mapSpace, mapStay,
} from "@/lib/dataMappers";
import type { Booking, CleaningTask, OpsTask, Request, Resident, Room, Space, Stay } from "@/lib/types";

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
        code: "",
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
      if (patch.assignedToUserId !== undefined) dbPatch.assigned_to_user_id = patch.assignedToUserId;
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
      assignedTo?: string | null; assignedToUserId?: string | null; dueDate?: string | null;
    }) => {
      const { error, data } = await supabase.from("ops_tasks").insert({
        code: "",
        title: input.title,
        description: input.description ?? "",
        category: input.category,
        priority: input.priority,
        assigned_to: input.assignedTo ?? null,
        assigned_to_user_id: input.assignedToUserId ?? null,
        due_date: input.dueDate ?? null,
      } as any).select().single();
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
      if (patch.assignedToUserId !== undefined) dbPatch.assigned_to_user_id = patch.assignedToUserId;
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
      if (patch.assignedToUserId !== undefined) dbPatch.assigned_to_user_id = patch.assignedToUserId;
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

// ============ STAYS ============

export const useStays = () =>
  useQuery({
    queryKey: ["stays"],
    queryFn: async (): Promise<Stay[]> => {
      const { data, error } = await supabase.from("stays" as any).select("*").order("check_in", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map(mapStay);
    },
  });

export const useCreateStay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      fullName: string; email: string; phone?: string;
      roomId?: string | null; checkIn: string; checkOut: string;
      status?: "pending" | "confirmed"; source?: "manual" | "public_form" | "external";
      notes?: string;
    }) => {
      const { data, error } = await supabase.from("stays" as any).insert({
        full_name: input.fullName,
        email: input.email,
        phone: input.phone ?? null,
        room_id: input.roomId ?? null,
        check_in: input.checkIn,
        check_out: input.checkOut,
        status: input.status ?? "confirmed",
        source: input.source ?? "manual",
        notes: input.notes ?? null,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stays"] });
      qc.invalidateQueries({ queryKey: ["residents"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["ops_tasks"] });
      qc.invalidateQueries({ queryKey: ["cleaning_tasks"] });
    },
  });
};

export const useUpdateStay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Stay> }) => {
      const dbPatch: any = {};
      if (patch.status) dbPatch.status = patch.status;
      if (patch.roomId !== undefined) dbPatch.room_id = patch.roomId;
      if (patch.checkIn) dbPatch.check_in = patch.checkIn;
      if (patch.checkOut) dbPatch.check_out = patch.checkOut;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      if (patch.fullName) dbPatch.full_name = patch.fullName;
      if (patch.phone !== undefined) dbPatch.phone = patch.phone;
      const { error } = await supabase.from("stays" as any).update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stays"] });
      qc.invalidateQueries({ queryKey: ["residents"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["ops_tasks"] });
      qc.invalidateQueries({ queryKey: ["cleaning_tasks"] });
    },
  });
};

export const useDeleteStay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stays" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stays"] }),
  });
};
