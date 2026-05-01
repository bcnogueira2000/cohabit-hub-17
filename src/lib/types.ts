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
}

export interface Request {
  id: string;
  code: string;
  title: string;
  category: RequestCategory;
  description: string;
  residentId: string | null;
  roomId: string | null;
  location: string;
  priority: RequestPriority;
  status: RequestStatus;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  permissionToEnter: "yes" | "no" | "with_notice";
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
  area: string;
  scheduledFor: string;
  status: "scheduled" | "in_progress" | "completed" | "skipped";
  assignedTo: string | null;
  notes?: string;
  checklist?: { label: string; done: boolean }[];
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
  roomId: string | null;
  residentId: string | null;
  requestId: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface Space {
  id: string;
  name: string;
  capacity: number;
  description: string;
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
