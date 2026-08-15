import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LeadStatus =
  | "new" | "contacted" | "visit_scheduled" | "visited"
  | "proposal_sent" | "negotiating" | "won" | "lost" | "archived";

export type LeadSource =
  | "website_form" | "idealista" | "instagram" | "linkedin"
  | "referral" | "walk_in" | "email" | "phone" | "other";

export interface Lead {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  nationality: string | null;
  gender: string | null;
  age: string | null;
  profile: string | null;
  profileOther: string | null;
  source: LeadSource;
  sourceDetail: string | null;
  preferredRoomType: string | null;
  preferredMoveIn: string | null;
  stayDuration: string | null;
  whatBringsThem: string | null;
  budgetRange: string | null;
  status: LeadStatus;
  assignedTo: string | null;
  assignedToUserId: string | null;
  notes: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  stayId: string | null;
  lostReason: string | null;
  externalRef: string | null;
  gdprConsent: boolean;
  language: string | null;
  createdAt: string;
  updatedAt: string;
}

export const mapLead = (r: any): Lead => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  phone: r.phone ?? null,
  nationality: r.nationality ?? null,
  gender: r.gender ?? null,
  age: r.age ?? null,
  profile: r.profile ?? null,
  profileOther: r.profile_other ?? null,
  source: r.source,
  sourceDetail: r.source_detail ?? null,
  preferredRoomType: r.preferred_room_type ?? null,
  preferredMoveIn: r.preferred_move_in ?? null,
  stayDuration: r.stay_duration ?? null,
  whatBringsThem: r.what_brings_them ?? null,
  budgetRange: r.budget_range ?? null,
  status: r.status,
  assignedTo: r.assigned_to ?? null,
  assignedToUserId: r.assigned_to_user_id ?? null,
  notes: r.notes ?? null,
  nextAction: r.next_action ?? null,
  nextActionDate: r.next_action_date ?? null,
  stayId: r.stay_id ?? null,
  lostReason: r.lost_reason ?? null,
  externalRef: r.external_ref ?? null,
  gdprConsent: !!r.gdpr_consent,
  language: r.language ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface LeadInput {
  fullName: string;
  email: string;
  phone?: string | null;
  nationality?: string | null;
  gender?: string | null;
  age?: string | null;
  profile?: string | null;
  profileOther?: string | null;
  source: LeadSource;
  sourceDetail?: string | null;
  preferredRoomType?: string | null;
  preferredMoveIn?: string | null;
  stayDuration?: string | null;
  whatBringsThem?: string | null;
  budgetRange?: string | null;
  status?: LeadStatus;
  assignedTo?: string | null;
  assignedToUserId?: string | null;
  notes?: string | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  lostReason?: string | null;
  gdprConsent?: boolean;
  language?: string | null;
}

const toDbPatch = (i: Partial<LeadInput>) => {
  const p: any = {};
  if (i.fullName !== undefined) p.full_name = i.fullName;
  if (i.email !== undefined) p.email = i.email;
  if (i.phone !== undefined) p.phone = i.phone;
  if (i.nationality !== undefined) p.nationality = i.nationality;
  if (i.gender !== undefined) p.gender = i.gender;
  if (i.age !== undefined) p.age = i.age;
  if (i.profile !== undefined) p.profile = i.profile;
  if (i.profileOther !== undefined) p.profile_other = i.profileOther;
  if (i.source !== undefined) p.source = i.source;
  if (i.sourceDetail !== undefined) p.source_detail = i.sourceDetail;
  if (i.preferredRoomType !== undefined) p.preferred_room_type = i.preferredRoomType;
  if (i.preferredMoveIn !== undefined) p.preferred_move_in = i.preferredMoveIn;
  if (i.stayDuration !== undefined) p.stay_duration = i.stayDuration;
  if (i.whatBringsThem !== undefined) p.what_brings_them = i.whatBringsThem;
  if (i.budgetRange !== undefined) p.budget_range = i.budgetRange;
  if (i.status !== undefined) p.status = i.status;
  if (i.assignedTo !== undefined) p.assigned_to = i.assignedTo;
  if (i.assignedToUserId !== undefined) p.assigned_to_user_id = i.assignedToUserId;
  if (i.notes !== undefined) p.notes = i.notes;
  if (i.nextAction !== undefined) p.next_action = i.nextAction;
  if (i.nextActionDate !== undefined) p.next_action_date = i.nextActionDate;
  if (i.lostReason !== undefined) p.lost_reason = i.lostReason;
  if (i.gdprConsent !== undefined) p.gdpr_consent = i.gdprConsent;
  if (i.language !== undefined) p.language = i.language;
  return p;
};

export const useLeads = () =>
  useQuery({
    queryKey: ["leads"],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from("leads" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map(mapLead);
    },
  });

export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeadInput) => {
      const { data, error } = await supabase
        .from("leads" as any)
        .insert(toDbPatch(input))
        .select()
        .single();
      if (error) throw error;
      return mapLead(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
};

export const useUpdateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<LeadInput> }) => {
      const { error } = await supabase.from("leads" as any).update(toDbPatch(patch)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead_activity"] });
    },
  });
};

export const useDeleteLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
};

export interface LeadActivity {
  id: string;
  leadId: string;
  actorUserId: string | null;
  actorName: string | null;
  kind: string;
  payload: Record<string, any>;
  createdAt: string;
}

export const useLeadActivity = (leadId: string | null) =>
  useQuery({
    queryKey: ["lead_activity", leadId],
    enabled: leadId !== null,
    queryFn: async (): Promise<LeadActivity[]> => {
      const { data, error } = await supabase
        .from("lead_activity" as any)
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        leadId: r.lead_id,
        actorUserId: r.actor_user_id ?? null,
        actorName: r.actor_name ?? null,
        kind: r.kind,
        payload: r.payload ?? {},
        createdAt: r.created_at,
      }));
    },
  });
