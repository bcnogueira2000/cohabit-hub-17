import { describe, it, expect } from "vitest";
import { pushAvailability, urlBase64ToUint8Array, type PushEnv } from "./pushSupport";

const base: PushEnv = {
  inIframe: false,
  isIOS: true,
  isStandalone: true,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  permission: "default",
};

describe("pushAvailability", () => {
  it("iPhone com a app no ecrã principal pode ativar", () => {
    expect(pushAvailability(base)).toBe("supported");
  });
  it("iPhone no Safari normal pede para adicionar ao ecrã principal", () => {
    expect(pushAvailability({ ...base, isStandalone: false, hasPushManager: false })).toBe("needs-install");
  });
  it("dentro da pré-visualização pede para abrir noutro separador", () => {
    expect(pushAvailability({ ...base, inIframe: true })).toBe("open-in-new-tab");
  });
  it("permissão recusada é assinalada", () => {
    expect(pushAvailability({ ...base, permission: "denied" })).toBe("denied");
  });
});

describe("urlBase64ToUint8Array", () => {
  it("converte a chave pública (65 bytes)", () => {
    const k = urlBase64ToUint8Array("BMI9ahBg1Co6GcErGWT4GK-2UOXmoemKotTpci9ecv4KpZ8z2C8SxbL_UxLZbwJODp-BgLWpIWEvMgQ_PLjp-Pk");
    expect(k.length).toBe(65);
    expect(k[0]).toBe(4);
  });
});
