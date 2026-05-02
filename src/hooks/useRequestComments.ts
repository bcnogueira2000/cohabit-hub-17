import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RequestComment = {
  id: string;
  request_id: string;
  author_user_id: string;
  author_name: string;
  author_role: "staff" | "resident";
  body: string;
  created_at: string;
};

export const useRequestComments = (requestId?: string) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["request_comments", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_comments" as any)
        .select("*")
        .eq("request_id", requestId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RequestComment[];
    },
  });

  useEffect(() => {
    if (!requestId) return;
    const channel = supabase
      .channel(`request_comments:${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_comments", filter: `request_id=eq.${requestId}` },
        () => qc.invalidateQueries({ queryKey: ["request_comments", requestId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, qc]);

  return query;
};

export const useAddRequestComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; body: string; role: "staff" | "resident" }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes.user;
      if (!u) throw new Error("Sessão expirada");

      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("full_name, email")
        .eq("user_id", u.id)
        .maybeSingle();
      const name = (profile as any)?.full_name || (profile as any)?.email || u.email || "Utilizador";

      const { error } = await supabase.from("request_comments" as any).insert({
        request_id: input.requestId,
        author_user_id: u.id,
        author_name: name,
        author_role: input.role,
        body: input.body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["request_comments", vars.requestId] });
    },
  });
};
