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

export const supplierCategoryLabels: Record<string, string> = {
  plumbing: "Canalização",
  electrical: "Eletricidade",
  cleaning_company: "Empresa de limpeza",
  internet: "Internet / Tech",
  laundry: "Lavandaria",
  maintenance: "Manutenção geral",
  hvac: "AVAC",
  pest_control: "Controlo de pragas",
  gardening: "Jardinagem",
  security: "Segurança",
  other: "Outro",
};

export const locationKindLabels: Record<string, string> = {
  room: "Quarto",
  shared_bathroom: "Casa de banho partilhada",
  apartment_kitchen: "Cozinha de apartamento",
  common_kitchen: "Cozinha comum",
  corridor: "Corredor",
  balcony: "Varanda",
  laundry: "Lavandaria",
  meeting_room: "Sala de reuniões",
  cowork: "Cowork",
  terrace: "Terraço",
  winter_garden: "Jardim de inverno",
  cinema: "Sala de cinema",
  technical: "Área técnica",
  other: "Outro",
};

export const locationStatusLabels: Record<string, string> = {
  active: "Ativo",
  out_of_service: "Fora de serviço",
  under_maintenance: "Em manutenção",
};

export const requestActivityLabels: Record<string, string> = {
  created: "Pedido criado",
  status_changed: "Estado alterado",
  owner_changed: "Responsável alterado",
  supplier_assigned: "Fornecedor atribuído",
  supplier_removed: "Fornecedor removido",
  cost_updated: "Custo atualizado",
  location_changed: "Local alterado",
};
