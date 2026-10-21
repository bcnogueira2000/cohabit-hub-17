import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapSupplier } from "@/lib/dataMappers";
import type { Supplier, SupplierCategory } from "@/lib/types";

export const useSuppliers = (opts: { activeOnly?: boolean } = {}) =>
  useQuery({
    queryKey: ["suppliers", opts.activeOnly ?? false],
    queryFn: async (): Promise<Supplier[]> => {
      let q = supabase.from("suppliers" as any).select("*").order("name");
      if (opts.activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as any[]).map(mapSupplier);
    },
  });

export const useSupplier = (id: string | undefined) =>
  useQuery({
    enabled: !!id,
    queryKey: ["supplier", id],
    queryFn: async (): Promise<Supplier | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("suppliers" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapSupplier(data) : null;
    },
  });

export interface SupplierInput {
  name: string;
  category: SupplierCategory;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  notes?: string | null;
  tags?: string[];
  active?: boolean;
}

const toDbPatch = (input: Partial<SupplierInput>) => {
  const p: any = {};
  if (input.name !== undefined) p.name = input.name;
  if (input.category !== undefined) p.category = input.category;
  if (input.contactName !== undefined) p.contact_name = input.contactName;
  if (input.phone !== undefined) p.phone = input.phone;
  if (input.email !== undefined) p.email = input.email;
  if (input.website !== undefined) p.website = input.website;
  if (input.notes !== undefined) p.notes = input.notes;
  if (input.tags !== undefined) p.tags = input.tags;
  if (input.active !== undefined) p.active = input.active;
  return p;
};

export const useCreateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SupplierInput) => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .insert(toDbPatch(input))
        .select()
        .single();
      if (error) throw error;
      return mapSupplier(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};

export const useUpdateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SupplierInput> }) => {
      const { error } = await supabase
        .from("suppliers" as any)
        .update(toDbPatch(patch))
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["supplier", vars.id] });
    },
  });
};

export const useDeleteSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};
