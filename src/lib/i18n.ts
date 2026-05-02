// Lightweight bilingual helper for Resident Portal (PT default, EN optional).
// Stored in localStorage under "lc_lang". Use t(key).
import { useEffect, useState } from "react";

export type Lang = "pt" | "en";

const dict: Record<string, { pt: string; en: string }> = {
  // Common
  "common.loading": { pt: "A carregar…", en: "Loading…" },
  "common.save": { pt: "Guardar", en: "Save" },
  "common.cancel": { pt: "Cancelar", en: "Cancel" },
  "common.submit": { pt: "Submeter", en: "Submit" },
  "common.back": { pt: "Voltar", en: "Back" },
  "common.empty": { pt: "Sem registos", en: "Nothing here yet" },

  // Auth
  "auth.signin": { pt: "Entrar", en: "Sign in" },
  "auth.signup": { pt: "Criar conta", en: "Create account" },
  "auth.email": { pt: "Email", en: "Email" },
  "auth.password": { pt: "Password", en: "Password" },
  "auth.fullname": { pt: "Nome completo", en: "Full name" },
  "auth.phone": { pt: "Telefone", en: "Phone" },
  "auth.room": { pt: "Nº do quarto (se já souberes)", en: "Room number (if known)" },
  "auth.move_in": { pt: "Data prevista de entrada", en: "Expected move-in date" },
  "auth.forgot": { pt: "Esqueci-me da password", en: "Forgot password" },
  "auth.google": { pt: "Continuar com Google", en: "Continue with Google" },

  // Pending
  "pending.title": { pt: "Conta pendente de aprovação", en: "Account pending approval" },
  "pending.body": {
    pt: "A equipa Living Colours vai validar a tua conta em breve. Recebes um email assim que estiver tudo pronto.",
    en: "The Living Colours team will review your account shortly. You'll receive an email once it's approved.",
  },
  "pending.signout": { pt: "Sair", en: "Sign out" },

  // Resident shell
  "tab.home": { pt: "Início", en: "Home" },
  "tab.requests": { pt: "Pedidos", en: "Requests" },
  "tab.bookings": { pt: "Reservas", en: "Bookings" },
  "tab.events": { pt: "Eventos", en: "Events" },
  "tab.more": { pt: "Mais", en: "More" },

  "home.greeting": { pt: "Olá", en: "Hi" },
  "home.welcome": { pt: "Bem-vindo ao teu espaço Living Colours.", en: "Welcome to your Living Colours space." },
  "home.new_request": { pt: "Novo pedido", en: "New request" },
  "home.book_space": { pt: "Reservar espaço", en: "Book a space" },
  "home.services": { pt: "Serviços", en: "Services" },
  "home.events": { pt: "Eventos", en: "Events" },
  "home.active_requests": { pt: "Pedidos ativos", en: "Active requests" },
  "home.next_booking": { pt: "Próxima reserva", en: "Next booking" },
};

export const useLang = () => {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("lc_lang") as Lang) || "pt");
  useEffect(() => { localStorage.setItem("lc_lang", lang); }, [lang]);
  const t = (key: string): string => dict[key]?.[lang] ?? key;
  return { lang, setLang, t };
};

export const t = (key: string, lang: Lang = (localStorage.getItem("lc_lang") as Lang) || "pt"): string =>
  dict[key]?.[lang] ?? key;
