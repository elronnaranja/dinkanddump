export const MINIMUM_AGE = 18;

/** Computes age in whole years from a YYYY-MM-DD date-of-birth string. */
export function calculateAge(dateOfBirth: string, now: Date = new Date()): number {
  const dob = new Date(dateOfBirth);
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAtLeastMinimumAge(dateOfBirth: string, now: Date = new Date()): boolean {
  return calculateAge(dateOfBirth, now) >= MINIMUM_AGE;
}

/** Formats a Date as a YYYY-MM-DD string (local time, no timezone shift). */
export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
