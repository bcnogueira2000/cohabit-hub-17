import { profileGroup } from "./leadDocuments";

/** Accept both candidate codes and older contract labels without losing custom values. */
export const residentProfileValue = (profile: string | null | undefined): string => {
  const value = profile?.trim() ?? "";
  if (!value) return "";
  const group = profileGroup(value);
  if (group === "student") return "student";
  if (group === "worker") return "professional";
  if (["other", "outro"].includes(value.toLowerCase())) return "other";
  return value;
};