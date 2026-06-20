export type RequestStatus = "open" | "in_progress" | "waiting_resident" | "waiting_supplier" | "resolved" | "closed";
export type RequestPriority = "low" | "medium" | "high" | "urgent";
export type RequestCategory =
  | "maintenance"
  | "cleaning"
  | "consumables"
  | "wifi_tech"
  | "noise"
  | "billing"
  | "lost_found"
  | "feedback"
  | "other";

export interface Resident {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roomId: string | null;
  moveIn: string;
  moveOut: string;
  status: "upcoming" | "active" | "checking_out" | "past";
  avatarColor: string;
}

export type RoomStatus = "available" | "occupied" | "reserved" | "maintenance" | "cleaning_required" | "out_of_service";

export interface Room {
  id: string;
  number: string;
  floor: number;
  typology: string;
  status: RoomStatus;
  currentResidentId: string | null;
  locationId: string | null;
}

export interface Request {
  id: string;
  code: string;
  title: string;
  category: RequestCategory;
  description: string;
  residentId: string | null;
  roomId: string | null;
  locationId: string | null;
  location: string;
  priority: RequestPriority;
  status: RequestStatus;
  assignedTo: string | null;
  assignedToUserId: string | null;
  supplierId: string | null;
  estimatedCost: number | null;
  finalCost: number | null;
  costCurrency: string;
  createdAt: string;
  updatedAt: string;
  permissionToEnter: "yes" | "no" | "with_notice";
  photos: string[];
}

export type CleaningType = "room_regular" | "room_deep" | "bathroom" | "kitchen" | "common" | "checkout_inspection";
export type CleaningService = "normal" | "simple";
export type CleaningSource = "scheduled" | "checkout" | "request" | "manual";

export interface CleaningTask {
  id: string;
  type: CleaningType;
  service: CleaningService;
  source: CleaningSource;
  sourceRef?: string | null; // ex: requestId or residentId
  roomId: string | null;
  locationId: string | null;
  supplierId: string | null;
  area: string;
  scheduledFor: string;
  status: "scheduled" | "in_progress" | "completed" | "skipped";
  assignedTo: string | null;
  assignedToUserId: string | null;
  notes?: string;
  checklist?: { label: string; done: boolean }[];
  updatedAt?: string;
}

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high";

export interface OpsTask {
  id: string;
  code: string;
  title: string;
  description: string;
  category: "maintenance" | "logistics" | "admin" | "supplier" | "other";
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  assignedToUserId: string | null;
  supplierId: string | null;
  roomId: string | null;
  locationId: string | null;
  residentId: string | null;
  requestId: string | null;
  dueDate: string | null;
  estimatedCost: number | null;
  finalCost: number | null;
  costCurrency: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Space {
  id: string;
  name: string;
  capacity: number;
  description: string;
  active: boolean;
}

export interface Booking {
  id: string;
  spaceId: string;
  residentId: string | null;
  title: string;
  start: string;
  end: string;
  notes?: string;
}

export type StayStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
export type StaySource = "manual" | "public_form" | "external";

export interface Stay {
  id: string;
  residentId: string | null;
  fullName: string;
  email: string;
  phone: string;
  roomId: string | null;
  checkIn: string;
  checkOut: string;
  status: StayStatus;
  source: StaySource;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ NEW: Suppliers ============

export type SupplierCategory =
  | "plumbing"
  | "electrical"
  | "cleaning_company"
  | "internet"
  | "laundry"
  | "maintenance"
  | "hvac"
  | "pest_control"
  | "gardening"
  | "security"
  | "other";

export interface Supplier {
  id: string;
  name: string;
  category: SupplierCategory;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  tags: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ NEW: Locations ============

export type LocationKind =
  | "room"
  | "shared_bathroom"
  | "apartment_kitchen"
  | "common_kitchen"
  | "corridor"
  | "balcony"
  | "laundry"
  | "meeting_room"
  | "cowork"
  | "terrace"
  | "winter_garden"
  | "cinema"
  | "technical"
  | "other";

export type LocationStatus = "active" | "out_of_service" | "under_maintenance";

export interface Location {
  id: string;
  name: string;
  kind: LocationKind;
  floor: number | null;
  apartment: string | null;
  parentLocationId: string | null;
  status: LocationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============ NEW: Request Activity ============

export type RequestActivityKind =
  | "supplier_assigned"
  | "supplier_removed"
  | "status_changed"
  | "owner_changed"
  | "cost_updated"
  | "location_changed"
  | "created";

export interface RequestActivity {
  id: string;
  requestId: string;
  actorUserId: string | null;
  actorName: string | null;
  kind: RequestActivityKind;
  payload: Record<string, any>;
  createdAt: string;
}
