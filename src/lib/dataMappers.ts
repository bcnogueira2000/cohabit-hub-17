import type { Resident, Room, Request, CleaningTask, OpsTask, Booking, Space, Stay } from "./types";

// Maps from DB snake_case rows to the app's camelCase types.
// Lets us keep existing pages mostly intact.

export const mapRoom = (r: any): Room => ({
  id: r.id,
  number: r.number,
  floor: r.floor,
  typology: r.typology,
  status: r.status,
  currentResidentId: r.current_resident_id ?? null,
});

export const mapResident = (r: any): Resident => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  phone: r.phone ?? "",
  roomId: r.room_id ?? null,
  moveIn: r.move_in,
  moveOut: r.move_out,
  status: r.status,
  avatarColor: r.avatar_color ?? "hsl(110 25% 40%)",
});

export const mapRequest = (r: any): Request => ({
  id: r.id,
  code: r.code,
  title: r.title,
  category: r.category,
  description: r.description ?? "",
  residentId: r.resident_id ?? null,
  roomId: r.room_id ?? null,
  location: r.location ?? "",
  priority: r.priority,
  status: r.status,
  assignedTo: r.assigned_to ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  permissionToEnter: r.permission_to_enter,
});

export const mapOpsTask = (t: any): OpsTask => ({
  id: t.id,
  code: t.code,
  title: t.title,
  description: t.description ?? "",
  category: t.category,
  status: t.status,
  priority: t.priority,
  assignedTo: t.assigned_to ?? null,
  roomId: t.room_id ?? null,
  residentId: t.resident_id ?? null,
  requestId: t.request_id ?? null,
  dueDate: t.due_date ?? null,
  createdAt: t.created_at,
});

export const mapCleaning = (c: any): CleaningTask => ({
  id: c.id,
  type: c.type,
  service: c.service,
  source: c.source,
  sourceRef: c.source_ref ?? null,
  roomId: c.room_id ?? null,
  area: c.area,
  scheduledFor: c.scheduled_for,
  status: c.status,
  assignedTo: c.assigned_to ?? null,
  notes: c.notes ?? undefined,
  checklist: c.checklist ?? undefined,
});

export const mapSpace = (s: any): Space => ({
  id: s.id, name: s.name, capacity: s.capacity, description: s.description ?? "",
});

export const mapBooking = (b: any): Booking => ({
  id: b.id,
  spaceId: b.space_id,
  residentId: b.resident_id ?? null,
  title: b.title,
  start: b.start_at,
  end: b.end_at,
  notes: b.notes ?? undefined,
});

export const mapStay = (s: any): Stay => ({
  id: s.id,
  residentId: s.resident_id ?? null,
  fullName: s.full_name,
  email: s.email,
  phone: s.phone ?? "",
  roomId: s.room_id ?? null,
  checkIn: s.check_in,
  checkOut: s.check_out,
  status: s.status,
  source: s.source,
  notes: s.notes ?? undefined,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});
