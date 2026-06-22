// Staff email allowlist — comma-separated emails and/or domains.
// STAFF_ALLOWED_EMAILS=reception@clinic.com,admin@clinic.com
// STAFF_EMAIL_DOMAINS=clinic.com,hospital.org
// If neither is set, any authenticated user is allowed (demo mode).

export function isStaffEmail(email: string | undefined | null): boolean {
  if (!email) return false;

  const normalized = email.trim().toLowerCase();
  const allowedEmails = (process.env.STAFF_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const allowedDomains = (process.env.STAFF_EMAIL_DOMAINS ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0 && allowedDomains.length === 0) {
    return true;
  }

  if (allowedEmails.includes(normalized)) return true;

  const domain = normalized.split('@')[1];
  return !!domain && allowedDomains.includes(domain);
}
