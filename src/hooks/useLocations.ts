import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapLocation } from "@/lib/dataMappers";
import type { Location, LocationKind, LocationStatus } from "@/lib/types";

export const useLocations = (opts: { excludeRooms?: boolean } = {}) =>
  useQuery({
    queryKey: ["locations", opts.excludeRooms ?? false],
    queryFn: async (): Promise<Location[]> => {
      let q = supabase.from("locations" as any).select("*").order("name");
      if (opts.excludeRooms) q = q.neq("kind", "room");
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as any[]).map(mapLocation);
    },
  });

export const useLocation = (id: string | undefined) =>
  useQuery({
    enabled: !!id,
    queryKey: ["location", id],
    queryFn: async (): Promise<Location | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("locations" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapLocation(data) : null;
    },
  });

export interface LocationInput {
  name: string;
  kind: LocationKind;
  floor?: number | null;
  apartment?: string | null;
  parentLocationId?: string | null;
  status?: LocationStatus;
  notes?: string | null;
}

const toDbPatch = (input: Partial<LocationInput>) => {
  const p: any = {};
  if (input.name !== undefined) p.name = input.name;
  if (input.kind !== undefined) p.kind = input.kind;
  if (input.floor !== undefined) p.floor = input.floor;
  if (input.apartment !== undefined) p.apartment = input.apartment;
  if (input.parentLocationId !== undefined) p.parent_location_id = input.parentLocationId;
  if (input.status !== undefined) p.status = input.status;
  if (input.notes !== undefined) p.notes = input.notes;
  return p;
};

export const useCreateLocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LocationInput) => {
      const { data, error } = await supabase
        .from("locations" as any)
        .insert(toDbPatch(input))
        .select()
        .single();
      if (error) throw error;
      return mapLocation(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
};

export const useUpdateLocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<LocationInput> }) => {
      const { error } = await supabase
        .from("locations" as any)
        .update(toDbPatch(patch))
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["location", vars.id] });
    },
  });
};
