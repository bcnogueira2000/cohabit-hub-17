import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
export type SpaceRow = Database["public"]["Tables"]["spaces"]["Row"];

export const useMyBookings = () =>
  useQuery({
    queryKey: ["my_bookings"],
    queryFn: async (): Promise<BookingRow[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("start_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSpaces = () =>
  useQuery({
    queryKey: ["spaces", "active"],
    queryFn: async (): Promise<SpaceRow[]> => {
      const { data, error } = await supabase
        .from("spaces")
        .select("*")
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSpaceBookingsForDay = (spaceId: string | null, dayISO: string) =>
  useQuery({
    enabled: !!spaceId && !!dayISO,
    queryKey: ["space_bookings", spaceId, dayISO],
    queryFn: async (): Promise<BookingRow[]> => {
      if (!spaceId) return [];
      const start = new Date(dayISO);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("space_id", spaceId)
        .gte("start_at", start.toISOString())
        .lt("start_at", end.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

export interface CreateBookingInput {
  space_id: string;
  title: string;
  start_at: string;
  end_at: string;
  notes?: string;
}

export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      const { data: residentRow } = await supabase
        .from("residents")
        .select("id")
        .limit(1)
        .maybeSingle();

      // Conflict check
      const { data: existing } = await supabase
        .from("bookings")
        .select("id, start_at, end_at")
        .eq("space_id", input.space_id)
        .lt("start_at", input.end_at)
        .gt("end_at", input.start_at);
      if (existing && existing.length > 0) {
        throw new Error("Já existe uma reserva neste espaço para este horário.");
      }

      const { data, error } = await supabase
        .from("bookings")
        .insert({
          space_id: input.space_id,
          title: input.title,
          start_at: input.start_at,
          end_at: input.end_at,
          notes: input.notes ?? null,
          resident_id: residentRow?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_bookings"] });
      qc.invalidateQueries({ queryKey: ["space_bookings"] });
    },
  });
};

export const useCancelBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my_bookings"] }),
  });
};
