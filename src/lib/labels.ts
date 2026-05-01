// Static label dictionaries (no data). Used across UI for consistent translation.

export const cleaningTypeLabels: Record<string, string> = {
  room_regular: "Quarto — Regular",
  room_deep: "Quarto — Profunda",
  bathroom: "Casa de banho",
  kitchen: "Cozinha",
  common: "Áreas comuns",
  checkout_inspection: "Inspeção check-out",
};

export const cleaningServiceLabels: Record<string, string> = {
  normal: "Normal",
  simple: "Simples",
};

export const cleaningServiceDescriptions: Record<string, string> = {
  normal: "Limpeza completa: aspirar, lavar chão, casa de banho profunda, mudança de lençóis, pó em todas as superfícies.",
  simple: "Manutenção rápida: lixo, superfícies visíveis, reposição de consumíveis, sem mudança de lençóis.",
};

export const cleaningSourceLabels: Record<string, string> = {
  scheduled: "Plano semanal",
  checkout: "Check-out",
  request: "Pedido residente",
  manual: "Manual",
};

export const taskStatusLabels: Record<string, string> = {
  todo: "A fazer",
  in_progress: "Em curso",
  done: "Concluída",
  blocked: "Bloqueada",
};

export const roomStatusLabels: Record<string, string> = {
  available: "Disponível",
  occupied: "Ocupado",
  reserved: "Reservado",
  maintenance: "Manutenção",
  cleaning_required: "Precisa limpeza",
  out_of_service: "Fora de serviço",
};

export const categoryLabels: Record<string, string> = {
  maintenance: "Manutenção",
  cleaning: "Limpeza",
  consumables: "Consumíveis",
  wifi_tech: "Wi-Fi / Tech",
  noise: "Ruído",
  billing: "Faturação",
  lost_found: "Perdidos",
  feedback: "Feedback",
  other: "Outros",
};

export const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em curso",
  waiting_resident: "Aguarda residente",
  waiting_supplier: "Aguarda fornecedor",
  resolved: "Resolvido",
  closed: "Fechado",
};

export const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};
