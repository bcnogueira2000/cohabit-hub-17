// Regras de disponibilidade das notificações push (puras, testadas).
export type PushAvailability =
  | "supported"
  | "open-in-new-tab"
  | "needs-install"
  | "unsupported"
  | "denied";

export type PushEnv = {
  inIframe: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  permission?: NotificationPermission;
};

export const pushAvailability = (env: PushEnv): PushAvailability => {
  if (env.inIframe) return "open-in-new-tab";
  // No iPhone/iPad só funciona com a app adicionada ao ecrã principal.
  if (env.isIOS && !env.isStandalone) return "needs-install";
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return "unsupported";
  if (env.permission === "denied") return "denied";
  return "supported";
};

export const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};
