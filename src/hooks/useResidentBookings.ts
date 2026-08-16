import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
export type LocationRow = Database["public"]["Tables"]["locations"]["Row"];
/** Bookable spaces are now locations with is_bookable = true. */
export type SpaceRow = LocationRow;

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
    queryKey: ["bookable_locations"],
    queryFn: async (): Promise<LocationRow[]> => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_bookable", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSpaceBookingsForDay = (locationId: string | null, dayISO: string) =>
  useQuery({
    enabled: !!locationId && !!dayISO,
    queryKey: ["space_bookings", locationId, dayISO],
    queryFn: async (): Promise<BookingRow[]> => {
      if (!locationId) return [];
      const start = new Date(dayISO);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("location_id", locationId)
        .gte("start_at", start.toISOString())
        .lt("start_at", end.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

export interface CreateBookingInput {
  location_id: string;
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
        .eq("location_id", input.location_id)
        .lt("start_at", input.end_at)
        .gt("end_at", input.start_at);
      if (existing && existing.length > 0) {
        throw new Error("Já existe uma reserva neste espaço para este horário.");
      }

      const { data, error } = await supabase
        .from("bookings")
        .insert({
          location_id: input.location_id,
          title: input.title,
          start_at: input.start_at,
          end_at: input.end_at,
          notes: input.notes ?? null,
          resident_id: residentRow?.id ?? null,
        })
        .select("*")
        .single();
      if (error) {
        const msg = `${error.message} ${error.details ?? ""} ${error.code ?? ""}`.toLowerCase();
        if (msg.includes("exclusion") || msg.includes("overlap") || msg.includes("bookings_no_overlap") || error.code === "23P01") {
          throw new Error("Este espaço já está reservado para este horário.");
        }
        throw error;
      }
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
