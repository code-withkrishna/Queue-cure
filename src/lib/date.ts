// Clinic-local "today" for queue date boundaries (avoids UTC midnight drift).

export function getTodayDate(): string {
  const tz = process.env.CLINIC_TIMEZONE || 'UTC';
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}
