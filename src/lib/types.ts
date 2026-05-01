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

export interface CleaningTask {
  id: string;
  type: "room_regular" | "room_deep" | "bathroom" | "kitchen" | "common" | "checkout_inspection";
  roomId: string | null;
  area: string;
  scheduledFor: string;
  status: "scheduled" | "in_progress" | "completed" | "skipped";
  assignedTo: string | null;
}
