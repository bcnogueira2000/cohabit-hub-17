import { supabase } from "@/integrations/supabase/client";
import { pushAvailability, urlBase64ToUint8Array, type PushAvailability } from "./pushSupport";

// Chave pública VAPID (pode estar no código; a privada está só no servidor).
export const VAPID_PUBLIC_KEY =
  "BMI9ahBg1Co6GcErGWT4GK-2UOXmoemKotTpci9ecv4KpZ8z2C8SxbL_UxLZbwJODp-BgLWpIWEvMgQ_PLjp-Pk";

const SW_URL = "/push-sw.js";

export const currentPushAvailability = (): PushAvailability => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  let inIframe = false;
  try {
    inIframe = window.top !== window.self;
  } catch {
    inIframe = true;
  }
  return pushAvailability({
    inIframe,
    isIOS,
    isStandalone,
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
    permission: "Notification" in window ? Notification.permission : undefined,
  });
};

const getRegistration = async () => {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL);
  return existing ?? null;
};

export const isPushActiveOnThisDevice = async (): Promise<boolean> => {
  if (currentPushAvailability() !== "supported") return false;
  if (Notification.permission !== "granted") return false;
  const reg = await getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
};

export type EnablePushResult = { status: "registered" } | { status: Exclude<PushAvailability, "supported"> };

// Chamar a partir de um clique (o iPhone exige um gesto do utilizador).
export const enablePush = async (userId: string): Promise<EnablePushResult> => {
  const availability = currentPushAvailability();
  if (availability !== "supported") return { status: availability };

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
  return { status: "registered" };
};

export const disablePush = async () => {
  const reg = await getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
};

export const sendTestPush = async () => {
  const { data, error } = await supabase.functions.invoke("push-nova-lead", { body: { action: "test" } });
  if (error) {
    const details = (error as any)?.context?.text ? await (error as any).context.text() : error.message;
    let msg = details;
    try {
      msg = JSON.parse(details)?.error ?? details;
    } catch { /* texto simples */ }
    throw new Error(msg);
  }
  return data as { sent: number };
};
