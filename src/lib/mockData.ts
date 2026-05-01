import { Resident, Room, Request, CleaningTask } from "./types";

const today = new Date();
const iso = (offsetDays: number, hours = 9) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
};

export const rooms: Room[] = [
  { id: "r1", number: "101", floor: 1, typology: "Studio", status: "occupied", currentResidentId: "p1" },
  { id: "r2", number: "102", floor: 1, typology: "Single", status: "occupied", currentResidentId: "p2" },
  { id: "r3", number: "103", floor: 1, typology: "Single", status: "cleaning_required", currentResidentId: null },
  { id: "r4", number: "201", floor: 2, typology: "Studio", status: "occupied", currentResidentId: "p3" },
  { id: "r5", number: "202", floor: 2, typology: "Twin", status: "available", currentResidentId: null },
  { id: "r6", number: "203", floor: 2, typology: "Single", status: "maintenance", currentResidentId: null },
  { id: "r7", number: "301", floor: 3, typology: "Studio", status: "occupied", currentResidentId: "p4" },
  { id: "r8", number: "302", floor: 3, typology: "Single", status: "reserved", currentResidentId: null },
];

export const residents: Resident[] = [
  { id: "p1", fullName: "Beatriz Almeida", email: "bea@example.com", phone: "+351 912 000 001", roomId: "r1", moveIn: iso(-45), moveOut: iso(20), status: "active", avatarColor: "hsl(14 55% 48%)" },
  { id: "p2", fullName: "Tomás Ferreira", email: "tomas@example.com", phone: "+351 912 000 002", roomId: "r2", moveIn: iso(-12), moveOut: iso(48), status: "active", avatarColor: "hsl(110 25% 40%)" },
  { id: "p3", fullName: "Sofia Marques", email: "sofia@example.com", phone: "+351 912 000 003", roomId: "r4", moveIn: iso(-60), moveOut: iso(5), status: "checking_out", avatarColor: "hsl(38 70% 50%)" },
  { id: "p4", fullName: "Lucas Pereira", email: "lucas@example.com", phone: "+351 912 000 004", roomId: "r7", moveIn: iso(-3), moveOut: iso(85), status: "active", avatarColor: "hsl(200 45% 45%)" },
  { id: "p5", fullName: "Inês Costa", email: "ines@example.com", phone: "+351 912 000 005", roomId: null, moveIn: iso(7), moveOut: iso(95), status: "upcoming", avatarColor: "hsl(280 30% 50%)" },
];

export const requests: Request[] = [
  {
    id: "req1", code: "REQ-001", title: "Torneira da casa de banho a pingar",
    category: "maintenance", description: "A torneira do lavatório está a pingar continuamente desde ontem à noite.",
    residentId: "p1", roomId: "r1", location: "Quarto 101 — casa de banho privada",
    priority: "medium", status: "in_progress", assignedTo: "Carlos (manutenção)",
    createdAt: iso(-1, 10), updatedAt: iso(0, 8), permissionToEnter: "with_notice",
  },
  {
    id: "req2", code: "REQ-002", title: "Wi-Fi instável no 2º andar",
    category: "wifi_tech", description: "Internet desliga várias vezes por dia no quarto 201.",
    residentId: "p3", roomId: "r4", location: "Quarto 201",
    priority: "high", status: "open", assignedTo: null,
    createdAt: iso(0, 7), updatedAt: iso(0, 7), permissionToEnter: "yes",
  },
  {
    id: "req3", code: "REQ-003", title: "Falta papel higiénico na casa de banho partilhada",
    category: "consumables", description: "Sem papel há cerca de 2 horas.",
    residentId: "p2", roomId: null, location: "Casa de banho partilhada — 1º andar",
    priority: "urgent", status: "open", assignedTo: null,
    createdAt: iso(0, 9), updatedAt: iso(0, 9), permissionToEnter: "yes",
  },
  {
    id: "req4", code: "REQ-004", title: "Barulho excessivo durante a noite",
    category: "noise", description: "Vizinhos do 102 com música alta passada da meia-noite.",
    residentId: "p1", roomId: "r1", location: "1º andar",
    priority: "medium", status: "waiting_resident", assignedTo: "Maria (manager)",
    createdAt: iso(-2, 23), updatedAt: iso(-1, 11), permissionToEnter: "no",
  },
  {
    id: "req5", code: "REQ-005", title: "Lâmpada queimada na cozinha comum",
    category: "maintenance", description: "Lâmpada do tecto não acende.",
    residentId: "p4", roomId: null, location: "Cozinha comum — 3º andar",
    priority: "low", status: "resolved", assignedTo: "Carlos (manutenção)",
    createdAt: iso(-4, 14), updatedAt: iso(-1, 16), permissionToEnter: "yes",
  },
  {
    id: "req6", code: "REQ-006", title: "Pedido de chave extra",
    category: "other", description: "Perdi a chave do quarto.",
    residentId: "p2", roomId: "r2", location: "Quarto 102",
    priority: "high", status: "waiting_supplier", assignedTo: "Maria (manager)",
    createdAt: iso(-3, 11), updatedAt: iso(-2, 9), permissionToEnter: "yes",
  },
];

export const cleaningTasks: CleaningTask[] = [
  { id: "c1", type: "room_regular", roomId: "r3", area: "Quarto 103", scheduledFor: iso(0, 11), status: "scheduled", assignedTo: "Equipa A" },
  { id: "c2", type: "kitchen", roomId: null, area: "Cozinha 1º andar", scheduledFor: iso(0, 14), status: "in_progress", assignedTo: "Equipa A" },
  { id: "c3", type: "bathroom", roomId: null, area: "WC partilhado 2º andar", scheduledFor: iso(0, 15), status: "scheduled", assignedTo: "Equipa B" },
  { id: "c4", type: "checkout_inspection", roomId: "r4", area: "Quarto 201", scheduledFor: iso(1, 10), status: "scheduled", assignedTo: null },
];

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
