import type { Resident, Room, Request, CleaningTask, OpsTask, Booking, Space, Stay, Supplier, Location } from "./types";

// Maps from DB snake_case rows to the app's camelCase types.

export const mapRoom = (r: any): Room => ({
  id: r.id,
  number: r.number,
  floor: r.floor,
  typology: r.typology,
  status: r.status,
  currentResidentId: r.current_resident_id ?? null,
  locationId: r.location_id ?? null,
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
  locationId: r.location_id ?? null,
  location: r.location ?? "",
  priority: r.priority,
  status: r.status,
  assignedTo: r.assigned_to ?? null,
  assignedToUserId: r.assigned_to_user_id ?? null,
  supplierId: r.supplier_id ?? null,
  estimatedCost: r.estimated_cost !== undefined && r.estimated_cost !== null ? Number(r.estimated_cost) : null,
  finalCost: r.final_cost !== undefined && r.final_cost !== null ? Number(r.final_cost) : null,
  costCurrency: r.cost_currency ?? "EUR",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  permissionToEnter: r.permission_to_enter,
  photos: Array.isArray(r.photos) ? r.photos : [],
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
  assignedToUserId: t.assigned_to_user_id ?? null,
  supplierId: t.supplier_id ?? null,
  roomId: t.room_id ?? null,
  locationId: t.location_id ?? null,
  residentId: t.resident_id ?? null,
  requestId: t.request_id ?? null,
  dueDate: t.due_date ?? null,
  estimatedCost: t.estimated_cost !== undefined && t.estimated_cost !== null ? Number(t.estimated_cost) : null,
  finalCost: t.final_cost !== undefined && t.final_cost !== null ? Number(t.final_cost) : null,
  costCurrency: t.cost_currency ?? "EUR",
  createdAt: t.created_at,
  updatedAt: t.updated_at ?? t.created_at,
});

export const mapCleaning = (c: any): CleaningTask => ({
  id: c.id,
  type: c.type,
  service: c.service,
  source: c.source,
  sourceRef: c.source_ref ?? null,
  roomId: c.room_id ?? null,
  locationId: c.location_id ?? null,
  supplierId: c.supplier_id ?? null,
  area: c.area,
  scheduledFor: c.scheduled_for,
  status: c.status,
  assignedTo: c.assigned_to ?? null,
  assignedToUserId: c.assigned_to_user_id ?? null,
  notes: c.notes ?? undefined,
  checklist: c.checklist ?? undefined,
  updatedAt: c.updated_at ?? c.scheduled_for,
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

export const mapSupplier = (s: any): Supplier => ({
  id: s.id,
  name: s.name,
  category: s.category,
  contactName: s.contact_name ?? null,
  phone: s.phone ?? null,
  email: s.email ?? null,
  website: s.website ?? null,
  notes: s.notes ?? null,
  tags: Array.isArray(s.tags) ? s.tags : [],
  active: !!s.active,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

export const mapLocation = (l: any): Location => ({
  id: l.id,
  name: l.name,
  kind: l.kind,
  floor: l.floor ?? null,
  apartment: l.apartment ?? null,
  parentLocationId: l.parent_location_id ?? null,
  status: l.status,
  notes: l.notes ?? null,
  createdAt: l.created_at,
  updatedAt: l.updated_at,
});
