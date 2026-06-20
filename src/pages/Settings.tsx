import { Settings as Cog, Tag, Sparkles, MapPin, Clock, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoryLabels, cleaningTypeLabels } from "@/lib/labels";
import { useSpaces } from "@/hooks/useData";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const { data: spaces = [] } = useSpaces();
  const qc = useQueryClient();
  const toggleSpace = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("spaces").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["spaces"] });
      toast.success(vars.active ? "Espaço ativado" : "Espaço desativado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });
  const slas = [
    { priority: "Urgente", target: "2 horas" },
    { priority: "Alta", target: "8 horas" },
    { priority: "Média", target: "24 horas" },
    { priority: "Baixa", target: "72 horas" },
  ];

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl lg:text-4xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configurações da operação</p>
      </div>

      <div className="space-y-4">
        <Card className="p-5 border-border/60 shadow-card">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2"><Cog className="h-5 w-5 text-primary" /> Geral</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Nome da operação</Label><Input defaultValue="Living Colours AR" className="mt-1.5" /></div>
            <div><Label>Fuso horário</Label><Input defaultValue="Europe/Lisbon" className="mt-1.5" /></div>
          </div>
        </Card>

        <Card className="p-5 border-border/60 shadow-card">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> SLA por prioridade</h2>
          <div className="space-y-2">
            {slas.map((s) => (
              <div key={s.priority} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <span className="font-medium text-sm">{s.priority}</span>
                <Input defaultValue={s.target} className="w-32 h-8" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-border/60 shadow-card">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /> Categorias de pedidos</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryLabels).map(([k, v]) => (
              <span key={k} className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm">{v}</span>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-border/60 shadow-card">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Tipos de limpeza</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(cleaningTypeLabels).map(([k, v]) => (
              <span key={k} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">{v}</span>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-border/60 shadow-card">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Espaços reserváveis</h2>
          <div className="space-y-2">
            {spaces.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">Capacidade {s.capacity}</div>
                </div>
                <Switch
                  checked={s.active}
                  disabled={toggleSpace.isPending}
                  onCheckedChange={(v) => toggleSpace.mutate({ id: s.id, active: v })}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-border/60 shadow-card">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notificações</h2>
          <div className="space-y-2">
            {["Novo pedido criado", "Pedido urgente", "Limpeza atrasada", "Check-out a aproximar-se"].map((n) => (
              <div key={n} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <span className="text-sm">{n}</span>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </Card>

        <div className="text-center text-xs text-muted-foreground pt-4">
          Living Colours Ops · v0.3 · Lovable Cloud
        </div>
      </div>
    </div>
  );
};

export default Settings;
