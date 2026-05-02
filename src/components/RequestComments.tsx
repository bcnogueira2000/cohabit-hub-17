import { useState, useRef, useEffect } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { BrandAvatar } from "@/components/ui/BrandAvatar";
import { cn } from "@/lib/utils";
import { useRequestComments, useAddRequestComment } from "@/hooks/useRequestComments";
import { toast } from "sonner";

interface Props {
  requestId: string;
  viewerRole: "staff" | "resident";
  className?: string;
}

export const RequestComments = ({ requestId, viewerRole, className }: Props) => {
  const { data: comments = [], isLoading } = useRequestComments(requestId);
  const addMut = useAddRequestComment();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [comments.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    try {
      await addMut.mutateAsync({ requestId, body: text, role: viewerRole });
      setBody("");
    } catch (e: any) {
      toast.error(e.message ?? "Erro a enviar mensagem");
    }
  };

  return (
    <Card className={cn("p-5 border-border/60 shadow-card", className)}>
      <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" /> Conversa
        {comments.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">({comments.length})</span>
        )}
      </h3>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> A carregar…
          </div>
        )}
        {!isLoading && comments.length === 0 && (
          <p className="text-sm text-muted-foreground py-3 text-center">
            Ainda não há mensagens. Sê o primeiro a escrever.
          </p>
        )}
        {comments.map((c) => {
          const mine = c.author_role === viewerRole;
          return (
            <div key={c.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
              <BrandAvatar name={c.author_name} size="sm" />
              <div className={cn("max-w-[78%]", mine && "items-end")}>
                <div className="flex items-center gap-1.5 mb-0.5 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">{c.author_name}</span>
                  <span>·</span>
                  <span>{new Date(c.created_at).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</span>
                  {c.author_role === "staff" && (
                    <span className="text-[10px] uppercase tracking-wide text-primary font-semibold ml-0.5">Equipa</span>
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed",
                    mine
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm",
                  )}
                >
                  {c.body}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2 items-end">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreve uma mensagem…"
          rows={2}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e as any);
          }}
        />
        <Button type="submit" size="icon" disabled={addMut.isPending || !body.trim()}>
          {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </Card>
  );
};
