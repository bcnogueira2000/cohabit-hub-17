import { useEffect, useState } from "react";
import { BellRing, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  currentPushAvailability,
  disablePush,
  enablePush,
  isPushActiveOnThisDevice,
  sendTestPush,
} from "@/lib/push";

const MESSAGES: Record<string, string> = {
  "open-in-new-tab": "Abre a app no telemóvel (ícone no ecrã principal) para ativar.",
  "needs-install":
    "No iPhone: no Safari carrega em Partilhar → «Adicionar ao ecrã principal» e abre a app a partir desse ícone.",
  unsupported: "Este navegador não suporta notificações.",
  denied: "As notificações estão bloqueadas. Ativa-as nos Ajustes do iPhone → Notificações → Living Colours.",
};

export const PushToggle = () => {
  const { user } = useAuth();
  const [active, setActive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const availability = currentPushAvailability();

  useEffect(() => {
    isPushActiveOnThisDevice().then(setActive).catch(() => setActive(false));
  }, []);

  const onEnable = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const r = await enablePush(user.id);
      if (r.status === "registered") {
        setActive(true);
        toast.success("Notificações ativas neste dispositivo");
        await sendTestPush().catch(() => undefined);
      } else {
        toast.error(MESSAGES[r.status] ?? "Não foi possível ativar");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível ativar as notificações");
    } finally {
      setBusy(false);
    }
  };

  const onTest = async () => {
    setBusy(true);
    try {
      await sendTestPush();
      toast.success("Notificação de teste enviada");
    } catch (e: any) {
      toast.error(e?.message ?? "Falhou o envio de teste");
    } finally {
      setBusy(false);
    }
  };

  const onDisable = async () => {
    setBusy(true);
    try {
      await disablePush();
      setActive(false);
      toast.success("Notificações desativadas neste dispositivo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-border p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium">
        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
        Avisos no telemóvel (lead nova)
      </div>
      {availability !== "supported" && availability !== "denied" ? (
        <p className="text-xs text-muted-foreground">{MESSAGES[availability]}</p>
      ) : active ? (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={onTest} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enviar teste"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onDisable} disabled={busy}>
            Desativar
          </Button>
        </div>
      ) : availability === "denied" ? (
        <p className="text-xs text-muted-foreground">{MESSAGES.denied}</p>
      ) : (
        <Button size="sm" className="h-8 text-xs w-full gap-1" onClick={onEnable} disabled={busy || active === null}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
          Ativar neste dispositivo
        </Button>
      )}
    </div>
  );
};
